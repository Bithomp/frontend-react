// pages/learn.js
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import Breadcrumbs from '../../components/Breadcrumbs'

import styles from '../../styles/pages/learn.module.scss'

const learnContent = [
  {
    category: 'XRP Basics',
    description: 'Learn about the basics of XRP, its purpose, and how it differs from other cryptocurrencies.',
    items: [
      { title: 'What is XRP?', description: 'Understand the basics of XRP, its purpose, and how it differs from other cryptocurrencies.', slug: 'what-is-xrp' },
      { title: 'What is Ripple? (the company)', description: 'Learn about the company behind XRP, and how it is related.', slug: 'what-is-ripple' },
    ],
  },
  {
    category: 'XRP Ledger',
    description: 'Learn about the XRP Ledger and main concepts.',
    items: [
      { title: 'What is the XRP Ledger?', description: 'Learn about the XRP Ledger and its purpose.', slug: 'what-is-the-xrp-ledger' },
      { title: 'Trust Lines', description: 'Understand how trust lines work in the XRP Ledger, and how they are used to send XRP.', slug: 'trust-lines' },
      { title: 'Memo & Destination Tag', description: 'Learn about the memo and destination tag fields in the XRP Ledger, and how they are used to send XRP.', slug: 'destination-tag' },
    ],
  },
  {
    category: 'Wallets & Transactions',
    items: [
      { title: 'How to Check a Wallet', slug: 'check-wallet' },
      { title: 'Track Transactions', slug: 'track-transactions' },
    ],
  },
  {
    category: 'Glossary',
    items: [
      { title: 'Consensus', slug: 'consensus' },
      { title: 'Validator', slug: 'validator' },
      { title: 'IOU Token', slug: 'iou-token' },
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
  const router = useRouter()

  const handleClick = (slug) => {
    router.push(`/learn/${slug}`)
  }

  return (
    <>
      <Head>
        <title>Learn about XRP, XRPL, Ripple | Bithomp</title>
        <meta
          name="description"
          content="Learn everything about XRP, the XRP Ledger, Ripple, and how to explore the network using Bithomp tools."
        />
      </Head>

      <div className="max-w-6xl mx-auto px-4">
        <Breadcrumbs />
        <h1 className="text-4xl font-bold text-center mb-6">Learn About XRP & The XRP Ledger</h1>
        <p className="text-gray-600 text-center max-w-4xl mx-auto mb-12">
          Explore essential concepts behind XRP, the XRP Ledger, Ripple, and wallet activity.
          Understand how the ecosystem works with these beginner-friendly guides and definitions.
        </p>

        <div className="space-y-12">
          {learnContent.map((section) => (
            <div key={section.category}>
              <h2 className="text-2xl font-semibold mb-4">{section.category}</h2>
              <p className="text-gray-600 mb-4 no-underline hover:no-underline">{section.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {section.items.map((item) => (
                  <div key={item.slug} className={`${styles.card} p-4`} onClick={() => handleClick(item.slug)}>
                    <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-gray-600 mb-4 no-underline hover:no-underline">{item.description}</p>
                    </div>
                    <Link
                      key={item.slug}
                      href={`/learn/${item.slug}`}
                    >
                        <p className="font-mono text-sm text-gray-500 mt-1">Read more →</p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
