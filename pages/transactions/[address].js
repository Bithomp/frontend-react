import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useState, useEffect } from 'react'
import axios from 'axios'
import InfiniteScrolling from '../../components/Layout/InfiniteScrolling'
import { timeOrDate, amountFormat } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import { addressBalanceChanges } from '../../utils/transaction'
import { useWidth } from '../../utils'

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import FiltersFrame from '../../components/Layout/FiltersFrame'
import { axiosServer, passHeaders } from '../../utils/axios'
import { getIsSsrMobile } from '../../utils/mobile'
import SimpleSelect from '../../components/UI/SimpleSelect'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { address } = query

  let initialTransactions = []
  let initialErrorMessage = ''
  let initialMarker = null

  try {
    const res = await axiosServer({
      method: 'get',
      url: `v3/transactions/${address}?limit=25`,
      headers: passHeaders(req)
    })
    initialTransactions = res?.data?.transactions || res?.data || []
    initialMarker = res?.data?.marker || null
  } catch (e) {
    initialErrorMessage = e?.message || 'Failed to load transactions'
  }

  return {
    props: {
      address,
      initialTransactions,
      initialErrorMessage,
      initialMarker,
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context)
    }
  }
}

// ---------- Component ----------
export default function TransactionsAddress({
  address,
  initialTransactions,
  initialErrorMessage,
  initialMarker
}) {
  const { t } = useTranslation()
  const width = useWidth()

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

  // Sort transactions whenever order changes or new data comes in
  useEffect(() => {
    if (!transactions || transactions.length === 0) return
    const sorted = [...transactions].sort((a, b) => {
      const aDate = a.tx?.date || 0
      const bDate = b.tx?.date || 0
      return order === 'oldest' ? aDate - bDate : bDate - aDate
    })
    setTransactions(sorted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

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
    const limit = 25
    let url = `v3/transactions/${address}?limit=${limit}`
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
        const sortedCombined = combined.sort((a, b) => {
          const aDate = a.tx?.date || 0
          const bDate = b.tx?.date || 0
          return order === 'oldest' ? aDate - bDate : bDate - aDate
        })
        setTransactions(sortedCombined)
      } else {
        // first load / restart
        const sorted = newData.sort((a, b) => {
          const aDate = a.tx?.date || 0
          const bDate = b.tx?.date || 0
          return order === 'oldest' ? aDate - bDate : bDate - aDate
        })
        setTransactions(sorted)
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
    { label: 'Type', key: 'type' },
    { label: 'Hash', key: 'hash' },
    { label: 'Status', key: 'status' }
  ]

  // Render helpers
  const renderTableRows = () => {
    return transactions.map((txdata, index) => {
      const dateText = txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'
      const type = txdata.type ? (txdata.type.charAt(0).toUpperCase() + txdata.type.slice(1)) : (txdata.tx?.TransactionType || '-')
      const statusSuccess = txdata.outcome?.result === 'tesSUCCESS'

      // Balance change for the current address
      const balanceChanges = addressBalanceChanges(txdata, address) || []
      const firstChange = balanceChanges[0]
      const amountNode = firstChange ? amountFormat(firstChange) : ''

      return (
        <tr key={txdata.tx?.hash || index}>
          <td className="center" style={{ width: 30 }}>{index + 1}</td>
          <td className="right">{dateText}</td>
          <td className="right">{type}</td>
          <td className="right">{amountNode}</td>
          <td className="right">
            <LinkTx tx={txdata.tx?.hash} />
          </td>
          <td className="right">
            <span className={statusSuccess ? 'green' : 'red'}>{statusSuccess ? 'Success' : 'Failed'}</span>
          </td>
        </tr>
      )
    })
  }

  const applyFilters = () => {
    setTransactions([])
    setMarker(null)
    fetchTransactions({ marker: null })
  }

  return (
    <>
      <SEO page="Explorer" title={`Transactions of ${address}`} description={`All transactions for address ${address}`} />
      <SearchBlock tab="transactions" searchPlaceholderText={t('explorer.enter-address')} />

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
            dataLength={transactions.length}
            loadMore={loadMore}
            hasMore={marker}
            errorMessage={errorMessage}
            height={!filtersHide ? '1300px' : '100vh'}
          >
            {width > 600 ? (
              <table className="table-large">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="right">{t('table.validated', { defaultValue: 'Validated' })}</th>
                    <th className="right">{t('table.type', { defaultValue: 'Type' })}</th>
                    <th className="right">{t('table.amount', { defaultValue: 'Amount' })}</th>
                    <th className="right">Tx</th>
                    <th className="right">{t('table.status', { defaultValue: 'Status' })}</th>
                  </tr>
                </thead>
                <tbody>{renderTableRows()}</tbody>
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
