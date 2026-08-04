import { useEffect, useMemo, useState } from 'react'
import BigNumber from 'bignumber.js'
import { useTranslation } from 'next-i18next'

import { nativeCurrency } from '../../utils'
import { niceCurrency, niceNumber } from '../../utils/format'
import TokenSelector from '../UI/TokenSelector'
import useOrderBook from '../Trade/useOrderBook'
import { estimateSwap, MARKET_CUSHION, TF_PARTIAL_PAYMENT, transactionAmount } from '../Trade/swap'

const nativeAsset = { currency: nativeCurrency }

export default function SwapToken({ signRequest, setStatus, setAgreedToRisks, account }) {
  const { t } = useTranslation('common')
  const tokenAsset = signRequest?.data?.asset
  const balance = signRequest?.data?.balance || '0'
  const [amount, setAmount] = useState('')
  const [receiveAsset, setReceiveAsset] = useState(nativeAsset)
  const { bids, asks, amm, status, error } = useOrderBook(tokenAsset, receiveAsset)
  const amountNumber = useMemo(() => new BigNumber(amount || 0), [amount])
  const validAmount = amountNumber.isFinite() && amountNumber.gt(0) && amountNumber.lte(balance)
  const estimate = useMemo(
    () => estimateSwap({ bids, asks, amm, inputAmount: amount, side: 'sell' }),
    [bids, asks, amm, amount]
  )
  const sameAsset =
    tokenAsset?.currency === receiveAsset?.currency && (tokenAsset?.issuer || '') === (receiveAsset?.issuer || '')
  const minimumReceiveAmount = receiveAsset?.issuer ? new BigNumber('1e-15') : new BigNumber('0.000001')
  const canSwap =
    validAmount && !sameAsset && status === 'ready' && estimate?.complete && estimate.output.gte(minimumReceiveAmount)

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
          <span className="paymentAmountTitle">{t('signin.swap-token.amount')}</span>
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
        />
      </span>

      {status === 'error' && <p className="red">{error || t('signin.swap-token.liquidity-error')}</p>}
      {sameAsset && <p className="orange">{t('signin.swap-token.same-asset')}</p>}
      {validAmount && status !== 'error' && status !== 'ready' && <p>{t('signin.swap-token.checking-liquidity')}</p>}
      {validAmount && status === 'ready' && !canSwap && <p className="orange">{t('signin.swap-token.no-liquidity')}</p>}
      {canSwap && (
        <p>
          {t('signin.swap-token.you-receive')}:{' '}
          <strong>{niceNumber(estimate.output.toFixed(), 6)} {niceCurrency(receiveAsset.currency)}</strong>
        </p>
      )}
    </div>
  )
}
