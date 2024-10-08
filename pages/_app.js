import { useRouter } from 'next/router'
import { useState } from 'react'
import Head from 'next/head'
import axios from 'axios'
import { appWithTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'

import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import SignForm from '../components/SignForm'
import ScrollToTop from '../components/Layout/ScrollToTop'
import BackgroundImage from '../components/Layout/BackgroundImage'

const TopLinks = dynamic(() => import('../components/Layout/TopLinks'), { ssr: false })
const TopProgressBar = dynamic(() => import('../components/TopProgressBar'), { ssr: false })

import { IsSsrMobileContext } from '../utils/mobile'
import { isValidUUID, network, server, useLocalStorage, subscriptionExpired, nativeCurrency, useCookie } from '../utils'

import '../styles/ui.scss'
import '../styles/components/nprogress.css'

import { ThemeProvider } from '../components/Layout/ThemeContext'

const MyApp = ({ Component, pageProps }) => {
  const [account, setAccount] = useLocalStorage('account')
  const [selectedCurrency, setSelectedCurrency] = useCookie('currency', 'usd')
  const [signRequest, setSignRequest] = useState(false)
  const [refreshPage, setRefreshPage] = useState('')

  const router = useRouter()

  const { uuid } = router.query

  const signOut = () => {
    localStorage.removeItem('xummUserToken')
    setAccount({
      ...account,
      address: null,
      hashicon: null,
      username: null
    })
  }

  const signOutPro = () => {
    localStorage.removeItem('sessionToken')
    setAccount({
      ...account,
      pro: null
    })
    window.location.reload()
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY
    axios.defaults.baseURL = server + '/api/'
  } else {
    axios.defaults.baseURL = server + '/api/cors/'
  }

  const pathname = router.pathname
  const pagesWithoutWrapper = ['/social-share']

  const showAds = subscriptionExpired && nativeCurrency === 'XRP'
  let showTopAds = false //showAds // change here when you want to see TOP ADS
  const pagesWithNoTopAdds = [
    '/',
    '/username',
    '/eaas',
    '/build-unl',
    '/disclaimer',
    '/privacy-policy',
    '/terms-and-conditions',
    '/press',
    '/404'
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
        <ThemeProvider>
          <div className="body" data-network={network}>
            <Header
              setSignRequest={setSignRequest}
              account={account}
              signOut={signOut}
              signOutPro={signOutPro}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
            />
            <ScrollToTop />
            {(signRequest || isValidUUID(uuid)) && (
              <SignForm
                setSignRequest={setSignRequest}
                account={account}
                setAccount={setAccount}
                signRequest={signRequest}
                uuid={uuid}
                setRefreshPage={setRefreshPage}
              />
            )}
            <div className="content">
              <TopProgressBar />
              {showTopAds && <TopLinks />}
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
              />
            </div>
            <BackgroundImage />
            <Footer setSignRequest={setSignRequest} account={account} />
          </div>
        </ThemeProvider>
      </IsSsrMobileContext.Provider>
    </>
  )
}

export default appWithTranslation(MyApp)
