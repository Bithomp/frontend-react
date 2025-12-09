import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'

import Breadcrumbs from '@/components/Breadcrumbs'
import SEO from '@/components/SEO'
import Card from '@/components/UI/Card'
import styles from '@/styles/pages/learn.module.scss'
import { getIsSsrMobile } from '@/utils/mobile'
import { explorerName, nativeCurrency } from '../../utils'

const pageDetails = {
  title: 'Learn About ' + nativeCurrency + ' & The ' + explorerName,
  description:
    'Explore essential concepts behind ' +
    nativeCurrency +
    ', the ' +
    explorerName +
    ', and wallet activity. Understand how the ecosystem works with these beginner-friendly guides and definitions.',
  h1: 'Learn About ' + nativeCurrency + ' & ' + explorerName
}

const buildLearnContent = () => {
  let content = [
    {
      category: explorerName + ' Features & Concepts',
      description: 'Dive deeper into the features and concepts of the ' + explorerName + '.',
      items: [
        { title: 'Blackholed Address', slug: 'blackholed-address' },
        { title: 'Blacklisted Address', slug: 'blacklisted-address' },
        { title: 'Verified Domain', slug: 'verified-domain' }
      ]
    },
    {
      category: 'Bithomp Tools',
      description: 'Learn how to get the most out of Bithomp’s powerful explorer.',
      items: [
        { title: 'The Bithomp Explorer Advantages', slug: 'the-bithomp-explorer-advantages' },
        { title: 'How to Mint NFTs on ' + explorerName, slug: 'nft-minting' },
        { title: 'The Bithomp API', slug: 'the-bithomp-api' },
        { title: 'XRP and XAH Taxes - get SCV exports for your report', slug: 'xrp-xah-taxes' },
        { title: 'How to Issue a Token on ' + explorerName, slug: 'issue-a-token' },
        {
          title: 'Guide for Token Issuers: Username, Toml file, Project Registration',
          slug: 'guide-for-token-issuers'
        },
        { title: 'Bithomp Image Services', slug: 'image-services' },
        { title: 'Understanding Trustlines', slug: 'trustlines' },
        { title: 'NFT Explorer', slug: 'nft-explorer' }
      ]
    }
  ]
  //network specific content
  //only on xrpl
  if (nativeCurrency === 'XRP') {
    // add before and after items to first section
    const itemsBefore = [{ title: 'XRP, Ripple, XRP Ledger: Key Differencies', slug: 'xrpl-article' }]
    const itemsAfter = [
      { title: 'Ripple USD', slug: 'ripple-usd' },
      { title: 'XRPL AMM', slug: 'amm' }
    ]
    content[0].items = [...itemsBefore, ...content[0].items, ...itemsAfter]
  }
  return content
}

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function LearnPage() {
  const learnContent = buildLearnContent()

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
                    aria-label={`Read more about ${item.title}`}
                    href={`/learn/${item.slug}`}
                    key={item.slug}
                    className={`${styles.card}`}
                  >
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      {item.description && <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>}
                    </div>
                    <p className={`${styles.readMore}`}>Read more →</p>
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
