import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRef } from 'react'
import dynamic from 'next/dynamic'

import { devNet, nativeCurrency, network, xahauNetwork } from '../../utils'

const CookieMessage = dynamic(() => import('./CookieMessage'), { ssr: false })
const SocialIcons = dynamic(() => import('./SocialIcons'), { ssr: false })
const LogoAnimated = dynamic(() => import('./LogoAnimated'), { ssr: false })
const ButtonScrollTop = dynamic(() => import('./ButtonScrollTop'), { ssr: false })

export default function Footer({ countryCode }) {
  const { t, i18n } = useTranslation()
  const footerRef = useRef()

  const lang = i18n.language === 'default' ? 'en' : i18n.language

  return (
    <footer ref={footerRef}>
      <CookieMessage />
      <ButtonScrollTop footer={footerRef} />

      <div className="footer-menu">
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.services.services')}</span>
          <Link href="/username">{t('menu.usernames')}</Link>
          <Link href="/learn/xrp-xah-taxes">{t('menu.services.tax-reports')}</Link>
          <Link href="/submit-account-information">{t('menu.project-registration')}</Link>
          {!devNet && <Link href="/alerts">{t('menu.price-alerts', { nativeCurrency })}</Link>}
          <a href={'/submit/'}>{t('menu.submit-offline-tx')}</a>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.developers.developers')}</span>
          <Link href="/learn/the-bithomp-api">{t('menu.developers.api')}</Link>
          {network === 'mainnet' && (
            <>
              <a href={'https://test.bithomp.com/create/'}>{t('menu.developers.account-generation')}</a>
              <a href={'https://test.bithomp.com/' + lang + '/faucet'}>{t('menu.developers.faucet')}</a>
              <a href={'https://test.bithomp.com/tools/'}>Bithomp tools</a>
            </>
          )}
          {devNet && (
            <>
              <a href={'/create/'}>{t('menu.developers.account-generation')}</a>
              <Link href="/faucet">{t('menu.developers.faucet')}</Link>
              <a href={'/tools/'}>Bithomp tools</a>
            </>
          )}
          <a href="https://github.com/Bithomp">Github</a>
          <Link href="/eaas">{t('menu.business.eaas')}</Link>
          <Link href="/build-unl">{t('menu.business.build-unl')}</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <Link href="/learn/the-bithomp-explorer-advantages">Why Our Explorer</Link>
          <Link href="/about-us">{t('menu.company.about-us')}</Link>
          <Link href="/advertise">{t('menu.business.advertise')}</Link>
          <Link href="/customer-support">{t('menu.customer-support')}</Link>
          <Link href="/press">{t('menu.press')}</Link>
          <Link href="/jobs">Join our team</Link>
          <Link href="/donate">{t('menu.donate')}</Link>
          <Link href="/the-chain-of-blocks-summit">Chain Of Blocks Summit 🇲🇹</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.legal')}</span>
          <Link href="/disclaimer">{t('menu.disclaimer')}</Link>
          <Link href="/privacy-policy">{t('menu.privacy-policy')}</Link>
          <Link href="/terms-and-conditions">{t('menu.terms-and-conditions')}</Link>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.learn-more.title')}</span>
          {!xahauNetwork && <Link href="/learn/xrpl-article">XRP, XRPL, Ripple</Link>}
          <Link href="/learn/verified-domain">Verified domains</Link>
          {!xahauNetwork && <Link href="/learn/ripple-usd">Ripple USD</Link>}
          <Link href="/learn/nft-minting">How to Mint NFT</Link>
          <Link href="/learn">See our learn page</Link>
        </div>

        {!xahauNetwork && (
          <div className="footer-menu-column">
            <span className="footer-menu-header">{t('menu.sponsored.title')}</span>
            <a href="https://bithomp.com/go/fm-buy" target="_blank" rel="noreferrer">
              {t('menu.sponsored.buy')}
            </a>
            <a href="https://bithomp.com/go/fm-earn" target="_blank" rel="noreferrer">
              {t('menu.sponsored.earn')}
            </a>
            <a
              href={countryCode === 'US' ? 'https://bithomp.com/go/fm-play-us' : 'https://bithomp.com/go/fm-play'}
              target="_blank"
              rel="noreferrer"
            >
              {countryCode === 'US' ? 'Join Drake on Stake' : 'Join Stake'}
            </a>
          </div>
        )}
      </div>

      <div className="footer-brand">
        <div className="footer-logo">
          <LogoAnimated />
        </div>
        <div className="footer-brand-text" suppressHydrationWarning>
          Copyright © {new Date().getFullYear()} <b>Bithomp AB</b>
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
    </footer>
  )
}
