import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import axios from 'axios'
import { appWithTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'
import { GoogleAnalytics } from '@next/third-parties/google'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

const SignForm = dynamic(() => import('../components/SignForm'), { ssr: false })
const EmailLoginPopup = dynamic(() => import('../components/EmailLoginPopup'), { ssr: false })
import TopLinks from '../components/Layout/TopLinks'
const TopProgressBar = dynamic(() => import('../components/TopProgressBar'), { ssr: false })

import { IsSsrMobileContext } from '@/utils/mobile'
import { getBackgroundImage } from '@/utils/backgroundImage'
import { isValidUUID, network, server, useLocalStorage, useCookie, xahauNetwork, networkId } from '@/utils'
import { useEmailLogin } from '@/hooks/useEmailLogin'

import { getAppMetadata } from '@walletconnect/utils'
const WalletConnectModalSign = dynamic(
  () => import('@walletconnect/modal-sign-react').then((mod) => mod.WalletConnectModalSign),
  { ssr: false }
)

import '../styles/globals.css'
import '../styles/ui.scss'
import '../styles/components/nprogress.css'

import { ThemeProvider } from '../components/Layout/ThemeContext'
import { fetchCurrentFiatRate } from '../utils/common'
import ErrorBoundary from '../components/ErrorBoundary'
import { ledgerwalletDisconnect } from '../utils/ledgerwallet'

const Header = dynamic(() => import('../components/Layout/Header'), { ssr: true })
const Footer = dynamic(() => import('../components/Layout/Footer'), { ssr: true })
const ScrollToTop = dynamic(() => import('../components/Layout/ScrollToTop'), { ssr: true })

function useIsBot() {
  const [isBot, setIsBot] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const botKeywords = ['bot', 'crawl', 'slurp', 'spider']

    const isBotUA = botKeywords.some((keyword) => ua.includes(keyword))
    setIsBot(isBotUA)
  }, [])

  return isBot
}

// Helper to extract main route: "/en/account/xyz/123" -> "/account"
const getMainPath = (url) => {
  const path = url.split('?')[0] // remove query
  const parts = path.split('/').filter(Boolean) // remove empty segments
  // If first part is a 2-letter locale, skip it
  const startIndex = parts[0] && parts[0].length === 2 ? 1 : 0
  return parts.length > startIndex ? `/${parts[startIndex]}` : '/'
}

const MyApp = ({ Component, pageProps }) => {
  const firstRenderRef = useRef(true)
  const [account, setAccount] = useLocalStorage('account')
  const [sessionToken, setSessionToken] = useLocalStorage('sessionToken')
  const [selectedCurrency, setSelectedCurrency] = useCookie('currency', 'usd')
  const [fiatRate, setFiatRate] = useState(0)
  const [proExpire, setProExpire] = useCookie('pro-expire')
  const [subscriptionExpired, setSubscriptionExpired] = useState(
    proExpire ? Number(proExpire) < new Date().getTime() : true
  )
  const [signRequest, setSignRequest] = useState(false)
  const [refreshPage, setRefreshPage] = useState('')
  const [wcSession, setWcSession] = useState(null)
  const [isClient, setIsClient] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [countryCode, setCountryCode] = useState('')

  const { isEmailLoginOpen, openEmailLogin, closeEmailLogin, handleLoginSuccess } = useEmailLogin()

  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)
  }, [])

  const router = useRouter()
  const isBot = useIsBot()

  useEffect(() => {
    if (!GA_ID) return
    if (typeof window === 'undefined') return

    const sendPageView = (url) => {
      if (!window.gtag) return

      const mainPath = getMainPath(url) // e.g. "/account", "/nft", "/tokens"

      window.gtag('event', 'page_view', {
        page_path: mainPath,
        page_location: window.location.origin + mainPath,
        page_title: document.title,
        main_route: mainPath
      })
    }

    sendPageView(window.location.pathname + window.location.search)

    const handleRouteChange = (url) => sendPageView(url)

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router])

  //check country
  useEffect(() => {
    async function fetchData() {
      // {"ip":"176.28.256.49","country":"SE"}
      const clientInfo = await axios('client/info')
      setCountryCode(clientInfo?.data?.country)
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    //pages where we need to show the latest fiat price
    const allowedRoutes = [
      '/',
      '/account',
      '/account/[id]',
      '/account/[id]/transactions',
      '/amms',
      '/distribution',
      '/admin/watchlist',
      '/nft/[[...id]]',
      '/tokens',
      '/nft-collection/[id]',
      '/token/[[...id]]'
    ]
    const skipOnFirstRender = [
      '/',
      '/account',
      '/account/[id]',
      '/account/[id]/transactions',
      '/amms',
      '/tokens',
      '/token/[[...id]]'
    ]

    // Skip fetch on first render for pages that get on the server side
    if (firstRenderRef.current && skipOnFirstRender.includes(router.pathname)) {
      firstRenderRef.current = false
      return
    }

    if (allowedRoutes.includes(router.pathname)) {
      fetchCurrentFiatRate(selectedCurrency, setFiatRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, router.pathname])

  useEffect(() => {
    setSubscriptionExpired(proExpire ? Number(proExpire) < new Date().getTime() : true)
  }, [proExpire])

  useEffect(() => {
    if (sessionToken) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken?.replace(/['"]+/g, '')
    }
  }, [sessionToken])

  const { uuid } = router.query

  const signOut = async () => {
    localStorage.removeItem('xamanUserToken')
    if (account?.wallet === 'ledgerwallet') {
      await ledgerwalletDisconnect()
    }
    setWcSession(null)
    setAccount({
      ...account,
      address: null,
      username: null,
      wallet: null
    })
  }

  const signOutPro = () => {
    setSessionToken('')
    setProExpire('0')
    setAccount({
      ...account,
      pro: null
    })
  }

  const saveAddressData = async ({ address, wallet }) => {
    //&service=true&verifiedDomain=true&blacklist=true&payString=true&twitterImageUrl=true&nickname=true
    const response = await axios('v2/address/' + address + '?username=true')
    if (response.data) {
      const { username } = response.data
      setAccount({ ...account, address, username, wallet })
    } else {
      setAccount({
        ...account,
        address: null,
        username: null,
        wallet: null
      })
    }
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY
    axios.defaults.baseURL = server + '/api/'
  } else {
    axios.defaults.baseURL = server + '/api/cors/'
  }

  const pathname = router.pathname
  const pagesWithoutWrapper = ['/social-share']

  const showAds = (subscriptionExpired || !account?.pro) && !xahauNetwork
  let showTopAds = showAds // change here when you want to see TOP ADS
  const pagesWithNoTopAdds = [
    '/',
    '/username',
    '/eaas',
    '/build-unl',
    '/disclaimer',
    '/privacy-policy',
    '/terms-and-conditions',
    '/press',
    '/404',
    '/faucet',
    '/explorer'
  ]
  if (showTopAds) {
    showTopAds = !pagesWithNoTopAdds.includes(pathname) && !pathname.includes('/admin')
  }

  if (pagesWithoutWrapper.includes(pathname)) {
    return <Component />
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>
      <IsSsrMobileContext.Provider value={pageProps.isSsrMobile}>
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
        <ThemeProvider>
          <ErrorBoundary>
            <div className="body" data-network={network} style={{ backgroundImage: getBackgroundImage() }}>
              <Header
                setSignRequest={setSignRequest}
                account={account}
                signOut={signOut}
                signOutPro={signOutPro}
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
                countryCode={countryCode}
              />
              <ScrollToTop />
              {/* available only on the mainnet and testnet, only on the client side, only when online */}
              {(networkId === 0 || networkId === 1) && isClient && isOnline && !isBot && (
                <WalletConnectModalSign projectId={process.env.NEXT_PUBLIC_WALLETCONNECT} metadata={getAppMetadata()} />
              )}
              {(signRequest || isValidUUID(uuid)) && (
                <SignForm
                  setSignRequest={setSignRequest}
                  account={account}
                  setAccount={setAccount}
                  signRequest={signRequest}
                  uuid={uuid}
                  setRefreshPage={setRefreshPage}
                  saveAddressData={saveAddressData}
                  wcSession={wcSession}
                  setWcSession={setWcSession}
                />
              )}
              {isEmailLoginOpen && (
                <EmailLoginPopup
                  isOpen={isEmailLoginOpen}
                  onClose={closeEmailLogin}
                  onSuccess={handleLoginSuccess}
                  setAccount={setAccount}
                  setProExpire={setProExpire}
                  setSessionToken={setSessionToken}
                />
              )}
              <div className="content">
                <TopProgressBar />
                {showTopAds && <TopLinks countryCode={countryCode} />}
                <Component
                  {...pageProps}
                  refreshPage={refreshPage}
                  setSignRequest={setSignRequest}
                  account={account}
                  setAccount={setAccount}
                  signOut={signOut}
                  selectedCurrency={selectedCurrency}
                  setSelectedCurrency={setSelectedCurrency}
                  showAds={showAds}
                  setProExpire={setProExpire}
                  signOutPro={signOutPro}
                  subscriptionExpired={subscriptionExpired}
                  setSubscriptionExpired={setSubscriptionExpired}
                  sessionToken={sessionToken}
                  setSessionToken={setSessionToken}
                  fiatRate={fiatRate}
                  openEmailLogin={openEmailLogin}
                  countryCode={countryCode}
                />
              </div>
              <Footer countryCode={countryCode} />
            </div>
          </ErrorBoundary>
        </ThemeProvider>
      </IsSsrMobileContext.Provider>
    </>
  )
}

export default appWithTranslation(MyApp)
