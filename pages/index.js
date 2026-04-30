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
import TeaserTopDapps from '../components/Home/TeaserTopDapps'
import TeaserTopTokens from '../components/Home/TeaserTopTokens'
import TeaserTopNftCollections from '../components/Home/TeaserTopNftCollections'
import TeaserTopAmms from '../components/Home/TeaserTopAmms'
import TeaserTopValidators from '../components/Home/TeaserTopValidators'
import TeaserTopAmendments from '../components/Home/TeaserTopAmendments'
import styles from '@/styles/components/home-teaser.module.scss'

import dynamic from 'next/dynamic'
import { currencyServer } from '../utils/axios'
import { emptyHomeTeasers, fetchHomeTeasersClient } from '../utils/homeTeaserClientData'
//not indexed
const Converter = dynamic(() => import('../components/Home/Converter'), {
  ssr: false,
  loading: () => <div className="home-widget-placeholder home-widget-placeholder--converter" aria-hidden="true" />
})
const PriceChart = dynamic(() => import('../components/Home/PriceChart'), {
  ssr: false,
  loading: () => <div className="home-widget-placeholder home-widget-placeholder--chart" aria-hidden="true" />
})
const Whales = dynamic(() => import('../components/Home/Whales'), { ssr: false })
const Statistics = dynamic(() => import('../components/Home/Statistics'), { ssr: false })

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
  const [teasersLoading, setTeasersLoading] = useState(true)
  const loadedTeaserCurrencyRef = useRef('')

  useEffect(() => {
    if (!selectedCurrency || loadedTeaserCurrencyRef.current === selectedCurrency) return undefined

    let cancelled = false
    let timeoutId = null

    setTeasersLoading(true)

    const fetchTeasers = async () => {
      try {
        const data = await fetchHomeTeasersClient(selectedCurrency)
        if (!cancelled) {
          loadedTeaserCurrencyRef.current = selectedCurrency
          setHomeTeasers({
            ...emptyHomeTeasers,
            ...data
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
        }
      } finally {
        if (!cancelled) {
          setTeasersLoading(false)
        }
      }
    }

    timeoutId = window.setTimeout(fetchTeasers, 4500)

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [selectedCurrency])

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
          <p className="center">
            Need direct lookup? Open the <Link href="/explorer">XRP Ledger search page</Link>.
          </p>
        )}
        {showAds && <Ads countryCode={countryCode} />}
      </section>

      <section className="home-section home-section-discovery">
        <div className="home-dashboard">
          {/* Begin: Discovery Widgets Grid */}
          <div className="home-widgets-grid">
            {/* Price Tools Section */}
            <div className="home-widget">
              <FeaturedCard className={styles.livePriceCard} title={t('home.price.header', { nativeCurrency })}>
                <Converter
                  selectedCurrency={selectedCurrency}
                  setSelectedCurrency={setSelectedCurrency}
                  chartPeriod={chartPeriod}
                  fiatRate={fiatRate}
                />
              </FeaturedCard>
            </div>

            <div className="home-widget">
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
            </div>

            <div className="home-widget home-widget--reserved-card">
              <Whales currency={selectedCurrency} data={whaleTransactions} setData={setWhaleTransactions} />
            </div>

            <div className="home-widget home-widget--reserved-card">
              <Statistics
                data={statistics}
                setData={setStatistics}
                title={t('home.stat.header', { ledgerName })}
                mode="activity"
              />
            </div>

            <div className="home-widget home-widget--reserved-card">
              <Statistics data={statistics} setData={setStatistics} mode="ledger" fetchOnMount={false} />
            </div>

            <div className="home-widget home-widget--reserved-card">
              <Statistics data={statistics} setData={setStatistics} mode="network" fetchOnMount={false} />
            </div>

            {/* Begin: Teaser Widgets - Each will be a HomeTeaser component */}
            {!xahauNetwork && (
              <div className="home-widget">
                <TeaserTopDapps data={homeTeasers.dapps} isLoading={teasersLoading} />
              </div>
            )}

            {!xahauNetwork && (
              <div className="home-widget">
                <TeaserTopNftCollections data={homeTeasers.nftCollections} isLoading={teasersLoading} />
              </div>
            )}

            <div className="home-widget">
              <TeaserTopTokens data={homeTeasers.tokens} isLoading={teasersLoading} />
            </div>

            {!xahauNetwork && (
              <div className="home-widget">
                <TeaserTopAmms
                  data={homeTeasers.amms}
                  isLoading={teasersLoading}
                  fiatRate={fiatRate}
                  selectedCurrency={selectedCurrency}
                />
              </div>
            )}

            <div className="home-widget">
              <TeaserTopValidators data={homeTeasers.validators} isLoading={teasersLoading} />
            </div>

            <div className="home-widget">
              <TeaserTopAmendments data={homeTeasers.amendments} isLoading={teasersLoading} />
            </div>
          </div>
          {/* End: Discovery Widgets Grid */}
        </div>
      </section>
    </>
  )
}
