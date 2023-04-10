import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import { SiteLinksSearchBoxJsonLd, LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { useLocalStorage, useWidth, server } from '../utils'
import { useIsMobile, getIsSsrMobile } from "../utils/mobile"

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
import Whales from '../components/Home/Whales'
import Converter from "../components/Home/Converter"
import PriceChart from "../components/Home/PriceChart"
import Statistics from "../components/Home/Statistics"

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Home({ devNet }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()
  const isMobile = useIsMobile()

  const [selectedCurrency, setSelectedCurrency] = useLocalStorage('currency', 'usd')
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
        title={t("home.title")}
        description={t("home.description")}
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
      {!devNet &&
        <div className="home-sponsored">
          <a href="https://bithomp.com/go/buy-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src="/images/btcbit.svg" className="sponsored-brand-icon" alt="buy xrp" />
              <div className="sponsored-brand-title">Buy XRP</div>
              <div className="sponsored-brand-text">Instantly buy and sell cryptocurrency with low commission.</div>
            </div>
          </a>
          <a href="https://bithomp.com/go/earn-on-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src="/images/nexo.svg" className="sponsored-brand-icon" alt="earn on xrp" />
              <div className="sponsored-brand-title">Earn on XRP</div>
              <div className="sponsored-brand-text">Earn up to 12% APR on XRP.</div>
            </div>
          </a>
        </div>
      }
      {!devNet && selectedCurrency &&
        <>
          <div className="home-converter">
            <Converter selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} chartPeriod={chartPeriod} isMobile={isMobile} />
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