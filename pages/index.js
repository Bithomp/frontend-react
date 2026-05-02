import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { server, explorerName, nativeCurrency, xahauNetwork, ledgerName, network } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import Ads from '../components/Layout/Ads'
import FeaturedCard from '../components/Home/FeaturedCard'
import styles from '@/styles/components/home-teaser.module.scss'

import dynamic from 'next/dynamic'
import { currencyServer } from '../utils/axios'
import {
  emptyHomeTeasers,
  fetchTeaserAmendmentsClient,
  fetchTeaserAmmsClient,
  fetchTeaserDappsClient,
  fetchTeaserNftCollectionsClient,
  fetchTeaserTokensClient,
  fetchTeaserValidatorsClient
} from '../utils/homeTeaserClientData'
//not indexed
const HomeTeaserPlaceholder = () => (
  <div className="home-widget-placeholder home-widget-placeholder--teaser-card" aria-hidden="true">
    <div className="home-widget-placeholder__header">
      <span />
      <span />
    </div>
    <div className="home-widget-placeholder__rows">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  </div>
)

const initialTeaserLoading = {
  dapps: true,
  tokens: true,
  nftCollections: true,
  amms: true,
  validators: true,
  amendments: true
}

const Converter = dynamic(() => import('../components/Home/Converter'), {
  ssr: false,
  loading: () => <div className="home-widget-placeholder home-widget-placeholder--converter" aria-hidden="true" />
})
const PriceChart = dynamic(() => import('../components/Home/PriceChart'), {
  ssr: false,
  loading: () => <div className="home-widget-placeholder home-widget-placeholder--chart" aria-hidden="true" />
})
const Whales = dynamic(() => import('../components/Home/Whales'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const Statistics = dynamic(() => import('../components/Home/Statistics'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const TeaserTopDapps = dynamic(() => import('../components/Home/TeaserTopDapps'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const TeaserTopTokens = dynamic(() => import('../components/Home/TeaserTopTokens'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const TeaserTopNftCollections = dynamic(() => import('../components/Home/TeaserTopNftCollections'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const TeaserTopAmms = dynamic(() => import('../components/Home/TeaserTopAmms'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const TeaserTopValidators = dynamic(() => import('../components/Home/TeaserTopValidators'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})
const TeaserTopAmendments = dynamic(() => import('../components/Home/TeaserTopAmendments'), {
  ssr: false,
  loading: HomeTeaserPlaceholder
})

function LazyHomeWidget({ children, placeholder, rootMargin = '0px 0px 120px 0px', minDelayMs = 0 }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [canLoad, setCanLoad] = useState(minDelayMs <= 0)

  useEffect(() => {
    if (canLoad || minDelayMs <= 0) return undefined

    const timeoutId = window.setTimeout(() => setCanLoad(true), minDelayMs)
    const handleInteraction = () => setCanLoad(true)
    const options = { passive: true, once: true }

    window.addEventListener('pointerdown', handleInteraction, options)
    window.addEventListener('touchstart', handleInteraction, options)
    window.addEventListener('keydown', handleInteraction, { once: true })

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('pointerdown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [canLoad, minDelayMs])

  useEffect(() => {
    if (ready || !isVisible || !canLoad) return undefined
    setReady(true)
  }, [canLoad, isVisible, ready])

  useEffect(() => {
    if (ready || isVisible) return undefined

    const element = ref.current
    if (!element || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      { rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [isVisible, ready, rootMargin])

  return <div ref={ref}>{ready ? children : placeholder}</div>
}

export async function getServerSideProps(context) {
  const { locale, req, res } = context
  const selectedCurrencyServer = currencyServer(req)
  res.setHeader('Cache-Control', 'private, no-cache, max-age=0, must-revalidate')

  return {
    props: {
      selectedCurrencyServer,
      initialLocale: locale || 'en',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'faucet', 'products']))
    }
  }
}

export default function Home({
  initialLocale,
  selectedCurrency: selectedCurrencyApp,
  setSelectedCurrency,
  showAds,
  fiatRate,
  selectedCurrencyServer,
  countryCode,
  isSsrMobile,
  statistics,
  whaleTransactions,
  setStatistics,
  setWhaleTransactions,
  teaserDapps = [],
  teaserTokens = [],
  teaserNftCollections = [],
  teaserAmms = [],
  teaserValidators = [],
  teaserAmendments = []
}) {
  const { t } = useTranslation()
  const isEnglishLikeLocale = !initialLocale || initialLocale === 'default' || initialLocale === 'en'
  const isEnglishMainnetHome = network === 'mainnet' && !xahauNetwork && isEnglishLikeLocale
  const isEnglishTestnetHome = network === 'testnet' && isEnglishLikeLocale
  const isEnglishDevnetHome = network === 'devnet' && isEnglishLikeLocale

  const pageTitle = isEnglishMainnetHome
    ? `${explorerName} | Search ${nativeCurrency} Transactions, Accounts, NFTs, and Ledger Data`
    : isEnglishTestnetHome
      ? 'XRPL Testnet Explorer & Faucet — Free Test XRP and RLUSD'
      : isEnglishDevnetHome
        ? 'XRPL Devnet Explorer & Faucet — Free Test XRP for Developers'
        : t('home.title', { explorerName, nativeCurrency })
  const pageDescription = isEnglishMainnetHome
    ? `${explorerName} lets you search and scan ${nativeCurrency} addresses, transactions, tokens, NFTs, balances, and on-chain activity on the ${ledgerName}. Trade, mint NFTs, manage AMMs, submit transactions, and use account tools.`
    : isEnglishTestnetHome
      ? 'XRPL Testnet explorer and faucet by Bithomp. Search testnet transactions, accounts, tokens, and NFTs, and get free test XRP and RLUSD for development.'
      : isEnglishDevnetHome
        ? 'XRPL Devnet explorer and faucet by Bithomp. Search devnet transactions, accounts, tokens, and NFTs, and get free test XRP for development.'
        : t('home.description', { explorerName, nativeCurrency, ledgerName })
  const pageHeading = isEnglishMainnetHome
    ? `${nativeCurrency} Explorer and Ledger Tools`
    : isEnglishTestnetHome
      ? 'XRPL Testnet Explorer and Faucet'
      : isEnglishDevnetHome
        ? 'XRPL Devnet Explorer and Faucet'
        : t('home.h1', { nativeCurrency, ledgerName })
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  let selectedCurrency = selectedCurrencyServer
  if (isHydrated && selectedCurrencyApp) {
    selectedCurrency = selectedCurrencyApp
  }

  const [chartPeriod, setChartPeriod] = useState('one_day')
  const [homeTeasers, setHomeTeasers] = useState({
    ...emptyHomeTeasers,
    dapps: teaserDapps,
    tokens: teaserTokens,
    nftCollections: teaserNftCollections,
    amms: teaserAmms,
    validators: teaserValidators,
    amendments: teaserAmendments
  })
  const [teasersLoading, setTeasersLoading] = useState(initialTeaserLoading)
  const loadedTeaserCurrencyRef = useRef('')

  useEffect(() => {
    if (!selectedCurrency || loadedTeaserCurrencyRef.current === selectedCurrency) return undefined

    let cancelled = false
    const timeoutIds = []
    const fastDelay = isSsrMobile ? 1200 : 900
    const slowDelay = isSsrMobile ? 12000 : 4500

    setHomeTeasers(emptyHomeTeasers)
    setTeasersLoading(initialTeaserLoading)

    const tasks = [
      {
        key: 'amms',
        delay: fastDelay,
        fetcher: () => (xahauNetwork ? [] : fetchTeaserAmmsClient())
      },
      {
        key: 'tokens',
        delay: fastDelay,
        fetcher: () => fetchTeaserTokensClient(selectedCurrency)
      },
      {
        key: 'amendments',
        delay: fastDelay,
        fetcher: fetchTeaserAmendmentsClient
      },
      {
        key: 'dapps',
        delay: slowDelay,
        fetcher: () => (xahauNetwork ? [] : fetchTeaserDappsClient(selectedCurrency))
      },
      {
        key: 'validators',
        delay: slowDelay,
        fetcher: fetchTeaserValidatorsClient
      },
      {
        key: 'nftCollections',
        delay: slowDelay,
        fetcher: () => (xahauNetwork ? [] : fetchTeaserNftCollectionsClient(selectedCurrency))
      }
    ]

    for (const task of tasks) {
      const timeoutId = window.setTimeout(async () => {
        try {
          const data = await task.fetcher()
          if (!cancelled) {
            setHomeTeasers((current) => ({ ...current, [task.key]: data }))
          }
        } catch (error) {
          if (!cancelled) {
            setHomeTeasers((current) => ({ ...current, [task.key]: [] }))
          }
        } finally {
          if (!cancelled) {
            setTeasersLoading((current) => ({ ...current, [task.key]: false }))
          }
        }
      }, task.delay)
      timeoutIds.push(timeoutId)
    }

    loadedTeaserCurrencyRef.current = selectedCurrency

    return () => {
      cancelled = true
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [isSsrMobile, selectedCurrency])

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
                'XRPL Explorer',
                'XRP Scan',
                'Scan XRP Ledger',
                'XRP Ledger Tracker',
                'XRP Transaction Tracker',
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
        title={pageTitle}
        titleWithNetwork="true"
        description={pageDescription}
        descriptionWithNetwork="true"
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
        <h1 className="center">{pageHeading}</h1>
        <p className="center">{t('explorer.header.sub', { nativeCurrency })}</p>
        {isEnglishMainnetHome && (
          <p className="center home-direct-lookup">
            <span>Need direct lookup?</span>{' '}
            <span className="home-direct-lookup-action">
              Open the <Link href="/explorer" prefetch={false}>XRP Ledger search page</Link>.
            </span>
          </p>
        )}
        {showAds && <Ads countryCode={countryCode} />}
      </section>

      <section className="home-section home-section-discovery">
        <div className="home-dashboard">
          {/* Begin: Discovery Widgets Grid */}
          <div className="home-widgets-grid">
            <div className="home-widget home-widget--compact-stat">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <Statistics
                  data={statistics}
                  setData={setStatistics}
                  title={t('home.stat.header', { ledgerName })}
                  mode="activity"
                />
              </LazyHomeWidget>
            </div>

            <div className="home-widget home-widget--compact-stat">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <Statistics data={statistics} setData={setStatistics} mode="ledger" fetchOnMount={false} />
              </LazyHomeWidget>
            </div>

            <div className="home-widget home-widget--compact-stat">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <Statistics data={statistics} setData={setStatistics} mode="network" fetchOnMount={false} />
              </LazyHomeWidget>
            </div>

            <div className="home-widget">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <Whales currency={selectedCurrency} data={whaleTransactions} setData={setWhaleTransactions} />
              </LazyHomeWidget>
            </div>

            {!xahauNetwork && (
              <div className="home-widget">
                <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                  <TeaserTopAmms
                    data={homeTeasers.amms}
                    isLoading={teasersLoading.amms}
                    fiatRate={fiatRate}
                    selectedCurrency={selectedCurrency}
                  />
                </LazyHomeWidget>
              </div>
            )}

            <div className="home-widget">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <TeaserTopTokens data={homeTeasers.tokens} isLoading={teasersLoading.tokens} />
              </LazyHomeWidget>
            </div>

            <div className="home-widget">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <TeaserTopAmendments data={homeTeasers.amendments} isLoading={teasersLoading.amendments} />
              </LazyHomeWidget>
            </div>

            <div className="home-widget">
              <LazyHomeWidget placeholder={<div className="home-widget-placeholder home-widget-placeholder--converter" aria-hidden="true" />}>
                <FeaturedCard className={styles.livePriceCard} title={t('home.price.header', { nativeCurrency })}>
                  <Converter
                    selectedCurrency={selectedCurrency}
                    setSelectedCurrency={setSelectedCurrency}
                    chartPeriod={chartPeriod}
                    fiatRate={fiatRate}
                  />
                </FeaturedCard>
              </LazyHomeWidget>
            </div>

            <div className="home-widget">
              <LazyHomeWidget
                placeholder={<div className="home-widget-placeholder home-widget-placeholder--chart" aria-hidden="true" />}
                rootMargin="0px 0px 220px 0px"
                minDelayMs={isSsrMobile ? 5000 : 0}
              >
                <FeaturedCard
                  className={styles.chartCard}
                  title={t('home.price.chartHeader', { nativeCurrency })}
                  headerActions={
                    <>
                      {(selectedCurrency === 'eur' || selectedCurrency === 'usd') && (
                        <button
                          type="button"
                          onClick={() => setChartPeriod('one_day')}
                          className={`${styles.cardHeaderActionButton} ${chartPeriod === 'one_day' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                        >
                          1D
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setChartPeriod('one_week')}
                        className={`${styles.cardHeaderActionButton} ${chartPeriod === 'one_week' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                      >
                        1W
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('one_month')}
                        className={`${styles.cardHeaderActionButton} ${chartPeriod === 'one_month' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                      >
                        1M
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('six_months')}
                        className={`${styles.cardHeaderActionButton} ${chartPeriod === 'six_months' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                      >
                        6M
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('one_year')}
                        className={`${styles.cardHeaderActionButton} ${chartPeriod === 'one_year' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                      >
                        1Y
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('ytd')}
                        className={`${styles.cardHeaderActionButton} ${chartPeriod === 'ytd' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                      >
                        YTD
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('all')}
                        className={`${styles.cardHeaderActionButton} ${chartPeriod === 'all' ? styles.cardHeaderActionButtonActive : ''}`.trim()}
                      >
                        ALL
                      </button>
                    </>
                  }
                >
                  <PriceChart
                    currency={selectedCurrency}
                    chartPeriod={chartPeriod}
                    setChartPeriod={setChartPeriod}
                    hideToolbar={true}
                    liveFiatRate={fiatRate}
                  />
                </FeaturedCard>
              </LazyHomeWidget>
            </div>

            {!xahauNetwork && (
              <div className="home-widget">
                <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                  <TeaserTopDapps data={homeTeasers.dapps} isLoading={teasersLoading.dapps} />
                </LazyHomeWidget>
              </div>
            )}

            <div className="home-widget">
              <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                <TeaserTopValidators data={homeTeasers.validators} isLoading={teasersLoading.validators} />
              </LazyHomeWidget>
            </div>

            {!xahauNetwork && (
              <div className="home-widget">
                <LazyHomeWidget placeholder={<HomeTeaserPlaceholder />}>
                  <TeaserTopNftCollections data={homeTeasers.nftCollections} isLoading={teasersLoading.nftCollections} />
                </LazyHomeWidget>
              </div>
            )}
          </div>
          {/* End: Discovery Widgets Grid */}
        </div>
      </section>
    </>
  )
}
