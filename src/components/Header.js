import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import logo from "../assets/images/logo-animated.svg";
import Switch from "./Switch";

export default function Header({ theme, switchTheme }) {
  const { t } = useTranslation();

  const mobileMenuToggle = e => {
    // remove scrollbar when menu is open
    const isMenuOpen = e.target.checked;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
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
            <a href="/username">{t("menu.usernames")}</a>
            <a href="/alerts">{t("menu.price-alerts")}</a>
            <a href="https://docs.bithomp.com">{t("menu.api")}</a>
          </div>
        </div>
        <div className="menu-dropdown">
          <div className="menu-dropdown-button">{t("menu.tools")}</div>
          <div className="menu-dropdown-content">
            <a href="/submit/">{t("menu.submit-offline-transaction")}</a>
            <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
            <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
            <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
            <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
          </div>
        </div>
        <div className="menu-dropdown">
          <div className="menu-dropdown-button">XRPL</div>
          <div className="menu-dropdown-content">
            <Link to="/last-ledger-information">{t("menu.last-ledger-information")}</Link>
            <a href="/genesis">{t("menu.genesis-accounts")}</a>
          </div>
        </div>
      </div>
      <div className="header-menu-right">
        <a href="/explorer/?hwlogin">{t("menu.sign-in")}</a>
        <Switch theme={theme} switchTheme={switchTheme} />
      </div>

      <div className="header-burger">
        <input type="checkbox" id="header-burger" onClick={mobileMenuToggle} />
        <label htmlFor="header-burger" className="header-burger-elements">
          <div></div>
          <div></div>
          <div></div>
        </label>
        <div className="mobile-menu">
          <a href="/explorer/" className="mobile-menu-item">{t("menu.explorer")}</a>
          <div className="mobile-menu-directory"><span>{t("menu.services")}</span></div>
          <a href="/username" className="mobile-menu-item">{t("menu.usernames")}</a>
          <a href="/alerts" className="mobile-menu-item">{t("menu.price-alerts")}</a>
          <a href="https://docs.bithomp.com" className="mobile-menu-item">{t("menu.api")}</a>
          <div className="mobile-menu-directory"><span>XRPL</span></div>
          <Link to="/last-ledger-information" className="mobile-menu-item">{t("menu.last-ledger-information")}</Link>
          <a href="/genesis" className="mobile-menu-item">{t("menu.genesis-accounts")}</a>
          <div className="mobile-menu-directory"></div>
          <a href="/explorer/?hwlogin" className="mobile-menu-item">{t("menu.sign-in")}</a>
        </div>
      </div>
    </header>
  );
};
