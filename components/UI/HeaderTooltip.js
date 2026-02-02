import { useState, useRef } from 'react'

export const HeaderTooltip = ({ label, tip, align = 'right' }) => {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  const show = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()

    setPos({
      x: r.left + r.width / 2,
      y: r.bottom + 8
    })
  }

  const hide = () => setPos(null)

  return (
    <th className={align} style={{ paddingRight: align === 'right' ? 10 : 0 }}>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{
          display: 'inline-flex',
          gap: 6,
          cursor: 'pointer'
        }}
      >
        {label}
        <span className="grey">ⓘ</span>
      </span>

      {pos && (
        <div
          className="dapps-activity-tooltip"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translateX(-50%)',
            fontWeight: 'normal',
            maxWidth: 300
          }}
        >
          {tip}
        </div>
      )}
    </th>
  )
}
