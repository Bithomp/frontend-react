import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

import { devNet } from '../../utils';

import logo from "../../assets/images/logo-animated.svg";
import Switch from "./Switch";
import './styles.scss';

export default function Header({ theme, switchTheme, setSignInFormOpen, account, signOut }) {
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  let address, hashicon, displayName, username;
  if (account) {
    address = account.address;
    hashicon = account.hashicon;
    username = account.username;
    if (account.username) {
      displayName = <b>{username}</b>;
    } else {
      displayName = address.substr(0, 8) + "..." + address.substr(-8);
    }
  }

  const xummUserToken = localStorage.getItem('xummUserToken');

  const mobileMenuToggle = e => {
    // remove scrollbar when menu is open
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
        <Link to="/">
          <img src={logo} className="header-logo" alt="logo" />
        </Link>
        <div className="header-menu-left">
          <div className="menu-dropdown">
            <a href="/explorer/" className="menu-dropdown-button">{t("menu.explorer")}</a>
          </div>
          <div className="menu-dropdown">
            <div className="menu-dropdown-button">{t("menu.services")}</div>
            <div className="menu-dropdown-content">
              <Link to="/username">{t("menu.usernames")}</Link>
              {!devNet && <Link to="/alerts">{t("menu.price-alerts")}</Link>}
              <a href="https://docs.bithomp.com">{t("menu.api")}</a>
            </div>
          </div>
          {devNet &&
            <div className="menu-dropdown">
              <div className="menu-dropdown-button">{t("menu.tools")}</div>
              <div className="menu-dropdown-content">
                <a href="/create/">{t("menu.account-generation")}</a>
                <a href="/faucet/">{t("menu.faucet")}</a>
              </div>
            </div>
          }

          <div className="menu-dropdown">
            <div className="menu-dropdown-button">NFT</div>
            <div className="menu-dropdown-content">
              <a href="/nfts">{t("menu.nfts")}</a>
              <Link to="/top-nft-sales">{t("menu.nft-sales-top")}</Link>
              <Link to="/latest-nft-sales">{t("menu.nft-sales-latest")}</Link>
              <Link to="/nft-statistics">{t("menu.nft-statistics")}</Link>
            </div>
          </div>

          <div className="menu-dropdown">
            <div className="menu-dropdown-button">XRPL</div>
            <div className="menu-dropdown-content">
              <Link to="/last-ledger-information">{t("menu.last-ledger-information")}</Link>
              <Link to="/ledger">{t("menu.last-ledger-transactions")}</Link>
              <Link to="/validators">{t("menu.validators")}</Link>
              <Link to="/amendments">{t("menu.amendments")}</Link>
              {!devNet && <Link to="/genesis">{t("menu.genesis")}</Link>}
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
              {devNet !== 'xls20' && <a href="https://xls20.bithomp.com">XLS-20</a>}
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
                <button onClick={copyToClipboard}>
                  {isCopied ? t("button.copied") : t("button.copy-my-address")}
                </button>
                <a href={"/nfts/" + address}>{t("signin.actions.my-nfts")}</a>
                <a href={"/nft-offers/" + address}>{t("signin.actions.my-nft-offers")}</a>
                <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken}>{t("signin.actions.view")}</a>
                {!username && <a href={"/username?address=" + address}>{t("menu.usernames")}</a>}
                <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken + "&action=send"}>{t("signin.actions.send")}</a>
                <button onClick={signOut}>{t("signin.signout")}</button>
              </div>
            </div> :
            <span onClick={() => { setSignInFormOpen(true) }} className="header-signin-link link">{t("signin.signin")}</span>
          }
          <Switch theme={theme} switchTheme={switchTheme} />
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
            <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken} className="mobile-menu-item">
              <img src={hashicon} alt="user icon" className="user-icon" />
              {displayName}
            </a>
            <span onClick={copyToClipboard} className="mobile-menu-item link">
              {isCopied ? t("button.copied") : t("button.copy-my-address")}
            </span>
            <a href={"/nfts/" + address} className="mobile-menu-item">{t("signin.actions.my-nfts")}</a>
            <a href={"/nft-offers/" + address} className="mobile-menu-item">{t("signin.actions.my-nft-offers")}</a>
            <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken} className="mobile-menu-item">{t("signin.actions.view")}</a>
            {!username && <a href={"/username?address=" + address} className="mobile-menu-item">{t("menu.usernames")}</a>}
            <a href={"/explorer/" + address + "?hw=xumm&xummtoken=" + xummUserToken + "&action=send"} className="mobile-menu-item">{t("signin.actions.send")}</a>
            <span onClick={signOut} className="mobile-menu-item link">{t("signin.signout")}</span>
          </>
          :
          <>
            <span onClick={() => { setSignInFormOpen(true) }} className="mobile-menu-item link">{t("signin.signin")}</span>
            <a href="/explorer/" className="mobile-menu-item">{t("menu.explorer")}</a>
          </>
        }

        <div className="mobile-menu-directory"><span>{t("menu.services")}</span></div>
        {!displayName &&
          <Link
            to="/username"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.usernames")}
          </Link>
        }

        {!devNet &&
          <Link to="/alerts" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t("menu.price-alerts")}
          </Link>
        }
        <a href="https://docs.bithomp.com" className="mobile-menu-item">
          {t("menu.api")}
        </a>
        <div className="mobile-menu-directory"><span>NFT</span></div>
        <a href="/nfts" className="mobile-menu-item" onClick={mobileMenuToggle}> {t("menu.nfts")}</a>
        <Link
          to="/top-nft-sales"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft-sales-top")}
        </Link>
        <Link
          to="/latest-nft-sales"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft-sales-latest")}
        </Link>
        <Link
          to="/nft-statistics"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft-statistics")}
        </Link>

        <div className="mobile-menu-directory"><span>XRPL</span></div>
        <Link
          to="/last-ledger-information"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.last-ledger-information")}
        </Link>
        <Link
          to="/ledger"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.last-ledger-transactions")}
        </Link>
        <Link
          to="/validators"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.validators")}
        </Link>
        <Link
          to="amendments"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.amendments")}
        </Link>
        {!devNet &&
          <Link to="/genesis" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t("menu.genesis")}
          </Link>
        }
        {devNet &&
          <>
            <div className="mobile-menu-directory"><span>{t("menu.tools")}</span></div>
            <a href="/create/" className="mobile-menu-item">{t("menu.account-generation")}</a>
            <a href="/faucet/" className="mobile-menu-item">{t("menu.faucet")}</a>
          </>
        }
      </div>
    </>
  );
};
