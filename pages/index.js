import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'
import Head from "next/head"

import { server, explorerName, nativeCurrency, devNet } from '../utils'
import { getIsSsrMobile } from "../utils/mobile"

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import Whales from '../components/Home/Whales'
import Converter from "../components/Home/Converter"
import PriceChart from "../components/Home/PriceChart"
import Statistics from "../components/Home/Statistics"
import Ads from '../components/Home/Ads'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

const ldJsonWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "XRP Explorer",
  "alternateName": ["XRP Explorer", "XRPL Explorer", "Scan XRP Ledger"],
  "url": server,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": server + "/explorer/?r={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}

export default function Home({ selectedCurrency, setSelectedCurrency, showAds }) {
  const { t } = useTranslation()

  const [chartPeriod, setChartPeriod] = useState('one_day')

  return (
    <>
      <LogoJsonLd
        logo={server + '/images/logo.svg'}
        url={server}
      />
      <SocialProfileJsonLd
        type="Organization"
        name="Bithomp"
        url={server}
        sameAs={[
          'http://instagram.com/bithomp',
          'https://twitter.com/bithomp',
          'https://www.youtube.com/@bithomp',
          'https://www.linkedin.com/company/bithomp/'
        ]}
      />
      <SEO
        title={t("home.title", { explorerName, nativeCurrency })}
        titleWithNetwork="true"
        description={t("home.description", { explorerName, nativeCurrency })}
        images={
          [
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
          ]
        }
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJsonWebsite) }}
        />
      </Head>

      <div className="top-links">
        <a
          href="https://bithomp.com/go/contest-landing"
          rel="noreferrer"
          className='top-link orange'
        >
          Win 100, 200, or 300 XRP from Bithomp
        </a>
      </div>

      <SearchBlock tab="explorer" />

      {showAds &&
        <div className="home-sponsored">
          <Ads />
        </div>
      }

      {!devNet && selectedCurrency &&
        <>
          <div className="home-converter">
            <Converter selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} chartPeriod={chartPeriod} />
          </div>
          <div className="home-price-chart">
            <PriceChart currency={selectedCurrency} chartPeriod={chartPeriod} setChartPeriod={setChartPeriod} />
          </div>
        </>
      }

      <div className="home-whale-transactions">
        <Whales currency={selectedCurrency} />
      </div>

      <div className="home-statistics">
        <Statistics />
      </div>
    </>
  )
}