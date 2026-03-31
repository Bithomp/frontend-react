import HomeTeaser, { HomeTeaseRow } from './HomeTeaser'
import styles from '@/styles/components/home-teaser.module.scss'

const shortEnabledAge = (enabledAt) => {
  const ts = Number(enabledAt)
  if (!Number.isFinite(ts) || ts <= 0) return ''

  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - ts)
  const days = Math.floor(diffSeconds / 86400)

  if (days <= 0) return 'today'
  if (days < 100) return `${days}d ago`

  return new Date(ts * 1000).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const amendmentVersion = (amendment) => (amendment.introduced ? `v${amendment.introduced}` : 'vN/A')

const amendmentDetail = (amendment) => {
  if (amendment.teaserStatus === 'enabled') {
    return amendment.enabledAt ? shortEnabledAge(amendment.enabledAt) : '-'
  }

  if (amendment.count != null) {
    return `${amendment.count}${amendment.threshold != null ? `/${amendment.threshold}` : ''}`
  }

  return '-'
}

const amendmentStatus = (amendment) => (amendment.teaserStatus === 'enabled' ? 'Enabled' : 'Voting')

export default function TeaserTopAmendments({ data = [], isLoading = false }) {
  return (
    <HomeTeaser
      title="home.teaser.topAmendments"
      href="/amendments"
      isLoading={isLoading}
      isEmpty={!data?.length}
      className={styles.amendmentCard}
    >
      {data?.map((amendment) => (
        <HomeTeaseRow
          key={amendment.amendment}
          href={`/amendment/${amendment.amendment}`}
          className={styles.amendmentRow}
        >
          <div className={styles.itemName}>{amendment.name || amendment.amendment}</div>
          <div className={styles.metric}>
            <span className={styles.amendmentVersion}>{amendmentVersion(amendment)}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.amendmentDetail} suppressHydrationWarning>
              {amendmentDetail(amendment)}
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
