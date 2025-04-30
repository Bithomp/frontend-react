import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { devNet, xahauNetwork, nativeCurrency, server, avatarServer } from '../../../utils'

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
  xamanUserToken,
  signOut,
  isCopied,
  copyToClipboard,
  account
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
              <span onClick={copyToClipboard} className="mobile-menu-item link">
                {isCopied ? t('button.copied') : t('button.copy-my-address')}
              </span>
              <Link href={'/account/' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('signin.actions.view')}
              </Link>
              <a href={server + '/explorer/' + address} className="mobile-menu-item">
                {t('signin.actions.my-transactions')}
              </a>
              <Link href={'/nfts/' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('signin.actions.my-nfts')}
              </Link>
              <Link href={'/nft-offers/' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('signin.actions.my-nft-offers')}
              </Link>

              {!username && (
                <Link href={'/username?address=' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                  {t('menu.usernames')}
                </Link>
              )}

              {/* Hide Send XRP for XAHAU while they are not ready yet */}
              {!xahauNetwork && (
                <>
                  {xamanUserToken && (
                    <a
                      href={server + '/explorer/' + address + '?hw=xumm&xummtoken=' + xamanUserToken + '&action=send'}
                      className="mobile-menu-item"
                    >
                      {t('signin.actions.send')}
                    </a>
                  )}
                </>
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
          {xahauNetwork && (
            <Link href="/services/nft-mint" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.services.nft-mint')}
            </Link>
          )}
          {!displayName && (
            <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.usernames')}
            </Link>
          )}
          <Link href="/xrp-xah-taxes" className="mobile-menu-item" onClick={mobileMenuToggle}>
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
          {/* <a href={'/submit/'} className="mobile-menu-item">
            {t('menu.submit-offline-tx')}
          </a> */}
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          NFT
        </div>
        <div className="mobile-menu__submenu">
          {!displayName && (
            <>
              <span
                onClick={() => {
                  setSignRequest({ redirect: 'nfts' })
                }}
                className="mobile-menu-item link"
              >
                {t('signin.actions.my-nfts')}
              </span>
              <span
                onClick={() => {
                  setSignRequest({ redirect: 'nft-offers' })
                }}
                className="mobile-menu-item link"
              >
                {t('signin.actions.my-nft-offers')}
              </span>
            </>
          )}

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
          {xahauNetwork && (
            <Link href="/services/nft-mint" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.services.nft-mint')}
            </Link>
          )}
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
              <Link href="/amm" className="mobile-menu-item" onClick={mobileMenuToggle}>
                {t('menu.amm.explorer')}
              </Link>
            </div>
          </>
        )}

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
            {t('menu.network.distribution', { nativeCurrency })}
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

          {/* Hide Verified Domains for XAHAU while they are not ready yet */}
          {!xahauNetwork && (
            <Link href="/domains" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t('menu.network.verified-domains')}
            </Link>
          )}

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
          <Link href="https://docs.bithomp.com" className="mobile-menu-item">
            {t('menu.developers.api')}
          </Link>
          <Link href="/admin" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.developers.api-admin')}
          </Link>
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
          <Link href="/about-us" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.company.about-us')}
          </Link>
          <Link href="/advertise" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t('menu.business.advertise')}
          </Link>
          <a
            href="https://xrplmerch.com/product-category/bithomp/?wpam_id=22"
            target="_blank"
            rel="noreferrer"
            className="mobile-menu-item"
          >
            {t('menu.merch')}
          </a>
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
          {t('menu.sponsored.title')}
        </div>
        <div className="mobile-menu__submenu">
          <a href="/go/fm-buy" target="_blank" rel="noreferrer" className="mobile-menu-item">
            {t('menu.sponsored.buy')}
          </a>
          <a href="/go/fm-earn" target="_blank" rel="noreferrer" className="mobile-menu-item">
            {t('menu.sponsored.earn')}
          </a>
          <a href="/go/fm-play" target="_blank" rel="noreferrer" className="mobile-menu-item">
            {t('menu.sponsored.play')}
          </a>
        </div>
      </div>
    </div>
  )
}
