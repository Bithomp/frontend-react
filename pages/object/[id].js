import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { axiosServer, passHeaders } from '../../utils/axios'
import {
  codeHighlight,
  AddressWithIconFilled,
  shortAddress,
  fullDateAndTime,
  amountFormat,
  showFlags,
  capitalize
} from '../../utils/format'
import { LinkTx, LedgerLink } from '../../utils/links'
import { object } from '../../styles/pages/object.module.scss'
import { network } from '../../utils'

const errorNotFoundMessage =
  'Such Object is not found on the current Ledger of the ' +
  network.toUpperCase() +
  " network, try to use a Time Machine to change the date or change the network if it's wrong."

function stripKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stripKeys)
  } else if (obj && typeof obj === 'object') {
    const hasBothCancel =
      Object.prototype.hasOwnProperty.call(obj, 'cancelAfter') &&
      Object.prototype.hasOwnProperty.call(obj, 'CancelAfter')

    const hasBothFinish =
      Object.prototype.hasOwnProperty.call(obj, 'finishAfter') &&
      Object.prototype.hasOwnProperty.call(obj, 'FinishAfter')

    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      // Always drop any *Details keys
      if (key.includes('Details')) continue

      // Drop lowercase if both lower+upper exist
      if (key === 'cancelAfter' && hasBothCancel) continue
      if (key === 'finishAfter' && hasBothFinish) continue

      result[key] = stripKeys(value)
    }
    return result
  }
  return obj
}

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id, ledgerIndex, date, previousTxHash } = query

  let data = null
  let errorMessage = null

  const makeQueryString = () => {
    const params = []
    if (ledgerIndex) {
      params.push('ledgerIndex=' + ledgerIndex)
    } else if (date) {
      params.push('date=' + date)
    }
    if (previousTxHash) params.push('previousTxHash=' + previousTxHash)
    return params.length ? '?' + params.join('&') : ''
  }

  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/ledgerEntry/' + id + makeQueryString(),
      headers: passHeaders(req)
    }).catch((error) => {
      errorMessage = error.message
    })
    data = res?.data
    // Handle case when the object is not found
    if (data?.error) {
      errorMessage = data.error_message || errorNotFoundMessage
      data = null
    }
  } catch (e) {
    console.error(e)
  }

  return {
    props: {
      data,
      id: id || null,
      ledgerIndexQuery: ledgerIndex || null,
      dateQuery: date || null,
      previousTxHashQuery: previousTxHash || null,
      initialErrorMessage: errorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function LedgerObject({
  id,
  data: initialData,
  initialErrorMessage,
  ledgerIndexQuery,
  dateQuery,
  previousTxHashQuery
}) {
  const router = useRouter()

  // data states (will be updated by the time-machine)
  const [data, setData] = useState(initialData)

  // ui & feedback states
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [loading, setLoading] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  // time-machine states
  const qsDate = dateQuery ? new Date(dateQuery) : null
  const [ledgerDate, setLedgerDate] = useState(qsDate)
  const [ledgerDateInput, setLedgerDateInput] = useState(qsDate)
  const isFirstRender = useRef(true)

  const addressFields = ['Account', 'Owner', 'Destination', 'Issuer', 'SendMax', 'RegularKey']

  const amountFields = ['Balance', 'LowLimit', 'HighLimit']

  const txIdFields = ['PreviousTxnID']
  const ledgerSeqFields = ['PreviousTxnLgrSeq']
  const objectIdFields = ['index']

  const detailsTable = () => {
    if (!data?.node) return null

    const renderValue = (val) => {
      if (val === null) return 'null'
      if (typeof val === 'object') {
        return (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(val, null, 2)}
          </pre>
        )
      }
      return val?.toString()
    }

    // First render LedgerEntryType if it exists
    const ledgerEntryTypeRow = data.node.LedgerEntryType ? (
      <tr key="LedgerEntryType">
        <td>LedgerEntryType</td>
        <td>
          <strong>{data.node.LedgerEntryType}</strong>
        </td>
      </tr>
    ) : null

    const cleanData = stripKeys(data.node)

    const rows = Object.entries(cleanData)
      .filter(([key]) => key !== 'LedgerEntryType') // Exclude LedgerEntryType from regular rows
      .map(([key, value]) => {
        // Link for transaction id
        if (txIdFields.includes(key) && typeof value === 'string') {
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>
                <LinkTx tx={value} short={12} />
              </td>
            </tr>
          )
        }

        // Link for ledger sequence number
        if (ledgerSeqFields.includes(key) && (typeof value === 'number' || typeof value === 'string')) {
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>
                <LedgerLink version={value} />
              </td>
            </tr>
          )
        }

        // Link for object index (hash)
        if (objectIdFields.includes(key) && typeof value === 'string') {
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>
                <Link href={`/object/${value}`}>{value}</Link>
              </td>
            </tr>
          )
        }

        // Amount-like fields (objects with value/currency/issuer)
        if (amountFields.includes(key) && typeof value === 'object') {
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>{amountFormat(value, { withIssuer: true })}</td>
            </tr>
          )
        }
        if (addressFields.includes(key)) {
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>
                <AddressWithIconFilled data={data.node} name={key} copyButton={true} />
              </td>
            </tr>
          )
        }
        if (key === 'previousTxAt') {
          return (
            <tr key={key}>
              <td>Previous Tx at</td>
              <td>{fullDateAndTime(value)}</td>
            </tr>
          )
        }

        if (key === 'CancelAfter' || key === 'FinishAfter') {
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>
                {fullDateAndTime(value, 'ripple')} ({value})
              </td>
            </tr>
          )
        }

        if (key === 'flags' && typeof value === 'object') {
          if (Object.values(value).some(Boolean)) {
            return (
              <tr key={key}>
                <td>Flags</td>
                <td>{showFlags(value)}</td>
              </tr>
            )
          }
          return null
        }

        return (
          <tr key={key}>
            <td>{capitalize(key)}</td>
            <td>{renderValue(value)}</td>
          </tr>
        )
      })

    return (
      <>
        <table className="table-details">
          <thead>
            <tr>
              {ledgerIndexQuery || previousTxHashQuery || dateQuery ? (
                <th colSpan="2" className="red bold">
                  Historical Data {dateQuery ? `(${dateQuery})` : ''}
                </th>
              ) : (
                <th colSpan="2">Ledger Entry Details</th>
              )}
            </tr>
          </thead>
          <tbody>
            {ledgerEntryTypeRow}
            {rows}
          </tbody>
        </table>
      </>
    )
  }

  // fetch object data for a specific date
  const fetchData = async () => {
    setLoading(true)
    let query = ''
    if (ledgerDate) {
      query = '?date=' + ledgerDate.toISOString()
    }

    try {
      const res = await axios('/v2/ledgerEntry/' + id + query)
      if (res?.data?.error === 'entryNotFound') {
        setErrorMessage(errorNotFoundMessage)
        setData(null)
      } else {
        setData(res?.data)
        setErrorMessage('')
      }
    } catch (e) {
      console.error(e)
      setErrorMessage(e.message || 'Error')
    }
    setLoading(false)
  }

  // refetch when date changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    fetchData()

    // reflect the chosen date in the URL without reloading the page
    const newQuery = { ...router.query }
    // Always drop params that conflict with the time-machine logic
    delete newQuery.ledgerIndex
    delete newQuery.previousTxHash

    if (ledgerDate) {
      newQuery.date = ledgerDate.toISOString()
    } else {
      delete newQuery.date
    }
    router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerDate])

  // ---------------------------------------------
  // Sync state with server-side props when the URL
  // query changes (e.g. user navigates to previous
  // version by ledger or by tx).
  // ---------------------------------------------
  useEffect(() => {
    setData(initialData)
    setErrorMessage(initialErrorMessage || '')
    // reset toggles if data changed
    setShowMetadata(false)
  }, [initialData, initialErrorMessage])

  return (
    <>
      <div className={object}>
        <SEO title={data?.node?.LedgerEntryType} description="Ledger object details" />
        <SearchBlock tab="object" searchPlaceholderText="Search by LedgerEntry" />
        <div className="content-profile short-top">
          {loading ? (
            <div className="center" style={{ marginTop: '80px' }}>
              <span className="waiting"></span>
              <br />
              Loading...
            </div>
          ) : (
            <>
              <div className="column-left">
                {/* Time machine */}
                <table className="table-details">
                  <thead>
                    <tr>
                      <th colSpan="2">Time Machine</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="2" className="no-padding">
                        <div className="time-machine">
                          <DatePicker
                            selected={ledgerDateInput || new Date()}
                            onChange={setLedgerDateInput}
                            selectsStart
                            showTimeInput
                            timeInputLabel="Time"
                            maxDate={new Date()}
                            dateFormat="yyyy/MM/dd HH:mm:ss"
                            className="dateAndTimeRange"
                            showMonthDropdown
                            showYearDropdown
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setLedgerDate(ledgerDateInput)}
                            className="button-action button-wide thin w-full"
                          >
                            Update
                          </button>{' '}
                          <button
                            onClick={() => {
                              setLedgerDate(null)
                              setLedgerDateInput(null)
                            }}
                            className="button-action button-wide thin w-full"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (data?.node?.PreviousTxnLgrSeq && data?.node?.PreviousTxnLgrSeq !== data?.ledger_index) {
                        router.push(`/object/${id}?ledgerIndex=${data.node.PreviousTxnLgrSeq}`)
                      } else if (data?.node?.PreviousTxnID) {
                        router.push(`/object/${id}?previousTxHash=${data.node.PreviousTxnID}`)
                      }
                    }}
                    className={`button-action center ${
                      !(data?.node?.PreviousTxnLgrSeq || data?.node?.PreviousTxnID) ? 'disabled' : ''
                    }`}
                    style={
                      !(data?.node?.PreviousTxnLgrSeq || data?.node?.PreviousTxnID)
                        ? { pointerEvents: 'none', opacity: 0.5 }
                        : {}
                    }
                  >
                    Previous version
                  </button>
                </div>
                <br />
                {!errorMessage && (data?.node?.PreviousTxnLgrSeq || data?.node?.PreviousTxnID) && (
                  <table className="table-details">
                    <thead>
                      <tr>
                        <th colSpan="2">History</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Current Ledger</td>
                        <td>
                          <Link
                            href={`/object/${id}?ledgerIndex=${data?.ledger_index}`}
                            className={ledgerIndexQuery === data?.ledger_index?.toString() ? 'active' : ''}
                          >
                            {data?.ledger_index}
                          </Link>
                        </td>
                      </tr>
                      {data?.node?.PreviousTxnLgrSeq && data?.node?.PreviousTxnLgrSeq !== data?.ledger_index && (
                        <tr>
                          <td>Previous Ledger</td>
                          <td>
                            <Link
                              href={`/object/${id}?ledgerIndex=${data.node.PreviousTxnLgrSeq}`}
                              className={ledgerIndexQuery === data.node.PreviousTxnLgrSeq?.toString() ? 'active' : ''}
                            >
                              {data.node.PreviousTxnLgrSeq}
                            </Link>
                          </td>
                        </tr>
                      )}

                      {previousTxHashQuery && (
                        <tr>
                          <td>Current Transaction</td>
                          <td>
                            <Link
                              href={`/object/${id}?previousTxHash=${data.node.PreviousTxnID}`}
                              className={previousTxHashQuery === data.node.PreviousTxnID ? 'active' : ''}
                            >
                              {shortAddress(previousTxHashQuery)}
                            </Link>
                          </td>
                        </tr>
                      )}
                      {data?.node?.PreviousTxnID && (
                        <tr>
                          <td>Previous Transaction</td>
                          <td>
                            <Link
                              href={`/object/${id}?previousTxHash=${data.node.PreviousTxnID}`}
                              className={previousTxHashQuery === data.node.PreviousTxnID ? 'active' : ''}
                            >
                              {shortAddress(data.node.PreviousTxnID)}
                            </Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                <br />
              </div>
              <div className="column-right">
                {errorMessage ? (
                  <div className="center orange bold">
                    <br />
                    {errorMessage}
                  </div>
                ) : (
                  <>
                    {detailsTable()}

                    {data?.metadata && (
                      <table className="table-details">
                        <tbody>
                          <tr>
                            <td>Metadata</td>
                            <td>
                              <span className="link" onClick={() => setShowMetadata(!showMetadata)}>
                                {showMetadata ? 'hide' : 'show'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    <div className={'slide ' + (showMetadata ? 'opened' : 'closed')}>
                      {showMetadata && codeHighlight(data.metadata)}
                    </div>

                    <table className="table-details">
                      <tbody>
                        <tr>
                          <td>Raw JSON</td>
                          <td>
                            <span className="link" onClick={() => setShowRaw(!showRaw)}>
                              {showRaw ? 'hide' : 'show'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className={'slide ' + (showRaw ? 'opened' : 'closed')}>
                      {showRaw && codeHighlight(stripKeys(data))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
