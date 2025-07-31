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
import {
  addressUsernameOrServiceLink,
  AddressWithIcon,
  fullNiceNumber,
  niceCurrency,
  niceNumber,
  shortNiceNumber
} from '../utils/format'
import { axiosServer, getFiatRateServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import {
  isAddressOrUsername,
  nativeCurrency,
  setTabParams,
  useWidth,
  validateCurrencyCode,
  xahauNetwork
} from '../utils'
import { useRouter } from 'next/router'

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
      "priceXrp": "0.1146566270598530742",
      "marketcap": "45723206.888776201217059311928860827119097212012795446"
    }
  }
]
*/

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, query } = context
  const { currency, issuer } = query

  let initialData = null
  let initialErrorMessage = null

  let url = `v2/trustlines/tokens?limit=100&order=rating&currencyDetails=true&statistics=true`
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

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      fiatRateServer,
      selectedCurrencyServer,
      currencyQuery: currency || initialData?.currency || null,
      issuerQuery: issuer || initialData?.issuer || null,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const orderList = [
  { value: 'rating', label: 'Rating: High to Low' },
  { value: 'trustlinesHigh', label: 'Trustlines: High to Low' },
  { value: 'holdersHigh', label: 'Holders: High to Low' }
]

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
  isSsrMobile,
  currencyQuery,
  issuerQuery
}) {
  const { t } = useTranslation()
  const width = useWidth()
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
  const [marker, setMarker] = useState(initialData?.marker)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState('rating')
  const [filtersHide, setFiltersHide] = useState(!isSsrMobile)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [currency, setCurrency] = useState(currencyQuery)
  const [rendered, setRendered] = useState(false)

  const controller = new AbortController()

  // Utility to build api url
  const apiUrl = (options = {}) => {
    const limit = 100
    const parts = []
    parts.push('v2/trustlines/tokens')
    parts.push(`?limit=${limit}`)
    parts.push(`&order=${order}`)
    parts.push(`&currencyDetails=true&statistics=true`)
    if (issuer) {
      parts.push(`&issuer=${encodeURIComponent(issuer)}`)
    }
    if (currency) {
      parts.push(`&currency=${encodeURIComponent(currency)}`)
    }
    if (options.marker) {
      parts.push(`&marker=${options.marker}`)
    }
    return parts.join('')
  }

  // Fetch tokens
  const checkApi = async (options = {}) => {
    if (loading) return
    setLoading(true)

    let markerToUse = undefined
    if (!options.restart) {
      markerToUse = options.marker || marker
    }

    // Check subscription for pagination beyond initial 100 items
    if (markerToUse && markerToUse !== 'first') {
      // do not load more if there is no session token or if Bithomp Pro is expired
      if (!sessionToken || (sessionToken && subscriptionExpired)) {
        setLoading(false)
        return
      }
    }

    const response = await axios
      .get(apiUrl({ marker: markerToUse }), {
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
      // If we are restarting (search/order changed) we replace list, else concat
      const restart = options.restart
      if (restart) {
        setData(newdata.tokens || [])
      } else {
        setData((prev) => [...prev, ...(newdata.tokens || [])])
      }
      setMarker(newdata.marker)
      setErrorMessage('')
    } else {
      setErrorMessage(t('general.no-data'))
    }
    setLoading(false)
  }

  // Effect: refetch when order or search changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
    } else {
      setMarker('first')
      checkApi({ restart: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, issuer, currency])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (isAddressOrUsername(issuer)) {
      queryAddList.push({
        name: 'issuer',
        value: issuer
      })
    } else {
      queryRemoveList.push('issuer')
    }

    const { valid, currencyCode } = validateCurrencyCode(currency)
    if (valid) {
      queryAddList.push({
        name: 'currency',
        value: currencyCode
      })
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
  }, [issuer, order, currency])

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

  // Helper component to render token with icon
  const TokenCell = ({ token }) => {
    return (
      <AddressWithIcon address={token?.issuer} currency={token?.currency}>
        {token.lp_token ? (
          <b>{token.currencyDetails.currency}</b>
        ) : (
          <>
            <b>{niceCurrency(token.currency)}</b>
          </>
        )}
        {token.issuer && (
          <>
            <br />
            {addressUsernameOrServiceLink(token, 'issuer', { short: true })}
          </>
        )}
      </AddressWithIcon>
    )
  }

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

  const priceToFiat = ({ price, mobile }) => {
    if (!fiatRate) return null
    price = price || 0
    if (mobile) {
      return (
        <span suppressHydrationWarning>
          {fullNiceNumber(price * fiatRate, selectedCurrency)}
          <br />
          Price in {nativeCurrency}: {niceNumber(price, 6)} {nativeCurrency}
        </span>
      )
    }
    return (
      <>
        <span className="tooltip" suppressHydrationWarning>
          {shortNiceNumber(price * fiatRate, 4, 1, selectedCurrency)}
          <span className="tooltiptext right no-brake">{fullNiceNumber(price * fiatRate, selectedCurrency)}</span>
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

  const volumeToFiat = ({ token, mobile, type }) => {
    const { statistics, currency } = token
    if (!fiatRate) return null
    let volume
    if (!type || type === 'total') {
      volume = Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    } else if (type === 'buy') {
      volume = statistics?.buyVolume || 0
    } else if (type === 'sell') {
      volume = statistics?.sellVolume || 0
    }
    const volumeFiat = volume * statistics?.priceXrp * fiatRate || 0

    if (mobile) {
      return (
        <>
          <span suppressHydrationWarning>{niceNumber(volumeFiat, 0, selectedCurrency)}</span>
          <br />
          {type === 'buy' ? 'Buy' : type === 'sell' ? 'Sell' : ''} Volume (24h) token: {niceNumber(volume, 0)}{' '}
          {niceCurrency(currency)}
        </>
      )
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

  return (
    <>
      <SEO title="Tokens" />
      <h1 className="center">Tokens</h1>

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        count={data?.length}
        hasMore={marker}
        data={data || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        setSelectedCurrency={setSelectedCurrency}
        selectedCurrency={selectedCurrency}
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
          loadMore={() => {
            if (marker && marker !== 'first') {
              checkApi({ marker })
            }
          }}
          hasMore={marker}
          errorMessage={errorMessage}
          subscriptionExpired={subscriptionExpired}
          sessionToken={sessionToken}
        >
          {/* Desktop table */}
          {!isSsrMobile || width > 860 ? (
            <table className="table-large no-hover">
              <thead>
                <tr>
                  <th className="center">#</th>
                  <th>Token</th>
                  <th className="right">Price</th>
                  {/*
                  <th className="right">24h %</th>
                  <th className="right">7d %</th>
                  */}
                  <th className="right">
                    Buy volume
                    <br />
                    (24h)
                  </th>
                  <th className="right">
                    Sell volume
                    <br />
                    (24h)
                  </th>
                  <th className="right">
                    Total volume
                    <br />
                    (24h)
                  </th>
                  <th className="right">
                    Buyers/Sellers
                    <br />
                    Traders (24h)
                  </th>
                  <th className="right">
                    Holders,
                    <br />
                    Active (24h)
                  </th>
                  <th className="right">
                    Trades
                    <br />
                    (24h)
                  </th>
                  <th className="right">Marketcap</th>
                  <th className="right">Trustlines</th>
                  {!xahauNetwork && <th className="center">AMMs</th>}
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
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              <td>
                                <TokenCell token={token} />
                              </td>
                              <td className="right">{priceToFiat({ price: token.statistics?.priceXrp })}</td>
                              {/*
                          <td className="right"></td>
                          <td className="right"></td>
                          */}
                              <td className="right">{volumeToFiat({ token, type: 'buy' })}</td>
                              <td className="right">{volumeToFiat({ token, type: 'sell' })}</td>
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
                              <td className="right">
                                <span className="tooltip">
                                  {shortNiceNumber(token.statistics?.dexes, 0, 1) || 0}
                                  <span className="tooltiptext no-brake">
                                    {fullNiceNumber(token.statistics?.dexes) || 0}
                                  </span>
                                </span>
                              </td>
                              <td className="right">{marketcapToFiat({ marketcap: token.statistics?.marketcap })}</td>
                              <td className="right">
                                <span className="tooltip">
                                  {shortNiceNumber(token.trustlines, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.trustlines)}</span>
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
                                </td>
                              )}

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
          ) : (
            // Mobile table
            <table className="table-mobile">
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
                                  Price: {priceToFiat({ price: token.statistics?.priceXrp, mobile: true })}
                                  <br />
                                  Buy volume (24h): {volumeToFiat({ token, type: 'buy', mobile: true })}
                                  <br />
                                  Sell volume (24h): {volumeToFiat({ token, type: 'sell', mobile: true })}
                                  <br />
                                  {/* 24h %: {token.statistics?.priceChange24h} */}
                                  {/* 7d %: {token.statistics?.priceChange7d} */}
                                  Total volume (24h): {volumeToFiat({ token, mobile: true })}
                                  <br />
                                  Trades (24h): {niceNumber(token.statistics?.dexes) || 0}
                                  <br />
                                  Traders (24h): {niceNumber(token.statistics?.uniqueDexAccounts) || 0}
                                  <br />
                                  Sellers (24h): {niceNumber(token.statistics?.uniqueSellers) || 0}
                                  <br />
                                  Buyers (24h): {niceNumber(token.statistics?.uniqueBuyers) || 0}
                                  <br />
                                  Marketcap: {marketcapToFiat({ marketcap: token.statistics?.marketcap, mobile: true })}
                                  <br />
                                  Trustlines: {niceNumber(token.trustlines)}
                                  <br />
                                  Holders: {niceNumber(token.holders)}
                                  <br />
                                  Active holders (Used the token in the last 24h):{' '}
                                  {niceNumber(token.statistics?.activeHolders) || 0}
                                  <br />
                                  {!xahauNetwork && (
                                    <>
                                      AMM Pools:{' '}
                                      <a
                                        href={`/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`}
                                        className="tooltip"
                                      >
                                        {' '}
                                        {token.statistics?.ammPools || 0}
                                      </a>
                                      <br />
                                    </>
                                  )}
                                  <br />
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
          )}
        </InfiniteScrolling>
      </FiltersFrame>
    </>
  )
}
