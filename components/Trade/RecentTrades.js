import { useMemo } from 'react'
import Link from 'next/link'
import BigNumber from 'bignumber.js'

import { tradePairAmounts } from './useTradeHistory'

const ROW_LIMIT = 8
const formatNumber = (value, decimals) => {
  const number = BigNumber.isBigNumber(value) ? value : new BigNumber(value || 0)
  if (!number.isFinite()) return '—'
  return number.toFormat(decimals, BigNumber.ROUND_DOWN)
}

export default function RecentTrades({ swaps, loading, error, account, baseAsset, quoteAsset, baseName, quoteName, baseDecimals, quoteDecimals, priceDecimals, labels, className }) {
  const trades = useMemo(() => swaps.map((swap) => {
    const { base, quote } = tradePairAmounts(swap, baseAsset, quoteAsset)
    const baseAmount = new BigNumber(base?.value || 0)
    const quoteAmount = new BigNumber(quote?.value || 0)
    const timestamp = Number(swap.timestamp)
    if (!baseAmount.gt(0) || !quoteAmount.gt(0) || !Number.isFinite(timestamp) || !swap.txHash) return null
    return {
      hash: swap.txHash,
      timestamp,
      baseAmount,
      quoteAmount,
      price: quoteAmount.dividedBy(baseAmount),
      mine: !!account?.address && (swap.address1 === account.address || swap.address2 === account.address)
    }
  }).filter(Boolean).sort((left, right) => Number(right.mine) - Number(left.mine) || right.timestamp - left.timestamp).slice(0, ROW_LIMIT), [swaps, baseAsset, quoteAsset, account?.address])

  return (
    <section className={className}>
      <h2>{labels.title} <span>{trades.length}</span></h2>
      {loading ? <p>{labels.loading}</p> : error ? <p>{labels.error}</p> : !trades.length ? <p>{labels.empty}</p> : (
        <div role="table" aria-label={labels.title}>
          <div role="row">
            <span>{labels.time}</span><span>{labels.price}</span><span>{labels.amount}</span><span>{labels.total}</span><span>{labels.transaction}</span>
          </div>
          {trades.map((trade) => (
            <div role="row" key={trade.hash} data-mine={trade.mine || undefined}>
              <time data-label={labels.time} dateTime={new Date(trade.timestamp * 1000).toISOString()}>{new Date(trade.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{trade.mine && <em>{labels.yours}</em>}</time>
              <span data-label={labels.price}>{formatNumber(trade.price, priceDecimals)} {quoteName}</span>
              <span data-label={labels.amount}>{formatNumber(trade.baseAmount, baseDecimals)} {baseName}</span>
              <span data-label={labels.total}>{formatNumber(trade.quoteAmount, quoteDecimals)} {quoteName}</span>
              <Link data-label={labels.transaction} href={`/tx/${trade.hash}`} title={trade.hash}>{trade.hash}</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
