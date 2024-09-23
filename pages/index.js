import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'
import Head from 'next/head'

import { server, explorerName, nativeCurrency, devNet, network } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import Whales from '../components/Home/Whales'
import Converter from '../components/Home/Converter'
import PriceChart from '../components/Home/PriceChart'
import Statistics from '../components/Home/Statistics'
import Ads from '../components/Home/Ads'
import Faucet from '../components/Faucet'
import Link from 'next/link'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'faucet']))
    }
  }
}

const ldJsonWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'XRP Explorer',
  alternateName: ['XRP Explorer', 'XRPL Explorer', 'Scan XRP Ledger'],
  url: server,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: server + '/explorer/?r={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
}

const testPaymentAvailable = network === 'xahau'

export default function Home({ selectedCurrency, setSelectedCurrency, showAds, account }) {
  const { t } = useTranslation()

  const [chartPeriod, setChartPeriod] = useState('one_day')
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  return (
    <>
      <LogoJsonLd logo={server + '/images/logo.svg'} url={server} />
      <SocialProfileJsonLd
        type="Organization"
        name="Bithomp"
        url={server}
        sameAs={[
          'http://instagram.com/bithomp',
          'https://x.com/bithomp',
          'https://www.youtube.com/@bithomp',
          'https://www.linkedin.com/company/bithomp/'
        ]}
      />
      <SEO
        title={t('home.title', { explorerName, nativeCurrency })}
        titleWithNetwork="true"
        description={t('home.description', { explorerName, nativeCurrency })}
        images={[
          {
            width: 1200,
            height: 630,
            file: 'og-logo.png'
          },
          {
            width: 512,
            height: 512,
            file: server + '/logo512.png'
          },
          {
            width: 192,
            height: 192,
            file: server + '/logo192.png'
          }
        ]}
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonWebsite) }} />
      </Head>

      <div className="center">
        <h1 style={{ fontSize: '1.5em' }}>{explorerName} Explorer</h1>
        <h2 style={{ fontSize: '1.2em' }}>
          Search for <Link href="/ledger">Transactions</Link>,{' '}
          <Link href="/distribution">{nativeCurrency} addresses</Link>, <Link href="/nft-explorer">NFTs</Link>. View{' '}
          <Link href="/validators">Validators</Link>, <Link href="/amendments">Amendments</Link>,{' '}
          <Link href="/distribution">{nativeCurrency} distribution</Link>.
        </h2>
      </div>

      <SearchBlock tab="explorer" />

      {rendered && showAds && (
        <div className="home-sponsored">
          <Ads />
        </div>
      )}

      {!devNet && selectedCurrency && (
        <>
          <div className="home-converter">
            <Converter
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              chartPeriod={chartPeriod}
            />
          </div>
          <div className="home-price-chart">
            <PriceChart currency={selectedCurrency} chartPeriod={chartPeriod} setChartPeriod={setChartPeriod} />
          </div>
        </>
      )}

      <div className="home-whale-transactions">
        <Whales currency={selectedCurrency} />
      </div>

      <div className="home-statistics">
        <Statistics />
      </div>

      {!devNet && testPaymentAvailable && (
        <div className="home-faucet">
          <Faucet account={account} type="testPayment" />
        </div>
      )}
    </>
  )
}
