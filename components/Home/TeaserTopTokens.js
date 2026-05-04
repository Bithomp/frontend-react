import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { CurrencyWithIcon, shortNiceNumber } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import Delta from '../UI/Delta'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopTokens({ data = [], isLoading = false }) {
  const topTokens = data?.slice(0, 5) || []

  const getSelectedCurrency = (token) => Object.keys(token?.statistics?.priceFiats || {})[0] || null
  const getTokenHref = (token) => {
    if (!token) return null
    if (token.mptId) return `/token/${token.mptId}`
    if (token.issuer) return `/token/${token.issuer}/${token.currency}`
    if (token.currency) return `/token/${token.currency}`
    return null
  }

  const getPrice = (token) => {
    const selectedCurrency = getSelectedCurrency(token)
    const fiatPrice = selectedCurrency ? token?.statistics?.priceFiats?.[selectedCurrency] : null

    if (fiatPrice != null) {
      return shortNiceNumber(fiatPrice, 4, 1, selectedCurrency)
    }

    const nativePrice = Number(token?.statistics?.priceNativeCurrency || 0)
    return nativePrice ? `${shortNiceNumber(nativePrice, 4, 1)} ${nativeCurrency}` : 'N/A'
  }

  const getVolume = (token) => {
    const selectedCurrency = getSelectedCurrency(token)
    const totalVolume = Number(token?.statistics?.buyVolume || 0) + Number(token?.statistics?.sellVolume || 0)
    const nativePrice = Number(token?.statistics?.priceNativeCurrency || 0)
    const volumeFiat = totalVolume * nativePrice

    if (selectedCurrency && Number.isFinite(volumeFiat) && volumeFiat > 0) {
      return shortNiceNumber(volumeFiat, 2, 1, selectedCurrency)
    }

    return totalVolume ? `${shortNiceNumber(totalVolume, 2, 1)} ${token?.currency || nativeCurrency}` : 'N/A'
  }

  return (
    <HomeTeaser
      title="home.teaser.topTokens"
      titleNote="24h"
      href="/tokens"
      isLoading={isLoading}
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
