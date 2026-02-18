import styles from '../../styles/components/delta.module.scss'
import { shortNiceNumber } from '../../utils/format'

export const getDeltaPct = (cur, prev) => {
  const c = Number(cur)
  const p = Number(prev)

  if (!Number.isFinite(c) || !Number.isFinite(p)) return null
  if (p <= 0) return null
  return ((c - p) / p) * 100
}

export const formatDeltaPct = (pct, { smallDigits = 1, largeDigits = 0 } = {}) => {
  if (!Number.isFinite(pct)) return null

  const abs = Math.abs(pct)
  // "0%" для очень маленьких изменений, чтобы не мигало +0%
  if (abs < 0.5) return '0%'

  const sign = pct > 0 ? '+' : pct < 0 ? '-' : ''
  const num = shortNiceNumber(abs, smallDigits, largeDigits)

  if (!num) return null
  return `${sign}${num}%`
}

/**
 * Delta
 * - returns null when cannot compute delta (no prev, prev=0, NaN)
 * - renders as small line/badge (class-based coloring)
 */
export default function Delta({
  cur,
  prev,
  className = '',
  inline = false,
  // чтобы гибко рулить точностью без копипасты в местах использования
  smallDigits = 1,
  largeDigits = 0
}) {
  const pct = getDeltaPct(cur, prev)
  const text = formatDeltaPct(pct, { smallDigits, largeDigits })
  if (!text) return null

  // 0% можно не красить (или оставить как up — на твой вкус)
  const dirClass = pct > 0 ? styles.up : pct < 0 ? styles.down : styles.flat
  const base = inline ? styles.deltaInline : styles.delta

  return <span className={`${base} ${dirClass} ${className}`}>{text}</span>
}
