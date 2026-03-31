import styles from '@/styles/components/home-teaser.module.scss'

/**
 * StatsCard: Card wrapper for Statistics component
 * Provides consistent styling matching HomeTeaser cards
 */
export default function StatsCard({ children, className = '' }) {
  return <div className={`${styles.teaser} ${className}`.trim()}>{children}</div>
}
