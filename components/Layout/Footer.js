import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { devNet, useLocalStorage } from '../../utils'

import SocialIcons from "./SocialIcons"
import LogoAnimated from './LogoAnimated'

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
          <span className="footer-menu-header">{t("menu.personal.personal")}</span>
          <Link href="/username">{t("menu.usernames")}</Link>
          <a href="/explorer/submit.html">{t("menu.project-registartion")}</a>
          {!devNet && <Link href="/alerts">{t("menu.price-alerts")}</Link>}
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.developers.developers")}</span>
          {devNet &&
            <>
              <a href={"/create/"}>{t("menu.developers.account-generation")}</a>
              <a href={"/faucet/"}>{t("menu.developers.faucet")}</a>
              <a href={"/tools/"}>Bithomp tools</a>
            </>
          }
          <a href="https://docs.bithomp.com">{t("menu.developers.api")}</a>
          <Link href="/developer">{t("menu.developers.api-key-request")}</Link>
          <a href="https://github.com/Bithomp">Github</a>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.networks")}</span>
          {devNet && <a href="https://bithomp.com">Mainnet</a>}
          {devNet !== 'testnet' && <a href="https://test.bithomp.com">Testnet</a>}
          {devNet !== 'devnet' && <a href="https://dev.bithomp.com">Devnet</a>}
          {devNet !== 'beta' && <a href="https://beta.bithomp.com">Betanet (Hooks v3)</a>}
          {devNet !== 'amm' && <a href="https://amm.bithomp.com">AMM</a>}
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.legal")}</span>
          <Link href="/disclaimer">{t("menu.disclaimer")}</Link>
          <Link href="/privacy-policy">{t("menu.privacy-policy")}</Link>
          <Link href="/terms-and-conditions">{t("menu.terms-and-conditions")}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <Link href="/advertise">{t("menu.business.advertise")}</Link>
          <a href="https://xrplmerch.com/product-category/bithomp/?wpam_id=22" target="_blank" rel="noreferrer">{t("menu.merch")}</a>
          <Link href="/customer-support">{t("menu.customer-support")}</Link>
          <Link href="/press">{t("menu.press")}</Link>
          <Link href="/donate">{t("menu.donate")} <span className="red">❤</span></Link>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.community.title")}</span>
          <a href="https://www.trsryxrpl.com/course/tools-and-resources-for-xrpl-holders/" target="_blank" rel="noreferrer">{t("menu.community.treasury")}</a>
          <a href="https://xumm.app" target="_blank" rel="noreferrer">{t("menu.community.xumm")}</a>
          <a href="https://foundation.xrpl.org" target="_blank" rel="noreferrer">{t("menu.community.xrplf")}</a>
          <a href="https://xrpl.org" target="_blank" rel="noreferrer">{t("menu.community.xrpl")}</a>
          <a href="https://www.xrpchat.com" target="_blank" rel="noreferrer">{t("menu.community.xrpchat")}</a>
        </div>

        {!devNet && <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.sponsored.title")}</span>
          <a href="/go/buy-xrp" target="_blank" rel="noreferrer">{t("menu.sponsored.buy")}</a>
          <a href="/go/earn-on-xrp" target="_blank" rel="noreferrer">{t("menu.sponsored.earn")}</a>
          <a href="/go/playxrp" target="_blank" rel="noreferrer">{t("menu.sponsored.play")}</a>
        </div>}

      </div>

      <div className="footer-brand">
        <div className="footer-logo"><LogoAnimated /></div>
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
          <Link href="/privacy-policy" className="hover-oposite">{t("footer.cookie.read-more")}</Link>.
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
