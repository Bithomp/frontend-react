import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { nativeCurrency, useWidth } from '../../../utils'
import {
  addressLink,
  amountFormat,
  fullDateAndTime,
  niceNumber,
  shortNiceNumber,
  txIdLink
} from '../../../utils/format'
import ProTabs from '../../../components/Tabs/ProTabs'
import { crawlerStatus } from '../../../utils/pro'
import CheckBox from '../../../components/UI/CheckBox'
import Link from 'next/link'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import TypeToIcon from '../../../components/Admin/subscriptions/pro/history/TypeToIcon'
import Image from 'next/image'

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { address } = query
  return {
    props: {
      queryAddress: address || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const showAmount = (amount) => {
  if (!amount) return ''
  return amountFormat(amount, { short: true, maxFractionDigits: 6 })
}

const showFiat = (fiat, selectedCurrency) => {
  if (!fiat && fiat !== 0) return ''
  return (
    <span className={'no-brake ' + (fiat > 0 ? 'green' : fiat < 0 ? 'red' : '')}>
      {shortNiceNumber(fiat, 2, 3, selectedCurrency)}
    </span>
  )
}

export default function History({
  account,
  setAccount,
  queryAddress,
  selectedCurrency,
  setSelectedCurrency,
  sessionToken,
  setSessionToken
}) {
  const router = useRouter()
  const width = useWidth()

  const { t } = useTranslation()
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingVerifiedAddresses, setLoadingVerifiedAddresses] = useState(false)
  const [verifiedAddresses, setVerifiedAddresses] = useState([])
  const [addressesToCheck, setAddressesToCheck] = useState(queryAddress ? [queryAddress] : [])
  const [period, setPeriod] = useState('all')
  const [order, setOrder] = useState('desc')
  const [filtersHide, setFiltersHide] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentList, setCurrentList] = useState([])

  useEffect(() => {
    if (activities.length > 0) {
      if (rowsPerPage === -1) {
        setCurrentList(activities)
      } else {
        setCurrentList(activities.slice(page * rowsPerPage, (page + 1) * rowsPerPage))
      }
    } else {
      setCurrentList([])
    }
    if ((page + 2) * rowsPerPage > activities.length && data?.marker) {
      getProAddressHistory({ marker: data.marker })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, page, rowsPerPage])

  let csvHeaders = [
    { label: '#', key: 'index' },
    { label: 'Timestamp', key: 'timestampExport' },
    { label: 'Address', key: 'address' },
    { label: 'Type', key: 'txType' },
    { label: 'Ledger Amount', key: 'amountExport' },
    { label: selectedCurrency.toUpperCase() + ' equavalent', key: 'amountInFiats.' + selectedCurrency },
    { label: 'Memo', key: 'memo' },
    { label: 'Tx', key: 'hash' }
  ]

  const getProAddressHistory = async (options) => {
    if (addressesToCheck.length === 0) return
    setLoading(true)

    let orderPart = order
    let sortCurrency = null

    //amountLow, amountHigh
    if (order === 'nativeCurrencyAmountLow') {
      orderPart = 'amountAbsoluteLow'
      sortCurrency = nativeCurrency
    } else if (order === 'nativeCurrencyAmountHigh') {
      orderPart = 'amountAbsoluteHigh'
      sortCurrency = nativeCurrency
    } else if (order === 'fiatAmountLow') {
      orderPart = 'amountAbsoluteLow'
      sortCurrency = selectedCurrency
    } else if (order === 'fiatAmountHigh') {
      orderPart = 'amountAbsoluteHigh'
      sortCurrency = selectedCurrency
    }

    const response = await axiosAdmin
      .get(
        'user/addresses/activities?convertCurrency=' +
          selectedCurrency +
          '&addresses=' +
          addressesToCheck +
          '&period=' +
          period +
          '&order=' +
          orderPart +
          '&limit=1000' +
          (options?.marker ? '&marker=' + options.marker : '') +
          (sortCurrency ? '&sortCurrency=' + sortCurrency : '')
      )
      .catch((error) => {
        setLoading(false)
        if (error.response?.data?.error === 'errors.token.required') {
          onLogOut()
          return
        }
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      })
    setLoading(false)
    let res = response?.data
    /*
      {
        "total": 414,
        "count": 200,
        "marker": "200",
        "activities": [
          {
            "address": "raNf8ibQZECTaiFqkDXKRmM2GfdWK76cSu",
            "timestamp": 1677327372,
            "ledgerIndex": 78035481,
            "txIndex": 5,
            "hash": "1C463FA4DC1D14C2A5890F39A3120946EB1F44EECC0C752C1E0194B8677B6F12",
            "direction": "sent",
            "txType": "TrustSet",
            "counterparty": null,
            "st": null,
            "dt": null,
            "currency": "XRP",
            "amount": "-0.000012",
            "amountNative": "-0.000012",
            "amountInFiats": {
              "aed": "-0.0000167092330343814396",
    */
    if (res) {
      for (let i = 0; i < res.activities.length; i++) {
        res.activities[i].index = options?.marker ? activities.length + 1 + i : i + 1
        res.activities[i].amountExport = amountFormat(res.activities[i].amount)
        res.activities[i].timestampExport = fullDateAndTime(res.activities[i].timestamp, null, { asText: true })
      }
      setData(res) // last request data
      if (options?.marker) {
        setActivities(activities.concat(res.activities)) // joines data
      } else {
        setActivities(res.activities) // rewrite old data
      }
    }
  }

  const onLogOut = () => {
    setSessionToken('')
    setAccount({ ...account, pro: null })
    setErrorMessage('')
  }

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch((error) => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === 'errors.token.required') {
        onLogOut()
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })
    setLoadingVerifiedAddresses(false)
    const data = response?.data
    /*
      {
        "total": 1,
        "count": 1,
        "addresses": [
          {
            "id": 28,
            "createdAt": 1721741550,
            "address": "raN6cSu",
            "name": "vasia",
            "crawler": {
              "status": "queued",
              "createdAt": 1728212999,
              "updatedAt": 1728212999,
              "lastCrawledAt": null,
              "firstLedgerIndex": null,
              "currentLedgerIndex": null,
              "lastLedgerIndex": null
            }
          }
        ]
      }
    */
    setVerifiedAddresses(data?.addresses)
    if (addressesToCheck?.length === 0 && data?.addresses?.[0]?.address) {
      setAddressesToCheck([data.addresses[0].address])
    }
  }

  useEffect(() => {
    if (!sessionToken) {
      router.push('/admin')
    } else {
      setErrorMessage('')
      getVerifiedAddresses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    getProAddressHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesToCheck, selectedCurrency, period, order])

  const addressName = (address) => {
    for (let a of verifiedAddresses) {
      if (a.address === address) {
        return <span className="orange">{a.name}</span>
      }
    }
  }

  return (
    <>
      <SEO title="Pro address: history" />
      <div className="page-pro-history">
        <h1 className="center">Pro address balances history</h1>

        <AdminTabs name="mainTabs" tab="pro" />
        <ProTabs tab="balance-changes" />

        <FiltersFrame
          order={order}
          setOrder={setOrder}
          orderList={[
            { value: 'DESC', label: 'Latest first' },
            { value: 'ASC', label: 'Earliest first' },
            { value: 'nativeCurrencyAmountLow', label: nativeCurrency.toUpperCase() + ': low to high' },
            { value: 'nativeCurrencyAmountHigh', label: nativeCurrency.toUpperCase() + ': high to low' },
            { value: 'fiatAmountLow', label: 'FIAT: low to high' },
            { value: 'fiatAmountHigh', label: 'FIAT: high to low' }
          ]}
          count={activities?.length || 0}
          total={data?.total || 0}
          hasMore={data?.marker}
          data={activities || []}
          csvHeaders={csvHeaders}
          setSelectedCurrency={setSelectedCurrency}
          selectedCurrency={selectedCurrency}
          setFiltersHide={setFiltersHide}
          filtersHide={filtersHide}
          page={page}
          setPage={setPage}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        >
          <>
            {verifiedAddresses?.length > 0 && data && activities && data.total > activities.length && (
              <div className="center" style={{ marginLeft: -32 }}>
                <button
                  className="button-action narrow thin"
                  onClick={() => getProAddressHistory({ marker: data.marker })}
                >
                  Load more data
                </button>
                <br />
                <br />
              </div>
            )}
            Addresses
            {verifiedAddresses?.length > 0 ? (
              <>
                {verifiedAddresses.map((address, i) => (
                  <div className="filters-check-box" key={i}>
                    <CheckBox
                      checked={addressesToCheck.includes(address.address)}
                      setChecked={() => {
                        setAddressesToCheck(
                          addressesToCheck.includes(address.address)
                            ? addressesToCheck.filter((a) => a !== address.address)
                            : [...addressesToCheck, address.address]
                        )
                      }}
                      outline
                      checkmarkStyle={{ top: '10px' }}
                    >
                      <table>
                        <tbody>
                          <tr>
                            <td style={{ padding: 0 }}>
                              <Image
                                alt="avatar"
                                src={'https://cdn.bithomp.com/avatar/' + address.address}
                                width="40"
                                height="40"
                              />
                            </td>
                            <td style={{ padding: '0 0 0 5px' }}>
                              <b className="orange">{address.name}</b> -{' '}
                              <small>{crawlerStatus(address.crawler, { inline: true })}</small>
                              <br />
                              {addressLink(address.address, { short: 10 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </CheckBox>
                  </div>
                ))}
              </>
            ) : (
              <>
                {loadingVerifiedAddresses ? (
                  'Loading data...'
                ) : (
                  <div>
                    <br />
                    <Link href="/admin/pro" className="button-action narrow thin">
                      Add
                    </Link>
                  </div>
                )}
              </>
            )}
            <div>
              Period
              <DateAndTimeRange setPeriod={setPeriod} defaultPeriod="all" radio={true} />
            </div>
          </>
          <>
            {addressesToCheck.length > 0 && (
              <>
                {!width || width > 800 ? (
                  <table className="table-large no-border no-hover" style={width > 800 ? { width: 780 } : {}}>
                    <thead>
                      <tr>
                        <th className="center">#</th>
                        <th>Timestamp</th>
                        {addressesToCheck.length > 1 && <th>Address</th>}
                        <th className="center">Tx</th>
                        <th>Memo</th>
                        <th className="right">Transfer Fee</th>
                        <th className="right">Tx Fee</th>
                        <th className="right">Balance change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentList?.length > 0 ? (
                        <>
                          {currentList.map((a, i) => (
                            <tr key={i}>
                              <td className="center">{a.index}</td>
                              <td>{fullDateAndTime(a.timestamp)}</td>
                              {addressesToCheck.length > 1 && <td>{addressName(a.address)}</td>}
                              <td className="center">
                                <a href={'/explorer/' + a.hash} aria-label={a.txType}>
                                  <TypeToIcon type={a.txType} direction={a.direction} />
                                </a>
                              </td>
                              <td>
                                <div style={{ width: 160 }}>
                                  <span className={a.memo?.length > 20 ? 'tooltip' : ''}>
                                    {a.memo && a.memo?.slice(0, 20) + (a.memo?.length > 20 ? '...' : '')}
                                    {a.memo?.length > 20 && <span className="tooltiptext right">{a.memo}</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="right" style={{ width: 110 }}>
                                {/* showAmount(a.transferFee) */}
                                <br />
                                {a.transferFee ? (
                                  niceNumber(a.transferFeeInFiats?.[selectedCurrency], 0, selectedCurrency, 6)
                                ) : (
                                  <br />
                                )}
                              </td>
                              <td className="right" style={{ width: 110 }}>
                                {showAmount(a.txFee)}
                                <br />
                                {a.txFee ? (
                                  niceNumber(a.txFeeInFiats?.[selectedCurrency], 0, selectedCurrency, 6)
                                ) : (
                                  <br />
                                )}
                              </td>
                              <td className="right" style={{ width: 110 }}>
                                {showAmount(a.amount)}
                                <br />
                                {showFiat(a.amountInFiats?.[selectedCurrency], selectedCurrency) || <br />}
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center">
                            {loading ? 'Loading data...' : 'There is no data to show here.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="table-mobile">
                    <tbody>
                      {currentList?.length > 0 ? (
                        <>
                          {currentList.map((a, i) => (
                            <tr key={i}>
                              <td style={{ padding: '5px' }}>#{a.index}</td>
                              <td>
                                <p>
                                  Timestamp: <b>{fullDateAndTime(a.timestamp)}</b>
                                </p>
                                {addressesToCheck.length > 1 && (
                                  <p>
                                    Address: <b>{addressName(a.address)}</b>
                                  </p>
                                )}
                                <p>Type: {a.txType}</p>
                                <p>
                                  Ledger Amount: <b>{showAmount(a.amount)}</b>
                                </p>
                                <p>
                                  {selectedCurrency.toUpperCase()} equavalent:{' '}
                                  {showFiat(a.amountInFiats?.[selectedCurrency], selectedCurrency)}
                                </p>
                                {a.memo && <p>Memo: {a.memo?.slice(0, 197) + (a.memo?.length > 197 ? '...' : '')}</p>}
                                <p>Tx: {txIdLink(a.hash)}</p>
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center">
                            {loading ? 'Loading data...' : 'There is no data to show here.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </>
            )}
            <br />
            <br />
            {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
          </>
        </FiltersFrame>
      </div>
    </>
  )
}
