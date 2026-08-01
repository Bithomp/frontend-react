import { useState } from 'react'

import styles from './DistributionCard.module.scss'

const PREVIEW_ROWS = 5
const COLORS = ['#008c99', '#3b82c4', '#7a62c7', '#d07b35', '#64a55a', '#8a929e']

export default function DistributionCard({
  title,
  rows = [],
  total,
  renderLabel,
  renderTooltipLabel,
  getLabel,
  getKey,
  showLabel,
  hideLabel,
  totalLabel,
  otherLabel = 'Other',
  previewRows = PREVIEW_ROWS,
  compact = false
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeSegment, setActiveSegment] = useState(null)
  const sortedRows = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => b.count - a.count)
  const visibleRows = expanded ? sortedRows : sortedRows.slice(0, previewRows)
  const chartRows = sortedRows.slice(0, previewRows)
  const chartTotal = sortedRows.reduce((sum, row) => sum + Number(row.count || 0), 0)
  const otherCount = sortedRows.slice(previewRows).reduce((sum, row) => sum + Number(row.count || 0), 0)
  const chartSegments = [
    ...chartRows.map((row, index) => ({
      count: row.count,
      color: COLORS[index],
      label: getLabel(row),
      renderedLabel: renderTooltipLabel?.(row)
    })),
    ...(otherCount > 0 ? [{ count: otherCount, color: COLORS[5], label: otherLabel }] : [])
  ]
  const hasMore = sortedRows.length > previewRows
  let offset = 0

  return (
    <section className={`${styles.card}${compact ? ` ${styles.compact}` : ''}`}>
      <div className={styles.header}>
        <h4>{title}</h4>
        <span>{sortedRows.length}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.chartWrap} onMouseLeave={() => setActiveSegment(null)}>
          <svg className={styles.donut} viewBox="0 0 120 120" role="img" aria-label={`${title}: ${chartTotal}`}>
            <circle className={styles.track} cx="60" cy="60" r="48" pathLength="100" />
            {chartSegments.map((segment, index) => {
              const percentage = chartTotal > 0 ? (segment.count / chartTotal) * 100 : 0
              const segmentOffset = offset
              offset += percentage
              const tooltip = `${segment.label}: ${segment.count} (${percentage.toFixed(1)}%)`
              return (
                <circle
                  key={`${segment.label}-${index}`}
                  className={styles.segment}
                  cx="60"
                  cy="60"
                  r="48"
                  pathLength="100"
                  fill="none"
                  stroke={segment.color}
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={-segmentOffset}
                  tabIndex="0"
                  aria-label={tooltip}
                  onFocus={() => setActiveSegment({ ...segment, percentage })}
                  onBlur={() => setActiveSegment(null)}
                  onMouseEnter={() => setActiveSegment({ ...segment, percentage })}
                />
              )
            })}
          </svg>
          <span className={styles.chartCenter}>
            <strong>{chartTotal}</strong>
            <small>{totalLabel}</small>
          </span>
          {activeSegment ? (
            <span className={styles.tooltip} role="status">
              <strong>{activeSegment.renderedLabel || activeSegment.label}</strong>
              <span>
                {activeSegment.count} · {activeSegment.percentage.toFixed(1)}%
              </span>
            </span>
          ) : null}
        </div>
        <div className={`${styles.list}${expanded ? ` ${styles.listExpanded}` : ''}`}>
          {visibleRows.map((row, index) => {
            const percentage = total > 0 ? (row.count / total) * 100 : 0
            return (
              <div
                className={styles.row}
                key={getKey(row)}
                style={{ '--distribution-color': index < previewRows ? COLORS[index] : COLORS[5] }}
              >
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.label}>{renderLabel(row)}</span>
                <strong>{row.count}</strong>
                <span className={styles.percent}>{percentage.toFixed(1)}%</span>
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${Math.min(percentage, 100)}%` }} />
                </span>
              </div>
            )
          })}
        </div>
      </div>
      {hasMore ? (
        <button
          type="button"
          className={`button-action thin ${styles.toggle}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? hideLabel : `${showLabel} (+${sortedRows.length - previewRows})`}
        </button>
      ) : null}
    </section>
  )
}
