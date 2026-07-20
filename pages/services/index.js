import Link from 'next/link'
import SEO from '../../components/SEO'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useMemo, useState } from 'react'

import { devNet, xahauNetwork, explorerName, nativeCurrency } from '../../utils'
import styles from '../../styles/pages/services.module.scss'

// Icons
import { TbSend, TbShieldCheck, TbBell } from 'react-icons/tb'
import {
  RiCompassDiscoverLine,
  RiFilePaper2Line,
  RiPriceTag3Line,
  RiDeleteBin6Line,
  RiBookOpenLine,
  RiArrowDownCircleLine,
  RiArrowUpCircleLine,
  RiCheckboxCircleLine,
  RiAddCircleLine
} from 'react-icons/ri'
import { MdOutlineFactCheck, MdOutlineLockClock, MdOutlineImage, MdOutlineApi, MdVerified } from 'react-icons/md'
import {
  IoWalletOutline,
  IoSparklesOutline,
  IoKeyOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoLayersOutline,
  IoCodeOutline
} from 'react-icons/io5'
import { IoIosRocket } from 'react-icons/io'
import { LuCoins, LuFileCheck2 } from 'react-icons/lu'

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'services']))
    }
  }
}

function Section({ title, items }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>

      <div className={styles.items}>
        {items.map((it) => {
          const Icon = it.icon
          return it.external ? (
            <a key={it.href} href={it.href} className={styles.item}>
              <span className={styles.itemIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.itemTitle}>{it.title}</span>
            </a>
          ) : (
            <Link key={it.href} href={it.href} className={styles.item}>
              <span className={styles.itemIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.itemTitle}>{it.title}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function ServicesPage() {
  const { t } = useTranslation(['common', 'services'])
  const [q, setQ] = useState('')

  // Build sections (no stacks)
  const sections = useMemo(() => {
    const bithompServices = {
      id: 'bithomp-services',
      title: `🦩 ${t('services-page.sections.bithomp', { ns: 'services' })}`,
      items: [
        {
          href: '/explorer',
          title: t('services-page.items.explorer', { ns: 'services', explorerName }),
          icon: RiCompassDiscoverLine
        },
        { href: '/learn/xrp-xah-taxes', title: t('menu.services.tax-reports'), icon: LuFileCheck2 },
        {
          href: '/admin/pro/history',
          title: t('services-page.try-tax-reports', { ns: 'services' }),
          icon: LuFileCheck2
        },
        !devNet ? { href: '/alerts', title: t('menu.price-alerts', { nativeCurrency }), icon: TbBell } : null,
        !devNet
          ? { href: '/admin/watchlist', title: t('services-page.items.watchlist', { ns: 'services' }), icon: MdVerified }
          : null
      ].filter(Boolean)
    }

    // Payments should be the second section
    const payments = {
      id: 'payments',
      title: `💸 ${t('services-page.sections.payments', { ns: 'services' })}`,
      items: [
        { href: '/services/trustline', title: t('menu.services.add-token'), icon: TbShieldCheck },
        { href: '/services/send', title: t('menu.services.send'), icon: TbSend },
        { href: '/services/check', title: t('check.title', { ns: 'services' }), icon: MdOutlineFactCheck },
        { href: '/services/escrow', title: t('escrow.title', { ns: 'services' }), icon: MdOutlineLockClock }
      ]
    }

    // AMM: fully hidden on Xahau
    const amm = {
      id: 'amm',
      title: `🌊 ${t('services-page.sections.amm', { ns: 'services' })}`,
      items: [
        {
          href: '/services/amm/deposit',
          title: t('amm.tabs.deposit', { ns: 'services' }),
          icon: RiArrowDownCircleLine
        },
        {
          href: '/services/amm/withdraw',
          title: t('amm.tabs.withdraw', { ns: 'services' }),
          icon: RiArrowUpCircleLine
        },
        { href: '/services/amm/vote', title: t('amm.tabs.vote', { ns: 'services' }), icon: RiCheckboxCircleLine },
        { href: '/services/amm/create', title: t('amm.tabs.create', { ns: 'services' }), icon: RiAddCircleLine }
      ]
    }

    // Renamed from Creators -> Issuance, and removed /tokens link
    const issuance = {
      id: 'issuance',
      title: `🏗️ ${t('services-page.sections.issuance', { ns: 'services' })}`,
      items: [
        {
          href: '/learn/issue-a-token',
          title: t('services-page.items.issue-token', { ns: 'services' }),
          icon: RiBookOpenLine
        },
        {
          href: '/learn/guide-for-token-issuers',
          title: t('services-page.items.issuer-guide', { ns: 'services' }),
          icon: IoLayersOutline
        },
        { href: '/services/nft-mint', title: t('menu.services.nft-mint'), icon: IoSparklesOutline },
        !xahauNetwork
          ? { href: '/services/issue-mpt', title: t('menu.services.issue-mpt'), icon: LuCoins }
          : null,
        !xahauNetwork
          ? {
              href: '/services/mpt-metadata-generator',
              title: t('menu.services.mpt-metadata-generator'),
              icon: IoCodeOutline
            }
          : null,
        {
          href: '/services/toml-generator?category=issuance',
          title: t('menu.services.toml-generator'),
          icon: IoDocumentTextOutline
        },
        {
          href: '/services/toml-checker?category=issuance',
          title: t('menu.services.toml-checker'),
          icon: IoCodeOutline
        }
      ].filter(Boolean)
    }

    const identity = {
      id: 'identity',
      title: `🪪 ${t('services-page.sections.identity', { ns: 'services' })}`,
      items: [
        { href: '/username', title: t('menu.services.username'), icon: IoPersonOutline },
        { href: '/submit-account-information', title: t('menu.project-registration'), icon: IoDocumentTextOutline },
        { href: '/services/toml-generator', title: t('menu.services.toml-generator'), icon: IoDocumentTextOutline },
        { href: '/services/toml-checker', title: t('menu.services.toml-checker'), icon: IoCodeOutline },
        { href: '/domains', title: t('menu.identity.domain-verification'), icon: IoLayersOutline }
      ]
    }

    // Account: on Xahau add Reward Auto Claim here (no separate Xahau section)
    const account = {
      id: 'account',
      title: `⚙️ ${t('services-page.sections.account', { ns: 'services' })}`,
      items: [
        ...(xahauNetwork
          ? [
              {
                href: '/services/reward-auto-claim',
                title: t('services-page.items.reward-auto-claim', { ns: 'services' }),
                icon: LuCoins
              }
            ]
          : []),
        { href: '/services/account-settings/', title: t('menu.services.account-settings'), icon: IoWalletOutline },
        {
          href: '/services/token-issuer-settings',
          title: t('services-page.items.token-issuer-settings', { ns: 'services' }),
          icon: RiPriceTag3Line
        },
        {
          href: '/services/account-control',
          title: t('services-page.items.account-control', { ns: 'services' }),
          icon: IoKeyOutline
        },
        {
          href: '/services/account-delete',
          title: t('services-page.items.account-delete', { ns: 'services' }),
          icon: RiDeleteBin6Line
        }
      ]
    }

    // Developers: removed API Key Registration
    const developers = {
      id: 'developers',
      title: `🧪 ${t('services-page.sections.developers', { ns: 'services' })}`,
      items: [
        { href: '/learn/the-bithomp-api', title: t('menu.developers.api'), icon: MdOutlineApi },
        {
          href: '/faucet',
          title: t('menu.developers.faucet'),
          icon: IoIosRocket
        },
        {
          href: '/learn/image-services',
          title: t('services-page.items.image-services', { ns: 'services' }),
          icon: MdOutlineImage
        },
        { href: '/submit/', title: t('menu.submit-offline-tx'), icon: RiFilePaper2Line, external: true }
      ]
    }

    const list = [bithompServices, identity, payments, issuance, account, developers]

    if (!xahauNetwork) {
      list.splice(3, 0, amm)
    }

    return list
  }, [t])

  const visibleSections = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return sections

    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => `${it.title} ${it.href}`.toLowerCase().includes(query))
      }))
      .filter((sec) => sec.items.length > 0)
  }, [q, sections])

  return (
    <>
      <SEO
        title={t('services-page.seo-title', { ns: 'services', explorerName })}
        description={t('services-page.seo-description', { ns: 'services', explorerName })}
      />

      <div className={styles.pageWrap}>
        <div className={`content-text ${styles.page}`}>
          <div className={styles.topRow}>
            <h1 className={styles.h1}>{t('services-page.title', { ns: 'services', explorerName })}</h1>

            <input
              className={'input-text ' + styles.search}
              type="text"
              placeholder={t('services-page.search-placeholder', { ns: 'services' })}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t('services-page.search-label', { ns: 'services' })}
            />
          </div>

          <div className={styles.tilesGrid}>
            {visibleSections.map((sec) => (
              <div key={sec.id} className={styles.tile}>
                <Section title={sec.title} items={sec.items} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
