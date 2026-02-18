import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

import {
  devNet,
  xahauNetwork,
  ledgerName,
  nativeCurrency,
  ledgerSubName,
  network,
  useWidth,
  avatarServer,
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
import { IoWalletOutline } from 'react-icons/io5'
import SearchBlock from '../SearchBlock'
import { niceNumber } from '../../../utils/format'

const HIDE_SEARCH_HEADER = ['/', '/explorer', '/account', '/amm', '/object', '/transaction', '/nft-volumes']
const HIDE_SEARCH_WHEN_NO_ID = ['/nfts', '/nft-offers', '/nft', '/nft-offer']

const ROUTE_TAB_MAP = [
  { prefix: '/account/[id]/transactions', tab: 'transactions' },
  { prefix: '/account/[id]/dex', tab: 'dex' },
  { prefix: '/account', tab: 'account' },
  { prefix: '/nft-explorer', tab: 'nfts' },
  { prefix: '/nfts', tab: 'nfts' },
  { prefix: '/nft-offers', tab: 'nft-offers' },
  { prefix: '/nft-offer', tab: 'nft-offer' },
  { prefix: '/nft-volumes', tab: 'nft-volumes' },
  { prefix: '/amm', tab: 'amm' },
  { prefix: '/nft', tab: 'nft' },
  { prefix: '/object', tab: 'object' },
  { prefix: '/transaction', tab: 'transaction' }
]

let timeoutIds = {}

const MenuDropDown = ({
  children,
  id,
  title,
  subtitle,
  setHoverStates,
  hoverStates,
  type,
  style,
  direction,
  containerStyle
}) => {
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
    <div
      className="menu-dropdown"
      onMouseEnter={() => handleMouseEnter(id)}
      onMouseLeave={() => handleMouseLeave(id)}
      style={containerStyle || {}}
    >
      <div
        className={'menu-dropdown-button' + (type === 'top-switch' ? ' switch-container contrast' : '')}
        style={style}
        onClick={() => setHoverStates((state) => ({ ...state, [id]: true }))}
      >
        {title}
        {subtitle && <div className="orange">&nbsp;{subtitle}</div>}
        <FaAngleDown className="chevron" />
      </div>
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
  setSelectedCurrency,
  countryCode,
  sessionToken,
  fiatRate
}) {
  const { i18n, t } = useTranslation()

  const router = useRouter()

  const [rendered, setRendered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const [hoverStates, setHoverStates] = useState({}) //{ dropdown7: true }
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  const width = useWidth()

  const headerCollapsedRef = useRef(false)
  useEffect(() => {
    headerCollapsedRef.current = headerCollapsed
  }, [headerCollapsed])

  useEffect(() => {
    setRendered(true)
  }, [])

  useEffect(() => {
    // Collapse only when header likely has a 2nd line (your breakpoints)
    const shouldUseCollapsingHeader = () => {
      const w = window.innerWidth
      return w <= 1050 || (w >= 1290 && w <= 1670)
    }

    let lastY = window.scrollY
    let ticking = false

    const setCollapsedIfChanged = (next) => {
      if (headerCollapsedRef.current === next) return
      headerCollapsedRef.current = next
      setHeaderCollapsed(next)
    }

    const onScroll = () => {
      if (!shouldUseCollapsingHeader()) {
        setCollapsedIfChanged(false)
        lastY = window.scrollY
        return
      }

      const y = window.scrollY
      const delta = y - lastY

      // avoid jitter
      if (Math.abs(delta) < 6) return

      if (y < 20) {
        setCollapsedIfChanged(false)
        lastY = y
        return
      }

      if (ticking) {
        lastY = y
        return
      }

      ticking = true
      window.requestAnimationFrame(() => {
        // down -> collapse, up -> expand
        setCollapsedIfChanged(delta > 0)
        ticking = false
      })

      lastY = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // IMPORTANT: attach once
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const proLoggedIn = proName && sessionToken

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

  const bithomp = server.includes('bithomp')

  const lang = i18n.language === 'default' ? 'en' : i18n.language

  const hideSearchInHeader =
    HIDE_SEARCH_HEADER.includes(router?.pathname) ||
    (HIDE_SEARCH_WHEN_NO_ID.some((route) => router?.pathname === route || router?.pathname?.startsWith(route + '/')) &&
      !router?.query?.id)

  return (
    <div
      className={
        (menuOpen ? 'mobile-menu-open ' : '') +
        (hideSearchInHeader ? 'hide-secondline ' : '') +
        (headerCollapsed ? 'header-collapsed ' : '')
      }
    >
      <header>
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" aria-label="Main page" style={{ display: 'inline-block', width: 'auto', height: 'auto' }}>
            {(width < 1050 && width > 370) || width > 1439 || !width ? (
              xahauNetwork ? (
                <div style={{ height: 46, width: 220, marginTop: -2.5 }}>
                  <XahauExplorer />
                </div>
              ) : bithomp ? (
                <div style={{ height: 46, width: 125, marginTop: -2.5 }}>
                  <LogoAnimated />
                </div>
              ) : (
                <XrplExplorer height="46" width="227" />
              )
            ) : (
              <div style={{ height: 46, width: 46, marginTop: -2.5 }}>
                <LogoSmall />
              </div>
            )}
          </Link>
          {/* fiat price next to logo */}
          {fiatRate > 0 && ((!xahauNetwork && width > 305) || width > 460) && (
            <span
              className="header-fiat-rate"
              style={{
                marginTop: -9,
                marginLeft: 12,
                color: 'var(--accent-link)',
                whiteSpace: 'nowrap',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 7,
                padding: '2px 6px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                width: '144px',
                textAlign: 'center'
              }}
              suppressHydrationWarning
            >
              {nativeCurrency} = {niceNumber(fiatRate, null, selectedCurrency, 4)}
            </span>
          )}
        </div>
        <div
          className="header-menu-left"
          style={!width || width > 1300 ? { left: xahauNetwork ? 300 : bithomp ? 193 : 260 } : {}}
        >
          <MenuDropDown
            id="dropdown-services"
            title={t('menu.services.services')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/services/send">{t('menu.services.send')}</Link>
            <Link href="/services/trustline">{t('menu.services.add-token')}</Link>
            <Link href="/username">{t('menu.services.username')}</Link>
            <Link href="/learn/xrp-xah-taxes">{t('menu.services.tax-reports')}</Link>
            <Link href="/services/account-settings/">{t('menu.services.account-settings')}</Link>
            <hr className="hr" />
            <Link href="/services">
              <b>{t('menu.services.view-all-services')}</b>
            </Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown2"
            title={t('menu.tokens')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/tokens">{t('menu.tokens')}</Link>
            {!xahauNetwork && <Link href="/mpts">Multi-Purpose {t('menu.tokens')}</Link>}
            <Link
              href={
                '/distribution' +
                (xahauNetwork
                  ? '?currencyIssuer=rEvernodee8dJLaFsujS6q1EiXvZYmHXr8&currency=EVR'
                  : '?currency=524C555344000000000000000000000000000000&currencyIssuer=rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De')
              }
            >
              TOP Holders
            </Link>
            <Link href="/services/trustline">Set Trust (Trustline)</Link>
            <Link href="/learn/issue-a-token">How to Issue a Token</Link>
            <Link href="/learn/guide-for-token-issuers">Guide for Token Issuers</Link>
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
              <Link href="/learn/amm">What is AMM?</Link>
              <Link href="/services/amm/deposit">AMM Deposit</Link>
              <Link href="/services/amm/withdraw">AMM Withdraw</Link>
              <Link href="/services/amm/vote">AMM Vote</Link>
              <Link href="/services/amm/create">AMM Create</Link>
              <Link href="/amm">{t('menu.amm.explorer')}</Link>
            </MenuDropDown>
          )}

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

          <MenuDropDown
            id="dropdown5"
            title={t('menu.network.blockchain')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            {xahauNetwork && <Link href="/governance">{t('menu.network.governance')}</Link>}
            <Link href="/activations">{t('menu.network.activations')}</Link>
            <Link href="/distribution">{t('menu.network.distribution', { currency: nativeCurrency })}</Link>
            <Link href="/last-ledger-information">{t('menu.network.last-ledger-information')}</Link>
            <Link href="/ledger">{t('menu.network.last-ledger-transactions')}</Link>
            <Link href="/whales">{t('menu.network.top-transfers-24h')}</Link>

            {/* Hide Verified Domains for XAHAU while they are not ready yet */}
            <Link href="/domains">{t('menu.network.verified-domains')}</Link>
            <Link href="/validators">{t('menu.network.validators')}</Link>
            <Link href="/amendments">{t('menu.network.amendments')}</Link>
            {!(xahauNetwork && devNet) && <Link href="/nodes">{t('menu.network.nodes')}</Link>}
            {xahauNetwork && <Link href="/unl-report">{t('menu.network.unl-report')}</Link>}
            <Link href="/genesis">{t('menu.network.genesis')}</Link>
            <Link href="/dapps">Dapps</Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown6"
            title={t('menu.developers.developers')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/learn/the-bithomp-api">{t('menu.developers.api')}</Link>
            <Link href="/learn/image-services">Token/NFT/Address Images</Link>
            {network === 'mainnet' && (
              <>
                <a href={'https://test.bithomp.com/create/'}>{t('menu.developers.account-generation')}</a>
                <a href={'https://test.bithomp.com/' + lang + '/faucet'}>{t('menu.developers.faucet')}</a>
                <a href={'https://test.bithomp.com/tools/'}>Bithomp tools</a>
              </>
            )}
            {devNet && (
              <>
                <a href={'/create/'}>{t('menu.developers.account-generation')}</a>
                <Link href="/faucet">{t('menu.developers.faucet')}</Link>
                <a href={'/tools/'}>Bithomp tools</a>
              </>
            )}
            <a href="https://github.com/Bithomp">Github</a>
            <Link href="/eaas">{t('menu.business.eaas')}</Link>
            <Link href="/build-unl">{t('menu.business.build-unl')}</Link>
          </MenuDropDown>
        </div>

        {width ? (
          <div className={'header-search-inline ' + (hideSearchInHeader ? 'hide-search-inline' : '')}>
            <SearchBlock
              compact={true}
              //searchPlaceholderText="Search..."
              tab={ROUTE_TAB_MAP.find((route) => router?.pathname?.startsWith(route.prefix))?.tab}
            />
          </div>
        ) : (
          ''
        )}

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
                  <>{!proLoggedIn ? t('signin.signin') : proName}</>
                )}
              </>
            }
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
            direction="stick-right"
            style={{ width: '100%', justifyContent: 'flex-end' }}
            containerStyle={{ minWidth: 215, textAlign: 'right' }}
          >
            {(displayName || proLoggedIn) && <div style={{ minWidth: '250px' }}></div>}
            {!displayName && (
              <span
                onClick={() => {
                  setSignRequest(router.pathname.startsWith('/account') ? { redirect: 'account' } : {})
                }}
                className="link"
              >
                <IoWalletOutline style={{ height: 24, width: 24, marginTop: -4 }} className="wallet-logo" />
                Connect Wallet
              </span>
            )}
            {displayName && (
              <>
                <Link href={'/account/' + address}>{t('signin.actions.view')}</Link>
                <Link href={'/account/' + address + '/transactions'}>{t('signin.actions.my-transactions')}</Link>
                <Link href="/services/send">Send payment</Link>
                <Link href="/services/account-settings/">Account settings</Link>
                {!username && <Link href={'/username?address=' + address}>{t('menu.services.username')}</Link>}
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
                  )}
                  {account?.wallet === 'xyra' && (
                    <Image
                      src="/images/wallets/xyra.svg"
                      className="wallet-logo"
                      alt="Xyra Wallet"
                      height={24}
                      width={24}
                      style={{ marginTop: -4, marginLeft: -2, marginRight: -2 }}
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
            {proLoggedIn && (
              <>
                <hr />
                <Link href="/admin">{displayName ? proName : 'Profile'}</Link>
                <Link href="/admin/watchlist">Watchlist</Link>
                <Link href="/admin/subscriptions">Subscriptions</Link>
                <Link href="/admin/referrals">Referrals</Link>
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
            title={lang?.toUpperCase()}
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
          sessionToken={sessionToken}
          signOut={signOut}
          signOutPro={signOutPro}
          username={username}
          isCopied={isCopied}
          copyToClipboard={copyToClipboard}
          account={account}
          countryCode={countryCode}
        />
      )}
    </div>
  )
}
