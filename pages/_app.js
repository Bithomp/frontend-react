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
import { isUsernameValid } from '../utils'
import { wssServer } from '../utils'

const Header = dynamic(() => import('../components/Layout/Header'), { ssr: true })
const Footer = dynamic(() => import('../components/Layout/Footer'), { ssr: true })
const ScrollToTop = dynamic(() => import('../components/Layout/ScrollToTop'), { ssr: true })

const getWalletId = ({ provider, address }) => {
  if (!provider || !address) return null
  return `${provider}:${address}`
}

const getMostRecentlyConnectedWallet = (wallets = []) => {
  if (!Array.isArray(wallets) || !wallets.length) return null
  return wallets.reduce((latest, current) => {
    if (!latest) return current
    return (current.connectedAt || 0) > (latest.connectedAt || 0) ? current : latest
  }, null)
}

const getWalletConnectAddressesFromSession = (session) => {
  if (!session?.namespaces?.xrpl?.accounts) return []
  return session.namespaces.xrpl.accounts.map((account) => account?.split(':')?.[2]).filter(Boolean)
}

const normalizeAccountState = (account) => {
  const current = account && typeof account === 'object' ? account : {}
  let wallets = Array.isArray(current.wallets) ? current.wallets.filter((wallet) => wallet?.id) : []

  if (!wallets.length && current.wallet && current.address) {
    const id = getWalletId({ provider: current.wallet, address: current.address })
    if (id) {
      wallets = [
        {
          id,
          provider: current.wallet,
          address: current.address,
          username: current.username || null,
          connectedAt: Date.now()
        }
      ]
    }
  }

  const activeWalletId =
    current.activeWalletId && wallets.some((wallet) => wallet.id === current.activeWalletId)
      ? current.activeWalletId
      : getMostRecentlyConnectedWallet(wallets)?.id || null

  const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId) || null

  return {
    ...current,
    wallets,
    activeWalletId,
    address: activeWallet?.address || null,
    wallet: activeWallet?.provider || null,
    username: activeWallet?.username || null,
    derivationPath: activeWallet?.derivationPath || null,
    publicKey: activeWallet?.publicKey || null,
    accountIndex: Number.isFinite(activeWallet?.accountIndex) ? activeWallet.accountIndex : null
  }
}

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

function useReferralCookie() {
  const router = useRouter()
  const [, setRef] = useCookie('ref')

  useEffect(() => {
    if (!router.isReady) return

    const handleUrl = (url) => {
      try {
        const u = new URL(url, window.location.origin)
        let ref = u.searchParams.get('ref')
        if (!ref) return
        ref = ref.trim()
        if (isUsernameValid(ref)) {
          setRef(ref)
        }
      } catch (_) {
        // Ignore URL parsing errors
      }
    }

    // Initial page load
    handleUrl(window.location.href)

    // Client-side navigation
    router.events.on('routeChangeComplete', handleUrl)
    return () => router.events.off('routeChangeComplete', handleUrl)
  }, [router.isReady, router.events, setRef])
}

const MyApp = ({ Component, pageProps }) => {
  useReferralCookie()
  const [account, setAccount] = useLocalStorage('account')
  const [sessionToken, setSessionToken] = useLocalStorage('sessionToken')
  const [selectedCurrency, setSelectedCurrency] = useCookie('currency', 'usd')
  const [liveFiatRate, setLiveFiatRate] = useState(0)
  const [statistics, setStatistics] = useState(null)
  const [whaleTransactions, setWhaleTransactions] = useState(null)
  const wsRef = useRef(null)
  const selectedCurrencyRef = useRef(selectedCurrency)
  const previousCurrencyRef = useRef(selectedCurrency)
  const [proExpire, setProExpire] = useCookie('pro-expire')
  const [subscriptionExpired, setSubscriptionExpired] = useState(
    proExpire ? Number(proExpire) < new Date().getTime() : true
  )
  const [signRequest, setSignRequest] = useState(false)
  const [refreshPage, setRefreshPage] = useState('')
  const [wcSessions, setWcSessions] = useState({})
  const [isClient, setIsClient] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [countryCode, setCountryCode] = useState('')
  const [nonCriticalUiReady, setNonCriticalUiReady] = useState(false)
  const accountSchemaInitializedRef = useRef(false)

  const { isEmailLoginOpen, openEmailLogin, closeEmailLogin, handleLoginSuccess } = useEmailLogin()

  useEffect(() => {
    setIsClient(true)
    setIsOnline(navigator.onLine)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    let cancelled = false
    let timeoutId = null
    let idleId = null

    const markReady = () => {
      if (!cancelled) {
        setNonCriticalUiReady(true)
      }
    }

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(markReady, { timeout: 1500 })
    } else {
      timeoutId = window.setTimeout(markReady, 1200)
    }

    return () => {
      cancelled = true
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  // WalletConnect can fire a session_update with null namespaces, causing
  // Object.keys(null) inside their isValidUpdate — suppress it and clear stale storage.
  useEffect(() => {
    const handleWalletConnectError = (event) => {
      const msg = event?.error?.message || event?.message || ''
      if (!msg.includes('Cannot convert undefined or null to object')) return
      const stack = event?.error?.stack || ''
      if (!stack.includes('walletconnect') && !stack.includes('@walletconnect')) return
      event.preventDefault()
      const clearWC = (storage) => {
        if (!storage) return
        const toRemove = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key && (key.includes('walletconnect') || key.includes('wc@2') || key.startsWith('wc_'))) {
            toRemove.push(key)
          }
        }
        toRemove.forEach((key) => storage.removeItem(key))
      }
      clearWC(window.localStorage)
      clearWC(window.sessionStorage)
      setWcSessions({})
    }
    window.addEventListener('error', handleWalletConnectError)
    return () => window.removeEventListener('error', handleWalletConnectError)
  }, [])

  const router = useRouter()
  const isBot = useIsBot()

  // Universal tooltip positioning: on hover, switch every .tooltiptext to
  // position:fixed with viewport coordinates so it escapes any overflow:hidden
  // ancestor (table wrappers, content containers, etc.).
  // Auto-flips below the trigger when there is not enough space above
  // (e.g. first rows of a table near the sticky header / filter bar).
  useEffect(() => {
    const HEADER_H = 115 // conservative height of fixed header + filter bar
    const TIP_H = 160 // estimated max tooltip height used for threshold
    const GAP = 10
    const BASE_HIDDEN_STYLE =
      'position:fixed!important;top:0!important;left:0!important;right:auto!important;bottom:auto!important;' +
      'visibility:hidden!important;opacity:0!important;pointer-events:none!important;transition:none!important;'

    let activeTrigger = null
    let clearTimer = null

    const isManagedTooltip = (trigger) => {
      return !!trigger.closest('table, thead, tbody, tr, td, th, .top-links, .tx-header-actions')
    }

    // Clear stale inline styles from previously managed tooltips
    // (important when switching management scopes during hot reloads).
    document.querySelectorAll('.tooltip .tooltiptext').forEach((tip) => {
      const trigger = tip.parentElement
      if (!trigger?.classList?.contains('tooltip')) return
      if (!isManagedTooltip(trigger)) {
        tip.style.cssText = ''
        tip.classList.remove('tooltip-flip')
      }
    })

    const applyTip = (trigger) => {
      const tip = trigger.querySelector(':scope > .tooltiptext')
      if (!tip) return

      if (!isManagedTooltip(trigger)) {
        tip.style.cssText = ''
        tip.classList.remove('tooltip-flip')
        return
      }

      tip.style.cssText = BASE_HIDDEN_STYLE

      const r = trigger.getBoundingClientRect()
      const isTopLinksTooltip = !!trigger.closest('.top-links')

      const spaceAbove = r.top - HEADER_H
      const spaceBelow = window.innerHeight - r.bottom
      const flipBelow = isTopLinksTooltip ? true : spaceAbove < TIP_H && spaceBelow > spaceAbove

      const vertPos = flipBelow
        ? 'top:' + (r.bottom + (isTopLinksTooltip ? 6 : GAP)) + 'px!important;bottom:auto!important;'
        : 'bottom:' + (window.innerHeight - r.top + GAP) + 'px!important;top:auto!important;'

      const hAlign = tip.classList.contains('right')
        ? 'left:' + r.left + 'px!important;right:auto!important;transform:none!important;'
        : tip.classList.contains('left')
          ? 'right:' + (window.innerWidth - r.right) + 'px!important;left:auto!important;transform:none!important;'
          : 'left:' + (r.left + r.width / 2) + 'px!important;right:auto!important;transform:translateX(-50%)!important;'

      tip.classList.toggle('tooltip-flip', flipBelow)

      tip.style.cssText =
        'position:fixed!important;' +
        vertPos +
        hAlign +
        'visibility:visible!important;opacity:0!important;pointer-events:none!important;transition:none!important;'

      void tip.offsetHeight

      requestAnimationFrame(() => {
        if (tip.style.position === 'fixed') {
          tip.style.opacity = '1'
          tip.style.transition = 'opacity 0.12s ease'
        }
      })
    }

    const hideTip = (trigger) => {
      const tip = trigger.querySelector(':scope > .tooltiptext')
      if (!tip) return
      if (!isManagedTooltip(trigger)) {
        tip.style.cssText = ''
        tip.classList.remove('tooltip-flip')
        return
      }
      tip.style.cssText = BASE_HIDDEN_STYLE
      tip.classList.remove('tooltip-flip')
    }

    const positionTip = (trigger) => {
      // Ignore bubbled mouseover events from nested nodes (svg/path/etc.)
      // when the same tooltip is already active.
      if (activeTrigger === trigger) return
      // Cancel any pending hide so moving between rows shows no gap/flash
      if (clearTimer) {
        clearTimeout(clearTimer)
        clearTimer = null
      }
      // Hide previous trigger immediately (no gap — new one is already showing)
      if (activeTrigger && activeTrigger !== trigger) hideTip(activeTrigger)
      activeTrigger = trigger
      applyTip(trigger)
    }

    const clearTip = (trigger) => {
      // Small delay: if mouse enters a new .tooltip before it fires,
      // positionTip cancels this and there is zero visible flash.
      clearTimer = setTimeout(() => {
        clearTimer = null
        if (activeTrigger === trigger) activeTrigger = null
        hideTip(trigger)
      }, 40)
    }

    const onOver = (e) => {
      let el = e.target
      while (el && el !== document.body) {
        if (el.classList?.contains('tooltip')) {
          positionTip(el)
          return
        }
        el = el.parentElement
      }
    }

    const onOut = (e) => {
      let el = e.target
      while (el && el !== document.body) {
        if (el.classList?.contains('tooltip')) {
          if (!el.contains(e.relatedTarget)) clearTip(el)
          return
        }
        el = el.parentElement
      }
    }

    // Hide on scroll so tooltip doesn't float at a stale position
    const onScroll = () => {
      if (clearTimer) {
        clearTimeout(clearTimer)
        clearTimer = null
      }
      if (activeTrigger) {
        hideTip(activeTrigger)
        activeTrigger = null
      }
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [])

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
    // Always refresh when currency changes to avoid stale rates.
    setLiveFiatRate(0)
    fetchCurrentFiatRate(selectedCurrency, (rate) => {
      setLiveFiatRate(rate)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  useEffect(() => {
    // If WebSocket is not working or there is no actual value, update via API
    const shouldUpdateViaApi = !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !liveFiatRate
    if (shouldUpdateViaApi) {
      fetchCurrentFiatRate(selectedCurrency, (rate) => {
        setLiveFiatRate(rate)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname])

  // WebSocket for liveFiatRate, statistics, and whale transactions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function sendData(currency) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            command: 'subscribe',
            streams: ['statistics', 'whale_transactions', 'rates'],
            currency,
            id: 1,
            limit: 3
          })
        )
      } else {
        setTimeout(() => sendData(currency), 1000)
      }
    }
    function connect() {
      try {
        wsRef.current = new window.WebSocket(wssServer)
        wsRef.current.onopen = () => {
          sendData(selectedCurrencyRef.current)
        }
        wsRef.current.onmessage = (evt) => {
          const message = JSON.parse(evt.data)
          if (message.type === 'statistics') {
            setStatistics(message)
          } else if (message.type === 'rates') {
            const currentCurrency = selectedCurrencyRef.current
            if (message[currentCurrency]) setLiveFiatRate(message[currentCurrency])
          } else if (message.type === 'whale_transactions') {
            setWhaleTransactions(message.transactions)
          }
        }
        wsRef.current.onclose = () => {
          setTimeout(connect, 3000)
        }
        wsRef.current.onerror = () => {
          if (wsRef.current) wsRef.current.close()
        }
      } catch (error) {
        setTimeout(connect, 3000)
      }
    }
    if (typeof window !== 'undefined' && navigator.onLine) {
      connect()
    }
    return () => {
      setWhaleTransactions(null)
      setStatistics(null)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  useEffect(() => {
    // Unsubscribe from previous currency if it exists
    if (previousCurrencyRef.current && previousCurrencyRef.current !== selectedCurrency) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            command: 'unsubscribe',
            streams: ['statistics', 'whale_transactions', 'rates'],
            currency: previousCurrencyRef.current,
            id: 2
          })
        )
      }
    }

    // Update refs
    selectedCurrencyRef.current = selectedCurrency
    previousCurrencyRef.current = selectedCurrency

    // Subscribe to new currency
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          command: 'subscribe',
          streams: ['statistics', 'whale_transactions', 'rates'],
          currency: selectedCurrency,
          id: 1,
          limit: 3
        })
      )
    }
  }, [selectedCurrency])

  useEffect(() => {
    setSubscriptionExpired(proExpire ? Number(proExpire) < new Date().getTime() : true)
  }, [proExpire])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.dataset.hideAds = !subscriptionExpired ? 'true' : 'false'
  }, [subscriptionExpired])

  useEffect(() => {
    if (sessionToken) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken?.replace(/['"]+/g, '')
    }
  }, [sessionToken])

  useEffect(() => {
    // Wait for localStorage hydration; null is the pre-hydration placeholder.
    if (account === null) return

    if (accountSchemaInitializedRef.current) return
    accountSchemaInitializedRef.current = true

    const normalized = normalizeAccountState(account)
    if (JSON.stringify(normalized) !== JSON.stringify(account || {})) {
      setAccount(normalized)
    }
  }, [account, setAccount])

  const { uuid } = router.query

  const setActiveWallet = (walletId) => {
    const normalizedAccount = normalizeAccountState(account)
    const activeWallet = normalizedAccount.wallets.find((wallet) => wallet.id === walletId)
    if (!activeWallet) return

    setAccount((previousAccount) => {
      const normalized = normalizeAccountState(previousAccount)
      const nextActiveWallet = normalized.wallets.find((wallet) => wallet.id === walletId)
      if (!nextActiveWallet) return normalized

      return {
        ...normalized,
        activeWalletId: walletId,
        address: nextActiveWallet.address,
        wallet: nextActiveWallet.provider,
        username: nextActiveWallet.username || null,
        derivationPath: nextActiveWallet.derivationPath || null,
        publicKey: nextActiveWallet.publicKey || null,
        accountIndex: Number.isFinite(nextActiveWallet.accountIndex) ? nextActiveWallet.accountIndex : null
      }
    })

    if (!router.pathname.startsWith('/services')) {
      router.push('/account/' + activeWallet.address)
    }
  }

  const signOut = async (walletId) => {
    const normalized = normalizeAccountState(account)
    const targetWallet = walletId
      ? normalized.wallets.find((wallet) => wallet.id === walletId)
      : normalized.wallets.find((wallet) => wallet.id === normalized.activeWalletId)

    if (!targetWallet) return

    if (targetWallet.provider === 'xaman') {
      localStorage.removeItem('xamanUserToken')
    }
    if (targetWallet.provider === 'ledgerwallet') {
      await ledgerwalletDisconnect()
    }

    const remainingWallets = normalized.wallets.filter((wallet) => wallet.id !== targetWallet.id)
    const nextActiveWallet =
      remainingWallets.find((wallet) => wallet.id === normalized.activeWalletId) ||
      getMostRecentlyConnectedWallet(remainingWallets)

    setAccount((previousAccount) => {
      const currentAccount = normalizeAccountState(previousAccount)
      const wallets = currentAccount.wallets.filter((wallet) => wallet.id !== targetWallet.id)
      const nextActiveWallet =
        wallets.find((wallet) => wallet.id === currentAccount.activeWalletId) || getMostRecentlyConnectedWallet(wallets)

      return {
        ...currentAccount,
        wallets,
        activeWalletId: nextActiveWallet?.id || null,
        address: nextActiveWallet?.address || null,
        wallet: nextActiveWallet?.provider || null,
        username: nextActiveWallet?.username || null,
        derivationPath: nextActiveWallet?.derivationPath || null,
        publicKey: nextActiveWallet?.publicKey || null,
        accountIndex: Number.isFinite(nextActiveWallet?.accountIndex) ? nextActiveWallet.accountIndex : null
      }
    })

    if (targetWallet.provider === 'walletconnect') {
      setWcSessions((previousSessions) => {
        if (!previousSessions || typeof previousSessions !== 'object') return {}
        const nextSessions = { ...previousSessions }
        Object.entries(previousSessions).forEach(([topic, session]) => {
          const addresses = getWalletConnectAddressesFromSession(session)
          if (addresses.includes(targetWallet.address)) {
            delete nextSessions[topic]
          }
        })
        return nextSessions
      })
    }

    if (nextActiveWallet?.address && !router.pathname.startsWith('/services')) {
      router.push('/account/' + nextActiveWallet.address)
    }
  }

  const signOutPro = () => {
    setSessionToken('')
    setProExpire('0')
    setAccount({
      ...account,
      pro: null
    })
  }

  const saveAddressData = async ({ address, wallet, walletMeta = null, username = undefined }) => {
    let resolvedUsername = username

    if (resolvedUsername === undefined) {
      //&service=true&verifiedDomain=true&blacklist=true&payString=true&twitterImageUrl=true&nickname=true
      const response = await axios('v2/address/' + address + '?username=true')
      if (response.data) {
        resolvedUsername = response.data.username || null
      }
    }

    if (resolvedUsername !== undefined) {
      const walletId = getWalletId({ provider: wallet, address })
      if (!walletId) return

      setAccount((previousAccount) => {
        const normalized = normalizeAccountState(previousAccount)
        const wallets = [...normalized.wallets]
        const existingIndex = wallets.findIndex((walletItem) => walletItem.id === walletId)
        const existingWallet = existingIndex >= 0 ? wallets[existingIndex] : null
        const nextWallet = {
          id: walletId,
          provider: wallet,
          address,
          username: resolvedUsername || null,
          connectedAt: Date.now(),
          derivationPath: walletMeta?.derivationPath ?? existingWallet?.derivationPath ?? null,
          publicKey: walletMeta?.publicKey ?? existingWallet?.publicKey ?? null,
          accountIndex: Number.isFinite(walletMeta?.accountIndex)
            ? walletMeta.accountIndex
            : Number.isFinite(existingWallet?.accountIndex)
              ? existingWallet.accountIndex
              : null,
          walletConnectWalletId: walletMeta?.walletConnectWalletId ?? existingWallet?.walletConnectWalletId ?? null,
          walletConnectWalletName:
            walletMeta?.walletConnectWalletName ?? existingWallet?.walletConnectWalletName ?? null
        }

        if (existingIndex >= 0) {
          wallets[existingIndex] = {
            ...wallets[existingIndex],
            ...nextWallet
          }
        } else {
          wallets.push(nextWallet)
        }

        return {
          ...normalized,
          wallets,
          activeWalletId: walletId,
          address,
          wallet,
          username: resolvedUsername || null,
          derivationPath: nextWallet.derivationPath,
          publicKey: nextWallet.publicKey,
          accountIndex: nextWallet.accountIndex
        }
      })
    } else {
      setAccount((previousAccount) => {
        const normalized = normalizeAccountState(previousAccount)
        return normalized
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
                setActiveWallet={setActiveWallet}
                signOutPro={signOutPro}
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
                countryCode={countryCode}
                sessionToken={sessionToken}
                fiatRate={liveFiatRate}
                openEmailLogin={openEmailLogin}
              />
              <ScrollToTop />
              {/* available only on the mainnet and testnet, only on the client side, only when online */}
              {nonCriticalUiReady && (networkId === 0 || networkId === 1) && isClient && isOnline && !isBot && (
                <WalletConnectModalSign
                  projectId={process.env.NEXT_PUBLIC_WALLETCONNECT}
                  metadata={getAppMetadata()}
                  modalOptions={{
                    // Explorer must be enabled for explorer* filters to apply
                    enableExplorer: true,
                    explorerExcludedWalletIds: 'ALL',
                    explorerRecommendedWalletIds: [
                      '994824d1e0b935f48ec3570c9d51fe5af9bbd9246b6f57210906f8b853ad2196', // Girin
                      'd9f5432e932c6fad8e19a0cea9d4a3372a84aed16e98a52e6655dd2821a63404', // Joy
                      '37a686ab6223cd42e2886ed6e5477fce100a4fb565dcd57ed4f81f7c12e93053', // Bifrost
                      '0e4915107da5b3408b38e248f7a710f4529d54cd30e9d12ff0eb886d45c18e92' // Arculus
                      //'19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927' // Ledger Live
                    ]
                  }}
                />
              )}
              {(signRequest || isValidUUID(uuid)) && (
                <SignForm
                  setSignRequest={setSignRequest}
                  account={account}
                  signRequest={signRequest}
                  uuid={uuid}
                  setRefreshPage={setRefreshPage}
                  saveAddressData={saveAddressData}
                  wcSessions={wcSessions}
                  setWcSessions={setWcSessions}
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
                {nonCriticalUiReady && <TopProgressBar />}
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
                  fiatRate={liveFiatRate}
                  openEmailLogin={openEmailLogin}
                  countryCode={countryCode}
                  statistics={statistics}
                  whaleTransactions={whaleTransactions}
                  setStatistics={setStatistics}
                  setWhaleTransactions={setWhaleTransactions}
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
