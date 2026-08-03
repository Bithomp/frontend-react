import { useEffect, useState } from 'react'
import axios from 'axios'
import BigNumber from 'bignumber.js'

import { nativeCurrency } from '../../utils'

const PAGE_LIMIT = 100
const MAX_PAGES = 5
const CHART_PERIOD_SECONDS = 24 * 60 * 60

export const sameTradeAsset = (amount, asset) =>
  amount?.currency === asset?.currency && (amount?.issuer || '') === (asset?.issuer || '')

const tokenPath = (asset) =>
  asset?.issuer
    ? `${encodeURIComponent(asset.issuer)}/${encodeURIComponent(asset.currency)}`
    : encodeURIComponent(nativeCurrency)

export const tradePairAmounts = (swap, baseAsset, quoteAsset) => ({
  base: sameTradeAsset(swap.amount1, baseAsset)
    ? swap.amount1
    : sameTradeAsset(swap.amount2, baseAsset)
      ? swap.amount2
      : null,
  quote: sameTradeAsset(swap.amount1, quoteAsset)
    ? swap.amount1
    : sameTradeAsset(swap.amount2, quoteAsset)
      ? swap.amount2
      : null
})

export const candleData = (swaps, baseAsset, quoteAsset, candleSeconds) => {
  const trades = swaps
    .map((swap) => {
      const { base, quote } = tradePairAmounts(swap, baseAsset, quoteAsset)
      const baseValue = new BigNumber(base?.value || 0)
      const quoteValue = new BigNumber(quote?.value || 0)
      const timestamp = Number(swap.timestamp)
      if (!baseValue.gt(0) || !quoteValue.gt(0) || !Number.isFinite(timestamp)) return null
      const price = quoteValue.dividedBy(baseValue)
      if (!price.isFinite() || !price.gt(0)) return null
      return { timestamp, price: price.toNumber() }
    })
    .filter(Boolean)
    .sort((left, right) => left.timestamp - right.timestamp)

  const candles = new Map()
  trades.forEach(({ timestamp, price }) => {
    const bucket = Math.floor(timestamp / candleSeconds) * candleSeconds
    const candle = candles.get(bucket)
    if (!candle) {
      candles.set(bucket, { open: price, high: price, low: price, close: price })
      return
    }
    candle.high = Math.max(candle.high, price)
    candle.low = Math.min(candle.low, price)
    candle.close = price
  })

  const entries = [...candles.entries()].sort(([left], [right]) => left - right)
  if (!entries.length) return []

  const endBucket = Math.floor(Date.now() / 1000 / candleSeconds) * candleSeconds
  const periodStart = endBucket - CHART_PERIOD_SECONDS
  const firstBucket = entries[0][0]
  const startBucket = Math.max(firstBucket, periodStart)
  let previousClose = null

  entries.forEach(([timestamp, candle]) => {
    if (timestamp <= startBucket) previousClose = candle.close
  })

  const series = []
  for (let timestamp = startBucket; timestamp <= endBucket; timestamp += candleSeconds) {
    const candle = candles.get(timestamp)
    if (candle) previousClose = candle.close
    if (previousClose === null) continue
    if (candle) {
      series.push({ x: timestamp * 1000, y: [candle.open, candle.high, candle.low, candle.close] })
    } else {
      series.push({
        x: timestamp * 1000,
        y: [previousClose, previousClose, previousClose, previousClose],
        fillColor: '#879393',
        strokeColor: '#879393'
      })
    }
  }
  return series
}

export default function useTradeHistory(baseAsset, quoteAsset) {
  const [state, setState] = useState({ swaps: [], loading: false, error: false })

  useEffect(() => {
    if (!baseAsset?.currency || !quoteAsset?.currency) {
      setState({ swaps: [], loading: false, error: false })
      return
    }

    let cancelled = false
    const historyAsset = baseAsset.issuer ? baseAsset : quoteAsset.issuer ? quoteAsset : baseAsset
    const load = async () => {
      setState({ swaps: [], loading: true, error: false })
      try {
        const swaps = []
        let marker = ''
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const params = new URLSearchParams({ limit: String(PAGE_LIMIT), type: 'dex', ignoreRounding: 'true' })
          if (marker) params.set('marker', marker)
          const response = await axios(`v2/token/${tokenPath(historyAsset)}/swaps?${params.toString()}`)
          swaps.push(...(response.data?.swaps || []))
          marker = response.data?.marker || ''
          if (!marker) break
        }
        if (!cancelled) setState({ swaps, loading: false, error: false })
      } catch {
        if (!cancelled) setState({ swaps: [], loading: false, error: true })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [baseAsset, quoteAsset])

  return state
}
