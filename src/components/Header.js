import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

import logo from "../assets/images/logo-animated.svg";
import Switch from "./Switch";

export default function Header({ theme, switchTheme, devNet }) {
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);

  const mobileMenuToggle = e => {
    // remove scrollbar when menu is open
    if (!menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    setMenuOpen(!menuOpen);
  };

  return (
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
            {!devNet && <a href="/alerts">{t("menu.price-alerts")}</a>}
            <a href="https://docs.bithomp.com">{t("menu.api")}</a>
          </div>
        </div>
        <div className="menu-dropdown">
          <div className="menu-dropdown-button">{t("menu.tools")}</div>
          <div className="menu-dropdown-content">
            <a href="/submit/">{t("menu.submit-offline-transaction")}</a>
            {devNet ?
              <>
                <a href="/create/">{t("menu.account-generation")}</a>
                {devNet === 'testnet' ?
                  <a href="https://xrpl.org/xrp-testnet-faucet.html">{t("menu.faucet")}</a> :
                  <a href="/faucet/">{t("menu.faucet")}</a>
                }
                <a href="/tools/">Bithomp tools</a>
              </> :
              <>
                <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
                <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
                <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
                <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
              </>
            }
          </div>
        </div>
        {devNet &&
          <div className="menu-dropdown">
            <div className="menu-dropdown-button">{t("menu.networks")}</div>
            <div className="menu-dropdown-content">
              <a href="https://bithomp.com">Mainnet</a>
              {devNet !== 'testnet' && <a href="https://test.bithomp.com">Testnet</a>}
              {devNet !== 'xls20' && <a href="https://xls20.bithomp.com">XLS-20</a>}
              {devNet !== 'hooks' && <a href="https://hooks.bithomp.com">Hooks</a>}
              {devNet !== 'beta' && <a href="https://beta.bithomp.com">Hooks v2 / beta</a>}
            </div>
          </div>
        }
        <div className="menu-dropdown">
          {devNet ?
            <Link to="/last-ledger-information" className="menu-dropdown-button">XRPL</Link> :
            <>
              <div className="menu-dropdown-button">XRPL</div>
              <div className="menu-dropdown-content">
                <Link to="/last-ledger-information">{t("menu.last-ledger-information")}</Link>
                <a href="/genesis">{t("menu.genesis-accounts")}</a>
              </div>
            </>
          }
        </div>
      </div>
      <div className="header-menu-right">
        <a href="/explorer/?hwlogin">{t("menu.sign-in")}</a>
        <Switch theme={theme} switchTheme={switchTheme} />
      </div>

      <div className="header-burger">
        <input type="checkbox" id="header-burger" checked={menuOpen} onChange={mobileMenuToggle} />
        <label htmlFor="header-burger" className="header-burger-elements">
          <div></div><div></div><div></div>
        </label>
        <div className="mobile-menu">
          <a href="/explorer/" className="mobile-menu-item">{t("menu.explorer")}</a>
          <div className="mobile-menu-directory"><span>{t("menu.services")}</span></div>
          <Link
            to="/username"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.usernames")}
          </Link>
          {!devNet && <a href="/alerts" className="mobile-menu-item">{t("menu.price-alerts")}</a>}
          <a href="https://docs.bithomp.com" className="mobile-menu-item">{t("menu.api")}</a>
          <div className="mobile-menu-directory"><span>XRPL</span></div>
          <Link
            to="/last-ledger-information"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.last-ledger-information")}
          </Link>
          {!devNet && <a href="/genesis" className="mobile-menu-item">{t("menu.genesis-accounts")}</a>}
          {devNet &&
            <>
              <div className="mobile-menu-directory"><span>{t("menu.networks")}</span></div>
              <a href="https://bithomp.com" className="mobile-menu-item">Mainnet</a>
              {devNet !== 'testnet' && <a href="https://test.bithomp.com" className="mobile-menu-item">Testnet</a>}
              {devNet !== 'xls20' && <a href="https://xls20.bithomp.com" className="mobile-menu-item">XLS-20</a>}
              {devNet !== 'hooks' && <a href="https://hooks.bithomp.com" className="mobile-menu-item">Hooks</a>}
              {devNet !== 'beta' && <a href="https://beta.bithomp.com" className="mobile-menu-item">Hooks v2 / beta</a>}
            </>
          }
          <div className="mobile-menu-directory"></div>
          <a href="/explorer/?hwlogin" className="mobile-menu-item">{t("menu.sign-in")}</a>
        </div>
      </div>
    </header>
  );
};
