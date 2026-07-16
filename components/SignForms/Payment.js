import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'

import AddressInput from '../UI/AddressInput'
import { encode, isAddressValid, isNativeCurrency, isTagValid, nativeCurrency } from '../../utils'
import { multiply, subtract } from '../../utils/calc'
import { formatXDigits, niceCurrency, transferRateToPercent } from '../../utils/format'

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

export default function Payment({ setSignRequest, signRequest, setStatus, setFormError }) {
  const { t } = useTranslation(['common', 'services'])
  const ts = useCallback((key, options) => t(key, { ns: 'services', ...options }), [t])
  const initialRequest = signRequest?.request || {}
  const currencyCode = useMemo(() => {
    if (signRequest?.data?.currencyCode) return signRequest.data.currencyCode
    if (typeof initialRequest.Amount === 'object' && initialRequest.Amount?.currency)
      return initialRequest.Amount.currency
    return nativeCurrency
  }, [initialRequest.Amount, signRequest?.data?.currencyCode])

  const issuer = useMemo(() => {
    if (signRequest?.data?.issuer) return signRequest.data.issuer
    if (typeof initialRequest.Amount === 'object' && initialRequest.Amount?.issuer) return initialRequest.Amount.issuer
    return ''
  }, [initialRequest.Amount, signRequest?.data?.issuer])

  const isTokenPayment = !isNativeCurrency({ currency: currencyCode })
  const currencyLabel = useMemo(
    () => (isTokenPayment ? niceCurrency(currencyCode) : currencyCode),
    [currencyCode, isTokenPayment]
  )
  const balance = useMemo(() => {
    if (signRequest?.data?.balance === undefined || signRequest?.data?.balance === null) return ''
    return String(signRequest.data.balance)
  }, [signRequest?.data?.balance])

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

  const remainingAmount = useMemo(() => {
    const amountValue = String(amount).trim()
    if (!balance) return ''
    if (!amountValue) return ''

    const numericAmount = Number(amountValue)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return ''

    return subtract(balance, amountValue)
  }, [amount, balance])

  const isRemainingNegative = useMemo(() => Number(remainingAmount) < 0, [remainingAmount])

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
        let url = `v2/address/${destinationValue}/acceptedTokens?limit=100`
        if (signRequest?.request?.Account) {
          url += `&sender=${signRequest.request.Account}`
        }

        const response = await axios(url)
        const acceptedTokens = response?.data?.tokens || []
        const acceptedToken = acceptedTokens.find(
          (token) => token?.currency === currencyCode && token?.issuer === issuer
        )
        const canAcceptToken = !!acceptedToken

        setDestinationTokenError(
          canAcceptToken ? '' : ts('shared.errors.destination-cannot-accept', { currency: currencyLabel })
        )
        setDestinationTokenTransferFee(acceptedToken?.transferFee || null)
      } catch (error) {
        setDestinationTokenError('')
        setDestinationTokenTransferFee(null)
      }
    }

    checkDestinationRequirements()
  }, [currencyCode, currencyLabel, destination, isTokenPayment, issuer, signRequest?.request?.Account, ts])

  const applyMaxAmount = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!balance) return
    setAmount(balance)
  }

  const amountNumber = Number(String(amount).trim())
  const hasValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const transferFeeNumber = Number(destinationTokenTransferFee)
  const hasIssuerFee = isTokenPayment && Number.isFinite(transferFeeNumber) && transferFeeNumber > 0
  const receiveAmountText = hasIssuerFee && hasValidAmount ? formatXDigits(amountNumber / transferFeeNumber, 11) : ''

  useEffect(() => {
    const destinationValue = destination.trim()
    const destinationTagValue = destinationTag.trim()
    const memoValue = memo.trim()
    const amountValue = String(amount).trim()

    const isDestinationValid = isAddressValid(destinationValue)
    const numericAmount = Number(amountValue)
    const isAmountValid = Number.isFinite(numericAmount) && numericAmount > 0
    const isDestinationTagValid =
      (!destinationTagValue || isTagValid(destinationTagValue)) && (!requireDestTag || !!destinationTagValue)
    const canDestinationAcceptCurrency = !destinationTokenError

    const isValid = isDestinationValid && isAmountValid && isDestinationTagValid && canDestinationAcceptCurrency

    setStatus('')
    setFormError(!isValid)

    if (!isValid) return

    const nextAmount = isTokenPayment
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
      Destination: destinationValue,
      Amount: nextAmount
    }

    if (isTokenPayment) {
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
      transferFee: destinationTokenTransferFee || undefined
    }

    setSignRequest(nextSignRequest)
  }, [
    amount,
    currencyCode,
    destination,
    destinationTag,
    isTokenPayment,
    issuer,
    memo,
    requireDestTag,
    destinationTokenError,
    destinationTokenTransferFee,
    signRequest,
    setFormError,
    setSignRequest,
    setStatus
  ])

  return (
    <div className="center">
      <br />
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
            {balance ? (
              <>
                {' '}
                <span className="grey">
                  ({ts('shared.max')}{' '}
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
                  )
                </span>
              </>
            ) : (
              <> ({currencyLabel})</>
            )}
          </span>
          <span
            className={`paymentAmountRemaining ${isRemainingNegative ? 'red' : 'grey'}`}
            style={{ visibility: remainingAmount ? 'visible' : 'hidden' }}
            title={remainingAmount ? `${ts('shared.remaining')}: ${remainingAmount} ${currencyLabel}` : undefined}
          >
            {ts('shared.remaining')}: {remainingAmount || '0'} {currencyLabel}
          </span>
        </span>
        <input
          placeholder="0"
          onChange={(event) => setAmount(event.target.value)}
          className="input-text"
          spellCheck="false"
          value={amount}
          inputMode="decimal"
        />
        <div className="paymentAmountFooter">
          {receiveAmountText ? (
            <span className="grey paymentAmountReceive">
              {ts('shared.to-receive', { amount: receiveAmountText })}
            </span>
          ) : null}
          {hasIssuerFee ? (
            <span className="orange paymentAmountFee">
              {ts('shared.issuer-fee', { fee: transferRateToPercent(destinationTokenTransferFee) })}
            </span>
          ) : null}
        </div>
      </span>

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
