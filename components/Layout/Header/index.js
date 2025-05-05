import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

import {
  devNet,
  xahauNetwork,
  ledgerName,
  nativeCurrency,
  ledgerSubName,
  network,
  useWidth,
  avatarServer,
  networkId,
  server
} from '../../../utils'

import Image from 'next/image'
import Switch from './Switch'
import LangTable from './LangTable'
import CurrencyTable from './CurrencyTable'
import NetworkTable from './NetworkTable'
import MobileMenu from './MobileMenu'
import { FaAngleDown } from 'react-icons/fa'
import { IoIosRocket } from 'react-icons/io'

import LogoSmall from '../LogoSmall'
import XrplExplorer from '../../../public/images/xrplexplorer/long.svg'
import XahauExplorer from '../../../public/images/xahauexplorer/long.svg'
import LogoAnimated from '../LogoAnimated'

let timeoutIds = {}

const MenuDropDown = ({ children, id, title, subtitle, setHoverStates, hoverStates, type, style, direction }) => {
  if (!direction) direction = 'stick-left'
  const handleMouseEnter = (id) => {
    // clear timeout for all dropdowns
    for (let key in timeoutIds) {
      clearTimeout(timeoutIds[key])
    }
    //hide other dropdowns, show this one
    setHoverStates((state) => {
      //set all in state to false acept the with key id
      let newState = {}
      for (let key in state) {
        newState[key] = key === id
      }
      newState[id] = true
      return newState
    })
  }
  const handleMouseLeave = (id) => {
    timeoutIds[id] = setTimeout(() => {
      setHoverStates((state) => ({ ...state, [id]: false }))
    }, 600)
  }

  const body = (
    <div className="menu-dropdown" onMouseEnter={() => handleMouseEnter(id)} onMouseLeave={() => handleMouseLeave(id)}>
      <div
        className={'menu-dropdown-button' + (type === 'top-switch' ? ' switch-container contrast' : '')}
        style={style}
        onClick={() => setHoverStates((state) => ({ ...state, [id]: !hoverStates[id] }))}
      >
        {title}
        <FaAngleDown className="chevron" />
      </div>
      {subtitle && <div className="menu-dropdown-subtitle orange">{subtitle?.toLowerCase()}</div>}
      {hoverStates[id] && <div className={'menu-dropdown-content ' + direction}>{children}</div>}
    </div>
  )

  if (type === 'top-switch') {
    return <div className="top-switch">{body}</div>
  } else {
    return body
  }
}

export default function Header({
  setSignRequest,
  account,
  signOut,
  signOutPro,
  selectedCurrency,
  setSelectedCurrency
}) {
  const { i18n, t } = useTranslation()

  const router = useRouter()

  const [rendered, setRendered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const [xamanUserToken, setXamanUserToken] = useState(null)

  const [hoverStates, setHoverStates] = useState({}) //{ dropdown7: true }

  const width = useWidth()

  useEffect(() => {
    setRendered(true)
    setXamanUserToken(localStorage.getItem('xamanUserToken'))
  }, [])

  let address, displayName, username, pro, proName
  if (account && account.address) {
    address = account.address
    username = account.username
    if (account.username) {
      displayName = <b>{username}</b>
    } else {
      displayName = address.substr(0, 8) + '...' + address.substr(-8)
    }
  }
  if (account && account.pro) {
    pro = account.pro
    //split email before @ and after
    const emailParts = pro.split('@')
    let emailPart1 = emailParts[0]
    let emailPart2 = emailParts[1]
    if (emailPart1?.length > 10) {
      emailPart1 = emailPart1.substr(0, 7) + '**'
    }
    if (emailPart2?.length > 10) {
      emailPart2 = '**' + emailPart2.substr(-7)
    }
    proName = emailPart1 + '@' + emailPart2
  }

  const mobileMenuToggle = () => {
    // remove scrollbar when menu is open
    if (!menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    setMenuOpen(!menuOpen)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address).then(
      () => {
        setIsCopied(true)
        setTimeout(() => {
          setIsCopied(false)
        }, 1000)
      },
      (err) => {
        console.error('Could not copy text: ', err)
      }
    )
  }

  const signinWithWallet = (wallet) => {
    //redirect to account, if user is on the account page
    setSignRequest(router.pathname === '/account/[[...id]]' ? { wallet, redirect: 'account' } : { wallet })
  }

  const bithomp = server.includes('bithomp')

  return (
    <div className={menuOpen ? 'mobile-menu-open' : ''}>
      <header>
        <div className="header-logo">
          <Link href="/" aria-label="Main page" style={{ display: 'inline-block', width: 'auto', height: 'auto' }}>
            {(width < 1060 && width > 350) || width > 1240 || !width ? (
              xahauNetwork ? (
                <XahauExplorer height="43" width="263" />
              ) : bithomp ? (
                <div style={{ height: 46, width: 160, marginTop: -2.5 }}>
                  <LogoAnimated />
                </div>
              ) : (
                <XrplExplorer height="43" width="227" />
              )
            ) : (
              <LogoSmall width="43" height="43" />
            )}
          </Link>
        </div>
        <div
          className="header-menu-left"
          style={!width || width > 1240 ? { left: xahauNetwork ? 300 : bithomp ? 193 : 260 } : {}}
        >
          <MenuDropDown
            id="dropdown1"
            title={t('menu.services.services')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/faucet">{t('menu.developers.faucet')}</Link>
            <Link href="/services/nft-mint">{t('menu.services.nft-mint')}</Link>
            <Link href="/username">{t('menu.usernames')}</Link>
            <Link href="/xrp-xah-taxes">{t('menu.services.tax-reports')}</Link>
            <Link href="/submit-account-information">{t('menu.project-registration')}</Link>
            {!devNet && <Link href="/alerts">{t('menu.price-alerts', { nativeCurrency })}</Link>}
            {/* <a href={'/submit/'}>{t('menu.submit-offline-tx')}</a> */}
          </MenuDropDown>

          <MenuDropDown id="dropdown3" title="NFT" setHoverStates={setHoverStates} hoverStates={hoverStates}>
            {displayName ? (
              <>
                <Link href={'/nfts/' + address}>{t('signin.actions.my-nfts')}</Link>
                <Link href={'/nft-offers/' + address}>{t('signin.actions.my-nft-offers')}</Link>
              </>
            ) : (
              <>
                <span
                  onClick={() => {
                    setSignRequest({ redirect: 'nfts' })
                  }}
                  className="link"
                >
                  {t('signin.actions.my-nfts')}
                </span>
                <span
                  onClick={() => {
                    setSignRequest({ redirect: 'nft-offers' })
                  }}
                  className="link"
                >
                  {t('signin.actions.my-nft-offers')}
                </span>
              </>
            )}
            <Link href="/nft-explorer">{t('menu.nft.explorer')}</Link>
            <Link href="/nft-sales">{t('menu.nft.sales')}</Link>
            <Link href="/nft-volumes?period=week">{t('menu.nft.collections')}</Link>
            <Link href="/nft-volumes?list=marketplaces&period=week">{t('menu.nft.marketplaces')}</Link>
            <Link href="/nft-volumes?list=charts&period=week">{t('menu.nft.volumes')}</Link>

            {/* Hide NFT menu for XAHAU while they are not ready yet */}
            {!xahauNetwork && <Link href="/nft-minters">{t('menu.nft.minters')}</Link>}

            <Link href={'/nfts' + (displayName ? '/' + address : '')}>{t('menu.nft.nfts')}</Link>
            <Link href={'/nft-offers' + (displayName ? '/' + address : '')}>{t('menu.nft.offers')}</Link>
            <Link href="/nft-distribution">{t('menu.nft.distribution')}</Link>
            <Link href="/nft-statistics">{t('menu.nft.statistics')}</Link>
            <Link href="/services/nft-mint">{t('menu.services.nft-mint')}</Link>
          </MenuDropDown>

          {/* Hide AMM for XAHAU */}
          {!xahauNetwork && (
            <MenuDropDown
              id="dropdown4"
              title={t('menu.amm.amm')}
              setHoverStates={setHoverStates}
              hoverStates={hoverStates}
            >
              <Link href="/amms">{t('menu.amm.pools')}</Link>
              <Link href="/amm">{t('menu.amm.explorer')}</Link>
            </MenuDropDown>
          )}

          <MenuDropDown
            id="dropdown5"
            title={t('menu.network.blockchain')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            {xahauNetwork && <Link href="/governance">{t('menu.network.governance')}</Link>}
            <Link href="/activations">{t('menu.network.activations')}</Link>
            <Link href="/distribution">{t('menu.network.distribution', { nativeCurrency })}</Link>
            <Link href="/last-ledger-information">{t('menu.network.last-ledger-information')}</Link>
            <Link href="/ledger">{t('menu.network.last-ledger-transactions')}</Link>
            <Link href="/whales">{t('menu.network.top-transfers-24h')}</Link>

            {/* Hide Verified Domains for XAHAU while they are not ready yet */}
            {!xahauNetwork && <Link href="/domains">{t('menu.network.verified-domains')}</Link>}
            <Link href="/validators">{t('menu.network.validators')}</Link>
            <Link href="/amendments">{t('menu.network.amendments')}</Link>
            {!(xahauNetwork && devNet) && <Link href="/nodes">{t('menu.network.nodes')}</Link>}
            {xahauNetwork && <Link href="/unl-report">{t('menu.network.unl-report')}</Link>}
            <Link href="/genesis">{t('menu.network.genesis')}</Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown6"
            title={t('menu.developers.developers')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            {network === 'mainnet' && (
              <>
                <a href={'https://test.xrplexplorer.com/create/'}>{t('menu.developers.account-generation')}</a>
                <a href={'https://test.xrplexplorer.com/' + i18n.language + '/faucet'}>{t('menu.developers.faucet')}</a>
                <a href={'https://test.xrplexplorer.com/tools/'}>Bithomp tools</a>
              </>
            )}
            {devNet && (
              <>
                <a href={'/create/'}>{t('menu.developers.account-generation')}</a>
                <Link href="/faucet">{t('menu.developers.faucet')}</Link>
                <a href={'/tools/'}>Bithomp tools</a>
              </>
            )}
            <a href="https://docs.bithomp.com">{t('menu.developers.api')}</a>
            <Link href="/admin">{t('menu.developers.api-admin')}</Link>
            <a href="https://github.com/Bithomp">Github</a>
            <Link href="/eaas">{t('menu.business.eaas')}</Link>
            <Link href="/build-unl">{t('menu.business.build-unl')}</Link>
          </MenuDropDown>
        </div>

        <div className="header-menu-right">
          <MenuDropDown
            id="dropdown7"
            title={
              <>
                {displayName ? (
                  <>
                    <Image
                      alt="avatar"
                      src={avatarServer + address}
                      width="24"
                      height="24"
                      style={{ marginRight: '5px' }}
                    />
                    {displayName}
                  </>
                ) : (
                  <>{!proName ? t('signin.signin') : proName}</>
                )}
              </>
            }
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            {(displayName || proName) && <div style={{ minWidth: '250px' }}></div>}
            {!displayName && (
              <>
                <span
                  onClick={() => {
                    signinWithWallet('xaman')
                  }}
                  className="link"
                >
                  <Image
                    src="/images/wallets/xaman.png"
                    className="wallet-logo xaman-logo"
                    alt="Xaman"
                    height={24}
                    width={24}
                  />
                  Xaman
                </span>

                <span onClick={() => signinWithWallet('crossmark')} className="link">
                  <Image
                    src="/images/wallets/crossmark.png"
                    className="wallet-logo"
                    alt="Crossmark Wallet"
                    height={24}
                    width={24}
                  />
                  Crossmark
                </span>

                <span
                  onClick={() => {
                    signinWithWallet('gemwallet')
                  }}
                  className="link"
                >
                  <Image
                    src="/images/wallets/gemwallet.svg"
                    className="wallet-logo"
                    alt="GemWallet"
                    height={24}
                    width={24}
                  />
                  GemWallet
                </span>

                {/* available only on the mainnet and testnet */}
                {(networkId === 0 || networkId === 1) && (
                  <span onClick={() => signinWithWallet('walletconnect')} className="link">
                    <Image
                      src="/images/wallets/walletconnect.svg"
                      className="wallet-logo walletconnect-logo"
                      alt="Wallet Connect"
                      height={24}
                      width={24}
                    />
                    WalletConnect
                  </span>
                )}

                <span onClick={() => signinWithWallet('metamask')} className="link">
                  <Image
                    src="/images/wallets/metamask.svg"
                    className="wallet-logo"
                    alt="Metamask Wallet"
                    height={24}
                    width={24}
                  />
                  Metamask
                </span>

                <span onClick={() => signinWithWallet('ledgerwallet')} className="link">
                  <Image
                    src="/images/wallets/ledgerwallet.svg"
                    className="wallet-logo"
                    alt="Ledger Wallet"
                    height={24}
                    width={24}
                  />
                  Ledger
                </span>

                <span onClick={() => signinWithWallet('trezor')} className="link">
                  <Image
                    src="/images/wallets/trezor.svg"
                    className="wallet-logo"
                    alt="Trezor Wallet"
                    height={24}
                    width={24}
                  />
                  Trezor
                </span>
              </>
            )}

            {displayName && (
              <>
                <span onClick={copyToClipboard} className="link">
                  {isCopied ? t('button.copied') : t('button.copy-my-address')}
                </span>
                <Link href={'/account/' + address}>{t('signin.actions.view')}</Link>
                <a href={server + '/explorer/' + address}>{t('signin.actions.my-transactions')}</a>
                <Link href={'/nfts/' + address}>{t('signin.actions.my-nfts')}</Link>
                <Link href={'/nft-offers/' + address}>{t('signin.actions.my-nft-offers')}</Link>

                {!username && <Link href={'/username?address=' + address}>{t('menu.usernames')}</Link>}

                {/* Hide Send XRP for XAHAU while they are not ready yet */}
                {!xahauNetwork && (
                  <>
                    {account?.wallet === 'xaman' && xamanUserToken && (
                      <a href={'/explorer/' + address + '?hw=xumm&xummtoken=' + xamanUserToken + '&action=send'}>
                        {t('signin.actions.send')}
                      </a>
                    )}
                  </>
                )}

                <span onClick={signOut} className="link">
                  {account?.wallet === 'walletconnect' && (
                    <Image
                      src="/images/wallets/walletconnect.svg"
                      className="wallet-logo walletconnect-logo"
                      alt="WalletConnect"
                      height={24}
                      width={24}
                    />
                  )}
                  {account?.wallet === 'metamask' && (
                    <Image
                      src="/images/wallets/metamask.svg"
                      className="wallet-logo"
                      alt="Metamask"
                      height={24}
                      width={24}
                    />
                  )}
                  {account?.wallet === 'gemwallet' && (
                    <Image
                      src="/images/wallets/gemwallet.svg"
                      className="wallet-logo"
                      alt="GemWallet"
                      height={24}
                      width={24}
                    />
                  )}
                  {account?.wallet === 'xaman' && (
                    <Image
                      src="/images/wallets/xaman.png"
                      className="wallet-logo xaman-logo"
                      alt="Xaman"
                      height={24}
                      width={24}
                    />
                  )}
                  {account?.wallet === 'ledgerwallet' && (
                    <Image
                      src="/images/wallets/ledgerwallet.svg"
                      className="wallet-logo"
                      alt="Ledger Wallet"
                      height={24}
                      width={24}
                    />
                  )}
                  {account?.wallet === 'trezor' && (
                    <Image
                      src="/images/wallets/trezor.svg"
                      className="wallet-logo"
                      alt="Trezor Wallet"
                      height={24}
                      width={24}
                    />
                  )}
                  {account?.wallet === 'crossmark' && (
                    <Image
                      src="/images/wallets/crossmark.png"
                      className="wallet-logo"
                      alt="Crossmark Wallet"
                      height={24}
                      width={24}
                    />
                  )}{' '}
                  {t('signin.signout')}
                </span>
              </>
            )}

            <hr className="hr" />
            <Link href="/admin">
              <IoIosRocket style={{ fontSize: '1.2em', marginBottom: '-2px' }} /> Bithomp Pro
            </Link>
            {proName && (
              <>
                <hr />
                <Link href="/admin">{displayName ? proName : 'Profile'}</Link>
                <Link href="/admin/watchlist">Watchlist</Link>
                <Link href="/admin/subscriptions">Subscriptions</Link>
                <Link href="/admin/pro">My addresses</Link>
                <Link href="/admin/api">API management</Link>
                <span onClick={signOutPro} className="link">
                  {t('signin.signout')}
                </span>
              </>
            )}
          </MenuDropDown>

          <MenuDropDown
            id="dropdown8"
            title={ledgerName}
            subtitle={ledgerSubName}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
            type="top-switch"
            style={{ width: '100%' }}
            direction="stick-right"
          >
            <NetworkTable close={() => setHoverStates((state) => ({ ...state, dropdown8: false }))} />
          </MenuDropDown>
          {rendered && (
            <MenuDropDown
              id="dropdown9"
              title={selectedCurrency?.toUpperCase()}
              setHoverStates={setHoverStates}
              hoverStates={hoverStates}
              type="top-switch"
              direction="stick-right"
            >
              <CurrencyTable
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
                close={() => setHoverStates((state) => ({ ...state, dropdown9: false }))}
              />
            </MenuDropDown>
          )}

          <MenuDropDown
            id="dropdown10"
            title={i18n.language?.toUpperCase()}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
            type="top-switch"
            direction="stick-right"
          >
            <LangTable close={() => setHoverStates((state) => ({ ...state, dropdown10: false }))} />
          </MenuDropDown>

          <Switch />
        </div>
        <div className="header-burger">
          <input type="checkbox" id="header-burger" checked={menuOpen} onChange={mobileMenuToggle} />
          <label htmlFor="header-burger" className="header-burger-elements">
            <div></div>
            <div></div>
            <div></div>
          </label>
        </div>
      </header>
      {rendered && (
        <MobileMenu
          mobileMenuToggle={mobileMenuToggle}
          displayName={displayName}
          address={address}
          setSignRequest={setSignRequest}
          proName={proName}
          signOut={signOut}
          signOutPro={signOutPro}
          xamanUserToken={account?.wallet === 'xaman' ? xamanUserToken : null}
          username={username}
          isCopied={isCopied}
          copyToClipboard={copyToClipboard}
          account={account}
        />
      )}
    </div>
  )
}
