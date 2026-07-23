import { i18n, useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'
import { useState, useEffect, useRef } from 'react'

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import TokenSelector from '../components/UI/TokenSelector'
import {
  fullNiceNumber,
  shortNiceNumber,
  timeOrDate,
  timeFromNow,
  CurrencyWithIcon
} from '../utils/format'
import { axiosServer, logServerSideError, passHeaders } from '../utils/axios'
import { getIsSsrMobile } from '../utils/mobile'
import { isAddressOrUsername, setTabParams, validateCurrencyCode, xahauNetwork } from '../utils'
import { useRouter } from 'next/router'
import SortingArrow from '../components/Tables/SortingArrow'
import CopyButton from '../components/UI/CopyButton'
import { scaleAmount } from '../utils/calc'
import TokenTabs from '../components/Tabs/TokenTabs'
import { FaHandshake } from 'react-icons/fa'
import { tokensClass } from '../styles/pages/tokens.module.scss'

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
      initialErrorMessage = 'invalidCurrencyCode'
    }
  }
  if (issuer) {
    if (isAddressOrUsername(issuer)) {
      url += `&issuer=${issuer}`
    } else {
      initialErrorMessage = 'invalidIssuer'
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
    logServerSideError(e, req, 'mpts')
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      currencyQuery: currency || initialData?.currency || null,
      issuerQuery: issuer || initialData?.issuer || null,
      orderQuery: supportedOrders.includes(order) ? order : null,
      ...(await serverSideTranslations(locale, ['common', 'mpts']))
    }
  }
}

const getOrderList = (t) => [
  //{ value: 'rating', label: 'Rating: High to Low' },
  { value: 'holdersHigh', label: t('order.holdersHighToLow') },
  { value: 'mptokensHigh', label: t('order.authorizedHighToLow') },
  { value: 'createdNew', label: t('order.createdLatestFirst') },
  { value: 'createdOld', label: t('order.createdOldestFirst') }
]

// Helper component to render token with icon
const TokenCell = ({ token, fallback }) => {
  if (!token) return fallback
  return <CurrencyWithIcon token={token} options={{ disableTokenLink: true, preferMptName: true }} />
}

const transferFeeText = (token, noFeeText) => {
  const transferFee = Number(token?.transferFee ?? token?.TransferFee)
  return Number.isFinite(transferFee) && transferFee > 0 ? `${transferFee / 1000}%` : noFeeText
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
  const { t } = useTranslation('common')
  const { t: tm } = useTranslation('mpts')
  const isFirstRender = useRef(true)
  const router = useRouter()
  const orderList = getOrderList(tm)

  const [data, setData] = useState(initialData?.issuances || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [marker, setMarker] = useState(initialData?.marker || '')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(
    tm(`errors.${initialErrorMessage}`, {
      defaultValue: t(`error.${initialErrorMessage}`, { defaultValue: initialErrorMessage })
    }) || ''
  )
  const [order, setOrder] = useState(orderQuery || 'holdersHigh') //'rating
  const [issuer, setIssuer] = useState(issuerQuery)
  const [currency, setCurrency] = useState(currencyQuery)
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
          setErrorMessage(t('general.error'))
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
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CSV headers for export
  const csvHeaders = [
    { label: tm('headers.mptId'), key: 'mptokenIssuanceID' },
    { label: tm('headers.currency'), key: 'currency' },
    { label: tm('headers.issuer'), key: 'issuer' },
    { label: tm('headers.authorizedAddresses'), key: 'mptokens' },
    { label: tm('headers.holders'), key: 'holders' },
    { label: tm('headers.created'), key: 'createdAt' },
    { label: tm('headers.scale'), key: 'scale' },
    { label: tm('headers.outstanding'), key: 'outstandingAmount' },
    { label: tm('headers.maxSupply'), key: 'maximumAmount' },
    { label: tm('headers.lastUsed'), key: 'lastUsedAt' },
    { label: tm('headers.transferFee'), key: 'transferFee' },
    { label: tm('headers.description'), key: 'metadata.description' }
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

  const openTokenPage = (mptid) => {
    if (!mptid) return
    router.push(`/token/${mptid}`)
  }

  const stopRowClick = (event) => {
    event.stopPropagation()
  }

  const tokenFilter =
    issuer && currency
      ? data.find((token) => token?.issuer === issuer && token?.currency === currency) || { issuer, currency }
      : {}
  const setTokenFilter = (token) => {
    setIssuer(token?.issuer || null)
    setCurrency(token?.currency || null)
  }

  return (
    <div className={tokensClass}>
      <SEO title={tm('title')} />
      <h1 className="center">{tm('title')}</h1>

      {!xahauNetwork && <TokenTabs tab="mpts" />}

      <FiltersFrame
        count={data?.length}
        hasMore={marker}
        data={data || []}
        csvHeaders={csvHeaders}
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        navExtra={<TokenSelector value={tokenFilter} onChange={setTokenFilter} onlyMPTokens />}
        withoutLeftFilters
        showCsvInNav
      >
        <div className="page">
          <InfiniteScrolling
            dataLength={data.length}
            loadMore={checkApi}
            hasMore={marker}
            errorMessage={errorMessage}
            subscriptionExpired={subscriptionExpired}
            sessionToken={sessionToken}
            openEmailLogin={openEmailLogin}
          >
          <table className="table-large clickable expand hide-on-small-w800">
            <thead>
              <tr>
                <th className="center">
                  <span className="inline-flex items-center">
                    #
                    {/* <SortingArrow sortKey="rating" currentSort={sortConfig} onClick={() => sortTable('rating')} /> */}
                  </span>
                </th>
                <th>{tm('headers.token')}</th>
                <th className="right">
                  <span className="inline-flex items-center">
                    {tm('headers.holders')}
                    <SortingArrow sortKey="holders" currentSort={sortConfig} onClick={() => sortTable('holders')} />
                  </span>
                  <br />
                  <span className="inline-flex items-center">
                    {tm('headers.authorized')}
                    <SortingArrow sortKey="mptokens" currentSort={sortConfig} onClick={() => sortTable('mptokens')} />
                  </span>
                </th>
                <th className="center">{tm('headers.mptId')}</th>
                <th className="right">{tm('headers.sequence')}</th>
                <th className="right">{tm('headers.transferFee')}</th>
                <th className="right">
                  <span className="inline-flex items-center">
                    {tm('headers.created')}
                    <SortingArrow
                      sortKey="created"
                      currentSort={sortConfig}
                      onClick={() => sortTable('created')}
                      canSortBothWays={true}
                    />
                  </span>
                </th>
                <th className="right">{tm('headers.outstanding')}</th>
                <th className="right">{tm('headers.maxSupply')}</th>
                <th>{tm('headers.lastUsed')}</th>
                <th className="center">{tm('headers.action')}</th>
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
                              onClick={() => openTokenPage(token.mptokenIssuanceID)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="center">{i + 1}</td>
                              <td>
                                <TokenCell token={token} fallback={tm('values.notAvailable')} />
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
                              <span onClick={stopRowClick}>
                                <CopyButton text={token.mptokenIssuanceID} />
                              </span>
                            </td>
                            <td className="right">{token.sequence}</td>
                            <td className="right">{transferFeeText(token, tm('values.noFee'))}</td>
                            <td className="right">{timeOrDate(token.createdAt)}</td>
                            <td className="right" suppressHydrationWarning>
                              {shortNiceNumber(scaleAmount(token.outstandingAmount, token.scale))}
                            </td>
                            <td className="right" suppressHydrationWarning>
                              {shortNiceNumber(scaleAmount(token.maximumAmount, token.scale))}
                            </td>
                            <td>{timeFromNow(token.lastUsedAt, i18n)}</td>
                            <td className="center">
                              <span
                                onClick={(event) => {
                                  stopRowClick(event)
                                  authorize(token.mptokenIssuanceID)
                                }}
                                className="orange tooltip"
                              >
                                <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} />
                                <span className="tooltiptext no-brake">{tm('actions.authorize')}</span>
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
                                <TokenCell token={token} fallback={tm('values.notAvailable')} />
                                <br />
                                <b>{tm('headers.mptId')}:</b>{' '}
                                <span onClick={stopRowClick}>
                                  <CopyButton text={token.mptokenIssuanceID} />
                                </span>{' '}
                                <br />
                                <b>{tm('headers.holders')}:</b>{' '}
                                <span className="tooltip">
                                  {shortNiceNumber(token.holders, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.holders)}</span>
                                </span>
                                <br />
                                <b>{tm('headers.authorizedAddresses')}:</b>{' '}
                                <span className="tooltip">
                                  {shortNiceNumber(token.mptokens, 0, 1)}
                                  <span className="tooltiptext no-brake">{fullNiceNumber(token.mptokens)}</span>
                                </span>
                                <br />
                                <b>{tm('headers.tokenSequence')}:</b> {token.sequence}
                                <br />
                                <b>{tm('headers.transferFee')}:</b> {transferFeeText(token, tm('values.noFee'))}
                                <br />
                                <b>{tm('headers.created')}:</b> {timeOrDate(token.createdAt)}
                                <br />
                                <b>{tm('headers.outstanding')}:</b>{' '}
                                <span suppressHydrationWarning>
                                  {shortNiceNumber(scaleAmount(token.outstandingAmount, token.scale))}
                                </span>
                                <br />
                                <b>{tm('headers.maxSupply')}:</b>{' '}
                                <span suppressHydrationWarning>
                                  {shortNiceNumber(scaleAmount(token.maximumAmount, token.scale))}
                                </span>
                                <br />
                                <b>{tm('headers.lastUsed')}:</b> {timeFromNow(token.lastUsedAt, i18n)}
                                <br />
                                <br />
                                <span className="mobile-token-actions">
                                  <button
                                    className="button-action narrow thin"
                                    onClick={() => openTokenPage(token.mptokenIssuanceID)}
                                  >
                                    {tm('actions.tokenPage')}
                                  </button>
                                  <button
                                    className="button-action narrow thin"
                                    onClick={(event) => {
                                      stopRowClick(event)
                                      authorize(token.mptokenIssuanceID)
                                    }}
                                  >
                                    <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} /> {tm('actions.authorize')}
                                  </button>
                                </span>
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
        </div>
      </FiltersFrame>

      <style jsx>{`
        .mobile-token-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
          white-space: nowrap;
        }

        @media only screen and (max-width: 480px) {
          .mobile-token-actions :global(.button-action.narrow.thin) {
            padding: 7px 10px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}
