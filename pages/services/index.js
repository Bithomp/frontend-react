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
  RiFilePaper2Line,
  RiPriceTag3Line,
  RiDeleteBin6Line,
  RiBookOpenLine,
  RiArrowDownCircleLine,
  RiArrowUpCircleLine,
  RiCheckboxCircleLine,
  RiAddCircleLine
} from 'react-icons/ri'
import { MdOutlineFactCheck, MdOutlineLockClock, MdOutlineImage, MdOutlineApi } from 'react-icons/md'
import { IoWalletOutline, IoSparklesOutline } from 'react-icons/io5'
import { IoIosRocket } from 'react-icons/io'
import { LuCoins } from 'react-icons/lu'

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
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
          return (
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
  const { t } = useTranslation()
  const [q, setQ] = useState('')

  // Build sections (no stacks)
  const sections = useMemo(() => {
    const bithompServices = {
      id: 'bithomp-services',
      title: '🧩 Bithomp Services',
      items: [
        { href: '/learn/xrp-xah-taxes', title: t('menu.services.tax-reports'), icon: RiFilePaper2Line },
        { href: '/username', title: t('menu.usernames'), icon: RiPriceTag3Line },
        { href: '/submit-account-information', title: t('menu.project-registration'), icon: RiFilePaper2Line },
        !devNet ? { href: '/alerts', title: t('menu.price-alerts', { nativeCurrency }), icon: TbBell } : null
      ].filter(Boolean)
    }

    // Payments should be the second section
    const payments = {
      id: 'payments',
      title: '💸 Payments',
      items: [
        { href: '/services/trustline', title: 'Set Trust (Trustline)', icon: TbShieldCheck },
        { href: '/services/send', title: 'Send Payment', icon: TbSend },
        { href: '/services/check', title: 'Issue Check', icon: MdOutlineFactCheck },
        { href: '/services/escrow', title: 'Create Escrow', icon: MdOutlineLockClock }
      ]
    }

    // AMM: fully hidden on Xahau
    const amm = {
      id: 'amm',
      title: '🌊 AMM',
      items: [
        { href: '/services/amm/deposit', title: 'AMM Deposit', icon: RiArrowDownCircleLine },
        { href: '/services/amm/withdraw', title: 'AMM Withdraw', icon: RiArrowUpCircleLine },
        { href: '/services/amm/vote', title: 'AMM Vote', icon: RiCheckboxCircleLine },
        { href: '/services/amm/create', title: 'AMM Create', icon: RiAddCircleLine }
      ]
    }

    // Renamed from Creators -> Issuance, and removed /tokens link
    const issuance = {
      id: 'issuance',
      title: '🏗️ Issuance',
      items: [
        { href: '/learn/issue-a-token', title: 'How to Issue a Token', icon: RiBookOpenLine },
        { href: '/learn/guide-for-token-issuers', title: 'Guide for Token Issuers', icon: RiBookOpenLine },
        { href: '/services/nft-mint', title: t('menu.services.nft-mint'), icon: IoSparklesOutline }
      ]
    }

    // Account: on Xahau add Reward Auto Claim here (no separate Xahau section)
    const account = {
      id: 'account',
      title: '⚙️ Account',
      items: [
        ...(xahauNetwork ? [{ href: '/services/reward-auto-claim', title: 'Reward Auto Claim', icon: LuCoins }] : []),
        { href: '/services/account-settings/', title: 'Account Settings', icon: IoWalletOutline },
        { href: '/services/account-delete', title: 'Account Delete', icon: RiDeleteBin6Line }
      ]
    }

    // Developers: removed API Key Registration
    const developers = {
      id: 'developers',
      title: '🧪 Developers',
      items: [
        { href: '/learn/the-bithomp-api', title: t('menu.developers.api'), icon: MdOutlineApi },
        {
          href: '/faucet',
          title: t('menu.developers.faucet'),
          icon: IoIosRocket
        },
        { href: '/learn/image-services', title: 'Token / NFT / Address Images', icon: MdOutlineImage },
        { href: '/submit/', title: t('menu.submit-offline-tx'), icon: RiFilePaper2Line }
      ]
    }

    const list = [bithompServices, payments, issuance, account, developers]

    if (!xahauNetwork) {
      list.splice(2, 0, amm)
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
      <SEO title={`${explorerName} Services`} description={`Services on ${explorerName}.`} />

      <div className={styles.pageWrap}>
        <div className={`content-text ${styles.page}`}>
          <div className={styles.topRow}>
            <h1 className={styles.h1}>{explorerName} Services</h1>

            <input
              className={'input-text ' + styles.search}
              type="text"
              placeholder="Search by service name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search services"
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
