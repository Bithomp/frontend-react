import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'
import { useState, useEffect, useRef } from 'react'

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import IssuerSearchSelect from '../components/UI/IssuerSearchSelect'
import CurrencySearchSelect from '../components/UI/CurrencySearchSelect'
import {
  fullNiceNumber,
  niceNumber,
  shortNiceNumber,
  AddressWithIconFilled,
  dateFormat,
  timeFormat,
  timeFromNow,
  showFlags
} from '../utils/format'
import { axiosServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { isAddressOrUsername, setTabParams, useWidth, validateCurrencyCode } from '../utils'
import { useRouter } from 'next/router'
import SortingArrow from '../components/Tables/SortingArrow'
import CopyButton from '../components/UI/CopyButton'
import { scaleAmount } from '../utils/calc'

/*
  {
    "order": "rating",
    "issuances": [
      {
        "objectID": "43C88DE501AF7E1B9BAA25BFD5ECB5E73054CDDBE9893D54D44AD8AAADC74EBC",
        "mptokenIssuanceID": "056762A93087A14B122055FA030F9EE6F74F87116559C83D",
        "createdAt": 1759779190,
        "updatedAt": 1759779190,
        "lastUsedAt": 1759779190,
        "issuer": "rnRbuxseqEHbxXgaBZJu7PAMQKmVAqp9RM",
        "issuerDetails": {
          "address": "rnRbuxseqEHbxXgaBZJu7PAMQKmVAqp9RM",
          "username": null,
          "service": null
        },
        "sequence": 90661545,
        "currency": "Precious MPT - undefined",
        "icon": "https://cdn.bithomp.com/mptoken/056762A93087A14B122055FA030F9EE6F74F87116559C83D",
        "metadata": {
          "name": "Precious MPT - undefined",
          "weblinks": [],
          "description": "Metaprotocol Token representing precious metals portfolio for customer undefined",
          "purchase_id": "29089"
        },
        "scale": 2,
        "transferFee": null,
        "maximumAmount": "50000000",
        "outstandingAmount": "0",
        "lockedAmount": "0",
        "flags": {
          "locked": false,
          "canLock": false,
          "requireAuth": false,
          "canEscrow": false,
          "canTrade": false,
          "canTransfer": false,
          "canClawback": false
        },
        "description": "Metaprotocol Token representing precious metals portfolio for customer undefined",
        "kyc": false,
        "stablecoin": false,
        "fiat": null,
        "mptokens": 0,
        "holders": 0,
        "rating": 0
      },  
*/

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, query } = context
  const { currency, issuer, order } = query

  let initialData = null
  let initialErrorMessage = null

  // Validate order param
  const supportedOrders = ['rating', 'createdOld', 'createdNew', 'mptokensHigh', 'holdersHigh']
  const orderParam = supportedOrders.includes(order) ? order : 'createdNew' //'rating'

  let url = `v2/mptokens?limit=100&order=${orderParam}`
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
      currencyQuery: currency || initialData?.currency || null,
      issuerQuery: issuer || initialData?.issuer || null,
      orderQuery: supportedOrders.includes(order) ? order : null,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const orderList = [
  //{ value: 'rating', label: 'Rating: High to Low' },
  { value: 'createdNew', label: 'Created: Latest first' },
  { value: 'createdOld', label: 'Created: Oldest first' },
  { value: 'mptokensHigh', label: 'MPTs: High to Low' },
  { value: 'holdersHigh', label: 'Holders: High to Low' }
]

// Helper component to render token with icon
const TokenCell = ({ token }) => {
  if (!token) return 'N/A'
  return (
    <AddressWithIconFilled
      data={token}
      name="issuer"
      currency={token.currency}
      options={{
        mptId: token.mptokenIssuanceID,
        currencyName: token.metadata?.name
      }}
    />
  )
}

export default function Mpts({
  initialData,
  initialErrorMessage,
  subscriptionExpired,
  sessionToken,
  isSsrMobile,
  openEmailLogin,
  currencyQuery,
  issuerQuery,
  orderQuery
}) {
  const { t } = useTranslation()
  const width = useWidth()
  const isFirstRender = useRef(true)
  const router = useRouter()

  const [data, setData] = useState(initialData?.issuances || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [marker, setMarker] = useState(initialData?.marker)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState(orderQuery || 'createdNew') //'rating
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
      case 'holdersHigh':
        return { key: 'holders', direction: 'descending' }
      case 'createdOld':
        return { key: 'created', direction: 'descending' }
      case 'createdNew':
        return { key: 'created', direction: 'ascending' }
      default:
        return { key: 'created', direction: 'ascending' }
      //return { key: 'rating', direction: 'descending' }
    }
  }

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

    let apiUrl = 'v2/mptokens?limit=100&order=' + order + markerPart
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
      if (newdata.issuances) {
        let list = newdata.issuances
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
          defaultTab: 'createdNew', //'rating'
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
    { label: 'Holders', key: 'holders' }
  ]

  const sortTable = (key) => {
    if (!data || data.length === 0) return

    if (sortConfig.key === key) {
      if (key === 'created') {
        if (sortConfig.direction === 'descending') {
          setSortConfig({ key, direction: 'ascending' })
          setOrder('createdNew')
        } else {
          setSortConfig({ key, direction: 'descending' })
          setOrder('createdOld')
        }
        return
      }
      //setSortConfig({ key: 'rating', direction: 'descending' })
      //setOrder('rating')
      setSortConfig({ key: 'created', direction: 'ascending' })
      setOrder('createdNew')
      return
    }

    let direction = 'descending'
    setSortConfig({ key, direction })

    const apiOrderFor = (k) => {
      switch (k) {
        case 'rating':
          return 'rating'
        case 'created':
          return 'createdOld'
        case 'holders':
          return 'holdersHigh'
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
      <SEO title="Multi-Purpose Tokens" />
      <h1 className="center">Multi-Purpose Tokens</h1>

      <FiltersFrame
        count={data?.length}
        hasMore={marker}
        data={data || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
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
          {!isSsrMobile || width > 1080 ? (
            <table className="table-large no-hover expand">
              <thead>
                <tr>
                  <th className="center">
                    <span className="inline-flex items-center">
                      #
                      {/* <SortingArrow sortKey="rating" currentSort={sortConfig} onClick={() => sortTable('rating')} /> */}
                    </span>
                  </th>
                  <th>Token</th>
                  <th className="center">MPT ID</th>
                  <th className="right">Transfer fee</th>
                  <th className="right">
                    <span className="inline-flex items-center">
                      Holders
                      <SortingArrow sortKey="holders" currentSort={sortConfig} onClick={() => sortTable('holders')} />
                    </span>
                  </th>
                  <th className="right">
                    <span className="inline-flex items-center">
                      Created
                      <SortingArrow
                        sortKey="created"
                        currentSort={sortConfig}
                        onClick={() => sortTable('created')}
                        canSortBothWays={true}
                      />
                    </span>
                  </th>
                  <th className="right">Outstanding</th>
                  <th className="right">Max</th>
                  <th>Last used</th>
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
                                {showFlags(token.flags)}
                              </td>
                              <td className="center">
                                <CopyButton text={token.mptokenIssuanceID} />
                              </td>
                              <td className="right">{token.transferFee ? token.transferFee / 1000 + '%' : ''}</td>
                              <td className="right">
                                <span className="tooltip">
                                  {shortNiceNumber(token.holders, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.holders)}</span>
                                </span>
                              </td>
                              <td className="right" suppressHydrationWarning>
                                {dateFormat(token.createdAt)}
                                <br />
                                {timeFormat(token.createdAt)}
                              </td>
                              <td className="right">
                                {shortNiceNumber(scaleAmount(token.outstandingAmount, token.scale))}
                              </td>
                              <td className="right">
                                {shortNiceNumber(scaleAmount(token.maximumAmount, token.scale))}
                              </td>
                              <td>{timeFromNow(token.lastUsedAt, i18n)}</td>
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
                                  <br />
                                  Holders: {niceNumber(token.holders)}
                                  <br />
                                  Trustlines: {niceNumber(token.trustlines)}
                                  <br />
                                  <br />
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
