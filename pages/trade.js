import { useMemo, useState } from 'react'
import BigNumber from 'bignumber.js'
import { IoSwapVertical } from 'react-icons/io5'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'
import TokenSelector from '../components/UI/TokenSelector'
import useOrderBook from '../components/Trade/useOrderBook'
import TradeChart from '../components/Trade/TradeChart'
import RecentTrades from '../components/Trade/RecentTrades'
import UserOrders from '../components/Trade/UserOrders'
import useTradeBalances, { tradeBalanceKey } from '../components/Trade/useTradeBalance'
import useTradeHistory from '../components/Trade/useTradeHistory'
import { nativeCurrency, explorerName, network } from '../utils'
import { rlusdToken } from '../utils/issuedTokens'
import { niceCurrency } from '../utils/format'
import styles from '../styles/pages/trade.module.scss'

const nativeAsset = { currency: nativeCurrency }
const defaultQuoteAsset = rlusdToken(network)
const BOOK_ROWS_PER_SIDE = 6
const MARKET_CUSHION = new BigNumber(0.02)
const TF_PARTIAL_PAYMENT = 131072
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

const assetDecimalsByRate = (rate, asset) => {
  const value = new BigNumber(rate ?? NaN)
  if (!value.isFinite() || !value.gt(0)) return asset?.issuer ? 4 : 6
  const decimals = value.gte(1000) ? 8 : value.gte(10) ? 6 : value.gte(0.001) ? 2 : 0
  return asset?.issuer ? decimals : Math.min(decimals, 6)
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

const swapFill = (offers, inputAmount, side) => {
  if (!validNumber(inputAmount)) return null
  let remainingInput = new BigNumber(inputAmount)
  let output = new BigNumber(0)
  for (const offer of offers) {
    if (!remainingInput.gt(0)) break
    if (side === 'buy') {
      const spent = BigNumber.minimum(remainingInput, offer.total)
      output = output.plus(spent.dividedBy(offer.price))
      remainingInput = remainingInput.minus(spent)
    } else {
      const spent = BigNumber.minimum(remainingInput, offer.amount)
      output = output.plus(spent.multipliedBy(offer.price))
      remainingInput = remainingInput.minus(spent)
    }
  }
  return { output, complete: !remainingInput.gt(0) }
}

const ammSwapFill = (amm, inputAmount, side) => {
  if (!amm || !validNumber(inputAmount)) return null
  const reserveIn = side === 'buy' ? amm.quote : amm.base
  const reserveOut = side === 'buy' ? amm.base : amm.quote
  const feeMultiplier = new BigNumber(1).minus(new BigNumber(amm.tradingFee || 0).dividedBy(100000))
  const effectiveInput = new BigNumber(inputAmount).multipliedBy(feeMultiplier)
  const output = reserveOut.multipliedBy(effectiveInput).dividedBy(reserveIn.plus(effectiveInput))
  return output.gt(0) ? { output, complete: true, source: 'amm' } : null
}

export const getServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale, ['common', 'trade'])) }
})

export default function Trade({ setSignRequest, account, refreshPage }) {
  const { t } = useTranslation('trade')
  const [baseAsset, setBaseAsset] = useState(nativeAsset)
  const [quoteAsset, setQuoteAsset] = useState(defaultQuoteAsset)
  const [side, setSide] = useState('buy')
  const [orderType, setOrderType] = useState('swap')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [aggregationLevel, setAggregationLevel] = useState(0)
  const { bids, asks, amm, status, error } = useOrderBook(baseAsset, quoteAsset)
  const tradeHistory = useTradeHistory(baseAsset, quoteAsset)
  const { balances, trustlines, loading: balanceLoading } = useTradeBalances(account?.address, [baseAsset, quoteAsset], refreshPage)
  const baseBalance = balances[tradeBalanceKey(baseAsset)] ?? null
  const quoteBalance = balances[tradeBalanceKey(quoteAsset)] ?? null
  const spendAsset = side === 'sell' ? baseAsset : quoteAsset
  const receiveAsset = side === 'sell' ? quoteAsset : baseAsset
  const spendBalance = side === 'sell' ? baseBalance : quoteBalance
  const receiveTrustlineMissing = !!account?.address && !!receiveAsset?.issuer && receiveAsset.issuer !== account.address && trustlines[tradeBalanceKey(receiveAsset)] === false
  const limitTotal = useMemo(() => {
    if (!validNumber(price) || !validNumber(amount)) return ''
    return new BigNumber(price).multipliedBy(amount).toFixed()
  }, [price, amount])
  const swapEstimate = useMemo(
    () => {
      const bookEstimate = swapFill(side === 'buy' ? asks : bids, amount, side)
      const ammEstimate = ammSwapFill(amm, amount, side)
      if (!bookEstimate?.complete) return ammEstimate || bookEstimate
      if (!ammEstimate || bookEstimate.output.gte(ammEstimate.output)) return { ...bookEstimate, source: 'book' }
      return ammEstimate
    },
    [side, asks, bids, amm, amount]
  )
  const total = orderType === 'swap' && swapEstimate?.complete ? swapEstimate.output.toFixed() : limitTotal
  const minimumReceived = orderType === 'swap' && swapEstimate?.complete
    ? swapEstimate.output.multipliedBy(new BigNumber(1).minus(MARKET_CUSHION))
    : null
  const bestBid = bids[0]?.price
  const bestAsk = asks[0]?.price
  const referencePrice = bestAsk || bestBid || (amm ? amm.quote.dividedBy(amm.base) : null)
  const baseAmountDecimals = assetDecimalsByRate(referencePrice, baseAsset)
  const quoteAmountDecimals = assetDecimalsByRate(referencePrice?.gt(0) ? new BigNumber(1).dividedBy(referencePrice) : null, quoteAsset)
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
  const swapReady = orderType === 'swap' && swapEstimate?.complete && swapEstimate.output.gt(0)
  const requiredSpend = orderType === 'swap' || side === 'sell' ? new BigNumber(amount || 0) : new BigNumber(total || 0)
  const spendWithinBalance = !account?.address || spendBalance === null || requiredSpend.lte(spendBalance)
  const formReady = pairReady && !samePair && !receiveTrustlineMissing && spendWithinBalance && (
    orderType === 'swap'
      ? !!account?.address && validAssetAmount(spendAsset, amount) && validAssetAmount(receiveAsset, total) && swapReady
      : validAssetAmount(baseAsset, amount) && validAssetAmount(quoteAsset, total) && validNumber(price)
  )
  const maxAmount = useMemo(() => {
    if (!spendBalance?.gt(0)) return null
    if (orderType === 'swap') return spendBalance
    if (side === 'sell') return spendBalance
    return validNumber(price) ? spendBalance.dividedBy(price) : null
  }, [spendBalance, side, orderType, price])

  const swapPair = () => {
    setBaseAsset(quoteAsset || nativeAsset)
    setQuoteAsset(baseAsset)
    setPrice('')
    setAmount('')
  }

  const changeSide = (nextSide) => {
    if (nextSide === side) return
    setSide(nextSide)
    if (orderType === 'swap') setAmount('')
  }

  const changeBaseAsset = (asset) => {
    setBaseAsset(asset)
    setAmount('')
    setPrice('')
  }

  const changeQuoteAsset = (asset) => {
    setQuoteAsset(asset)
    setAmount('')
    setPrice('')
  }

  const changeOrderType = (nextOrderType) => {
    if (nextOrderType === orderType) return
    setOrderType(nextOrderType)
    setAmount('')
  }

  const selectOffer = (offer, offerSide) => {
    setOrderType('limit')
    setPrice(offer.price.toFixed())
    setSide(offerSide === 'ask' ? 'buy' : 'sell')
    setAmount('')
  }

  const submit = () => {
    if (!formReady) return
    if (orderType === 'swap') {
      const output = swapEstimate.output
      setSignRequest({
        request: {
          TransactionType: 'Payment',
          Account: account.address,
          Destination: account.address,
          SendMax: transactionAmount(spendAsset, amount),
          Amount: transactionAmount(receiveAsset, output),
          DeliverMin: transactionAmount(receiveAsset, minimumReceived),
          Flags: TF_PARTIAL_PAYMENT
        },
        callback: () => {}
      })
      return
    }
    const base = transactionAmount(baseAsset, amount)
    const quote = transactionAmount(quoteAsset, total)
    setSignRequest({
      request: {
        TransactionType: 'OfferCreate',
        TakerGets: side === 'sell' ? base : quote,
        TakerPays: side === 'sell' ? quote : base
      },
      callback: () => {}
    })
  }

  const applyMaxAmount = () => {
    if (!maxAmount?.gt(0)) return
    const amountAsset = orderType === 'swap' ? spendAsset : baseAsset
    setAmount(maxAmount.toFixed(amountAsset.issuer ? 15 : 6, BigNumber.ROUND_DOWN).replace(/\.?0+$/, ''))
  }

  const addReceiveToken = () => {
    if (!receiveTrustlineMissing) return
    setSignRequest({
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: receiveAsset.currency,
          issuer: receiveAsset.issuer
        }
      }
    })
  }

  const renderRows = (offers, offerSide) =>
    offers.map((offer, index) => (
      <div className={`${styles.row} ${styles[offerSide]}`} key={`${offerSide}-${index}`} onClick={() => selectOffer(offer, offerSide)}>
        <span title={offer.price.toFixed()}>{bookNumber(offer.price, priceDecimals, true)}</span>
        <span title={`${t('book.levelAmount', { defaultValue: 'This level' })}: ${offer.amount.toFixed()}`}>{bookNumber(offer.cumulativeAmount, baseAmountDecimals, true)}</span>
        <span title={`${t('book.levelTotal', { defaultValue: 'This level' })}: ${offer.total.toFixed()}`}>{bookNumber(offer.cumulativeTotal, quoteAmountDecimals, true)}</span>
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
              <div>
                <span className={styles.selectorLabel}>{t('pair.base')}</span>
                <TokenSelector value={baseAsset} onChange={changeBaseAsset} destinationAddress={account?.address || null} senderAddress={account?.address || null} excludeLPtokens />
                {account?.address && <span className={styles.pairBalance}>{balanceLoading ? t('form.balanceLoading', { defaultValue: 'Loading balance…' }) : `${t('form.balance', { defaultValue: 'Balance' })}: ${baseBalance === null ? '—' : bookNumber(baseBalance, baseAmountDecimals, true)} ${tokenName(baseAsset)}`}</span>}
              </div>
              <div>
                <span className={styles.selectorLabel}>{t('pair.quote')}</span>
                <TokenSelector value={quoteAsset} onChange={changeQuoteAsset} destinationAddress={account?.address || null} senderAddress={account?.address || null} excludeLPtokens />
                {account?.address && <span className={styles.pairBalance}>{balanceLoading ? t('form.balanceLoading', { defaultValue: 'Loading balance…' }) : `${t('form.balance', { defaultValue: 'Balance' })}: ${quoteBalance === null ? '—' : bookNumber(quoteBalance, quoteAmountDecimals, true)} ${tokenName(quoteAsset)}`}</span>}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.sideTabs}>
                <button type="button" className={side === 'buy' ? styles.activeBuy : ''} onClick={() => changeSide('buy')}>{t('form.buy', { asset: tokenName(baseAsset) })}</button>
                <button type="button" className={side === 'sell' ? styles.activeSell : ''} onClick={() => changeSide('sell')}>{t('form.sell', { asset: tokenName(baseAsset) })}</button>
              </div>
              <div className={styles.orderTypeTabs} role="group" aria-label={t('form.orderType')}>
                <button type="button" className={orderType === 'swap' ? styles.activeOrderType : ''} onClick={() => changeOrderType('swap')}>{t('form.swap', { defaultValue: 'Swap' })}</button>
                <button type="button" className={orderType === 'limit' ? styles.activeOrderType : ''} onClick={() => changeOrderType('limit')}>{t('form.limit')}</button>
              </div>
              <label className={styles.field}>
                <span className={styles.fieldHeader}>
                  <span>{orderType === 'swap' ? t('form.youPay', { defaultValue: 'You pay' }) : t('form.amount')}</span>
                  {account?.address && maxAmount?.gt(0) && <span className={styles.availableBalance}><button type="button" onClick={applyMaxAmount}>{t('form.max', { defaultValue: 'Max' })}</button></span>}
                </span>
                <span className={styles.inputWrap}><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /><strong>{tokenName(orderType === 'swap' ? spendAsset : baseAsset)}</strong></span>
              </label>
              {orderType === 'limit' && <label className={styles.field}>
                <span className={styles.fieldHeader}><span>{t('form.price')}</span><span>{t('form.per', { base: tokenName(baseAsset) })}</span></span>
                <span className={styles.inputWrap}><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /><strong>{tokenName(quoteAsset)}</strong></span>
              </label>}
              <div className={styles.summary}>
                <div className={styles.summaryRow}><span>{orderType === 'swap' ? t('form.youReceive', { defaultValue: 'You receive' }) : t('form.total')}</span><strong>{total ? bookNumber(new BigNumber(total), orderType === 'swap' && side === 'buy' ? baseAmountDecimals : quoteAmountDecimals, true) : '0'} {tokenName(orderType === 'swap' ? receiveAsset : quoteAsset)}</strong></div>
                {orderType === 'swap' && <div className={styles.summaryRow}><span>{t('form.minimumReceived', { defaultValue: 'Minimum received' })}</span><strong>{minimumReceived ? bookNumber(minimumReceived, side === 'buy' ? baseAmountDecimals : quoteAmountDecimals, true) : '0'} {tokenName(receiveAsset)}</strong></div>}
              </div>
              {orderType === 'swap' && !account?.address
                ? <button type="button" className={`button-action ${styles.submit}`} onClick={() => setSignRequest({ request: { TransactionType: 'SignIn' } })}>{t('form.signInToSwap', { defaultValue: 'Sign in to swap' })}</button>
                : receiveTrustlineMissing
                  ? <button type="button" className={`button-action ${styles.submit}`} onClick={addReceiveToken}>{t('menu.services.add-token', { ns: 'common' })}: {tokenName(receiveAsset)}</button>
                  : <button type="button" className={`button-action ${styles.submit}`} disabled={!formReady} onClick={submit}>{orderType === 'swap' ? t('form.reviewSwap', { defaultValue: 'Review swap' }) : t(`form.review-${side}`)}</button>}
              {!pairReady && <p className={styles.hint}>{t('form.selectPair')}</p>}
              {samePair && <p className={styles.error}>{t('form.sameAsset')}</p>}
              {account?.address && spendBalance !== null && requiredSpend.gt(spendBalance) && <p className={styles.error}>{t('form.insufficientBalance', { defaultValue: 'Insufficient available balance.' })}</p>}
              {orderType === 'swap' && validNumber(amount) && !swapEstimate?.complete && <p className={styles.error}>{t('form.insufficientLiquidity', { defaultValue: 'Not enough visible liquidity for this swap.' })}</p>}
              {orderType === 'swap' && swapEstimate?.complete && <p className={styles.hint}>{t('form.swapProtection', { defaultValue: 'Estimated result · protected against more than 2% slippage.' })} {swapEstimate.source === 'amm' && t('form.ammEstimate', { defaultValue: 'Estimated using AMM liquidity.' })}</p>}
              <p className={styles.hint}>{t('form.walletHint')}</p>
            </section>
          </div>

          <div className={styles.bookColumn}>
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
            <section className={styles.ammLiquidity}>
              <div>
                <h2>{t('amm.title', { defaultValue: 'AMM liquidity' })}</h2>
                <span>{amm ? t('amm.available', { defaultValue: 'Available for this pair' }) : t('amm.unavailable', { defaultValue: 'No AMM pool for this pair' })}</span>
              </div>
              {amm && <div className={styles.ammStats}>
                <span><small>{tokenName(baseAsset)}</small><strong>{bookNumber(amm.base, baseAmountDecimals, true)}</strong></span>
                <span><small>{tokenName(quoteAsset)}</small><strong>{bookNumber(amm.quote, quoteAmountDecimals, true)}</strong></span>
                <span><small>{t('amm.fee', { defaultValue: 'Trading fee' })}</small><strong>{displayNumber(new BigNumber(amm.tradingFee).dividedBy(1000), 3)}%</strong></span>
              </div>}
              {amm && <p>{t('amm.routingNote', { defaultValue: 'A swap can use this pool even when the order book has no matching offers.' })}</p>}
            </section>
            <UserOrders
              account={account}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              baseName={tokenName(baseAsset)}
              quoteName={tokenName(quoteAsset)}
              baseDecimals={baseAmountDecimals}
              priceDecimals={priceDecimals}
              setSignRequest={setSignRequest}
              refreshPage={refreshPage}
              className={styles.userOrders}
              labels={{
                title: t('orders.title', { defaultValue: 'Your open orders' }),
                side: t('orders.side', { defaultValue: 'Side' }),
                amount: t('orders.amount', { defaultValue: 'Amount' }),
                price: t('orders.price', { defaultValue: 'Price' }),
                action: t('orders.action', { defaultValue: 'Action' }),
                buy: t('orders.buy', { defaultValue: 'Buy' }),
                sell: t('orders.sell', { defaultValue: 'Sell' }),
                cancel: t('orders.cancel', { defaultValue: 'Cancel' }),
                signIn: t('orders.signIn', { defaultValue: 'Sign in to view your open orders.' }),
                loading: t('orders.loading', { defaultValue: 'Loading your open orders…' }),
                empty: t('orders.empty', { defaultValue: 'You have no open orders for this pair.' })
              }}
            />
          </div>

          <div className={styles.chartColumn}>
            <TradeChart
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              baseName={tokenName(baseAsset)}
              quoteName={tokenName(quoteAsset)}
              history={tradeHistory}
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
            <RecentTrades
              swaps={tradeHistory.swaps}
              loading={tradeHistory.loading}
              error={tradeHistory.error}
              onRefresh={tradeHistory.refresh}
              account={account}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              baseName={tokenName(baseAsset)}
              quoteName={tokenName(quoteAsset)}
              baseDecimals={baseAmountDecimals}
              quoteDecimals={quoteAmountDecimals}
              priceDecimals={priceDecimals}
              className={styles.recentTrades}
              headerClassName={styles.recentTradesHeader}
              labels={{
                title: t('trades.title', { defaultValue: 'Recent trades' }),
                loading: t('trades.loading', { defaultValue: 'Loading recent trades…' }),
                empty: t('trades.empty', { defaultValue: 'No recent trades for this pair.' }),
                error: t('trades.error', { defaultValue: 'Recent trades are temporarily unavailable.' }),
                time: t('trades.time', { defaultValue: 'Time' }),
                price: t('trades.price', { defaultValue: 'Price' }),
                amount: t('trades.amount', { defaultValue: 'Amount' }),
                total: t('trades.total', { defaultValue: 'Total' }),
                transaction: t('trades.transaction', { defaultValue: 'Transaction' }),
                yours: t('trades.yours', { defaultValue: 'Yours' })
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
