import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

import { devNet, ledgerName, nativeCurrency, xahauNetwork } from '../../utils'

const CookieMessage = dynamic(() => import('./CookieMessage'), { ssr: false })
import SocialIcons from './SocialIcons'
import LogoAnimated from './LogoAnimated'
import ButtonScrollTop from './ButtonScrollTop'

export default function Footer() {
  const year = new Date().getFullYear()
  const { t } = useTranslation()
  const footerRef = useRef()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    // otherwise error on mgrok tunnel when test with mobiles
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <footer ref={footerRef}>
      <ButtonScrollTop footer={footerRef} />

      <div className="footer-menu">
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.services.services')}</span>
          <a href={'/explorer/'}>{t('menu.services.search-on-ledgerName', { ledgerName })}</a>
          <Link href="/username">{t('menu.usernames')}</Link>
          <Link href="/submit-account-information">{t('menu.project-registration')}</Link>
          {!devNet && <Link href="/alerts">{t('menu.price-alerts', { nativeCurrency })}</Link>}
          <a href={'/submit/'}>{t('menu.submit-offline-tx')}</a>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.developers.developers')}</span>
          {devNet && (
            <>
              <a href={'/create/'}>{t('menu.developers.account-generation')}</a>
              <Link href="/faucet">{t('menu.developers.faucet')}</Link>
              <a href={'/tools/'}>Bithomp tools</a>
            </>
          )}
          <a href="https://docs.bithomp.com">{t('menu.developers.api')}</a>
          <Link href="/admin">{t('menu.developers.api-admin')}</Link>
          <a href="https://github.com/Bithomp">Github</a>
          <Link href="/eaas">{t('menu.business.eaas')}</Link>
          <Link href="/build-unl">{t('menu.business.build-unl')}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <Link href="/about-us">{t('menu.company.about-us')}</Link>
          <Link href="/advertise">{t('menu.business.advertise')}</Link>
          <a href="https://xrplmerch.com/product-category/bithomp/?wpam_id=22" target="_blank" rel="noreferrer">
            {t('menu.merch')}
          </a>
          <Link href="/customer-support">{t('menu.customer-support')}</Link>
          <Link href="/press">{t('menu.press')}</Link>
          <Link href="/donate">
            {t('menu.donate')} <span className="red">❤</span>
          </Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.legal')}</span>
          <Link href="/disclaimer">{t('menu.disclaimer')}</Link>
          <Link href="/privacy-policy">{t('menu.privacy-policy')}</Link>
          <Link href="/terms-and-conditions">{t('menu.terms-and-conditions')}</Link>
        </div>
        {!xahauNetwork && (
          <div className="footer-menu-column">
            <span className="footer-menu-header">{t('menu.learn-more.title')}</span>
            <Link href="/xrpl-article">XRP, XRPL, Ripple</Link>
          </div>
        )}
        {!xahauNetwork && (
          <div className="footer-menu-column">
            <span className="footer-menu-header">{t('menu.sponsored.title')}</span>
            <a href="/go/fm-buy" target="_blank" rel="noreferrer">
              {t('menu.sponsored.buy')}
            </a>
            <a href="/go/fm-earn" target="_blank" rel="noreferrer">
              {t('menu.sponsored.earn')}
            </a>
            {/* <a href="/go/fm-play" target="_blank" rel="noreferrer">{t("menu.sponsored.play")}</a> */}
          </div>
        )}
      </div>

      <div className="footer-brand">
        <div className="footer-logo">
          <LogoAnimated />
        </div>
        <div className="footer-brand-text">
          Copyright © {rendered && year} <b>Bithomp AB</b>
          <br />
          Kivra: 559342-2867
          <br />
          106 31, Stockholm, Sweden
          <br />
          <br />
          <b>Ledger Explorer Ltd</b>
          <br />
          Suite 9, Ansuya Estate, Royal street,
          <br />
          Victoria, Mahe, Seychelles
        </div>
        <div className="footer-social">
          <SocialIcons />
        </div>
      </div>
      <CookieMessage />
    </footer>
  )
}
