import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'
import { useState, useEffect, useRef } from 'react'
import { FaHandshake } from 'react-icons/fa'

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import IssuerSearchSelect from '../components/UI/IssuerSearchSelect'
import CurrencySearchSelect from '../components/UI/CurrencySearchSelect'
import SortingArrow from '../components/Tables/SortingArrow'
import { fullNiceNumber, niceCurrency, niceNumber, shortNiceNumber, AddressWithIconFilled } from '../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { isAddressOrUsername, nativeCurrency, setTabParams, validateCurrencyCode, xahauNetwork } from '../utils'
import { useRouter } from 'next/router'
import TokenTabs from '../components/Tabs/TokenTabs'
import Link from 'next/link'

/*
  {
    "token": "rL2sSC2eMm6xYyx1nqZ9MW4AP185mg7N9t:4150585800000000000000000000000000000000",
    "issuer": "rL2sSC2eMm6xYyx1nqZ9MW4AP185mg7N9t",
    "issuerDetails": {
      "address": "rL2sSC2eMm6xYyx1nqZ9MW4AP185mg7N9t",
      "username": null,
      "service": null
    },
    "currency": "4150585800000000000000000000000000000000",
    "supply": "98431923.34053394847447",
    "trustlines": 9806,
    "holders": 9183,
    "rating": 0,
    "statistics": {
      "activeHolders": 675,
      "sellVolume": "105342.5712484148477598",
      "buyVolume": "162077.562673509980921282459",
      "uniqueSellers": 75,
      "uniqueBuyers": 116,
      "dexes": 4519,
      "dexTxs": 4299,
      "mintVolume": "0.000000001555550273270893",
      "burnVolume": "54.317077167655393322039993",
      "transferVolume": "319729.5692719547508735106899",
      "ripplingVolume": null,
      "mintTxs": 14,
      "burnTxs": 4833,
      "transferTxs": 646,
      "ripplingTxs": 0,
      "uniqueAccounts": 730,
      "uniqueDexAccounts": 178,
      "priceNativeCurrency": "0.1146566270598530742",
      "marketcap": "45723206.888776201217059311928860827119097212012795446"
    }
  }
]
*/

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, query } = context
  const { currency, issuer, order } = query

  let initialData = null
  let initialErrorMessage = null

  // Validate order param
  const supportedOrders = [
    'rating',
    'trustlinesHigh',
    'holdersHigh',
    'priceNativeCurrencyHigh',
    'marketCapHigh',
    'sellVolumeHigh',
    'buyVolumeHigh',
    'totalVolumeHigh',
    'uniqueTradersHigh',
    'uniqueSellersHigh',
    'uniqueBuyersHigh'
  ]
  const orderParam = supportedOrders.includes(order) ? order : 'rating'
  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  let url = `v2/trustlines/tokens?limit=100&order=${orderParam}&currencyDetails=true&statistics=true&convertCurrencies=${selectedCurrencyServer}`
  if (currency) {
    const { valid, currencyCode } = validateCurrencyCode(currency)
    if (valid) {
      url += `&currency=${currencyCode}`
    } else {
      initialErrorMessage = 'Invalid currency code'
    }
  }
  if (issuer) {
    if (isAddressOrUsername(issuer)) {
      url += `&issuer=${issuer}`
    } else {
      initialErrorMessage = 'Invalid issuer address or issuer username'
    }
  }

  try {
    const res = await axiosServer({
      method: 'get',
      url,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (e) {
    console.error(e)
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      fiatRateServer,
      selectedCurrencyServer,
      currencyQuery: currency || initialData?.currency || null,
      issuerQuery: issuer || initialData?.issuer || null,
      orderQuery: supportedOrders.includes(order) ? order : null,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const orderList = [
  { value: 'rating', label: 'Rating: High to Low' },
  { value: 'trustlinesHigh', label: 'Trustlines: High to Low' },
  { value: 'holdersHigh', label: 'Holders: High to Low' },
  { value: 'priceNativeCurrencyHigh', label: 'Price: High to Low' },
  { value: 'marketCapHigh', label: 'Marketcap: High to Low' },
  { value: 'sellVolumeHigh', label: 'Sell Volume (24h): High to Low' },
  { value: 'buyVolumeHigh', label: 'Buy Volume (24h): High to Low' },
  { value: 'totalVolumeHigh', label: 'Total Volume (24h): High to Low' },
  { value: 'uniqueTradersHigh', label: 'Unique Traders (24h): High to Low' },
  { value: 'uniqueSellersHigh', label: 'Unique Sellers (24h): High to Low' },
  { value: 'uniqueBuyersHigh', label: 'Unique Buyers (24h): High to Low' }
]

// Helper component to render token with icon
const TokenCell = ({ token }) => {
  return (
    <AddressWithIconFilled
      data={token}
      name="issuer"
      currency={token?.currency}
      options={{ short: true, currencyDetails: token?.currencyDetails }}
    />
  )
}

export default function Tokens({
  initialData,
  initialErrorMessage,
  subscriptionExpired,
  sessionToken,
  setSignRequest,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  setSelectedCurrency,
  fiatRate: fiatRateApp,
  fiatRateServer,
  openEmailLogin,
  currencyQuery,
  issuerQuery,
  orderQuery
}) {
  const { t } = useTranslation()
  const isFirstRender = useRef(true)
  const router = useRouter()

  let selectedCurrency = selectedCurrencyServer
  let fiatRate = fiatRateServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  // States
  const [data, setData] = useState(initialData?.tokens || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [marker, setMarker] = useState(initialData?.marker)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState(orderQuery || 'rating')
  const [filtersHide, setFiltersHide] = useState(false)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [currency, setCurrency] = useState(currencyQuery)
  const [rendered, setRendered] = useState(false)
  const [sortConfig, setSortConfig] = useState(getInitialSortConfig(orderQuery))

  const controller = new AbortController()

  function getInitialSortConfig(o) {
    switch (o) {
      case 'rating':
        return { key: 'rating', direction: 'descending' }
      case 'trustlinesHigh':
        return { key: 'trustlines', direction: 'descending' }
      case 'holdersHigh':
        return { key: 'holders', direction: 'descending' }
      case 'priceNativeCurrencyHigh':
        return { key: 'price', direction: 'descending' }
      case 'marketCapHigh':
        return { key: 'marketcap', direction: 'descending' }
      case 'sellVolumeHigh':
        return { key: 'sellVolume', direction: 'descending' }
      case 'buyVolumeHigh':
        return { key: 'buyVolume', direction: 'descending' }
      case 'totalVolumeHigh':
        return { key: 'totalVolume', direction: 'descending' }
      case 'uniqueTradersHigh':
        return { key: 'uniqueTraders', direction: 'descending' }
      case 'uniqueSellersHigh':
        return { key: 'uniqueSellers', direction: 'descending' }
      case 'uniqueBuyersHigh':
        return { key: 'uniqueBuyers', direction: 'descending' }
      default:
        return { key: 'rating', direction: 'descending' }
    }
  }

  // Fetch tokens
  const checkApi = async () => {
    const oldOrder = rawData?.order
    const oldCurrency = rawData?.currency
    const oldIssuer = rawData?.issuer
    const oldSelectedCurrency = rawData?.convertCurrencies[0]
    if (!oldOrder || !order) return

    let loadMoreRequest =
      (order ? oldOrder.toString() === order.toString() : !oldOrder) &&
      (currency ? oldCurrency === currency : !oldCurrency) &&
      (issuer ? oldIssuer === issuer : !oldIssuer) &&
      (selectedCurrency ? oldSelectedCurrency.toLowerCase() === selectedCurrency.toLowerCase() : !oldSelectedCurrency)

    // do not load more if thereis no session token or if Bithomp Pro is expired
    if (loadMoreRequest && (!sessionToken || (sessionToken && subscriptionExpired))) {
      return
    }

    let markerPart = ''
    if (loadMoreRequest) {
      markerPart = '&marker=' + rawData?.marker
    }

    if (!markerPart) {
      setLoading(true)
    }
    setRawData({})

    let apiUrl =
      'v2/trustlines/tokens?limit=100&order=' +
      order +
      '&currencyDetails=true&statistics=true&convertCurrencies=' +
      selectedCurrency +
      markerPart
    if (issuer) {
      apiUrl += `&issuer=${encodeURIComponent(issuer)}`
    }
    if (currency) {
      apiUrl += `&currency=${encodeURIComponent(currency)}`
    }

    const response = await axios
      .get(apiUrl, {
        signal: controller.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false)
        }
      })

    const newdata = response?.data
    if (newdata) {
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.tokens) {
        let list = newdata.tokens
        if (list.length > 0) {
          setErrorMessage('')
          setMarker(newdata.marker)
          if (!loadMoreRequest) {
            setData(list)
          } else {
            setData([...data, ...list])
          }
        } else {
          setErrorMessage(t('general.no-data'))
        }
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage('Error')
        }
      }
    } else {
      setErrorMessage(t('general.no-data'))
    }
  }

  // Effect: refetch when order or search changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, order, issuer, currency, subscriptionExpired])

  // Effect: update sortConfig when order changes (e.g., from dropdown)
  useEffect(() => {
    setSortConfig(getInitialSortConfig(order))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (isAddressOrUsername(issuer)) {
      queryAddList.push({ name: 'issuer', value: issuer })
    } else {
      queryRemoveList.push('issuer')
    }

    const { valid, currencyCode } = validateCurrencyCode(currency)
    if (valid) {
      queryAddList.push({ name: 'currency', value: currencyCode })
    } else {
      queryRemoveList.push('currency')
    }

    setTabParams(
      router,
      [
        {
          tabList: orderList,
          tab: order,
          defaultTab: 'rating',
          setTab: setOrder,
          paramName: 'order'
        }
      ],
      queryAddList,
      queryRemoveList
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer, currency, order])

  // Cleanup on unmount
  useEffect(() => {
    setRendered(true)
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CSV headers for export
  const csvHeaders = [
    { label: 'Currency', key: 'currency' },
    { label: 'Issuer', key: 'issuer' },
    { label: 'Trustlines', key: 'trustlines' },
    { label: 'Holders', key: 'holders' }
  ]

  const handleSetTrustline = (token) => {
    // Format supply to have at most 6 decimal places
    const formatSupply = (supply) => {
      if (!supply) return '1000000000'
      const num = parseFloat(supply)
      if (isNaN(num)) return '1000000000'
      return num.toFixed(6)
    }

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

  const priceToFiat = ({ price, mobile, priceFiats }) => {
    if (!fiatRate) return null
    price = price || 0
    if (mobile) {
      return <span suppressHydrationWarning>{fullNiceNumber(priceFiats[selectedCurrency], selectedCurrency)}</span>
    }
    return (
      <>
        <span className="tooltip" suppressHydrationWarning>
          {shortNiceNumber(priceFiats[selectedCurrency], 4, 1, selectedCurrency)}
          <span className="tooltiptext right no-brake">
            {fullNiceNumber(priceFiats[selectedCurrency], selectedCurrency)}
          </span>
        </span>
        <br />
        <span className="tooltip grey" suppressHydrationWarning>
          {shortNiceNumber(price, 4, 1)} {nativeCurrency}
          <span className="tooltiptext right no-brake">
            {niceNumber(price, 6)} {nativeCurrency}
          </span>
        </span>
      </>
    )
  }

  const marketcapToFiat = ({ marketcap, mobile }) => {
    if (!fiatRate) return null

    marketcap = marketcap || 0

    if (mobile) {
      return <span suppressHydrationWarning>{niceNumber(marketcap * fiatRate, 0, selectedCurrency)}</span>
    }
    return (
      <span className="tooltip" suppressHydrationWarning>
        {shortNiceNumber(marketcap * fiatRate, 2, 1, selectedCurrency)}
        <span className="tooltiptext right no-brake" suppressHydrationWarning>
          {niceNumber(marketcap * fiatRate, 0, selectedCurrency)}
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
          Now: {fullNiceNumber(currentPrice, selectedCurrency)}
          <br />
          Before: {fullNiceNumber(pastPrice, selectedCurrency)}
        </span>
      </span>
    )
  }

  const volumeToFiat = ({ token, mobile, type }) => {
    const { statistics, currency } = token
    if (!fiatRate) return null
    let volume
    if (!type || type === 'total') {
      volume = Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    } else {
      volume = statistics?.[type + 'Volume'] || 0
    }
    const volumeFiat = volume * statistics?.priceNativeCurrency * fiatRate || 0

    if (mobile) {
      return <span suppressHydrationWarning>{niceNumber(volumeFiat, 0, selectedCurrency)}</span>
    }

    return (
      <>
        <span className="tooltip" suppressHydrationWarning>
          {shortNiceNumber(volumeFiat, 2, 1, selectedCurrency)}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {niceNumber(volumeFiat, 0, selectedCurrency)}
          </span>
        </span>
        <br />
        <span className="tooltip grey" suppressHydrationWarning>
          {shortNiceNumber(volume, 2, 1)} {niceCurrency(currency)}
          <span className="tooltiptext right no-brake" suppressHydrationWarning>
            {niceNumber(volume, 0)} {niceCurrency(currency)}
          </span>
        </span>
      </>
    )
  }

  const sortTable = (key) => {
    if (!data || data.length === 0) return

    if (sortConfig.key === key) {
      setSortConfig({ key: 'rating', direction: 'descending' })
      setOrder('rating')
      return
    }

    let direction = 'descending'
    setSortConfig({ key, direction })

    const apiOrderFor = (k) => {
      switch (k) {
        case 'rating':
          return 'rating'
        case 'trustlines':
          return 'trustlinesHigh'
        case 'holders':
          return 'holdersHigh'
        case 'price':
          return 'priceNativeCurrencyHigh'
        case 'marketcap':
          return 'marketCapHigh'
        case 'buyVolume':
          return 'buyVolumeHigh'
        case 'sellVolume':
          return 'sellVolumeHigh'
        case 'totalVolume':
          return 'totalVolumeHigh'
        case 'uniqueTraders':
          return 'uniqueTradersHigh'
        case 'uniqueSellers':
          return 'uniqueSellersHigh'
        case 'uniqueBuyers':
          return 'uniqueBuyersHigh'
        default:
          return null
      }
    }

    const newApiOrder = apiOrderFor(key)
    if (newApiOrder) {
      setOrder(newApiOrder)
    }
  }

  return (
    <>
      <SEO title="Tokens" />
      <h1 className="center">Tokens</h1>

      {!xahauNetwork && <TokenTabs tab="tokens" />}

      <FiltersFrame
        count={data?.length}
        hasMore={marker}
        data={data || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        setSelectedCurrency={setSelectedCurrency}
        selectedCurrency={selectedCurrency}
        filters={{
          issuer: issuer || '',
          currency: currency || ''
        }}
        order={order}
        setOrder={setOrder}
        orderList={orderList}
      >
        {/* Left filters */}
        <>
          {rendered && (
            <div className="flex flex-col sm:gap-4 md:h-[400px]">
              <CurrencySearchSelect setCurrency={setCurrency} defaultValue={currency} />
              <IssuerSearchSelect setIssuer={setIssuer} defaultValue={issuer} />
            </div>
          )}
        </>
        {/* Main content */}
        <InfiniteScrolling
          dataLength={data.length}
          loadMore={checkApi}
          hasMore={marker}
          errorMessage={errorMessage}
          subscriptionExpired={subscriptionExpired}
          sessionToken={sessionToken}
          openEmailLogin={openEmailLogin}
        >
          {/* Desktop table */}
          <table className="table-large clickable expand hide-on-small-w800">
            <thead>
              <tr>
                <th className="center">
                  <span className="inline-flex items-center">
                    #
                    <SortingArrow sortKey="rating" currentSort={sortConfig} onClick={() => sortTable('rating')} />
                  </span>
                </th>
                <th className="left">Token</th>
                <th className="right">
                  <span className="inline-flex items-center">
                    Price
                    <SortingArrow sortKey="price" currentSort={sortConfig} onClick={() => sortTable('price')} />
                  </span>
                </th>
                <th className="right">Change (24h)</th>
                <th className="right">
                  Total volume
                  <br />
                  <span className="inline-flex items-center">
                    (24h)
                    <SortingArrow
                      sortKey="totalVolume"
                      currentSort={sortConfig}
                      onClick={() => sortTable('totalVolume')}
                    />
                  </span>
                </th>
                <th className="right">
                  <span className="inline-flex items-center">
                    Buyers
                    <SortingArrow
                      sortKey="uniqueBuyers"
                      currentSort={sortConfig}
                      onClick={() => sortTable('uniqueBuyers')}
                    />
                  </span>
                  <span className="inline-flex items-center">
                    / Sellers
                    <SortingArrow
                      sortKey="uniqueSellers"
                      currentSort={sortConfig}
                      onClick={() => sortTable('uniqueSellers')}
                    />
                  </span>
                  <br />
                  <span className="inline-flex items-center">
                    Traders (24h)
                    <SortingArrow
                      sortKey="uniqueTraders"
                      currentSort={sortConfig}
                      onClick={() => sortTable('uniqueTraders')}
                    />
                  </span>
                </th>
                <th className="right">
                  <span className="inline-flex items-center">
                    Holders
                    <SortingArrow sortKey="holders" currentSort={sortConfig} onClick={() => sortTable('holders')} />,
                  </span>
                  <br />
                  Active (24h)
                </th>
                {!xahauNetwork && (
                  <th className="center">
                    AMMs,
                    <br />
                    Active (24h)
                  </th>
                )}
                <th className="right">
                  Trades
                  <br />
                  (24h)
                </th>
                <th className="right">
                  <span className="inline-flex items-center">
                    Marketcap
                    <SortingArrow sortKey="marketcap" currentSort={sortConfig} onClick={() => sortTable('marketcap')} />
                  </span>
                </th>
                <th className="center">Action</th>
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
                  {errorMessage ? (
                    <tr>
                      <td colSpan="100" className="center orange bold">
                        {errorMessage}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {data.map((token, i) => {
                        return (
                          <tr key={i} onClick={() => router.push(`/token/${token.issuer}/${token.currency}`)}>
                            <td className="center">{i + 1}</td>
                            <td>
                              <TokenCell token={token} />
                            </td>
                            <td className="right">
                              {priceToFiat({
                                price: token.statistics?.priceNativeCurrency,
                                priceFiats: token.statistics.priceFiats
                              })}
                            </td>
                            <td className="right">
                              {renderPercentCell({
                                currentPrice: token.statistics?.priceFiats[selectedCurrency],
                                pastPrice: token.statistics?.priceFiats24h[selectedCurrency]
                              })}
                            </td>
                            <td className="right">{volumeToFiat({ token })}</td>
                            <td className="right">
                              <span className="tooltip">
                                <span className="green">
                                  {shortNiceNumber(token.statistics?.uniqueBuyers, 0, 1) || 0}
                                </span>{' '}
                                /{' '}
                                <span className="red">
                                  {shortNiceNumber(token.statistics?.uniqueSellers, 0, 1) || 0}
                                </span>
                                <br />
                                {shortNiceNumber(token.statistics?.uniqueDexAccounts, 0, 1) || 0}
                                <span className="tooltiptext no-brake">
                                  {fullNiceNumber(token.statistics?.uniqueDexAccounts) || 0}
                                </span>
                              </span>
                            </td>
                            <td className="right">
                              <span className="tooltip">
                                {shortNiceNumber(token.holders, 0, 1)}
                                <span className="tooltiptext no-brake">{fullNiceNumber(token.holders)}</span>
                              </span>
                              <br />
                              <span className="tooltip green">
                                {shortNiceNumber(token.statistics?.activeHolders, 0, 1) || 0}
                                <span className="tooltiptext no-brake">
                                  {fullNiceNumber(token.statistics?.activeHolders) || 0}
                                </span>
                              </span>
                            </td>
                            {!xahauNetwork && (
                              <td className="center">
                                <a
                                  href={`/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`}
                                  className="tooltip"
                                >
                                  {token.statistics?.ammPools || 0}
                                  <span className="tooltiptext no-brake">View AMMs</span>
                                </a>
                                <br />
                                <span className="tooltip green">
                                  {shortNiceNumber(token.statistics?.activeAmmPools, 0, 1) || 0}
                                </span>
                              </td>
                            )}
                            <td className="right">
                              <span className="tooltip">
                                {shortNiceNumber(token.statistics?.dexes, 0, 1) || 0}
                                <span className="tooltiptext no-brake">
                                  {fullNiceNumber(token.statistics?.dexes) || 0}
                                </span>
                              </span>
                            </td>
                            <td className="right">{marketcapToFiat({ marketcap: token.statistics?.marketcap })}</td>
                            <td className="center">
                              <span
                                onClick={() => {
                                  handleSetTrustline(token)
                                }}
                                className="orange tooltip"
                              >
                                <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} />
                                <span className="tooltiptext no-brake">Set trust</span>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>

          {/* Mobile table */}
          <div className="show-on-small-w800">
            <table className="table-mobile wide">
              <thead></thead>
              <tbody>
                {loading ? (
                  <tr className="center">
                    <td colSpan="100">
                      <span className="waiting"></span>
                    </td>
                  </tr>
                ) : (
                  <>
                    {errorMessage ? (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    ) : (
                      <>
                        {data.map((token, i) => {
                          return (
                            <tr key={i}>
                              <td style={{ padding: '5px' }} className="center">
                                <b>{i + 1}</b>
                              </td>
                              <td>
                                <TokenCell token={token} />
                                <p>
                                  Price:{' '}
                                  {priceToFiat({
                                    price: token.statistics?.priceNativeCurrency,
                                    mobile: true,
                                    priceFiats: token.statistics.priceFiats
                                  })}
                                  <br />
                                  Change 24h ({selectedCurrency.toUpperCase()}):{' '}
                                  {renderPercentCell({
                                    currentPrice: token.statistics?.priceFiats[selectedCurrency],
                                    pastPrice: token.statistics?.priceFiats24h[selectedCurrency]
                                  })}
                                  <br />
                                  Total Volume (24h): {volumeToFiat({ token, mobile: true })}
                                  <br />
                                  Trades (24h): {niceNumber(token.statistics?.dexes) || 0}
                                  <br />
                                  Unique Traders (24h): {niceNumber(token.statistics?.uniqueDexAccounts) || 0}
                                  <br />
                                  Marketcap: {marketcapToFiat({ marketcap: token.statistics?.marketcap, mobile: true })}
                                  <br />
                                  Holders:{' '}
                                  <Link
                                    href={`/distribution?currencyIssuer=${token.issuer}&currency=${token.currency}`}
                                  >
                                    {niceNumber(token.holders)}
                                  </Link>
                                  <br />
                                  Trustlines: {niceNumber(token.trustlines)}
                                  <br />
                                  <br />
                                  <button
                                    className="button-action narrow thin"
                                    onClick={() => router.push(`/token/${token.issuer}/${token.currency}`)}
                                  >
                                    Token Page
                                  </button>
                                  <span style={{ display: 'inline-block', width: 10 }}></span>
                                  <button
                                    className="button-action narrow thin"
                                    onClick={() => {
                                      handleSetTrustline(token)
                                    }}
                                  >
                                    <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} /> Set Trust
                                  </button>
                                </p>
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </InfiniteScrolling>
      </FiltersFrame>

      <style jsx>{`
        .issuer-address {
          color: var(--text-muted);
          font-size: 0.9em;
        }
      `}</style>
    </>
  )
}
