import React, { useState, useEffect, useRef } from 'react'
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
import { codeHighlight, AddressWithIconFilled, amountFormatNode, addressUsernameOrServiceLink } from '../../utils/format'
import { avatarServer, nativeCurrency, nativeCurrenciesImages } from '../../utils'
import { LinkTx, LedgerLink } from '../../utils/links'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id, ledgerIndex, date, previousTxHash } = query

  let data = null
  let rawData = null
  let errorMessage = null

  const makeQueryString = () => {
    const params = []
    if (ledgerIndex) params.push('ledgerIndex=' + ledgerIndex)
    if (date) params.push('date=' + date)
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

    // raw object without extra details
    const rawRes = await axiosServer({
      method: 'get',
      url: 'xrpl/ledgerEntry/' + id,
      headers: passHeaders(req)
    }).catch(() => {})
    rawData = rawRes?.data
  } catch (e) {
    console.error(e)
  }

  return {
    props: {
      data,
      rawData,
      initialErrorMessage: errorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function LedgerObject({ data: initialData, rawData: initialRawData, initialErrorMessage }) {
  const router = useRouter()

  // data states (will be updated by the time-machine)
  const [data, setData] = useState(initialData)
  const [rawData, setRawData] = useState(initialRawData)

  // ui & feedback states
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [loading, setLoading] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  // time-machine states
  const qsDate = router.query.date ? new Date(router.query.date) : null
  const [ledgerDate, setLedgerDate] = useState(qsDate)
  const [ledgerDateInput, setLedgerDateInput] = useState(qsDate)
  const isFirstRender = useRef(true)

  const addressFields = [
    'Account',
    'Owner',
    'Destination',
    'Issuer',
    'SendMax',
    'RegularKey'
  ]

  const amountFields = ['Balance', 'LowLimit', 'HighLimit']

  const txIdFields = ['PreviousTxnID']
  const ledgerSeqFields = ['PreviousTxnLgrSeq']
  const objectIdFields = ['index']

  const tokenIconSrc = (amount) => {
    if (!amount) return nativeCurrenciesImages[nativeCurrency]
    if (!amount.issuer) {
      // native currency (special rrrrr issuer)
      return nativeCurrenciesImages[nativeCurrency]
    }
    return avatarServer + amount.issuer
  }

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

    const rows = Object.entries(data.node).map(([key, value]) => {
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
            <td>
              <img
                src={tokenIconSrc(value)}
                alt="token icon"
                width="18"
                height="18"
                style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
              />
              {amountFormatNode(value)}{' '}
              {value?.issuer && (
                <>
                  ({addressUsernameOrServiceLink(value, 'issuer', { short: true })})
                </>
              )}
            </td>
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
      return (
        <tr key={key}>
          <td>{key}</td>
          <td>{renderValue(value)}</td>
        </tr>
      )
    })

    return (
      <table className="table-details">
        <thead>
          <tr>
            <th colSpan="2">Ledger Entry Details</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    )
  } 

  // fetch object data for a specific date
  const fetchData = async () => {
    setLoading(true)
    let query = ''
    if (ledgerDate) {
      query = '?date=' + ledgerDate.toISOString()
    }

    const id = router.query.id

    try {
      const res = await axios('/v2/ledgerEntry/' + id + query)
      setData(res?.data)

      const rawRes = await axios('/xrpl/ledgerEntry/' + id + query).catch(() => {})
      setRawData(rawRes?.data)
      setErrorMessage('')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerDate])
  
  return (
    <>
      <SEO title={data?.node?.LedgerEntryType} description="Ledger object details" />
      <SearchBlock tab="object" searchPlaceholderText="Search by LedgerEntry" />
      <div className="content-profile account short-top">
        {loading ? (
          <div className="center" style={{ marginTop: '80px' }}>
            <span className="waiting"></span>
            <br />
            Loading...
          </div>
        ) : errorMessage ? (
          <div className="orange bold">
            <br />
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="column-left">
              <h1>{data?.node?.LedgerEntryType}</h1>

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
                      <div className="flex flex-center" style={{ gap: '10px' }}>
                        <button
                          onClick={() => setLedgerDate(ledgerDateInput)}
                          className="button-action thin button-wide w-full"
                        >
                          Update
                        </button>{' '}
                        <button
                          onClick={() => {
                            setLedgerDate(null)
                            setLedgerDateInput(null)
                          }}
                          className="button-action thin button-wide w-full"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex flex-center" style={{ gap: '10px' }}>
                {data.node?.PreviousTxnLgrSeq && data.node?.PreviousTxnLgrSeq !== data.ledger_index && (
                  <Link href={`/object/${router.query.id}?ledgerIndex=${data.node.PreviousTxnLgrSeq}`} className="button-action w-full word-break">
                    Previous version (by ledger)
                  </Link>
                )}

                {data.node?.PreviousTxnID && (
                  <Link href={`/object/${router.query.id}?previousTxHash=${data.node.PreviousTxnID}`} className="button-action w-full">
                    Previous version (by tx)
                  </Link>
                )}
              </div>
              <br />
            </div>
            <div className="column-right">
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
                {showRaw && codeHighlight(rawData)}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}