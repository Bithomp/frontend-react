import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { useWidth } from '../../../utils'
import { addressLink, amountFormat, fullDateAndTime, txIdLink } from '../../../utils/format'
import ProTabs from '../../../components/Tabs/ProTabs'
import { crawlerStatus } from '../../../utils/pro'
import CheckBox from '../../../components/UI/CheckBox'

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
  let positive = null
  if (amount.issuer) {
    positive = amount.value > 0
  } else {
    positive = Number(amount) > 0
  }
  return <span className={positive ? 'green' : 'red'}>{amountFormat(amount)}</span>
}

const showFiat = (fiat) => {
  if (!fiat) return ''
  let positive = fiat > 0
  let options = {
    //maximumSignificantDigits: 10,
    maximumFractionDigits: 6
  }
  return <span className={positive ? 'green' : 'red'}>{Number(fiat).toLocaleString(undefined, options)}</span>
}

import { GiReceiveMoney } from 'react-icons/gi'
import { GiPayMoney } from 'react-icons/gi'
import { RiNftFill } from 'react-icons/ri'
import { CiSettings } from 'react-icons/ci'
import { CiLink } from 'react-icons/ci'
import { CiFileOn } from 'react-icons/ci'
import { BsCurrencyExchange } from 'react-icons/bs'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import Link from 'next/link'

const typeToIcon = (type, direction) => {
  let icon = null
  if (type === 'Payment') {
    icon = direction === 'sent' ? <GiPayMoney /> : <GiReceiveMoney />
  } else if (type.includes('NFT')) {
    icon = <RiNftFill />
  } else if (type === 'AccountSet') {
    icon = <CiSettings />
  } else if (type === 'TrustSet') {
    icon = <CiLink />
  } else if (type.includes('Offer')) {
    // NFT offers already presented earlier
    icon = <BsCurrencyExchange />
  } else {
    icon = <CiFileOn />
  }

  return (
    <span className="tooltip">
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span className="tooltiptext">
        {type}
        {type === 'Payment' ? ' ' + direction : ''}
      </span>
    </span>
  )
}

export default function History({ account, setAccount, queryAddress, selectedCurrency, setSelectedCurrency }) {
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
      setCurrentList(activities.slice(page * rowsPerPage, (page + 1) * rowsPerPage))
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
    { label: 'Tx', key: 'hash' }
  ]

  const getProAddressHistory = async () => {
    if (addressesToCheck.length === 0) return
    setLoading(true)
    const response = await axiosAdmin
      .get(
        'user/addresses/activities?convertCurrency=' +
          selectedCurrency +
          '&addresses=' +
          addressesToCheck +
          '&period=' +
          period +
          '&order=' +
          order
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
    const data = response?.data
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
    if (data) {
      setData(data) // for stats data, may we need extract only some fields
      for (let i = 0; i < data.activities.length; i++) {
        data.activities[i].index = i + 1
        data.activities[i].amountExport = amountFormat(data.activities[i].amount)
        data.activities[i].timestampExport = fullDateAndTime(data.activities[i].timestamp, null, { asText: true })
      }
      setActivities(data.activities) // add more data by pages
    }
  }

  const onLogOut = () => {
    localStorage.removeItem('sessionToken')
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
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
      setErrorMessage('')
    }
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
      <SEO title="Pro address: history" />
      <div className="page-admin">
        <h1 className="center">Pro address balances history</h1>

        <AdminTabs name="mainTabs" tab="pro" />
        <ProTabs tab="balance-changes" />

        <FiltersFrame
          order={order}
          setOrder={setOrder}
          orderList={[
            { value: 'desc', label: 'Latest first' },
            { value: 'asc', label: 'Earliest first' }
          ]}
          count={data?.count || 0}
          total={data?.total || 0}
          hasMore={data?.marker}
          data={currentList || []}
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
          <filters>
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
                      <b className="orange">{address.name}</b> - <small>{crawlerStatus(address.crawler)}</small>
                      <br />
                      {addressLink(address.address, { short: 10 })}
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
          </filters>
          <content>
            {addressesToCheck.length > 0 && (
              <>
                {!width || width > 750 ? (
                  <table className="table-large without-border">
                    <thead>
                      <tr>
                        <th className="center">#</th>
                        <th>Timestamp</th>
                        {addressesToCheck.length > 1 && <th>Address</th>}
                        <th className="center">Type</th>
                        <th className="right">Ledger Amount</th>
                        <th suppressHydrationWarning className="right">
                          {selectedCurrency.toUpperCase()} equavalent
                        </th>
                        <th>Tx</th>
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
                              <td className="center">{typeToIcon(a.txType, a.direction)}</td>
                              <td className="right">{showAmount(a.amount)}</td>
                              <td className="right">{showFiat(a.amountInFiats?.[selectedCurrency])}</td>
                              <td>{txIdLink(a.hash, 0)}</td>
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
                      {activcurrentListities?.length > 0 ? (
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
                                  {showFiat(a.amountInFiats?.[selectedCurrency])}
                                </p>
                                <p>Tx: {txIdLink(a.hash, 0)}</p>
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
          </content>
        </FiltersFrame>
      </div>
    </>
  )
}
