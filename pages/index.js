import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'
import Head from 'next/head'

import { server, explorerName, nativeCurrency, devNet, xahauNetwork } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import Ads from '../components/Layout/Ads'
import Products from '../components/Home/Products'
import Converter from '../components/Home/Converter'
import PriceChart from '../components/Home/PriceChart'

import dynamic from 'next/dynamic'
//not indexed
const Whales = dynamic(() => import('../components/Home/Whales'), { ssr: false })
const Statistics = dynamic(() => import('../components/Home/Statistics'), { ssr: false })

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'faucet', 'products']))
    }
  }
}

const ldJsonWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: nativeCurrency + ' Explorer',
  alternateName: [
    nativeCurrency + ' Explorer',
    explorerName + ' Explorer',
    'Scan ' + nativeCurrency + ' Ledger',
    'Bithomp' + explorerName + ' and Services'
  ],
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

export default function Home({ selectedCurrency, setSelectedCurrency, showAds }) {
  const { t } = useTranslation()

  const [chartPeriod, setChartPeriod] = useState('one_day')

  const imagePath = server + '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  return (
    <>
      <LogoJsonLd logo={imagePath + 'longDark.svg'} url={server} />
      <SocialProfileJsonLd
        type="Organization"
        name={xahauNetwork ? 'XAHAU Explorer' : 'XRP Explorer'}
        url={server}
        sameAs={
          xahauNetwork
            ? [
                'http://instagram.com/xahauexplorer/',
                'https://x.com/xahauexplorer',
                'https://www.youtube.com/@bithomp',
                'https://www.linkedin.com/company/xahauexplorer/'
              ]
            : [
                'https://www.instagram.com/xrplexplorer/',
                'https://x.com/xrplexplorer',
                'https://www.youtube.com/@bithomp',
                'https://www.linkedin.com/company/xrplexplorer/'
              ]
        }
      />
      <SEO
        title={t('home.title', { explorerName, nativeCurrency })}
        titleWithNetwork="true"
        description={t('home.description', { explorerName, nativeCurrency })}
      />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonWebsite) }} />
      </Head>

      <div className="center">
        <h1 className="landing-h1">{t('explorer.header.main', { explorerName })}</h1>
      </div>

      <SearchBlock tab="explorer" />

      <Ads showAds={showAds} heightNoAds={30} />

      <Products />

      {!devNet && (
        <div className="flex flex-center">
          <div className="home-converter">
            <Converter
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              chartPeriod={chartPeriod}
            />
          </div>
          <div className="home-price-chart">
            <PriceChart
              currency={selectedCurrency}
              chartPeriod={chartPeriod}
              setChartPeriod={setChartPeriod}
              hideToolbar={true}
            />
          </div>
        </div>
      )}

      <div className="home-whale-transactions">
        <Whales currency={selectedCurrency} />
      </div>

      <div className="home-statistics">
        <Statistics />
      </div>
    </>
  )
}
