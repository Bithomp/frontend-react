import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react'
import { shortNiceNumber } from '../../utils/format'

// Fixed order for summary segments
const GROUP_ORDER = [
  { key: 'swaps', label: 'Swaps', color: '#A259F7' },
  { key: 'payments', label: 'Payments', color: '#3B82F6' },
  { key: 'trustlines', label: 'Trustlines', color: '#60A5FA' },
  { key: 'nft', label: 'NFT', color: '#F59E0B' },
  { key: 'amm', label: 'AMM', color: '#EF4444' },
  { key: 'dex', label: 'DEX', color: '#8B5CF6' },
  { key: 'account', label: 'Account', color: '#F43F5E' },
  { key: 'mptoken', label: 'MPT', color: '#06B6D4' },
  { key: 'other', label: 'Other', color: '#9CA3AF' }
]

const FAILED_SEG = { key: 'failed', label: 'Failed', color: '#9CA3AF' }

// Use layout effect only in browser (SSR-safe)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const useWidth = () => {
  const ref = useRef(null)
  const [w, setW] = useState(0)

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return
    setW(ref.current.getBoundingClientRect().width || 0)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  return { ref, w }
}

const clampPctForDisplay = (count, total) => {
  if (!total || total <= 0) return 0
  const pct = (count / total) * 100
  if (count < total && pct >= 99.95) return 99.9
  if (count > 0 && pct > 0 && pct < 0.05) return 0.1
  return pct
}

const canFit = (containerW, segPct, text) => {
  if (!containerW) return false
  const segPx = (containerW * segPct) / 100
  const needed = text.length * 6 + 16
  return segPx >= needed && segPx >= 48
}

const clampToViewport = (x, y, pad = 10) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  return {
    x: Math.max(pad, Math.min(x, vw - pad)),
    y: Math.max(pad, Math.min(y, vh - pad))
  }
}

const Tooltip = ({ x, y, lines }) => {
  if (!lines?.length) return null
  const pos = clampToViewport(x + 12, y + 12)
  return (
    <div className="dapps-activity-tooltip" style={{ left: pos.x, top: pos.y }}>
      {lines.map((l, i) => (
        <div key={i} className="dapps-activity-tooltip__line">
          {l}
        </div>
      ))}
    </div>
  )
}

const formatErrorCode = (code) => {
  if (!code) return ''
  return code.startsWith('tec') ? code.slice(3) : code
}

const getSuccessClass = (pct) => {
  if (pct < 50) return 'success-low'
  if (pct < 90) return 'success-medium'
  return 'success-high'
}

/**
 * Map txType -> group key
 * IMPORTANT: swaps are injected as "Payment:swap"
 */
const getGroupKeyForTxType = (txType) => {
  if (!txType) return 'other'
  if (txType === 'Payment:swap') return 'swaps'
  if (txType === 'Payment' || txType.startsWith('Check') || txType.startsWith('Escrow')) return 'payments'
  if (txType === 'TrustSet') return 'trustlines'

  if (txType.startsWith('NFToken')) return 'nft'
  if (txType.startsWith('AMM')) return 'amm'
  if (txType.startsWith('Offer')) return 'dex'
  if (txType.startsWith('MPToken')) return 'mptoken'

  if (txType === 'AccountSet' || txType === 'AccountDelete' || txType === 'SignerListSet' || txType === 'SetRegularKey')
    return 'account'

  return 'other'
}

const buildFailedBreakdown = (transactionTypesResults) => {
  const src = transactionTypesResults && typeof transactionTypesResults === 'object' ? transactionTypesResults : {}
  const entries = Object.keys(src)
    .map((txType) => {
      const obj = src[txType]
      if (!obj || typeof obj !== 'object') return [txType, 0]
      const total = Object.values(obj).reduce((s, v) => s + Number(v || 0), 0)
      const ok = Number(obj.tesSUCCESS || 0)
      return [txType, Math.max(0, total - ok)]
    })
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])

  const total = entries.reduce((s, [, c]) => s + c, 0)
  return { entries, total }
}

const buildFailedCodesByType = (transactionTypesResults) => {
  const src = transactionTypesResults && typeof transactionTypesResults === 'object' ? transactionTypesResults : {}
  const result = {}
  for (const [txType, obj] of Object.entries(src)) {
    if (!obj || typeof obj !== 'object') continue
    const codes = Object.entries(obj)
      .filter(([code, cnt]) => code && code !== 'tesSUCCESS' && Number(cnt) > 0)
      .map(([code, cnt]) => [code, Number(cnt)])
      .sort((a, b) => b[1] - a[1])
    if (codes.length) result[txType] = codes
  }
  return result
}

export default function TypeMixCell({
  successByType, // <-- NEW (success counts by txType, includes Payment:swap)
  transactionTypesResults, // <-- for failed drilldown codes
  totalTransactions = 0,
  successTransactions = 0,
  isOpen = false,
  onToggle
}) {
  const { ref, w } = useWidth()
  const [tip, setTip] = useState(null)
  const [activeKey, setActiveKey] = useState(null)

  const total = Number(totalTransactions || 0)
  const success = Number(successTransactions || 0)
  const failed = Math.max(0, total - success)

  const hasTotal = total > 0

  const successPct = total > 0 ? (success / total) * 100 : 0
  const failedPct = total > 0 ? (failed / total) * 100 : 0
  const successClass = getSuccessClass(successPct)

  const successMap = useMemo(
    () => (successByType && typeof successByType === 'object' ? successByType : {}),
    [successByType]
  )

  // Build segments from successByType
  const segments = useMemo(() => {
    const buckets = {}
    for (const k of GROUP_ORDER.map((x) => x.key)) buckets[k] = []

    for (const [txType, cntRaw] of Object.entries(successMap)) {
      const cnt = Number(cntRaw || 0)
      if (cnt <= 0) continue
      const gk = getGroupKeyForTxType(txType)
      if (!buckets[gk]) buckets[gk] = []
      buckets[gk].push({ type: txType === 'Payment:swap' ? 'Swap' : txType, count: cnt })
    }

    const built = GROUP_ORDER.map((cfg) => {
      const types = (buckets[cfg.key] || []).sort((a, b) => b.count - a.count)
      const count = types.reduce((s, t) => s + Number(t.count || 0), 0)
      return {
        ...cfg,
        count,
        pctGeom: total > 0 ? (count / total) * 100 : 0,
        pctAll: clampPctForDisplay(count, total),
        types
      }
    }).filter((x) => x.count > 0)

    built.sort((a, b) => b.count - a.count)

    if (failed > 0) {
      built.push({
        ...FAILED_SEG,
        count: failed,
        pctGeom: total > 0 ? (failed / total) * 100 : 0,
        pctAll: clampPctForDisplay(failed, total),
        types: []
      })
    }

    return built
  }, [successMap, total, failed])

  const defaultKey = useMemo(() => segments[0]?.key || null, [segments])

  useEffect(() => {
    if (!segments.length) return
    setActiveKey((prev) => {
      const ok = prev && segments.some((s) => s.key === prev)
      return ok ? prev : defaultKey
    })
  }, [segments, defaultKey])

  const active = useMemo(() => {
    const key = activeKey || defaultKey
    return segments.find((s) => s.key === key) || segments[0] || null
  }, [segments, activeKey, defaultKey])

  const failedBreakdown = useMemo(() => buildFailedBreakdown(transactionTypesResults), [transactionTypesResults])

  const buildSuccessTooltipLines = (seg, globalTotal) => {
    const groupCount = Number(seg?.count || 0)
    if (!globalTotal || globalTotal <= 0 || groupCount <= 0) return []

    const types = Array.isArray(seg?.types) ? [...seg.types] : []
    const nonZero = types
      .map((t) => ({ type: t?.type, count: Number(t?.count || 0) }))
      .filter((t) => t.type && t.count > 0)
      .sort((a, b) => b.count - a.count)

    // helper: global percentage, based on TOTAL txs (success+failed)
    const pctGlobal = clampPctForDisplay(groupCount, globalTotal)

    // Case A: only one type in this group => single-line tooltip
    if (nonZero.length === 1) {
      const t = nonZero[0]
      const pct = clampPctForDisplay(t.count, globalTotal) // global pct, not 100%
      return [`${t.type}: ${shortNiceNumber(t.count, 0)} (${pct.toFixed(1)}%)`]
    }

    // Case B: multiple types => header + breakdown with pct inside the group
    const lines = [`Total ${seg.label}: ${shortNiceNumber(groupCount, 0)} (${pctGlobal.toFixed(1)}%)`]

    for (const t of nonZero) {
      const pctInGroup = groupCount > 0 ? (t.count / groupCount) * 100 : 0
      const pct = t.count < groupCount && pctInGroup >= 99.95 ? 99.9 : pctInGroup
      lines.push(`${t.type}: ${shortNiceNumber(t.count, 0)} (${pct.toFixed(1)}%)`)
    }

    return lines
  }

  const buildFailedTooltipLines = () => {
    const lines = [`Failed: ${shortNiceNumber(failed, 0)} (${clampPctForDisplay(failed, total).toFixed(1)}%)`]
    for (const [txType, c] of failedBreakdown.entries.slice(0, 12)) {
      lines.push(`${txType}: ${shortNiceNumber(c, 0)}`)
    }
    if (failedBreakdown.entries.length > 12) lines.push(`… +${failedBreakdown.entries.length - 12} more`)
    return lines
  }

  const leftList = useMemo(() => {
    // keep Failed last
    const base = [...segments]
    base.sort((a, b) => {
      if (a.key === 'failed') return 1
      if (b.key === 'failed') return -1
      return b.count - a.count
    })
    return base
  }, [segments])

  const hasAnyDetails = segments.length > 0

  let left = 0

  return hasTotal ? (
    <div className="dapps-activity">
      {/* Stacked bar */}
      <div ref={ref} className="dapps-activity__bar" onMouseLeave={() => setTip(null)}>
        {segments.map((s) => {
          const segLeft = left
          left += s.pctGeom

          const labelText = `${s.label} ${shortNiceNumber(s.count, 0)}`
          const showText = canFit(w, s.pctGeom, labelText)

          const onMove = (e) => {
            const lines = s.key === 'failed' ? buildFailedTooltipLines(total) : buildSuccessTooltipLines(s, total)

            setTip({ x: e.clientX, y: e.clientY, lines })
          }

          return (
            <div
              key={s.key}
              className="dapps-activity__seg"
              style={{ left: `${segLeft}%`, width: `${s.pctGeom}%`, background: s.color }}
              onMouseMove={onMove}
              onMouseEnter={onMove}
            >
              {showText ? <div className="dapps-activity__segLabel">{labelText}</div> : null}
            </div>
          )
        })}
      </div>

      {tip ? <Tooltip x={tip.x} y={tip.y} lines={tip.lines} /> : null}

      {/* Meta */}
      <div className="dapps-activity__meta">
        <div className="dapps-activity__stats">
          <span>
            Total: <b>{shortNiceNumber(total, 0)}</b>
          </span>
          <span>
            Success: <b>{shortNiceNumber(success, 0)}</b>
            <span className={`dapps-activity__muted ${successClass}`}>({successPct.toFixed(1)}%)</span>
          </span>
          {failed > 0 ? (
            <span className="dapps-activity__muted">
              Failed: {shortNiceNumber(failed, 0)} ({failedPct.toFixed(1)}%)
            </span>
          ) : null}
        </div>

        {hasAnyDetails ? (
          <button type="button" className="dapps-activity__toggle" onClick={() => onToggle?.()}>
            {isOpen ? 'Hide details' : '+ details'}
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* Details */}
      {isOpen && hasAnyDetails ? (
        <div className="dapps-activity__details">
          <div className="dapps-activity__detailsGrid">
            {/* Left: categories */}
            <div className="dapps-activity__catList">
              {leftList.map((s) => {
                const isActive = active?.key === s.key
                return (
                  <div
                    key={s.key}
                    className={`dapps-activity__catItem ${isActive ? 'dapps-activity__catItemActive' : ''}`}
                    onClick={() => setActiveKey(s.key)}
                  >
                    <div className="dapps-activity__catName">
                      {s.key === 'failed' ? (
                        <span className="dapps-activity__errorIcon" title="Failed transactions">
                          ⚠️
                        </span>
                      ) : (
                        <span className="dapps-activity__dot" style={{ background: s.color }} />
                      )}
                      <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</b>
                    </div>
                    <div className="dapps-activity__catPct">{s.pctAll.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>

            {/* Right side */}
            <div>
              {active?.key === 'failed' ? (
                <>
                  <div className="dapps-activity__typesHeader">
                    Failed by transaction type
                    <div className="dapps-activity__typesTotal">
                      {failed ? `${shortNiceNumber(failed, 0)} total (${failedPct.toFixed(1)}%)` : '—'}
                    </div>
                  </div>

                  {(() => {
                    const byType = buildFailedCodesByType(transactionTypesResults)
                    const typeNames = Object.keys(byType)
                    if (!typeNames.length) return <div className="dapps-activity__empty">No failed transactions</div>

                    return (
                      <div className="dapps-activity__grid">
                        {typeNames.map((txType) => (
                          <div key={txType} style={{ marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, margin: '6px 0' }}>{txType}</div>
                            {byType[txType].map(([code, cnt]) => (
                              <div key={txType + code} className="dapps-activity__row">
                                <div className="dapps-activity__type">{formatErrorCode(code)}</div>
                                <div className="dapps-activity__count">{shortNiceNumber(cnt, 0)}</div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </>
              ) : (
                <>
                  <div className="dapps-activity__typesHeader">
                    <div>{active?.label} (success)</div>
                    <div className="dapps-activity__typesTotal">{shortNiceNumber(active?.count || 0, 0)}</div>
                  </div>

                  {active?.types?.length ? (
                    <div className="dapps-activity__grid">
                      {active.types.map((t) => (
                        <div key={t.type} className="dapps-activity__row">
                          <div className="dapps-activity__type">{t.type}</div>
                          <div className="dapps-activity__count">{shortNiceNumber(t.count, 0)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="dapps-activity__empty">No types</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  ) : (
    <span style={{ opacity: 0.4 }}>—</span>
  )
}
