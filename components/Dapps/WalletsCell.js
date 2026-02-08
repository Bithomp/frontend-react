import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useIsMobile } from '../../utils/mobile' // adjust path if needed

const WALLET_LOGOS = {
  walletconnect: 'walletconnect.png',
  xaman: 'xaman.png',
  gemwallet: 'gemwallet.png',
  crossmark: 'crossmark.png',
  joey: 'joey.png',
  metamask: 'metamask.png',
  ledger: 'ledger.png',
  dcent: 'dcent.png'
}

const WALLET_NAMES = {
  walletconnect: 'WalletConnect',
  xaman: 'Xaman',
  gemwallet: 'GemWallet',
  crossmark: 'Crossmark',
  joey: 'Joey',
  metamask: 'MetaMask',
  ledger: 'Ledger',
  dcent: 'Dcent'
}

function WalletTooltip({ x, y, name }) {
  if (!name) return null
  return (
    <div className="dapps-activity-tooltip" style={{ left: x + 12, top: y + 12 }}>
      <div className="dapps-activity-tooltip__line">{name}</div>
    </div>
  )
}

export default function WalletsCell({ wallets }) {
  const isMobile = useIsMobile(600)

  const [tip, setTip] = useState(null) // { x, y, name }
  const hideTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(hideTimerRef.current)
    }
  }, [])

  if (!Array.isArray(wallets) || wallets.length === 0) return null

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
    for (let i = 0; i < wallets.length; i += 4) rows.push(wallets.slice(i, i + 4))
  }

  // Shared renderer for an icon
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
        // Mobile: single line, no breaks, horizontal scroll
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            maxWidth: 120, // tune to your column width; keeps the row compact
            paddingBottom: 2,
            marginTop: -2,
            scrollbarWidth: 'none' // Firefox
          }}
        >
          {/* Hide scrollbar on WebKit */}
          <style jsx>{`
            span::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {wallets.map(renderIcon)}
        </span>
      ) : (
        // Desktop: keep your current "rows of 4"
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
            <span
              key={i}
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'nowrap'
              }}
            >
              {row.map(renderIcon)}
            </span>
          ))}
        </span>
      )}

      {tip ? <WalletTooltip x={tip.x} y={tip.y} name={tip.name} /> : null}
    </span>
  )
}
