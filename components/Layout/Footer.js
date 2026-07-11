import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRef } from 'react'
import dynamic from 'next/dynamic'

import { xahauNetwork, devNet } from '../../utils'
import { GrMoney } from 'react-icons/gr'
import { FaHeart, FaShoppingBag, FaPiggyBank } from 'react-icons/fa'
import { MdLocationOn } from 'react-icons/md'

const CookieMessage = dynamic(() => import('./CookieMessage'), { ssr: false })
const SocialIcons = dynamic(() => import('./SocialIcons'), { ssr: false })
const LogoAnimated = dynamic(() => import('./LogoAnimated'), { ssr: false })
const ButtonScrollTop = dynamic(() => import('./ButtonScrollTop'), { ssr: false })

const FooterLink = (props) => <Link prefetch={false} {...props} />

export default function Footer(
  {
    //countryCode
  }
) {
  const { t } = useTranslation()
  const footerRef = useRef()

  return (
    <footer ref={footerRef}>
      <CookieMessage />
      <ButtonScrollTop footer={footerRef} />

      <div className="footer-menu">
        <div className="footer-menu-column">
          <span className="footer-menu-header">Bithomp</span>
          <FooterLink href="/about-us">{t('menu.company.about-us')}</FooterLink>
          <FooterLink href="/learn/the-bithomp-explorer-advantages">{t('footer.why-our-explorer')}</FooterLink>
          <FooterLink href="/press">{t('menu.press')}</FooterLink>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('footer.get-involved')}</span>
          <FooterLink href="/advertise">{t('menu.business.advertise')}</FooterLink>
          <FooterLink
            href="/admin/referrals"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <span style={{ textDecoration: 'underline' }}>{t('footer.affiliate-program')}</span> <GrMoney />
          </FooterLink>
          <FooterLink href="/customer-support">{t('menu.customer-support')}</FooterLink>
          <FooterLink
            href="/donate"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <span style={{ textDecoration: 'underline' }}>{t('menu.donate')}</span>{' '}
            <FaHeart style={{ color: '#e74c3c' }} />
          </FooterLink>
          <FooterLink
            href="/the-chain-of-blocks-summit"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <span style={{ textDecoration: 'underline' }}>Chain Of Blocks Summit</span> <MdLocationOn />
          </FooterLink>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.learn-more.title')}</span>
          <FooterLink href={xahauNetwork ? '/xahau-wallets' : '/xrp-wallets'}>
            {xahauNetwork ? t('menu.learn-more.xahau-wallets') : t('menu.learn-more.xrp-wallets')}
          </FooterLink>
          {!xahauNetwork && <FooterLink href="/learn/xrpl-article">{t('menu.learn-more.xrpl-ripple')}</FooterLink>}
          <FooterLink href="/learn/verified-domain">{t('menu.learn-more.verified-domains')}</FooterLink>
          {!xahauNetwork && <FooterLink href="/learn/ripple-usd">{t('menu.learn-more.ripple-usd')}</FooterLink>}
          <FooterLink href="/learn/nft-minting">{t('menu.learn-more.nft-minting')}</FooterLink>
          <FooterLink href="/learn">{t('menu.learn-more.learn-page')}</FooterLink>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.legal')}</span>
          <FooterLink href="/disclaimer">{t('menu.disclaimer')}</FooterLink>
          <FooterLink href="/privacy-policy">{t('menu.privacy-policy')}</FooterLink>
          <FooterLink href="/terms-and-conditions">{t('menu.terms-and-conditions')}</FooterLink>
        </div>

        {!xahauNetwork && (
          <div className="footer-menu-column">
            <span className="footer-menu-header">{t('menu.sponsored.title')}</span>
            <a
              href="https://bithomp.com/go/fm-buy"
              target="_blank"
              rel="noreferrer"
              aria-label={t('menu.sponsored.link-label', { title: t('menu.sponsored.buy') })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <span style={{ textDecoration: 'underline' }}>{t('menu.sponsored.buy')}</span> <FaShoppingBag />
            </a>
            <a
              href="https://bithomp.com/go/fm-earn"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <span style={{ textDecoration: 'underline' }}>{t('menu.sponsored.earn')}</span> <FaPiggyBank />
            </a>
            {/*
            <a
              href={countryCode === 'US' ? 'https://bithomp.com/go/fm-play-us' : 'https://bithomp.com/go/fm-play'}
              target="_blank"
              rel="noreferrer"
            >
              {countryCode === 'US' ? 'Join Drake on Stake' : 'Join Stake'}
            </a>
            */}
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
          Kivra 559342-2867
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

      {!xahauNetwork && !devNet && (
        <div style={{ marginLeft: 20, marginBottom: 20 }} className="grey slogan">
          {t('footer.slogan')}
        </div>
      )}
    </footer>
  )
}
