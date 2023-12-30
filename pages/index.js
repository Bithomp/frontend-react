import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import { SiteLinksSearchBoxJsonLd, LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { useWidth, server, explorerName, nativeCurrency, devNet } from '../utils'
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

export default function Home({ selectedCurrency, setSelectedCurrency, showAds }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const [chartPeriod, setChartPeriod] = useState('one_day')

  return (
    <>
      <LogoJsonLd
        logo={server + '/images/logo.svg'}
        url={server}
      />
      <SiteLinksSearchBoxJsonLd
        url={server}
        potentialActions={[
          {
            target: server + '/explorer/?r',
            queryInput: 'search_term_string',
          }
        ]}
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
      <SearchBlock searchPlaceholderText={windowWidth < 500 ? t("home.search-placeholder-short") : t("home.search-placeholder")} tab="explorer" />

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