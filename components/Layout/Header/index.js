import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

import {
  devNet,
  explorerName,
  xahauNetwork,
  ledgerName,
  nativeCurrency,
  ledgerSubName,
  network,
  useWidth,
  avatarServer,
  server
} from '../../../utils'

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
import {
  IoWalletOutline,
  IoLogOutOutline,
  IoPersonOutline,
  IoListOutline,
  IoPaperPlaneOutline,
  IoSettingsOutline,
  IoAtOutline,
  IoStarOutline,
  IoCardOutline,
  IoPeopleOutline,
  IoLocationOutline,
  IoKeyOutline,
  IoCompassOutline,
  IoAddCircleOutline,
  IoReceiptOutline,
  IoAppsOutline,
  IoCashOutline,
  IoLayersOutline,
  IoTrophyOutline,
  IoLinkOutline,
  IoDocumentTextOutline,
  IoBookOutline,
  IoHelpCircleOutline,
  IoArrowDownCircleOutline,
  IoArrowUpCircleOutline,
  IoCheckboxOutline,
  IoBuildOutline,
  IoPricetagOutline,
  IoTrendingUpOutline,
  IoStorefrontOutline,
  IoBarChartOutline,
  IoTicketOutline,
  IoStatsChartOutline,
  IoFlashOutline,
  IoInformationCircleOutline,
  IoListCircleOutline,
  IoGlobeOutline,
  IoCheckmarkDoneOutline,
  IoDocumentAttachOutline,
  IoShieldCheckmarkOutline,
  IoCodeSlashOutline,
  IoImagesOutline,
  IoPersonAddOutline,
  IoLogoGithub,
  IoGitBranchOutline,
  IoRocketOutline
} from 'react-icons/io5'
import { RiPuzzleLine } from 'react-icons/ri'
import SearchBlock from '../SearchBlock'
import WalletProviderIcon from '../../UI/WalletProviderIcon'
import { niceNumber } from '../../../utils/format'
import { serviceUsernameOrAddressText } from '../../../utils/format'

const HIDE_SEARCH_HEADER = ['/explorer', '/account', '/amm', '/object', '/transaction', '/nft-volumes']
const HIDE_SEARCH_WHEN_NO_ID = ['/nfts', '/nft-offers', '/nft', '/nft-offer']

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
  setActiveWallet,
  signOutPro,
  selectedCurrency,
  setSelectedCurrency,
  countryCode,
  sessionToken,
  fiatRate,
  openEmailLogin
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
      return w <= 1050 || (w >= 1290 && w <= 1760)
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
  const wallets = Array.isArray(account?.wallets) ? account.wallets : []
  const orderedWallets = [...wallets].sort((a, b) => (b?.connectedAt || 0) - (a?.connectedAt || 0))
  const activeWalletId = account?.activeWalletId || null

  const walletDisplayName = (walletItem) =>
    serviceUsernameOrAddressText(
      {
        address: walletItem?.address,
        addressDetails: {
          username: walletItem?.username || null
        }
      },
      'address',
      { short: true }
    )

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

  const showLargeLogo = (width < 1050 && width > 370) || width >= 1440 || !width
  const showFiatRateSlot = !xahauNetwork || width > 460 || !width

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
            {showLargeLogo ? (
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
              <div style={{ height: 46, width: 36, marginTop: -2.5 }}>
                <LogoSmall />
              </div>
            )}
          </Link>
          {/* fiat price next to logo */}
          {showFiatRateSlot && (
            <span
              className={
                'header-fiat-rate' +
                (showLargeLogo ? ' large-logo' : ' compact-logo') +
                (xahauNetwork ? ' xahau-rate' : ' default-rate')
              }
              suppressHydrationWarning
              aria-hidden={fiatRate > 0 ? 'false' : 'true'}
            >
              <span className={'header-fiat-rate-text' + (fiatRate > 0 ? ' visible' : '')}>
                {fiatRate > 0 ? `${nativeCurrency} = ${niceNumber(fiatRate, null, selectedCurrency, 4)}` : ' '}
              </span>
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
            <Link href="/explorer">
              <IoCompassOutline className="menu-item-icon" />
              {explorerName} Explorer
            </Link>
            <Link href="/services/send">
              <IoPaperPlaneOutline className="menu-item-icon" />
              {t('menu.services.send')}
            </Link>
            <Link href="/services/trustline">
              <IoAddCircleOutline className="menu-item-icon" />
              {t('menu.services.add-token')}
            </Link>
            <Link href="/username">
              <IoAtOutline className="menu-item-icon" />
              {t('menu.services.username')}
            </Link>
            <Link href="/learn/xrp-xah-taxes">
              <IoReceiptOutline className="menu-item-icon" />
              {t('menu.services.tax-reports')}
            </Link>
            <Link href="/services/account-settings/">
              <IoSettingsOutline className="menu-item-icon" />
              {t('menu.services.account-settings')}
            </Link>
            <Link href="/faucet">
              <IoFlashOutline className="menu-item-icon" />
              {t('menu.developers.faucet')}
            </Link>
            <hr className="hr" />
            <Link href="/services">
              <IoAppsOutline className="menu-item-icon" />
              <b>{t('menu.services.view-all-services')}</b>
            </Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown2"
            title={t('menu.tokens')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/tokens">
              <IoCashOutline className="menu-item-icon" />
              {t('menu.tokens')}
            </Link>
            {!xahauNetwork && (
              <Link href="/mpts">
                <IoLayersOutline className="menu-item-icon" />
                Multi-Purpose {t('menu.tokens')}
              </Link>
            )}
            <Link
              href={
                '/distribution' +
                (xahauNetwork
                  ? '?currencyIssuer=rEvernodee8dJLaFsujS6q1EiXvZYmHXr8&currency=EVR'
                  : '?currency=524C555344000000000000000000000000000000&currencyIssuer=rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De')
              }
            >
              <IoTrophyOutline className="menu-item-icon" />
              TOP Holders
            </Link>
            <Link href="/services/trustline">
              <IoLinkOutline className="menu-item-icon" />
              Set Trust (Trustline)
            </Link>
            <Link href="/learn/issue-a-token">
              <IoDocumentTextOutline className="menu-item-icon" />
              How to Issue a Token
            </Link>
            <Link href="/learn/guide-for-token-issuers">
              <IoBookOutline className="menu-item-icon" />
              Guide for Token Issuers
            </Link>
          </MenuDropDown>

          {/* Hide AMM for XAHAU */}
          {!xahauNetwork && (
            <MenuDropDown
              id="dropdown4"
              title={t('menu.amm.amm')}
              setHoverStates={setHoverStates}
              hoverStates={hoverStates}
            >
              <Link href="/amms">
                <IoBarChartOutline className="menu-item-icon" />
                {t('menu.amm.pools')}
              </Link>
              <Link href="/learn/amm">
                <IoHelpCircleOutline className="menu-item-icon" />
                What is AMM?
              </Link>
              <Link href="/services/amm/deposit">
                <IoArrowDownCircleOutline className="menu-item-icon" />
                AMM Deposit
              </Link>
              <Link href="/services/amm/withdraw">
                <IoArrowUpCircleOutline className="menu-item-icon" />
                AMM Withdraw
              </Link>
              <Link href="/services/amm/vote">
                <IoCheckboxOutline className="menu-item-icon" />
                AMM Vote
              </Link>
              <Link href="/services/amm/create">
                <IoBuildOutline className="menu-item-icon" />
                AMM Create
              </Link>
              <Link href="/amm">
                <IoCompassOutline className="menu-item-icon" />
                {t('menu.amm.explorer')}
              </Link>
            </MenuDropDown>
          )}

          <MenuDropDown id="dropdown3" title="NFT" setHoverStates={setHoverStates} hoverStates={hoverStates}>
            {displayName ? (
              <>
                <Link href={'/nfts/' + address}>
                  <IoImagesOutline className="menu-item-icon" />
                  {t('signin.actions.my-nfts')}
                </Link>
                <Link href={'/nft-offers/' + address}>
                  <IoPricetagOutline className="menu-item-icon" />
                  {t('signin.actions.my-nft-offers')}
                </Link>
              </>
            ) : (
              <>
                <span
                  onClick={() => {
                    setSignRequest({ redirect: 'nfts' })
                  }}
                  className="link"
                >
                  <IoImagesOutline className="menu-item-icon" />
                  {t('signin.actions.my-nfts')}
                </span>
                <span
                  onClick={() => {
                    setSignRequest({ redirect: 'nft-offers' })
                  }}
                  className="link"
                >
                  <IoPricetagOutline className="menu-item-icon" />
                  {t('signin.actions.my-nft-offers')}
                </span>
              </>
            )}
            <Link href="/nft-explorer">
              <IoCompassOutline className="menu-item-icon" />
              {t('menu.nft.explorer')}
            </Link>
            <Link href="/nft-sales">
              <IoTrendingUpOutline className="menu-item-icon" />
              {t('menu.nft.sales')}
            </Link>
            <Link href="/nft-volumes?period=week">
              <IoLayersOutline className="menu-item-icon" />
              {t('menu.nft.collections')}
            </Link>
            <Link href="/nft-volumes?list=marketplaces&period=week">
              <IoStorefrontOutline className="menu-item-icon" />
              {t('menu.nft.marketplaces')}
            </Link>
            <Link href="/nft-volumes?list=charts&period=week">
              <IoBarChartOutline className="menu-item-icon" />
              {t('menu.nft.volumes')}
            </Link>

            {/* Hide NFT menu for XAHAU while they are not ready yet */}
            {!xahauNetwork && (
              <Link href="/nft-minters">
                <IoPersonAddOutline className="menu-item-icon" />
                {t('menu.nft.minters')}
              </Link>
            )}

            <Link href={'/nfts' + (displayName ? '/' + address : '')}>
              <IoImagesOutline className="menu-item-icon" />
              {t('menu.nft.nfts')}
            </Link>
            <Link href={'/nft-offers' + (displayName ? '/' + address : '')}>
              <IoTicketOutline className="menu-item-icon" />
              {t('menu.nft.offers')}
            </Link>
            <Link href="/nft-distribution">
              <IoPeopleOutline className="menu-item-icon" />
              {t('menu.nft.distribution')}
            </Link>
            <Link href="/nft-statistics">
              <IoStatsChartOutline className="menu-item-icon" />
              {t('menu.nft.statistics')}
            </Link>
            <Link href="/services/nft-mint">
              <IoRocketOutline className="menu-item-icon" />
              {t('menu.services.nft-mint')}
            </Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown5"
            title={t('menu.network.blockchain')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/dapps">
              <RiPuzzleLine className="menu-item-icon" />
              Dapps
            </Link>
            {xahauNetwork && (
              <Link href="/governance">
                <IoCheckmarkDoneOutline className="menu-item-icon" />
                {t('menu.network.governance')}
              </Link>
            )}
            <Link href="/activations">
              <IoFlashOutline className="menu-item-icon" />
              {t('menu.network.activations')}
            </Link>
            <Link href="/distribution">
              <IoStatsChartOutline className="menu-item-icon" />
              {t('menu.network.distribution', { currency: nativeCurrency })}
            </Link>
            <Link href="/last-ledger-information">
              <IoInformationCircleOutline className="menu-item-icon" />
              {t('menu.network.last-ledger-information')}
            </Link>
            <Link href="/ledger">
              <IoListCircleOutline className="menu-item-icon" />
              {t('menu.network.last-ledger-transactions')}
            </Link>
            <Link href="/whales">
              <IoTrendingUpOutline className="menu-item-icon" />
              {t('menu.network.top-transfers-24h')}
            </Link>

            {/* Hide Verified Domains for XAHAU while they are not ready yet */}
            <Link href="/domains">
              <IoGlobeOutline className="menu-item-icon" />
              {t('menu.network.verified-domains')}
            </Link>
            <Link href="/validators">
              <IoCheckmarkDoneOutline className="menu-item-icon" />
              {t('menu.network.validators')}
            </Link>
            <Link href="/amendments">
              <IoBuildOutline className="menu-item-icon" />
              {t('menu.network.amendments')}
            </Link>
            {!(xahauNetwork && devNet) && (
              <Link href="/nodes">
                <IoGitBranchOutline className="menu-item-icon" />
                {t('menu.network.nodes')}
              </Link>
            )}
            {xahauNetwork && (
              <Link href="/unl-report">
                <IoDocumentAttachOutline className="menu-item-icon" />
                {t('menu.network.unl-report')}
              </Link>
            )}
            <Link href="/genesis">
              <IoKeyOutline className="menu-item-icon" />
              {t('menu.network.genesis')}
            </Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown6"
            title={t('menu.developers.developers')}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/learn/the-bithomp-api">
              <IoCodeSlashOutline className="menu-item-icon" />
              {t('menu.developers.api')}
            </Link>
            <Link href="/learn/image-services">
              <IoImagesOutline className="menu-item-icon" />
              Token/NFT/Address Images
            </Link>
            {network === 'mainnet' && (
              <>
                <a href={'https://test.bithomp.com/create/'}>
                  <IoPersonAddOutline className="menu-item-icon" />
                  {t('menu.developers.account-generation')}
                </a>
                <a href={'https://test.bithomp.com/' + lang + '/faucet'}>
                  <IoFlashOutline className="menu-item-icon" />
                  {t('menu.developers.faucet')}
                </a>
                <a href={'https://test.bithomp.com/tools/'}>
                  <IoBuildOutline className="menu-item-icon" />
                  Bithomp tools
                </a>
              </>
            )}
            {devNet && (
              <>
                <a href={'/create/'}>
                  <IoPersonAddOutline className="menu-item-icon" />
                  {t('menu.developers.account-generation')}
                </a>
                <Link href="/faucet">
                  <IoFlashOutline className="menu-item-icon" />
                  {t('menu.developers.faucet')}
                </Link>
                <a href={'/tools/'}>
                  <IoBuildOutline className="menu-item-icon" />
                  Bithomp tools
                </a>
              </>
            )}
            <a href="https://github.com/Bithomp">
              <IoLogoGithub className="menu-item-icon" />
              Github
            </a>
            <Link href="/eaas">
              <IoRocketOutline className="menu-item-icon" />
              {t('menu.business.eaas')}
            </Link>
            <Link href="/build-unl">
              <IoShieldCheckmarkOutline className="menu-item-icon" />
              {t('menu.business.build-unl')}
            </Link>
          </MenuDropDown>
        </div>

        {width ? (
          <div className={'header-search-inline ' + (hideSearchInHeader ? 'hide-search-inline' : '')}>
            <SearchBlock
              compact={true}
              //searchPlaceholderText="Search..."
              tab="account"
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
                    <img
                      alt="avatar"
                      src={avatarServer + address + '?hashIconZoom=12'}
                      width="24"
                      height="24"
                      className="menu-avatar"
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
                <Link href={'/account/' + address}>
                  <IoPersonOutline className="menu-item-icon" />
                  {t('signin.actions.view')}
                </Link>
                <Link href={'/account/' + address + '/transactions'}>
                  <IoListOutline className="menu-item-icon" />
                  {t('signin.actions.my-transactions')}
                </Link>
                <Link href="/services/send">
                  <IoPaperPlaneOutline className="menu-item-icon" />
                  Send payment
                </Link>
                <Link href="/services/account-settings/">
                  <IoSettingsOutline className="menu-item-icon" />
                  Account settings
                </Link>
                {!!wallets.length && (
                  <>
                    <hr className="hr" />
                    <div className="wallets-title center">Connected wallets</div>
                    {orderedWallets.map((walletItem) => {
                      const isActiveWallet = walletItem.id === activeWalletId

                      return (
                        <div key={walletItem.id} className={'wallet-row' + (isActiveWallet ? ' active' : '')}>
                          <span
                            className={
                              'link wallet-switch' +
                              (isActiveWallet && router.asPath.startsWith('/account/' + walletItem.address)
                                ? ' wallet-switch-active'
                                : '')
                            }
                            onClick={
                              isActiveWallet
                                ? router.asPath.startsWith('/account/' + walletItem.address)
                                  ? undefined
                                  : router.pathname.startsWith('/services')
                                    ? undefined
                                    : () => router.push('/account/' + walletItem.address)
                                : () => setActiveWallet(walletItem.id)
                            }
                          >
                            <img
                              alt="avatar"
                              src={avatarServer + walletItem.address + '?hashIconZoom=12'}
                              width="20"
                              height="20"
                              className="wallet-row-avatar"
                            />
                            <span className="wallet-switch-label">{walletDisplayName(walletItem)}</span>
                            <span className={'wallet-active-indicator' + (isActiveWallet ? ' is-active' : '')}>
                              {isActiveWallet && (
                                <>
                                  ●<span className="wallet-active-tooltip">Active</span>
                                </>
                              )}
                            </span>
                          </span>
                          <span className="wallet-provider-icon">
                            <WalletProviderIcon provider={walletItem.provider} walletItem={walletItem} />
                          </span>
                          <span className="link wallet-disconnect" onClick={() => signOut(walletItem.id)}>
                            <IoLogOutOutline aria-label="Disconnect" />
                            <span className="wallet-disconnect-tooltip">Disconnect</span>
                          </span>
                        </div>
                      )
                    })}
                  </>
                )}
                {!username && (
                  <>
                    <hr className="hr" />
                    <Link href={'/username?address=' + address}>
                      <IoAtOutline className="menu-item-icon" />
                      {t('menu.services.username')}
                    </Link>
                  </>
                )}
                <hr className="hr" />
                <span
                  onClick={() => {
                    setSignRequest(
                      router.pathname.startsWith('/account')
                        ? { redirect: 'account', connectAnotherWallet: true }
                        : { connectAnotherWallet: true }
                    )
                  }}
                  className="link"
                >
                  <IoWalletOutline className="menu-item-icon" />
                  Connect another wallet
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
                <Link href="/admin">
                  <IoPersonOutline className="menu-item-icon" />
                  {displayName ? proName : 'Profile'}
                </Link>
                <Link href="/admin/watchlist">
                  <IoStarOutline className="menu-item-icon" />
                  Watchlist
                </Link>
                <Link href="/admin/subscriptions">
                  <IoCardOutline className="menu-item-icon" />
                  Subscriptions
                </Link>
                <Link href="/admin/referrals">
                  <IoPeopleOutline className="menu-item-icon" />
                  Referrals
                </Link>
                <Link href="/admin/pro">
                  <IoLocationOutline className="menu-item-icon" />
                  My addresses
                </Link>
                <Link href="/admin/api">
                  <IoKeyOutline className="menu-item-icon" />
                  API management
                </Link>
                <span onClick={signOutPro} className="link">
                  <IoLogOutOutline className="menu-item-icon" />
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
          openEmailLogin={openEmailLogin}
        />
      )}
    </div>
  )
}
