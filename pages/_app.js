import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from "react"
import axios from 'axios'

import Header from '../components/Header'
//import Footer from '../components/Footer'
//import SignForm from "../components/SignForm"
//import ScrollToTop from "../components/ScrollToTop"
//import BackgroundImage from '../components/BackgroundImage'
import TopLinks from '../components/TopLinks'

import { network, devNet, server, useLocalStorage } from '../utils'

import '../styles/ui.scss'
import { ThemeProvider } from "../components/ThemeContext"

export default function MyApp({ Component, pageProps }) {
  const [account, setAccount] = useLocalStorage('account', null)
  const [signRequest, setSignRequest] = useState(false)


  const signOut = () => {
    localStorage.removeItem('xummUserToken')
    setAccount(null)
  }

  if (process.env.NODE_ENV === 'development') {
    axios.defaults.headers.common['x-bithomp-token'] = process.env.REACT_APP_BITHOMP_API_TEST_KEY
    axios.defaults.baseURL = server + '/api/'
  } else {
    axios.defaults.baseURL = server + '/api/cors/'
  }

  const router = useRouter();
  const pagesWithNoTopAdds = ['/', '/username', '/disclaimer']
  const showTopAdds = !pagesWithNoTopAdds.includes(router.pathname)

  return (
    <>
      <Head>
        <meta name="viewport" content="viewport-fit=cover" />
        <meta charSet="utf-8" />
      </Head>
      <ThemeProvider>
        <div className="body" data-network={network}>
          <Header
            setSignRequest={setSignRequest}
            account={account}
            signOut={signOut}
          />
          {showTopAdds && <TopLinks />}
          <Component {...pageProps} />
        </div>
      </ThemeProvider>
    </>
  )
}