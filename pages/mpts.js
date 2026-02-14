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
  dateFormat,
  timeFormat,
  timeFromNow,
  CurrencyWithIcon
} from '../utils/format'
import { axiosServer, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { isAddressOrUsername, setTabParams, validateCurrencyCode, xahauNetwork } from '../utils'
import { useRouter } from 'next/router'
import SortingArrow from '../components/Tables/SortingArrow'
import CopyButton from '../components/UI/CopyButton'
import { scaleAmount } from '../utils/calc'
import TokenTabs from '../components/Tabs/TokenTabs'
import { FaHandshake } from 'react-icons/fa'

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
  const orderParam = supportedOrders.includes(order) ? order : 'holdersHigh' //'rating'

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
  { value: 'holdersHigh', label: 'Holders: High to Low' },
  { value: 'mptokensHigh', label: 'Authorized: High to Low' },
  { value: 'createdNew', label: 'Created: Latest first' },
  { value: 'createdOld', label: 'Created: Oldest first' }
]

// Helper component to render token with icon
const TokenCell = ({ token }) => {
  if (!token) return 'N/A'
  return <CurrencyWithIcon token={token} />
}

export default function Mpts({
  initialData,
  initialErrorMessage,
  subscriptionExpired,
  sessionToken,
  openEmailLogin,
  currencyQuery,
  issuerQuery,
  orderQuery,
  setSignRequest
}) {
  const { t } = useTranslation()
  const isFirstRender = useRef(true)
  const router = useRouter()

  const [data, setData] = useState(initialData?.issuances || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [marker, setMarker] = useState(initialData?.marker || '')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(
    t(`error.${initialErrorMessage}`, { defaultValue: initialErrorMessage }) || ''
  )
  const [order, setOrder] = useState(orderQuery || 'holdersHight') //'rating
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
      case 'mptokensHigh':
        return { key: 'mptokens', direction: 'descending' }
      case 'createdOld':
        return { key: 'created', direction: 'descending' }
      case 'createdNew':
        return { key: 'created', direction: 'ascending' }
      default:
        return { key: 'holders', direction: 'ascending' }
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
      if (!rawData?.marker) return
      markerPart = '&marker=' + rawData.marker
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
          defaultTab: 'holdersHigh', //'rating'
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
    { label: 'MPT ID', key: 'mptokenIssuanceID' },
    { label: 'Currency', key: 'currency' },
    { label: 'Issuer', key: 'issuer' },
    { label: 'Authorised addresses', key: 'mptokens' },
    { label: 'Holders', key: 'holders' },
    { label: 'Created', key: 'createdAt' },
    { label: 'Scale', key: 'scale' },
    { label: 'Outstanding', key: 'outstandingAmount' },
    { label: 'Max supply', key: 'maximumAmount' },
    { label: 'Last used', key: 'lastUsedAt' },
    { label: 'Transfer fee', key: 'transferFee' },
    { label: 'Description', key: 'metadata.description' }
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
      setSortConfig({ key: 'holders', direction: 'ascending' })
      setOrder('holdersHigh')
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
        case 'mptokens':
          return 'mptokensHigh'
        default:
          return null
      }
    }

    const newApiOrder = apiOrderFor(key)
    if (newApiOrder) {
      setOrder(newApiOrder)
    }
  }

  const authorize = (mptid) => {
    setSignRequest({
      request: {
        TransactionType: 'MPTokenAuthorize',
        MPTokenIssuanceID: mptid
      }
    })
  }

  return (
    <>
      <SEO title="Multi-Purpose Tokens" />
      <h1 className="center">Multi-Purpose Tokens</h1>

      {!xahauNetwork && <TokenTabs tab="mpts" />}

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
        <>
          {rendered && (
            <div className="flex flex-col sm:gap-4 md:h-[400px]">
              <CurrencySearchSelect setCurrency={setCurrency} defaultValue={currency} type="mpt" />
              <IssuerSearchSelect setIssuer={setIssuer} defaultValue={issuer} type="mpt" />
            </div>
          )}
        </>
        <InfiniteScrolling
          dataLength={data.length}
          loadMore={checkApi}
          hasMore={marker}
          errorMessage={errorMessage}
          subscriptionExpired={subscriptionExpired}
          sessionToken={sessionToken}
          openEmailLogin={openEmailLogin}
        >
          <table className="table-large expand hide-on-small-w800">
            <thead>
              <tr>
                <th className="center">
                  <span className="inline-flex items-center">
                    #
                    {/* <SortingArrow sortKey="rating" currentSort={sortConfig} onClick={() => sortTable('rating')} /> */}
                  </span>
                </th>
                <th>Token</th>
                <th className="right">
                  <span className="inline-flex items-center">
                    Holders
                    <SortingArrow sortKey="holders" currentSort={sortConfig} onClick={() => sortTable('holders')} />
                  </span>
                  <br />
                  <span className="inline-flex items-center">
                    Authorized
                    <SortingArrow sortKey="mptokens" currentSort={sortConfig} onClick={() => sortTable('mptokens')} />
                  </span>
                </th>
                <th className="center">MPT ID</th>
                <th className="right">Sequence</th>
                <th className="right">Transfer fee</th>
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
                <th className="right">Max supply</th>
                <th>Last used</th>
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
                            <td className="right">
                              <span className="tooltip green">
                                {shortNiceNumber(token.holders, 0, 1)}
                                <span className="tooltiptext no-brake">{fullNiceNumber(token.holders)}</span>
                              </span>
                              <br />
                              <span className="tooltip">
                                {shortNiceNumber(token.mptokens, 0, 1)}
                                <span className="tooltiptext no-brake">{fullNiceNumber(token.mptokens)}</span>
                              </span>
                            </td>
                            <td className="center">
                              <CopyButton text={token.mptokenIssuanceID} />
                            </td>
                            <td className="right">{token.sequence}</td>
                            <td className="right">{token.transferFee ? token.transferFee / 1000 + '%' : ''}</td>
                            <td className="right">
                              {dateFormat(token.createdAt)}
                              <br />
                              {timeFormat(token.createdAt)}
                            </td>
                            <td className="right" suppressHydrationWarning>
                              {shortNiceNumber(scaleAmount(token.outstandingAmount, token.scale))}
                            </td>
                            <td className="right" suppressHydrationWarning>
                              {shortNiceNumber(scaleAmount(token.maximumAmount, token.scale))}
                            </td>
                            <td>{timeFromNow(token.lastUsedAt, i18n)}</td>
                            <td className="center">
                              <span
                                onClick={() => {
                                  authorize(token.mptokenIssuanceID)
                                }}
                                className="orange tooltip"
                              >
                                <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} />
                                <span className="tooltiptext no-brake">Authorize</span>
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

          <div className="show-on-small-w800">
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
                                <br />
                                <TokenCell token={token} />
                                <br />
                                <b>MPT ID:</b> <CopyButton text={token.mptokenIssuanceID} /> <br />
                                <b>Holders:</b>{' '}
                                <span className="tooltip">
                                  {shortNiceNumber(token.holders, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.holders)}</span>
                                </span>
                                <br />
                                <b>Authorized addresses:</b>{' '}
                                <span className="tooltip">
                                  {shortNiceNumber(token.mptokens, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.mptokens)}</span>
                                </span>
                                <br />
                                <b>Created:</b>{' '}
                                <span>
                                  {dateFormat(token.createdAt)} {timeFormat(token.createdAt)}
                                </span>
                                <br />
                                <b>Outstanding:</b>{' '}
                                <span suppressHydrationWarning>
                                  {niceNumber(scaleAmount(token.outstandingAmount, token.scale))}{' '}
                                </span>
                                {token.currency}
                                <br />
                                <b>Max supply:</b>{' '}
                                <span suppressHydrationWarning>
                                  {niceNumber(scaleAmount(token.maximumAmount, token.scale))}{' '}
                                </span>
                                {token.currency}
                                <br />
                                <b>Last used:</b> {timeFromNow(token.lastUsedAt, i18n)}
                                {token.metadata?.description ? (
                                  <>
                                    <br />
                                    <b>Description:</b> {token.metadata?.description}
                                  </>
                                ) : (
                                  ''
                                )}
                                {token.metadata ? (
                                  <>
                                    <br />
                                    <b>Metadata:</b>
                                    <pre style={{ maxHeight: 300 }}>
                                      <code>{JSON.stringify(token.metadata, null, 2)}</code>
                                    </pre>
                                  </>
                                ) : (
                                  ''
                                )}
                                <br />
                                <b>Transfer fee:</b> {token.transferFee ? token.transferFee / 1000 + '%' : 'none'}
                                <br />
                                <b>Decimal places:</b> {token.scale || 0}
                                <br />
                                <b>Token sequence:</b> {token.sequence}
                                <br />
                                <br />
                                <button
                                  className="button-action narrow thin"
                                  onClick={() => {
                                    authorize(token.mptokenIssuanceID)
                                  }}
                                >
                                  <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} /> Authorize
                                </button>
                                <br />
                                <br />
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
    </>
  )
}
