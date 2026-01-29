import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { server, explorerName, nativeCurrency, devNet, xahauNetwork, ledgerName } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import SearchBlock from '../components/Layout/SearchBlock'
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
  isSsrMobile,
  selectedCurrencyServer,
  countryCode
}) {
  const { t } = useTranslation()

  let selectedCurrency = selectedCurrencyServer
  if (selectedCurrencyApp) {
    selectedCurrency = selectedCurrencyApp
  }

  const [chartPeriod, setChartPeriod] = useState('one_day')
  const [whaleTransactions, setWhaleTransactions] = useState(null)
  const [statistics, setStatistics] = useState(null)

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
        <h1 className="center">
          {t('explorer.header.main', {
            explorerName: !devNet && !xahauNetwork ? 'XRP ' + t('table.ledger') : explorerName
          })}
        </h1>
        <p className="center">{t('explorer.header.sub', { nativeCurrency })}</p>
        <SearchBlock tab="explorer" isSsrMobile={isSsrMobile} type="explorer" />
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
