import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import ExpandListItems from './ExpandListItems'

import { FaUserLarge } from "react-icons/fa6";
import { IoIosRocket } from "react-icons/io";

import {
  devNet,
  xahauNetwork,
  ledgerName,
  nativeCurrency,
  ledgerSubName,
} from '../../../utils'

import Switch from "./Switch"
import LangTable from "./LangTable"
import CurrencyTable from "./CurrencyTable"
import NetworkTable from "./NetworkTable"
import LogoAnimated from '../LogoAnimated'
import Image from 'next/image'

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
  direction
}) => {
  if (!direction) direction = 'stick-left'
  const handleMouseEnter = id => {
    // clear timeout for all dropdowns
    for (let key in timeoutIds) {
      clearTimeout(timeoutIds[key])
    }
    //hide other dropdowns, show this one
    setHoverStates(state => {
      //set all in state to false acept the with key id
      let newState = {}
      for (let key in state) {
        newState[key] = key === id
      }
      newState[id] = true
      return newState
    })
  }
  const handleMouseLeave = id => {
    timeoutIds[id] = setTimeout(() => {
      setHoverStates(state => ({ ...state, [id]: false }))
    }, 600)
  }

  const body = <div
    className="menu-dropdown"
    onMouseEnter={() => handleMouseEnter(id)}
    onMouseLeave={() => handleMouseLeave(id)}
  >
    <div
      className={"menu-dropdown-button" + (type === 'top-switch' ? " switch-container contrast" : "")}
      style={style}
      onClick={() => setHoverStates(state => ({ ...state, [id]: !hoverStates[id] }))}
    >
      {title}
    </div>
    {subtitle &&
      <div className='menu-dropdown-subtitle orange'>
        {subtitle?.toLowerCase()}
      </div>
    }
    {hoverStates[id] &&
      <div className={"menu-dropdown-content " + direction}>
        {children}
      </div>
    }
  </div>

  if (type === 'top-switch') {
    return <div className='top-switch'>
      {body}
    </div>
  } else {
    return body
  }
}

export default function Header({
  setSignRequest,
  account,
  signOut,
  selectedCurrency,
  setSelectedCurrency,
}) {
  const { i18n, t } = useTranslation('common')

  const [rendered, setRendered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const [xummUserToken, setXummUserToken] = useState(null)

  const [hoverStates, setHoverStates] = useState({})

  useEffect(() => {
    setRendered(true)
    setXummUserToken(localStorage.getItem('xummUserToken'))
  }, [])

  let address, hashicon, displayName, username, pro, proName;
  if (account && account.address) {
    address = account.address;
    hashicon = account.hashicon;
    username = account.username;
    if (account.username) {
      displayName = <b>{username}</b>;
    } else {
      displayName = address.substr(0, 8) + "..." + address.substr(-8);
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
    proName = emailPart1 + "@" + emailPart2
  }

  const mobileMenuToggle = () => {
    // remove scrollbar when menu is open
    if (!menuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    setMenuOpen(!menuOpen)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
    },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    )
  }

  const handleClick = (event) => {
    if (event.target.getAttribute('aria-expanded') !== null) {
      event.target.setAttribute('aria-expanded', event.target.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    }
  };

  return (
    <div className={menuOpen ? 'mobile-menu-open' : ''}>
      <header>
        <Link href="/"><div className='header-logo'><LogoAnimated /></div></Link>
        <div className="header-menu-left">
          <MenuDropDown
            id="dropdown1"
            title={t("menu.personal.personal")}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <a href={"/explorer/"}>{t("menu.personal.search-on-ledgerName", { ledgerName })}</a>
            <Link href="/username">{t("menu.usernames")}</Link>
            {displayName ?
              <Link href={"/nfts/" + address}>{t("signin.actions.my-nfts")}</Link>
              :
              <span onClick={() => { setSignRequest({ redirect: "nfts" }) }} className="link">{t("signin.actions.my-nfts")}</span>
            }
            {!devNet && <Link href="/alerts">{t("menu.price-alerts", { nativeCurrency })}</Link>}
            {!devNet && <a href={"/submit/"}>{t("menu.submit-offline-tx")}</a>}
          </MenuDropDown>

          <MenuDropDown
            id="dropdown2"
            title={t("menu.business.business")}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/advertise">{t("menu.business.advertise")}</Link>
            <Link href="/username">{t("menu.usernames")}</Link>
            <Link href="/submit-account-information">{t("menu.project-registration")}</Link>
            <a href="https://docs.bithomp.com">{t("menu.developers.api")}</a>
            <Link href="/eaas">{t("menu.business.eaas")}</Link>
            <Link href="/build-unl">{t("menu.business.build-unl")}</Link>
            <Link href="/press">{t("menu.press")}</Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown3"
            title="NFT"
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            <Link href="/nft-explorer">{t("menu.nft.explorer")}</Link>
            {/* Hide NFT menu for XAHAU while they are not ready yet */}
            {!xahauNetwork && <Link href="/nft-volumes">{t("menu.nft.volumes")}</Link>}
            <Link href="/nft-sales">{t("menu.nft.sales")}</Link>
            {/* Hide NFT menu for XAHAU while they are not ready yet */}
            {!xahauNetwork && <Link href="/nft-minters">{t("menu.nft.minters")}</Link>}

            <Link href={"/nfts" + (displayName ? ("/" + address) : "")}>
              {t("menu.nft.nfts")}
            </Link>
            <Link href={"/nft-offers" + (displayName ? ("/" + address) : "")}>
              {t("menu.nft.offers")}
            </Link>
            <Link href="/nft-distribution">{t("menu.nft.distribution")}</Link>
            {/* Hide NFT statistics for XAHAU while they are not ready yet */}
            {!xahauNetwork &&
              <Link href="/nft-statistics">{t("menu.nft.statistics")}</Link>
            }
            {xahauNetwork &&
              <Link href="/services/nft-mint">{t("menu.services.nft-mint")}</Link>
            }
          </MenuDropDown>

          {/* Hide AMM for XAHAU */}
          {!xahauNetwork &&
            <MenuDropDown
              id="dropdown4"
              title={t("menu.amm.amm")}
              setHoverStates={setHoverStates}
              hoverStates={hoverStates}
            >
              <Link href="/amms">{t("menu.amm.pools")}</Link>
              <Link href="/amm">{t("menu.amm.explorer")}</Link>
            </MenuDropDown>
          }

          <MenuDropDown
            id="dropdown5"
            title={t("menu.network.network")}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            {xahauNetwork && <Link href="/governance">{t("menu.network.governance")}</Link>}
            <Link href="/activations">{t("menu.network.activations")}</Link>
            <Link href="/distribution">{t("menu.network.distribution", { nativeCurrency })}</Link>
            <Link href="/last-ledger-information">{t("menu.network.last-ledger-information")}</Link>
            <Link href="/ledger">{t("menu.network.last-ledger-transactions")}</Link>
            {/* Hide Verified Domains for XAHAU while they are not ready yet */}
            {!xahauNetwork &&
              <Link href="/domains">{t("menu.network.verified-domains")}</Link>
            }
            <Link href="/validators">{t("menu.network.validators")}</Link>
            <Link href="/amendments">{t("menu.network.amendments")}</Link>
            {!(xahauNetwork && devNet) &&
              <Link href="/nodes">{t("menu.network.nodes")}</Link>
            }
            {xahauNetwork && <Link href="/unl-report">{t("menu.network.unl-report")}</Link>}
            <Link href="/genesis">{t("menu.network.genesis")}</Link>
          </MenuDropDown>

          <MenuDropDown
            id="dropdown6"
            title={t("menu.developers.developers")}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
          >
            {devNet &&
              <>
                <a href={"/create/"}>{t("menu.developers.account-generation")}</a>
                <a href={"/faucet/"}>{t("menu.developers.faucet")}</a>
                <a href={"/tools/"}>Bithomp tools</a>
              </>
            }
            <a href="https://docs.bithomp.com">{t("menu.developers.api")}</a>
            <Link href="/admin">{t("menu.developers.api-admin")}</Link>
            <a href="https://github.com/Bithomp">Github</a>
            <Link href="/eaas">{t("menu.business.eaas")}</Link>
            <Link href="/build-unl">{t("menu.business.build-unl")}</Link>
          </MenuDropDown>
        </div>

        <div className="header-menu-right">
          {displayName ?
            <MenuDropDown
              id="dropdown7"
              title={
                <>
                  <img src={hashicon} alt="user icon" className="user-icon" />
                  {displayName}
                </>
              }
              setHoverStates={setHoverStates}
              hoverStates={hoverStates}
            >
              <Link href="/admin">{!proName ? 'Bithomp Pro' : proName}</Link>
              <span onClick={copyToClipboard} className="link">
                {isCopied ? t("button.copied") : t("button.copy-my-address")}
              </span>
              <Link href={"/nfts/" + address}>{t("signin.actions.my-nfts")}</Link>
              <Link href={"/nft-offers/" + address}>{t("signin.actions.my-nft-offers")}</Link>

              {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken}>{t("signin.actions.view")}</a>}
              {!username && <Link href={"/username?address=" + address}>{t("menu.usernames")}</Link>}

              {/* Hide Send XRP for XAHAU while they are not ready yet */}
              {!xahauNetwork &&
                <>
                  {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken + "&action=send"}>{t("signin.actions.send")}</a>}
                </>
              }

              <span onClick={signOut} className="link">{t("signin.signout")}</span>
            </MenuDropDown>
            :
            <MenuDropDown
              id="dropdown7"
              title={!proName ? t("signin.signin") : proName}
              setHoverStates={setHoverStates}
              hoverStates={hoverStates}
            >
              <Link href="/admin">Bithomp Pro</Link>
              <span onClick={() => { setSignRequest({ wallet: "xumm" }) }} className="link">
                <Image src="/images/xumm.png" className='xumm-logo' alt="xaman" height={24} width={24} />
                Xaman
              </span>
            </MenuDropDown>
          }

          <MenuDropDown
            id="dropdown8"
            title={ledgerName}
            subtitle={ledgerSubName}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
            type="top-switch"
            style={{ width: '100%' }}
            direction='stick-right'
          >
            <NetworkTable
              close={() => setHoverStates(state => ({ ...state, dropdown8: false }))}
            />
          </MenuDropDown>

          <MenuDropDown
            id="dropdown9"
            title={selectedCurrency?.toUpperCase()}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
            type="top-switch"
            direction='stick-right'
          >
            <CurrencyTable
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              close={() => setHoverStates(state => ({ ...state, dropdown9: false }))}
            />
          </MenuDropDown>

          <MenuDropDown
            id="dropdown10"
            title={i18n.language?.toUpperCase()}
            setHoverStates={setHoverStates}
            hoverStates={hoverStates}
            type="top-switch"
            direction='stick-right'
          >
            <LangTable
              close={() => setHoverStates(state => ({ ...state, dropdown10: false }))}
            />
          </MenuDropDown>

          <Switch />
        </div>
        <div className="header-burger">
          <input type="checkbox" id="header-burger" checked={menuOpen} onChange={mobileMenuToggle} />
          <label htmlFor="header-burger" className="header-burger-elements">
            <div></div><div></div><div></div>
          </label>
        </div>
      </header>
      {rendered &&
        <div className="mobile-menu" onClick={handleClick}>
          {!proName &&
            <>
              <br />
              <div className="mobile-menu-directory"><span>{t("signin.signin")}</span></div>
            </>
          }
          <Link href="/admin" className="mobile-menu-item mobile-menu-item--link" onClick={mobileMenuToggle}>
            {!proName ? <IoIosRocket /> : <FaUserLarge />} {proName || 'Bithomp Pro'}
          </Link>
          {proName && !displayName &&
            <div className="mobile-menu-directory"><span>{t("signin.signin")}</span></div>
          }

          {displayName ?
            <>
              {xummUserToken ?
                <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken} className="mobile-menu-item">
                  <img src={hashicon} alt="user icon" className="user-icon" />
                  {displayName}
                </a>
                :
                <span className="mobile-menu-item">
                  <img src={hashicon} alt="user icon" className="user-icon" />
                  {displayName}
                </span>
              }
              <span onClick={copyToClipboard} className="mobile-menu-item link">
                {isCopied ? t("button.copied") : t("button.copy-my-address")}
              </span>
              <Link href={"/nfts/" + address} className="mobile-menu-item" onClick={mobileMenuToggle}>{t("signin.actions.my-nfts")}</Link>
              <Link href={"/nft-offers/" + address} className="mobile-menu-item" onClick={mobileMenuToggle}>{t("signin.actions.my-nft-offers")}</Link>

              {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken} className="mobile-menu-item">{t("signin.actions.view")}</a>}
              {!username && <Link href={"/username?address=" + address} className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.usernames")}</Link>}

              {/* Hide Send XRP for XAHAU while they are not ready yet */}
              {!xahauNetwork &&
                <>
                  {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken + "&action=send"} className="mobile-menu-item">{t("signin.actions.send")}</a>}
                </>
              }

              <span onClick={signOut} className="mobile-menu-item link">{t("signin.signout")}</span>
            </>
            :
            <span onClick={() => { setSignRequest({ wallet: "xumm" }) }} className="link mobile-menu-item mobile-menu-item--link">
              <Image src="/images/xumm.png" className='xumm-logo' alt="xaman" height={24} width={24} />
              Xaman
            </span>
          }

          <ExpandListItems
            mobileMenuToggle={mobileMenuToggle}
            displayName={displayName}
            address={address}
            setSignRequest={setSignRequest}
          />
        </div>
      }
    </div>
  )
}
