import { useState, useRef } from 'react'
import Image from 'next/image'

const WALLET_LOGOS = {
  walletconnect: 'walletconnect.png',
  xaman: 'xaman.png',
  gemwallet: 'gemwallet.png',
  crossmark: 'crossmark.png',
  joey: 'joey.png',
  metamask: 'metamask.png',
  ledger: 'ledger.png',
  dcent: 'dcent.png'
  // Add more as needed
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
  // Add more as needed
}

function WalletTooltip({ x, y, name }) {
  if (!name) return null
  const style = {
    left: x + 12,
    top: y + 12
  }
  return (
    <div className="dapps-activity-tooltip" style={style}>
      <div className="dapps-activity-tooltip__line">{name}</div>
    </div>
  )
}

export default function WalletsCell({ wallets }) {
  const [tip, setTip] = useState(null)
  const timerRef = useRef()

  if (!Array.isArray(wallets) || wallets.length === 0) return null

  const handleMouseEnter = (e, w) => {
    clearTimeout(timerRef.current)
    const name = WALLET_NAMES[w] || w
    setTip({ x: e.clientX, y: e.clientY, name })
  }

  const handleMouseMove = (e, w) => {
    const name = WALLET_NAMES[w] || w
    if (tip && tip.name === name) {
      setTip({ x: e.clientX, y: e.clientY, name })
    }
  }

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current)
    setTip(null)
  }

  // Split wallets prop into rows of max 4, using the order from DAPPS_META
  const rows = []
  for (let i = 0; i < wallets.length; i += 4) {
    rows.push(wallets.slice(i, i + 4))
  }

  return (
    <span
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        gap: 2,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        minWidth: 0,
        maxWidth: 80,
        padding: '4px 0',
        position: 'relative',
        overflow: 'visible'
      }}
    >
      {rows.map((row, i) => (
        <span
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 4,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            minWidth: 0,
            overflow: 'visible'
          }}
        >
          {row.map((w) => {
            const logo = WALLET_LOGOS[w] || `${w}.png`
            return (
              <span
                key={w}
                onMouseEnter={(e) => handleMouseEnter(e, w)}
                onMouseMove={(e) => handleMouseMove(e, w)}
                onMouseLeave={handleMouseLeave}
                style={{ display: 'inline-block' }}
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
          })}
        </span>
      ))}
      {tip ? <WalletTooltip x={tip.x} y={tip.y} name={tip.name} /> : null}
    </span>
  )
}
