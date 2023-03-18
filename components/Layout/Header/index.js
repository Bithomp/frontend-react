import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'

import { devNet, useLocalStorage } from '../../../utils'

import Switch from "./Switch"
import LogoAnimated from '../LogoAnimated'

export default function Header({ setSignRequest, account, signOut }) {
  const { t } = useTranslation('common')

  const [rendered, setRendered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [xummUserToken] = useLocalStorage('xummUserToken', null);

  useEffect(() => {
    setRendered(true)
  }, [])

  let address, hashicon, displayName, username;
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

  const mobileMenuToggle = () => {
    // remove scrollbar when menu is open
    if (rendered) {
      if (!menuOpen) {
        document.getElementsByClassName("mobile-menu")[0].style.transform = "translateX(0)";
        document.body.style.overflow = "hidden";
        document.getElementsByClassName("theme-switch")[0].style.display = "block";
      } else {
        document.getElementsByClassName("mobile-menu")[0].style.transform = "translateX(100%)";
        document.body.style.overflow = "auto";
        document.getElementsByClassName("theme-switch")[0].style.display = "none";
      }
      setMenuOpen(!menuOpen);
    }
  };

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
    );
  }

  return (
    <>
      <header>
        <Link href="/"><div className='header-logo'><LogoAnimated /></div></Link>
        <div className="header-menu-left">
          <div className="menu-dropdown">
            <div className="menu-dropdown-button">{t("menu.services")}</div>
            <div className="menu-dropdown-content">
              <Link href="/username">{t("menu.usernames")}</Link>
              <a href="/explorer/submit.html">{t("menu.project-registartion")}</a>
              {!devNet && <Link href="/alerts">{t("menu.price-alerts")}</Link>}
              <a href="https://docs.bithomp.com">{t("menu.api")}</a>
            </div>
          </div>
          {devNet &&
            <div className="menu-dropdown">
              <div className="menu-dropdown-button">{t("menu.tools")}</div>
              <div className="menu-dropdown-content">
                <Link href="/create/">{t("menu.account-generation")}</Link>
                <Link href="/faucet/">{t("menu.faucet")}</Link>
              </div>
            </div>
          }

          <div className="menu-dropdown">
            <div className="menu-dropdown-button">NFT</div>
            <div className="menu-dropdown-content">
              <Link href="/nft-explorer">{t("menu.nft.explorer")}</Link>
              <Link href="/nft-volumes">{t("menu.nft.volumes")}</Link>
              <Link href="/nft-sales">{t("menu.nft.sales")}</Link>
              <Link href="/nfts">{t("menu.nft.nfts")}</Link>
              <Link href="/nft-offers">{t("menu.nft.offers")}</Link>
              <Link href="/nft-distribution">{t("menu.nft.distribution")}</Link>
              <Link href="/nft-statistics">{t("menu.nft.statistics")}</Link>
            </div>
          </div>

          <div className="menu-dropdown">
            <div className="menu-dropdown-button">XRPL</div>
            <div className="menu-dropdown-content">
              <Link href="/last-ledger-information">{t("menu.last-ledger-information")}</Link>
              <Link href="/ledger">{t("menu.last-ledger-transactions")}</Link>
              <Link href="/validators">{t("menu.validators")}</Link>
              <Link href="/amendments">{t("menu.amendments")}</Link>
              {!devNet && <Link href="/genesis">{t("menu.genesis")}</Link>}
            </div>
          </div>

          <div className="menu-dropdown">
            <div className="menu-dropdown-button">{t("menu.networks")}</div>
            <div className="menu-dropdown-content">
              {devNet && <a href="https://bithomp.com">Mainnet</a>}
              {devNet !== 'testnet' && <a href="https://test.bithomp.com">Testnet</a>}
              {devNet !== 'devnet' && <a href="https://dev.bithomp.com">Devnet</a>}
              {devNet !== 'beta' && <a href="https://beta.bithomp.com">Betanet (Hooks v2)</a>}
              {devNet !== 'amm' && <a href="https://amm.bithomp.com">AMM</a>}
            </div>
          </div>
        </div>
        <div className="header-menu-right">
          {displayName ?
            <div className="menu-dropdown">
              <div className="menu-dropdown-button">
                <img src={hashicon} alt="user icon" className="user-icon" />
                {displayName}
              </div>
              <div className="menu-dropdown-content">
                <span onClick={copyToClipboard} className="link">
                  {isCopied ? t("button.copied") : t("button.copy-my-address")}
                </span>
                <Link href={"/nfts/" + address}>{t("signin.actions.my-nfts")}</Link>
                <Link href={"/nft-offers/" + address}>{t("signin.actions.my-nft-offers")}</Link>
                {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken}>{t("signin.actions.view")}</a>}
                {!username && <Link href={"/username?address=" + address}>{t("menu.usernames")}</Link>}
                {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken + "&action=send"}>{t("signin.actions.send")}</a>}
                <span onClick={signOut} className="link">{t("signin.signout")}</span>
              </div>
            </div> :
            <span onClick={() => { setSignRequest(true) }} className="header-signin-link link">{t("signin.signin")}</span>
          }
          <Switch />
        </div>
        <div className="header-burger">
          <input type="checkbox" id="header-burger" checked={menuOpen} onChange={mobileMenuToggle} />
          <label htmlFor="header-burger" className="header-burger-elements">
            <div></div><div></div><div></div>
          </label>
        </div>
      </header>
      <div className="mobile-menu">
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
            {xummUserToken && <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken + "&action=send"} className="mobile-menu-item">{t("signin.actions.send")}</a>}
            <span onClick={signOut} className="mobile-menu-item link">{t("signin.signout")}</span>
          </>
          :
          <span onClick={() => { setSignRequest(true) }} className="mobile-menu-item link">{t("signin.signin")}</span>
        }

        <div className="mobile-menu-directory"><span>{t("menu.services")}</span></div>
        {!displayName &&
          <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.usernames")}</Link>
        }
        <a href="/explorer/submit.html" className="mobile-menu-item">{t("menu.project-registartion")}</a>
        {!devNet &&
          <Link href="/alerts" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t("menu.price-alerts")}
          </Link>
        }
        <Link href="https://docs.bithomp.com" className="mobile-menu-item">{t("menu.api")}</Link>
        <div className="mobile-menu-directory"><span>NFT</span></div>
        <Link href="/nft-explorer" className="mobile-menu-item" onClick={mobileMenuToggle}> {t("menu.nft.explorer")}</Link>
        <Link href="/nft-volumes" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.nft.volumes")}</Link>
        <Link href="/nft-sales" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.nft.sales")}</Link>
        <Link href="/nfts" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.nft.nfts")}</Link>
        <Link
          href="/nft-offers"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}>
          {t("menu.nft.offers")}
        </Link>
        <Link
          href="/nft-distribution"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft.distribution")}
        </Link>
        <Link
          href="/nft-statistics"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft.statistics")}
        </Link>

        <div className="mobile-menu-directory"><span>XRPL</span></div>
        <Link
          href="/last-ledger-information"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.last-ledger-information")}
        </Link>
        <Link
          href="/ledger"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.last-ledger-transactions")}
        </Link>
        <Link
          href="/validators"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.validators")}
        </Link>
        <Link
          href="/amendments"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.amendments")}
        </Link>
        {!devNet &&
          <Link href="/genesis" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t("menu.genesis")}
          </Link>
        }
        {devNet &&
          <>
            <div className="mobile-menu-directory"><span>{t("menu.tools")}</span></div>
            <Link href="/create/" className="mobile-menu-item">{t("menu.account-generation")}</Link>
            <Link href="/faucet/" className="mobile-menu-item">{t("menu.faucet")}</Link>
          </>
        }
      </div>
    </>
  );
};
