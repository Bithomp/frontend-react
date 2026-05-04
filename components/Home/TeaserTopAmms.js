import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { shortNiceNumber, niceCurrency, CurrencyWithIcon } from '../../utils/format'
import { nativeCurrency } from '../../utils'
import { fetchTeaserAmmsClient } from '../../utils/homeTeaserClientData'
import styles from '@/styles/components/home-teaser.module.scss'

export default function TeaserTopAmms({ data = [], isLoading = false, fiatRate, selectedCurrency }) {
  const { t } = useTranslation()
  const [items, setItems] = useState(data)
  const [isInitialLoading, setIsInitialLoading] = useState(!data?.length || isLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const topAmms = items?.slice(0, 5) || []
  const loading = isInitialLoading && !topAmms.length
  const showRefresh = isInitialLoading || isRefreshing || !topAmms.length

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
      try {
        const latest = await fetchTeaserAmmsClient()
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
  }, [])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      setItems(await fetchTeaserAmmsClient())
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <HomeTeaser
      title="home.teaser.topAmms"
      href="/amms"
      isLoading={loading}
      isRefreshing={isRefreshing || isInitialLoading}
      onRefresh={showRefresh ? refreshData : null}
      isEmpty={!topAmms.length}
    >
      {topAmms.map((amm, index) => {
        const asset1 = niceCurrency(amm?.amount?.currency || nativeCurrency)
        const asset2 = niceCurrency(amm?.amount2?.currency || nativeCurrency)
        const pairName = `${asset1}/${asset2}`
        const holders = Number(amm?.holders || 0)

        const lpToken = {
          ...amm?.lpTokenBalance,
          currencyDetails: {
            type: 'lp_token',
            ammID: amm?.ammID,
            asset: amm?.amount,
            asset2: amm?.amount2,
            currency: pairName
          }
        }

        // TVL: native XRP only (amount is raw drops string for XRP pools)
        const amt1 = amm?.amount
        const xrpDrops = typeof amt1 === 'string' || typeof amt1 === 'number' ? Number(amt1) : null
        const half1 = xrpDrops !== null && fiatRate ? (xrpDrops / 1000000) * fiatRate : null
        const tvl = Number.isFinite(half1) && half1 > 0 ? shortNiceNumber(half1 * 2, 2, 1, selectedCurrency) : 'N/A'

        return (
          <HomeTeaseRow key={amm.account || index} href={amm?.ammID ? `/amm/${amm.ammID}` : null}>
            <div className={styles.itemName}>
              <CurrencyWithIcon token={lpToken} hideIssuer options={{ disableTokenLink: true }} />
            </div>
            <div className={styles.metric}>
              {shortNiceNumber(holders, 0)} {t('common.holders')}
            </div>
            <div className={styles.metric} suppressHydrationWarning>
              {tvl}
            </div>
          </HomeTeaseRow>
        )
      })}
    </HomeTeaser>
  )
}
