import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FaHandshake } from 'react-icons/fa'
import axios from 'axios'

import SEO from '../../components/SEO'
import TokenSelector from '../../components/UI/TokenSelector'
import {
  tokenActivityCard,
  tokenActivityAmountCurrency,
  tokenActivityAmountLine,
  tokenActivityAmountValue,
  tokenChangeItem,
  tokenChangeList,
  tokenClass,
  tokenPriceDesktopOnly,
  tokenPriceLine,
  tokenPriceSecondary,
  tokenSwapAmount,
  tokenSwapPrice,
  tokenSwapPriceLabel,
  tokenSwapPriceValue,
  tokenSwapRow,
  tokenSwapSource,
  tokenSwapSourcePill,
  tokenSwapFlow,
  tokenSwapFlowAddress,
  tokenSwapPriceAsset,
  tokenTransferMetric,
  tokenTransferRow
} from '../../styles/pages/token.module.scss'
import {
  niceNumber,
  shortNiceNumber,
  fullNiceNumber,
  AddressWithIconFilled,
  AddressWithIconInline,
  addressUsernameOrServiceLink,
  CurrencyWithIconInline,
  dateFormat,
  timeFormat,
  amountParced
} from '../../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import {
  isAddressOrUsername,
  nativeCurrency,
  tokenImageSrc,
  validateCurrencyCode,
  xahauNetwork
} from '../../utils'
import CopyButton from '../../components/UI/CopyButton'
import TokenTabs from '../../components/Tabs/TokenTabs'
import HomeTeaser, { HomeTeaseRow } from '../../components/Home/HomeTeaser'
import homeTeaserStyles from '@/styles/components/home-teaser.module.scss'

const tokenSwapsUrl = (token, type) => {
  if (!token) return ''
  const mptId = token?.mptokenIssuanceID
  const tokenPath = mptId
    ? encodeURIComponent(mptId)
    : token?.issuer
      ? `${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}`
      : encodeURIComponent(nativeCurrency)

  return `v2/token/${tokenPath}/swaps?limit=5&type=${type}`
}

const REFRESH_COOLDOWN_MS = 30000

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
  const [dexSwapsLoading, setDexSwapsLoading] = useState(!!initialData)
  const [transfersLoading, setTransfersLoading] = useState(!!initialData)
  const [dexSwapsRefreshHidden, setDexSwapsRefreshHidden] = useState(false)
  const [transfersRefreshHidden, setTransfersRefreshHidden] = useState(false)
  const [dexSwapsRefreshSeconds, setDexSwapsRefreshSeconds] = useState(0)
  const [transfersRefreshSeconds, setTransfersRefreshSeconds] = useState(0)
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
  const dexSwapsRefreshTimeoutRef = useRef(null)
  const transfersRefreshTimeoutRef = useRef(null)
  const dexSwapsRefreshIntervalRef = useRef(null)
  const transfersRefreshIntervalRef = useRef(null)

  let selectedCurrency = selectedCurrencyServer
  let fiatRate = fiatRateServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

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

  const fetchDexSwaps = useCallback(async ({ clear = false } = {}) => {
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

    const response = await axios(tokenSwapsUrl(token, 'dex')).catch(() => null)

    if (dexSwapsRequestRef.current !== requestId) return

    setDexSwaps(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 5) : [])
    setDexSwapsLoading(false)
  }, [token])

  const fetchTransfers = useCallback(async ({ clear = false } = {}) => {
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

    const response = await axios(tokenSwapsUrl(token, 'transfer')).catch(() => null)

    if (transfersRequestRef.current !== requestId) return

    setTransfers(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 5) : [])
    setTransfersLoading(false)
  }, [token])

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

  useEffect(() => {
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
    setDexSwaps([])
    setTransfers([])
    fetchDexSwaps()
    fetchTransfers()
  }, [clearRefreshCooldown, fetchDexSwaps, fetchTransfers])

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

  // Helper: price line as "fiat (XRP)" using historical rate when available
  const priceLine = ({ priceNative, priceFiat }) => {
    const price = priceNative
    const currencyText = token?.currencyDetails?.currency || token?.currency || nativeCurrency
    const isNativeFromToken = !token?.issuer && token?.currency === nativeCurrency
    const nativePrice =
      price < 0.0001 ? (
        <span className="no-brake">
          1M {currencyText} = {niceNumber(price * 1000000, 6)} {nativeCurrency}
        </span>
      ) : (
        <span className="no-brake">
          {niceNumber(price, 6)} {nativeCurrency}
        </span>
      )

    return (
      <span className={tokenPriceLine}>
        <span className="no-brake" suppressHydrationWarning>
          {niceNumber(priceFiat || 0, 4, selectedCurrency)}
        </span>
        {!isNativeFromToken && (
          <span className={`grey ${tokenPriceSecondary}`.trim()}>
            <span className={tokenPriceDesktopOnly}>(</span>
            {nativePrice}
            <span className={tokenPriceDesktopOnly}>, </span>
            <span className="no-brake">
              1 {nativeCurrency} = {niceNumber(1 / price, 6)} {currencyText}
            </span>
            <span className={tokenPriceDesktopOnly}>)</span>
          </span>
        )}
      </span>
    )
  }

  const marketcapLine = ({ marketcap }) => {
    if (!fiatRate || !marketcap) return null
    const marketcapFiat = marketcap * fiatRate
    return (
      <span className={tokenPriceLine}>
        <span className="no-brake" suppressHydrationWarning>
          {niceNumber(marketcapFiat, 2, selectedCurrency)}
        </span>
        <span className={`grey ${tokenPriceSecondary}`.trim()}>
          <span className={tokenPriceDesktopOnly}>(</span>
          <span className="no-brake">
            {niceNumber(marketcap, 2)} {nativeCurrency}
          </span>
          <span className={tokenPriceDesktopOnly}>)</span>
        </span>
      </span>
    )
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
    return (
      <span suppressHydrationWarning>
        {niceNumber(volumeFiat, 2, selectedCurrency)}
        {isSsrMobile ? <br /> : ' '}
        <span className="grey">
          {!isSsrMobile && '('}
          {niceNumber(volume, 2)} {currencyDetails?.currency || token?.currency || nativeCurrency}
          {!isSsrMobile && ')'}
        </span>
      </span>
    )
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
  const isNativeToken = !token?.issuer && token?.currency === nativeCurrency
  const isRoundTokenImage = !!token?.issuer || isMptToken || isNativeToken
  const tokenDisplayCurrency = isMptToken
    ? token?.metadata?.name || token?.currency || 'MPT'
    : token?.currencyDetails?.currency || token?.currency || nativeCurrency
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

  const title = isNativeToken ? (
    <>
      {tokenDisplayCurrency} ({tt('title.nativeCurrency')})
    </>
  ) : (
    <>
      {tokenDisplayCurrency} {tt('title.issuedBy')} {addressUsernameOrServiceLink(token, 'issuer', { short: true })}
    </>
  )
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
      <span className={tokenActivityAmountLine} title={title}>
        <span className={tokenActivityAmountValue}>{parts.value}</span>
        {parts.currency ? <span className={tokenActivityAmountCurrency}>{parts.currency}</span> : null}
      </span>
    )
  }
  const hasActivityValue = (value) => value !== undefined && value !== null && value !== ''
  const activityAddressShort = isSsrMobile ? 3 : 4

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
    if (row.amm_id) return 'AMM'
    return 'DEX'
  }

  const renderDexSwapRow = (row, index) => {
    const swapPrice = getSwapPrice(row)

    return (
      <HomeTeaseRow
        key={`dex-${row.tx_hash || row.timestamp}-${row.amm_id || row.offer_id || 'swap'}-${index}`}
        href={`/tx/${row.tx_hash}`}
        className={tokenSwapRow}
      >
        <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
        <div className={tokenSwapFlow}>
          <span className={tokenSwapFlowAddress}>
            <AddressWithIconInline
              data={row}
              name="address1"
              options={{ short: activityAddressShort, noLink: true, showAddress: true }}
            />
          </span>
          <span className={homeTeaserStyles.whaleArrow}>→</span>
          <span className={tokenSwapFlowAddress}>
            <AddressWithIconInline
              data={row}
              name="address2"
              options={{ short: activityAddressShort, noLink: true, showAddress: true }}
            />
          </span>
        </div>
        <div className={tokenSwapAmount}>
          {renderActivityAmount(row.amount1)}
          {hasActivityValue(row.amount2) ? <span className="grey">{renderActivityAmount(row.amount2)}</span> : null}
        </div>
        <div className={tokenSwapPrice}>
          <span className={tokenSwapPriceLabel}>{tt('activity.rate')}</span>
          <span className={tokenSwapPriceValue}>
            {swapPrice ? (
              <span className="tooltip">
                {shortNiceNumber(swapPrice.value, 6, 1)}
                <span className={tokenSwapPriceAsset} title={swapPrice.currency}>
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
        <div className={tokenSwapSource}>
          <span className={tokenSwapSourcePill}>{renderSwapSource(row)}</span>
        </div>
      </HomeTeaseRow>
    )
  }

  const renderTransferRow = (row, index) => (
    <HomeTeaseRow
      key={`transfer-${row.tx_hash || row.timestamp}-${row.address1 || ''}-${row.address2 || ''}-${index}`}
      href={`/tx/${row.tx_hash}`}
      className={`${homeTeaserStyles.whaleRow} ${tokenTransferRow}`}
    >
      <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
      <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell}`}>
        <AddressWithIconInline data={row} name="address1" options={{ short: activityAddressShort, noLink: true }} />
      </div>
      <div className={homeTeaserStyles.whaleArrow}>→</div>
      <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell}`}>
        <AddressWithIconInline data={row} name="address2" options={{ short: activityAddressShort, noLink: true }} />
      </div>
      <div className={`${homeTeaserStyles.metric} ${homeTeaserStyles.metricWithDelta} ${homeTeaserStyles.whaleFiat} ${tokenTransferMetric}`}>
        {renderActivityAmount(row.amount1)}
      </div>
    </HomeTeaseRow>
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
    emptyText
  }) => {
    const visibleRows = Array.isArray(rows) ? rows.slice(0, 5) : []

    return (
      <HomeTeaser
        title={title}
        titleText={titleText}
        isLoading={loading && !visibleRows.length}
        isRefreshing={loading}
        onRefresh={onRefresh}
        isRefreshHidden={isRefreshHidden}
        refreshCooldownSeconds={refreshCooldownSeconds}
        isEmpty={!visibleRows.length}
        emptyText={emptyText}
        className={`${homeTeaserStyles.whaleCard} ${tokenActivityCard}`}
      >
        {visibleRows.map(rowRenderer)}
      </HomeTeaser>
    )
  }

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
      <div className={tokenClass}>
        <h1 className="center">{title}</h1>

        {!xahauNetwork && <TokenTabs />}

        <div className="content-profile">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{ width: '100%', marginBottom: '20px' }}>
              <TokenSelector value={selectedToken} onChange={setSelectedToken} excludeNative={false} />
            </div>
          </div>
          <div className="column-left">
            {/* Big Token Icon */}
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
            <h1>{tokenDisplayCurrency}</h1>

            {/* Action Buttons */}
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

          <div className="column-right">
            {/* Token Information */}
            <table className="table-details">
              <thead>
                <tr>
                  <th colSpan="100">{tt('tables.tokenInformation')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{tt('fields.currency')}</td>
                  <td>{tokenDisplayCurrency}</td>
                </tr>
                {isMptToken && (
                  <tr>
                    <td>{tt('fields.mptId')}</td>
                    <td>
                      {mptId} <CopyButton text={mptId} />
                    </td>
                  </tr>
                )}
                {isLpToken && (
                  <tr>
                    <td>{tt('fields.ammPool')}</td>
                    <td>{lpAmmId ? <Link href={`/amm/${lpAmmId}`}>{tt('actions.viewPool')}</Link> : '-'}</td>
                  </tr>
                )}
                {isLpToken && (
                  <tr>
                    <td>{tt('fields.asset1')}</td>
                    <td>{renderLpAsset(lpAsset)}</td>
                  </tr>
                )}
                {isLpToken && (
                  <tr>
                    <td>{tt('fields.asset2')}</td>
                    <td>{renderLpAsset(lpAsset2)}</td>
                  </tr>
                )}
                {token?.name && (
                  <tr>
                    <td>{tt('fields.name')}</td>
                    <td>{token.name}</td>
                  </tr>
                )}
                {token?.description && (
                  <tr>
                    <td>{tt('fields.description')}</td>
                    <td>{token.description}</td>
                  </tr>
                )}
                {!isNativeToken && (
                  <tr>
                    <td>{tt('fields.issuer')}</td>
                    <td>
                      <AddressWithIconFilled
                        data={token}
                        name="issuer"
                        copyButton={true}
                        options={isSsrMobile ? { short: 10 } : null}
                      />
                    </td>
                  </tr>
                )}
                {!isMptToken && (
                  <tr>
                    <td>{tt('fields.currencyCode')}</td>
                    <td className="brake">
                      {token.currencyDetails?.currencyCode || token.currency}{' '}
                      <CopyButton text={token.currencyDetails?.currencyCode || token.currency} />
                    </td>
                  </tr>
                )}
                {!isMptToken ? (
                  <>
                    <tr>
                      <td>{tt('fields.supply')}</td>
                      <td>
                        {fullNiceNumber(token.supply)} {tokenDisplayCurrency}
                      </td>
                    </tr>
                    <tr>
                      <td>{tt('fields.holders')}</td>
                      <td>
                        {isNativeToken ? (
                          <Link href="/distribution">{fullNiceNumber(token.holders)}</Link>
                        ) : (
                          <Link
                            href={
                              '/distribution?currencyIssuer=' +
                              token.issuer +
                              '&currency=' +
                              token.currencyDetails?.currencyCode
                            }
                          >
                            {fullNiceNumber(token.holders)}
                          </Link>
                        )}
                      </td>
                    </tr>
                    {!isNativeToken && (
                      <tr>
                        <td>{tt('fields.trustlines')}</td>
                        <td>{fullNiceNumber(token.trustlines)}</td>
                      </tr>
                    )}
                    <tr>
                      <td>{tt('fields.escrow')}</td>
                      <td>{escrowStatus}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td>{tt('fields.outstanding')}</td>
                      <td>{fullNiceNumber(Number(token.outstandingAmount || 0) / 10 ** (token.scale || 0) || 0)}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.maxSupply')}</td>
                      <td>{fullNiceNumber(Number(token.maximumAmount || 0) / 10 ** (token.scale || 0) || 0)}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.lockedAmount')}</td>
                      <td>{fullNiceNumber(Number(token.lockedAmount || 0) / 10 ** (token.scale || 0) || 0)}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.holders')}</td>
                      <td>{fullNiceNumber(token.holders || 0)}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.authorizedAddresses')}</td>
                      <td>{fullNiceNumber(token.mptokens || 0)}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.transferFee')}</td>
                      <td>{token.transferFee ? token.transferFee / 1000 + '%' : tt('values.none')}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.decimalPlaces')}</td>
                      <td>{token.scale || 0}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.tokenSequence')}</td>
                      <td>{fullNiceNumber(token.sequence || 0)}</td>
                    </tr>
                    <tr>
                      <td>{tt('fields.created')}</td>
                      <td>
                        {token.createdAt ? (
                          <>
                            {dateFormat(token.createdAt)} {timeFormat(token.createdAt)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>{tt('fields.lastUpdated')}</td>
                      <td>
                        {token.updatedAt ? (
                          <>
                            {dateFormat(token.updatedAt)} {timeFormat(token.updatedAt)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>{tt('fields.lastUsed')}</td>
                      <td>
                        {token.lastUsedAt ? (
                          <>
                            {dateFormat(token.lastUsedAt)} {timeFormat(token.lastUsedAt)}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>{tt('fields.flags')}</td>
                      <td>
                        {token.flags
                          ? Object.keys(token.flags)
                              .filter((flag) => token.flags[flag])
                              .join(', ') || tt('values.noneSet')
                          : tt('values.none')}
                      </td>
                    </tr>
                  </>
                )}
                {/*
                <tr>
                  <td>KYC Status</td>
                  <td>{token.kyc ? 'Verified' : 'Not Verified'}</td>
                </tr>
                */}
                {/*
                <tr>
                  <td>Token Type</td>
                  <td>
                    {token.lp_token ? 'LP Token' : 'Standard Token'}
                    {token.stablecoin && ' (Stablecoin)'}
                    {token.fiat && ` (${token.fiat})`}
                  </td>
                </tr>
                */}
                {/*
                {token.statistics?.timeAt && (
                  <tr>
                    <td>Last Updated</td>
                    <td>{fullDateAndTime(token.statistics?.timeAt)}</td>
                  </tr>
                )}
                */}
              </tbody>
            </table>

            {isMptToken && token.metadata && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">{tt('tables.mptMetadata')}</th>
                  </tr>
                </thead>
                <tbody>
                  {token.metadata?.name && (
                    <tr>
                      <td>{tt('fields.name')}</td>
                      <td>{token.metadata.name}</td>
                    </tr>
                  )}
                  {(token.metadata?.description || token.description) && (
                    <tr>
                      <td>{tt('fields.description')}</td>
                      <td>{token.metadata?.description || token.description}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{tt('fields.rawMetadata')}</td>
                    <td>
                      <pre style={{ maxHeight: 260, overflow: 'auto', margin: 0 }}>
                        <code>{JSON.stringify(token.metadata, null, 2)}</code>
                      </pre>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Price Information */}
            {showPriceInformation && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">{tt('tables.priceInformation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="center">
                      <td colSpan="100">
                        <span className="waiting"></span>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {effectiveNativePrice && (
                        <tr>
                          <td>{tt('fields.lastPrice')}</td>
                          <td>
                            {priceLine({
                              priceNative: effectiveNativePrice,
                              priceFiat: statistics?.priceFiats[selectedCurrency]
                            })}
                          </td>
                        </tr>
                      )}
                      {changeItems.length > 0 && (
                        <tr>
                          <td>{tt('fields.change')}</td>
                          <td>
                            <div className={tokenChangeList}>
                              {changeItems.map((item) => (
                                <span key={item.key} className={tokenChangeItem}>
                                  {item.label}:{' '}
                                  {renderPercentCell({
                                    currentPrice: statistics?.priceFiats[selectedCurrency],
                                    pastPrice: item.pastPrice
                                  })}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      {statistics?.priceNativeCurrencySpot && (
                        <tr>
                          <td>{tt('fields.spotPrice')}</td>
                          <td>
                            {priceLine({
                              priceNative: statistics?.priceNativeCurrencySpot,
                              priceFiat: statistics?.priceFiatsSpot[selectedCurrency]
                            })}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td>{tt('fields.marketCap')}</td>
                        <td>{marketcapLine({ marketcap: statistics?.marketcap })}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}

            {/* Stats for the last 24h */}
            {statistics && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">{tt('tables.stats24h')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{tt('fields.volumeTotal')}</td>
                    <td>{volumeLine({ token, type: 'total' })}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.volumeBuy')}</td>
                    <td>{volumeLine({ token, type: 'buy' })}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.volumeSell')}</td>
                    <td>{volumeLine({ token, type: 'sell' })}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.trades')}</td>
                    <td>{fullNiceNumber(statistics?.dexes || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.dexTxs')}</td>
                    <td>{fullNiceNumber(statistics?.dexTxs || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.buyers')}</td>
                    <td>{fullNiceNumber(statistics?.uniqueBuyers || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.sellers')}</td>
                    <td>{fullNiceNumber(statistics?.uniqueSellers || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.traders')}</td>
                    <td>{fullNiceNumber(statistics?.uniqueDexAccounts || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.transferVolume')}</td>
                    <td>{volumeLine({ token, type: 'transfer' })}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.transferTransactions')}</td>
                    <td>{niceNumber(statistics?.transferTxs || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.ripplingTxs')}</td>
                    <td>{fullNiceNumber(statistics?.ripplingTxs || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.mintVolume')}</td>
                    <td>{volumeLine({ token, type: 'mint' })}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.mintTransactions')}</td>
                    <td>{shortNiceNumber(statistics?.mintTxs || 0, 0, 1)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.burnVolume')}</td>
                    <td>{volumeLine({ token, type: 'burn' })}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.burnTransactions')}</td>
                    <td>{shortNiceNumber(statistics?.burnTxs || 0, 0, 1)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.uniqueAccounts')}</td>
                    <td>{fullNiceNumber(statistics?.uniqueAccounts || 0)}</td>
                  </tr>
                  {!xahauNetwork && !isMptToken && (
                    <tr>
                      <td>{tt('fields.ammPools')}</td>
                      <td>
                        <Link
                          href={
                            token?.issuer
                              ? `/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`
                              : `/amms?currency=${token.currency}`
                          }
                        >
                          {statistics?.ammPools || 0}
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Stats for the last closed day */}
            {statistics && (
              <table className="table-details">
                <thead>
                  <tr>
                    <th colSpan="100">{tt('tables.statsClosedDay')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{tt('fields.tradingPairs')}</td>
                    <td>{fullNiceNumber(statistics?.activeCounters || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.activeHolders')}</td>
                    <td>{fullNiceNumber(statistics?.activeHolders || 0)}</td>
                  </tr>
                  <tr>
                    <td>{tt('fields.activeOffers')}</td>
                    <td>{fullNiceNumber(statistics?.activeOffers || 0)}</td>
                  </tr>
                  {!xahauNetwork && !isMptToken && (
                    <tr>
                      <td>{tt('fields.activeAmmPools')}</td>
                      <td>{niceNumber(statistics?.activeAmmPools || 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {renderTokenActivityWidget({
              titleText: tt('activity.lastDexSwaps'),
              rows: dexSwaps,
              rowRenderer: renderDexSwapRow,
              loading: dexSwapsLoading,
              onRefresh: refreshDexSwaps,
              isRefreshHidden: dexSwapsRefreshHidden,
              refreshCooldownSeconds: dexSwapsRefreshSeconds,
              emptyText: tt('activity.noData24h')
            })}

            {renderTokenActivityWidget({
              titleText: tt('activity.lastTransfers'),
              rows: transfers,
              rowRenderer: renderTransferRow,
              loading: transfersLoading,
              onRefresh: refreshTransfers,
              isRefreshHidden: transfersRefreshHidden,
              refreshCooldownSeconds: transfersRefreshSeconds,
              emptyText: tt('activity.noData24h')
            })}
          </div>
        </div>
      </div>
    </>
  )
}
