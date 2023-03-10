import Head from 'next/head'
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

import { network, devNet, server, useLocalStorage } from '../utils'

import '../styles/ui.scss'
import { ThemeProvider } from "../components/Layout/ThemeContext"

const MyApp = ({ Component, pageProps }) => {
  const [account, setAccount] = useLocalStorage('account', null)
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

  let showTopAds = false; //change here if you want to see top ads
  const pagesWithNoTopAdds = ['/', '/username', '/disclaimer', '/privacy-policy', '/terms-and-conditions', '/press', '/404']
  if (showTopAds) {
    showTopAds = !pagesWithNoTopAdds.includes(router.pathname)
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>
      <ThemeProvider>
        <div className="body" data-network={network}>
          <Header
            setSignRequest={setSignRequest}
            account={account}
            signOut={signOut}
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
            {showTopAds && <TopLinks />}
            <Component
              {...pageProps}
              devNet={devNet}
              signRequest={signRequest}
              setSignRequest={setSignRequest}
              account={account}
              setAccount={setAccount}
              signOut={signOut}
            />
          </div>
          <BackgroundImage />
          <Footer />
        </div>
      </ThemeProvider>
    </>
  )
}

export default appWithTranslation(MyApp)