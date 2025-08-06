import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import { getIsSsrMobile } from '../../../utils/mobile'
import { axiosServer, passHeaders } from '../../../utils/axios'
import { useWidth } from '../../../utils'

import SEO from '../../../components/SEO'
import SearchBlock from '../../../components/Layout/SearchBlock'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import InfiniteScrolling from '../../../components/Layout/InfiniteScrolling'
import SimpleSelect from '../../../components/UI/SimpleSelect'

import {
  TransactionRowDetails,
  TransactionRowAccountDelete,
  TransactionRowAccountSet,
  TransactionRowAMM,
  TransactionRowCheck,
  TransactionRowDID,
  TransactionRowEscrow,
  TransactionRowImport,
  TransactionRowNFToken,
  TransactionRowOffer,
  TransactionRowPayment,
  TransactionRowSetRegularKey,
  TransactionRowTrustSet,
  TransactionRowURIToken,
  TransactionRowRemit,
  TransactionRowEnableAmendment,
  TransactionRowDelegateSet
} from '../../../components/Transactions'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id } = query
  const account = id || ''
  const limit = 20
  let initialTransactions = []
  let initialErrorMessage = ''
  let initialMarker = null
  let initialUserData = null 

  if (account) {
    try {
      // Fetch user data (username, service name) for the address
      const userRes = await axiosServer({
        method: 'get',
        url: `v2/address/${account}?username=true&service=true&verifiedDomain=true`,
        headers: passHeaders(req)
      })
      initialUserData = userRes?.data
    } catch (e) {
      // If user data fetch fails, continue without it
      console.error('Failed to fetch user data:', e?.message)
    }

    try {
      // Fetch transactions
      const res = await axiosServer({
        method: 'get',
        url: `v3/transactions/${initialUserData?.address || account}?limit=${limit}`,
        headers: passHeaders(req)
      })
      initialTransactions = res?.data?.transactions || res?.data || []
      initialMarker = res?.data?.marker || null
    } catch (e) {
      initialErrorMessage = e?.message || 'Failed to load transactions'
    }
  }

  return {
    props: {
      id: account,
      initialTransactions,
      initialErrorMessage,
      initialMarker,
      initialUserData: initialUserData || {},
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AccountTransactions({
  id,
  initialTransactions,
  initialErrorMessage,
  initialMarker,
  initialUserData,
  subscriptionExpired,
  sessionToken,
  selectedCurrency
}) {

  const { t } = useTranslation()
  const width = useWidth()

  // User data for SearchBlock
  const [userData, setUserData] = useState({
    username: initialUserData?.username,
    service: initialUserData?.service?.name,
    address: initialUserData?.address || id
  })

  // State management
  const [transactions, setTransactions] = useState(initialTransactions || [])
  const [marker, setMarker] = useState(initialMarker || null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState('newest') // newest | oldest
  const [filtersHide, setFiltersHide] = useState(false)
  const [txType, setTxType] = useState('tx') // tx = all types
  const [initiated, setInitiated] = useState('0') // 0 = both, 1 = outgoing, 2 = incoming
  const [excludeFailures, setExcludeFailures] = useState('0') // 0 = include, 1 = exclude
  const [counterparty, setCounterparty] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Update userData when initialUserData changes
  useEffect(() => {
    if (!initialUserData?.address) return
    setUserData({
      username: initialUserData.username,
      service: initialUserData.service?.name,
      address: initialUserData.address
    })
  }, [initialUserData])

  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  // Helpers
  const orderList = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' }
  ]

  // transaction type options
  const txTypeOptions = [
    { value: 'tx', label: 'All types' },
    { value: 'payment', label: 'Payment' },
    { value: 'nft', label: 'NFT' },
    { value: 'amm', label: 'AMM' },
    { value: 'order', label: 'Order' },
    { value: 'escrow', label: 'Escrow' },
    { value: 'channel', label: 'Channel' },
    { value: 'check', label: 'Check' },
    { value: 'trustline', label: 'Trustline' },
    { value: 'settings', label: 'Settings' },
    { value: 'accountDelete', label: 'Account Delete' }
  ]

  const initiatedOptions = [
    { value: '0', label: 'Both directions' },
    { value: '1', label: 'Outgoing' },
    { value: '2', label: 'Incoming' }
  ]

  const failuresOptions = [
    { value: '0', label: 'Include failed' },
    { value: '1', label: 'Exclude failed' }
  ]

  // Build API url
  const apiUrl = (opts = {}) => {
    const limit = 20
    let url = `v3/transactions/${userData?.address}?limit=${limit}`
    // pagination marker
    if (opts.marker) {
      const markerString = typeof opts.marker === 'object' ? JSON.stringify(opts.marker) : opts.marker
      url += `&marker=${encodeURIComponent(markerString)}`
    }
    // sorting
    if (order === 'oldest') {
      url += `&earliestFirst=1`
    }
    // filters
    if (txType && txType !== 'tx') {
      url += `&type=${txType}`
    }
    if (initiated !== '0') {
      url += `&initiated=${initiated}`
    }
    if (excludeFailures === '1') {
      url += `&excludeFailures=1`
    }
    if (counterparty) {
      url += `&counterparty=${encodeURIComponent(counterparty.trim())}`
    }
    if (fromDate) {
      url += `&fromDate=${encodeURIComponent(new Date(fromDate).toISOString())}`
    }
    if (toDate) {
      url += `&toDate=${encodeURIComponent(new Date(toDate).toISOString())}`
    }
    return url
  }

  const fetchTransactions = async (opts = {}) => {
    if (loading) return
    // setLoading(true)

    let markerToUse = undefined
    if (!opts.restart) {
      markerToUse = opts.marker || marker
    }

    if (markerToUse && markerToUse !== 'first') {
      if (!sessionToken || (sessionToken && subscriptionExpired)) {
        setLoading(false)
        return
      }
    }

    try {
      const response = await axios.get(apiUrl({ marker: markerToUse }))
      const newData = response?.data?.transactions || response?.data || []
      const newMarker = response?.data?.marker || null

      if (markerToUse && transactions.length > 0) {
        // pagination – append
        const combined = [...transactions, ...newData]
        setTransactions(combined)
      } else {
        setTransactions(newData)
      }

      setMarker(newMarker)
      setErrorMessage('')
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to load transactions')
    }
    setLoading(false)
  }

  // CSV headers (basic)
  const csvHeaders = [
    { label: 'Date', key: 'date' },
    { label: 'Time', key: 'time' },
    { label: 'Type', key: 'type' },
    { label: 'Hash', key: 'hash' },
    { label: 'Status', key: 'status' },
    { label: 'Direction', key: 'direction' },
    { label: 'Address', key: 'address' },
    { label: 'Fee', key: 'fee' }
  ]

  const applyFilters = () => {
    setTransactions([])
    setMarker('first')
    setLoading(true)
    fetchTransactions({ restart: true })
  }

  return (
    <>
      <SEO page="Transactions" title={`Transactions of ${id}`} description={`All transactions for address ${id}`} />
      <SearchBlock tab="transactions" searchPlaceholderText={t('explorer.enter-address')} userData={userData} />

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        count={transactions.length}
        hasMore={marker}
        data={transactions || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        {/* Left filters placeholder – can be extended later */}
        <>
          <div className="filters-body-inner">
            <div>
              <span className="input-title">Type</span>
              <SimpleSelect value={txType} setValue={setTxType} optionsList={txTypeOptions} className="dropdown--filters" />
            </div>
            <br />
            <div>
              <span className="input-title">Direction</span>
              <SimpleSelect value={initiated} setValue={setInitiated} optionsList={initiatedOptions} className="dropdown--filters" />
            </div>
            <br />
            <div>
              <span className="input-title">Failures</span>
              <SimpleSelect value={excludeFailures} setValue={setExcludeFailures} optionsList={failuresOptions} className="dropdown--filters" />
            </div>
            <br />
            <div>
              <span className="input-title">Counterparty</span>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Counterparty address"
                className="input-text"
              />
            </div>
            <br />
            <div>
              <span className="input-title">From</span>
              <DatePicker
                selected={fromDate ? new Date(fromDate * 1000) : null}
                onChange={(date) => setFromDate(date ? Math.floor(date.getTime() / 1000) : null)}
                selectsStart
                showTimeInput
                timeInputLabel={t('table.time')}
                dateFormat="yyyy/MM/dd HH:mm:ss"
                className="dateAndTimeRange"
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
              />
            </div>
            <div>
              <span className="input-title">To</span>
              <DatePicker
                selected={toDate ? new Date(toDate * 1000) : null}
                onChange={(date) => setToDate(date ? Math.floor(date.getTime() / 1000) : null)}
                selectsEnd
                showTimeInput
                timeInputLabel={t('table.time')}
                dateFormat="yyyy/MM/dd HH:mm:ss"
                className="dateAndTimeRange"
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
              />
            </div>
            <div className="center">
              <button className="button-action" onClick={applyFilters} style={{ marginTop: '10px' }}>
                Search
              </button>
            </div>
          </div>
        </>
        {/* Main content */}
        <>
          {errorMessage && <div className="center orange bold">{errorMessage}</div>}
          <InfiniteScrolling
            dataLength={transactions.length}
            loadMore={() => {
              if (marker && marker !== 'first') {
                fetchTransactions({ marker })
              }
            }}
            hasMore={marker}
            errorMessage={errorMessage}
            subscriptionExpired={subscriptionExpired}
            sessionToken={sessionToken}
          >
            <table className={width > 600 ? 'table-large no-hover' : 'table-mobile wide'}>
              <tbody>
                {loading ? (
                  <tr className="center">
                    <td colSpan="100">
                      <span className="waiting"></span>
                      <br />
                      {t('general.loading')}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => {
                    let TransactionRowComponent = null
                    const txType = tx?.tx?.TransactionType

                    if (txType === 'AccountDelete') {
                      TransactionRowComponent = TransactionRowAccountDelete
                    } else if (txType === 'AccountSet') {
                      TransactionRowComponent = TransactionRowAccountSet
                    } else if (txType?.includes('AMM')) {
                      TransactionRowComponent = TransactionRowAMM
                    } else if (txType?.includes('Check')) {
                      TransactionRowComponent = TransactionRowCheck
                    } else if (txType?.includes('Escrow')) {
                      TransactionRowComponent = TransactionRowEscrow
                    } else if (txType === 'Import') {
                      TransactionRowComponent = TransactionRowImport
                    } else if (txType?.includes('NFToken')) {
                      TransactionRowComponent = TransactionRowNFToken
                    } else if (txType === 'OfferCreate' || txType === 'OfferCancel') {
                      TransactionRowComponent = TransactionRowOffer
                    } else if (txType === 'Payment') {
                      TransactionRowComponent = TransactionRowPayment
                    } else if (txType === 'SetRegularKey') {
                      TransactionRowComponent = TransactionRowSetRegularKey
                    } else if (txType === 'DelegateSet') {
                      TransactionRowComponent = TransactionRowDelegateSet
                    } else if (txType === 'TrustSet') {
                      TransactionRowComponent = TransactionRowTrustSet
                    } else if (txType?.includes('DID')) {
                      TransactionRowComponent = TransactionRowDID
                    } else if (txType?.includes('URIToken')) {
                      TransactionRowComponent = TransactionRowURIToken
                    } else if (txType === 'Remit') {
                      TransactionRowComponent = TransactionRowRemit
                    } else if (txType === 'EnableAmendment') {
                      TransactionRowComponent = TransactionRowEnableAmendment
                    } else {
                      TransactionRowComponent = TransactionRowDetails
                    }

                    return (
                      <TransactionRowComponent
                        key={tx.hash || index}
                        tx={tx}
                        address={userData?.address}
                        index={index}
                        selectedCurrency={selectedCurrency}
                      />
                    )
                   })
                 )}
                </tbody>
              </table>                        
          </InfiniteScrolling>
        </>
      </FiltersFrame>      
    </>
  )
} 