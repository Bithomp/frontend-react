import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { FaArrowsRotate } from 'react-icons/fa6'
import styles from '@/styles/components/home-teaser.module.scss'

/**
 * HomeTeaser: reusable widget shell for all discovery/teaser cards on the home page.
 *
 * Usage:
 *   <HomeTeaser
 *     title="home.teaser.topTokens"
 *     href="/tokens"
 *     isLoading={loading}
 *     isEmpty={!items?.length}
 *   >
 *     {items.map((item) => (
 *       <HomeTeaserRow key={item.id}>
 *         <div className={styles.itemName}>Token Name</div>
 *         <div className={styles.metric}>{value1}</div>
 *         <div className={styles.metric}>{value2}</div>
 *       </HomeTeaserRow>
 *     ))}
 *   </HomeTeaser>
 */

export default function HomeTeaser({
  title,
  titleText = '',
  href,
  titleNote = '',
  titleSuffix = '',
  isLoading = false,
  isRefreshing = false,
  onRefresh = null,
  isRefreshHidden = false,
  refreshCooldownSeconds = 0,
  headerActions = null,
  isEmpty = false,
  emptyText = '',
  children,
  className = ''
}) {
  const { t } = useTranslation()
  const refreshTitle = isRefreshHidden
    ? t('home.teaser.refresh-in', { count: refreshCooldownSeconds })
    : t('home.teaser.refresh')

  return (
    <div className={`${styles.teaser} ${className}`.trim()}>
      <div className={`${styles.cardHeader} ${headerActions ? styles.cardHeaderWithActions : ''}`.trim()}>
        <div className={styles.cardHeaderTitleWrap}>
          <h2 className={styles.cardHeaderTitle}>
            {titleText || t(title)}
            {titleSuffix ? <span className={styles.cardHeaderTitleSuffix}> {titleSuffix}</span> : null}
          </h2>
          {titleNote ? <span className={styles.cardHeaderNote}>{titleNote}</span> : null}
        </div>
        <div className={styles.cardHeaderControls}>
          {headerActions ? <div className={styles.cardHeaderActions}>{headerActions}</div> : null}
          {onRefresh ? (
            <span
              className={`${styles.cardRefreshControl} ${isRefreshHidden ? 'tooltip' : ''}`.trim()}
              tabIndex={isRefreshHidden ? 0 : undefined}
            >
              <button
                type="button"
                className={`${styles.cardRefreshButton} ${isRefreshHidden ? styles.cardRefreshButtonHidden : ''}`.trim()}
                onClick={isRefreshHidden ? undefined : onRefresh}
                aria-label={refreshTitle}
                aria-disabled={isRefreshing || isRefreshHidden}
                title={isRefreshHidden ? undefined : refreshTitle}
                disabled={isRefreshing && !isRefreshHidden}
              >
                <FaArrowsRotate
                  className={`${styles.cardRefreshIcon} ${isRefreshing ? styles.cardRefreshIconSpinning : ''}`.trim()}
                />
              </button>
              {isRefreshHidden ? <span className="tooltiptext left no-brake">{refreshTitle}</span> : null}
            </span>
          ) : null}
          {href ? (
            <Link href={href} className={styles.cardHeaderLink} prefetch={false}>
              {t('common.viewAll')}
            </Link>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingPlaceholder}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      ) : isEmpty ? (
        <div className={styles.emptyState}>{emptyText || t('common.noData')}</div>
      ) : (
        <div className={styles.content}>{children}</div>
      )}
    </div>
  )
}

export function HomeTeaseRow({ children, href = null, className = '', ...props }) {
  const Component = href ? 'a' : 'div'
  return (
    <Component {...props} {...(href ? { href } : {})} className={`${styles.row} ${className}`.trim()}>
      {children}
    </Component>
  )
}
