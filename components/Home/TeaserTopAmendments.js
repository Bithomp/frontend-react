import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import { fetchTeaserAmendmentsClient } from '../../utils/homeTeaserClientData'
import styles from '@/styles/components/home-teaser.module.scss'
import { xahauNetwork } from '@/utils'

const shortEnabledAge = (enabledAt, locale) => {
  const ts = Number(enabledAt)
  if (!Number.isFinite(ts) || ts <= 0) return ''

  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - ts)
  const days = Math.floor(diffSeconds / 86400)

  if (days <= 0) return 'today'
  if (days < 100) return `${days}d ago`

  const date = new Date(ts * 1000)
  const day = date.getDate()
  const month = date.toLocaleDateString(locale || undefined, { month: 'short' })
  const year = date.getFullYear()

  return `${day} ${month} ${year}`
}

const amendmentVersion = (amendment) => {
  if (!amendment.introduced) return 'vN/A'

  const version = xahauNetwork ? String(amendment.introduced).split('+')[0] : amendment.introduced
  return xahauNetwork ? version : `v${version}`
}

const amendmentDetail = (amendment, locale) => {
  if (amendment.teaserStatus === 'enabled') {
    return amendment.enabledAt ? shortEnabledAge(amendment.enabledAt, locale) : '-'
  }

  if (amendment.count != null) {
    return `${amendment.count}${amendment.threshold != null ? `/${amendment.threshold}` : ''}`
  }

  return '-'
}

const amendmentStatus = (amendment) => (amendment.teaserStatus === 'enabled' ? 'Enabled' : 'Voting')

export default function TeaserTopAmendments({ data = [], isLoading = false }) {
  const { i18n } = useTranslation()
  const [items, setItems] = useState(data)
  const [isInitialLoading, setIsInitialLoading] = useState(!data?.length || isLoading)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const topAmendments = items || []
  const loading = isInitialLoading && !topAmendments.length
  const showRefresh = isInitialLoading || isRefreshing || !topAmendments.length
  const versionWidthCh = Math.max(...(topAmendments?.map((amendment) => amendmentVersion(amendment).length) || [5]), 5)
  const rowStyle = xahauNetwork
    ? {
        '--amendment-version-col': `${Math.max(versionWidthCh + 1, 9)}ch`,
        '--amendment-version-col-mobile': `${Math.min(Math.max(versionWidthCh - 1, 7), 8)}ch`
      }
    : undefined

  useEffect(() => {
    if (data?.length) {
      setItems(data)
      setIsInitialLoading(false)
    }
  }, [data])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      setItems(await fetchTeaserAmendmentsClient())
    } finally {
      setIsRefreshing(false)
      setIsInitialLoading(false)
    }
  }

  return (
    <HomeTeaser
      title="home.teaser.topAmendments"
      href="/amendments"
      isLoading={loading}
      isRefreshing={isRefreshing || isInitialLoading}
      onRefresh={showRefresh ? refreshData : null}
      isEmpty={!topAmendments?.length}
      className={styles.amendmentCard}
    >
      {topAmendments?.map((amendment) => (
        <HomeTeaseRow
          key={amendment.amendment}
          href={`/amendment/${amendment.amendment}`}
          className={styles.amendmentRow}
          style={rowStyle}
        >
          <div className={styles.itemName}>{amendment.name || amendment.amendment}</div>
          <div className={styles.metric}>
            <span
              className={styles.amendmentVersion}
              title={amendmentVersion(amendment)}
              style={{ width: `${versionWidthCh}ch` }}
            >
              {amendmentVersion(amendment)}
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.amendmentDetail} suppressHydrationWarning>
              {amendmentDetail(amendment, i18n?.language)}
            </span>
          </div>
          <div className={styles.metric}>
            <span
              className={`${styles.amendmentStatus} ${
                amendment.teaserStatus === 'enabled' ? styles.amendmentStatusEnabled : styles.amendmentStatusVoting
              }`}
            >
              {amendmentStatus(amendment)}
            </span>
          </div>
        </HomeTeaseRow>
      ))}
    </HomeTeaser>
  )
}
