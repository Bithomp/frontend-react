import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useState, useEffect } from 'react'
import axios from 'axios'
import InfiniteScrolling from '../../components/Layout/InfiniteScrolling'
import { processTransactionBlocks } from '../../utils/transactionBlock'
import { useWidth } from '../../utils'

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import FiltersFrame from '../../components/Layout/FiltersFrame'
import TransactionBlock from '../../components/UI/TransactionBlock'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import SimpleSelect from '../../components/UI/SimpleSelect'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id } = query

  let initialTransactions = []
  let initialErrorMessage = ''
  let initialMarker = null
  let initialUserData = null 

  try {
    // Fetch user data (username, service name) for the address
    const userRes = await axiosServer({
      method: 'get',
      url: `v2/address/${id}?username=true&service=true&verifiedDomain=true`,
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
      url: `v3/transactions/${initialUserData?.address}?limit=25`,
      headers: passHeaders(req)
    })
    initialTransactions = res?.data?.transactions || res?.data || []
    initialMarker = res?.data?.marker || null
  } catch (e) {
    initialErrorMessage = e?.message || 'Failed to load transactions'
  }

  return {
    props: {
      id,
      initialTransactions,
      initialErrorMessage,
      initialMarker,
      initialUserData: initialUserData || {},
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context)
    }
  }
}

export default function TransactionsAddress({
  id,
  initialTransactions,
  initialErrorMessage,
  initialMarker,
  initialUserData
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
  const [processedTransactions, setProcessedTransactions] = useState([])
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

  // Process transactions whenever they change
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setProcessedTransactions([])
      return
    }
    const processed = processTransactionBlocks(transactions, id)
    setProcessedTransactions(processed)
  }, [transactions, id])

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
    const limit = 100
    let url = `v3/transactions/${id}?limit=${limit}`
    // pagination marker
    if (opts.marker) {
      url += `&marker=${encodeURIComponent(opts.marker)}`
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
    setLoading(true)
    const markerToUse = opts.marker || marker

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

  // Load more handler for InfiniteScrolling
  const loadMore = () => {
    if (!marker) return
    fetchTransactions({ marker })
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
    setMarker(null)
    fetchTransactions({ marker: null })
  }

  return (
    <>
      <SEO page="Explorer" title={`Transactions of ${id}`} description={`All transactions for address ${id}`} />
      <SearchBlock tab="transactions" searchPlaceholderText={t('explorer.enter-address')} userData={userData} />

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        count={processedTransactions.length}
        hasMore={marker}
        data={processedTransactions || []}
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        {/* Left filters placeholder – can be extended later */}
        <>
          <div className="filters-body-inner" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="input-title">Type</span>
              <SimpleSelect value={txType} setValue={setTxType} optionsList={txTypeOptions} />
            </div>
            <div>
              <span className="input-title">Direction</span>
              <SimpleSelect value={initiated} setValue={setInitiated} optionsList={initiatedOptions} />
            </div>
            <div>
              <span className="input-title">Failures</span>
              <SimpleSelect value={excludeFailures} setValue={setExcludeFailures} optionsList={failuresOptions} />
            </div>

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

            <div>
              <span className="input-title">From</span>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-text"
              />
            </div>

            <div>
              <span className="input-title">To</span>
              <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-text"
              />
            </div>

            <button className="button-action" onClick={applyFilters} style={{ marginTop: '10px' }}>
              Search
            </button>
          </div>
        </>
        {/* Main content */}
        <>
          {errorMessage && <div className="center orange bold">{errorMessage}</div>}
          <InfiniteScrolling
            dataLength={processedTransactions.length}
            loadMore={loadMore}
            hasMore={marker}
            errorMessage={errorMessage}
            height={!filtersHide ? '1300px' : '100vh'}
          >
            {width > 600 ? (
              <table className="table-large no-hover">
                <thead>
                </thead>
                <tbody>
                  {processedTransactions.map((tx, index) => (
                    <TransactionBlock
                      key={tx.hash || index}
                      tx={tx}
                      address={id}
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table-mobile wide">
                {/* <tbody>{renderTableRows()}</tbody> */}
              </table>
            )}              
            {loading && (
              <p className="center" style={{ marginTop: 10 }}>{t('general.loading', { defaultValue: 'Loading' })}</p>
            )}
          </InfiniteScrolling>
        </>
      </FiltersFrame>
    </>
  )
}
