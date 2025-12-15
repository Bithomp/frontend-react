import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState, useEffect, useRef } from 'react'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { server, explorerName, nativeCurrency, devNet, xahauNetwork, wssServer, ledgerName } from '../utils'
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

let ws = null

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

function sendData(selectedCurrency) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        command: 'subscribe',
        streams: ['statistics', 'whale_transactions', 'rates'],
        currency: selectedCurrency,
        id: 1,
        limit: 3
      })
    )
  } else {
    setTimeout(() => sendData(selectedCurrency), 1000)
  }
}

function unsubscribeRates(currency) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        command: 'unsubscribe',
        streams: ['rates'],
        currency: currency,
        id: 2
      })
    )
  }
}

export default function Home({
  selectedCurrency: selectedCurrencyApp,
  setSelectedCurrency,
  showAds,
  fiatRate: fiatRateApp,
  isSsrMobile,
  selectedCurrencyServer,
  fiatRateServer,
  countryCode
}) {
  const { t } = useTranslation()

  let selectedCurrency = selectedCurrencyServer
  let fiatRate = fiatRateServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  const [chartPeriod, setChartPeriod] = useState('one_day')
  const [whaleTransactions, setWhaleTransactions] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [liveFiatRate, setLiveFiatRate] = useState(fiatRate)

  // Use ref to always get current currency in WebSocket message handler
  const selectedCurrencyRef = useRef(selectedCurrency)
  const previousCurrencyRef = useRef(null)

  const imagePath = server + '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  const connect = () => {
    try {
      ws = new WebSocket(wssServer)

      ws.onopen = () => {
        sendData(selectedCurrency)
      }

      ws.onmessage = (evt) => {
        const message = JSON.parse(evt.data)
        if (message.type === 'statistics') {
          setStatistics(message)
        } else if (message.type === 'rates') {
          const currentCurrency = selectedCurrencyRef.current
          setLiveFiatRate(message[currentCurrency])
        } else {
          //type === 'WhaleTransactions'
          setWhaleTransactions(message.transactions)
        }
      }

      ws.onclose = () => {
        // Reconnect after a short delay to avoid rapid reconnection attempts
        setTimeout(connect, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        // Close the connection to trigger onclose and reconnection
        if (ws) {
          ws.close()
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      // Retry connection after delay
      setTimeout(connect, 3000)
    }
  }

  useEffect(() => {
    setLiveFiatRate(fiatRate)
  }, [fiatRate])

  useEffect(() => {
    selectedCurrencyRef.current = selectedCurrency
    previousCurrencyRef.current = selectedCurrency
    if (navigator.onLine) {
      connect()
    }
    return () => {
      setWhaleTransactions(null)
      if (ws) ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update rates subscription when currency changes
  useEffect(() => {
    // Unsubscribe from previous currency if it exists
    if (previousCurrencyRef.current && previousCurrencyRef.current !== selectedCurrency) {
      unsubscribeRates(previousCurrencyRef.current)
    }

    // Update refs
    selectedCurrencyRef.current = selectedCurrency
    previousCurrencyRef.current = selectedCurrency

    // Subscribe to new currency
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendData(selectedCurrency)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

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
        <h1 className="center">{t('explorer.header.main', { explorerName })}</h1>
        <p className="center">{t('explorer.header.sub', { nativeCurrency })}</p>
        <SearchBlock tab="explorer" isSsrMobile={isSsrMobile} />
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
                fiatRate={liveFiatRate}
              />
            </div>
            <div className="home-price-chart">
              <PriceChart
                currency={selectedCurrency}
                chartPeriod={chartPeriod}
                setChartPeriod={setChartPeriod}
                hideToolbar={true}
                liveFiatRate={liveFiatRate}
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
