import Image from 'next/image'
import { IoWalletOutline } from 'react-icons/io5'

const WALLETCONNECT_LOGOS = {
  joey: 'joey.png',
  bifrost: 'bifrost.png',
  girin: 'girin.png',
  uphodl: 'uphodl.png'
}

export default function WalletProviderIcon({
  provider,
  walletItem = null,
  size = 20,
  className = 'wallet-logo',
  style = null,
  showFallback = false,
  fallbackClassName = '',
  fallbackStyle = null
}) {
  const shared = { height: size, width: size, className }
  const withStyle = (baseStyle = {}) => ({ ...(baseStyle || {}), ...(style || {}) })

  if (provider === 'walletconnect') {
    const walletConnectWalletId = walletItem?.walletConnectWalletId
    const walletConnectWalletName = walletItem?.walletConnectWalletName || 'WalletConnect'
    if (walletConnectWalletId && WALLETCONNECT_LOGOS[walletConnectWalletId]) {
      return (
        <Image
          src={`/images/wallets/square-logos/${WALLETCONNECT_LOGOS[walletConnectWalletId]}`}
          alt={walletConnectWalletName}
          {...shared}
          style={withStyle({ borderRadius: '4px' })}
        />
      )
    }
    return <Image src="/images/wallets/walletconnect.svg" alt="WalletConnect" {...shared} style={withStyle()} />
  }
  if (provider === 'metamask') {
    return <Image src="/images/wallets/metamask.svg" alt="Metamask" {...shared} style={withStyle()} />
  }
  if (provider === 'gemwallet') {
    return <Image src="/images/wallets/gemwallet.svg" alt="GemWallet" {...shared} style={withStyle()} />
  }
  if (provider === 'xaman') {
    return <Image src="/images/wallets/xaman.png" alt="Xaman" {...shared} style={withStyle({ borderRadius: '50%' })} />
  }
  if (provider === 'ledgerwallet') {
    return <Image src="/images/wallets/ledgerwallet.svg" alt="Ledger Wallet" {...shared} style={withStyle({ marginBottom: -2 })} />
  }
  if (provider === 'crossmark') {
    return (
      <Image
        src="/images/wallets/crossmark.png"
        alt="Crossmark Wallet"
        {...shared}
        style={withStyle({ borderRadius: '50%' })}
      />
    )
  }
  if (provider === 'xyra') {
    return <Image src="/images/wallets/xyra.svg" alt="Xyra Wallet" {...shared} style={withStyle()} />
  }
  if (provider === 'dcent') {
    return (
      <Image
        src="/images/wallets/square-logos/dcent.png"
        alt="D'Cent Wallet"
        {...shared}
        style={withStyle({ borderRadius: '50%' })}
      />
    )
  }

  if (showFallback) {
    return <IoWalletOutline className={fallbackClassName} style={fallbackStyle || undefined} />
  }

  return null
}
