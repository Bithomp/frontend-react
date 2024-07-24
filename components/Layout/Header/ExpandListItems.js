
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import {
  devNet,
  xahauNetwork,
  ledgerName,
  nativeCurrency
} from '../../../utils'

export default function ExpandListItems({ mobileMenuToggle, displayName, address, setSignRequest }) {
  const { t } = useTranslation('common')

  return (
    <div className='mobile-menu-wrap'>
      <div className="mobile-menu-directory" aria-expanded="false">{t("menu.services.services")}</div>
      <div className="mobile-menu__submenu">
        {xahauNetwork &&
          <Link
            href="/services/nft-mint"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.services.nft-mint")}
          </Link>
        }
        <a href={"/explorer/"} className="mobile-menu-item">{t("menu.services.search-on-ledgerName", { ledgerName })}</a>
        {!displayName &&
          <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.usernames")}</Link>
        }

        <Link href="/submit-account-information" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.project-registration")}
        </Link>

        {!devNet &&
          <Link href="/alerts" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t("menu.price-alerts", { nativeCurrency })}
          </Link>
        }
        {!devNet && <a href={"/submit/"} className="mobile-menu-item">{t("menu.submit-offline-tx")}</a>}
      </div>

      <div className="mobile-menu-directory" aria-expanded="false">NFT</div>
      <div className="mobile-menu__submenu">
        {!displayName &&
          <span onClick={() => { setSignRequest({ redirect: "nfts" }) }} className="mobile-menu-item link">{t("signin.actions.my-nfts")}</span>
        }

        <Link href="/nft-explorer" className="mobile-menu-item" onClick={mobileMenuToggle}> {t("menu.nft.explorer")}</Link>

        {/* Hide NFT-volumes for XAHAU while they are not ready yet */}
        {!xahauNetwork && <Link href="/nft-volumes" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.nft.volumes")}</Link>}
        <Link href="/nft-sales" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.nft.sales")}</Link>
        {/* Hide NFT-minters for XAHAU while they are not ready yet */}
        {!xahauNetwork && <Link href="/nft-minters" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.nft.minters")}</Link>}

        <Link
          href={"/nfts" + (displayName ? ("/" + address) : "")}
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft.nfts")}
        </Link>
        <Link
          href={"/nft-offers" + (displayName ? ("/" + address) : "")}
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft.offers")}
        </Link>
        <Link
          href="/nft-distribution"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.nft.distribution")}
        </Link>
        {/* Hide NFT statistics for XAHAU while they are not ready yet */}
        {!xahauNetwork &&
          <Link
            href="/nft-statistics"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.nft.statistics")}
          </Link>
        }
        {xahauNetwork &&
          <Link
            href="/services/nft-mint"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.services.nft-mint")}
          </Link>
        }
      </div>

      {/* Hide AMM for XAHAU */}
      {!xahauNetwork &&
        <>
          <div className="mobile-menu-directory" aria-expanded="false">{t("menu.amm.amm")}</div>
          <div className="mobile-menu__submenu">
            <Link
              href="/amms"
              className="mobile-menu-item"
              onClick={mobileMenuToggle}
            >
              {t("menu.amm.pools")}
            </Link>
            <Link
              href="/amm"
              className="mobile-menu-item"
              onClick={mobileMenuToggle}
            >
              {t("menu.amm.explorer")}
            </Link>
          </div>
        </>
      }

      <div className="mobile-menu-directory" aria-expanded="false">{t("menu.network.blockchain")}</div>
      <div className="mobile-menu__submenu">
        {xahauNetwork &&
          <Link
            href="/governance"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.network.governance")}
          </Link>
        }
        <Link
          href="/activations"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.network.activations")}
        </Link>
        <Link
          href="/distribution"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.network.distribution", { nativeCurrency })}
        </Link>
        <Link
          href="/last-ledger-information"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.network.last-ledger-information")}
        </Link>
        <Link
          href="/ledger"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.network.last-ledger-transactions")}
        </Link>

        {/* Hide Verified Domains for XAHAU while they are not ready yet */}
        {!xahauNetwork &&
          <Link
            href="/domains"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.network.verified-domains")}
          </Link>
        }

        <Link
          href="/validators"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.network.validators")}
        </Link>
        <Link
          href="/amendments"
          className="mobile-menu-item"
          onClick={mobileMenuToggle}
        >
          {t("menu.network.amendments")}
        </Link>
        {!(xahauNetwork && devNet) &&
          <Link
            href="/nodes"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.network.nodes")}
          </Link>
        }
        {xahauNetwork &&
          <Link
            href="/unl-report"
            className="mobile-menu-item"
            onClick={mobileMenuToggle}
          >
            {t("menu.network.unl-report")}
          </Link>
        }
        <Link href="/genesis" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.network.genesis")}
        </Link>
      </div>

      <div className="mobile-menu-directory" aria-expanded="false">{t("menu.developers.developers")}</div>
      <div className="mobile-menu__submenu">
        {devNet &&
          <>
            <a href={"/create/"} className="mobile-menu-item">{t("menu.developers.account-generation")}</a>
            <a href={"/faucet/"} className="mobile-menu-item">{t("menu.developers.faucet")}</a>
            <a href={"/tools/"} className="mobile-menu-item">Bithomp tools</a>
            <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t("menu.business.eaas")}
            </Link>
            <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t("menu.business.build-unl")}
            </Link>
          </>
        }
        <Link href="https://docs.bithomp.com" className="mobile-menu-item">{t("menu.developers.api")}</Link>
        <Link href="/admin" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.developers.api-admin")}
        </Link>
        <a href="https://github.com/Bithomp" className="mobile-menu-item">Github</a>
        <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.business.eaas")}
        </Link>
        <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.business.build-unl")}
        </Link>
      </div>

      <div className="mobile-menu-directory" aria-expanded="false">Bithomp</div>
      <div className="mobile-menu__submenu">
        <Link href="/about-us" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.company.about-us")}
        </Link>
        <Link href="/advertise" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.business.advertise")}
        </Link>
        <a
          href="https://xrplmerch.com/product-category/bithomp/?wpam_id=22"
          target="_blank"
          rel="noreferrer"
          className="mobile-menu-item"
        >
          {t("menu.merch")}
        </a>
        <Link href="/customer-support" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.customer-support")}
        </Link>
        <Link href="/press" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.press")}
        </Link>
        <Link href="/donate" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.donate")}
          <span className="red" style={{ marginLeft: "5px" }}>❤</span>
        </Link>
      </div>

      <div className="mobile-menu-directory" aria-expanded="false">{t("menu.legal")}</div>
      <div className="mobile-menu__submenu">
        <Link href="/disclaimer" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.disclaimer")}
        </Link>
        <Link href="/privacy-policy" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.privacy-policy")}
        </Link>
        <Link href="/terms-and-conditions" className="mobile-menu-item" onClick={mobileMenuToggle}>
          {t("menu.terms-and-conditions")}
        </Link>
      </div>

      <div className="mobile-menu-directory" aria-expanded="false">{t("menu.sponsored.title")}</div>
      <div className="mobile-menu__submenu">
        <a
          href="/go/fm-buy"
          target="_blank"
          rel="noreferrer"
          className="mobile-menu-item"
        >
          {t("menu.sponsored.buy")}
        </a>
        <a
          href="/go/fm-earn"
          target="_blank"
          rel="noreferrer"
          className="mobile-menu-item"
        >
          {t("menu.sponsored.earn")}
        </a>
        {/* 
        <a
          href="/go/fm-play"
          target="_blank"
          rel="noreferrer"
          className="mobile-menu-item"
        >
          {t("menu.sponsored.play")}
        </a>
        */}
      </div>
    </div>
  )
}