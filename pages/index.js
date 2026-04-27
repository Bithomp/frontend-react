import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { LogoJsonLd, SocialProfileJsonLd } from 'next-seo'

import { server, explorerName, nativeCurrency, xahauNetwork, ledgerName, network } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'
import Ads from '../components/Layout/Ads'
import Converter from '../components/Home/Converter'
import PriceChart from '../components/Home/PriceChart'
import FeaturedCard from '../components/Home/FeaturedCard'
import TeaserTopDapps from '../components/Home/TeaserTopDapps'
import TeaserTopTokens from '../components/Home/TeaserTopTokens'
import TeaserTopNftCollections from '../components/Home/TeaserTopNftCollections'
import TeaserTopAmms from '../components/Home/TeaserTopAmms'
import TeaserTopValidators from '../components/Home/TeaserTopValidators'
import TeaserTopAmendments from '../components/Home/TeaserTopAmendments'
import styles from '@/styles/components/home-teaser.module.scss'

import dynamic from 'next/dynamic'
import { getFiatRateServer } from '../utils/axios'
import {
  fetchTeaserDapps,
  fetchTeaserTokens,
  fetchTeaserNftCollections,
  fetchTeaserAmms,
  fetchTeaserValidators,
  fetchTeaserAmendments
} from '../utils/homeTeaserData'
//not indexed
const Whales = dynamic(() => import('../components/Home/Whales'), { ssr: false })
const Statistics = dynamic(() => import('../components/Home/Statistics'), { ssr: false })

export async function getServerSideProps(context) {
  const { locale, req } = context
  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  // Fetch all teaser data in parallel
  const [teaserDapps, teaserTokens, teaserNftCollections, teaserAmms, teaserValidators, teaserAmendments] =
    await Promise.all([
      xahauNetwork ? [] : fetchTeaserDapps(req, selectedCurrencyServer),
      fetchTeaserTokens(req, selectedCurrencyServer),
      xahauNetwork ? [] : fetchTeaserNftCollections(req, selectedCurrencyServer),
      xahauNetwork ? [] : fetchTeaserAmms(req),
      fetchTeaserValidators(req),
      fetchTeaserAmendments(req)
    ])

  return {
    props: {
      fiatRateServer,
      selectedCurrencyServer,
      initialLocale: locale || 'en',
      isSsrMobile: getIsSsrMobile(context),
      teaserDapps,
      teaserTokens,
      teaserNftCollections,
      teaserAmms,
      teaserValidators,
      teaserAmendments,
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
    ? 'XRP Explorer & XRP Ledger Tools — Bithomp | Search Transactions, Accounts, NFTs'
    : isEnglishTestnetHome
      ? 'XRPL Testnet Explorer & Faucet — Free Test XRP and RLUSD'
      : isEnglishDevnetHome
        ? 'XRPL Devnet Explorer & Faucet — Free Test XRP for Developers'
        : t('home.title', { explorerName, nativeCurrency })
  const pageDescription = isEnglishMainnetHome
    ? 'XRP Explorer by Bithomp. Search XRP transactions, accounts, tokens, and NFTs, track balances, validate accounts, and explore the XRP Ledger.'
    : isEnglishTestnetHome
      ? 'XRPL Testnet explorer and faucet by Bithomp. Search testnet transactions, accounts, tokens, and NFTs, and get free test XRP and RLUSD for development.'
      : isEnglishDevnetHome
        ? 'XRPL Devnet explorer and faucet by Bithomp. Search devnet transactions, accounts, tokens, and NFTs, and get free test XRP for development.'
        : t('home.description', { explorerName, nativeCurrency })
  const pageHeading = isEnglishMainnetHome
    ? 'XRP Explorer and XRP Ledger Tools'
    : isEnglishTestnetHome
      ? 'XRPL Testnet Explorer and Faucet'
      : isEnglishDevnetHome
        ? 'XRPL Devnet Explorer and Faucet'
        : t('home.h1', { nativeCurrency })
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  let selectedCurrency = selectedCurrencyServer
  if (isHydrated && selectedCurrencyApp) {
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

      <section className="home-section">
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

            <div className="home-widget">
              <Whales currency={selectedCurrency} data={whaleTransactions} setData={setWhaleTransactions} />
            </div>

            <div className="home-widget">
              <Statistics
                data={statistics}
                setData={setStatistics}
                title={t('home.stat.header', { ledgerName })}
                mode="activity"
              />
            </div>

            <div className="home-widget">
              <Statistics data={statistics} setData={setStatistics} mode="ledger" fetchOnMount={false} />
            </div>

            <div className="home-widget">
              <Statistics data={statistics} setData={setStatistics} mode="network" fetchOnMount={false} />
            </div>

            {/* Begin: Teaser Widgets - Each will be a HomeTeaser component */}
            {!xahauNetwork && (
              <div className="home-widget">
                <TeaserTopDapps data={teaserDapps} isLoading={false} />
              </div>
            )}

            {!xahauNetwork && (
              <div className="home-widget">
                <TeaserTopNftCollections data={teaserNftCollections} isLoading={false} />
              </div>
            )}

            <div className="home-widget">
              <TeaserTopTokens data={teaserTokens} isLoading={false} />
            </div>

            {!xahauNetwork && (
              <div className="home-widget">
                <TeaserTopAmms
                  data={teaserAmms}
                  isLoading={false}
                  fiatRate={fiatRate}
                  selectedCurrency={selectedCurrency}
                />
              </div>
            )}

            <div className="home-widget">
              <TeaserTopValidators data={teaserValidators} isLoading={false} />
            </div>

            <div className="home-widget">
              <TeaserTopAmendments data={teaserAmendments} isLoading={false} />
            </div>
          </div>
          {/* End: Discovery Widgets Grid */}
        </div>
      </section>
    </>
  )
}
