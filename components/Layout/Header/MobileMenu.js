import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import { devNet, explorerName, xahauNetwork, nativeCurrency, avatarServer } from '../../../utils'

import WalletProviderIcon from '../../UI/WalletProviderIcon'

import { IoIosRocket } from 'react-icons/io'
import { FaUserLarge } from 'react-icons/fa6'
import { GrMoney } from 'react-icons/gr'
import {
  IoStatsChart,
  IoWallet,
  IoLogOutOutline,
  IoPersonOutline,
  IoListOutline,
  IoPaperPlaneOutline,
  IoSettingsOutline,
  IoAtOutline,
  IoCompassOutline,
  IoAddCircleOutline,
  IoReceiptOutline,
  IoAppsOutline,
  IoCashOutline,
  IoLayersOutline,
  IoTrophyOutline,
  IoPeopleOutline,
  IoKeyOutline,
  IoLinkOutline,
  IoDocumentTextOutline,
  IoBookOutline,
  IoHelpCircleOutline,
  IoArrowDownCircleOutline,
  IoArrowUpCircleOutline,
  IoCheckboxOutline,
  IoBuildOutline,
  IoPricetagOutline,
  IoTrendingUpOutline,
  IoStorefrontOutline,
  IoBarChartOutline,
  IoStatsChartOutline,
  IoPieChartOutline,
  IoTicketOutline,
  IoFlashOutline,
  IoInformationCircleOutline,
  IoListCircleOutline,
  IoGlobeOutline,
  IoCheckmarkDoneOutline,
  IoShieldCheckmarkOutline,
  IoDocumentAttachOutline,
  IoCodeSlashOutline,
  IoImagesOutline,
  IoPersonAddOutline,
  IoLogoGithub,
  IoGitBranchOutline,
  IoRocketOutline
} from 'react-icons/io5'
import { FaSignOutAlt, FaEye, FaUserCheck, FaUserFriends } from 'react-icons/fa'
import { FiLink } from 'react-icons/fi'
import { MdMiscellaneousServices } from 'react-icons/md'
import { LuCoins } from 'react-icons/lu'
import { RiNftLine, RiPuzzleLine } from 'react-icons/ri'
import { HiOutlineGlobeAlt } from 'react-icons/hi'
import { FaCode } from 'react-icons/fa'
import { IoLogoBuffer } from 'react-icons/io'
import { MdGavel, MdMenuBook } from 'react-icons/md'
import { AiFillStar } from 'react-icons/ai'

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
  //countryCode,
  sessionToken,
  openEmailLogin
}) {
  const { t } = useTranslation('common')

  const iconStyle = { marginRight: '6px', fontSize: '1.1em' }
  const itemIconStyle = { marginRight: 6, fontSize: '1.05em', marginTop: 1, flexShrink: 0 }
  const proLoggedIn = proName && sessionToken
  const wallets = Array.isArray(account?.wallets) ? account.wallets : []
  const activeWallet = wallets.find((w) => w?.id === account?.activeWalletId) || wallets[0] || null
  const activeProvider = activeWallet?.provider || account?.wallet || null

  return (
    <div className="mobile-menu" onClick={handleClick}>
      <div className="mobile-menu-wrap">
        <br />
        <div className="mobile-menu-directory" data-expanded={displayName ? 'false' : 'true'}>
          {displayName ? (
            <>
              <img
                alt="avatar"
                src={avatarServer + address + '?hashIconZoom=12'}
                width="24"
                height="24"
                className="menu-avatar"
              />
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
                <IoPersonOutline style={itemIconStyle} />
                {t('signin.actions.view')}
              </Link>
              <Link
                href={'/account/' + address + '/transactions'}
                className="mobile-menu-item"
                onClick={mobileMenuToggle}
              >
                <IoListOutline style={itemIconStyle} />
                {t('signin.actions.my-transactions')}
              </Link>
              <Link href="/services/send" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoPaperPlaneOutline style={itemIconStyle} />
                Send payment
              </Link>
              <Link href="/services/account-settings/" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoSettingsOutline style={itemIconStyle} />
                My account settings
              </Link>
              {!username && (
                <Link href={'/username?address=' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                  <IoAtOutline style={itemIconStyle} />
                  {t('menu.services.username')}
                </Link>
              )}
              <span onClick={() => signOut()} className="mobile-menu-item link">
                <WalletProviderIcon
                  provider={activeProvider}
                  walletItem={activeWallet}
                  style={{ marginRight: 6 }}
                  showFallback
                  fallbackStyle={itemIconStyle}
                />
                {t('signin.signout')}
                <IoLogOutOutline style={{ marginLeft: 'auto', width: 18, height: 18, opacity: 0.9 }} />
              </span>
            </>
          ) : (
            <span onClick={setSignRequest} className="link mobile-menu-item">
              <FiLink style={{ marginRight: 4, height: 18, width: 18, marginLeft: -1 }} /> {t('signin.connect')}
            </span>
          )}
        </div>

        <div className="mobile-menu-directory" data-expanded={proLoggedIn ? 'false' : 'true'}>
          <IoIosRocket /> Bithomp Pro
        </div>
        <div className="mobile-menu__submenu">
          {proLoggedIn ? (
            <Link href="/admin" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <FaUserLarge style={iconStyle} /> {proName}
            </Link>
          ) : (
            <span
              className="mobile-menu-item link"
              onClick={() => {
                mobileMenuToggle()
                openEmailLogin?.()
              }}
            >
              <FaUserLarge style={iconStyle} /> {t('signin.signin')}
            </span>
          )}

          {proLoggedIn && (
            <>
              <Link href="/admin/watchlist" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <FaEye style={{ ...iconStyle, marginTop: '2px' }} /> Watchlist
              </Link>

              <Link href="/admin/subscriptions" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <GrMoney style={iconStyle} /> Subscriptions
              </Link>

              <Link href="/admin/referrals" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <FaUserFriends style={iconStyle} /> Referrals
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
          <MdMiscellaneousServices style={{ marginBottom: '-2px' }} /> {t('menu.services.services')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/explorer" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCompassOutline style={itemIconStyle} />
            {explorerName} Explorer
          </Link>
          <Link href="/services/send" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoPaperPlaneOutline style={itemIconStyle} />
            {t('menu.services.send')}
          </Link>
          <Link href="/services/trustline" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoAddCircleOutline style={itemIconStyle} />
            {t('menu.services.add-token')}
          </Link>
          <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoAtOutline style={itemIconStyle} />
            {t('menu.services.username')}
          </Link>
          <Link href="/learn/xrp-xah-taxes" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoReceiptOutline style={itemIconStyle} />
            {t('menu.services.tax-reports')}
          </Link>
          <Link href="/services/account-settings/" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoSettingsOutline style={itemIconStyle} />
            {t('menu.services.account-settings')}
          </Link>
          <Link href="/services/toml-checker" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCodeSlashOutline style={itemIconStyle} />
            {t('menu.services.toml-checker')}
          </Link>
          <Link href="/faucet" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoFlashOutline style={itemIconStyle} />
            {t('menu.developers.faucet')}
          </Link>
          <Link href="/services" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoAppsOutline style={itemIconStyle} />
            <b>{t('menu.services.view-all-services')}</b>
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          <LuCoins style={{ marginBottom: '-2px' }} /> {t('menu.tokens')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/tokens" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCashOutline style={itemIconStyle} />
            {t('menu.tokens')}
          </Link>
          {!xahauNetwork && (
            <Link href="/mpts" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoLayersOutline style={itemIconStyle} />
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
            <IoTrophyOutline style={itemIconStyle} />
            TOP Holders
          </Link>
          <Link href="/services/trustline" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoLinkOutline style={itemIconStyle} />
            Set Trust (Trustline)
          </Link>
          <Link href="/learn/issue-a-token" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoDocumentTextOutline style={itemIconStyle} />
            How to Issue a Token
          </Link>
          <Link href="/learn/guide-for-token-issuers" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoBookOutline style={itemIconStyle} />
            Guide for Token Issuers
          </Link>
        </div>

        {/* Hide AMM for XAHAU */}
        {!xahauNetwork && (
          <>
            <div className="mobile-menu-directory" data-expanded="false">
              <IoLogoBuffer style={{ marginBottom: '-2px' }} /> {t('menu.amm.amm')}
            </div>
            <div className="mobile-menu__submenu">
              <Link href="/amms" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoBarChartOutline style={itemIconStyle} />
                {t('menu.amm.pools')}
              </Link>
              <Link href="/learn/amm" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoHelpCircleOutline style={itemIconStyle} />
                What is AMM?
              </Link>
              <Link href="/services/amm/deposit" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoArrowDownCircleOutline style={itemIconStyle} />
                AMM Deposit
              </Link>
              <Link href="/services/amm/withdraw" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoArrowUpCircleOutline style={itemIconStyle} />
                AMM Withdraw
              </Link>
              <Link href="/services/amm/vote" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoCheckboxOutline style={itemIconStyle} />
                AMM Vote
              </Link>
              <Link href="/services/amm/create" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoBuildOutline style={itemIconStyle} />
                AMM Create
              </Link>
              <Link href="/amm" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoCompassOutline style={itemIconStyle} />
                {t('menu.amm.explorer')}
              </Link>
            </div>
          </>
        )}

        <div className="mobile-menu-directory" data-expanded="false">
          <RiNftLine style={{ marginBottom: '-2px' }} /> NFT
        </div>
        <div className="mobile-menu__submenu">
          {!displayName ? (
            <>
              <span
                onClick={() => {
                  setSignRequest({ redirect: 'nfts' })
                }}
                className="mobile-menu-item link"
              >
                <IoImagesOutline style={itemIconStyle} />
                {t('signin.actions.my-nfts')}
              </span>
              <span
                onClick={() => {
                  setSignRequest({ redirect: 'nft-offers' })
                }}
                className="mobile-menu-item link"
              >
                <IoPricetagOutline style={itemIconStyle} />
                {t('signin.actions.my-nft-offers')}
              </span>
            </>
          ) : (
            <>
              <Link href={'/nfts/' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoImagesOutline style={itemIconStyle} />
                {t('signin.actions.my-nfts')}
              </Link>
              <Link href={'/nft-offers/' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoPricetagOutline style={itemIconStyle} />
                {t('signin.actions.my-nft-offers')}
              </Link>
            </>
          )}

          <Link href="/nft-explorer" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCompassOutline style={itemIconStyle} />
            {t('menu.nft.explorer')}
          </Link>
          <Link href="/nft-sales" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoTrendingUpOutline style={itemIconStyle} />
            {t('menu.nft.sales')}
          </Link>

          <Link href="/nft-volumes?period=week" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoLayersOutline style={itemIconStyle} />
            {t('menu.nft.collections')}
          </Link>
          <Link
            href="/nft-volumes?list=marketplaces&period=week"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            <IoStorefrontOutline style={itemIconStyle} />
            {t('menu.nft.marketplaces')}
          </Link>
          <Link href="/nft-volumes?list=charts&period=week" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoBarChartOutline style={itemIconStyle} />
            {t('menu.nft.volumes')}
          </Link>

          {/* Hide NFT-minters for XAHAU while they are not ready yet */}
          {!xahauNetwork && (
            <Link href="/nft-minters" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoPersonAddOutline style={itemIconStyle} />
              {t('menu.nft.minters')}
            </Link>
          )}

          <Link
            href={'/nfts' + (displayName ? '/' + address : '')}
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            <IoImagesOutline style={itemIconStyle} />
            {t('menu.nft.nfts')}
          </Link>
          <Link
            href={'/nft-offers' + (displayName ? '/' + address : '')}
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            <IoTicketOutline style={itemIconStyle} />
            {t('menu.nft.offers')}
          </Link>
          <Link href="/nft-distribution" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoPeopleOutline style={itemIconStyle} />
            {t('menu.nft.distribution')}
          </Link>
          <Link href="/nft-statistics" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoStatsChartOutline style={itemIconStyle} />
            {t('menu.nft.statistics')}
          </Link>
          <Link href="/services/nft-mint" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoRocketOutline style={itemIconStyle} />
            {t('menu.services.nft-mint')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          <HiOutlineGlobeAlt style={{ marginBottom: '-2px' }} /> {t('menu.network.blockchain')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/dapps" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <RiPuzzleLine style={itemIconStyle} />
            Dapps
          </Link>
          {xahauNetwork && (
            <Link href="/governance" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoCheckmarkDoneOutline style={itemIconStyle} />
              {t('menu.network.governance')}
            </Link>
          )}
          <Link href="/activations" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoFlashOutline style={itemIconStyle} />
            {t('menu.network.activations')}
          </Link>
          <Link href="/distribution" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoStatsChartOutline style={itemIconStyle} />
            {t('menu.network.distribution', { currency: nativeCurrency })}
          </Link>
          <Link href="/last-ledger-information" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoInformationCircleOutline style={itemIconStyle} />
            {t('menu.network.last-ledger-information')}
          </Link>
          <Link href="/ledger" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoListCircleOutline style={itemIconStyle} />
            {t('menu.network.last-ledger-transactions')}
          </Link>
          <Link href="/whales" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoTrendingUpOutline style={itemIconStyle} />
            {t('menu.network.top-transfers-24h')}
          </Link>
          <Link href="/domains" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoGlobeOutline style={itemIconStyle} />
            {t('menu.network.verified-domains')}
          </Link>

          <Link href="/validators" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCheckmarkDoneOutline style={itemIconStyle} />
            {t('menu.network.validators')}
          </Link>
          <Link href="/amendments" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoBuildOutline style={itemIconStyle} />
            {t('menu.network.amendments')}
          </Link>
          {!(xahauNetwork && devNet) && (
            <Link href="/nodes" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoGitBranchOutline style={itemIconStyle} />
              {t('menu.network.nodes')}
            </Link>
          )}
          {xahauNetwork && (
            <Link href="/unl-report" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoDocumentAttachOutline style={itemIconStyle} />
              {t('menu.network.unl-report')}
            </Link>
          )}
          <Link href="/genesis" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoKeyOutline style={itemIconStyle} />
            {t('menu.network.genesis')}
          </Link>
          <Link href="/allocation" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoPieChartOutline style={itemIconStyle} />
            {t('menu.network.allocation', { currency: nativeCurrency })}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          <FaCode style={{ marginBottom: '-2px' }} /> {t('menu.developers.developers')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/learn/the-bithomp-api" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCodeSlashOutline style={itemIconStyle} />
            {t('menu.developers.api')}
          </Link>
          <Link href="/services/toml-checker" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoDocumentTextOutline style={itemIconStyle} />
            {t('menu.services.toml-checker')}
          </Link>
          <Link href="/learn/image-services" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoImagesOutline style={itemIconStyle} />
            Token/NFT/Address Images
          </Link>
          {devNet && (
            <>
              <a href={'/create/'} className="mobile-menu-item">
                <IoPersonAddOutline style={itemIconStyle} />
                {t('menu.developers.account-generation')}
              </a>
              <Link href="/faucet" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoFlashOutline style={itemIconStyle} />
                {t('menu.developers.faucet')}
              </Link>
              <a href={'/tools/'} className="mobile-menu-item">
                <IoBuildOutline style={itemIconStyle} />
                Bithomp tools
              </a>
              <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoRocketOutline style={itemIconStyle} />
                {t('menu.business.eaas')}
              </Link>
              <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoShieldCheckmarkOutline style={itemIconStyle} />
                {t('menu.business.build-unl')}
              </Link>
            </>
          )}
          <a href="https://github.com/Bithomp" className="mobile-menu-item">
            <IoLogoGithub style={itemIconStyle} />
            Github
          </a>
          <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoRocketOutline style={itemIconStyle} />
            {t('menu.business.eaas')}
          </Link>
          <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoShieldCheckmarkOutline style={itemIconStyle} />
            {t('menu.business.build-unl')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          <RiPuzzleLine style={{ marginBottom: '-2px' }} /> Bithomp
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/learn/the-bithomp-explorer-advantages" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCompassOutline style={itemIconStyle} />
            Why Our Explorer
          </Link>
          <Link href="/about-us" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoInformationCircleOutline style={itemIconStyle} />
            {t('menu.company.about-us')}
          </Link>
          <Link href="/advertise" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoRocketOutline style={itemIconStyle} />
            {t('menu.business.advertise')}
          </Link>
          <Link href="/customer-support" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoHelpCircleOutline style={itemIconStyle} />
            {t('menu.customer-support')}
          </Link>
          <Link href="/press" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoDocumentTextOutline style={itemIconStyle} />
            {t('menu.press')}
          </Link>
          <Link href="/donate" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCashOutline style={itemIconStyle} />
            {t('menu.donate')}
            <span className="red" style={{ marginLeft: '5px' }}>
              ❤
            </span>
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          <MdGavel style={{ marginBottom: '-2px' }} /> {t('menu.legal')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href="/disclaimer" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoDocumentTextOutline style={itemIconStyle} />
            {t('menu.disclaimer')}
          </Link>
          <Link href="/privacy-policy" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoShieldCheckmarkOutline style={itemIconStyle} />
            {t('menu.privacy-policy')}
          </Link>
          <Link href="/terms-and-conditions" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoBookOutline style={itemIconStyle} />
            {t('menu.terms-and-conditions')}
          </Link>
        </div>

        <div className="mobile-menu-directory" data-expanded="false">
          <MdMenuBook style={{ marginBottom: '-2px' }} /> {t('menu.learn-more.title')}
        </div>
        <div className="mobile-menu__submenu">
          <Link href={xahauNetwork ? '/xahau-wallets' : '/xrp-wallets'} className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoStorefrontOutline style={itemIconStyle} />
            {xahauNetwork ? t('menu.learn-more.xahau-wallets') : t('menu.learn-more.xrp-wallets')}
          </Link>
          {!xahauNetwork && (
            <Link href="/learn/xrpl-article" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoBookOutline style={itemIconStyle} />
              XRP, XRPL, Ripple
            </Link>
          )}
          <Link href="/learn/verified-domain" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoGlobeOutline style={itemIconStyle} />
            Verified domains
          </Link>
          {!xahauNetwork && (
            <Link href="/learn/ripple-usd" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoCashOutline style={itemIconStyle} />
              Ripple USD
            </Link>
          )}
          <Link href="/learn/nft-minting" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoImagesOutline style={itemIconStyle} />
            How to Mint NFT
          </Link>
          <Link href="/learn" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoAppsOutline style={itemIconStyle} />
            See our learn page
          </Link>
        </div>

        {!xahauNetwork && (
          <>
            <div className="mobile-menu-directory" data-expanded="false">
              <AiFillStar style={{ marginBottom: '-2px' }} /> {t('menu.sponsored.title')}
            </div>
            <div className="mobile-menu__submenu">
              <a href="https://bithomp.com/go/fm-buy" target="_blank" rel="noreferrer" className="mobile-menu-item">
                <IoCashOutline style={itemIconStyle} />
                {t('menu.sponsored.buy')}
              </a>
              <a href="https://bithomp.com/go/fm-earn" target="_blank" rel="noreferrer" className="mobile-menu-item">
                <IoTrendingUpOutline style={itemIconStyle} />
                {t('menu.sponsored.earn')}
              </a>
              {/*
              <a
                href={countryCode === 'US' ? 'https://bithomp.com/go/fm-play-us' : 'https://bithomp.com/go/fm-play'}
                target="_blank"
                rel="noreferrer"
                className="mobile-menu-item"
              >
                {countryCode === 'US' ? 'Join Drake on Stake' : 'Join Stake'}
              </a>
              */}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
