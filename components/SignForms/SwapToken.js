import { useEffect, useMemo, useState } from 'react'
import BigNumber from 'bignumber.js'
import { useTranslation } from 'next-i18next'
import { IoSync } from 'react-icons/io5'

import { nativeCurrency } from '../../utils'
import { niceCurrency, niceNumber, TokenImage, tokenToFiat } from '../../utils/format'
import TokenSelector from '../UI/TokenSelector'
import AmountMeta from '../UI/AmountMeta'
import useOrderBook from '../Trade/useOrderBook'
import { estimateSwap, MARKET_CUSHION, TF_PARTIAL_PAYMENT, transactionAmount } from '../Trade/swap'
import useAssetFiatRate from './useAssetFiatRate'

const nativeAsset = { currency: nativeCurrency }

export default function SwapToken({
  signRequest,
  setStatus,
  setAgreedToRisks,
  account,
  selectedCurrency,
  fiatRate
}) {
  const { t } = useTranslation('common')
  const tokenAsset = signRequest?.data?.asset
  const balance = signRequest?.data?.balance || '0'
  const [amount, setAmount] = useState('')
  const [receiveAsset, setReceiveAsset] = useState(nativeAsset)
  const tokenFiatRate = useAssetFiatRate(tokenAsset, selectedCurrency, fiatRate)
  const receiveFiatRate = useAssetFiatRate(receiveAsset, selectedCurrency, fiatRate)
  const { bids, asks, amm, status, error } = useOrderBook(tokenAsset, receiveAsset)
  const amountNumber = useMemo(() => new BigNumber(amount || 0), [amount])
  const hasPositiveAmount = amountNumber.isFinite() && amountNumber.gt(0)
  const validAmount = hasPositiveAmount && amountNumber.lte(balance)
  const estimate = useMemo(
    () => estimateSwap({ bids, asks, amm, inputAmount: amount, side: 'sell' }),
    [bids, asks, amm, amount]
  )
  const sameAsset =
    tokenAsset?.currency === receiveAsset?.currency && (tokenAsset?.issuer || '') === (receiveAsset?.issuer || '')
  const pairKey = `${tokenAsset?.issuer || ''}:${tokenAsset?.currency || ''}|${receiveAsset?.issuer || ''}:${
    receiveAsset?.currency || ''
  }`
  const [loadedPairKey, setLoadedPairKey] = useState('')
  useEffect(() => {
    if (status === 'ready') setLoadedPairKey(pairKey)
  }, [pairKey, status])
  const liquidityReady = loadedPairKey === pairKey || status === 'ready'
  const liquidityRefreshing = liquidityReady && status !== 'ready' && status !== 'error'
  const minimumReceiveAmount = receiveAsset?.issuer ? new BigNumber('1e-15') : new BigNumber('0.000001')
  const canSwap =
    validAmount && !sameAsset && liquidityReady && status !== 'error' && estimate?.complete && estimate.output.gte(minimumReceiveAmount)
  const fiatSpendEstimate = hasPositiveAmount
    ? tokenToFiat({
        amount: { ...tokenAsset, value: amount },
        selectedCurrency,
        fiatRate,
        tokenFiatRate,
        absolute: true,
        asText: true
      })
    : ''
  const fiatReceiveEstimate = canSwap
    ? tokenToFiat({
        amount: { ...receiveAsset, value: estimate.output.toFixed() },
        selectedCurrency,
        fiatRate,
        tokenFiatRate: receiveFiatRate,
        absolute: true,
        asText: true
      })
    : ''

  useEffect(() => {
    setStatus('')
    setAgreedToRisks(false)
    if (!canSwap) return

    signRequest.request = {
      TransactionType: 'Payment',
      Account: signRequest.request.Account,
      Destination: signRequest.request.Account,
      SendMax: transactionAmount(tokenAsset, amount),
      Amount: transactionAmount(receiveAsset, estimate.output),
      DeliverMin: transactionAmount(
        receiveAsset,
        estimate.output.multipliedBy(new BigNumber(1).minus(MARKET_CUSHION))
      ),
      Flags: TF_PARTIAL_PAYMENT
    }
    setAgreedToRisks(true)
  }, [amount, canSwap, estimate, receiveAsset, setAgreedToRisks, setStatus, signRequest, tokenAsset])

  const tokenLabel = niceCurrency(tokenAsset?.currency)
  const balanceText = new BigNumber(balance).toFormat({
    groupSeparator: ',',
    decimalSeparator: '.',
    groupSize: 3
  })

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title paymentAmountHeader">
          <span className="paymentAmountTitle swapTokenAmountTitle">
            <span className="swapTokenSourceAsset">
              <TokenImage token={tokenAsset} size={24} />
              <span>{tokenLabel}</span>
            </span>
          </span>
          <span className="paymentAmountMeta">
            <span className="paymentAmountMaxRow grey">
              {t('signin.swap-token.max')}:{' '}
              <span
                className="paymentAmountMax"
                role="button"
                tabIndex={0}
                onClick={() => setAmount(String(balance))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setAmount(String(balance))
                }}
              >
                {balanceText} {tokenLabel}
              </span>
            </span>
          </span>
        </span>
        <input
          placeholder="0"
          onChange={(event) => setAmount(event.target.value)}
          className="input-text"
          value={amount}
          inputMode="decimal"
          spellCheck="false"
        />
        <AmountMeta fiatEstimate={fiatSpendEstimate} reserveFiatSpace />
      </span>
      <br />
      <span className="halv">
        <span className="input-title">{t('signin.swap-token.receive-in')}</span>
        <TokenSelector
          value={receiveAsset}
          onChange={setReceiveAsset}
          destinationAddress={account?.address || null}
          senderAddress={account?.address || null}
          excludeLPtokens
          modalTitle={t('signin.swap-token.select-asset')}
          selectedCurrency={selectedCurrency}
          fiatRate={fiatRate}
        />
      </span>

      <div className="swapTokenQuote" aria-live="polite">
        {status === 'error' ? (
          <p className="red">{error || t('signin.swap-token.liquidity-error')}</p>
        ) : sameAsset ? (
          <p className="orange">{t('signin.swap-token.same-asset')}</p>
        ) : validAmount && !liquidityReady ? (
          <p>{t('signin.swap-token.checking-liquidity')}</p>
        ) : validAmount && liquidityReady && !canSwap ? (
          <p className="orange">{t('signin.swap-token.no-liquidity')}</p>
        ) : canSwap ? (
          <p className="swapTokenQuoteResult">
            <strong key={estimate.output.toFixed()} className="swapTokenQuoteValue">
              {niceNumber(estimate.output.toFixed(), 6)} {niceCurrency(receiveAsset.currency)}
            </strong>
            <span className="grey swapTokenQuoteFiat">{fiatReceiveEstimate || '\u00A0'}</span>
            <span
              className={`swapTokenRefreshing tooltip${liquidityRefreshing ? ' active' : ''}`}
              aria-label={liquidityRefreshing ? t('signin.swap-token.checking-liquidity') : undefined}
              aria-hidden={!liquidityRefreshing}
            >
              <IoSync aria-hidden="true" />
              {liquidityRefreshing ? (
                <span className="tooltiptext no-brake">{t('signin.swap-token.checking-liquidity')}</span>
              ) : null}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
