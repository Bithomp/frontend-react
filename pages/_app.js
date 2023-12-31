import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import { useState } from "react"
import axios from 'axios'
import { appWithTranslation } from 'next-i18next'

import Header from '../components/Layout/Header'
import Footer from '../components/Layout/Footer'
import SignForm from "../components/SignForm"
import ScrollToTop from "../components/Layout/ScrollToTop"
import BackgroundImage from '../components/Layout/BackgroundImage'
import TopLinks from '../components/Layout/TopLinks'

import { IsSsrMobileContext } from '../utils/mobile'
import { network, server, useLocalStorage, devNet } from '../utils'

import '../styles/ui.scss'
import { ThemeProvider } from "../components/Layout/ThemeContext"

const MyApp = ({ Component, pageProps }) => {
  const [account, setAccount] = useLocalStorage('account')
  const [selectedCurrency, setSelectedCurrency] = useLocalStorage('currency', 'usd')
  const [signRequest, setSignRequest] = useState(false)

  const router = useRouter()

  const signOut = () => {
    localStorage.removeItem('xummUserToken')
    setAccount(null)
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.NEXT_PUBLIC_BITHOMP_API_TEST_KEY
    axios.defaults.baseURL = server + '/api/'
  } else {
    axios.defaults.baseURL = server + '/api/cors/'
  }

  const showAds = !devNet // no ads on test network
  let showTopAds = showAds //change here when you want to see TOP ADS
  const pagesWithNoTopAdds = ['/', '/username', '/eaas', '/build-unl', '/disclaimer', '/privacy-policy', '/terms-and-conditions', '/press', '/404']
  if (showTopAds) {
    showTopAds = !pagesWithNoTopAdds.includes(router.pathname) && !router.pathname.includes('/admin')
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
            {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID &&
              <>
                <Script src={"https://www.googletagmanager.com/gtag/js?id=" + process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
                <Script id="google-analytics">
                  {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', "` + process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID + '");'
                  }
                </Script>
              </>
            }
            <Header
              setSignRequest={setSignRequest}
              account={account}
              signOut={signOut}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
            />
            <ScrollToTop />
            {signRequest &&
              <SignForm
                setSignRequest={setSignRequest}
                setAccount={setAccount}
                signRequest={signRequest}
              />
            }
            <div className="content">
              {showTopAds &&
                <TopLinks />
              }
              <Component
                {...pageProps}
                signRequest={signRequest}
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
            <Footer
              setSignRequest={setSignRequest}
              account={account}
            />
          </div>
        </ThemeProvider>
      </IsSsrMobileContext.Provider>
    </>
  )
}

export default appWithTranslation(MyApp)