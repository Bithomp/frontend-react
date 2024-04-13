import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'

import {
  devNet,
  useLocalStorage,
  ledgerName,
  nativeCurrency,
  xahauNetwork,
  network
} from '../../utils'

import SocialIcons from "./SocialIcons"
import LogoAnimated from './LogoAnimated'
import ButtonScrollTop from './ButtonScrollTop'
import { useRef } from 'react'

export default function Footer({ account, setSignRequest }) {
  const year = new Date().getFullYear()
  const { t } = useTranslation()
  const footerRef = useRef()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    // otherwise error on mgrok tunnel when test with mobiles
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showCookie, setShowCokie] = useLocalStorage('showCookie', true);

  const onCookieAccept = () => {
    setShowCokie(false);
  }

  return (
    <footer ref={footerRef}>

      <ButtonScrollTop footer={footerRef} />

      <div className="footer-menu">
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.personal.personal")}</span>
          <a href={"/explorer/"}>{t("menu.personal.search-on-ledgerName", { ledgerName })}</a>
          <Link href="/username">{t("menu.usernames")}</Link>
          {/* Hide MY NFTS for XAHAU while they are not ready yet */}
          {!xahauNetwork &&
            <>
              {account?.address ?
                <Link href={"/nfts/" + account.address} legacyBehavior>{t("signin.actions.my-nfts")}</Link>
                :
                <span onClick={() => { setSignRequest({ redirect: "nfts" }) }} className="link">{t("signin.actions.my-nfts")}</span>
              }
            </>
          }
          {!devNet && <Link href="/alerts">{t("menu.price-alerts", { nativeCurrency })}</Link>}
          {!devNet && <a href={"/submit/"}>{t("menu.submit-offline-tx")}</a>}
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.business.business")}</span>
          <Link href="/advertise">{t("menu.business.advertise")}</Link>
          <Link href="/username">{t("menu.usernames")}</Link>
          <Link href="/submit-account-information">{t("menu.project-registration")}</Link>
          <Link href="/eaas">{t("menu.business.eaas")}</Link>
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
          <Link href="/admin">{t("menu.developers.api-admin")}</Link>
          <a href="https://github.com/Bithomp">Github</a>
          <Link href="/build-unl">{t("menu.business.build-unl")}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.networks")}</span>
          {network !== 'xahau' && <a href="https://xahauexplorer.com">XAHAU Mainnet</a>}
          {network !== 'xahau-testnet' && <a href="https://test.xahauexplorer.com">XAHAU Testnet</a>}
          {network !== 'mainnet' && <a href="https://bithomp.com">XRPL Mainnet</a>}
          {network !== 'testnet' && <a href="https://test.bithomp.com">XRPL Testnet</a>}
          {network !== 'devnet' && <a href="https://dev.bithomp.com">XRPL Devnet</a>}
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.legal")}</span>
          <Link href="/disclaimer">{t("menu.disclaimer")}</Link>
          <Link href="/privacy-policy">{t("menu.privacy-policy")}</Link>
          <Link href="/terms-and-conditions">{t("menu.terms-and-conditions")}</Link>
          <Link href="/terms-api-bots">{t("menu.terms-api-bots")}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <Link href="/about-us">{t("menu.company.about-us")}</Link>
          <Link href="/advertise">{t("menu.business.advertise")}</Link>
          <a href="https://xrplmerch.com/product-category/bithomp/?wpam_id=22" target="_blank" rel="noreferrer">{t("menu.merch")}</a>
          <Link href="/customer-support">{t("menu.customer-support")}</Link>
          <Link href="/press">{t("menu.press")}</Link>
          <Link href="/donate">{t("menu.donate")} <span className="red">❤</span></Link>
        </div>

        {network === 'mainnet' && <div className="footer-menu-column">
          <span className="footer-menu-header">{t("menu.sponsored.title")}</span>
          <a href="/go/fm-buy" target="_blank" rel="noreferrer">{t("menu.sponsored.buy")}</a>
          <a href="/go/fm-earn" target="_blank" rel="noreferrer">{t("menu.sponsored.earn")}</a>
          {/* <a href="/go/fm-play" target="_blank" rel="noreferrer">{t("menu.sponsored.play")}</a> */}
        </div>}

      </div>

      <div className="footer-brand">
        <div className="footer-logo"><LogoAnimated /></div>
        {rendered &&
          <div className="footer-brand-text">
            Copyright © {year} Bithomp AB<br />
            Kivra: 559342-2867<br />
            106 31, Stockholm
          </div>
        }
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
  )
}
