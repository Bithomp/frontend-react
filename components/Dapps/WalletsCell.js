import { useEffect, useRef, useState, useMemo } from 'react'
import Image from 'next/image'
import { useIsMobile } from '../../utils/mobile'
import { WALLET_POPULARITY } from '../../utils/dapps'

const WALLET_LOGOS = {
  xaman: 'xaman.png',
  gemwallet: 'gemwallet.png',
  crossmark: 'crossmark.png',
  joey: 'joey.png',
  bifrost: 'bifrost.png',
  girin: 'girin.png',
  uphodl: 'uphodl.png',
  metamask: 'metamask.png',
  ledger: 'ledger.png',
  dcent: 'dcent.png',
  xyra: 'xyra.svg'
}

const WALLET_NAMES = {
  xaman: 'Xaman',
  gemwallet: 'GemWallet',
  crossmark: 'Crossmark',
  joey: 'Joey',
  bifrost: 'Bifrost',
  girin: 'Girin',
  uphodl: 'Uphodl',
  metamask: 'MetaMask',
  ledger: 'Ledger',
  dcent: 'Dcent',
  xyra: 'Xyra'
}

function WalletTooltip({ x, y, name }) {
  if (!name) return null
  return (
    <div className="dapps-activity-tooltip" style={{ left: x + 12, top: y + 12 }}>
      <div className="dapps-activity-tooltip__line">{name}</div>
    </div>
  )
}

const POPULARITY_INDEX = new Map(WALLET_POPULARITY.map((id, idx) => [id, idx]))

export default function WalletsCell({ wallets = [], walletconnect = [] }) {
  const isMobile = useIsMobile(600)
  const [tip, setTip] = useState(null) // { x, y, name }
  const hideTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(hideTimerRef.current)
    }
  }, [])

  const allWallets = useMemo(() => {
    const a = Array.isArray(wallets) ? wallets : []
    const wc = Array.isArray(walletconnect) ? walletconnect : []

    const merged = [...a, ...wc].map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : '')).filter(Boolean)

    const uniq = Array.from(new Set(merged))

    uniq.sort((a, b) => {
      const ia = POPULARITY_INDEX.has(a) ? POPULARITY_INDEX.get(a) : Number.POSITIVE_INFINITY
      const ib = POPULARITY_INDEX.has(b) ? POPULARITY_INDEX.get(b) : Number.POSITIVE_INFINITY
      if (ia === ib) return a.localeCompare(b)
      return ia - ib
    })

    return uniq
  }, [wallets, walletconnect])

  if (!allWallets.length) return null

  const showTip = (x, y, w) => {
    const name = WALLET_NAMES[w] || w
    setTip({ x, y, name })

    // Auto-hide tip on mobile (no hover)
    if (isMobile) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setTip(null), 1200)
    }
  }

  const handleMouseEnter = (e, w) => {
    if (isMobile) return
    showTip(e.clientX, e.clientY, w)
  }

  const handleMouseMove = (e, w) => {
    if (isMobile) return
    const name = WALLET_NAMES[w] || w
    if (tip && tip.name === name) setTip({ x: e.clientX, y: e.clientY, name })
  }

  const handleMouseLeave = () => {
    if (isMobile) return
    setTip(null)
  }

  const handleTouch = (e, w) => {
    if (!isMobile) return
    const t = e.touches?.[0]
    if (!t) return
    showTip(t.clientX, t.clientY, w)
  }

  // Desktop: split into rows of max 4
  const rows = []
  if (!isMobile) {
    for (let i = 0; i < allWallets.length; i += 4) rows.push(allWallets.slice(i, i + 4))
  }

  const renderIcon = (w) => {
    const logo = WALLET_LOGOS[w] || `${w}.png`
    return (
      <span
        key={w}
        onMouseEnter={(e) => handleMouseEnter(e, w)}
        onMouseMove={(e) => handleMouseMove(e, w)}
        onMouseLeave={handleMouseLeave}
        onTouchStart={(e) => handleTouch(e, w)}
        onClick={(e) => {
          if (!isMobile) return
          showTip(e.clientX, e.clientY, w)
        }}
        style={{ display: 'inline-flex', flex: '0 0 auto' }}
      >
        <Image
          src={`/images/wallets/square-logos/${logo}`}
          alt={WALLET_NAMES[w] || w}
          width={18}
          height={18}
          style={{ borderRadius: 4 }}
          draggable={false}
        />
      </span>
    )
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block', minWidth: 0 }}>
      {isMobile ? (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            whiteSpace: 'normal',
            overflowX: 'visible',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
            paddingBottom: 2,
            marginTop: -2,
            scrollbarWidth: 'none'
          }}
        >
          <style jsx>{`
            span::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {allWallets.map(renderIcon)}
        </span>
      ) : (
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'flex-start',
            maxWidth: 80,
            marginTop: -4
          }}
        >
          {rows.map((row, i) => (
            <span key={i} style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
              {row.map(renderIcon)}
            </span>
          ))}
        </span>
      )}

      {tip ? <WalletTooltip x={tip.x} y={tip.y} name={tip.name} /> : null}
    </span>
  )
}
