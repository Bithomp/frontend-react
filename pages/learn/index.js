import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import Link from 'next/link'

import Breadcrumbs from '@/components/Breadcrumbs'
import SEO from '@/components/SEO'
import Card from '@/components/UI/Card'
import styles from '@/styles/pages/learn.module.scss'
import { getIsSsrMobile } from '@/utils/mobile'
import { explorerName, nativeCurrency } from '../../utils'

const buildLearnContent = (t) => {
  let content = [
    {
      category: t('categories.features.title', { explorerName }),
      description: t('categories.features.description', { explorerName }),
      items: [
        { title: t('items.blackholed-address'), slug: 'blackholed-address' },
        { title: t('items.blacklisted-address'), slug: 'blacklisted-address' },
        { title: t('items.verified-domain'), slug: 'verified-domain' },
        { title: t('items.paystrings'), slug: 'paystrings' }
      ]
    },
    {
      category: t('categories.tools.title'),
      description: t('categories.tools.description'),
      items: [
        { title: t('items.the-bithomp-explorer-advantages'), slug: 'the-bithomp-explorer-advantages' },
        { title: t('items.nft-minting', { explorerName }), slug: 'nft-minting' },
        { title: t('items.create-escrow', { explorerName }), slug: 'create-escrow' },
        { title: t('items.the-bithomp-api'), slug: 'the-bithomp-api' },
        { title: t('items.xrp-xah-taxes'), slug: 'xrp-xah-taxes' },
        { title: t('items.issue-a-token', { explorerName }), slug: 'issue-a-token' },
        {
          title: t('items.guide-for-token-issuers'),
          slug: 'guide-for-token-issuers'
        },
        { title: t('items.image-services'), slug: 'image-services' },
        { title: t('items.trustlines'), slug: 'trustlines' },
        { title: t('items.nft-explorer'), slug: 'nft-explorer' },
        { title: t('items.send-payments'), slug: 'send-payments' },
        { title: t('items.types-of-assets', { explorerName }), slug: 'types-of-assets' },
        { title: t('items.checks'), slug: 'checks' }
      ]
    }
  ]
  // network specific content

  // only on xrpl
  if (nativeCurrency === 'XRP') {
    const itemsBefore = [{ title: t('items.xrpl-article'), slug: 'xrpl-article' }]
    const itemsAfter = [
      { title: t('items.ripple-usd'), slug: 'ripple-usd' },
      { title: t('items.amm'), slug: 'amm' },
      { title: t('items.run-a-validator'), slug: 'run-a-validator' }
    ]
    content[0].items = [...itemsBefore, ...content[0].items, ...itemsAfter]
  }

  // only on xahau
  if (nativeCurrency === 'XAH') {
    const itemsBefore = [{ title: t('items.claim-reward'), slug: 'claim-reward' }]
    content[0].items = [...itemsBefore, ...content[0].items]
  }

  return content
}
export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'learn']))
    }
  }
}

export default function LearnPage() {
  const { t } = useTranslation('learn')
  const pageDetails = {
    title: t('page.title', { nativeCurrency, explorerName }),
    description: t('page.description', { nativeCurrency, explorerName }),
    h1: t('page.h1', { nativeCurrency, explorerName })
  }
  const learnContent = buildLearnContent(t)

  return (
    <>
      <SEO title={pageDetails.title} description={pageDetails.description} />
      <Head>
        <title>{pageDetails.title}</title>
        <meta name="description" content={pageDetails.description} />
      </Head>

      <div className="max-w-6xl mx-auto px-4 pb-10">
        <Breadcrumbs />
        <h1 className="!text-3xl sm:!text-4xl font-bold text-center mb-6">{pageDetails.h1}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-4xl mx-auto mb-12">
          {pageDetails.description}
        </p>

        <div className="space-y-12">
          {learnContent.map((section) => (
            <section key={section.category}>
              <h2 className="text-2xl font-semibold mb-4">{section.category}</h2>
              {section.description && <p className="text-gray-600 dark:text-gray-400 mb-4">{section.description}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {section.items.map((item) => (
                  <Card
                    as={Link}
                    aria-label={t('readMoreAria', { title: item.title })}
                    href={`/learn/${item.slug}`}
                    key={item.slug}
                    className={`${styles.card}`}
                  >
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      {item.description && <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>}
                    </div>
                    <p className={`${styles.readMore}`}>{t('readMore')}</p>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
