import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import { nativeCurrency, xahauNetwork } from '../utils'
import styles from '../styles/pages/notFound.module.scss'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Error404() {
  const { t } = useTranslation('common')

  const links = [
    { href: '/', label: t('page-not-found.home') },
    { href: '/explorer', label: t('menu.search-accounts-transactions', { nativeCurrency }) },
    { href: '/tokens', label: t('menu.tokens') },
    { href: '/nft-explorer', label: t('nft-explorer.header') },
    ...(!xahauNetwork ? [{ href: '/amms', label: t('menu.amm.pools') }] : []),
    { href: '/services', label: t('menu.services.view-all-services') },
    { href: '/sitemap.html', label: t('sitemap.title') }
  ]

  return (
    <>
      <SEO title={t('page-not-found.header')} description={t('page-not-found.text')} noindex />
      <div className={styles.page}>
        <div className={styles.code} aria-hidden="true">
          404
        </div>
        <h1>{t('page-not-found.header')}</h1>
        <p className={styles.description}>{t('page-not-found.text')}</p>

        <section className={styles.search} aria-label={t('page-not-found.search-title')}>
          <SearchBlock tab="explorer" type="explorer" contained />
        </section>

        <nav className={styles.links} aria-label={t('page-not-found.popular')}>
          <h2>{t('page-not-found.popular')}</h2>
          <div>
            {links.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  )
}
