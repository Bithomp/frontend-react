import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import logo from "../assets/images/logo.svg";
import twitter from "../assets/images/twitter.svg";
import youtube from "../assets/images/youtube.svg";
import instagram from "../assets/images/instagram.svg";
import reddit from "../assets/images/reddit.svg";
import github from "../assets/images/github.svg";
import LanguageSelect from "./LanguageSelect";

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useTranslation();

  return (
    <footer>
      <div className="footer-menu">
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.services")}</span>
          <a href="/username">{t("menu.usernames")}</a>
          <a href="/alerts">{t("menu.price-alerts")}</a>
          <a href="https://docs.bithomp.com">{t("menu.api")}</a>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.tools")}</span>
          <a href="/submit/">{t("menu.submit-offline-transaction")}</a>
          <a href="https://test.bithomp.com">Bithomp (Testnet)</a>
          <a href="https://xls20.bithomp.com">Bithomp (XLS-20)</a>
          <a href="https://hooks.bithomp.com">Bithomp (Hooks)</a>
          <a href="https://beta.bithomp.com">Bithomp (Hooks v2)</a>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.legal")}</span>
          <Link to="/disclaimer">{t("menu.disclaimer")}</Link>
          <Link to="/privacy-policy">{t("menu.privacy-policy")}</Link>
          <Link to="/terms-and-conditions">{t("menu.terms-and-conditions")}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <a href="/contact">{t("menu.contact")}</a>
          <a href="/midiakit">{t("menu.media-kit")}</a>
        </div>
        <div className="footer-language-select">
          <LanguageSelect/>
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
          <a href="https://twitter.com/bithomp"><img src={twitter} className="footer-social-icon" alt="twitter" /></a>
          <a href="https://www.youtube.com/channel/UCTvrMnG-Tpqi5FN9zO7GcWw"><img src={youtube} className="footer-social-icon" alt="youtube" /></a>
          <a href="https://www.instagram.com/bithomp/"><img src={instagram} className="footer-social-icon" alt="instagram" /></a>
          <a href="https://www.reddit.com/user/bithomp/"><img src={reddit} className="footer-social-icon" alt="reddit" /></a>
          <a href="https://github.com/Bithomp"><img src={github} className="footer-social-icon" alt="github" /></a>
        </div>
      </div>
    </footer>
  );
};
