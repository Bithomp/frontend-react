import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { IoMdClose } from 'react-icons/io'

import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getIsSsrMobile, useIsMobile } from '../../../utils/mobile'
import { axiosServer, passHeaders } from '../../../utils/axios'
import { addAndRemoveQueryParams, isAddressOrUsername } from '../../../utils'

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
import { addressBalanceChanges } from '../../../utils/transaction'

const shouldShowTxForAddress = (tx, address) => {
  const inner = tx?.tx
  const myBalance = addressBalanceChanges(tx, address)
  return inner?.Account === address || inner?.Destination === address || (myBalance && myBalance.length > 0)
}

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id, fromDate, toDate, type, initiated, excludeFailures, counterparty, order } = query
  const limit = 20
  let initialErrorMessage = ''
  let initialData = null

  if (isAddressOrUsername(id)) {
    let url = `v3/transactions/${id}?limit=${limit}`
    if (type && type !== 'all') {
      url += `&type=${type}`
    }
    if (order && order === 'oldest') {
      url += `&forward=true`
    }
    try {
      const res = await axiosServer({
        method: 'get',
        url,
        headers: passHeaders(req)
      })
      initialData = res?.data
      if (
        !initialData?.marker &&
        initialData?.transactions.filter((tx) => shouldShowTxForAddress(tx, address)).length === 0
      ) {
        initialErrorMessage = 'No transactions found for the specified filters.'
      }
    } catch (e) {
      if (e?.message === 'read ECONNRESET') {
        initialErrorMessage = 'The request timed out. Try changing your filters or try again later.'
      } else {
        initialErrorMessage = e?.message || 'Failed to load transactions'
      }
    }
  } else {
    initialErrorMessage = 'Invalid username or address'
  }

  return {
    props: {
      id: id || null,
      initialData: initialData || null,
      initialErrorMessage,
      isSsrMobile: getIsSsrMobile(context),
      fromDateQuery: fromDate || '',
      toDateQuery: toDate || '',
      typeQuery: type || 'all',
      initiatedQuery: initiated || '0',
      excludeFailuresQuery: excludeFailures || '0',
      counterpartyQuery: counterparty || '',
      orderQuery: order || 'newest',
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AccountTransactions({
  id,
  initialData,
  initialErrorMessage,
  selectedCurrency,
  fromDateQuery,
  toDateQuery,
  typeQuery,
  initiatedQuery,
  excludeFailuresQuery,
  counterpartyQuery,
  orderQuery
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const firstRenderRef = useRef(true)

  const address = initialData?.address

  // State management
  const [transactions, setTransactions] = useState(
    initialData?.transactions.filter((tx) => shouldShowTxForAddress(tx, address)) || []
  )
  const [marker, setMarker] = useState(initialData?.marker || null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [order, setOrder] = useState(orderQuery) // newest | oldest
  const [filtersHide, setFiltersHide] = useState(false)
  const [type, setType] = useState(typeQuery)
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
  }, [order, id])

  // Sync filter changes to URL
  useEffect(() => {
    if (router.isReady) {
      updateURL({
        order,
        type,
        initiated,
        excludeFailures,
        counterparty,
        fromDate: fromDate ? fromDate.toISOString() : '',
        toDate: toDate ? toDate.toISOString() : ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, type, initiated, excludeFailures, counterparty, fromDate, toDate, router.isReady])

  const orderList = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' }
  ]

  // transaction type options
  const typeOptions = [
    { value: 'all', label: 'All types' },
    { value: 'payment', label: 'Payment' },
    { value: 'nft', label: 'NFT' },
    { value: 'amm', label: 'AMM' },
    { value: 'order', label: 'DEX' },
    { value: 'escrow', label: 'Escrow' },
    { value: 'channel', label: 'Channel' },
    { value: 'check', label: 'Check' },
    { value: 'trustline', label: 'Trustline' },
    { value: 'settings', label: 'Settings' },
    { value: 'accountDelete', label: 'Account delete' }
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
    if (type && type !== 'all') {
      url += `&type=${type}`
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
      const newData = response?.data?.transactions?.filter((tx) => shouldShowTxForAddress(tx, address)) || []
      const newMarker = response?.data?.marker || null

      if (markerToUse && transactions.length > 0) {
        // pagination – append
        const combined = [...transactions, ...newData]
        setTransactions(combined)
      } else {
        if (newData.length === 0 && !newMarker) {
          setErrorMessage('Account has no transactions with the specified filters.')
          setMarker(newMarker)
          setLoading(false)
          return
        } else {
          setTransactions(newData)
        }
      }

      setMarker(newMarker)
      setErrorMessage('')
    } catch (e) {
      setErrorMessage(t('error.' + e?.message) || 'Failed to load transactions')
    }
    setLoading(false)
  }

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
      if (value && value !== '' && value !== '0' && value !== 'all' && value !== 'newest') {
        addList.push({ name: key, value })
      } else {
        removeList.push(key)
      }
    })

    addAndRemoveQueryParams(router, addList, removeList)
  }

  const isMobile = useIsMobile(600)

  return (
    <>
      <SEO
        page="Transactions"
        title={`Transactions of ${address}`}
        description={`All transactions for address ${address}`}
      />
      <SearchBlock
        tab="transactions"
        searchPlaceholderText={t('explorer.enter-address')}
        userData={initialData?.addressDetails}
      />

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        count={transactions.length}
        hasMore={marker}
        data={
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
        <>
          <div className="filters-body-inner">
            <SimpleSelect value={type} setValue={setType} optionsList={typeOptions} />
            <br />
            <SimpleSelect value={initiated} setValue={setInitiated} optionsList={initiatedOptions} />
            <br />
            <SimpleSelect value={excludeFailures} setValue={setExcludeFailures} optionsList={failuresOptions} />
            <br />
            <AddressInput
              placeholder="Counterparty"
              setValue={setCounterparty}
              rawData={counterparty ? { counterparty } : {}}
              type="counterparty"
              hideButton={true}
            />
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
            <table className={isMobile ? 'table-mobile' : 'table-large expand no-hover'}>
              <tbody>
                {loading ? (
                  <tr className="center" style={{ width: 'calc (100% - 30px)' }}>
                    <td colSpan="100">
                      <br />
                      <br />
                      <span className="waiting"></span>
                      <br />
                      <br />
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx, index) => {
                    let TransactionRowComponent = null
                    const type = tx?.tx?.TransactionType

                    if (type === 'AccountDelete') {
                      TransactionRowComponent = TransactionRowAccountDelete
                    } else if (type === 'AccountSet') {
                      TransactionRowComponent = TransactionRowAccountSet
                    } else if (type?.includes('AMM')) {
                      TransactionRowComponent = TransactionRowAMM
                    } else if (type?.includes('Check')) {
                      TransactionRowComponent = TransactionRowCheck
                    } else if (type?.includes('Escrow')) {
                      TransactionRowComponent = TransactionRowEscrow
                    } else if (type === 'Import') {
                      TransactionRowComponent = TransactionRowImport
                    } else if (type?.includes('NFToken')) {
                      TransactionRowComponent = TransactionRowNFToken
                    } else if (type === 'OfferCreate' || type === 'OfferCancel') {
                      TransactionRowComponent = TransactionRowOffer
                    } else if (type === 'Payment') {
                      TransactionRowComponent = TransactionRowPayment
                    } else if (type === 'SetRegularKey') {
                      TransactionRowComponent = TransactionRowSetRegularKey
                    } else if (type === 'DelegateSet') {
                      TransactionRowComponent = TransactionRowDelegateSet
                    } else if (type === 'TrustSet') {
                      TransactionRowComponent = TransactionRowTrustSet
                    } else if (type?.includes('DID')) {
                      TransactionRowComponent = TransactionRowDID
                    } else if (type?.includes('URIToken')) {
                      TransactionRowComponent = TransactionRowURIToken
                    } else if (type === 'Remit') {
                      TransactionRowComponent = TransactionRowRemit
                    } else if (type === 'EnableAmendment') {
                      TransactionRowComponent = TransactionRowEnableAmendment
                    } else {
                      TransactionRowComponent = TransactionRowDetails
                    }

                    return (
                      <TransactionRowComponent
                        key={index}
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
