import styles from '../../styles/components/fullHash.module.scss'

export default function FullHash({ value, length = 6, className = '', style }) {
  if (value === null || value === undefined || value === '') return null

  const text = String(value)
  const visibleCharacters = Math.max(1, Number(length) || 6) * 2 + 3

  return (
    <span
      className={[styles.value, className].filter(Boolean).join(' ')}
      style={{ '--full-hash-width': `${visibleCharacters}ch`, ...style }}
      title={text}
    >
      {text}
    </span>
  )
}
