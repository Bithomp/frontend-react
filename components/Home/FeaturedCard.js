import styles from '@/styles/components/home-teaser.module.scss'

/**
 * FeaturedCard: Simple card wrapper for featured content items (Converter, PriceChart)
 * Provides consistent styling matching HomeTeaser cards
 */
export default function FeaturedCard({ title, headerActions = null, children, className = '' }) {
  return (
    <div className={`${styles.teaser} ${className}`.trim()}>
      {title && (
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderTitleWrap}>
            <div className={styles.cardHeaderTitle}>{title}</div>
          </div>
          {headerActions ? <div className={styles.cardHeaderActions}>{headerActions}</div> : null}
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  )
}
