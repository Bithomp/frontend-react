import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FaHandshake } from 'react-icons/fa'
import axios from 'axios'

import SEO from '../../components/SEO'
import TokenSelector from '../../components/UI/TokenSelector'
import { tokenPage } from '../../styles/pages/token.module.scss'
import {
  niceNumber,
  shortNiceNumber,
  fullNiceNumber,
  AddressWithIconInline,
  addressUsernameOrServiceLink,
  CurrencyWithIconInline,
  shortHash,
  niceCurrency,
  dateFormat,
  timeFormat,
  amountParced
} from '../../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import { isAddressOrUsername, nativeCurrency, tokenImageSrc, validateCurrencyCode, xahauNetwork } from '../../utils'
import CopyButton from '../../components/UI/CopyButton'
import TokenTabs from '../../components/Tabs/TokenTabs'
import HomeTeaser, { HomeTeaseRow } from '../../components/Home/HomeTeaser'
import homeTeaserStyles from '@/styles/components/home-teaser.module.scss'
import TokenCharts from '../../components/Token/TokenCharts'

const tokenSwapsUrl = (token, type, limit = 5) => {
  if (!token) return ''
  const mptId = token?.mptokenIssuanceID
  const tokenPath = mptId
    ? encodeURIComponent(mptId)
    : token?.issuer
      ? `${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}`
      : encodeURIComponent(nativeCurrency)

  return `v2/token/${tokenPath}/swaps?limit=${limit}&type=${type}`
}

const TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH = 'amountHigh'
const TOKEN_ACTIVITY_ORDER_LATEST = 'latest'
const DEX_SWAPS_LIMIT = 7
const REFRESH_COOLDOWN_MS = 30000
const displayCurrencyCode = (currencyCode) => {
  if (!currencyCode) return ''
  const code = String(currencyCode)
  return code.replace(/0+$/, '') || code
}

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, params } = context
  const { id } = params || {}

  let initialData = null
  let initialErrorMessage = null
  let issuer = null
  let currency = null
  let isNativeTokenRoute = false
  let tokenId = null

  // Parse the dynamic route parameters
  if (id && Array.isArray(id) && id.length >= 2) {
    issuer = id[0]
    currency = id[1]
  } else if (id && Array.isArray(id) && id.length === 1 && id[0] === nativeCurrency) {
    currency = nativeCurrency
    isNativeTokenRoute = true
  } else if (id && Array.isArray(id) && id.length === 1) {
    tokenId = id[0]
  } else {
    initialErrorMessage =
      'Invalid token URL. Expected format: /token/{issuer}/{currencyCode} or /token/' + nativeCurrency
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  if (currency || tokenId) {
    if (isNativeTokenRoute) {
      try {
        const url = `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${selectedCurrencyServer}`
        const res = await axiosServer({
          method: 'get',
          url,
          headers: passHeaders(req)
        }).catch((error) => {
          initialErrorMessage = error.message
        })
        if (res?.data) {
          if (res.data?.error) {
            initialErrorMessage = res.data.error
          } else {
            initialData = res.data
          }
        } else {
          initialErrorMessage = 'Token not found'
        }
      } catch (e) {
        console.error(e)
        initialErrorMessage = 'Failed to fetch token data'
      }
    } else if (tokenId) {
      try {
        const url = `v2/token/${encodeURIComponent(tokenId)}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}`
        const res = await axiosServer({
          method: 'get',
          url,
          headers: passHeaders(req)
        }).catch((error) => {
          initialErrorMessage = error.message
        })
        if (res?.data) {
          if (res.data?.error) {
            initialErrorMessage = res.data.error
          } else {
            initialData = res.data
          }
        } else {
          initialErrorMessage = 'Token not found'
        }
      } catch (e) {
        console.error(e)
        initialErrorMessage = 'Failed to fetch token data'
      }
    } else if (issuer) {
      // Validate issuer
      if (!isAddressOrUsername(issuer)) {
        initialErrorMessage = 'Invalid issuer address or username'
      }

      // Validate currency code
      const { valid, currencyCode } = validateCurrencyCode(currency)
      if (!valid) {
        initialErrorMessage = 'Invalid currency code'
      }

      if (!initialErrorMessage) {
        try {
          // Fetch token data
          const url = `v2/token/${issuer}/${currencyCode}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}`
          const res = await axiosServer({
            method: 'get',
            url,
            headers: passHeaders(req)
          }).catch((error) => {
            initialErrorMessage = error.message
          })
          if (res?.data) {
            if (res.data?.error) {
              initialErrorMessage = res.data.error
            } else {
              initialData = res.data
            }
          } else {
            initialErrorMessage = 'Token not found'
          }
        } catch (e) {
          console.error(e)
          initialErrorMessage = 'Failed to fetch token data'
        }
      }
    } else {
      initialErrorMessage =
        'Invalid token URL. Expected format: /token/{issuer}/{currencyCode} or /token/' + nativeCurrency
    }
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      fiatRateServer,
      selectedCurrencyServer,
      issuer,
      currency,
      tokenId,
      ...(await serverSideTranslations(locale, ['common', 'token']))
    }
  }
}

export default function TokenPage({
  initialData,
  initialErrorMessage,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  fiatRate: fiatRateApp,
  fiatRateServer,
  setSignRequest,
  isSsrMobile
}) {
  const router = useRouter()
  const { t: tt } = useTranslation('token')
  const [token, setToken] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState(initialData)
  const [dexSwaps, setDexSwaps] = useState([])
  const [transfers, setTransfers] = useState([])
  const [mints, setMints] = useState([])
  const [burns, setBurns] = useState([])
  const [dexSwapsLoading, setDexSwapsLoading] = useState(!!initialData)
  const [transfersLoading, setTransfersLoading] = useState(!!initialData)
  const [mintsLoading, setMintsLoading] = useState(!!initialData)
  const [burnsLoading, setBurnsLoading] = useState(!!initialData)
  const [dexSwapsRefreshHidden, setDexSwapsRefreshHidden] = useState(false)
  const [transfersRefreshHidden, setTransfersRefreshHidden] = useState(false)
  const [mintsRefreshHidden, setMintsRefreshHidden] = useState(false)
  const [burnsRefreshHidden, setBurnsRefreshHidden] = useState(false)
  const [dexSwapsRefreshSeconds, setDexSwapsRefreshSeconds] = useState(0)
  const [transfersRefreshSeconds, setTransfersRefreshSeconds] = useState(0)
  const [mintsRefreshSeconds, setMintsRefreshSeconds] = useState(0)
  const [burnsRefreshSeconds, setBurnsRefreshSeconds] = useState(0)
  const [dexSwapsOrder, setDexSwapsOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [transfersOrder, setTransfersOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [mintsOrder, setMintsOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [burnsOrder, setBurnsOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const errorMessage = initialErrorMessage || ''
  const tokenErrorTranslations = {
    'Token not found': tt('errors.notFound'),
    'Failed to fetch token data': tt('errors.failedFetch'),
    'Invalid issuer address or username': tt('errors.invalidIssuer'),
    'Invalid currency code': tt('errors.invalidCurrency')
  }
  const tokenErrorText = errorMessage?.startsWith('Invalid token URL.')
    ? tt('errors.invalidUrl', { nativeCurrency })
    : tokenErrorTranslations[errorMessage] || errorMessage
  const firstRenderRef = useRef(true)
  const dexSwapsRequestRef = useRef(0)
  const transfersRequestRef = useRef(0)
  const mintsRequestRef = useRef(0)
  const burnsRequestRef = useRef(0)
  const dexSwapsRefreshTimeoutRef = useRef(null)
  const transfersRefreshTimeoutRef = useRef(null)
  const mintsRefreshTimeoutRef = useRef(null)
  const burnsRefreshTimeoutRef = useRef(null)
  const dexSwapsRefreshIntervalRef = useRef(null)
  const transfersRefreshIntervalRef = useRef(null)
  const mintsRefreshIntervalRef = useRef(null)
  const burnsRefreshIntervalRef = useRef(null)

  let selectedCurrency = selectedCurrencyServer
  let fiatRate = fiatRateServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }
  const isNativeToken = !!token && !token.issuer && token.currency === nativeCurrency
  const showMintActivity = !isNativeToken || xahauNetwork

  // Redirect if no token data
  useEffect(() => {
    if (!initialData && !initialErrorMessage) {
      router.push('/tokens')
    }
  }, [initialData, initialErrorMessage, router])

  const getData = async () => {
    setLoading(true)
    const cur = selectedCurrency?.toLowerCase()
    if (!cur) return
    const selectedMptId = selectedToken?.mptokenIssuanceID
    const url = selectedMptId
      ? `v2/token/${encodeURIComponent(selectedMptId)}?statistics=true&currencyDetails=true&convertCurrencies=${cur}`
      : selectedToken?.issuer
        ? `v2/token/${selectedToken.issuer}/${selectedToken.currency}?statistics=true&currencyDetails=true&convertCurrencies=${cur}`
        : `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${cur}`
    const res = await axiosServer({
      method: 'get',
      url
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    setToken(res.data)
    setLoading(false)
  }

  useEffect(() => {
    // Skip fetch on first render for pages that get on the server side
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, selectedToken])

  const fetchDexSwaps = useCallback(
    async ({ clear = false } = {}) => {
      if (!token) {
        setDexSwapsLoading(false)
        return
      }
      const requestId = dexSwapsRequestRef.current + 1
      dexSwapsRequestRef.current = requestId
      if (clear) {
        setDexSwaps([])
      }
      setDexSwapsLoading(true)

      const orderQuery = dexSwapsOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'dex', DEX_SWAPS_LIMIT) + orderQuery).catch(() => null)

      if (dexSwapsRequestRef.current !== requestId) return

      setDexSwaps(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, DEX_SWAPS_LIMIT) : [])
      setDexSwapsLoading(false)
    },
    [dexSwapsOrder, token]
  )

  const fetchTransfers = useCallback(
    async ({ clear = false } = {}) => {
      if (!token) {
        setTransfersLoading(false)
        return
      }
      const requestId = transfersRequestRef.current + 1
      transfersRequestRef.current = requestId
      if (clear) {
        setTransfers([])
      }
      setTransfersLoading(true)

      const orderQuery = transfersOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'transfer', 10) + orderQuery).catch(() => null)

      if (transfersRequestRef.current !== requestId) return

      setTransfers(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 10) : [])
      setTransfersLoading(false)
    },
    [token, transfersOrder]
  )

  const fetchMints = useCallback(
    async ({ clear = false } = {}) => {
      if (!token || !showMintActivity) {
        setMints([])
        setMintsLoading(false)
        return
      }
      const requestId = mintsRequestRef.current + 1
      mintsRequestRef.current = requestId
      if (clear) {
        setMints([])
      }
      setMintsLoading(true)

      const orderQuery = mintsOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'mint', 10) + orderQuery).catch(() => null)

      if (mintsRequestRef.current !== requestId) return

      setMints(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 10) : [])
      setMintsLoading(false)
    },
    [mintsOrder, showMintActivity, token]
  )

  const fetchBurns = useCallback(
    async ({ clear = false } = {}) => {
      if (!token) {
        setBurnsLoading(false)
        return
      }
      const requestId = burnsRequestRef.current + 1
      burnsRequestRef.current = requestId
      if (clear) {
        setBurns([])
      }
      setBurnsLoading(true)

      const orderQuery = burnsOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'burn', 10) + orderQuery).catch(() => null)

      if (burnsRequestRef.current !== requestId) return

      setBurns(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 10) : [])
      setBurnsLoading(false)
    },
    [burnsOrder, token]
  )

  const clearRefreshCooldown = useCallback((timeoutRef, intervalRef, setHidden, setSeconds) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setHidden(false)
    setSeconds(0)
  }, [])

  const startRefreshCooldown = useCallback((timeoutRef, intervalRef, setHidden, setSeconds) => {
    setHidden(true)
    setSeconds(Math.ceil(REFRESH_COOLDOWN_MS / 1000))
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setSeconds((seconds) => Math.max(seconds - 1, 0))
    }, 1000)
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setHidden(false)
      setSeconds(0)
      timeoutRef.current = null
    }, REFRESH_COOLDOWN_MS)
  }, [])

  const refreshDexSwaps = useCallback(() => {
    startRefreshCooldown(
      dexSwapsRefreshTimeoutRef,
      dexSwapsRefreshIntervalRef,
      setDexSwapsRefreshHidden,
      setDexSwapsRefreshSeconds
    )
    fetchDexSwaps()
  }, [fetchDexSwaps, startRefreshCooldown])

  const refreshTransfers = useCallback(() => {
    startRefreshCooldown(
      transfersRefreshTimeoutRef,
      transfersRefreshIntervalRef,
      setTransfersRefreshHidden,
      setTransfersRefreshSeconds
    )
    fetchTransfers()
  }, [fetchTransfers, startRefreshCooldown])

  const refreshMints = useCallback(() => {
    startRefreshCooldown(
      mintsRefreshTimeoutRef,
      mintsRefreshIntervalRef,
      setMintsRefreshHidden,
      setMintsRefreshSeconds
    )
    fetchMints()
  }, [fetchMints, startRefreshCooldown])

  const refreshBurns = useCallback(() => {
    startRefreshCooldown(
      burnsRefreshTimeoutRef,
      burnsRefreshIntervalRef,
      setBurnsRefreshHidden,
      setBurnsRefreshSeconds
    )
    fetchBurns()
  }, [fetchBurns, startRefreshCooldown])

  useEffect(() => {
    clearRefreshCooldown(
      dexSwapsRefreshTimeoutRef,
      dexSwapsRefreshIntervalRef,
      setDexSwapsRefreshHidden,
      setDexSwapsRefreshSeconds
    )
    fetchDexSwaps()
  }, [clearRefreshCooldown, fetchDexSwaps])

  useEffect(() => {
    clearRefreshCooldown(
      transfersRefreshTimeoutRef,
      transfersRefreshIntervalRef,
      setTransfersRefreshHidden,
      setTransfersRefreshSeconds
    )
    fetchTransfers()
  }, [clearRefreshCooldown, fetchTransfers])

  useEffect(() => {
    clearRefreshCooldown(
      mintsRefreshTimeoutRef,
      mintsRefreshIntervalRef,
      setMintsRefreshHidden,
      setMintsRefreshSeconds
    )
    fetchMints()
  }, [clearRefreshCooldown, fetchMints])

  useEffect(() => {
    clearRefreshCooldown(
      burnsRefreshTimeoutRef,
      burnsRefreshIntervalRef,
      setBurnsRefreshHidden,
      setBurnsRefreshSeconds
    )
    fetchBurns()
  }, [clearRefreshCooldown, fetchBurns])

  useEffect(
    () => () => {
      clearRefreshCooldown(
        dexSwapsRefreshTimeoutRef,
        dexSwapsRefreshIntervalRef,
        setDexSwapsRefreshHidden,
        setDexSwapsRefreshSeconds
      )
      clearRefreshCooldown(
        transfersRefreshTimeoutRef,
        transfersRefreshIntervalRef,
        setTransfersRefreshHidden,
        setTransfersRefreshSeconds
      )
      clearRefreshCooldown(
        mintsRefreshTimeoutRef,
        mintsRefreshIntervalRef,
        setMintsRefreshHidden,
        setMintsRefreshSeconds
      )
      clearRefreshCooldown(
        burnsRefreshTimeoutRef,
        burnsRefreshIntervalRef,
        setBurnsRefreshHidden,
        setBurnsRefreshSeconds
      )
    },
    [clearRefreshCooldown]
  )

  useEffect(() => {
    if (!selectedToken?.currency) return
    const { pathname, query } = router
    const selectedMptId = selectedToken?.mptokenIssuanceID
    query.id = selectedMptId
      ? [selectedMptId]
      : selectedToken?.issuer
        ? [selectedToken.issuer, selectedToken.currency]
        : [selectedToken.currency]
    router.replace({ pathname, query }, null, { shallow: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken])

  const renderValueStack = ({ primary, secondaryLines = [] }) => (
    <span className="tokenValueStack">
      <span className="tokenValuePrimary" suppressHydrationWarning>
        {primary}
      </span>
      {secondaryLines.filter(Boolean).map((line, index) => (
        <span key={index} className="tokenValueSecondary" suppressHydrationWarning>
          {line}
        </span>
      ))}
    </span>
  )

  // Helper: price value with fiat primary and ledger rates as secondary lines.
  const priceLine = ({ priceNative, priceFiat }) => {
    const price = priceNative
    const currencyText = token?.currencyDetails?.currency || displayCurrencyCode(token?.currency) || nativeCurrency
    const isNativeFromToken = !token?.issuer && token?.currency === nativeCurrency
    const nativePrice =
      price < 0.0001 ? (
        <>
          1M {currencyText} = {niceNumber(price * 1000000, 6)} {nativeCurrency}
        </>
      ) : (
        <>
          {niceNumber(price, 6)} {nativeCurrency}
        </>
      )

    return renderValueStack({
      primary: niceNumber(priceFiat || 0, 4, selectedCurrency),
      secondaryLines: isNativeFromToken
        ? []
        : [
            nativePrice,
            <span key="rate">
              1 {nativeCurrency} = {niceNumber(1 / price, 6)} {currencyText}
            </span>
          ]
    })
  }

  const marketcapLine = ({ marketcap }) => {
    if (!fiatRate || !marketcap) return null
    const marketcapFiat = marketcap * fiatRate
    return renderValueStack({
      primary: niceNumber(marketcapFiat, 2, selectedCurrency),
      secondaryLines: [
        <span key="native">
          {niceNumber(marketcap, 2)} {nativeCurrency}
        </span>
      ]
    })
  }

  const volumeLine = ({ token, type }) => {
    const { statistics, currencyDetails } = token
    if (!fiatRate) return null
    let volume
    if (!type || type === 'total') {
      volume = Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    } else {
      volume = statistics?.[type + 'Volume'] || 0
    }
    const priceInNative = statistics?.priceNativeCurrency ?? (token?.issuer ? 0 : 1)
    const volumeFiat = volume * priceInNative * fiatRate || 0
    return renderValueStack({
      primary: niceNumber(volumeFiat, 2, selectedCurrency),
      secondaryLines: [
        <span key="token">
          {niceNumber(volume, 2)} {currencyDetails?.currency || displayCurrencyCode(token?.currency) || nativeCurrency}
        </span>
      ]
    })
  }

  const renderPercentCell = ({ currentPrice, pastPrice }) => {
    const current = Number(currentPrice || 0)
    const past = Number(pastPrice || 0)
    if (!current || !past) return <span className="grey">--%</span>
    const change = current / past - 1
    const colorClass = change >= 0 ? 'green' : 'red'
    const percentText = niceNumber(Math.abs(change * 100), 2) + '%'

    return (
      <span className={`tooltip ${colorClass}`} suppressHydrationWarning>
        {change >= 0 ? '+' : '-'}
        {percentText}
        <span className="tooltiptext right no-brake" suppressHydrationWarning>
          {tt('tooltips.now')}: {fullNiceNumber(currentPrice, selectedCurrency)}
          <br />
          {tt('tooltips.before')}: {fullNiceNumber(pastPrice, selectedCurrency)}
        </span>
      </span>
    )
  }

  if (errorMessage) {
    return (
      <>
        <SEO title={tt('errors.notFound')} />
        <div className="center">
          <h1>{tt('errors.notFound')}</h1>
          <p>{tokenErrorText}</p>
          <Link href="/tokens" className="button-action">
            {tt('errors.viewAllTokens')}
          </Link>
          <br />
          <br />
        </div>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <SEO title={tt('errors.loadingTitle')} />
        <div className="center">
          <h1>{tt('errors.loading')}</h1>
        </div>
      </>
    )
  }

  const { statistics } = token
  const mptId = token?.mptokenIssuanceID
  const isMptToken = !!mptId
  const isRoundTokenImage = !!token?.issuer || isMptToken || isNativeToken
  const tokenDisplayCurrency = isMptToken
    ? token?.metadata?.name || token?.currency || 'MPT'
    : token?.currencyDetails?.currency || token?.currency || nativeCurrency
  const tokenSupplyTitle = isMptToken
    ? tokenDisplayCurrency
    : token?.currencyDetails?.currency || niceCurrency(token?.currency) || tokenDisplayCurrency
  const currencyCodeText = token.currencyDetails?.currencyCode || token.currency
  const currencyCodeDisplay = displayCurrencyCode(currencyCodeText)
  const effectiveNativePrice = statistics?.priceNativeCurrency ?? (isNativeToken ? 1 : null)
  const escrowStatus =
    token?.canLock === true ? (
      <span className="bold">{tt('escrow.can')}</span>
    ) : token?.canLock === false ? (
      tt('escrow.cannot')
    ) : (
      tt('escrow.unknown')
    )
  const changeItems = [
    {
      key: '5m',
      label: '5m',
      pastPrice: statistics?.priceFiats5m?.[selectedCurrency],
      hasData: statistics?.priceFiats5m?.[selectedCurrency] !== undefined
    },
    {
      key: '1h',
      label: '1h',
      pastPrice: statistics?.priceFiats1h?.[selectedCurrency],
      hasData: statistics?.priceFiats1h?.[selectedCurrency] !== undefined
    },
    {
      key: '24h',
      label: '24h',
      pastPrice: statistics?.priceFiats24h?.[selectedCurrency],
      hasData: statistics?.priceFiats24h?.[selectedCurrency] !== undefined
    },
    {
      key: '7d',
      label: '7d',
      pastPrice: statistics?.priceFiats7d?.[selectedCurrency],
      hasData: statistics?.priceFiats7d?.[selectedCurrency] !== undefined
    }
  ].filter((item) => item.hasData)
  const showPriceInformation =
    loading ||
    effectiveNativePrice ||
    changeItems.length > 0 ||
    statistics?.priceNativeCurrencySpot ||
    statistics?.marketcap

  // Helper function to format supply for trustline
  const formatSupply = (supply) => {
    if (!supply) return '1000000000'
    const num = parseFloat(supply)
    if (isNaN(num)) return '1000000000'
    return num.toFixed(6)
  }

  // Handle set trustline
  const handleSetTrustline = () => {
    if (!setSignRequest) return

    setSignRequest({
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: token.currency,
          issuer: token.issuer,
          value: formatSupply(token.supply)
        },
        Flags: 131072
      }
    })
  }

  const handleAuthorizeMpt = () => {
    if (!setSignRequest || !mptId) return
    setSignRequest({
      request: {
        TransactionType: 'MPTokenAuthorize',
        MPTokenIssuanceID: mptId
      }
    })
  }

  const isLpToken = token?.currencyDetails?.type === 'lp_token'
  const lpAmmId = token?.currencyDetails?.ammID
  const lpAsset = token?.currencyDetails?.asset
  const lpAsset2 = token?.currencyDetails?.asset2
  const renderLpAsset = (asset) => {
    if (!asset) return ''
    if (asset?.currency === nativeCurrency) {
      return <span className="bold">{nativeCurrency}</span>
    }
    return <CurrencyWithIconInline token={asset} link={true} showIssuer={true} />
  }
  const getActivityAmountParts = (amount) => {
    const parsed = amountParced(amount)
    if (!parsed) return null

    return {
      value: [shortNiceNumber(parsed.value, 2, 1), parsed.valuePrefix].filter(Boolean).join(' '),
      currency: parsed.currency
    }
  }

  const renderActivityAmount = (amount) => {
    const parts = getActivityAmountParts(amount)
    if (!parts) return ''
    const title = [parts.value, parts.currency].filter(Boolean).join(' ')

    return (
      <span className="tokenActivityAmountLine" title={title}>
        <span className="tokenActivityAmountValue">{parts.value}</span>
        {parts.currency ? <span className="tokenActivityAmountCurrency">{parts.currency}</span> : null}
      </span>
    )
  }
  const hasActivityValue = (value) => value !== undefined && value !== null && value !== ''
  const activityAddressShort = isSsrMobile ? 3 : 8
  const activityAddressOptions = { short: activityAddressShort, noLink: true }

  const isPageTokenAmount = (amount) => {
    const parsed = amountParced(amount)
    if (!parsed) return false

    if (mptId) {
      return parsed.originalCurrency === mptId || amount?.mpt_issuance_id === mptId
    }

    if (isNativeToken) {
      return parsed.originalCurrency === nativeCurrency && !amount?.issuer
    }

    return parsed.originalCurrency === token?.currency && amount?.issuer === token?.issuer
  }

  const getSwapPrice = (row) => {
    const parsedAmount1 = amountParced(row.amount1)
    const parsedAmount2 = amountParced(row.amount2)
    if (!parsedAmount1 || !parsedAmount2) return null

    const amount1IsPageToken = isPageTokenAmount(row.amount1)
    const amount2IsPageToken = isPageTokenAmount(row.amount2)
    const base = amount1IsPageToken ? parsedAmount1 : amount2IsPageToken ? parsedAmount2 : parsedAmount1
    const quote = amount1IsPageToken ? parsedAmount2 : amount2IsPageToken ? parsedAmount1 : parsedAmount2
    const baseValue = Number(base.value)
    const quoteValue = Number(quote.value)

    if (!Number.isFinite(baseValue) || !Number.isFinite(quoteValue) || baseValue === 0) return null

    return {
      value: quoteValue / baseValue,
      currency: quote.currency
    }
  }

  const renderSwapSource = (row) => {
    if (row.ammID) return 'AMM'
    return 'DEX'
  }

  const renderDexSwapRow = (row, index) => {
    const swapPrice = getSwapPrice(row)

    return (
      <HomeTeaseRow
        key={`dex-${row.txHash || row.timestamp}-${row.ammID || row.offerID || 'swap'}-${index}`}
        href={`/tx/${row.txHash}`}
        className="tokenSwapRow"
      >
        <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
        <div className="tokenSwapFlow">
          <span className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell} tokenSwapFlowAddress`}>
            <AddressWithIconInline data={row} name="address1" options={activityAddressOptions} />
          </span>
          <span className={homeTeaserStyles.whaleArrow}>→</span>
          <span className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell} tokenSwapFlowAddress`}>
            <AddressWithIconInline data={row} name="address2" options={activityAddressOptions} />
          </span>
        </div>
        <div className="tokenSwapAmount">
          {renderActivityAmount(row.amount1)}
          {hasActivityValue(row.amount2) ? <span className="grey">{renderActivityAmount(row.amount2)}</span> : null}
        </div>
        <div className="tokenSwapPrice">
          <span className="tokenSwapPriceLabel">{tt('activity.rate')}</span>
          <span className="tokenSwapPriceValue">
            {swapPrice ? (
              <span className="tooltip">
                {shortNiceNumber(swapPrice.value, 6, 1)}
                <span className="tokenSwapPriceAsset" title={swapPrice.currency}>
                  {swapPrice.currency}
                </span>
                <span className="tooltiptext no-brake">
                  {fullNiceNumber(swapPrice.value)} {swapPrice.currency}
                </span>
              </span>
            ) : (
              '-'
            )}
          </span>
        </div>
        <div className="tokenSwapSource">
          <span className="tokenSwapSourcePill">{renderSwapSource(row)}</span>
        </div>
      </HomeTeaseRow>
    )
  }

  const renderTokenMovementRow = (row, index, type) => {
    const hasAddress1 = !!row.address1
    const hasAddress2 = !!row.address2
    const fallbackLabel = type === 'mint' ? tt('activity.mint') : type === 'burn' ? tt('activity.burn') : '-'
    const displayAmount = type === 'mint' && hasActivityValue(row.amount2) ? row.amount2 : row.amount1

    return (
      <HomeTeaseRow
        key={`${type}-${row.txHash || row.timestamp}-${row.address1 || ''}-${row.address2 || ''}-${index}`}
        href={`/tx/${row.txHash}`}
        className={`${homeTeaserStyles.whaleRow} tokenTransferRow`}
      >
        <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
        <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell}`}>
          {hasAddress1 ? (
            <AddressWithIconInline data={row} name="address1" options={activityAddressOptions} />
          ) : (
            <span className="grey">{fallbackLabel}</span>
          )}
        </div>
        <div className={homeTeaserStyles.whaleArrow}>→</div>
        <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell}`}>
          {hasAddress2 ? (
            <AddressWithIconInline data={row} name="address2" options={activityAddressOptions} />
          ) : (
            <span className="grey">{fallbackLabel}</span>
          )}
        </div>
        <div
          className={`${homeTeaserStyles.metric} ${homeTeaserStyles.metricWithDelta} ${homeTeaserStyles.whaleFiat} tokenTransferMetric`}
        >
          {renderActivityAmount(displayAmount)}
        </div>
      </HomeTeaseRow>
    )
  }

  const renderTransferRow = (row, index) => renderTokenMovementRow(row, index, 'transfer')
  const renderMintRow = (row, index) => renderTokenMovementRow(row, index, 'mint')
  const renderBurnRow = (row, index) => renderTokenMovementRow(row, index, 'burn')

  const renderActivityOrderToggle = (value, setValue) => (
    <>
      <button
        type="button"
        className={`${homeTeaserStyles.cardHeaderActionButton} ${
          value === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? homeTeaserStyles.cardHeaderActionButtonActive : ''
        }`.trim()}
        onClick={() => setValue(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)}
      >
        {tt('activity.largest24h')}
      </button>
      <button
        type="button"
        className={`${homeTeaserStyles.cardHeaderActionButton} ${
          value === TOKEN_ACTIVITY_ORDER_LATEST ? homeTeaserStyles.cardHeaderActionButtonActive : ''
        }`.trim()}
        onClick={() => setValue(TOKEN_ACTIVITY_ORDER_LATEST)}
      >
        {tt('activity.latest')}
      </button>
    </>
  )

  const renderTokenActivityWidget = ({
    title,
    titleText,
    rows,
    rowRenderer,
    loading,
    onRefresh,
    isRefreshHidden = false,
    refreshCooldownSeconds = 0,
    headerActions = null,
    emptyText,
    limit = 5
  }) => {
    const visibleRows = Array.isArray(rows) ? rows.slice(0, limit) : []

    return (
      <HomeTeaser
        title={title}
        titleText={titleText}
        isLoading={loading && !visibleRows.length}
        isRefreshing={loading}
        onRefresh={onRefresh}
        isRefreshHidden={isRefreshHidden}
        refreshCooldownSeconds={refreshCooldownSeconds}
        headerActions={headerActions}
        isEmpty={!visibleRows.length}
        emptyText={emptyText}
        className={`${homeTeaserStyles.whaleCard} tokenActivityCard`}
      >
        {visibleRows.map(rowRenderer)}
      </HomeTeaser>
    )
  }

  const renderMetricTiles = (items) =>
    items
      .filter((item) => item.show !== false)
      .map(({ key, label, value, details = [], wide = false }) => {
        const valueNode = value === undefined || value === null || value === '' ? '-' : value
        const visibleDetails = details.filter((detail) => detail.show !== false)

        return (
          <div key={key} className={wide ? 'tokenMetricWide' : undefined}>
            <span>{label}</span>
            <span>
              {valueNode}
              {visibleDetails.length ? (
                <span className="tokenMetricDetails">
                  {visibleDetails.map((detail) => (
                    <span key={detail.key} className="tokenMetricDetail">
                      <span>{detail.label}</span>
                      <span>{detail.value}</span>
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          </div>
        )
      })

  const renderProfileRows = (items) =>
    items
      .filter((item) => item.show !== false)
      .map(({ key, label, value }) => {
        const valueNode = value === undefined || value === null || value === '' ? '-' : value

        return (
          <div key={key} className="tokenProfileInfoRow">
            <span>{label}</span>
            <span>{valueNode}</span>
          </div>
        )
      })

  const renderPanel = ({ title, className = '', children }) => (
    <section className={`tokenPanel ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </section>
  )

  const renderChangeStrip = () => (
    <div className="tokenChangeBlock" aria-label={tt('fields.change')}>
      <div className="tokenChangeList">
        {changeItems.map((item) => (
          <span key={item.key} className="tokenChangeItem">
            <span className="tokenChangePeriod">{item.label}</span>
            <span className="tokenChangeValue">
              {renderPercentCell({ currentPrice: statistics?.priceFiats?.[selectedCurrency], pastPrice: item.pastPrice })}
            </span>
          </span>
        ))}
      </div>
    </div>
  )

  const holdersLink = isNativeToken ? (
    <Link href="/distribution">{fullNiceNumber(token.holders)}</Link>
  ) : isMptToken ? (
    fullNiceNumber(token.holders || 0)
  ) : (
    <Link
      href={
        '/distribution?currencyIssuer=' + token.issuer + '&currency=' + token.currencyDetails?.currencyCode
      }
    >
      {fullNiceNumber(token.holders)}
    </Link>
  )

  const tokenInfoItems = [
    {
      key: 'mptId',
      label: tt('fields.mptId'),
      value: (
        <>
          {mptId} <CopyButton text={mptId} />
        </>
      ),
      show: isMptToken,
      wide: true
    },
    {
      key: 'ammPool',
      label: tt('fields.ammPool'),
      value: lpAmmId ? <Link href={`/amm/${lpAmmId}`}>{tt('actions.viewPool')}</Link> : '-',
      show: isLpToken
    },
    { key: 'asset1', label: tt('fields.asset1'), value: renderLpAsset(lpAsset), show: isLpToken },
    { key: 'asset2', label: tt('fields.asset2'), value: renderLpAsset(lpAsset2), show: isLpToken },
    { key: 'name', label: tt('fields.name'), value: token.name, show: !!token?.name, wide: true },
    {
      key: 'description',
      label: tt('fields.description'),
      value: token.description,
      show: !!token?.description,
      wide: true
    },
    {
      key: 'issuer',
      label: tt('fields.issuer'),
      value: (
        <span className="tokenProfileInlineValue">
          <Link href={`/account/${token.issuer}`}>{shortHash(token.issuer)}</Link>
          <CopyButton text={token.issuer} size={16} />
        </span>
      ),
      show: !isNativeToken,
      wide: true
    },
    {
      key: 'currencyCode',
      label: tt('fields.currencyCode'),
      value: (
        <>
          {currencyCodeDisplay} <CopyButton text={currencyCodeText} copyText={tt('tooltips.copyCurrencyCode')} size={16} />
        </>
      ),
      show: !isMptToken,
      wide: true
    },
    {
      key: 'tokenSequence',
      label: tt('fields.tokenSequence'),
      value: fullNiceNumber(token.sequence || 0),
      show: isMptToken
    },
    {
      key: 'created',
      label: tt('fields.created'),
      value: token.createdAt ? (
        <>
          {dateFormat(token.createdAt)} {timeFormat(token.createdAt)}
        </>
      ) : (
        '-'
      ),
      show: isMptToken
    },
    {
      key: 'lastUpdated',
      label: tt('fields.lastUpdated'),
      value: token.updatedAt ? (
        <>
          {dateFormat(token.updatedAt)} {timeFormat(token.updatedAt)}
        </>
      ) : (
        '-'
      ),
      show: isMptToken
    },
    {
      key: 'lastUsed',
      label: tt('fields.lastUsed'),
      value: token.lastUsedAt ? (
        <>
          {dateFormat(token.lastUsedAt)} {timeFormat(token.lastUsedAt)}
        </>
      ) : (
        '-'
      ),
      show: isMptToken
    },
    {
      key: 'flags',
      label: tt('fields.flags'),
      value: token.flags
        ? Object.keys(token.flags)
            .filter((flag) => token.flags[flag])
            .join(', ') || tt('values.noneSet')
        : tt('values.none'),
      show: isMptToken,
      wide: true
    }
  ]

  const tokenSupplyItems = isMptToken
    ? [
        {
          key: 'outstanding',
          label: tt('fields.outstanding'),
          value: fullNiceNumber(Number(token.outstandingAmount || 0) / 10 ** (token.scale || 0) || 0)
        },
        {
          key: 'maxSupply',
          label: tt('fields.maxSupply'),
          value: fullNiceNumber(Number(token.maximumAmount || 0) / 10 ** (token.scale || 0) || 0)
        },
        {
          key: 'lockedAmount',
          label: tt('fields.lockedAmount'),
          value: fullNiceNumber(Number(token.lockedAmount || 0) / 10 ** (token.scale || 0) || 0)
        },
        { key: 'holders', label: tt('fields.holders'), value: fullNiceNumber(token.holders || 0) },
        {
          key: 'authorizedAddresses',
          label: tt('fields.authorizedAddresses'),
          value: fullNiceNumber(token.mptokens || 0)
        },
        {
          key: 'transferFee',
          label: tt('fields.transferFee'),
          value: token.transferFee ? token.transferFee / 1000 + '%' : tt('values.none')
        },
        { key: 'decimalPlaces', label: tt('fields.decimalPlaces'), value: token.scale || 0 }
      ]
    : [
        {
          key: 'supply',
          label: tt('fields.supply'),
          value: (
            <>
              {fullNiceNumber(token.supply)} {tokenDisplayCurrency}
            </>
          ),
          wide: true
        },
        { key: 'holders', label: tt('fields.holders'), value: holdersLink },
        { key: 'trustlines', label: tt('fields.trustlines'), value: fullNiceNumber(token.trustlines), show: !isNativeToken },
        {
          key: 'ammPools',
          label: tt('fields.ammPools'),
          value: (
            <Link
              href={
                token?.issuer
                  ? `/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`
                  : `/amms?currency=${token.currency}`
              }
            >
              {statistics?.ammPools || 0}
            </Link>
          ),
          show: statistics && !xahauNetwork && !isMptToken
        },
        { key: 'escrow', label: tt('fields.escrow'), value: escrowStatus }
      ]

  const priceMetricItems = [
    {
      key: 'spotPrice',
      label: tt('fields.spotPrice'),
      value: priceLine({
        priceNative: statistics?.priceNativeCurrencySpot,
        priceFiat: statistics?.priceFiatsSpot?.[selectedCurrency]
      }),
      show: !!statistics?.priceNativeCurrencySpot
    },
    {
      key: 'marketCap',
      label: tt('fields.marketCap'),
      value: marketcapLine({ marketcap: statistics?.marketcap }),
      show: !!statistics?.marketcap
    }
  ]

  const stats24hItems = statistics
    ? [
        {
          key: 'activityCounts',
          label: tt('fields.trades'),
          value: fullNiceNumber(statistics?.dexes || 0),
          details: [
            { key: 'uniqueAccounts', label: tt('fields.uniqueAccounts'), value: fullNiceNumber(statistics?.uniqueAccounts || 0) },
            { key: 'dexTxs', label: tt('fields.dexTxs'), value: fullNiceNumber(statistics?.dexTxs || 0) },
            { key: 'ripplingTxs', label: tt('fields.ripplingTxs'), value: fullNiceNumber(statistics?.ripplingTxs || 0) }
          ]
        },
        {
          key: 'volumeTotal',
          label: tt('fields.volumeTotal'),
          value: volumeLine({ token, type: 'total' }),
          details: [
            { key: 'traders', label: tt('fields.traders'), value: fullNiceNumber(statistics?.uniqueDexAccounts || 0) }
          ]
        },
        {
          key: 'volumeBuy',
          label: tt('fields.volumeBuy'),
          value: volumeLine({ token, type: 'buy' }),
          details: [{ key: 'buyers', label: tt('fields.buyers'), value: fullNiceNumber(statistics?.uniqueBuyers || 0) }]
        },
        {
          key: 'volumeSell',
          label: tt('fields.volumeSell'),
          value: volumeLine({ token, type: 'sell' }),
          details: [{ key: 'sellers', label: tt('fields.sellers'), value: fullNiceNumber(statistics?.uniqueSellers || 0) }]
        },
        {
          key: 'transferVolume',
          label: tt('fields.transferVolume'),
          value: volumeLine({ token, type: 'transfer' }),
          details: [
            {
              key: 'transferTransactions',
              label: tt('fields.transferTransactions'),
              value: niceNumber(statistics?.transferTxs || 0)
            }
          ]
        },
        {
          key: 'mintVolume',
          label: tt('fields.mintVolume'),
          value: volumeLine({ token, type: 'mint' }),
          show: showMintActivity,
          details: [
            {
              key: 'mintTransactions',
              label: tt('fields.mintTransactions'),
              value: shortNiceNumber(statistics?.mintTxs || 0, 0, 1)
            }
          ]
        },
        {
          key: 'burnVolume',
          label: tt('fields.burnVolume'),
          value: volumeLine({ token, type: 'burn' }),
          details: [
            {
              key: 'burnTransactions',
              label: tt('fields.burnTransactions'),
              value: shortNiceNumber(statistics?.burnTxs || 0, 0, 1)
            }
          ]
        }
      ]
    : []

  const closedDayItems = statistics
    ? [
        { key: 'tradingPairs', label: tt('fields.tradingPairs'), value: fullNiceNumber(statistics?.activeCounters || 0) },
        { key: 'activeHolders', label: tt('fields.activeHolders'), value: fullNiceNumber(statistics?.activeHolders || 0) },
        { key: 'activeOffers', label: tt('fields.activeOffers'), value: fullNiceNumber(statistics?.activeOffers || 0) },
        {
          key: 'activeAmmPools',
          label: tt('fields.activeAmmPools'),
          value: niceNumber(statistics?.activeAmmPools || 0),
          show: !xahauNetwork && !isMptToken
        }
      ]
    : []

  const metadataItems = [
    { key: 'name', label: tt('fields.name'), value: token.metadata?.name, show: !!token.metadata?.name },
    {
      key: 'description',
      label: tt('fields.description'),
      value: token.metadata?.description || token.description,
      show: !!(token.metadata?.description || token.description),
      wide: true
    },
    {
      key: 'rawMetadata',
      label: tt('fields.rawMetadata'),
      value: (
        <pre>
          <code>{JSON.stringify(token.metadata, null, 2)}</code>
        </pre>
      ),
      show: !!token.metadata,
      wide: true
    }
  ]

  return (
    <>
      <SEO
        title={
          isNativeToken
            ? tokenDisplayCurrency + ' (' + tt('title.nativeCurrency') + ')'
            : tokenDisplayCurrency +
              ' ' +
              tt('title.issuedBy') +
              ' ' +
              (token?.issuerDetails?.service || token?.issuerDetails?.username || token?.issuer)
        }
      />
      <div className={tokenPage}>
        {!xahauNetwork && <TokenTabs />}

        <div className="tokenLayout">
          <div className="tokenSelectorSection">
            <TokenSelector
              value={selectedToken}
              onChange={setSelectedToken}
              excludeNative={false}
              excludeLPtokens={true}
            />
          </div>

          <div className="tokenOverview">
            <aside className="tokenProfileCard">
              <div className="tokenProfileImageWrap">
                <img
                  alt="token"
                  src={tokenImageSrc(token)}
                  className="token-image"
                  style={{
                    width: 'calc(100% - 2px)',
                    height: 'auto',
                    borderRadius: isRoundTokenImage ? '50%' : undefined,
                    aspectRatio: isRoundTokenImage ? '1 / 1' : undefined,
                    objectFit: isRoundTokenImage ? 'cover' : undefined
                  }}
                />
              </div>
              <h1 className="tokenProfileTitle">{tokenDisplayCurrency}</h1>
              <div className="tokenProfileMeta">
                {token?.name && token.name !== tokenDisplayCurrency ? <span>{token.name}</span> : null}
                <span>
                  {isNativeToken ? (
                    tt('title.nativeCurrency')
                  ) : (
                    <>
                      {tt('title.issuedBy')} {addressUsernameOrServiceLink(token, 'issuer', { short: true })}
                    </>
                  )}
                </span>
              </div>

              {(!isNativeToken || isMptToken) && (
                <div className="tokenProfileActions">
                  {!isNativeToken && !isMptToken && (
                    <button className="button-action wide center" onClick={handleSetTrustline}>
                      {tt('actions.setTrustline')}
                    </button>
                  )}
                  {isMptToken && (
                    <button className="button-action wide center" onClick={handleAuthorizeMpt}>
                      <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} /> {tt('actions.authorize')}
                    </button>
                  )}
                </div>
              )}

              <div className="tokenProfileInfo">{renderProfileRows(tokenInfoItems)}</div>
            </aside>

            <div className="tokenDashboardGrid">
              {showPriceInformation &&
                renderPanel({
                  title: tt('tables.priceInformation'),
                  className: 'tokenPricePanel',
                  children: loading ? (
                    <div className="center">
                      <span className="waiting"></span>
                    </div>
                  ) : (
                    <>
                      {effectiveNativePrice ? (
                        <div className="tokenPriceHero">
                          <span>{tt('fields.lastPrice')}</span>
                          <strong>
                            {priceLine({
                              priceNative: effectiveNativePrice,
                              priceFiat: statistics?.priceFiats?.[selectedCurrency]
                            })}
                          </strong>
                          {changeItems.length > 0 ? renderChangeStrip() : null}
                        </div>
                      ) : changeItems.length > 0 ? (
                        renderChangeStrip()
                      ) : null}
                      {priceMetricItems.some((item) => item.show !== false) ? (
                        <div className="tokenMetricGrid">{renderMetricTiles(priceMetricItems)}</div>
                      ) : null}
                    </>
                  )
                })}

              {renderPanel({
                title: tokenSupplyTitle,
                className: 'tokenSupplyPanel',
                children: <div className="tokenMetricGrid">{renderMetricTiles(tokenSupplyItems)}</div>
              })}

              {statistics &&
                renderPanel({
                  title: tt('tables.statsClosedDay'),
                  className: 'tokenClosedPanel',
                  children: <div className="tokenMetricGrid">{renderMetricTiles(closedDayItems)}</div>
                })}

              {statistics &&
                renderPanel({
                  title: tt('tables.stats24h'),
                  className: 'tokenStatsPanel',
                  children: (
                    <div className="tokenMetricGrid tokenMetricGridDense">
                      {renderMetricTiles(stats24hItems)}
                    </div>
                  )
                })}

              {isMptToken &&
                token.metadata &&
                renderPanel({
                  title: tt('tables.mptMetadata'),
                  className: 'tokenMetadataPanel',
                  children: <div className="tokenMetricGrid">{renderMetricTiles(metadataItems)}</div>
                })}
            </div>
          </div>

          <TokenCharts token={token} selectedCurrency={selectedCurrency} />

          <section className="tokenActivitySection">
            <div className="tokenActivityGrid">
              {renderTokenActivityWidget({
                titleText: tt('activity.dexSwaps'),
                rows: dexSwaps,
                rowRenderer: renderDexSwapRow,
                loading: dexSwapsLoading,
                onRefresh: refreshDexSwaps,
                isRefreshHidden: dexSwapsRefreshHidden,
                refreshCooldownSeconds: dexSwapsRefreshSeconds,
                headerActions: renderActivityOrderToggle(dexSwapsOrder, setDexSwapsOrder),
                emptyText: tt('activity.noData24h'),
                limit: DEX_SWAPS_LIMIT
              })}

              {renderTokenActivityWidget({
                titleText: tt('activity.transfers'),
                rows: transfers,
                rowRenderer: renderTransferRow,
                loading: transfersLoading,
                onRefresh: refreshTransfers,
                isRefreshHidden: transfersRefreshHidden,
                refreshCooldownSeconds: transfersRefreshSeconds,
                headerActions: renderActivityOrderToggle(transfersOrder, setTransfersOrder),
                emptyText: tt('activity.noData24h'),
                limit: 10
              })}

              {showMintActivity &&
                renderTokenActivityWidget({
                  titleText: tt('activity.mints'),
                  rows: mints,
                  rowRenderer: renderMintRow,
                  loading: mintsLoading,
                  onRefresh: refreshMints,
                  isRefreshHidden: mintsRefreshHidden,
                  refreshCooldownSeconds: mintsRefreshSeconds,
                  headerActions: renderActivityOrderToggle(mintsOrder, setMintsOrder),
                  emptyText: tt('activity.noData24h'),
                  limit: 10
                })}

              {renderTokenActivityWidget({
                titleText: tt('activity.burns'),
                rows: burns,
                rowRenderer: renderBurnRow,
                loading: burnsLoading,
                onRefresh: refreshBurns,
                isRefreshHidden: burnsRefreshHidden,
                refreshCooldownSeconds: burnsRefreshSeconds,
                headerActions: renderActivityOrderToggle(burnsOrder, setBurnsOrder),
                emptyText: tt('activity.noData24h'),
                limit: 10
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
