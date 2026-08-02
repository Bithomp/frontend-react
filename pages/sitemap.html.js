import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import SEO from '../components/SEO'
import { devNet, nativeCurrency, xahauNetwork } from '../utils'
import styles from '../styles/pages/humanSitemap.module.scss'

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const SitemapSection = ({ title, links }) => (
  <section className={styles.section}>
    <h2>{title}</h2>
    <ul>
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link href={href}>{label}</Link>
        </li>
      ))}
    </ul>
  </section>
)

export default function HumanSitemap() {
  const { t } = useTranslation('common')

  const sections = [
    {
      title: t('sitemap.sections.explore'),
      links: [
        { href: '/', label: t('home.h1', { homeExplorerName: xahauNetwork ? 'Xahau Explorer' : 'XRP Explorer' }) },
        { href: '/explorer', label: t('menu.search-accounts-transactions', { nativeCurrency }) },
        { href: '/tokens', label: t('menu.tokens') },
        { href: '/distribution', label: t('menu.network.distribution', { currency: nativeCurrency }) },
        ...(!xahauNetwork ? [{ href: '/amms', label: t('menu.amm.pools') }] : []),
        { href: '/nft-explorer', label: t('nft-explorer.header') },
        { href: '/nft-sales', label: t('nft-sales.header') },
        { href: '/nft-volumes', label: t('menu.nft.collections') },
        { href: '/dapps', label: t('menu.network.dapps', { networkName: xahauNetwork ? 'Xahau' : 'XRPL' }) }
      ]
    },
    {
      title: t('sitemap.sections.services'),
      links: [
        { href: '/services', label: t('menu.services.view-all-services') },
        { href: '/services/send', label: t('menu.services.send') },
        { href: '/services/trustline', label: t('menu.services.add-token') },
        { href: '/username', label: t('menu.services.username') },
        { href: '/services/account-settings', label: t('menu.services.account-settings') },
        { href: '/services/nft-mint', label: t('menu.services.nft-mint') },
        { href: '/services/toml-checker', label: t('menu.services.toml-checker') },
        { href: '/services/toml-generator', label: t('menu.services.toml-generator') },
        ...(xahauNetwork
          ? [{ href: '/services/reward-auto-claim', label: t('menu.services.reward-auto-claim') }]
          : [{ href: '/services/issue-mpt', label: t('menu.services.issue-mpt') }]),
        ...(devNet ? [{ href: '/faucet', label: t('menu.developers.faucet') }] : [])
      ]
    },
    {
      title: t('sitemap.sections.network'),
      links: [
        { href: '/last-ledger-information', label: t('menu.network.last-ledger-information') },
        { href: '/ledger', label: t('menu.network.last-ledger-transactions') },
        { href: '/whales', label: t('menu.network.top-transfers-24h') },
        { href: '/validators', label: t('menu.network.validators') },
        { href: '/amendments', label: t('menu.network.amendments') },
        ...(!(xahauNetwork && devNet) ? [{ href: '/nodes', label: t('menu.network.nodes') }] : []),
        { href: '/domains', label: t('menu.network.verified-domains') },
        { href: '/activations', label: t('menu.network.activations') },
        { href: '/genesis', label: t('menu.network.genesis') },
        { href: '/allocation', label: t('menu.network.allocation', { currency: nativeCurrency }) }
      ]
    },
    {
      title: t('sitemap.sections.resources'),
      links: [
        { href: '/learn', label: t('menu.learn-more.learn-page') },
        { href: '/learn/the-bithomp-api', label: t('menu.developers.api') },
        { href: '/learn/issue-a-token', label: t('menu.token-menu.issue-token-guide') },
        { href: '/learn/guide-for-token-issuers', label: t('menu.token-menu.issuer-guide') },
        { href: xahauNetwork ? '/xahau-wallets' : '/xrp-wallets', label: t(`menu.learn-more.${xahauNetwork ? 'xahau-wallets' : 'xrp-wallets'}`) },
        { href: '/about-us', label: t('menu.company.about-us') },
        { href: '/customer-support', label: t('menu.customer-support') },
        { href: '/privacy-policy', label: t('menu.privacy-policy') },
        { href: '/terms-and-conditions', label: t('menu.terms-and-conditions') }
      ]
    }
  ]

  return (
    <>
      <SEO title={t('sitemap.title')} description={t('sitemap.description')} />
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>{t('sitemap.title')}</h1>
          <p>{t('sitemap.description')}</p>
        </div>
        <div className={styles.grid}>
          {sections.map((section) => (
            <SitemapSection key={section.title} {...section} />
          ))}
        </div>
      </div>
    </>
  )
}
