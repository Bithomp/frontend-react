import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import useLocalStorage from 'use-local-storage';

import { devNet } from '../utils';

import logo from "../assets/images/logo-animated.svg";

import LanguageSelect from "./LanguageSelect";
import SocialIcons from "./SocialIcons";

export default function Footer() {
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
          {!devNet && <Link to="/alerts">{t("menu.price-alerts")}</Link>}
          <a href="https://docs.bithomp.com">{t("menu.api")}</a>
        </div>

        {devNet &&
          <div className="footer-menu-column">
            <span className="footer-menu-header">{t("menu.tools")}</span>
            <a href="/create/">{t("menu.account-generation")}</a>
            <a href="/faucet/">{t("menu.faucet")}</a>
          </div>
        }
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.networks")}</span>
          {devNet && <a href="https://bithomp.com">Mainnet</a>}
          {devNet !== 'testnet' && <a href="https://test.bithomp.com">Testnet</a>}
          {devNet !== 'devnet' && <a href="https://dev.bithomp.com">Devnet</a>}
          {devNet !== 'beta' && <a href="https://beta.bithomp.com">Betanet (Hooks v2)</a>}
          {devNet !== 'xls20' && <a href="https://xls20.bithomp.com">XLS-20</a>}
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
          <Link to="/press">{t("menu.press")}</Link>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.community.title")}</span>
          <a href="https://xumm.app" target="_blank" rel="noreferrer">{t("menu.community.xumm")}</a>
          <a href="https://foundation.xrpl.org" target="_blank" rel="noreferrer">{t("menu.community.xrplf")}</a>
          <a href="https://xrpl.org" target="_blank" rel="noreferrer">{t("menu.community.xrpl")}</a>
          <a href="https://www.xrpchat.com" target="_blank" rel="noreferrer">{t("menu.community.xrpchat")}</a>
        </div>

        {!devNet && <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.sponsored.title")}</span>
          <a href="/go/earn-on-xrp" target="_blank" rel="noreferrer">{t("menu.sponsored.earn")}</a>
          <a href="/go/playxrp" target="_blank" rel="noreferrer">{t("menu.sponsored.play")}</a>
        </div>}

        <div className="footer-language-select">
          <LanguageSelect />
        </div>
      </div>

      <div className="footer-brand">
        <img src={logo} className="footer-logo" alt="logo" />
        <div className="footer-brand-text">
          Copyright © {year} Bithomp AB<br />
          Kivra: 559342-2867<br />
          106 31, Stockholm
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
