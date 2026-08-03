import { useMemo, useState } from 'react'
import BigNumber from 'bignumber.js'
import { IoSwapVertical } from 'react-icons/io5'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'
import TokenSelector from '../components/UI/TokenSelector'
import useOrderBook from '../components/Trade/useOrderBook'
import TradeChart from '../components/Trade/TradeChart'
import { nativeCurrency, explorerName, network } from '../utils'
import { rlusdToken } from '../utils/issuedTokens'
import { niceCurrency } from '../utils/format'
import styles from '../styles/pages/trade.module.scss'

const nativeAsset = { currency: nativeCurrency }
const defaultQuoteAsset = rlusdToken(network)
const BOOK_ROWS_PER_SIDE = 6
const MARKET_CUSHION = new BigNumber(0.02)
const TF_IMMEDIATE_OR_CANCEL = 131072
const TF_SELL = 524288
const tokenName = (token) => (token?.currency ? niceCurrency(token.currency) : '—')
const validNumber = (value) => {
  const number = new BigNumber(value || 0)
  return number.isFinite() && number.gt(0)
}
const validAssetAmount = (asset, value) => validNumber(value) && (asset?.issuer || new BigNumber(value).gte(0.000001))
const transactionAmount = (asset, value) =>
  asset.issuer
    ? { currency: asset.currency, issuer: asset.issuer, value: new BigNumber(value).precision(16).toFixed() }
    : new BigNumber(value).multipliedBy(1_000_000).integerValue(BigNumber.ROUND_DOWN).toFixed(0)
const displayNumber = (value, decimals = 8) => {
  const number = BigNumber.isBigNumber(value) ? value : new BigNumber(value ?? NaN)
  if (!number.isFinite()) return '—'
  return number
    .toFormat(decimals, BigNumber.ROUND_DOWN, { groupSeparator: ',', decimalSeparator: '.', groupSize: 3 })
    .replace(/\.?0+$/, '') || '0'
}

const bookPriceDecimals = (bids, asks) => {
  const reference = asks[0]?.price || bids[0]?.price
  if (!reference?.isFinite()) return 5
  if (reference.gte(1000)) return 2
  if (reference.gte(1)) return 5
  if (reference.gte(0.01)) return 6
  return 8
}

const bookNumber = (value, decimals, fixed = false) => {
  if (!value?.isFinite()) return '—'
  const formatted = value.toFormat(decimals, BigNumber.ROUND_HALF_UP, {
    groupSeparator: ',',
    decimalSeparator: '.',
    groupSize: 3
  })
  if (fixed) return formatted
  const trimmed = formatted.replace(/\.?0+$/, '')
  if (trimmed !== '0') return trimmed
  return value.gt(0) ? `<${new BigNumber(1).shiftedBy(-decimals).toFixed(decimals)}` : '0'
}

const aggregateBook = (offers, side, step) => {
  const levels = new Map()
  offers.forEach((offer) => {
    const price = offer.price
      .dividedBy(step)
      .integerValue(side === 'ask' ? BigNumber.ROUND_CEIL : BigNumber.ROUND_FLOOR)
      .multipliedBy(step)
    const key = price.toFixed()
    const current = levels.get(key)
    if (current) {
      current.amount = current.amount.plus(offer.amount)
      current.total = current.total.plus(offer.total)
    } else {
      levels.set(key, { price, amount: offer.amount, total: offer.total })
    }
  })
  return [...levels.values()].slice(0, BOOK_ROWS_PER_SIDE)
}

const withCumulativeTotal = (offers) => {
  let cumulativeAmount = new BigNumber(0)
  let cumulativeTotal = new BigNumber(0)
  return offers.map((offer) => {
    cumulativeAmount = cumulativeAmount.plus(offer.amount)
    cumulativeTotal = cumulativeTotal.plus(offer.total)
    return { ...offer, cumulativeAmount, cumulativeTotal }
  })
}

const marketFill = (offers, requestedAmount) => {
  if (!validNumber(requestedAmount)) return null
  let remaining = new BigNumber(requestedAmount)
  let total = new BigNumber(0)
  let worstPrice = null
  for (const offer of offers) {
    if (!remaining.gt(0)) break
    const filled = BigNumber.minimum(remaining, offer.amount)
    total = total.plus(filled.multipliedBy(offer.price))
    remaining = remaining.minus(filled)
    worstPrice = offer.price
  }
  return { total, worstPrice, complete: !remaining.gt(0) }
}

export const getServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale, ['common', 'trade'])) }
})

export default function Trade({ setSignRequest }) {
  const { t } = useTranslation('trade')
  const [baseAsset, setBaseAsset] = useState(nativeAsset)
  const [quoteAsset, setQuoteAsset] = useState(defaultQuoteAsset)
  const [side, setSide] = useState('buy')
  const [orderType, setOrderType] = useState('limit')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [aggregationLevel, setAggregationLevel] = useState(0)
  const { bids, asks, status, error } = useOrderBook(baseAsset, quoteAsset)
  const limitTotal = useMemo(() => {
    if (!validNumber(price) || !validNumber(amount)) return ''
    return new BigNumber(price).multipliedBy(amount).toFixed()
  }, [price, amount])
  const marketEstimate = useMemo(
    () => marketFill(side === 'buy' ? asks : bids, amount),
    [side, asks, bids, amount]
  )
  const total = orderType === 'market' && marketEstimate?.complete ? marketEstimate.total.toFixed() : limitTotal
  const bestBid = bids[0]?.price
  const bestAsk = asks[0]?.price
  const priceDecimals = bookPriceDecimals(bids, asks)
  const defaultAggregationDecimals = Math.max(0, priceDecimals - 1)
  const aggregationStep = useMemo(
    () => new BigNumber(10).pow(aggregationLevel - defaultAggregationDecimals),
    [aggregationLevel, defaultAggregationDecimals]
  )
  const visibleAsks = useMemo(() => aggregateBook(asks, 'ask', aggregationStep), [asks, aggregationStep])
  const visibleBids = useMemo(() => aggregateBook(bids, 'bid', aggregationStep), [bids, aggregationStep])
  const cumulativeAsks = useMemo(() => withCumulativeTotal(visibleAsks), [visibleAsks])
  const cumulativeBids = useMemo(() => withCumulativeTotal(visibleBids), [visibleBids])
  const spread = bestBid && bestAsk ? bestAsk.minus(bestBid) : null
  const pairReady = baseAsset?.currency && quoteAsset?.currency
  const samePair = pairReady && baseAsset.currency === quoteAsset.currency && (baseAsset.issuer || '') === (quoteAsset.issuer || '')
  const marketReady = orderType === 'market' && marketEstimate?.complete && marketEstimate.worstPrice
  const formReady = pairReady && !samePair && validAssetAmount(baseAsset, amount) && validAssetAmount(quoteAsset, total) && (orderType === 'limit' ? validNumber(price) : marketReady)

  const swapPair = () => {
    setBaseAsset(quoteAsset || nativeAsset)
    setQuoteAsset(baseAsset)
    setPrice('')
    setAmount('')
  }

  const selectOffer = (offer, offerSide) => {
    setOrderType('limit')
    setPrice(offer.price.toFixed())
    setSide(offerSide === 'ask' ? 'buy' : 'sell')
  }

  const submit = () => {
    if (!formReady) return
    const base = transactionAmount(baseAsset, amount)
    const marketLimitPrice = marketReady
      ? marketEstimate.worstPrice.multipliedBy(side === 'buy' ? new BigNumber(1).plus(MARKET_CUSHION) : new BigNumber(1).minus(MARKET_CUSHION))
      : null
    const quoteValue = orderType === 'market' ? new BigNumber(amount).multipliedBy(marketLimitPrice) : new BigNumber(total)
    const quote = transactionAmount(quoteAsset, quoteValue)
    setSignRequest({
      request: {
        TransactionType: 'OfferCreate',
        TakerGets: side === 'sell' ? base : quote,
        TakerPays: side === 'sell' ? quote : base,
        ...(orderType === 'market' && { Flags: TF_IMMEDIATE_OR_CANCEL | (side === 'sell' ? TF_SELL : 0) })
      }
    })
  }

  const renderRows = (offers, offerSide) =>
    offers.map((offer, index) => (
      <div className={`${styles.row} ${styles[offerSide]}`} key={`${offerSide}-${index}`} onClick={() => selectOffer(offer, offerSide)}>
        <span title={offer.price.toFixed()}>{bookNumber(offer.price, priceDecimals, true)}</span>
        <span title={`${t('book.levelAmount', { defaultValue: 'This level' })}: ${offer.amount.toFixed()}`}>{bookNumber(offer.cumulativeAmount, offer.cumulativeAmount.gte(1) ? 4 : 8, true)}</span>
        <span title={`${t('book.levelTotal', { defaultValue: 'This level' })}: ${offer.total.toFixed()}`}>{bookNumber(offer.cumulativeTotal, offer.cumulativeTotal.gte(1) ? 4 : 8, true)}</span>
      </div>
    ))

  return (
    <>
      <SEO title={t('seo.title')} description={t('seo.description', { explorerName })} noindexQuery />
      <div className={styles.page}>
        <div className={styles.intro}>
          <h1>{t('title')}</h1>
          <p>{t('description')}</p>
        </div>

        <div className={styles.layout}>
          <div className={styles.tradeColumn}>
            <section className={styles.pairBar} aria-label={t('pair.title')}>
              <div className={styles.pairHeader}>
                <strong>{t('pair.title')}</strong>
                <button type="button" className={styles.swapPair} onClick={swapPair} aria-label={t('pair.switch')}>
                  <IoSwapVertical />
                </button>
              </div>
              <div><span className={styles.selectorLabel}>{t('pair.base')}</span><TokenSelector value={baseAsset} onChange={setBaseAsset} excludeLPtokens /></div>
              <div><span className={styles.selectorLabel}>{t('pair.quote')}</span><TokenSelector value={quoteAsset} onChange={setQuoteAsset} excludeLPtokens /></div>
            </section>

            <section className={styles.panel}>
              <div className={styles.sideTabs}>
                <button type="button" className={side === 'buy' ? styles.activeBuy : ''} onClick={() => setSide('buy')}>{t('form.buy', { asset: tokenName(baseAsset) })}</button>
                <button type="button" className={side === 'sell' ? styles.activeSell : ''} onClick={() => setSide('sell')}>{t('form.sell', { asset: tokenName(baseAsset) })}</button>
              </div>
              <div className={styles.orderTypeTabs} role="group" aria-label={t('form.orderType')}>
                <button type="button" className={orderType === 'market' ? styles.activeOrderType : ''} onClick={() => setOrderType('market')}>{t('form.market', { defaultValue: 'Market' })}</button>
                <button type="button" className={orderType === 'limit' ? styles.activeOrderType : ''} onClick={() => setOrderType('limit')}>{t('form.limit')}</button>
              </div>
              <label className={styles.field}>
                <span className={styles.fieldHeader}><span>{t('form.amount')}</span></span>
                <span className={styles.inputWrap}><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /><strong>{tokenName(baseAsset)}</strong></span>
              </label>
              {orderType === 'limit' && <label className={styles.field}>
                <span className={styles.fieldHeader}><span>{t('form.price')}</span><span>{t('form.per', { base: tokenName(baseAsset) })}</span></span>
                <span className={styles.inputWrap}><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /><strong>{tokenName(quoteAsset)}</strong></span>
              </label>}
              <div className={styles.summary}>
                <div className={styles.summaryRow}><span>{t('form.total')}</span><strong>{total ? displayNumber(new BigNumber(total)) : '0'} {tokenName(quoteAsset)}</strong></div>
                <div className={styles.summaryRow}><span>{t('form.orderType')}</span><strong>{t(`form.${orderType}`, { defaultValue: orderType === 'market' ? 'Market' : 'Limit' })}</strong></div>
              </div>
              <button type="button" className={`button-action ${styles.submit}`} disabled={!formReady} onClick={submit}>{t(`form.review-${side}`)}</button>
              {!pairReady && <p className={styles.hint}>{t('form.selectPair')}</p>}
              {samePair && <p className={styles.error}>{t('form.sameAsset')}</p>}
              {orderType === 'market' && validNumber(amount) && !marketEstimate?.complete && <p className={styles.error}>{t('form.insufficientLiquidity', { defaultValue: 'Not enough visible liquidity to fill this market order.' })}</p>}
              {orderType === 'market' && marketEstimate?.complete && <p className={styles.hint}>{t('form.marketCushion', { defaultValue: 'Estimated total · includes 2% price protection.' })}</p>}
              <p className={styles.hint}>{t('form.walletHint')}</p>
            </section>
          </div>

          <section className={styles.book}>
            <div className={styles.bookHeader}><h2>{t('book.title')}</h2><span className={styles.status}><i className={`${styles.dot} ${status === 'ready' ? styles.ready : ''}`} />{t(`book.status.${status}`)}</span></div>
            {!pairReady || samePair ? <div className={styles.empty}>{t('book.selectPair')}</div> : error ? <div className={styles.empty}>{t('book.error')}</div> : (
              <>
                <div className={styles.tableHeader}><span>{t('book.price', { quote: tokenName(quoteAsset) })}</span><span title={t('book.cumulativeAmountHint', { defaultValue: 'Cumulative base amount through this price level' })}>{t('book.amount', { base: tokenName(baseAsset) })}</span><span title={t('book.cumulativeHint', { defaultValue: 'Cumulative quote amount through this price level' })}>{t('book.cumulative', { quote: tokenName(quoteAsset), defaultValue: `Total (${tokenName(quoteAsset)})` })}</span></div>
                {renderRows([...cumulativeAsks].reverse(), 'ask')}
                <div className={styles.spread}><span>{t('book.spread')}</span><strong>{spread ? `${bookNumber(spread, priceDecimals, true)} ${tokenName(quoteAsset)}` : '—'}</strong></div>
                {renderRows(cumulativeBids, 'bid')}
                {status === 'ready' && !asks.length && !bids.length && <div className={styles.empty}>{t('book.empty')}</div>}
                <div className={styles.aggregation}>
                  <span>{t('book.aggregation', { defaultValue: 'Aggregation' })}</span>
                  <strong>{bookNumber(aggregationStep, priceDecimals)}</strong>
                  <button type="button" onClick={() => setAggregationLevel((level) => Math.max(-1, level - 1))} disabled={aggregationLevel === -1} aria-label={t('book.finer', { defaultValue: 'Finer aggregation' })}>−</button>
                  <button type="button" onClick={() => setAggregationLevel((level) => Math.min(4, level + 1))} disabled={aggregationLevel === 4} aria-label={t('book.coarser', { defaultValue: 'Coarser aggregation' })}>+</button>
                </div>
              </>
            )}
          </section>

          <TradeChart
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            baseName={tokenName(baseAsset)}
            quoteName={tokenName(quoteAsset)}
            className={styles.chart}
            headerClassName={styles.chartHeader}
            controlsClassName={styles.chartControls}
            periodClassName={styles.chartPeriods}
            activePeriodClassName={styles.activeChartPeriod}
            labels={{
              title: t('chart.title', { defaultValue: 'Price chart' }),
              intervalLabel: t('chart.interval', { defaultValue: 'Candle interval' }),
              chartTypeLabel: t('chart.type', { defaultValue: 'Chart type' }),
              candles: t('chart.candles', { defaultValue: 'Candles' }),
              line: t('chart.line', { defaultValue: 'Line' }),
              loading: t('chart.loading', { defaultValue: 'Loading trades…' }),
              empty: t('chart.empty', { defaultValue: 'No trades for this pair in the last 24 hours' }),
              error: t('chart.error', { defaultValue: 'Price history is temporarily unavailable' })
            }}
          />
        </div>
      </div>
    </>
  )
}
