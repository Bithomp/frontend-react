import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'

import AddressInput from '../UI/AddressInput'
import SimpleSelect from '../UI/SimpleSelect'
import TokenSelector from '../UI/TokenSelector'
import PaymentAmountMode from './PaymentAmountMode'
import {
  avatarSrc,
  encode,
  isAddressValid,
  isNativeCurrency,
  isTagValid,
  nativeCurrency,
  retinaImageSize
} from '../../utils'
import { divide, multiply, subtract, toPlainDecimal } from '../../utils/calc'
import { formatXDigits, niceCurrency, tokenToFiat, transferRateToPercent } from '../../utils/format'
import { amountWithValue, PAYMENT_AMOUNT_MODE, transferFeeAmounts } from '../../utils/paymentTransferFee'
import { acceptedTokensForAddress, mptIssuanceId } from '../../utils/acceptedTokens'
import useAssetFiatRate from './useAssetFiatRate'
import AmountMeta from '../UI/AmountMeta'

const toInitialAmount = (amountValue) => {
  if (!amountValue) return ''

  if (typeof amountValue === 'object') {
    const value = amountValue.value
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return ''
    return String(value)
  }

  const numericAmount = Number(amountValue)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return ''
  return String(numericAmount / 1000000)
}

export default function Payment({ setSignRequest, signRequest, setStatus, setFormError, selectedCurrency, fiatRate }) {
  const { t } = useTranslation(['common', 'services'])
  const ts = useCallback((key, options) => t(key, { ns: 'services', ...options }), [t])
  const initialRequest = signRequest?.request || {}
  const allowAssetSelection = !!signRequest?.data?.allowAssetSelection
  const sourceWallets = useMemo(
    () => (Array.isArray(signRequest?.data?.sourceWallets) ? signRequest.data.sourceWallets : []),
    [signRequest?.data?.sourceWallets]
  )
  const [sourceAddress, setSourceAddress] = useState(initialRequest.Account || sourceWallets[0]?.address || '')
  const sourceWalletOptions = useMemo(
    () =>
      sourceWallets.map((wallet) => ({
        value: wallet.address,
        label: wallet.username || wallet.address,
        ...wallet
      })),
    [sourceWallets]
  )
  const [selectedAsset, setSelectedAsset] = useState(() => ({
    currency: signRequest?.data?.currencyCode || initialRequest.Amount?.currency || nativeCurrency,
    issuer: signRequest?.data?.issuer || initialRequest.Amount?.issuer,
    mptokenIssuanceID:
      signRequest?.data?.mptokenIssuanceID ||
      (typeof initialRequest.Amount === 'object' ? initialRequest.Amount?.mpt_issuance_id : ''),
    selectedBalance: signRequest?.data?.balance
  }))
  const mptokenIssuanceID =
    selectedAsset?.mptokenIssuanceID || selectedAsset?.MPTokenIssuanceID || selectedAsset?.mpt_issuance_id || ''
  const isMptPayment = !!mptokenIssuanceID
  const mptAssetScale = Math.min(
    255,
    Math.max(
      0,
      Math.floor(
        Number(selectedAsset?.scale ?? selectedAsset?.AssetScale ?? signRequest?.data?.mptAssetScale) || 0
      )
    )
  )
  const mptScaleMultiplier = `1${'0'.repeat(mptAssetScale)}`
  const currencyCode = useMemo(() => {
    if (allowAssetSelection && selectedAsset?.currency) return selectedAsset.currency
    if (signRequest?.data?.currencyCode) return signRequest.data.currencyCode
    if (typeof initialRequest.Amount === 'object' && initialRequest.Amount?.currency)
      return initialRequest.Amount.currency
    return nativeCurrency
  }, [allowAssetSelection, initialRequest.Amount, selectedAsset?.currency, signRequest?.data?.currencyCode])

  const issuer = useMemo(() => {
    if (allowAssetSelection) return selectedAsset?.issuer || selectedAsset?.account || ''
    if (signRequest?.data?.issuer) return signRequest.data.issuer
    if (typeof initialRequest.Amount === 'object' && initialRequest.Amount?.issuer) return initialRequest.Amount.issuer
    return ''
  }, [allowAssetSelection, initialRequest.Amount, selectedAsset?.account, selectedAsset?.issuer, signRequest?.data?.issuer])

  const isTokenPayment = isMptPayment || !isNativeCurrency({ currency: currencyCode })
  const selectedAssetFiatRate = useAssetFiatRate(selectedAsset, selectedCurrency, fiatRate)
  const currencyLabel = useMemo(
    () => (isTokenPayment ? niceCurrency(currencyCode) : currencyCode),
    [currencyCode, isTokenPayment]
  )
  const balance = useMemo(() => {
    const selectedBalance = allowAssetSelection ? selectedAsset?.selectedBalance : signRequest?.data?.balance
    if (selectedBalance === undefined || selectedBalance === null) return ''
    return toPlainDecimal(selectedBalance)
  }, [allowAssetSelection, selectedAsset?.selectedBalance, signRequest?.data?.balance])

  const [destination, setDestination] = useState(initialRequest.Destination || '')
  const [amount, setAmount] = useState(toInitialAmount(initialRequest.Amount))
  const [destinationTag, setDestinationTag] = useState(
    initialRequest.DestinationTag || initialRequest.DestinationTag === 0 ? String(initialRequest.DestinationTag) : ''
  )
  const [memo, setMemo] = useState(
    initialRequest?.Memos?.[0]?.Memo?.MemoData ? initialRequest.Memos[0].Memo.MemoData : ''
  )
  const [requireDestTag, setRequireDestTag] = useState(false)
  const [destinationTokenError, setDestinationTokenError] = useState('')
  const [destinationTokenTransferFee, setDestinationTokenTransferFee] = useState(signRequest?.data?.transferFee || null)
  const [amountMode, setAmountMode] = useState(PAYMENT_AMOUNT_MODE.DELIVER)

  const selectAsset = (asset) => {
    const isNativeAsset = !asset?.issuer && !asset?.account && !mptIssuanceId(asset)
    const sourceWallet = sourceWallets.find((item) => item.address === sourceAddress)
    setSelectedAsset(
      isNativeAsset && sourceWallet?.nativeAvailableBalance !== undefined
        ? { ...asset, selectedBalance: sourceWallet.nativeAvailableBalance }
        : asset
    )
    setAmount('')
    setAmountMode(PAYMENT_AMOUNT_MODE.DELIVER)
  }

  const selectSourceWallet = (walletAddress) => {
    const wallet = sourceWallets.find((item) => item.address === walletAddress)
    if (!wallet) return

    setSourceAddress(wallet.address)
    signRequest?.data?.onSourceWalletChange?.(wallet.id)
    signRequest.data.nativeAvailableBalance = String(wallet.nativeAvailableBalance ?? '')
    signRequest.data.source = {
      address: wallet.address,
      addressDetails: { username: wallet.username || null }
    }
    setSelectedAsset({
      currency: nativeCurrency,
      selectedBalance: wallet.nativeAvailableBalance
    })
    setAmount('')
    setAmountMode(PAYMENT_AMOUNT_MODE.DELIVER)
  }

  const formatSourceWalletOption = (wallet, { context }) => (
    <span className={`payment-source-option ${context === 'value' ? 'is-selected' : 'is-menu-option'}`}>
      <img
        src={avatarSrc(wallet.address, { size: retinaImageSize(24), hashIconZoom: 12 })}
        width="24"
        height="24"
        alt=""
        className="payment-source-avatar"
      />
      <span className="payment-source-details">
        <span className="payment-source-name">{wallet.username || wallet.address}</span>
        {context === 'menu' && wallet.username ? (
          <span className="payment-source-address">{wallet.address}</span>
        ) : null}
      </span>
      {Number.isFinite(wallet.nativeBalance) ? (
        <span className="payment-source-balance">
          {wallet.nativeBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {nativeCurrency}
        </span>
      ) : null}
    </span>
  )

  useEffect(() => {
    const checkDestinationRequirements = async () => {
      const destinationValue = destination.trim()

      if (!destinationValue || !isAddressValid(destinationValue)) {
        setRequireDestTag(false)
        setDestinationTokenError('')
        setDestinationTokenTransferFee(null)
        return
      }

      try {
        const accountResponse = await axios(`/v2/account/${destinationValue}`)
        setRequireDestTag(!!accountResponse?.data?.account?.requireDestTag)
      } catch (error) {
        setRequireDestTag(false)
      }

      if (!isTokenPayment) {
        setDestinationTokenError('')
        setDestinationTokenTransferFee(null)
        return
      }

      try {
        const response = await acceptedTokensForAddress({
          destination: destinationValue,
          sender: sourceAddress,
          stopWhen: (token) =>
            isMptPayment
              ? mptIssuanceId(token) === mptokenIssuanceID
              : token?.currency === currencyCode && token?.issuer === issuer
        })
        const acceptedToken = response.match
        const canAcceptToken = !!acceptedToken

        setDestinationTokenError(
          canAcceptToken ? '' : ts('shared.errors.destination-cannot-accept', { currency: currencyLabel })
        )
        setDestinationTokenTransferFee(
          acceptedToken?.transferFee ?? acceptedToken?.TransferFee ?? null
        )
      } catch (error) {
        setDestinationTokenError('')
        setDestinationTokenTransferFee(null)
      }
    }

    checkDestinationRequirements()
  }, [currencyCode, currencyLabel, destination, isMptPayment, isTokenPayment, issuer, mptokenIssuanceID, signRequest?.data?.transferFee, sourceAddress, ts])

  const applyMaxAmount = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!balance) return
    if (hasIssuerFee) setAmountMode(PAYMENT_AMOUNT_MODE.SPEND)
    setAmount(balance)
  }

  const amountNumber = Number(String(amount).trim())
  const hasValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const mptAmountValue = isMptPayment ? multiply(String(amount).trim(), mptScaleMultiplier) : ''
  const hasMptPrecisionError = isMptPayment && hasValidAmount && !/^\d+$/.test(mptAmountValue)
  const transferFeeNumber = Number(destinationTokenTransferFee)
  const isIssuerTransfer = !!issuer && (sourceAddress === issuer || destination.trim() === issuer)
  const hasIssuerFee = isTokenPayment && !isIssuerTransfer && Number.isFinite(transferFeeNumber) && transferFeeNumber > 0
  const feeAmounts = useMemo(
    () =>
      hasIssuerFee && hasValidAmount && (!isMptPayment || !hasMptPrecisionError)
        ? transferFeeAmounts({ amount: isMptPayment ? mptAmountValue : String(amount).trim(), transferFee: transferFeeNumber, isMpt: isMptPayment })
        : null,
    [amount, hasIssuerFee, hasMptPrecisionError, hasValidAmount, isMptPayment, mptAmountValue, transferFeeNumber]
  )
  const receiveAmountText = feeAmounts
    ? formatXDigits(Number(isMptPayment ? divide(feeAmounts.deliver, mptScaleMultiplier) : feeAmounts.deliver), 11)
    : ''
  const feeSpendAmount = feeAmounts
    ? isMptPayment
      ? divide(feeAmounts.spend, mptScaleMultiplier)
      : feeAmounts.spend
    : ''
  const spendAmountText = feeSpendAmount ? formatXDigits(Number(feeSpendAmount), 11) : ''
  const effectiveSpendAmount =
    amountMode === PAYMENT_AMOUNT_MODE.DELIVER && feeSpendAmount ? feeSpendAmount : String(amount).trim()
  const fiatSpendEstimate =
    Number(effectiveSpendAmount) > 0
      ? tokenToFiat({
          amount: {
            ...selectedAsset,
            currency: currencyCode,
            issuer,
            value: effectiveSpendAmount
          },
          selectedCurrency,
          fiatRate,
          tokenFiatRate: selectedAssetFiatRate,
          absolute: true,
          asText: true
        })
      : ''
  const remainingAmount = useMemo(() => {
    if (!balance || !effectiveSpendAmount) return ''
    const numericAmount = Number(effectiveSpendAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return ''
    return subtract(balance, effectiveSpendAmount)
  }, [balance, effectiveSpendAmount])
  const isRemainingNegative = useMemo(() => Number(remainingAmount) < 0, [remainingAmount])

  const changeAmountMode = (nextMode) => {
    if (
      nextMode === PAYMENT_AMOUNT_MODE.DELIVER &&
      hasIssuerFee &&
      balance &&
      feeAmounts &&
      Number(feeSpendAmount) > Number(balance)
    ) {
      const balanceInProtocolUnits = isMptPayment ? multiply(balance, mptScaleMultiplier) : balance
      const maximumAmounts = transferFeeAmounts({
        amount: balanceInProtocolUnits,
        transferFee: transferFeeNumber,
        isMpt: isMptPayment
      })
      const maximumDeliverAmount = isMptPayment
        ? divide(maximumAmounts.deliver, mptScaleMultiplier)
        : maximumAmounts.deliver
      setAmount(toPlainDecimal(maximumDeliverAmount))
    }
    setAmountMode(nextMode)
  }

  useEffect(() => {
    const destinationValue = destination.trim()
    const destinationTagValue = destinationTag.trim()
    const memoValue = memo.trim()
    const amountValue = String(amount).trim()

    const isDestinationValid = isAddressValid(destinationValue)
    const numericAmount = Number(amountValue)
    const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0
    const scaledMptAmount = isMptPayment ? multiply(amountValue, mptScaleMultiplier) : ''
    const isMptAmountValid = !isMptPayment || /^\d+$/.test(scaledMptAmount)
    const isDestinationTagValid =
      (!destinationTagValue || isTagValid(destinationTagValue)) && (!requireDestTag || !!destinationTagValue)
    const canDestinationAcceptCurrency = !destinationTokenError

    const isValid =
      isDestinationValid &&
      isAmountValid &&
      isMptAmountValid &&
      isDestinationTagValid &&
      canDestinationAcceptCurrency

    setStatus('')
    setFormError(!isValid)

    if (!isValid) return

    const nextAmount = isMptPayment
      ? { mpt_issuance_id: mptokenIssuanceID, value: scaledMptAmount }
      : isTokenPayment
        ? {
          currency: currencyCode,
          issuer,
          value: amountValue
          }
        : multiply(amountValue, 1000000)

    const nextSignRequest = signRequest
    nextSignRequest.request = {
      ...nextSignRequest?.request,
      TransactionType: 'Payment',
      Account: sourceAddress,
      Destination: destinationValue,
      Amount: nextAmount
    }
    delete nextSignRequest.request.SendMax
    delete nextSignRequest.request.DeliverMin

    if (hasIssuerFee && feeAmounts && amountMode === PAYMENT_AMOUNT_MODE.DELIVER) {
      nextSignRequest.request.SendMax = amountWithValue(nextAmount, feeAmounts.spend)
      delete nextSignRequest.request.Flags
    } else if (hasIssuerFee && feeAmounts && amountMode === PAYMENT_AMOUNT_MODE.SPEND) {
      nextSignRequest.request.DeliverMin = amountWithValue(nextAmount, feeAmounts.deliver)
      nextSignRequest.request.Flags = 131072 // tfPartialPayment
    } else {
      delete nextSignRequest.request.Flags
    }

    if (destinationTagValue) {
      nextSignRequest.request.DestinationTag = parseInt(destinationTagValue)
    } else {
      delete nextSignRequest.request.DestinationTag
    }

    if (memoValue) {
      nextSignRequest.request.Memos = [
        {
          Memo: {
            MemoData: encode(memoValue)
          }
        }
      ]
    } else {
      delete nextSignRequest.request.Memos
    }

    nextSignRequest.data = {
      ...nextSignRequest?.data,
      currencyCode,
      issuer,
      balance,
      mptokenIssuanceID: mptokenIssuanceID || undefined,
      transferFee: destinationTokenTransferFee || undefined
    }

    setSignRequest(nextSignRequest)
  }, [
    amount,
    amountMode,
    balance,
    currencyCode,
    destination,
    destinationTag,
    isTokenPayment,
    isMptPayment,
    issuer,
    memo,
    mptScaleMultiplier,
    mptokenIssuanceID,
    requireDestTag,
    sourceAddress,
    destinationTokenError,
    destinationTokenTransferFee,
    feeAmounts,
    hasIssuerFee,
    signRequest,
    setFormError,
    setSignRequest,
    setStatus
  ])

  return (
    <div className="center">
      <br />
      {allowAssetSelection && (
        <>
          <span className="halv">
            <span className="input-title">{t('table.from')}</span>
            <SimpleSelect
              value={sourceAddress}
              setValue={selectSourceWallet}
              optionsList={sourceWalletOptions}
              className="payment-source-account-select"
              instanceId="payment-source-wallet-select"
              formatOptionLabel={formatSourceWalletOption}
            />
          </span>
          <br />
          <span className="halv">
            <span className="input-title">{t('shared.currency')}</span>
            <TokenSelector
              value={selectedAsset}
              onChange={selectAsset}
              destinationAddress={sourceAddress}
              senderAddress={sourceAddress}
              includeMPTokens
              modalTitle={t('token-selector.select-token')}
              selectedCurrency={selectedCurrency}
              fiatRate={fiatRate}
            />
          </span>
          <br />
        </>
      )}
      <span className="halv">
        <AddressInput
          title={t('table.destination')}
          placeholder={ts('shared.destination-address')}
          hideButton={true}
          setValue={setDestination}
          setInnerValue={setDestination}
          rawData={isAddressValid(destination) ? { address: destination } : {}}
          type="address"
        />
      </span>

      <br />
      <span className="halv">
        <span className="input-title">
          {t('table.destination-tag')}{' '}
          {requireDestTag ? (
            <>
              (<span className="orange bold">{ts('shared.required')}</span>)
            </>
          ) : (
            `(${t('general.optional')})`
          )}
        </span>
        <input
          placeholder="12345"
          onChange={(event) => setDestinationTag(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={destinationTag}
          inputMode="numeric"
        />
        {!!destinationTokenError && (
          <div style={{ marginTop: 6, textAlign: 'left' }}>
            <span className="red">{destinationTokenError}</span>
          </div>
        )}
      </span>

      <br />
      <span className="halv">
        <span className="input-title paymentAmountHeader">
          <span className="paymentAmountTitle">
            {t('table.amount')}
            {!balance ? <> ({currencyLabel})</> : null}
          </span>
          {balance ? (
            <span className="paymentAmountMeta">
              <span className="paymentAmountMaxRow grey">
                {ts('shared.max')}:{' '}
                <span
                  className="paymentAmountMax"
                  role="button"
                  tabIndex={0}
                  onMouseDown={applyMaxAmount}
                  onClick={applyMaxAmount}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      applyMaxAmount(event)
                    }
                  }}
                >
                  {balance} {currencyLabel}
                </span>
              </span>
            </span>
          ) : null}
        </span>
        <input
          placeholder="0"
          onChange={(event) => setAmount(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={amount}
          inputMode="decimal"
        />
        <AmountMeta
          fiatEstimate={fiatSpendEstimate}
          remainingLabel={ts('shared.remaining')}
          remainingAmount={remainingAmount}
          currencyLabel={currencyLabel}
          negative={isRemainingNegative}
        />
        {hasMptPrecisionError && (
          <div style={{ marginTop: 6, textAlign: 'left' }}>
            <span className="red">{ts('shared.errors.mpt-decimal-places', { count: mptAssetScale })}</span>
          </div>
        )}
        <div className="paymentAmountFooter">
          {amountMode === PAYMENT_AMOUNT_MODE.SPEND && receiveAmountText ? (
            <span className="grey paymentAmountReceive">
              {ts('shared.to-receive', { amount: receiveAmountText })}
            </span>
          ) : null}
          {amountMode === PAYMENT_AMOUNT_MODE.DELIVER && spendAmountText ? (
            <span className="grey paymentAmountReceive">
              {ts('shared.to-spend', { amount: spendAmountText })}
            </span>
          ) : null}
          {hasIssuerFee ? (
            <span className="orange paymentAmountFee">
              {ts('shared.issuer-fee', {
                fee: isMptPayment
                  ? `${formatXDigits(transferFeeNumber / 1000, 6)}%`
                  : transferRateToPercent(destinationTokenTransferFee)
              })}
            </span>
          ) : null}
        </div>
      </span>

      {hasIssuerFee && (
        <>
          <br />
          <span className="halv">
            <PaymentAmountMode value={amountMode} onChange={changeAmountMode} />
          </span>
        </>
      )}

      <br />
      <span className="halv">
        <span className="input-title">
          {t('table.memo')} (<span className="orange">{t('shared.it-will-be-public')}</span>)
        </span>
        <input
          placeholder={t('shared.enter-memo-optional')}
          onChange={(event) => setMemo(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={memo}
        />
      </span>
    </div>
  )
}
