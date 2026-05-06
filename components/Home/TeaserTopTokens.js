import { useEffect, useState } from 'react'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { CurrencyWithIcon, shortNiceNumber } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import { fetchTeaserTokensClient } from '../../utils/homeTeaserClientData'
import Delta from '../UI/Delta'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopTokens({ data = [], isLoading = false, fiatRate, selectedCurrency }) {
  const [items, setItems] = useState(data)
  const [isInitialLoading, setIsInitialLoading] = useState(!data?.length || isLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const topTokens = items?.slice(0, 5) || []
  const loading = isInitialLoading && !topTokens.length
  const showRefresh = isInitialLoading || isRefreshing || !topTokens.length

  useEffect(() => {
    if (data?.length) {
      setItems(data)
      setIsInitialLoading(false)
    }
  }, [data])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setIsInitialLoading(true)
      setItems([])
      try {
        const latest = await fetchTeaserTokensClient(selectedCurrency)
        if (!cancelled) {
          setItems(latest)
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [selectedCurrency])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      setItems(await fetchTeaserTokensClient(selectedCurrency))
    } finally {
      setIsRefreshing(false)
    }
  }

  const getSelectedCurrency = (token) =>
    selectedCurrency || Object.keys(token?.statistics?.priceFiats || {})[0] || null
  const getTokenHref = (token) => {
    if (!token) return null
    if (token.mptId) return `/token/${token.mptId}`
    if (token.issuer) return `/token/${token.issuer}/${token.currency}`
    if (token.currency) return `/token/${token.currency}`
    return null
  }

  const getPrice = (token) => {
    const currency = getSelectedCurrency(token)
    const fiatPrice = currency ? token?.statistics?.priceFiats?.[currency] : null

    if (fiatPrice != null) {
      return shortNiceNumber(fiatPrice, 4, 1, currency)
    }

    const nativePrice = Number(token?.statistics?.priceNativeCurrency ?? (token?.issuer ? 0 : 1))
    const fallbackFiatPrice = nativePrice * Number(fiatRate || 0)

    if (currency && Number.isFinite(fallbackFiatPrice) && fallbackFiatPrice > 0) {
      return shortNiceNumber(fallbackFiatPrice, 4, 1, currency)
    }

    return nativePrice ? `${shortNiceNumber(nativePrice, 4, 1)} ${nativeCurrency}` : 'N/A'
  }

  const getVolume = (token) => {
    const currency = getSelectedCurrency(token)
    const totalVolume = Number(token?.statistics?.buyVolume || 0) + Number(token?.statistics?.sellVolume || 0)
    const fiatPrice = currency ? Number(token?.statistics?.priceFiats?.[currency]) : 0
    const nativePrice = Number(token?.statistics?.priceNativeCurrency ?? (token?.issuer ? 0 : 1))
    const volumeFiat = totalVolume * (fiatPrice || nativePrice * Number(fiatRate || 0))

    if (currency && Number.isFinite(volumeFiat) && volumeFiat > 0) {
      return shortNiceNumber(volumeFiat, 2, 1, currency)
    }

    return totalVolume ? `${shortNiceNumber(totalVolume, 2, 1)} ${token?.currency || nativeCurrency}` : 'N/A'
  }

  return (
    <HomeTeaser
      title="home.teaser.topTokens"
      titleNote="24h"
      href="/tokens"
      isLoading={loading}
      isRefreshing={isRefreshing || isInitialLoading}
      onRefresh={showRefresh ? refreshData : null}
      isEmpty={!topTokens.length}
    >
      {topTokens.map((token, index) => {
        const selectedCurrency = getSelectedCurrency(token)
        const currentPrice = selectedCurrency ? token?.statistics?.priceFiats?.[selectedCurrency] : null
        const previousPrice = selectedCurrency ? token?.statistics?.priceFiats24h?.[selectedCurrency] : null
        const tokenHref = getTokenHref(token)

        return (
          <HomeTeaseRow
            key={token.issuer + token.currency || index}
            href={tokenHref}
            className={styles.rowSlightCompact}
          >
            <div className={styles.itemName}>
              <CurrencyWithIcon token={token} hideIssuer options={{ disableTokenLink: true }} />
            </div>
            <div className={`${styles.metric} ${styles.metricWithDelta}`}>
              <span suppressHydrationWarning>{getPrice(token)}</span>
              <Delta inline cur={currentPrice} prev={previousPrice} />
            </div>
            <div className={styles.metric} suppressHydrationWarning>
              {getVolume(token)}
            </div>
          </HomeTeaseRow>
        )
      })}
    </HomeTeaser>
  )
}
