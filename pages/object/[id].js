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
import { codeHighlight, AddressWithIconFilled } from '../../utils/format'

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
    'LowLimit',
    'HighLimit',
    'RegularKey'
  ]

  const detailsTable = () => {
    if (!data?.node) return null

    const rows = Object.entries(data.node)
      .filter(([k, v]) => typeof v !== 'object' || v === null)
      .map(([key, value]) => {
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
            <td>{value?.toString()}</td>
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

  const previousVersionLink = () => {
    if (!data?.node) return null

    if (data.node.PreviousTxnLgrSeq && data.node.PreviousTxnLgrSeq !== data.ledger_index) {
      const href =
        '/object/' +
        router.query.id +
        '?ledgerIndex=' +
        data.node.PreviousTxnLgrSeq
      return (
        <Link href={href} className="button-action">
          Previous version (ledger {data.node.PreviousTxnLgrSeq})
        </Link>
      )
    }
    if (data.node.PreviousTxnID) {
      const href =
        '/object/' + router.query.id + '?previousTxHash=' + data.node.PreviousTxnID
      return (
        <Link href={href} className="button-action">
          Previous version (by tx)
        </Link>
      )
    }
    return null
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
      <div className="content-center short-top">
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
            <h1>{data?.node?.LedgerEntryType}</h1>

            {/* Time machine */}
            <table className="table-details" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th colSpan="2">Time machine</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="2" className="no-padding">
                    <div className="time-machine" style={{ padding: '10px 0' }}>
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
                    <div className="flex flex-center">
                      <button
                        onClick={() => setLedgerDate(ledgerDateInput)}
                        className="button-action thin button-wide"
                      >
                        Update
                      </button>{' '}
                      <button
                        onClick={() => {
                          setLedgerDate(null)
                          setLedgerDateInput(null)
                        }}
                        className="button-action thin button-wide"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {previousVersionLink()}

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
          </>
        )}
      </div>
    </>
  )
}
