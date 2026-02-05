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

export default function WalletsCell({ wallets }) {
  if (!Array.isArray(wallets) || wallets.length === 0) return null
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {wallets.map((w) => {
        const logo = WALLET_LOGOS[w] || `${w}.png`
        return (
          <Image
            key={w}
            src={`/images/wallets/square-logos/${logo}`}
            alt={w}
            width={18}
            height={18}
            style={{ borderRadius: 4, background: '#fff' }}
            title={w}
          />
        )
      })}
    </span>
  )
}
