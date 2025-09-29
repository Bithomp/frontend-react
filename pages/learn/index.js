import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'

import Breadcrumbs from '@/components/Breadcrumbs'
import SEO from '@/components/SEO'
import Card from '@/components/UI/Card'
import styles from '@/styles/pages/learn.module.scss'
import { getIsSsrMobile } from '@/utils/mobile'
import { xahauNetwork } from '../../utils'

const learnPageXRP = {
  title: 'Learn About XRP & The XRP Ledger | Bithomp',
  description:
    'Explore essential concepts behind XRP, the XRP Ledger, Ripple, and wallet activity. Understand how the ecosystem works with these beginner-friendly guides and definitions.',
  h1: 'Learn About XRP & The XRP Ledger',
  canonical: 'bithomp.com/learn'
}

const learnPageXAHAU = {
  title: 'Learn About XAH & The XAHAU Ledger | XAHAU Explorer',
  description:
    'Explore essential concepts behind XAHAU, and the XAHAU Ledger, and wallet activity. Understand how the ecosystem works with these beginner-friendly guides and definitions.',
  h1: 'Learn About XAHAU & The XAHAU Ledger',
  canonical: 'xahauexplorer.com/learn'
}

const learnContentXRP = [
  {
    category: 'XRPL Features & Concepts',
    description: 'Dive deeper into the features and concepts of the XRP Ledger.',
    items: [
      { title: 'XRP, Ripple, XRP Ledger: Key Differencies', slug: 'xrpl-article' },
      { title: 'Blackholed Address', slug: 'blackholed-address' },
      { title: 'Blacklisted Address', slug: 'blacklisted-address' },
      { title: 'Ripple USD', slug: 'ripple-usd' },
      { title: 'Verified Domain', slug: 'verified-domain' },
      { title: 'XRPL AMM', slug: 'amm' }
    ]
  },
  {
    category: 'Bithomp Tools',
    description: 'Learn how to get the most out of Bithomp’s powerful explorer.',
    items: [
      { title: 'The Bithomp Explorer Advantages', slug: 'the-bithomp-explorer-advantages' },
      { title: 'How to Mint NFTs on XRPL', slug: 'nft-minting' },
      { title: 'The Bithomp API', slug: 'the-bithomp-api' },
      { title: 'XRP and XAH Taxes - get SCV exports for your report', slug: 'xrp-xah-taxes' },
      { title: 'How to Issue a Token on XRPL', slug: 'issue-a-token' },
      { title: 'Guide for Token Issuers: Username, Toml file, Project Registration', slug: 'guide-for-token-issuers' }
    ]
  }
]

const learnContentXAHAU = [
  {
    category: 'XAHAU Features & Concepts',
    description: 'Dive deeper into the features and concepts of the XAHAU Ledger.',
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
      { title: 'How to mint NFTs on Xahau', slug: 'nft-minting' },
      { title: 'The Bithomp API', slug: 'the-bithomp-api' },
      { title: 'How to Issue a Token on Xahau', slug: 'issue-a-token' },
      { title: 'Guide for Token Issuers: Username, Toml file, Project Registration', slug: 'guide-for-token-issuers' }
    ]
  }
]

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
  const learnPage = !xahauNetwork ? learnPageXRP : learnPageXAHAU
  const learnContent = !xahauNetwork ? learnContentXRP : learnContentXAHAU

  return (
    <>
      <SEO title={learnPage.title} description={learnPage.description} canonical={learnPage.canonical} />
      <Head>
        <title>{learnPage.title}</title>
        <meta name="description" content={learnPage.description} />
      </Head>

      <div className="max-w-6xl mx-auto px-4 pb-10">
        <Breadcrumbs />
        <h1 className="!text-3xl sm:!text-4xl font-bold text-center mb-6">{learnPage.h1}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-4xl mx-auto mb-12">{learnPage.description}</p>

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
