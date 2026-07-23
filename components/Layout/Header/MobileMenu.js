import NextLink from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

import { devNet, explorerName, xahauNetwork, nativeCurrency, avatarSrc, retinaImageSize } from '../../../utils'
import { shortHash } from '../../../utils/format'

import WalletProviderIcon, { walletProviderName } from '../../UI/WalletProviderIcon'

import { IoIosRocket } from 'react-icons/io'
import { FaUserLarge } from 'react-icons/fa6'
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
  IoRocketOutline,
  IoNotificationsOutline,
  IoCopyOutline,
  IoAddOutline
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
import CopyButton from '../../UI/CopyButton'

const Link = (props) => <NextLink {...props} prefetch={false} />

const walletDisplayName = (walletItem) => walletItem?.username || shortHash(walletItem?.address)

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
  setActiveWallet,
  account,
  //countryCode,
  sessionToken,
  openEmailLogin
}) {
  const { t } = useTranslation('common')
  const router = useRouter()

  const iconStyle = { marginRight: '6px', fontSize: '1.1em' }
  const itemIconStyle = { marginRight: 6, fontSize: '1.05em', marginTop: 1, flexShrink: 0 }
  const proLoggedIn = proName && sessionToken
  const wallets = Array.isArray(account?.wallets) ? account.wallets : []
  const orderedWallets = [...wallets].sort((a, b) => (b?.connectedAt || 0) - (a?.connectedAt || 0))
  const activeWallet = wallets.find((w) => w?.id === account?.activeWalletId) || wallets[0] || null
  const activeWalletId = activeWallet?.id || account?.activeWalletId || null

  const handleWalletSwitch = (walletItem) => {
    if (!walletItem?.id) return

    const isActiveWallet = walletItem.id === activeWalletId
    if (isActiveWallet) {
      if (!router.asPath.startsWith('/account/' + walletItem.address) && !router.pathname.startsWith('/services')) {
        router.push('/account/' + walletItem.address)
        mobileMenuToggle()
      }
      return
    }

    setActiveWallet?.(walletItem.id)
    mobileMenuToggle()
  }

  const handleConnectAnotherWallet = () => {
    setSignRequest?.(
      router.pathname.startsWith('/account')
        ? { redirect: 'account', connectAnotherWallet: true }
        : { connectAnotherWallet: true }
    )
    mobileMenuToggle()
  }

  const connectedWalletsBlock = !!orderedWallets.length && (
    <div className="mobile-wallets-block">
      <div className="wallets-title center">{t('menu.wallet.connected-wallets')}</div>
      {orderedWallets.map((walletItem) => {
        const isActiveWallet = walletItem.id === activeWalletId
        const providerName = walletProviderName({ provider: walletItem.provider, walletItem })

        return (
          <div key={walletItem.id} className={'wallet-row' + (isActiveWallet ? ' active' : '')}>
            <span
              className={
                'link wallet-switch' +
                (isActiveWallet && router.asPath.startsWith('/account/' + walletItem.address)
                  ? ' wallet-switch-active'
                  : '')
              }
              onClick={() => handleWalletSwitch(walletItem)}
            >
              <img
                alt="avatar"
                src={avatarSrc(walletItem.address, { size: retinaImageSize(20), hashIconZoom: 12 })}
                width="20"
                height="20"
                className="wallet-row-avatar"
              />
              <span className="wallet-switch-label">{walletDisplayName(walletItem)}</span>
            </span>
            <span className={'wallet-active-indicator' + (isActiveWallet ? ' is-active' : '')}>
              {isActiveWallet && '●'}
            </span>
            <span className="wallet-provider-icon" aria-label={providerName} tabIndex={0}>
              <WalletProviderIcon provider={walletItem.provider} walletItem={walletItem} showFallback />
              <span className="wallet-provider-tooltip">{providerName}</span>
            </span>
            <span
              className="wallet-copy"
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <CopyButton
                text={walletItem.address}
                buttonClassName="wallet-copy-button"
                title={false}
                tooltipClassName="wallet-copy-tooltip"
              >
                <IoCopyOutline aria-hidden="true" />
              </CopyButton>
            </span>
            <span
              className="link wallet-disconnect"
              onClick={(event) => {
                event.stopPropagation()
                signOut(walletItem.id)
              }}
            >
              <IoLogOutOutline aria-label={t('menu.wallet.disconnect')} />
            </span>
          </div>
        )
      })}
      <span onClick={handleConnectAnotherWallet} className="wallet-connect-row link">
        <span className="wallet-connect-icon" aria-hidden="true">
          <IoAddOutline />
        </span>
        {t('menu.wallet.connect-another-wallet')}
      </span>
    </div>
  )

  return (
    <div className="mobile-menu" onClick={handleClick}>
      <div className="mobile-menu-wrap">
        <br />
        {displayName && connectedWalletsBlock}
        <div className="mobile-menu-directory" data-expanded={displayName ? 'false' : 'true'}>
          {displayName ? (
            <>
              <img
                alt="avatar"
                src={avatarSrc(address, { size: retinaImageSize(24), hashIconZoom: 12 })}
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
                {t('menu.services.send')}
              </Link>
              <Link href="/services/account-settings/" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoSettingsOutline style={itemIconStyle} />
                {t('menu.wallet.my-account-settings')}
              </Link>
              {!username && (
                <Link href={'/username?address=' + address} className="mobile-menu-item" onClick={mobileMenuToggle}>
                  <IoAtOutline style={itemIconStyle} />
                  {t('menu.services.username')}
                </Link>
              )}
            </>
          ) : (
            <span onClick={() => setSignRequest?.({})} className="link mobile-menu-item">
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
                <FaEye style={{ ...iconStyle, marginTop: '2px' }} /> {t('menu.pro.watchlist')}
              </Link>

              <Link href="/admin/referrals" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <FaUserFriends style={iconStyle} /> {t('menu.pro.referrals')}
              </Link>

              <Link href="/admin/pro" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <FaUserCheck style={{ ...iconStyle, marginTop: '2px' }} /> {t('menu.pro.my-addresses')}
              </Link>

              <Link href="/admin/notifications" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoNotificationsOutline style={iconStyle} /> {t('menu.pro.alerts')}
              </Link>

              <Link href="/admin/api" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoStatsChart style={iconStyle} /> {t('menu.pro.api-management')}
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
            {t('menu.explorer', { explorerName })}
          </Link>
          {xahauNetwork && (
            <Link href="/services/reward-auto-claim" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoCashOutline style={itemIconStyle} />
              {t('menu.services.reward-auto-claim')}
              <span className="menu-item-badge">{t('menu.badges.new')}</span>
            </Link>
          )}
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
          <Link href="/submit-account-information" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoInformationCircleOutline style={itemIconStyle} />
            {t('menu.services.submit-account-information')}
          </Link>
          <Link href="/services/toml-checker" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoCodeSlashOutline style={itemIconStyle} />
            {t('menu.services.toml-checker')}
            <span className="menu-item-badge">{t('menu.badges.new')}</span>
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
          <Link href="/distribution" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoTrophyOutline style={itemIconStyle} />
            {t('menu.token-menu.top-holders')}
          </Link>
          <Link href="/services/trustline" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoLinkOutline style={itemIconStyle} />
            {t('menu.token-menu.set-trust')}
          </Link>
          <Link href="/learn/issue-a-token" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoDocumentTextOutline style={itemIconStyle} />
            {t('menu.token-menu.issue-token-guide')}
          </Link>
          <Link href="/learn/guide-for-token-issuers" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoBookOutline style={itemIconStyle} />
            {t('menu.token-menu.issuer-guide')}
          </Link>
          {!xahauNetwork && (
            <Link href="/services/issue-mpt" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoLayersOutline style={itemIconStyle} />
              {t('menu.services.issue-mpt')}
              <span className="menu-item-badge">{t('menu.badges.new')}</span>
            </Link>
          )}
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
                {t('menu.amm.learn')}
              </Link>
              <Link href="/services/amm/deposit" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoArrowDownCircleOutline style={itemIconStyle} />
                {t('menu.amm.deposit')}
              </Link>
              <Link href="/services/amm/withdraw" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoArrowUpCircleOutline style={itemIconStyle} />
                {t('menu.amm.withdraw')}
              </Link>
              <Link href="/services/amm/vote" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoCheckboxOutline style={itemIconStyle} />
                {t('menu.amm.vote')}
              </Link>
              <Link href="/services/amm/create" className="mobile-menu-item" onClick={mobileMenuToggle}>
                <IoBuildOutline style={itemIconStyle} />
                {t('menu.amm.create')}
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
            {t('menu.network.dapps', { networkName: xahauNetwork ? 'Xahau' : 'XRPL' })}
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
            <span className="menu-item-badge">{t('menu.badges.new')}</span>
          </Link>
          <Link href="/activation-tree" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoGitBranchOutline style={itemIconStyle} />
            {t('menu.network.activation-tree')}
            <span className="menu-item-badge">{t('menu.badges.new')}</span>
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
            <span className="menu-item-badge">{t('menu.badges.new')}</span>
          </Link>
          <Link href="/learn/image-services" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoImagesOutline style={itemIconStyle} />
            {t('menu.developers.images')}
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
                {t('menu.developers.bithomp-tools')}
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
            {t('footer.why-our-explorer')}
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
              {t('menu.learn-more.xrpl-ripple')}
            </Link>
          )}
          <Link href="/learn/verified-domain" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoGlobeOutline style={itemIconStyle} />
            {t('menu.learn-more.verified-domains')}
          </Link>
          {!xahauNetwork && (
            <Link href="/learn/ripple-usd" className="mobile-menu-item" onClick={mobileMenuToggle}>
              <IoCashOutline style={itemIconStyle} />
              {t('menu.learn-more.ripple-usd')}
            </Link>
          )}
          <Link href="/learn/nft-minting" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoImagesOutline style={itemIconStyle} />
            {t('menu.learn-more.nft-minting')}
          </Link>
          <Link href="/learn" className="mobile-menu-item" onClick={mobileMenuToggle}>
            <IoAppsOutline style={itemIconStyle} />
            {t('menu.learn-more.learn-page')}
          </Link>
        </div>

        {!xahauNetwork && (
          <>
            <div className="mobile-menu-directory" data-expanded="false">
              <AiFillStar style={{ marginBottom: '-2px' }} /> {t('menu.sponsored.title')}
            </div>
            <div className="mobile-menu__submenu">
              <a
                href="https://bithomp.com/go/fm-buy"
                target="_blank"
                rel="noreferrer"
                className="mobile-menu-item"
                aria-label={t('menu.sponsored.link-label', { title: t('menu.sponsored.buy') })}
              >
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
