import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'
import Head from 'next/head'

import { server, explorerName, nativeCurrency, devNet, xahauNetwork, wssServer } from '../utils'
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

let ws = null

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

function sendData() {
  if (ws.readyState) {
    //{ command: "subscribe", streams: ["whale_transactions"], currency: true, service: true, id: 1 }
    ws.send(
      JSON.stringify({
        command: 'subscribe',
        streams: ['statistics', 'whale_transactions'],
        id: 1,
        limit: 10
      })
    )
  } else {
    setTimeout(sendData, 1000)
  }
}

export default function Home({ selectedCurrency, setSelectedCurrency, showAds, fiatRate }) {
  const { t } = useTranslation()

  const [chartPeriod, setChartPeriod] = useState('one_day')
  const [whaleTransactions, setWhaleTransactions] = useState(null)
  const [statistics, setStatistics] = useState(null)

  const imagePath = server + '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  const connect = () => {
    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      sendData()
    }

    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      if (message.type === 'statistics') {
        setStatistics(message)
      } else {
        //type === 'WhaleTransactions'
        setWhaleTransactions(message.transactions)
      }
    }

    ws.onclose = () => {
      connect()
    }
  }

  useEffect(() => {
    connect()
    return () => {
      setWhaleTransactions(null)
      if (ws) ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        images={[
          {
            width: 1200,
            height: 630,
            file: 'previews/1200x630/index.png'
          },
          {
            width: 630,
            height: 630,
            file: 'previews/630x630/index.png'
          }
        ]}
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
              fiatRate={fiatRate}
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
        <Whales currency={selectedCurrency} data={whaleTransactions} setData={setWhaleTransactions} />
      </div>

      <div className="home-statistics">
        <Statistics data={statistics} setData={setStatistics} />
      </div>
    </>
  )
}
