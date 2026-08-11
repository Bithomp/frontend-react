import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import BigNumber from 'bignumber.js'

import { nativeCurrency } from '../../utils'
import { chartPeriodQuery } from '../../utils/chartPeriods'

const tokenPath = (asset) =>
  asset?.issuer
    ? `${encodeURIComponent(asset.issuer)}/${encodeURIComponent(asset.currency)}`
    : encodeURIComponent(nativeCurrency)

const assetKey = (asset) => `${asset?.issuer || ''}:${asset?.currency || ''}`

const nativePrice = (row) => {
  const price = new BigNumber(
    row?.priceNativeCurrency ?? row?.ammPriceNativeCurrency ?? row?.offerPriceNativeCurrency ?? NaN
  )
  return price.isFinite() && price.gt(0) ? price : null
}

const rowsByTimestamp = (rows) => new Map(
  rows
    .map((row) => [Number(row?.time), nativePrice(row)])
    .filter(([timestamp, price]) => Number.isFinite(timestamp) && price)
)

export default function useTradePriceHistory(baseAsset, quoteAsset, period) {
  const pairKey = `${assetKey(baseAsset)}|${assetKey(quoteAsset)}|${period}`
  const [state, setState] = useState({ pairKey: '', points: [], loading: false, error: false })

  useEffect(() => {
    if (!baseAsset?.currency || !quoteAsset?.currency) {
      setState({ pairKey: '', points: [], loading: false, error: false })
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const loadRows = async (asset) => {
      if (!asset?.issuer && asset?.currency === nativeCurrency) return null
      const response = await axios.get(
        `v2/token/${tokenPath(asset)}/chart?convertCurrencies=usd&${chartPeriodQuery(period)}`,
        { signal: controller.signal }
      )
      return Array.isArray(response?.data?.chart) ? response.data.chart : []
    }

    setState({ pairKey, points: [], loading: true, error: false })

    Promise.all([loadRows(baseAsset), loadRows(quoteAsset)])
      .then(([baseRows, quoteRows]) => {
        if (cancelled) return

        const baseIsNative = baseRows === null
        const quoteIsNative = quoteRows === null
        const basePrices = baseIsNative ? null : rowsByTimestamp(baseRows)
        const quotePrices = quoteIsNative ? null : rowsByTimestamp(quoteRows)
        const timestamps = baseIsNative
          ? [...quotePrices.keys()]
          : quoteIsNative
            ? [...basePrices.keys()]
            : [...basePrices.keys()].filter((timestamp) => quotePrices.has(timestamp))
        const points = timestamps
          .sort((left, right) => left - right)
          .map((timestamp) => {
            const basePrice = baseIsNative ? new BigNumber(1) : basePrices.get(timestamp)
            const quotePrice = quoteIsNative ? new BigNumber(1) : quotePrices.get(timestamp)
            const price = basePrice.dividedBy(quotePrice)
            return price.isFinite() && price.gt(0) ? { x: timestamp * 1000, y: price.toNumber() } : null
          })
          .filter(Boolean)

        setState({ pairKey, points, loading: false, error: false })
      })
      .catch((error) => {
        if (cancelled || axios.isCancel(error)) return
        setState({ pairKey, points: [], loading: false, error: true })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [baseAsset, pairKey, period, quoteAsset])

  return useMemo(
    () => state.pairKey === pairKey ? state : { pairKey, points: [], loading: true, error: false },
    [pairKey, state]
  )
}
