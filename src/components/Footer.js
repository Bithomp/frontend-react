import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import useLocalStorage from 'use-local-storage';

import logo from "../assets/images/logo-animated.svg";

import LanguageSelect from "./LanguageSelect";
import SocialIcons from "./SocialIcons";

export default function Footer({ devNet }) {
  const year = new Date().getFullYear();
  const { t } = useTranslation();

  const [showCookie, setShowCokie] = useLocalStorage('showCookie', true);

  const onCookieAccept = () => {
    setShowCokie(false);
  }

  return (
    <footer>
      <div className="footer-menu">
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.services")}</span>
          <Link to="/username">{t("menu.usernames")}</Link>
          {!devNet && <a href="/alerts">{t("menu.price-alerts")}</a>}
          <a href="https://docs.bithomp.com">{t("menu.api")}</a>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.tools")}</span>
          {devNet ?
            <>
              <a href="/create/">{t("menu.account-generation")}</a>
              {devNet === 'testnet' ?
                <a href="https://xrpl.org/xrp-testnet-faucet.html">{t("menu.faucet")}</a> :
                <a href="/faucet/">{t("menu.faucet")}</a>
              }
            </> :
            <>
              <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
              <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
              <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
              <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
            </>
          }
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.legal")}</span>
          <Link to="/disclaimer">{t("menu.disclaimer")}</Link>
          <Link to="/privacy-policy">{t("menu.privacy-policy")}</Link>
          <Link to="/terms-and-conditions">{t("menu.terms-and-conditions")}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <Link to="/customer-support">{t("menu.customer-support")}</Link>
          {!devNet && <Link to="/media-kit">{t("menu.media-kit")}</Link>}
        </div>
        <div className="footer-language-select">
          <LanguageSelect />
        </div>
      </div>
      <div className="footer-brand">
        <img src={logo} className="footer-logo" alt="logo" />
        <div className="footer-brand-text">
          Copyright © {year} Bithomp AB<br />
          Vasagatan 16, 111 20 Stockholm<br />
          Organization number: 559342-2867
        </div>
        <div className="footer-social">
          <SocialIcons />
        </div>
      </div>
      {showCookie &&
        <div className="footer-cookie center">
          {t("footer.cookie.we-use-cookie")}
          {" "}
          <Link to="/privacy-policy" className="hover-oposite">{t("footer.cookie.read-more")}</Link>.
          <br />
          <input
            type="button"
            value={t("button.accept")}
            className="button-action thin"
            onClick={onCookieAccept}
            style={{ marginTop: "10px" }}
          />
        </div>
      }
    </footer>
  );
};
