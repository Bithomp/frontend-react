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
  addressLink,
  addressUsernameOrServiceLink,
  AddressWithIcon,
  capitalize,
  fullNiceNumber,
  niceCurrency,
  niceNumber,
  shortHash,
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
import CopyButton from '../components/UI/CopyButton'

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
  openEmailLogin,
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
  const [rawData, setRawData] = useState(initialData || {})
  const [marker, setMarker] = useState(initialData?.marker)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState('rating')
  const [filtersHide, setFiltersHide] = useState(!isSsrMobile)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [currency, setCurrency] = useState(currencyQuery)
  const [rendered, setRendered] = useState(false)

  const controller = new AbortController()

  // Fetch tokens
  const checkApi = async () => {
    const oldOrder = rawData?.order
    const oldCurrency = rawData?.currency
    const oldIssuer = rawData?.issuer
    if (!oldOrder || !order) return

    let loadMoreRequest =
      (order ? oldOrder.toString() === order.toString() : !oldOrder) &&
      (currency ? oldCurrency === currency : !oldCurrency) &&
      (issuer ? oldIssuer === issuer : !oldIssuer)

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

    let apiUrl = 'v2/trustlines/tokens?limit=100&order=' + order + '&currencyDetails=true&statistics=true' + markerPart
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
  }, [order, issuer, currency, subscriptionExpired])

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
    } else {
      volume = statistics?.[type + 'Volume'] || 0
    }
    const volumeFiat = volume * statistics?.priceXrp * fiatRate || 0

    if (mobile) {
      return (
        <>
          <span suppressHydrationWarning>{niceNumber(volumeFiat, 0, selectedCurrency)}</span>
          <br />
          {type !== 'total' ? capitalize(type) : ''} Volume (24h) token: {niceNumber(volume, 0)}{' '}
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
        filters={{
          issuer: issuer || '',
          currency: currency || ''
        }}
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
                  <th className="right">Marketcap</th>
                  <th className="right">Trustlines</th>
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
                            <tr
                              key={i}
                              className="clickable-row"
                              onClick={() => router.push(`/token/${token.issuer}/${token.currency}`)}
                            >
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
                              <td className="right">
                                <span className="tooltip">
                                  {shortNiceNumber(token.trustlines, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.trustlines)}</span>
                                </span>
                              </td>

                              <td className="center">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
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
                            <tr
                              key={i}
                              className="clickable-row"
                              onClick={() => router.push(`/token/${token.issuer}/${token.currency}`)}
                            >
                              <td style={{ padding: '5px' }} className="center">
                                <b>{i + 1}</b>
                              </td>
                              <td>
                                <TokenCell token={token} />
                                <p>
                                  Issuer address: {addressLink(token.issuer, { short: true })}{' '}
                                  <CopyButton text={token.issuer} />
                                  <br />
                                  Currency code: {shortHash(token.currency)} <CopyButton text={token.currency} />
                                  <br />
                                  Price: {priceToFiat({ price: token.statistics?.priceXrp, mobile: true })}
                                  <br />
                                  Price in {nativeCurrency} 5m ago: {niceNumber(token.statistics?.priceXrp5m, 6)}
                                  <br />
                                  Price in {nativeCurrency} 1h ago: {niceNumber(token.statistics?.priceXrp1h, 6)}
                                  <br />
                                  Price in {nativeCurrency} 24h ago: {niceNumber(token.statistics?.priceXrp24h, 6)}
                                  <br />
                                  Price in {nativeCurrency} 7d ago: {niceNumber(token.statistics?.priceXrp7d, 6)}
                                  <br />
                                  Buy Volume (24h): {volumeToFiat({ token, type: 'buy', mobile: true })}
                                  <br />
                                  Sell Volume (24h): {volumeToFiat({ token, type: 'sell', mobile: true })}
                                  <br />
                                  {/* 24h %: {token.statistics?.priceChange24h} */}
                                  {/* 7d %: {token.statistics?.priceChange7d} */}
                                  Total Volume (24h): {volumeToFiat({ token, mobile: true })}
                                  <br />
                                  Trades (24h): {niceNumber(token.statistics?.dexes) || 0}
                                  <br />
                                  DEX txs (24h): {niceNumber(token.statistics?.dexTxs) || 0}
                                  <br />
                                  Unique Traders (24h): {niceNumber(token.statistics?.uniqueDexAccounts) || 0}
                                  <br />
                                  Unique Sellers (24h): {niceNumber(token.statistics?.uniqueSellers) || 0}
                                  <br />
                                  Unique Buyers (24h): {niceNumber(token.statistics?.uniqueBuyers) || 0}
                                  <br />
                                  Supply: {niceNumber(token.supply, 0)} {niceCurrency(token.currency)}
                                  <br />
                                  Marketcap: {marketcapToFiat({ marketcap: token.statistics?.marketcap, mobile: true })}
                                  <br />
                                  Trustlines: {niceNumber(token.trustlines)}
                                  <br />
                                  Holders: {niceNumber(token.holders)}
                                  <br />
                                  Active holders (Account that used the token in the last closed day):{' '}
                                  {niceNumber(token.statistics?.activeHolders) || 0}
                                  <br />
                                  Active offers (Count of used offers in the last closed day):{' '}
                                  {niceNumber(token.statistics?.activeOffers) || 0}
                                  <br />
                                  Trading pairs (in the last closed day):{' '}
                                  {niceNumber(token.statistics?.activeCounters) || 0}
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
                                      Active AMM pools (the last closed day):{' '}
                                      {niceNumber(token.statistics?.activeAmmPools) || 0}
                                    </>
                                  )}
                                  <br />
                                  Transfer txs (24h): {niceNumber(token.statistics?.transferTxs) || 0}
                                  <br />
                                  {token.statistics?.transferTxs > 0 && (
                                    <>
                                      Transfer Volume (24h): {volumeToFiat({ token, type: 'transfer', mobile: true })}
                                      <br />
                                    </>
                                  )}
                                  Rippling txs (24h): {niceNumber(token.statistics?.ripplingTxs) || 0}
                                  <br />
                                  {token.statistics?.ripplingTxs > 0 && (
                                    <>
                                      Rippling Volume (24h): {volumeToFiat({ token, type: 'rippling', mobile: true })}
                                      <br />
                                    </>
                                  )}
                                  Mint Volume (24h): {volumeToFiat({ token, type: 'mint', mobile: true })}
                                  <br />
                                  Burn Volume (24h): {volumeToFiat({ token, type: 'burn', mobile: true })}
                                  <br />
                                  Unique accounts (used the token in the last 24h):{' '}
                                  {niceNumber(token.statistics?.uniqueAccounts) || 0}
                                  <br />
                                  <br />
                                  <button
                                    className="button-action narrow thin"
                                    onClick={(e) => {
                                      e.stopPropagation()
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

      <style jsx>{`
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .clickable-row:hover {
          background-color: var(--unaccent-icon);
        }

        .clickable-row td {
          position: relative;
        }
      `}</style>
    </>
  )
}
