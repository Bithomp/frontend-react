// pages/learn.js
import Link from 'next/link'
import Head from 'next/head'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import Breadcrumbs from '../../components/Breadcrumbs'

import styles from '../../styles/pages/learn.module.scss'

const learnContentXRP = [
  {
    category: 'XRP Basics',
    description: 'Learn about the basics of XRP, its purpose, and how it differs from other cryptocurrencies.',
    items: [
      { title: 'What is XRP?', description: 'Understand the basics of XRP, its purpose, and how it differs from other cryptocurrencies.', slug: 'what-is-xrp' },
      { title: 'What is Ripple? (the company)', description: 'Learn about the company behind XRP, and how it is related.', slug: 'what-is-ripple' },
    ],
  },
  {
    category: 'XRP Ledger (XRPL)',
    description: 'Understand how XRPL works and what makes it unique.',
    items: [
      { title: 'What is the XRP Ledger?', description: 'Learn about the XRP Ledger and its purpose.', slug: 'what-is-the-xrp-ledger' },
    ],
  },
  {
    category: 'XRPL Features & Concepts',
    description: 'Dive deeper into the features and concepts of the XRP Ledger.',
    items: [
      { title: 'Blackholed Address', slug: 'blackholed-address' },
      { title: 'Blacklisted Address', slug: 'blacklisted-address' },
      { title: 'Ripple USD', slug: 'ripple-usd' },
      { title: 'Verified Domain', slug: 'verified-domain' },
    ],
  },
]

const learnContentXAHAU = [
  {
    category: 'XAHAU Features & Concepts',
    description: 'Dive deeper into the features and concepts of the XAHAU Ledger.',
    items: [
      { title: 'Blackholed Address', slug: 'blackholed-address' },
      { title: 'Blacklisted Address', slug: 'blacklisted-address' },
      { title: 'Verified Domain', slug: 'verified-domain' },
    ],
  },
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
  const learnContent = ['mainnet', 'testnet', 'devnet'].includes(network) ? learnContentXRP : learnContentXAHAU;

  return (
    <>
      <Head>
        <title>Learn about XRP, XRPL, Ripple | Bithomp</title>
        <meta
          name="description"
          content="Learn everything about XRP, the XRP Ledger, Ripple, and how to explore the network using Bithomp tools."
        />
      </Head>

      <div className="max-w-6xl mx-auto px-4 pb-10">
        <Breadcrumbs />
        <h1 className="!text-3xl sm:!text-4xl font-bold text-center mb-6">Learn About XRP & The XRP Ledger</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-4xl mx-auto mb-12">
          Explore essential concepts behind XRP, the XRP Ledger, Ripple, and wallet activity.
          Understand how the ecosystem works with these beginner-friendly guides and definitions.
        </p>

        <div className="space-y-12">
          {learnContent.map((section) => (
            <section key={section.category}>
              <h2 className="text-2xl font-semibold mb-4">{section.category}</h2>
              {section.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">{section.description}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {section.items.map((item) => (
                  <Link
                    aria-label={`Read more about ${item.title}`}
                    href={`/learn/${item.slug}`}
                    key={item.slug}
                    className={`${styles.card}`}
                  >
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      {item.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>
                      )}
                    </div>
                    <p className={`${styles.readMore}`}>Read more →</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
