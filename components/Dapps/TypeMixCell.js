// components/Dapps/TypeMixCell.js
import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react'
import { shortNiceNumber } from '../../utils/format'
import { buildTxGroupsModel } from '../../utils/txTypeBuckets'

// Fixed order for summary segments (same order for every row)
const GROUP_ORDER = [
  { key: 'payments', label: 'Payments', color: '#2D7FF9' },
  { key: 'trustlines', label: 'Trustlines', color: '#7A7A7A' },
  { key: 'nft', label: 'NFT', color: '#F59E0B' },
  { key: 'amm', label: 'AMM', color: '#10B981' },
  { key: 'dex', label: 'DEX', color: '#8B5CF6' },
  { key: 'account', label: 'Account', color: '#EF4444' },
  { key: 'mptoken', label: 'MPT', color: '#06B6D4' },
  { key: 'other', label: 'Other', color: '#9CA3AF' }
]

// Observe element width to decide if label can be rendered inside a segment
const useWidth = () => {
  const ref = useRef(null)
  const [w, setW] = useState(0)

  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  return { ref, w }
}

const clampPctForDisplay = (count, total) => {
  if (!total || total <= 0) return 0
  const pct = (count / total) * 100
  // Avoid showing 100.0% when count < total but rounding would show 100.0
  if (count < total && pct >= 99.95) return 99.9
  // Avoid showing 0.0% when count > 0 but extremely small
  if (count > 0 && pct > 0 && pct < 0.05) return 0.1
  return pct
}

const canFit = (containerW, segPct, text) => {
  if (!containerW) return false
  const segPx = (containerW * segPct) / 100
  const needed = text.length * 6 + 16 // heuristic
  return segPx >= needed && segPx >= 48
}

const buildTooltipLines = (seg, allTotal) => {
  const pctAll = clampPctForDisplay(seg.count, allTotal)
  const lines = []
  lines.push(`${seg.label}: ${shortNiceNumber(seg.count, 0)} (${pctAll.toFixed(1)}%)`)

  const catTotal = Number(seg.count || 0)
  const types = Array.isArray(seg.types) ? [...seg.types] : []
  types.sort((a, b) => (Number(b?.count) || 0) - (Number(a?.count) || 0))

  for (const t of types) {
    const c = Number(t?.count || 0)
    if (c <= 0) continue
    const pctCatRaw = catTotal > 0 ? (c / catTotal) * 100 : 0
    const pctCat = c < catTotal && pctCatRaw >= 99.95 ? 99.9 : pctCatRaw
    lines.push(`${t.type}: ${shortNiceNumber(c, 0)} (${pctCat.toFixed(1)}%)`)
  }

  return lines
}

const clampToViewport = (x, y, pad = 10) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const xx = Math.max(pad, Math.min(x, vw - pad))
  const yy = Math.max(pad, Math.min(y, vh - pad))
  return { x: xx, y: yy }
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

export default function TypeMixCell({
  transactionTypes,
  totalTransactions = 0,
  successTransactions = 0,
  isOpen = false,
  onToggle
}) {
  // ✅ ALL HOOKS MUST BE CALLED UNCONDITIONALLY (BEFORE ANY RETURN)
  const { ref, w } = useWidth()
  const [tip, setTip] = useState(null) // { x, y, lines }
  const [activeKey, setActiveKey] = useState(null)

  const model = useMemo(() => buildTxGroupsModel(transactionTypes), [transactionTypes])

  const segments = useMemo(() => {
    const groups = Array.isArray(model?.groups) ? model.groups : []
    const map = {}
    for (const g of groups) map[g.key] = g

    const total = Number(model?.total || 0)

    // Build in stable color/label order...
    const built = GROUP_ORDER.map((cfg) => {
      const g = map[cfg.key]
      const count = Number(g?.total || 0)
      const pctGeom = total > 0 ? (count / total) * 100 : 0
      const pctAll = clampPctForDisplay(count, total)
      const types = Array.isArray(g?.types) ? g.types : []
      return { ...cfg, count, pctGeom, pctAll, types }
    }).filter((x) => x.count > 0)

    // ...then sort by size (largest first) for the bar (and default active)
    built.sort((a, b) => b.count - a.count)

    return built
  }, [model])

  const defaultKey = useMemo(() => (segments[0]?.key ? segments[0].key : null), [segments])

  // Keep activeKey valid when data changes (period switch, etc.)
  useEffect(() => {
    if (!segments.length) return
    setActiveKey((prev) => {
      const prevOk = prev && segments.some((s) => s.key === prev)
      return prevOk ? prev : defaultKey
    })
  }, [segments, defaultKey])

  const active = useMemo(() => {
    if (!segments.length) return null
    const key = activeKey || defaultKey
    return segments.find((s) => s.key === key) || segments[0]
  }, [segments, activeKey, defaultKey])

  // ✅ NOW it's safe to have early returns
  if (!model?.total) {
    return <span style={{ opacity: 0.4 }}>—</span>
  }

  const total = Number(totalTransactions || model.total || 0)
  const success = Number(successTransactions || 0)
  const successPct = total > 0 ? (success / total) * 100 : 0
  const hasAnyTypes = segments.some((s) => (Array.isArray(s.types) ? s.types.length : 0) > 0)

  let left = 0

  return (
    <div className="dapps-activity">
      {/* Stacked bar */}
      <div ref={ref} className="dapps-activity__bar" onMouseLeave={() => setTip(null)}>
        {segments.map((s) => {
          const segLeft = left
          left += s.pctGeom

          const labelText = `${s.label} ${shortNiceNumber(s.count, 0)}`
          const showText = canFit(w, s.pctGeom, labelText)

          const onMove = (e) => {
            setTip({ x: e.clientX, y: e.clientY, lines: buildTooltipLines(s, model.total) })
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

      {/* Tooltip */}
      {tip ? <Tooltip x={tip.x} y={tip.y} lines={tip.lines} /> : null}

      {/* Meta */}
      <div className="dapps-activity__meta">
        <div className="dapps-activity__stats">
          <span>
            Total: <b>{shortNiceNumber(total, 0)}</b>
          </span>
          <span>
            Success: <b>{shortNiceNumber(success, 0)}</b>
            <span className="dapps-activity__muted">({successPct.toFixed(1)}%)</span>
          </span>
        </div>

        {hasAnyTypes ? (
          <button type="button" className="dapps-activity__toggle" onClick={() => onToggle?.()}>
            {isOpen ? 'Hide details' : '+ details'}
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* Details (dashboard style) */}
      {isOpen && hasAnyTypes ? (
        <div className="dapps-activity__details">
          <div className="dapps-activity__detailsGrid">
            {/* Left: categories */}
            <div className="dapps-activity__catList">
              {[...segments]
                .sort((a, b) => b.count - a.count)
                .map((s) => {
                  const isActive = active?.key === s.key
                  return (
                    <div
                      key={s.key}
                      className={`dapps-activity__catItem ${isActive ? 'dapps-activity__catItemActive' : ''}`}
                      onClick={() => setActiveKey(s.key)}
                    >
                      <div className="dapps-activity__catName">
                        <span className="dapps-activity__dot" style={{ background: s.color }} />
                        <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</b>
                      </div>
                      <div className="dapps-activity__catPct">{s.pctAll.toFixed(1)}%</div>
                    </div>
                  )
                })}
            </div>

            {/* Right: types for selected category */}
            <div>
              <div className="dapps-activity__typesHeader">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                  <span className="dapps-activity__dot" style={{ background: active?.color }} />
                  <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {active?.label || ''}
                  </b>
                  <span className="dapps-activity__muted">({active?.pctAll?.toFixed(1)}%)</span>
                </div>
                <div className="dapps-activity__typesTotal">{shortNiceNumber(active?.count || 0, 0)}</div>
              </div>

              {Array.isArray(active?.types) && active.types.length ? (
                <div className="dapps-activity__grid">
                  {[...active.types]
                    .sort((a, b) => (Number(b?.count) || 0) - (Number(a?.count) || 0))
                    .map((t) => (
                      <div key={t.type} className="dapps-activity__row">
                        <div className="dapps-activity__type" title={t.type}>
                          {t.type}
                        </div>
                        <div className="dapps-activity__count">{shortNiceNumber(Number(t.count) || 0, 0)}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="dapps-activity__empty">No transaction types.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
