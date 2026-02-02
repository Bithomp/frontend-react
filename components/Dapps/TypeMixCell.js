// components/Dapps/TypeMixCell.js
import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react'
import { shortNiceNumber } from '../../utils/format'
import { buildTxGroupsModel } from '../../utils/txTypeBuckets'

/**
 * This component renders:
 * - A stacked horizontal bar (category mix) with hover tooltip.
 * - A meta line: Total / Success (xx.x%)
 * - Expandable in-row details (ALL categories + tx types).
 *
 * Notes:
 * - Tooltips adapt to light/dark via prefers-color-scheme.
 * - When expanded, details are shown in an in-row "panel".
 *   To prevent other columns in the same row from jumping down,
 *   make sure table cells use vertical-align: top (see CSS below).
 */

// Fixed order for summary segments (same order for every row)
const GROUP_ORDER = [
  { key: 'payments', label: 'Payments', color: '#2D7FF9' },
  { key: 'trustlines', label: 'Trustlines', color: '#7A7A7A' },
  { key: 'nft', label: 'NFT', color: '#F59E0B' },
  { key: 'amm', label: 'AMM', color: '#10B981' },
  { key: 'dex', label: 'DEX', color: '#8B5CF6' },
  { key: 'account', label: 'Account', color: '#EF4444' },
  { key: 'mptoken', label: 'MPT', color: '#06B6D4' }, // UI rename
  { key: 'other', label: 'Other', color: '#9CA3AF' }
]

// Observe element width (to decide if we can render label inside segment)
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

// Detect light/dark based on OS preference
const usePrefersDark = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setIsDark(!!mql.matches)
    onChange()
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])

  return isDark
}

const clampPctForDisplay = (count, total) => {
  if (!total || total <= 0) return 0
  const pct = (count / total) * 100
  // Avoid showing 100.0% when count < total but rounding would produce 100.0
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

const Tooltip = ({ x, y, lines, isDark }) => {
  if (!lines?.length) return null
  const pos = clampToViewport(x + 12, y + 12)

  const bg = isDark ? 'rgba(20, 20, 22, 0.96)' : 'rgba(255, 255, 255, 0.98)'
  const fg = isDark ? '#fff' : '#111'
  const bd = isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)'
  const sh = isDark ? '0 10px 30px rgba(0,0,0,0.55)' : '0 10px 30px rgba(0,0,0,0.18)'

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 'max-content', // as wide as content
        maxWidth: '50vw', // cap to 50% viewport width
        background: bg,
        color: fg,
        border: bd,
        padding: '8px 10px',
        borderRadius: 12,
        fontSize: 12,
        lineHeight: '16px',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: sh,
        overflow: 'hidden'
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
  // Hooks first
  const { ref, w } = useWidth()
  const prefersDark = usePrefersDark()
  const [tip, setTip] = useState(null) // { x, y, lines }

  const model = useMemo(() => buildTxGroupsModel(transactionTypes), [transactionTypes])

  const segments = useMemo(() => {
    const map = {}
    for (const g of model?.groups || []) map[g.key] = g

    const total = Number(model?.total || 0)

    return GROUP_ORDER.map((cfg) => {
      const g = map[cfg.key]
      const count = Number(g?.total || 0)
      const pctGeom = total > 0 ? (count / total) * 100 : 0 // geometry only
      return {
        ...cfg,
        count,
        pctGeom,
        types: Array.isArray(g?.types) ? g.types : []
      }
    }).filter((x) => x.count > 0)
  }, [model])

  // Safe conditional render now
  if (!model?.total) {
    return <span style={{ opacity: 0.4 }}>—</span>
  }

  const total = Number(totalTransactions || model.total || 0)
  const success = Number(successTransactions || 0)
  const successPct = total > 0 ? (success / total) * 100 : 0

  // Don't show "+details" if nothing to show (no types at all)
  const hasAnyTypes = segments.some((s) => (Array.isArray(s.types) ? s.types.length : 0) > 0)

  let left = 0

  return (
    <div className="dapps-activity">
      <div ref={ref} className="dapps-activity__bar" onMouseLeave={() => setTip(null)}>
        {segments.map((s) => {
          const segLeft = left
          left += s.pctGeom

          // Show counts on the bar
          const labelText = `${s.label} ${shortNiceNumber(s.count, 0)}`
          const showText = canFit(w, s.pctGeom, labelText)

          const onMove = (e) => {
            setTip({
              x: e.clientX,
              y: e.clientY,
              lines: buildTooltipLines(s, model.total)
            })
          }

          return (
            <div
              key={s.key}
              className="dapps-activity__seg"
              style={{
                left: `${segLeft}%`,
                width: `${s.pctGeom}%`,
                background: s.color
              }}
              onMouseMove={onMove}
              onMouseEnter={onMove}
            >
              {showText ? <div className="dapps-activity__segLabel">{labelText}</div> : null}
            </div>
          )
        })}
      </div>

      {tip ? <Tooltip x={tip.x} y={tip.y} lines={tip.lines} isDark={prefersDark} /> : null}

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

      {isOpen ? (
        <div className="dapps-activity__details">
          {segments.map((s) => {
            const pctAll = clampPctForDisplay(s.count, model.total)
            const types = Array.isArray(s.types) ? [...s.types] : []
            types.sort((a, b) => (Number(b?.count) || 0) - (Number(a?.count) || 0))

            return (
              <div key={s.key} className="dapps-activity__cat">
                <div className="dapps-activity__catHeader">
                  <div className="dapps-activity__catLeft">
                    <span className="dapps-activity__dot" style={{ background: s.color }} />
                    <b>{s.label}</b>
                    <span className="dapps-activity__muted">({pctAll.toFixed(1)}%)</span>
                  </div>
                  <div className="dapps-activity__catTotal">{shortNiceNumber(s.count, 0)}</div>
                </div>

                {types.length ? (
                  <div className="dapps-activity__grid">
                    {types.map((t) => (
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
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
