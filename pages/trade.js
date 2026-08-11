import { useEffect, useMemo, useRef, useState } from 'react'
import BigNumber from 'bignumber.js'
import { IoSwapVertical } from 'react-icons/io5'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

import SEO from '../components/SEO'
import TokenSelector from '../components/UI/TokenSelector'
import useOrderBook from '../components/Trade/useOrderBook'
import TradeChart from '../components/Trade/TradeChart'
import UserOrders from '../components/Trade/UserOrders'
import useTradeBalances, { tradeBalanceKey } from '../components/Trade/useTradeBalance'
import useSwapSimulationQuote from '../components/Trade/useSwapSimulationQuote'
import useAssetFiatRate from '../components/SignForms/useAssetFiatRate'
import {
  estimateSwap,
  estimateSwapCost,
  MARKET_CUSHION,
  TF_PARTIAL_PAYMENT,
  transactionAmount,
  validTradeNumber
} from '../components/Trade/swap'
import {
  nativeCurrency,
  explorerName,
  network,
  tradeSimulationRpcServer,
  isAddressValid,
  validateCurrencyCode
} from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { rlusdToken } from '../utils/issuedTokens'
import { niceCurrency, tokenToFiat } from '../utils/format'
import styles from '../styles/pages/trade.module.scss'

const nativeAsset = { currency: nativeCurrency }
const defaultQuoteAsset = rlusdToken(network)
const BOOK_ROWS_PER_SIDE = 7
const MIN_BOOK_LEVEL_FIAT_VALUE = new BigNumber('0.01')
const HIGH_VALUE_ASSET_FIAT_THRESHOLD = new BigNumber(10000)
const HIGH_VALUE_AGGREGATION_DIVISOR = new BigNumber(250)
const STANDARD_AGGREGATION_DIVISOR = new BigNumber(10000)
const MIN_AGGREGATION_LEVEL = -3
const MAX_AGGREGATION_LEVEL = 9
const TRADE_PAIR_QUERY_NAMES = [
  'baseCurrency',
  'baseCurrencyIssuer',
  'quoteCurrency',
  'quoteCurrencyIssuer'
]
const queryValue = (value) => String(Array.isArray(value) ? value[0] || '' : value || '').trim()
const hasTradePairQuery = (query) =>
  TRADE_PAIR_QUERY_NAMES.some((name) => Object.prototype.hasOwnProperty.call(query, name))
const sameTradeAsset = (left, right) =>
  left?.currency === right?.currency && (left?.issuer || '') === (right?.issuer || '')
const tradeAssetFromQuery = (currencyValue, issuerValue, fallback) => {
  const currency = queryValue(currencyValue)
  const issuer = queryValue(issuerValue)
  if (!currency) return fallback
  if (currency === nativeCurrency) return nativeAsset
  if (!validateCurrencyCode(currency).valid || !isAddressValid(issuer)) return fallback
  const asset = { currency, issuer }
  return sameTradeAsset(asset, fallback) ? fallback : asset
}
const replaceTradePairQuery = (router, baseAsset, quoteAsset) => {
  if (!router.isReady) return
  const nextQuery = { ...router.query }
  const setAssetQuery = (prefix, asset) => {
    const currencyName = `${prefix}Currency`
    const issuerName = `${prefix}CurrencyIssuer`
    if (!asset?.currency) {
      delete nextQuery[currencyName]
      delete nextQuery[issuerName]
      return
    }
    nextQuery[currencyName] = asset.currency
    if (asset.issuer) nextQuery[issuerName] = asset.issuer
    else delete nextQuery[issuerName]
  }
  setAssetQuery('base', baseAsset)
  setAssetQuery('quote', quoteAsset)

  const unchanged = TRADE_PAIR_QUERY_NAMES.every(
    (name) =>
      !Array.isArray(router.query[name]) &&
      queryValue(router.query[name]) === queryValue(nextQuery[name])
  )
  if (!unchanged) {
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true, scroll: false })
  }
}
const tokenName = (token) => (token?.currency ? niceCurrency(token.currency) : '—')
const validNumber = validTradeNumber
const validAssetAmount = (asset, value) => validNumber(value) && (asset?.issuer || new BigNumber(value).gte(0.000001))
const swapQuoteErrorText = (t, status, side, spendAsset) => {
  const asset = tokenName(spendAsset)
  if (status === 'nativeBalance') {
    return t('form.nativeBalanceInsufficient', {
      asset: nativeCurrency,
      defaultValue: 'Not enough available {{asset}} to complete this swap and cover the network fee or reserve.'
    })
  }
  if (status === 'partial') {
    return side === 'buy'
      ? t('form.buyBalanceInsufficient', {
          asset,
          defaultValue: 'Not enough {{asset}} balance or market liquidity to buy this amount. Enter a smaller amount.'
        })
      : t('form.swapLiquidityInsufficient', {
          defaultValue: 'There is not enough market liquidity to swap this amount. Enter a smaller amount.'
        })
  }
  if (status === 'empty') {
    return t('form.noRoute', {
      defaultValue: 'No liquidity route is currently available for this pair. Try again later or choose another pair.'
    })
  }
  if (status === 'failed') {
    return t('form.swapFailed', {
      defaultValue: 'XRPL could not execute this swap. The selected token may be restricted or unavailable for trading.'
    })
  }
  return t('form.quoteUnavailable', {
    defaultValue: 'The XRPL execution quote is temporarily unavailable. Please try again.'
  })
}
const estimateFromLiquidity = ({ side, bids, asks, amm, amount }) => side === 'buy'
  ? estimateSwapCost({ bids, asks, amm, outputAmount: amount, side })
  : estimateSwap({ bids, asks, amm, inputAmount: amount, side })
const withoutFiatDust = (offers, quoteFiatRate) => {
  const fiatRate = new BigNumber(quoteFiatRate ?? NaN)
  if (!fiatRate.isFinite() || !fiatRate.gt(0)) return offers

  return offers.filter((offer) => {
    const fiatValue = new BigNumber(offer?.total ?? NaN).multipliedBy(fiatRate)
    return fiatValue.isFinite() && fiatValue.gte(MIN_BOOK_LEVEL_FIAT_VALUE)
  })
}
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
  const trimmed = formatted.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
  if (trimmed !== '0') return trimmed
  return value.gt(0) ? `<${new BigNumber(1).shiftedBy(-decimals).toFixed(decimals)}` : '0'
}

const bookAmountDecimals = (value, fallback) => {
  if (!value?.isFinite() || value.gte(1000)) return fallback
  if (value.gte(100)) return Math.max(fallback, 2)
  if (value.gte(1)) return Math.max(fallback, 4)
  if (value.gte(0.01)) return Math.max(fallback, 6)
  return Math.max(fallback, 8)
}

const niceAggregationStep = (value) => {
  const number = new BigNumber(value ?? NaN)
  if (!number.isFinite() || !number.gt(0)) return null
  const numericValue = number.toNumber()
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null
  const exponent = Math.floor(Math.log10(numericValue))
  const magnitude = new BigNumber(10).pow(exponent)
  const fraction = number.dividedBy(magnitude).toNumber()
  const niceFraction = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10
  return magnitude.multipliedBy(niceFraction)
}

const shiftedAggregationStep = (step, level) =>
  niceAggregationStep(new BigNumber(step).multipliedBy(Math.pow(10, level / 3)))

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
    return {
      ...offer,
      cumulativeAmount,
      cumulativeTotal,
      cumulativePrice: cumulativeTotal.dividedBy(cumulativeAmount)
    }
  })
}

export const getServerSideProps = async (context) => {
  const { query } = context
  return {
    props: {
      initialBaseAsset: tradeAssetFromQuery(
        query.baseCurrency,
        query.baseCurrencyIssuer,
        nativeAsset
      ),
      initialQuoteAsset: tradeAssetFromQuery(
        query.quoteCurrency,
        query.quoteCurrencyIssuer,
        defaultQuoteAsset
      ),
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(context.locale, ['common', 'trade']))
    }
  }
}

export default function Trade({
  setSignRequest,
  account,
  refreshPage,
  selectedCurrency,
  fiatRate,
  initialBaseAsset,
  initialQuoteAsset
}) {
  const { t } = useTranslation('trade')
  const router = useRouter()
  const [baseAsset, setBaseAsset] = useState(initialBaseAsset || nativeAsset)
  const [quoteAsset, setQuoteAsset] = useState(initialQuoteAsset || defaultQuoteAsset)
  const [side, setSide] = useState('buy')
  const [orderType, setOrderType] = useState('swap')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [aggregationLevel, setAggregationLevel] = useState(0)

  useEffect(() => {
    if (!router.isReady) return
    const nextBaseAsset = tradeAssetFromQuery(
      router.query.baseCurrency,
      router.query.baseCurrencyIssuer,
      nativeAsset
    )
    const nextQuoteAsset = tradeAssetFromQuery(
      router.query.quoteCurrency,
      router.query.quoteCurrencyIssuer,
      defaultQuoteAsset
    )
    setBaseAsset((current) => sameTradeAsset(current, nextBaseAsset) ? current : nextBaseAsset)
    setQuoteAsset((current) => sameTradeAsset(current, nextQuoteAsset) ? current : nextQuoteAsset)
    setAmount('')
    setPrice('')
    setAggregationLevel(0)
    if (hasTradePairQuery(router.query)) {
      replaceTradePairQuery(router, nextBaseAsset, nextQuoteAsset)
    }
  }, [
    router,
    router.isReady,
    router.query.baseCurrency,
    router.query.baseCurrencyIssuer,
    router.query.quoteCurrency,
    router.query.quoteCurrencyIssuer
  ])
  const {
    bids: rawBids,
    asks: rawAsks,
    amm,
    hasAmmLiquidity,
    status,
    hasLoaded,
    matchesPair
  } = useOrderBook(baseAsset, quoteAsset)
  const { balances, trustlines, accountFlags, loading: balanceLoading } = useTradeBalances(account?.address, [baseAsset, quoteAsset], refreshPage)
  const baseBalance = baseAsset?.currency ? balances[tradeBalanceKey(baseAsset)] ?? null : null
  const quoteBalance = quoteAsset?.currency ? balances[tradeBalanceKey(quoteAsset)] ?? null : null
  const spendAsset = side === 'sell' ? baseAsset : quoteAsset
  const receiveAsset = side === 'sell' ? quoteAsset : baseAsset
  const spendBalance = side === 'sell' ? baseBalance : quoteBalance
  const baseAssetFiatRate = useAssetFiatRate(baseAsset, selectedCurrency, fiatRate)
  const quoteAssetFiatRate = useAssetFiatRate(quoteAsset, selectedCurrency, fiatRate)
  const bids = useMemo(() => withoutFiatDust(rawBids, quoteAssetFiatRate), [quoteAssetFiatRate, rawBids])
  const asks = useMemo(() => withoutFiatDust(rawAsks, quoteAssetFiatRate), [quoteAssetFiatRate, rawAsks])
  // Synthetic bridge and AMM depth is indicative; only simulation confirms an executable multi-path quote.
  const directBookBids = useMemo(() => bids.filter((offer) => offer.source === 'direct'), [bids])
  const directBookAsks = useMemo(() => asks.filter((offer) => offer.source === 'direct'), [asks])
  const missingTrustlineAssets = account?.address
    ? [baseAsset, quoteAsset].filter((asset) =>
        asset?.issuer &&
        asset.issuer !== account.address &&
        trustlines[tradeBalanceKey(asset)] === false
      )
    : []
  const missingTrustlineAsset = missingTrustlineAssets[0] || null
  const accountGlobalFreezeBlocksTrade = !!account?.address &&
    accountFlags?.globalFreeze === true &&
    (!!baseAsset?.issuer || !!quoteAsset?.issuer)
  const limitTotal = useMemo(() => {
    if (!validNumber(price) || !validNumber(amount)) return ''
    return new BigNumber(price).multipliedBy(amount).toFixed()
  }, [price, amount])
  const marketSwapEstimate = useMemo(
    () => estimateFromLiquidity({ side, bids, asks, amm: null, amount }),
    [side, asks, bids, amount]
  )
  const directSwapEstimate = useMemo(
    () => estimateFromLiquidity({
      side,
      bids: directBookBids,
      asks: directBookAsks,
      amm,
      amount
    }),
    [side, directBookAsks, directBookBids, amm, amount]
  )
  const swapSpendKnownInsufficient = !!account?.address &&
    orderType === 'swap' &&
    spendBalance !== null &&
    validNumber(amount) &&
    (!spendBalance.gt(0) || (side === 'sell' && new BigNumber(amount).gt(spendBalance)))
  const simulationSupported = !!tradeSimulationRpcServer
  const simulationEnabled = simulationSupported &&
    !!account?.address &&
    orderType === 'swap' &&
    !balanceLoading &&
    !missingTrustlineAsset &&
    !accountGlobalFreezeBlocksTrade &&
    !swapSpendKnownInsufficient &&
    baseAsset?.currency &&
    quoteAsset?.currency &&
    (baseAsset.currency !== quoteAsset.currency || (baseAsset.issuer || '') !== (quoteAsset.issuer || '')) &&
    validNumber(amount)
  const simulation = useSwapSimulationQuote({
    account: account?.address,
    spendAsset,
    receiveAsset,
    spendBalance,
    side,
    amount,
    enabled: simulationEnabled
  })
  const simulationQuote = simulation.status === 'ready' ? simulation.quote : null
  const simulationPending = simulationEnabled && simulation.status === 'loading'
  const simulationErrorMessage = swapQuoteErrorText(t, simulation.status, side, spendAsset)
  const fallbackSwapEstimate = simulationSupported ? marketSwapEstimate : directSwapEstimate
  const swapEstimate = simulationQuote
    ? side === 'buy'
      ? { input: simulationQuote.spend, complete: true, source: 'simulation' }
      : { output: simulationQuote.receive, complete: true, source: 'simulation' }
    : fallbackSwapEstimate
  const swapSpend = simulationQuote?.spend || (swapEstimate?.complete
    ? side === 'buy' ? swapEstimate.input : new BigNumber(amount)
    : null)
  const swapReceive = simulationQuote?.receive || (swapEstimate?.complete
    ? side === 'buy' ? new BigNumber(amount) : swapEstimate.output
    : null)
  const total = orderType === 'swap' && swapReceive ? swapReceive.toFixed() : limitTotal
  const minimumReceived = orderType === 'swap' && swapReceive && side === 'sell'
    ? swapReceive.multipliedBy(new BigNumber(1).minus(MARKET_CUSHION))
    : null
  const maximumReceived = orderType === 'swap' && swapReceive && side === 'sell'
    ? swapReceive.multipliedBy(new BigNumber(1).plus(MARKET_CUSHION))
    : null
  const maximumSpent = orderType === 'swap' && swapSpend && side === 'buy'
    ? swapSpend.multipliedBy(new BigNumber(1).plus(MARKET_CUSHION))
    : swapSpend
  const bestBid = bids[0]?.price
  const bestAsk = asks[0]?.price
  const referencePrice = bestAsk || bestBid || (amm ? amm.quote.dividedBy(amm.base) : null)
  const baseAmountDecimalsCandidate = assetDecimalsByRate(referencePrice, baseAsset)
  const quoteAmountDecimalsCandidate = assetDecimalsByRate(referencePrice?.gt(0) ? new BigNumber(1).dividedBy(referencePrice) : null, quoteAsset)
  const priceDecimalsCandidate = bookPriceDecimals(bids, asks)
  const effectiveSwapRate = swapEstimate?.complete && swapSpend?.gt(0) && swapReceive?.gt(0)
    ? side === 'buy'
      ? swapSpend.dividedBy(swapReceive)
      : swapReceive.dividedBy(swapSpend)
    : null
  const fallbackAggregationStep = useMemo(
    () => new BigNumber(10).pow(-Math.max(0, priceDecimalsCandidate - 1)),
    [priceDecimalsCandidate]
  )
  const automaticAggregationStep = useMemo(() => {
    const quoteRate = new BigNumber(quoteAssetFiatRate ?? NaN)
    if (!quoteRate.isFinite() || !quoteRate.gt(0)) return fallbackAggregationStep
    const knownBaseRate = new BigNumber(baseAssetFiatRate ?? NaN)
    const inferredBaseRate = referencePrice?.gt(0) ? referencePrice.multipliedBy(quoteRate) : null
    const aggregationBaseRate = knownBaseRate.isFinite() && knownBaseRate.gt(0)
      ? knownBaseRate
      : inferredBaseRate
    const fiatStep = aggregationBaseRate?.isFinite() && aggregationBaseRate.gt(0)
      ? aggregationBaseRate.dividedBy(
        aggregationBaseRate.gte(HIGH_VALUE_ASSET_FIAT_THRESHOLD)
          ? HIGH_VALUE_AGGREGATION_DIVISOR
          : STANDARD_AGGREGATION_DIVISOR
      )
      : new BigNumber(1)
    return niceAggregationStep(fiatStep.dividedBy(quoteRate)) || fallbackAggregationStep
  }, [baseAssetFiatRate, fallbackAggregationStep, quoteAssetFiatRate, referencePrice])
  const aggregationStep = useMemo(
    () => shiftedAggregationStep(automaticAggregationStep, aggregationLevel) || fallbackAggregationStep,
    [aggregationLevel, automaticAggregationStep, fallbackAggregationStep]
  )
  const visibleAsks = useMemo(() => aggregateBook(asks, 'ask', aggregationStep), [asks, aggregationStep])
  const visibleBids = useMemo(() => aggregateBook(bids, 'bid', aggregationStep), [bids, aggregationStep])
  const cumulativeAsks = useMemo(() => withCumulativeTotal(visibleAsks), [visibleAsks])
  const cumulativeBids = useMemo(() => withCumulativeTotal(visibleBids), [visibleBids])
  const bookTotalDecimalsCandidate = useMemo(
    () => [...cumulativeAsks, ...cumulativeBids].reduce(
      (decimals, offer) => Math.max(decimals, bookAmountDecimals(offer.cumulativeTotal, quoteAmountDecimalsCandidate)),
      quoteAmountDecimalsCandidate
    ),
    [cumulativeAsks, cumulativeBids, quoteAmountDecimalsCandidate]
  )
  const bookPrecisionByPair = useRef(new Map())
  const bookPrecisionKey = `${baseAsset?.currency || ''}:${baseAsset?.issuer || ''}/${quoteAsset?.currency || ''}:${quoteAsset?.issuer || ''}`
  const hasVisibleBookRows = cumulativeAsks.length > 0 || cumulativeBids.length > 0
  if (hasVisibleBookRows && !bookPrecisionByPair.current.has(bookPrecisionKey)) {
    bookPrecisionByPair.current.set(bookPrecisionKey, {
      price: priceDecimalsCandidate,
      baseAmount: baseAmountDecimalsCandidate,
      quoteAmount: quoteAmountDecimalsCandidate,
      total: bookTotalDecimalsCandidate
    })
  }
  const bookPrecision = bookPrecisionByPair.current.get(bookPrecisionKey)
  const priceDecimals = bookPrecision?.price ?? priceDecimalsCandidate
  const baseAmountDecimals = bookPrecision?.baseAmount ?? baseAmountDecimalsCandidate
  const quoteAmountDecimals = bookPrecision?.quoteAmount ?? quoteAmountDecimalsCandidate
  const bookTotalDecimals = bookPrecision?.total ?? bookTotalDecimalsCandidate
  const spread = bestBid && bestAsk ? bestAsk.minus(bestBid) : null
  const pairReady = baseAsset?.currency && quoteAsset?.currency
  const samePair = pairReady && sameTradeAsset(baseAsset, quoteAsset)
  const usesXrpBridgeBook = nativeCurrency === 'XRP' && !!baseAsset?.issuer && !!quoteAsset?.issuer
  const displaysLoadedBook = matchesPair && hasLoaded
  const displayedHasAmmLiquidity = displaysLoadedBook && hasAmmLiquidity
  const bookComposition = displayedHasAmmLiquidity
    ? usesXrpBridgeBook
      ? t('book.combinedWithAmm', { defaultValue: 'Direct + XRP bridge + AMM' })
      : t('book.directWithAmm', { defaultValue: 'Direct + AMM' })
    : usesXrpBridgeBook
      ? t('book.combined', { defaultValue: 'Direct + XRP bridge' })
      : t('book.directOnly', { defaultValue: 'Direct pair' })
  const bookScope = t('book.indicative', { defaultValue: 'Indicative' }) + ' · ' + bookComposition
  const swapReady = orderType === 'swap' && !simulationPending && swapSpend?.gt(0) && swapReceive?.gt(0) && (
    simulationSupported ? !!simulationQuote : !!swapEstimate?.complete
  )
  const requiredSpend = orderType === 'swap'
    ? side === 'sell'
      ? new BigNumber(amount || 0)
      : maximumSpent || new BigNumber(0)
    : side === 'sell' ? new BigNumber(amount || 0) : new BigNumber(total || 0)
  const spendAmountDecimals = side === 'sell' ? baseAmountDecimals : quoteAmountDecimals
  const spendWithinBalance = !swapSpendKnownInsufficient && (
    !account?.address || spendBalance === null || requiredSpend.lte(spendBalance)
  )
  const formReady = pairReady && !samePair && !balanceLoading && !missingTrustlineAsset && !accountGlobalFreezeBlocksTrade && spendWithinBalance && (
    orderType === 'swap'
      ? !!account?.address && validAssetAmount(baseAsset, amount) && validAssetAmount(spendAsset, swapSpend) && validAssetAmount(receiveAsset, swapReceive) && swapReady
      : validAssetAmount(baseAsset, amount) && validAssetAmount(quoteAsset, total) && validNumber(price)
  )
  const spendSummaryAmount = side === 'buy' ? swapSpend : swapReceive
  const spendSummaryFiat = tokenToFiat({
    amount: { ...quoteAsset, value: spendSummaryAmount ? spendSummaryAmount.toFixed() : '0' },
    selectedCurrency,
    fiatRate,
    tokenFiatRate: quoteAssetFiatRate,
    absolute: true,
    asText: true
  })
  const receiveSummaryAmount = side === 'buy' ? swapReceive : swapSpend
  const receiveSummaryFiat = tokenToFiat({
    amount: { ...baseAsset, value: receiveSummaryAmount ? receiveSummaryAmount.toFixed() : '0' },
    selectedCurrency,
    fiatRate,
    tokenFiatRate: baseAssetFiatRate,
    absolute: true,
    asText: true
  })
  const amountFiat = tokenToFiat({
    amount: { ...baseAsset, value: amount || '0' },
    selectedCurrency,
    fiatRate,
    tokenFiatRate: baseAssetFiatRate,
    absolute: true,
    asText: true
  })
  const fiatPlaceholder = '\u00A0'
  const limitTotalFiat = tokenToFiat({
    amount: { ...quoteAsset, value: total || '0' },
    selectedCurrency,
    fiatRate,
    tokenFiatRate: quoteAssetFiatRate,
    absolute: true,
    asText: true
  })
  const maximumOrMinimumFiat = side === 'buy'
    ? tokenToFiat({
      amount: { ...quoteAsset, value: maximumSpent ? maximumSpent.toFixed() : '0' },
      selectedCurrency,
      fiatRate,
      tokenFiatRate: quoteAssetFiatRate,
      absolute: true,
      asText: true
    })
    : tokenToFiat({
      amount: { ...quoteAsset, value: minimumReceived ? minimumReceived.toFixed() : '0' },
      selectedCurrency,
      fiatRate,
      tokenFiatRate: quoteAssetFiatRate,
      absolute: true,
      asText: true
    })
  const maxBookBids = simulationSupported ? bids : directBookBids
  const maxBookAsks = simulationSupported ? asks : directBookAsks
  const maxBookAmm = simulationSupported ? null : amm
  const maxAmount = useMemo(() => {
    if (!spendBalance?.gt(0)) return null
    if (orderType === 'swap' && side === 'buy') {
      const protectedSpend = spendBalance.dividedBy(new BigNumber(1).plus(MARKET_CUSHION))
      const estimate = estimateSwap({
        bids: maxBookBids,
        asks: maxBookAsks,
        amm: maxBookAmm,
        inputAmount: protectedSpend,
        side
      })
      return estimate?.output || null
    }
    if (orderType === 'swap') return spendBalance
    if (side === 'sell') return spendBalance
    return validNumber(price) ? spendBalance.dividedBy(price) : null
  }, [spendBalance, side, orderType, price, maxBookBids, maxBookAsks, maxBookAmm])

  const swapPair = () => {
    const nextBaseAsset = quoteAsset || nativeAsset
    const nextQuoteAsset = baseAsset
    setBaseAsset(nextBaseAsset)
    setQuoteAsset(nextQuoteAsset)
    setPrice('')
    setAmount('')
    setAggregationLevel(0)
    replaceTradePairQuery(router, nextBaseAsset, nextQuoteAsset)
  }

  const changeSide = (nextSide) => {
    if (nextSide === side) return
    setSide(nextSide)
  }

  const changeBaseAsset = (asset) => {
    setBaseAsset(asset)
    setAmount('')
    setPrice('')
    setAggregationLevel(0)
    replaceTradePairQuery(router, asset, quoteAsset)
  }

  const changeQuoteAsset = (asset) => {
    setQuoteAsset(asset)
    setAmount('')
    setPrice('')
    setAggregationLevel(0)
    replaceTradePairQuery(router, baseAsset, asset)
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
      const request = side === 'buy'
        ? {
            TransactionType: 'Payment',
            Account: account.address,
            Destination: account.address,
            SendMax: transactionAmount(spendAsset, maximumSpent),
            Amount: transactionAmount(receiveAsset, amount)
          }
        : {
            TransactionType: 'Payment',
            Account: account.address,
            Destination: account.address,
            SendMax: transactionAmount(spendAsset, amount),
            Amount: transactionAmount(receiveAsset, maximumReceived),
            DeliverMin: transactionAmount(receiveAsset, minimumReceived),
            Flags: TF_PARTIAL_PAYMENT
          }
      if (simulationQuote?.paths.length) request.Paths = simulationQuote.paths
      setSignRequest({
        request,
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
    const amountAsset = baseAsset
    setAmount(maxAmount.toFixed(amountAsset.issuer ? 15 : 6, BigNumber.ROUND_DOWN).replace(/\.?0+$/, ''))
  }

  const addMissingTrustline = () => {
    if (!missingTrustlineAsset) return
    setSignRequest({
      action: 'setTrustline',
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: missingTrustlineAsset.currency,
          issuer: missingTrustlineAsset.issuer
        }
      },
      callback: () => {}
    })
  }

  const renderRows = (offers, offerSide) => {
    const visibleOffers = offers.slice(0, BOOK_ROWS_PER_SIDE)
    const emptyRows = Array(Math.max(BOOK_ROWS_PER_SIDE - visibleOffers.length, 0)).fill(null)
    const rows = offerSide === 'ask'
      ? [...emptyRows, ...visibleOffers]
      : [...visibleOffers, ...emptyRows]

    return rows.map((offer, index) => offer ? (
      <div className={`${styles.row} ${styles[offerSide]}`} key={`${offerSide}-${index}`} onClick={() => selectOffer(offer, offerSide)}>
        <span title={`${t('book.averagePriceHint', { defaultValue: 'Cumulative average price' })}: ${offer.cumulativePrice.toFixed()} · ${t('book.levelPriceHint', { defaultValue: 'Click to use level price' })}: ${offer.price.toFixed()}`}>{bookNumber(offer.cumulativePrice, priceDecimals, true)}</span>
        <span title={`${t('book.levelAmount', { defaultValue: 'This level' })}: ${offer.amount.toFixed()}`}>{bookNumber(offer.cumulativeAmount, baseAmountDecimals, true)}</span>
        <span title={`${t('book.levelTotal', { defaultValue: 'This level' })}: ${offer.total.toFixed()}`}>{bookNumber(offer.cumulativeTotal, bookTotalDecimals, true)}</span>
      </div>
    ) : (
      <div className={`${styles.row} ${styles.placeholderRow}`} key={`${offerSide}-empty-${index}`} aria-hidden="true">
        <span>&nbsp;</span><span>&nbsp;</span><span>&nbsp;</span>
      </div>
    ))
  }

  return (
    <>
      <SEO
        title={t('seo.title')}
        description={t('seo.description', { explorerName })}
        canonicalPath="/trade"
        noindexQuery
      />
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
                <TokenSelector
                  value={baseAsset}
                  onChange={changeBaseAsset}
                  destinationAddress={account?.address || null}
                  senderAddress={account?.address || null}
                  excludeLPtokens
                  modalTitle={t('pair.selectAsset')}
                  allowAllTokens
                  selectedCurrency={selectedCurrency}
                  fiatRate={fiatRate}
                />
                {account?.address && baseAsset?.currency && <span className={styles.pairBalance}>{balanceLoading ? t('form.balanceLoading', { defaultValue: 'Loading balance…' }) : `${t('form.balance', { defaultValue: 'Balance' })}: ${baseBalance === null ? '—' : bookNumber(baseBalance, baseAmountDecimals, true)} ${tokenName(baseAsset)}`}</span>}
              </div>
              <div>
                <span className={styles.selectorLabel}>{t('pair.quote')}</span>
                <TokenSelector
                  value={quoteAsset}
                  onChange={changeQuoteAsset}
                  destinationAddress={account?.address || null}
                  senderAddress={account?.address || null}
                  excludeLPtokens
                  modalTitle={t('pair.selectAsset')}
                  allowAllTokens
                  selectedCurrency={selectedCurrency}
                  fiatRate={fiatRate}
                />
                {account?.address && quoteAsset?.currency && <span className={styles.pairBalance}>{balanceLoading ? t('form.balanceLoading', { defaultValue: 'Loading balance…' }) : `${t('form.balance', { defaultValue: 'Balance' })}: ${quoteBalance === null ? '—' : bookNumber(quoteBalance, quoteAmountDecimals, true)} ${tokenName(quoteAsset)}`}</span>}
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
                  <span>{t('form.amount')}</span>
                  {account?.address && maxAmount?.gt(0) && <span className={styles.availableBalance}><button type="button" onClick={applyMaxAmount}>{t('form.max', { defaultValue: 'Max' })}</button></span>}
                </span>
                <span className={styles.inputWrap}><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /><strong>{tokenName(baseAsset)}</strong></span>
                <span className={styles.summaryFiat}>{amountFiat || fiatPlaceholder}</span>
              </label>
              {orderType === 'limit' && <label className={styles.field}>
                <span className={styles.fieldHeader}><span>{t('form.price')}</span><span>{t('form.per', { base: tokenName(baseAsset) })}</span></span>
                <span className={styles.inputWrap}><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /><strong>{tokenName(quoteAsset)}</strong></span>
              </label>}
              <div className={styles.summary}>
                <div className={styles.summaryRow}>
                  <span>{orderType === 'swap' ? t(side === 'buy' ? 'form.youPay' : 'form.youReceive', { defaultValue: side === 'buy' ? 'You pay' : 'You receive' }) : t('form.total')}</span>
                  <div className={styles.summaryValue}>
                    <strong>{orderType === 'swap'
                      ? `${swapEstimate?.complete ? bookNumber(side === 'buy' ? swapSpend : swapReceive, quoteAmountDecimals, true) : '0'} ${tokenName(quoteAsset)}`
                      : `${total ? bookNumber(new BigNumber(total), quoteAmountDecimals, true) : '0'} ${tokenName(quoteAsset)}`}</strong>
                    <span className={styles.summaryFiat}>
                      {orderType === 'swap' ? (spendSummaryFiat || fiatPlaceholder) : (limitTotalFiat || fiatPlaceholder)}
                    </span>
                  </div>
                </div>
                {orderType === 'swap' && <div className={styles.summaryRow}>
                  <span>{side === 'buy' ? t('form.youReceive', { defaultValue: 'You receive' }) : t('form.youPay', { defaultValue: 'You pay' })}</span>
                  <div className={styles.summaryValue}>
                    <strong>{side === 'buy'
                      ? `${swapReceive ? bookNumber(swapReceive, baseAmountDecimals, true) : '0'} ${tokenName(baseAsset)}`
                      : `${swapSpend ? bookNumber(swapSpend, baseAmountDecimals, true) : '0'} ${tokenName(baseAsset)}`}</strong>
                    <span className={styles.summaryFiat}>{receiveSummaryFiat || fiatPlaceholder}</span>
                  </div>
                </div>}
                {orderType === 'swap' && <div className={styles.summaryRow}>
                  <span>{side === 'buy' ? t('form.maximumPaid', { defaultValue: 'Maximum paid' }) : t('form.minimumReceived', { defaultValue: 'Minimum received' })}</span>
                  <div className={styles.summaryValue}>
                    <strong>{side === 'buy'
                      ? `${maximumSpent ? bookNumber(maximumSpent, quoteAmountDecimals, true) : '0'} ${tokenName(quoteAsset)}`
                      : `${minimumReceived ? bookNumber(minimumReceived, quoteAmountDecimals, true) : '0'} ${tokenName(quoteAsset)}`}</strong>
                    <span className={styles.summaryFiat}>{maximumOrMinimumFiat || fiatPlaceholder}</span>
                  </div>
                </div>}
                {orderType === 'swap' && <div className={styles.summaryRow}>
                  <span>{t('form.rate', { defaultValue: 'Rate' })}</span>
                  <strong>{effectiveSwapRate
                    ? `1 ${tokenName(baseAsset)} ≈ ${bookNumber(effectiveSwapRate, priceDecimals, true)} ${tokenName(quoteAsset)}`
                    : '—'}</strong>
                </div>}
                {orderType === 'swap' && swapEstimate?.complete && !simulationQuote && <p className={styles.scopeNote}>{t('form.marketEstimate', {
                  defaultValue: 'Indicative market estimate; the executable XRPL quote may differ.'
                })}</p>}
              </div>
              {orderType === 'swap' && !account?.address
                ? <button type="button" className={`button-action ${styles.submit}`} onClick={() => setSignRequest({ request: { TransactionType: 'SignIn' } })}>{t('form.signInToSwap', { defaultValue: 'Sign in to swap' })}</button>
                : missingTrustlineAsset
                  ? <button type="button" className={`button-action ${styles.submit}`} onClick={addMissingTrustline}>{t('menu.services.add-token', { ns: 'common' })}: {tokenName(missingTrustlineAsset)}{missingTrustlineAssets.length > 1 ? ` (1/${missingTrustlineAssets.length})` : ''}</button>
                  : <button type="button" className={`button-action ${styles.submit}`} disabled={!formReady} onClick={submit}>{orderType === 'swap'
                    ? simulationPending
                      ? t('form.simulatingSwap', { defaultValue: 'Calculating XRPL quote…' })
                      : t('form.swap', { defaultValue: 'Swap' })
                    : t(`form.review-${side}`)}</button>}
              {!pairReady && <p className={styles.hint}>{t('form.selectPair')}</p>}
              {samePair && <p className={styles.error}>{t('form.sameAsset')}</p>}
              {account?.address && spendBalance !== null && !spendWithinBalance && <p className={styles.error}>{t('form.insufficientBalance', {
                asset: tokenName(spendAsset),
                required: bookNumber(requiredSpend, spendAmountDecimals),
                available: bookNumber(spendBalance, spendAmountDecimals),
                defaultValue: 'Not enough {{asset}}: approximately {{required}} {{asset}} required, {{available}} {{asset}} available.'
              })}</p>}
              {accountGlobalFreezeBlocksTrade && <p className={styles.error}>{accountFlags?.noFreeze
                ? t('form.accountGlobalFreezePermanent', {
                    defaultValue: 'This account has permanent Global Freeze enabled and cannot receive or trade issued tokens. Use another account for this swap.'
                  })
                : t('form.accountGlobalFreeze', {
                    defaultValue: 'This account has Global Freeze enabled and cannot receive or trade issued tokens.'
                  })}</p>}
              {simulationEnabled && spendWithinBalance && <div className={styles.quoteStatus}>
                {!simulationPending && !simulationQuote && <p className={styles.error}>{simulationErrorMessage}</p>}
                {(simulationPending || simulationQuote) && <p className={styles.scopeNote}>{simulationPending
                  ? t('form.simulatingSwap', { defaultValue: 'Calculating XRPL quote…' })
                  : t('form.simulatedQuote', { defaultValue: 'Simulated across direct and XRP routes using order books and AMMs · 2% slippage protection.' })}</p>}
              </div>}
              <p className={styles.hint}>{t('form.walletHint')}</p>
            </section>
          </div>

          <div className={styles.bookColumn}>
            <section className={styles.book}>
              <div className={styles.bookHeader}><div><h2>{t('book.title')}</h2><small>{bookScope}</small></div><span className={styles.status}><i className={`${styles.dot} ${status === 'ready' ? styles.ready : ''}`} />{t(`book.status.${status}`)}</span></div>
              <>
                  <div className={styles.tableHeader}><span title={t('book.averagePriceHint', { defaultValue: 'Cumulative average price' })}>{t('book.averagePrice', { quote: tokenName(quoteAsset), defaultValue: `Avg. price (${tokenName(quoteAsset)})` })}</span><span title={t('book.cumulativeAmountHint', { defaultValue: 'Cumulative base amount through this price level' })}>{t('book.amount', { base: tokenName(baseAsset) })}</span><span title={t('book.cumulativeHint', { defaultValue: 'Cumulative quote amount through this price level' })}>{t('book.cumulative', { quote: tokenName(quoteAsset), defaultValue: `Total (${tokenName(quoteAsset)})` })}</span></div>
                  {renderRows(displaysLoadedBook ? [...cumulativeAsks].reverse() : [], 'ask')}
                  <div className={styles.spread}><span>{t('book.spread')}</span><strong>{displaysLoadedBook && spread ? `${bookNumber(spread, priceDecimals, true)} ${tokenName(quoteAsset)}` : '—'}</strong></div>
                  {renderRows(displaysLoadedBook ? cumulativeBids : [], 'bid')}
                  <div className={styles.aggregation}>
                    <span>{t('book.aggregation', { defaultValue: 'Aggregation' })}</span>
                    <strong>{bookNumber(aggregationStep, priceDecimals)}</strong>
                    <button type="button" onClick={() => setAggregationLevel((level) => Math.max(MIN_AGGREGATION_LEVEL, level - 1))} disabled={aggregationLevel === MIN_AGGREGATION_LEVEL} aria-label={t('book.finer', { defaultValue: 'Finer aggregation' })}>−</button>
                    <button type="button" onClick={() => setAggregationLevel((level) => Math.min(MAX_AGGREGATION_LEVEL, level + 1))} disabled={aggregationLevel === MAX_AGGREGATION_LEVEL} aria-label={t('book.coarser', { defaultValue: 'Coarser aggregation' })}>+</button>
                  </div>
                  {displayedHasAmmLiquidity && <div className={styles.ammBookSummary}>
                    <span>{t('book.ammIncluded', { defaultValue: 'AMM liquidity included' })}</span>
                    {amm && !usesXrpBridgeBook && <span>{t('book.ammFee', {
                      fee: displayNumber(new BigNumber(amm.tradingFee).dividedBy(1000), 3),
                      defaultValue: '{{fee}}% pool fee'
                    })}</span>}
                  </div>}
                </>
            </section>
          </div>

          <div className={styles.chartColumn}>
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
                scope: t('chart.synthetic', {
                  native: nativeCurrency,
                  defaultValue: `Derived from ${nativeCurrency} price history`
                }),
                intervalLabel: t('chart.periodLabel', { defaultValue: 'Chart period' }),
                scaleLabel: t('chart.scaleLabel', { defaultValue: 'Y-axis scale' }),
                log: t('chart.log', { defaultValue: 'Log' }),
                linear: t('chart.linear', { defaultValue: 'Linear' }),
                week: t('chart.week', { defaultValue: 'Week' }),
                month: t('chart.month', { defaultValue: 'Month' }),
                year: t('chart.year', { defaultValue: 'Year' }),
                loading: t('chart.priceLoading', { defaultValue: 'Loading price history…' }),
                empty: t('chart.priceEmpty', { defaultValue: 'No price history for this pair' }),
                error: t('chart.error', { defaultValue: 'Price history is temporarily unavailable' })
              }}
            />
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
        </div>
      </div>
    </>
  )
}
