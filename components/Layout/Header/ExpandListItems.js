
import Link from 'next/link'
import { useTranslation } from 'next-i18next'

import {
  devNet,
  xahauNetwork,
  ledgerName,
  nativeCurrency
} from '../../../utils'

export default function ExpandListItems({ mobileMenuToggle, displayName, address }) {
  const { t } = useTranslation('common')

  return (
    <div className='mobile-menu-wrap'>
      <div className="mobile-menu-directory" aria-expanded="false">{t("menu.personal.personal")}</div>
      <div className="mobile-menu__submenu">
        <a href={"/explorer/"} className="mobile-menu-item">{t("menu.personal.search-on-ledgerName", { ledgerName })}</a>
        {!displayName &&
          <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.usernames")}</Link>
        }

        {!displayName &&
          <span onClick={() => { setSignRequest({ redirect: "nfts" }) }} className="mobile-menu-item link">{t("signin.actions.my-nfts")}</span>
        }

        {!devNet &&
          <Link href="/alerts" className="mobile-menu-item" onClick={mobileMenuToggle}>
            {t("menu.price-alerts", { nativeCurrency })}
          </Link>
        }
        {!devNet && <a href={"/submit/"} className="mobile-menu-item">{t("menu.submit-offline-tx")}</a>}
      </div>

      <div className="mobile-menu-directory" aria-expanded="false">NFT</div>
      <div className="mobile-menu__submenu">
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

      <div className="mobile-menu-directory" aria-expanded="false">{ledgerName}</div>
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
      </div>

      {!devNet &&
        <>
          <div className="mobile-menu-directory" aria-expanded="false">{t("menu.business.business")}</div>
          <div className="mobile-menu__submenu">
            <Link href="/advertise" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t("menu.business.advertise")}
            </Link>
            {!displayName &&
              <Link href="/username" className="mobile-menu-item" onClick={mobileMenuToggle}>{t("menu.usernames")}</Link>
            }
            <Link href="/submit-account-information" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t("menu.project-registration")}
            </Link>
            <Link href="/eaas" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t("menu.business.eaas")}
            </Link>
            <Link href="/build-unl" className="mobile-menu-item" onClick={mobileMenuToggle}>
              {t("menu.business.build-unl")}
            </Link>
          </div>
        </>
      }
    </div>
  )
}