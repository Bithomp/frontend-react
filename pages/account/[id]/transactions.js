import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { IoMdClose } from 'react-icons/io'

import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getIsSsrMobile } from '../../../utils/mobile'
import { axiosServer, passHeaders } from '../../../utils/axios'
import { useWidth, addAndRemoveQueryParams, isAddressOrUsername } from '../../../utils'

import SEO from '../../../components/SEO'
import SearchBlock from '../../../components/Layout/SearchBlock'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import InfiniteScrolling from '../../../components/Layout/InfiniteScrolling'
import SimpleSelect from '../../../components/UI/SimpleSelect'
import AddressInput from '../../../components/UI/AddressInput'

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
} from '../../../components/Account/Transactions'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id, fromDate, toDate, txType, initiated, excludeFailures, counterparty, order } = query
  let address = ''
  const limit = 20
  let initialErrorMessage = ''
  let userData = null
  let initialData = null

  if (isAddressOrUsername(id)) {
    try {
      // Fetch user data (username, service name) for the address
      const userRes = await axiosServer({
        method: 'get',
        url: `v2/address/${id}?username=true&service=true&verifiedDomain=true`,
        headers: passHeaders(req)
      })
      if (userRes.data) {
        address = userRes?.data?.address || null
        userData = {
          username: userRes?.data?.username || null,
          service: userRes?.data?.service?.name || null,
          address
        }
      }
    } catch (e) {
      // If user data fetch fails, continue without it
      console.error('Failed to fetch user data:', e?.message)
    }

    // REMOVE THE previous CALL
    // Accept a username and GET addressDetails in the transactions call!

    // BACKEND should accept USERNAMES here!
    if (address) {
      try {
        const res = await axiosServer({
          method: 'get',
          url: `v3/transactions/${address}?limit=${limit}`,
          headers: passHeaders(req)
        })
        initialData = res?.data
      } catch (e) {
        initialErrorMessage = e?.message || 'Failed to load transactions'
      }
    }
  } else {
    initialErrorMessage = 'Invalid username or address'
  }

  return {
    props: {
      address,
      initialData: initialData || null,
      initialErrorMessage,
      userData: userData || {},
      isSsrMobile: getIsSsrMobile(context),
      fromDateQuery: fromDate || '',
      toDateQuery: toDate || '',
      txTypeQuery: txType || 'tx',
      initiatedQuery: initiated || '0',
      excludeFailuresQuery: excludeFailures || '0',
      counterpartyQuery: counterparty || '',
      orderQuery: order || 'newest',
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AccountTransactions({
  address,
  initialData,
  initialErrorMessage,
  userData,
  selectedCurrency,
  fromDateQuery,
  toDateQuery,
  txTypeQuery,
  initiatedQuery,
  excludeFailuresQuery,
  counterpartyQuery,
  orderQuery
}) {
  const { t } = useTranslation()
  const width = useWidth()
  const router = useRouter()
  const firstRenderRef = useRef(true)

  // State management
  const [transactions, setTransactions] = useState(initialData?.transactions || [])
  const [marker, setMarker] = useState(initialData?.marker || null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState(orderQuery) // newest | oldest
  const [filtersHide, setFiltersHide] = useState(false)
  const [txType, setTxType] = useState(txTypeQuery) // tx = all types
  const [initiated, setInitiated] = useState(initiatedQuery) // 0 = both, 1 = outgoing, 2 = incoming
  const [excludeFailures, setExcludeFailures] = useState(excludeFailuresQuery) // 0 = include, 1 = exclude
  const [counterparty, setCounterparty] = useState(counterpartyQuery)
  const [fromDate, setFromDate] = useState(fromDateQuery ? new Date(fromDateQuery) : '')
  const [toDate, setToDate] = useState(toDateQuery ? new Date(toDateQuery) : '')

  // Refresh transactions when order changes
  useEffect(() => {
    // Skip fetch on first render
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    setLoading(true)
    setTransactions([])
    setMarker(null)
    fetchTransactions({ restart: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  // Sync filter changes to URL
  useEffect(() => {
    if (router.isReady) {
      updateURL({
        order,
        txType,
        initiated,
        excludeFailures,
        counterparty,
        fromDate: fromDate ? fromDate.toISOString() : '',
        toDate: toDate ? toDate.toISOString() : ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, txType, initiated, excludeFailures, counterparty, fromDate, toDate, router.isReady])

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
    let url = `v3/transactions/${address}?limit=${limit}`
    // pagination marker
    if (opts.marker) {
      const markerString = typeof opts.marker === 'object' ? JSON.stringify(opts.marker) : opts.marker
      url += `&marker=${encodeURIComponent(markerString)}`
    }
    // sorting
    url += `&forward=${order === 'oldest'}`
    // filters
    if (txType && txType !== 'tx') {
      url += `&type=${txType}`
    }
    if (initiated === '1') {
      url += `&initiated=true`
    } else if (initiated === '2') {
      url += `&initiated=false`
    }

    if (excludeFailures === '1') {
      url += `&excludeFailures=1`
    }
    if (counterparty) {
      url += `&counterparty=${encodeURIComponent(counterparty.trim())}`
    }
    if (fromDate) {
      url += `&fromDate=${encodeURIComponent(fromDate.toISOString())}`
    }
    if (toDate) {
      url += `&toDate=${encodeURIComponent(toDate.toISOString())}`
    }
    return url
  }

  const fetchTransactions = async (opts = {}) => {
    if (loading) return

    let markerToUse = undefined
    if (!opts.restart) {
      markerToUse = opts.marker || marker
    }

    try {
      const response = await axios.get(apiUrl({ marker: markerToUse }))
      if (response?.data?.status === 'error') {
        setErrorMessage(response?.data?.error)
        setLoading(false)
        return
      }
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
    { label: 'Status', key: 'status' }
  ]

  const applyFilters = () => {
    setTransactions([])
    setMarker('first')
    setLoading(true)
    fetchTransactions({ restart: true })
  }

  const clearFromDate = () => {
    setFromDate('')
  }

  const clearToDate = () => {
    setToDate('')
  }

  // URL synchronization functions
  const updateURL = (newFilters) => {
    if (!router.isReady) return

    const addList = []
    const removeList = []

    // Process each filter
    Object.keys(newFilters).forEach((key) => {
      const value = newFilters[key]
      if (value && value !== '' && value !== '0' && value !== 'tx' && value !== 'newest') {
        addList.push({ name: key, value })
      } else {
        removeList.push(key)
      }
    })

    addAndRemoveQueryParams(router, addList, removeList)
  }

  return (
    <>
      <SEO
        page="Transactions"
        title={`Transactions of ${address}`}
        description={`All transactions for address ${address}`}
      />
      <SearchBlock tab="transactions" searchPlaceholderText={t('explorer.enter-address')} userData={userData} />

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        count={transactions.length}
        hasMore={marker}
        data={
          // for csv export?
          transactions?.map((item) => {
            let dateObj = new Date()
            if (item.outcome.timestamp) {
              dateObj = new Date(item.outcome.timestamp)
            }

            return {
              date: dateObj.toLocaleDateString(),
              time: dateObj.toLocaleTimeString(),
              type: item.tx.TransactionType || 'Unknown',
              hash: item.txHash || '',
              status: item.outcome.result || 'Unknown'
            }
          }) || []
        }
        csvHeaders={csvHeaders}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
      >
        {/* Left filters placeholder – can be extended later */}
        <>
          <div className="filters-body-inner">
            <div>
              <span className="input-title">Type</span>
              <SimpleSelect value={txType} setValue={setTxType} optionsList={txTypeOptions} />
            </div>
            <br />
            <div>
              <span className="input-title">Direction</span>
              <SimpleSelect value={initiated} setValue={setInitiated} optionsList={initiatedOptions} />
            </div>
            <br />
            <div>
              <span className="input-title">Failures</span>
              <SimpleSelect value={excludeFailures} setValue={setExcludeFailures} optionsList={failuresOptions} />
            </div>
            <br />
            <div>
              <span className="input-title">Counterparty</span>
              <AddressInput
                setValue={setCounterparty}
                rawData={counterparty ? { counterparty } : {}}
                type="counterparty"
                hideButton={true}
              />
            </div>
            <br />
            <div>
              <span className="input-title">From</span>
              <div className="date-picker-container">
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  selectsStart
                  showTimeInput
                  timeInputLabel={t('table.time')}
                  dateFormat="yyyy/MM/dd HH:mm:ss"
                  className="dateAndTimeRange"
                  maxDate={new Date()}
                  showMonthDropdown
                  showYearDropdown
                />
                {fromDate && (
                  <button className="date-picker-clear" onClick={clearFromDate}>
                    <IoMdClose />
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="input-title">To</span>
              <div className="date-picker-container">
                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  selectsEnd
                  showTimeInput
                  timeInputLabel={t('table.time')}
                  dateFormat="yyyy/MM/dd HH:mm:ss"
                  className="dateAndTimeRange"
                  maxDate={new Date()}
                  showMonthDropdown
                  showYearDropdown
                />
                {toDate && (
                  <button className="date-picker-clear" onClick={clearToDate}>
                    <IoMdClose />
                  </button>
                )}
              </div>
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
            subscriptionExpired={false}
            sessionToken={true}
          >
            <table className={width > 600 ? 'table-large' : 'table-mobile'}>
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
                  transactions?.map((tx, index) => {
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
                        key={tx.hash}
                        data={tx}
                        address={address}
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
