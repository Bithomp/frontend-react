import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { avatarServer, nativeCurrency, useWidth, xahauNetwork } from '../../../utils'
import {
  addressLink,
  amountFormat,
  amountParced,
  fullDateAndTime,
  niceNumber,
  shortNiceNumber
} from '../../../utils/format'
import ProTabs from '../../../components/Tabs/ProTabs'
import { crawlerStatus } from '../../../utils/pro'
import CheckBox from '../../../components/UI/CheckBox'
import Link from 'next/link'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import TypeToIcon from '../../../components/Admin/subscriptions/pro/history/TypeToIcon'
import Image from 'next/image'
import { CSVLink } from 'react-csv'
import DownloadIcon from '../../../public/images/download.svg'
import { koinly } from '../../../utils/koinly'
import { TbArrowsSort } from 'react-icons/tb'
import SimpleSelect from '../../../components/UI/SimpleSelect'
import { LinkTx } from '../../../utils/links'
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

const timePieces = (timestamp) => {
  const date = new Date(timestamp * 1000) // Convert to milliseconds
  const pad = (n) => n.toString().padStart(2, '0')
  const dd = pad(date.getUTCDate())
  const mm = pad(date.getUTCMonth() + 1)
  const yyyy = date.getUTCFullYear()
  const hh = pad(date.getUTCHours())
  const min = pad(date.getUTCMinutes())
  const ss = pad(date.getUTCSeconds())
  return { dd, mm, yyyy, hh, min, ss }
}

const dateFormatters = {
  Koinly: (timestamp) => {
    // ISO format: YYYY-MM-DDTHH:MM:SS.000Z
    return new Date(timestamp * 1000).toISOString()
  },
  CoinLedger: (timestamp) => {
    // Format: MM/DD/YYYY HH:MM:SS in UTC
    const { mm, dd, yyyy, hh, min, ss } = timePieces(timestamp)
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`
  },
  CoinTracking: (timestamp) => {
    // Format: dd.mm.yyyy HH:MM:SS in UTC
    const { dd, mm, yyyy, hh, min, ss } = timePieces(timestamp)
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`
  }
}

const isSending = (a) => {
  if (a.amount?.value) {
    return a.amount.value[0] === '-'
  }
  return a.amount[0] === '-'
}

const processDataForExport = (activities, platform) => {
  return activities.map((activity) => {
    const sending = isSending(activity)

    const processedActivity = { ...activity }
    processedActivity.timestampExport = dateFormatters[platform](activity.timestamp)
    if (platform === 'Koinly') {
      if (activity.amount?.issuer) {
        let koinlyId =
          koinly[xahauNetwork ? 'xahau' : 'xrpl'][activity.amount?.issuer + ':' + activity.amount?.currency]
        if (koinlyId) {
          processedActivity.sentCurrency = sending ? koinlyId : ''
          processedActivity.receivedCurrency = !sending ? koinlyId : ''
        }
      }
    } else if (platform === 'CoinLedger') {
      processedActivity.type = isSending(activity) ? 'Withdrawal' : 'Deposit'
    } else if (platform === 'CoinTracking') {
      processedActivity.type = isSending(activity)
        ? 'Withdrawal'
        : Math.abs(activity.amountNumber) <= activity.txFeeNumber
        ? 'Other Fee'
        : 'Deposit'
    }

    return processedActivity
  })
}

export default function History({ queryAddress, selectedCurrency, setSelectedCurrency }) {
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
  const [rendered, setRendered] = useState(false)
  const [removeDust, setRemoveDust] = useState(false)
  const [filteredActivities, setFilteredActivities] = useState([])
  const [platformCSVExport, setPlatformCSVExport] = useState('Koinly')

  const platformCSVHeaders = useMemo(
    () => [
      {
        platform: 'Koinly',
        headers: [
          { label: 'Date', key: 'timestampExport' },
          { label: 'Sent Amount', key: 'sentAmount' },
          { label: 'Sent Currency', key: 'sentCurrency' },
          { label: 'Received Amount', key: 'receivedAmount' },
          { label: 'Received Currency', key: 'receivedCurrency' },
          { label: 'Fee Amount', key: 'txFeeNumber' },
          { label: 'Fee Currency', key: 'txFeeCurrencyCode' },
          { label: 'Net Worth Amount', key: 'amountInFiats.' + selectedCurrency },
          { label: 'Net Worth Currency', key: 'netWorthCurrency' },
          { label: 'Label', key: '' },
          { label: 'Description', key: 'memo' },
          { label: 'TxHash', key: 'hash' }
        ]
      },
      {
        platform: 'CoinLedger',
        headers: [
          { label: 'Date (UTC)', key: 'timestampExport' },
          { label: 'Platform (Optional)', key: 'platform' },
          { label: 'Asset Sent', key: 'sentCurrency' },
          { label: 'Amount Sent', key: 'sentAmount' },
          { label: 'Asset Received', key: 'receivedCurrency' },
          { label: 'Amount Received', key: 'receivedAmount' },
          { label: 'Fee Currency (Optional)', key: 'txFeeCurrencyCode' },
          { label: 'Fee Amount (Optional)', key: 'txFeeNumber' },
          { label: 'Type', key: 'type' },
          { label: 'Description (Optional)', key: 'memo' },
          { label: 'TxHash (Optional)', key: 'hash' }
        ]
      },
      {
        platform: 'CoinTracking',
        headers: [
          { label: 'Type', key: 'type' },
          { label: 'Buy Amount', key: 'receivedAmount' },
          { label: 'Buy Currency', key: 'receivedCurrency' },
          { label: 'Sell Amount', key: 'sentAmount' },
          { label: 'Sell Currency', key: 'sentCurrency' },
          { label: 'Fee', key: 'txFeeNumber' },
          { label: 'Fee Currency', key: 'txFeeCurrencyCode' },
          { label: 'Exchange', key: 'platform' },
          { label: 'Trade-Group', key: '' },
          { label: 'Comment', key: 'memo' },
          { label: 'Date', key: 'timestampExport' },
          // Optional
          { label: 'Tx-ID', key: 'hash' },
          { label: 'Buy Value in Account Currency', key: 'amountInFiats.' + selectedCurrency },
          { label: 'Sell Value in Account Currency', key: '' },
          { label: 'Liquidity pool', key: '' }
        ]
      }
    ],
    [selectedCurrency]
  )

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (filteredActivities.length > 0) {
      if (rowsPerPage === -1) {
        setCurrentList(filteredActivities)
      } else {
        setCurrentList(filteredActivities.slice(page * rowsPerPage, (page + 1) * rowsPerPage))
      }
    } else {
      setCurrentList([])
    }
    if ((page + 2) * rowsPerPage > filteredActivities.length && data?.marker) {
      getProAddressHistory({ marker: data.marker })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredActivities, page, rowsPerPage])

  useEffect(() => {
    if (!activities) return
    if (removeDust) {
      //remove records which are lower than 0.004 in fiat currency
      setFilteredActivities(
        activities.filter(
          (activity) =>
            Math.abs(parseFloat(activity.amountInFiats?.[selectedCurrency])) >= 0.004 || activity.amount?.currency
        )
      )
    } else {
      setFilteredActivities(activities)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, removeDust])

  let csvHeaders = [
    { label: '#', key: 'index' },
    { label: 'Timestamp Unix', key: 'timestamp' },
    { label: 'Timestamp ISO', key: 'timestampExport' },
    { label: 'Address', key: 'address' },
    { label: 'Type', key: 'txType' },
    { label: 'Amount as Text', key: 'amountExport' },
    { label: 'Amount', key: 'amountNumber' },
    { label: 'Currency', key: 'currencyCode' },
    { label: 'Currency issuer', key: 'currencyIssuer' },
    { label: selectedCurrency.toUpperCase() + ' Amount equavalent', key: 'amountInFiats.' + selectedCurrency },
    { label: 'Transfer fee as Text', key: 'transferFeeExport' },
    { label: 'Transfer fee', key: 'transferFeeNumber' },
    { label: 'Transfer fee currency', key: 'transferFeeCurrencyCode' },
    { label: 'Transfer fee currency issuer', key: 'transferFeeCurrencyIssuer' },
    {
      label: selectedCurrency.toUpperCase() + ' Transfer Fee equavalent',
      key: 'transferFeeInFiats.' + selectedCurrency
    },
    { label: 'Tx fee as Text', key: 'txFeeExport' },
    { label: 'Tx fee', key: 'txFeeNumber' },
    { label: 'Tx fee currency', key: 'txFeeCurrencyCode' },
    {
      label: selectedCurrency.toUpperCase() + ' Tx Fee equavalent',
      key: 'txFeeInFiats.' + selectedCurrency
    },
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
          router.push('/admin')
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
        const sending = isSending(res.activities[i])
        res.activities[i].index = options?.marker ? activities.length + 1 + i : i + 1
        res.activities[i].amountExport = amountFormat(res.activities[i].amount, { noSpace: true })
        res.activities[i].amountNumber = res.activities[i].amount?.value || res.activities[i].amount / 1000000
        res.activities[i].currencyCode = res.activities[i].amount?.currency || nativeCurrency
        const { currency } = amountParced(res.activities[i].amount)

        res.activities[i].currencyIssuer = res.activities[i].amount?.issuer

        res.activities[i].transferFeeExport = amountFormat(res.activities[i].transferFee)
        res.activities[i].transferFeeNumber = res.activities[i].transferFee?.value
        res.activities[i].transferFeeCurrencyCode = res.activities[i].transferFee?.currency
        res.activities[i].transferFeeCurrencyIssuer = res.activities[i].transferFee?.issuer

        res.activities[i].txFeeExport = amountFormat(res.activities[i].txFee)
        res.activities[i].txFeeNumber = res.activities[i].txFee / 1000000
        res.activities[i].txFeeCurrencyCode = nativeCurrency

        res.activities[i].timestampExport = new Date(res.activities[i].timestamp * 1000).toISOString()

        res.activities[i].sentAmount = sending ? res.activities[i].amountNumber : ''
        res.activities[i].sentCurrency = sending ? currency : ''

        res.activities[i].receivedAmount = !sending ? res.activities[i].amountNumber : ''
        res.activities[i].receivedCurrency = !sending ? currency : ''

        res.activities[i].netWorthCurrency = selectedCurrency.toUpperCase()

        //sanitize memos for CSV
        res.activities[i].memo = res.activities[i].memo?.replace(/"/g, "'") || ''
      }
      setData(res) // last request data
      if (options?.marker) {
        setActivities(activities.concat(res.activities)) // joines data
      } else {
        setActivities(res.activities) // rewrite old data
      }
    }
  }

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch((error) => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === 'errors.token.required') {
        router.push('/admin')
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
    getVerifiedAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <SEO title="My addresses: history" />
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
          data={filteredActivities || []}
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
                              <Image alt="avatar" src={avatarServer + address.address} width="40" height="40" />
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
            <div>
              <CheckBox checked={removeDust} outline setChecked={setRemoveDust}>
                Remove dust transactions
              </CheckBox>
            </div>
            <div>
              <div
                style={{
                  marginBottom: 20
                }}
              >
                <SimpleSelect
                  value={platformCSVExport}
                  setValue={setPlatformCSVExport}
                  optionsList={[
                    { value: 'Koinly', label: 'Koinly' },
                    { value: 'CoinLedger', label: 'CoinLedger' },
                    { value: 'CoinTracking', label: 'CoinTracking' }
                  ]}
                />
                <button className="dropdown-btn" onClick={() => setSortMenuOpen(!sortMenuOpen)}>
                  <TbArrowsSort />
                </button>
              </div>
              {rendered && (
                <CSVLink
                  data={processDataForExport(filteredActivities || [], platformCSVExport)}
                  headers={
                    platformCSVHeaders.find(
                      (header) => header.platform.toLowerCase() === platformCSVExport.toLowerCase()
                    )?.headers || []
                  }
                  filename={'export ' + platformCSVExport + ' ' + new Date().toISOString() + '.csv'}
                  className={'button-action' + (!(activities?.length > 0) ? ' disabled' : '')}
                >
                  <DownloadIcon /> CSV for {platformCSVExport}
                </CSVLink>
              )}
              {platformCSVExport === 'Koinly' && (
                <>
                  <br />
                  <br />
                  Let us know if we miss koinlyIDs for your tokens. We will add them to the system.
                </>
              )}
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
                                <LinkTx tx={a.hash}>
                                  <TypeToIcon type={a.txType} direction={isSending(a) ? 'sent' : 'received'} />
                                </LinkTx>
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
                                <p>
                                  Tx: <LinkTx tx={a.hash} />
                                </p>
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
