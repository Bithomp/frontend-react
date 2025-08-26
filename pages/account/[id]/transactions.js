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
  selectedCurrency,
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
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [filtersApplied, setFiltersApplied] = useState(true)

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

  // Refresh transactions when order changes (keep this automatic)
  useEffect(() => {
    if (userData?.address) {
      fetchTransactions({restart: true}) ;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, userData?.address])

  // Remove automatic filtering for other filters - they will be applied via search button

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
      url += `&forward=true`
    } else if (order === 'newest') {
      url += `&forward=false`
    }
    // filters - only apply when filters have been explicitly applied via search button
    if (filtersApplied) {
      if (txType && txType !== 'tx') {
        url += `&type=${txType}`
      }
      if (initiated !== '0') {
        // Direction filtering for outgoing/incoming transactions
        if (initiated === '1') {
          // Outgoing transactions
          url += `&initiated=1`
        } else if (initiated === '2') {
          // Incoming transactions
          url += `&initiated=0`
        }
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
    }
    return url
  }

  const fetchTransactions = async (opts = {}) => {
    if (loading && !opts.restart) return // Only block if not restarting
    setLoading(true)

    let markerToUse = undefined
    if (!opts.restart) {
      markerToUse = opts.marker || marker
    }

    try {
      const apiUrlString = apiUrl({ marker: markerToUse })
      const response = await axios.get(apiUrlString)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setFiltersApplied(true)
    setTransactions([])
    setMarker('first')
    setLoading(false) // Reset loading to false before calling fetchTransactions
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
        data={transactions.map(item => {
          let dateObj = new Date();
          if(item.outcome.timestamp){
            dateObj = new Date(item.outcome.timestamp);
          }
          // Determine direction based on transaction data and current filter settings
          let direction = 'Unknown';
          const isAccountInitiator = item.tx.Account === userData.address;
          const isAccountDestination = item.tx.Destination === userData.address;
          
          if (isAccountInitiator && !isAccountDestination) {
            // Account is the sender but not the destination
            direction = 'Outgoing';
          } else if (!isAccountInitiator && isAccountDestination) {
            // Account is the destination but not the sender
            direction = 'Incoming';
          } else if (isAccountInitiator && isAccountDestination) {
            // Account is both sender and destination (self-send)
            direction = 'Self';
          } else if (!isAccountInitiator && !isAccountDestination) {
            // Account is neither sender nor destination (e.g., in multi-sign transactions)
            // Check if this is a transaction where the account is affected in some other way
            if (item.tx.RegularKey === userData.address || item.tx.SignerQuorum || item.tx.SignerEntries) {
              direction = 'Settings';
            } else {
              direction = 'Other';
            }
          }
          
          // Get counterparty address based on direction
          let address = '';
          if (direction === 'Outgoing' && item.tx.Destination) {
            address = item.tx.Destination;
          } else if (direction === 'Incoming' && item.tx.Account) {
            address = item.tx.Account;
          } else if (direction === 'Self') {
            address = 'Self';
          } else if (direction === 'Settings' || direction === 'Other') {
            address = item.tx.Account || 'N/A';
          }
          
          return {
            date: dateObj.toLocaleDateString(),
            time: dateObj.toLocaleTimeString(),
            type: item.tx.TransactionType || 'Unknown',
            hash: item.txHash || '',
            status: item.outcome.result || 'Unknown',
            direction: direction,
            address: address,
            fee: item.outcome.fee || '0'
          }
        }) || []}
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
              <AddressInput
                title=""
                placeholder=""
                setValue={setCounterparty}
                rawData={counterparty ? { counterparty } : {}}
                type="counterparty"
                hideButton={true}
              />
            </div>
            <br />
            <div>
              <span className="input-title">From</span>
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
            </div>
            <div>
              <span className="input-title">To</span>
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
            </div>
            <div className="center" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
              <button className="button-action" onClick={applyFilters}>
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
            <table className={width > 600 ? 'table-large no-hover' : 'table-mobile'}>
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