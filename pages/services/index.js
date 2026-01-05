import Link from 'next/link'
import SEO from '../../components/SEO'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useMemo, useState } from 'react'

import { devNet, xahauNetwork, explorerName, nativeCurrency, ledgerName } from '../../utils'
import styles from '../../styles/pages/services.module.scss'

// Icons
import { TbSend, TbShieldCheck, TbAlertCircle, TbDroplet } from 'react-icons/tb'
import { RiFilePaper2Line, RiPriceTag3Line, RiDeleteBin6Line, RiBookOpenLine } from 'react-icons/ri'
import { MdOutlineFactCheck, MdOutlineLockClock, MdOutlineImage, MdOutlineApi } from 'react-icons/md'
import { IoWalletOutline, IoSparklesOutline } from 'react-icons/io5'
import { IoIosRocket } from 'react-icons/io'
import { LuCoins, LuKeyRound } from 'react-icons/lu'

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

              <span className={styles.itemText}>
                <span className={styles.itemTitle}>{it.title}</span>
                {it.hint && <span className={styles.itemHint}>{it.hint}</span>}
              </span>
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

  const sections = useMemo(() => {
    // Stacked tile 1
    const registration = {
      id: 'registration',
      title: '🪪 Public registration',
      items: [
        { href: '/username', title: t('menu.usernames'), icon: RiPriceTag3Line },
        { href: '/submit-account-information', title: t('menu.project-registration'), icon: RiFilePaper2Line }
      ]
    }

    const bithompServices = {
      id: 'bithomp-services',
      title: '🧩 Bithomp Services',
      items: [
        { href: '/learn/xrp-xah-taxes', title: t('menu.services.tax-reports'), icon: RiFilePaper2Line },
        !devNet ? { href: '/alerts', title: t('menu.price-alerts', { nativeCurrency }), icon: TbAlertCircle } : null
      ].filter(Boolean)
    }

    // IMPORTANT: Tokens must be 2nd tile in top grid
    const tokens = {
      id: 'tokens',
      title: '🪙 Tokens',
      items: [
        { href: '/tokens', title: t('menu.tokens'), icon: LuCoins },
        { href: '/services/trustline', title: 'Set Trust (Trustline)', icon: TbShieldCheck },
        { href: '/learn/issue-a-token', title: 'How to Issue a Token', icon: RiBookOpenLine },
        { href: '/learn/guide-for-token-issuers', title: 'Guide for Token Issuers', icon: RiBookOpenLine }
      ]
    }

    // Stacked tile 2
    const account = {
      id: 'account',
      title: '⚙️ Account',
      items: [
        { href: '/services/account-settings/', title: 'Account Settings', icon: IoWalletOutline },
        { href: '/services/account-delete', title: 'Account Delete', icon: RiDeleteBin6Line }
      ]
    }

    const nft = {
      id: 'nft',
      title: '🖼️ NFT',
      items: [
        { href: '/nft-explorer', title: 'NFT Explorer', icon: MdOutlineImage },
        { href: '/services/nft-mint', title: t('menu.services.nft-mint'), icon: IoSparklesOutline }
      ]
    }

    const payments = {
      id: 'payments',
      title: '💸 Payments & conditional',
      items: [
        { href: '/services/send', title: 'Send Payment', icon: TbSend },
        { href: '/services/check', title: 'Issue Check', icon: MdOutlineFactCheck },
        { href: '/services/escrow', title: 'Create Escrow', icon: MdOutlineLockClock }
      ]
    }

    const xahau = {
      id: 'xahau',
      title: '✨ Xahau',
      items: [
        xahauNetwork ? { href: '/services/reward-auto-claim', title: 'Reward Auto Claim', icon: LuCoins } : null
      ].filter(Boolean)
    }

    // AMM must be right before Developers (requested order)
    const amm = {
      id: 'amm',
      title: '🌊 AMM',
      items: [
        !xahauNetwork ? { href: '/amms', title: 'AMM Pools', icon: TbDroplet } : null,
        !xahauNetwork ? { href: '/services/amm/deposit', title: 'AMM Deposit', icon: TbDroplet } : null,
        !xahauNetwork ? { href: '/services/amm/withdraw', title: 'AMM Withdraw', icon: TbDroplet } : null,
        !xahauNetwork ? { href: '/services/amm/vote', title: 'AMM Vote', icon: TbDroplet } : null,
        !xahauNetwork ? { href: '/services/amm/create', title: 'AMM Create', icon: TbDroplet } : null
      ].filter(Boolean)
    }

    // Developers must be last (requested)
    const developers = {
      id: 'dev',
      title: '🧪 Developers',
      items: [
        { href: '/learn/the-bithomp-api', title: t('menu.developers.api'), icon: MdOutlineApi },
        { href: '/admin/api', title: 'API Key Registration', icon: LuKeyRound },
        {
          href: '/faucet',
          title: t('menu.developers.faucet'),
          icon: IoIosRocket,
          hint: `${nativeCurrency} / ${ledgerName}`
        },
        { href: '/learn/image-services', title: 'Token/NFT/Address Images', icon: MdOutlineImage },
        { href: '/submit/', title: t('menu.submit-offline-tx'), icon: RiFilePaper2Line }
      ]
    }

    // TOP GRID: put many tiles here so 5–6 can actually show on one line
    // Order: stack(reg+services), tokens, stack(account+nft), payments, xahau, amm, developers
    const topTiles = [
      { type: 'stack', id: 'stack-left', sections: [registration, bithompServices] },
      { type: 'single', id: tokens.id, section: tokens },
      { type: 'stack', id: 'stack-right', sections: [account, nft] },
      { type: 'single', id: payments.id, section: payments },
      ...(xahau.items.length ? [{ type: 'single', id: xahau.id, section: xahau }] : []),
      ...(amm.items.length ? [{ type: 'single', id: amm.id, section: amm }] : []),
      { type: 'single', id: developers.id, section: developers }
    ]

    // Flat list for search (includes everything visible)
    const allFlat = [
      registration,
      bithompServices,
      tokens,
      account,
      nft,
      payments,
      ...(xahau.items.length ? [xahau] : []),
      ...(amm.items.length ? [amm] : []),
      developers
    ]

    return { topTiles, allFlat }
  }, [t])

  const isSearching = q.trim().length > 0

  const searched = useMemo(() => {
    if (!isSearching) return null
    const query = q.trim().toLowerCase()

    return sections.allFlat
      .map((sec) => {
        const items = sec.items.filter((it) => {
          const hay = `${it.title} ${it.href} ${it.hint || ''}`.toLowerCase()
          return hay.includes(query)
        })
        return { ...sec, items }
      })
      .filter((sec) => sec.items.length > 0)
  }, [isSearching, q, sections.allFlat])

  return (
    <>
      <SEO
        title={`${explorerName} Services`}
        description={`Services on ${explorerName}.`}
        descriptionWithNetwork={true}
      />

      <div className="content-text">
        <div className={styles.topRow}>
          <h1 className={styles.h1}>{explorerName} Services</h1>

          <input
            className={'input-text ' + styles.search}
            type="text"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search services"
          />
        </div>

        {isSearching ? (
          <>
            <div className={styles.tilesGrid}>
              {searched?.map((sec) => (
                <Section key={sec.id} title={sec.title} items={sec.items} />
              ))}
            </div>

            {(!searched || searched.length === 0) && (
              <div className="center" style={{ marginTop: 14 }}>
                <b>No services found</b>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.tilesGrid}>
              {sections.topTiles.map((tile) => {
                if (tile.type === 'single') {
                  return (
                    <div key={tile.id} className={styles.tile}>
                      <Section title={tile.section.title} items={tile.section.items} />
                    </div>
                  )
                }

                return (
                  <div key={tile.id} className={styles.stackTile}>
                    {tile.sections.map((sec) => (
                      <Section key={sec.id} title={sec.title} items={sec.items} />
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
