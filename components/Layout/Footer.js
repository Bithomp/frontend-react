import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRef } from 'react'
import dynamic from 'next/dynamic'

import { xahauNetwork } from '../../utils'
import { GrMoney } from 'react-icons/gr'
import { FaHeart, FaShoppingBag, FaPiggyBank } from 'react-icons/fa'
import { MdLocationOn } from 'react-icons/md'

const CookieMessage = dynamic(() => import('./CookieMessage'), { ssr: false })
const SocialIcons = dynamic(() => import('./SocialIcons'), { ssr: false })
const LogoAnimated = dynamic(() => import('./LogoAnimated'), { ssr: false })
const ButtonScrollTop = dynamic(() => import('./ButtonScrollTop'), { ssr: false })

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
          <Link href="/about-us">{t('menu.company.about-us')}</Link>
          <Link href="/learn/the-bithomp-explorer-advantages">Why Our Explorer</Link>
          <Link href="/press">{t('menu.press')}</Link>
          <Link href="/jobs">Join our team</Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">Get involved</span>
          <Link href="/advertise">{t('menu.business.advertise')}</Link>
          <Link
            href="/admin/referrals"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <span style={{ textDecoration: 'underline' }}>Affiliate program</span> <GrMoney />
          </Link>
          <Link href="/customer-support">{t('menu.customer-support')}</Link>
          <Link href="/donate" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <span style={{ textDecoration: 'underline' }}>{t('menu.donate')}</span>{' '}
            <FaHeart style={{ color: '#e74c3c' }} />
          </Link>
          <Link
            href="/the-chain-of-blocks-summit"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <span style={{ textDecoration: 'underline' }}>Chain Of Blocks Summit</span> <MdLocationOn />
          </Link>
        </div>
        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.learn-more.title')}</span>
          {!xahauNetwork && <Link href="/learn/xrpl-article">XRP, XRPL, Ripple</Link>}
          <Link href="/learn/verified-domain">Verified domains</Link>
          {!xahauNetwork && <Link href="/learn/ripple-usd">Ripple USD</Link>}
          <Link href="/learn/nft-minting">How to Mint NFT</Link>
          <Link href="/learn">See our learn page</Link>
        </div>

        <div className="footer-menu-column">
          <span className="footer-menu-header">{t('menu.legal')}</span>
          <Link href="/disclaimer">{t('menu.disclaimer')}</Link>
          <Link href="/privacy-policy">{t('menu.privacy-policy')}</Link>
          <Link href="/terms-and-conditions">{t('menu.terms-and-conditions')}</Link>
        </div>

        {!xahauNetwork && (
          <div className="footer-menu-column">
            <span className="footer-menu-header">{t('menu.sponsored.title')}</span>
            <a
              href="https://bithomp.com/go/fm-buy"
              target="_blank"
              rel="noreferrer"
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
