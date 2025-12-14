import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { devNet, xahauNetwork, nativeCurrency, avatarServer } from '../../../utils'

import Image from 'next/image'

import { IoIosRocket } from 'react-icons/io'
import { FaUserLarge } from 'react-icons/fa6'
import { GrMoney } from 'react-icons/gr'
import { IoStatsChart, IoWallet } from 'react-icons/io5'
import { FaSignOutAlt, FaEye, FaUserCheck } from 'react-icons/fa'
import { FiLink } from 'react-icons/fi'

const handleClick = (e) => {
  if (e.target.getAttribute('data-expanded') !== null) {
    e.target.setAttribute('data-expanded', e.target.getAttribute('data-expanded') === 'true' ? 'false' : 'true')
  }
}

export default function MobileMenu({
  mobileMenuToggle,
  displayName,
  address,
  username,
  setSignRequest,
  proName,
  signOutPro,
  signOut,
  account,
  countryCode
}) {
  const { t } = useTranslation('common')

  const iconStyle = { marginRight: '6px', fontSize: '1.1em' }

  return (
    <div className="mobile-menu" onClick={handleClick}>
      <div className="mobile-menu-wrap">
        <br />
        <div className="mobile-menu-directory" data-expanded={displayName ? 'false' : 'true'}>
          {displayName ? (
            <>
              <Image alt="avatar" src={avatarServer + address} width="18" height="18" style={{ marginRight: '5px' }} />
              {displayName}
            </>
          ) : (
            <>
              <IoWallet style={{ marginBottom: '-2px' }} /> {t('table.address')}
            </>
          )}
        </div>
        <div className="mobile-menu__submenu">
          {displayName ? (
            <>
              <Link href={'/account/' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('signin.actions.view')}
              </Link>
              <Link
                href={'/account/' + address + '/transactions'}
                className="mobile-menu-item"
                onClick={mobileMenuToggle}
              >
                {t('signin.actions.my-transactions')}
              </Link>
              <Link href="/services/send" className="mobile-menu-item" onClick={mobileMenuToggle}>
                Send payment
              </Link>
              <Link href="/services/account-settings/" className="mobile-menu-item" onClick={mobileMenuToggle}>
                My account settings
              </Link>
              {!username && (
                <Link href={'/username?address=' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                  {t('menu.usernames')}
                </Link>
              )}
              <span onClick={signOut} className="mobile-menu-item link">
                {t('signin.signout')}
                <span style={{ display: 'inline-block', width: 10 }}></span>
                {account?.wallet === 'xaman' && (
                  <Image
                    src="/images/wallets/xaman.png"
                    className="wallet-logo xaman-logo"
                    alt="Xaman"
                    height={24}
                    width={24}
                  />
                )}
              </span>
            </>
          ) : (
            <span onClick={setSignRequest} className="link mobile-menu-item">
              <FiLink style={{ marginRight: 4, height: 18, width: 18, marginLeft: -1 }} /> {t('signin.connect')}
            </span>
          )}
        </div>

        <div className="mobile-menu-directory" data-expanded={proName ? 'false' : 'true'}>
          <IoIosRocket /> Bithomp Pro
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/admin" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <FaUserLarge style={iconStyle} /> {proName || t('signin.signin')}
          </Link>

          {proName && (
            <>
              <Link href="/admin/watchlist" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <FaEye style={{ ...iconStyle, marginTop: '2px' }} /> Watchlist
              </Link>

              <Link href="/admin/subscriptions" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <GrMoney style={iconStyle} /> Subscriptions
              </Link>

              <Link href="/admin/pro" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <FaUserCheck style={{ ...iconStyle, marginTop: '2px' }} /> My addresses
              </Link>

              <Link href="/admin/api" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoStatsChart style={iconStyle} /> API management
              </Link>

              <span onClick={signOutPro} className="mobile-menu-item">
                <FaSignOutAlt style={{ ...iconStyle, marginTop: '3px' }} /> {t('signin.signout')}
              </span>
            </>
          )}
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.services.services')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/faucet" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.developers.faucet')}
          </Link>
          <Link href="/services/send" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Send Payment
          </Link>
          <Link href="/services/trustline" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Set Trust (Trustline)
          </Link>
          <Link href="/services/check" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Issue Check
          </Link>
          <Link href="/services/escrow" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Create Escrow
          </Link>
          {!xahauNetwork && (
            <Link href="/services/amm/deposit" className="mobile-menu-item" onClick={mobileMenuToggle}>
              AMM Services
            </Link>
          )}
          <Link href="/services/account-settings/" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Account Settings
          </Link>
          <Link className="mobile-menu-item" onClick={mobileMenuToggle} href="/services/account-delete">
            Account Delete
          </Link>
          <Link href="/services/nft-mint" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.services.nft-mint')}
          </Link>
          {!displayName && (
            <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.usernames')}
            </Link>
          )}
          <Link href="/learn/xrp-xah-taxes" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.services.tax-reports')}
          </Link>

          <Link href="/submit-account-information" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.project-registration')}
          </Link>

          {!devNet && (
            <Link href="/alerts" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.price-alerts', { nativeCurrency })}
            </Link>
          )}
          <a href={'/submit/'} className="mobile-menu-item">
            {t('menu.submit-offline-tx')}
          </a>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.tokens')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/tokens" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.tokens')}
          </Link>
          {!xahauNetwork && (
            <Link href="/mpts" className="mobile-menu-item" onClick={mobileMenuToggle}>
              Multi-Purpose {t('menu.tokens')}
            </Link>
          )}
          <Link
            href={
              '/distribution' +
              (xahauNetwork
                ? '?currencyIssuer=rEvernodee8dJLaFsujS6q1EiXvZYmHXr8&currency=EVR'
                : '?currency=524C555344000000000000000000000000000000&currencyIssuer=rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De')
            }
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            TOP Holders
          </Link>
          <Link href="/services/trustline" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Set Trust (Trustline)
          </Link>
          <Link href="/learn/issue-a-token" className="mobile-menu-item" onClick={mobileMenuToggle}>
            How to Issue a Token
          </Link>
          <Link href="/learn/guide-for-token-issuers" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Guide for Token Issuers
          </Link>
        </div>

        {/* Hide AMM for XAHAU */}
        {!xahauNetwork && (
          <>
            <div className="mobile-menu-directory" data-expanded="false">
              {t('menu.amm.amm')}
            </div>
            <div className="mobile-menu__submenu">
              <Link href="/amms" className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('menu.amm.pools')}
              </Link>
              <Link href="/learn/amm" className="mobile-menu-item" onClick={mobileMenuToggle}>
                What is AMM?
              </Link>
              <Link href="/services/amm/deposit" className="mobile-menu-item" onClick={mobileMenuToggle}>
                AMM Deposit
              </Link>
              <Link href="/services/amm/withdraw" className="mobile-menu-item" onClick={mobileMenuToggle}>
                AMM Withdraw
              </Link>
              <Link href="/services/amm/vote" className="mobile-menu-item" onClick={mobileMenuToggle}>
                AMM Vote
              </Link>
              <Link href="/services/amm/create" className="mobile-menu-item" onClick={mobileMenuToggle}>
                AMM Create
              </Link>
              <Link href="/amm" className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('menu.amm.explorer')}
              </Link>
            </div>
          </>
        )}

        <div className="mobile-menu-directory" data-expanded="false">
          NFT
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/nft-explorer" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.nft.explorer')}
          </Link>
          <Link href="/nft-sales" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.nft.sales')}
          </Link>

          <Link href="/nft-volumes?period=week" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.nft.collections')}
          </Link>
          <Link
            href="/nft-volumes?list=marketplaces&period=week"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t('menu.nft.marketplaces')}
          </Link>
          <Link href="/nft-volumes?list=charts&period=week" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.nft.volumes')}
          </Link>

          {/* Hide NFT-minters for XAHAU while they are not ready yet */}
          {!xahauNetwork && (
            <Link href="/nft-minters" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.nft.minters')}
            </Link>
          )}

          <Link
            href={'/nfts' + (displayName ? '/' + address : '')}
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t('menu.nft.nfts')}
          </Link>
          <Link
            href={'/nft-offers' + (displayName ? '/' + address : '')}
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t('menu.nft.offers')}
          </Link>
          <Link href="/nft-distribution" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.nft.distribution')}
          </Link>
          <Link href="/nft-statistics" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.nft.statistics')}
          </Link>
          <Link href="/services/nft-mint" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.services.nft-mint')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.network.blockchain')}
        </div>
        <div className="mobile-menu__submenu">
          {xahauNetwork && (
            <Link href="/governance" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.network.governance')}
            </Link>
          )}
          <Link href="/activations" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.activations')}
          </Link>
          <Link href="/distribution" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.distribution', { currency: nativeCurrency })}
          </Link>
          <Link href="/last-ledger-information" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.last-ledger-information')}
          </Link>
          <Link href="/ledger" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.last-ledger-transactions')}
          </Link>
          <Link href="/whales" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.top-transfers-24h')}
          </Link>
          <Link href="/domains" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.verified-domains')}
          </Link>

          <Link href="/validators" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.validators')}
          </Link>
          <Link href="/amendments" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.amendments')}
          </Link>
          {!(xahauNetwork && devNet) && (
            <Link href="/nodes" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.network.nodes')}
            </Link>
          )}
          {xahauNetwork && (
            <Link href="/unl-report" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.network.unl-report')}
            </Link>
          )}
          <Link href="/genesis" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.network.genesis')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.developers.developers')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/learn/the-bithomp-api" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.developers.api')}
          </Link>
          <Link href="/learn/image-services" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Token/NFT/Address Images
          </Link>
          {devNet && (
            <>
              <a href={'/create/'} className="mobile-menu-item">
                {t('menu.developers.account-generation')}
              </a>
              <Link href="/faucet" className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('menu.developers.faucet')}
              </Link>
              <a href={'/tools/'} className="mobile-menu-item">
                Bithomp tools
              </a>
              <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('menu.business.eaas')}
              </Link>
              <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('menu.business.build-unl')}
              </Link>
            </>
          )}
          <a href="https://github.com/Bithomp" className="mobile-menu-item">
            Github
          </a>
          <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.business.eaas')}
          </Link>
          <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.business.build-unl')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          Bithomp
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/learn/the-bithomp-explorer-advantages" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Why Our Explorer
          </Link>
          <Link href="/about-us" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.company.about-us')}
          </Link>
          <Link href="/advertise" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.business.advertise')}
          </Link>
          <Link href="/customer-support" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.customer-support')}
          </Link>
          <Link href="/press" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.press')}
          </Link>
          <Link href="/donate" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.donate')}
            <span className="red" style={{ marginLeft: '5px' }}>
              ❤
            </span>
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.legal')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/disclaimer" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.disclaimer')}
          </Link>
          <Link href="/privacy-policy" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.privacy-policy')}
          </Link>
          <Link href="/terms-and-conditions" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.terms-and-conditions')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.learn-more.title')}
        </div>
        <div className="mobile-menu__submenu">
          {!xahauNetwork && (
            <Link href="/learn/xrpl-article" className="mobile-menu-item" onClick={mobileMenuToggle}>
              XRP, XRPL, Ripple
            </Link>
          )}
          <Link href="/learn/verified-domain" className="mobile-menu-item" onClick={mobileMenuToggle}>
            Verified domains
          </Link>
          {!xahauNetwork && (
            <Link href="/learn/ripple-usd" className="mobile-menu-item" onClick={mobileMenuToggle}>
              Ripple USD
            </Link>
          )}
          <Link href="/learn/nft-minting" className="mobile-menu-item" onClick={mobileMenuToggle}>
            How to Mint NFT
          </Link>
          <Link href="/learn" className="mobile-menu-item" onClick={mobileMenuToggle}>
            See our learn page
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          {t('menu.sponsored.title')}
        </div>
        <div className="mobile-menu__submenu">
          <a href="https://bithomp.com/go/fm-buy" target="_blank" rel="noreferrer" className="mobile-menu-item">
            {t('menu.sponsored.buy')}
          </a>
          <a href="https://bithomp.com/go/fm-earn" target="_blank" rel="noreferrer" className="mobile-menu-item">
            {t('menu.sponsored.earn')}
          </a>
          <a
            href={countryCode === 'US' ? 'https://bithomp.com/go/fm-play-us' : 'https://bithomp.com/go/fm-play'}
            target="_blank"
            rel="noreferrer"
            className="mobile-menu-item"
          >
            {countryCode === 'US' ? 'Join Drake on Stake' : 'Join Stake'}
          </a>
        </div>
      </div>
    </div>
  )
}
