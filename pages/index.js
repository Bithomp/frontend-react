import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import Head from 'next/head'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { server, explorerName, nativeCurrency, devNet, xahauNetwork, ledgerName } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import Ads from '../components/Layout/Ads'
import Converter from '../components/Home/Converter'
import PriceChart from '../components/Home/PriceChart'

import dynamic from 'next/dynamic'
import { getFiatRateServer } from '../utils/axios'
//not indexed
const Whales = dynamic(() => import('../components/Home/Whales'), { ssr: false })
const Statistics = dynamic(() => import('../components/Home/Statistics'), { ssr: false })

export async function getServerSideProps(context) {
  const { locale, req } = context
  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)
  return {
    props: {
      fiatRateServer,
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'faucet', 'products']))
    }
  }
}

export default function Home({
  selectedCurrency: selectedCurrencyApp,
  setSelectedCurrency,
  showAds,
  fiatRate,
  selectedCurrencyServer,
  countryCode,
  statistics,
  whaleTransactions,
  setStatistics,
  setWhaleTransactions
}) {
  const { t } = useTranslation()

  let selectedCurrency = selectedCurrencyServer
  if (selectedCurrencyApp) {
    selectedCurrency = selectedCurrencyApp
  }

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
                'http://instagram.com/bithomp/',
                'https://x.com/bithomp',
                'https://www.youtube.com/@bithomp',
                'https://www.linkedin.com/company/bithomp/'
              ]
            : [
                'https://www.instagram.com/bithomp/',
                'https://x.com/bithomp',
                'https://www.youtube.com/@bithomp',
                'https://www.linkedin.com/company/bithomp/'
              ]
        }
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: nativeCurrency + ' Explorer and Tools',
              alternateName: [
                nativeCurrency + ' Explorer',
                explorerName + ' Explorer',
                'Scan ' + nativeCurrency + ' Ledger'
              ],
              url: server,
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: server + '/explorer/{search_term_string}'
                },
                'query-input': 'required name=search_term_string'
              }
            })
          }}
        />
      </Head>
      <SEO
        title={t('home.title', { explorerName, nativeCurrency })}
        titleWithNetwork="true"
        description={t('home.description', { explorerName, nativeCurrency })}
        image={{
          width: 1200,
          height: 630,
          file: 'previews/1200x630/index.png'
        }}
        twitterImage={{
          file: 'previews/630x630/index.png'
        }}
      />

      <section className="home-section">
        <h1 className="center">{t('home.h1', { nativeCurrency })}</h1>
        <p className="center">{t('explorer.header.sub', { nativeCurrency })}</p>
        {showAds && <Ads countryCode={countryCode} />}
      </section>

      {!devNet && (
        <section className="home-section">
          <h2 className="center">{t('home.price.header', { nativeCurrency })}</h2>
          <div className="home-price-tools">
            <div className="home-converter">
              <Converter
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
                chartPeriod={chartPeriod}
                fiatRate={fiatRate}
              />
            </div>
            <div className="home-price-chart">
              <PriceChart
                currency={selectedCurrency}
                chartPeriod={chartPeriod}
                setChartPeriod={setChartPeriod}
                hideToolbar={true}
                liveFiatRate={fiatRate}
              />
            </div>
          </div>
        </section>
      )}

      <section className="home-section">
        <h2 className="center">{t('home.stat.header', { ledgerName })}</h2>
        <div className="home-whale-transactions">
          <Whales currency={selectedCurrency} data={whaleTransactions} setData={setWhaleTransactions} />
        </div>
        <div className="home-statistics">
          <Statistics data={statistics} setData={setStatistics} />
        </div>
      </section>
    </>
  )
}
