import { useTranslation } from 'react-i18next';

import logo from "../assets/images/logo.svg";
import Switch from "./Switch";

function Header({ theme, switchTheme }) {
  const { t } = useTranslation();

  return (
    <header>
      <img src={logo} className="header-logo" alt="logo" />
      <div className="header-menu-left">
        <a href="/explorer/">{t("menu.explorer")}</a>
        <div className="menu-dropdown">
          <button className="menu-dropdown-button">{t("menu.services")}</button>
          <div className="menu-dropdown-content">
            <a href="/username">{t("menu.usernames")}</a>
            <a href="/alerts">{t("menu.price-alerts")}</a>
            <a href="https://docs.bithomp.com">{t("menu.api")}</a>
          </div>
        </div>
        <div className="menu-dropdown">
          <button className="menu-dropdown-button">{t("menu.tools")}</button>
          <div className="menu-dropdown-content">
            <a href="/submit/">{t("menu.submit-offline-transaction")}</a>
            <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
            <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
            <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
            <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
          </div>
        </div>
        <a href="/statistics">XRPL</a>
      </div>
      <div className="header-menu-right">
        <a href="/explorer/?hwlogin">{t("menu.sign-in")}</a>
        <Switch theme={theme} switchTheme={switchTheme} />
      </div>
      <div className="header-under"></div>
    </header>
  );
}

export default Header;
