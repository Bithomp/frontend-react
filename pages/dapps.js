import { useTranslation } from 'next-i18next'
import { useMemo, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import RadioOptions from '../components/UI/RadioOptions'
import FiltersFrame from '../components/Layout/FiltersFrame'
import { axiosServer, passHeaders, currencyServer } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { explorerName, nativeCurrency, useWidth } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { useRouter } from 'next/router'
import { setTabParams } from '../utils'

import SEO from '../components/SEO'
import { shortNiceNumber, amountFormat, timeOrDate, timeFromNow } from '../utils/format'
import { dappBySourceTag } from '../utils/transaction'
import TypeMixCell from '../components/Dapps/TypeMixCell'
import { dappsPageClass } from '../styles/pages/dapps.module.scss'

const calcSuccessRate = (total, success) => {
  const t = Number(total)
  const s = Number(success)
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(s) || s < 0) return 0
  return (s / t) * 100
}

const sortDapps = (list, order) => {
  const arr = Array.isArray(list) ? [...list] : []

  switch (order) {
    case 'performingHigh':
      return arr.sort((a, b) => Number(b?.uniqueSourceAddresses ?? 0) - Number(a?.uniqueSourceAddresses ?? 0))
    case 'totalSentHigh':
      return arr.sort((a, b) => Number(b?.totalSent ?? 0) - Number(a?.totalSent ?? 0))
    case 'interactingHigh':
      return arr.sort((a, b) => Number(b?.uniqueInteractedAddresses ?? 0) - Number(a?.uniqueInteractedAddresses ?? 0))
    case 'txHigh':
      return arr.sort((a, b) => Number(b?.totalTransactions ?? 0) - Number(a?.totalTransactions ?? 0))
    case 'successRateHigh':
      return arr.sort(
        (a, b) =>
          calcSuccessRate(b?.totalTransactions, b?.successTransactions) -
          calcSuccessRate(a?.totalTransactions, a?.successTransactions)
      )
    default:
      return arr
  }
}

export async function getServerSideProps(context) {
  const { locale, req, query } = context
  const { order, period } = query

  let initialData = null
  let initialErrorMessage = null

  const selectedCurrencyServer = currencyServer(req)
  const convertCurrency = (selectedCurrencyServer || 'usd').toLowerCase()

  let apiUrl = `v2/dapps?convertCurrencies=${encodeURIComponent(convertCurrency)}`
  if (period) {
    apiUrl += `&period=${encodeURIComponent(period)}`
  }

  try {
    const res = await axiosServer({
      method: 'get',
      url: apiUrl,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      initialData: initialData || null,
      orderQuery: order || 'performingHigh',
      periodQuery: period || 'day',
      initialErrorMessage: initialErrorMessage || '',
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const periodOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' }
]

export default function Dapps({
  initialData,
  initialErrorMessage,
  orderQuery,
  periodQuery,
  selectedCurrency: selectedCurrencyApp,
  fiatRate: fiatRateApp,
  selectedCurrencyServer
}) {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const windowWidth = useWidth()

  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    selectedCurrency = selectedCurrencyApp
  }

  const convertCurrency = (selectedCurrency || 'usd').toLowerCase()

  const [order, setOrder] = useState(orderQuery || 'performingHigh')
  const [period, setPeriod] = useState(periodQuery)
  const [errorMessage, setErrorMessage] = useState(
    t(`error.${initialErrorMessage}`, { defaultValue: initialErrorMessage }) || ''
  )
  const [filtersHide, setFiltersHide] = useState(false)
  const [rawData, setRawData] = useState(initialData || {})
  const [loading, setLoading] = useState(false)
  const [expandedRowKey, setExpandedRowKey] = useState(null)

  const abortControllerRef = useRef()

  useEffect(() => {
    setLoading(true)
    setErrorMessage('')
    setRawData({})
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    axios
      .get(`/v2/dapps?convertCurrencies=${encodeURIComponent(convertCurrency)}&period=${period}`, {
        signal: controller.signal
      })
      .then((res) => {
        setRawData(res?.data || {})
        setLoading(false)
      })
      .catch((error) => {
        if (error?.message !== 'canceled') {
          setErrorMessage(error?.message || 'Error')
        }
        setLoading(false)
      })
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, convertCurrency])

  const data = useMemo(() => {
    const list = Array.isArray(rawData?.dapps) ? rawData.dapps : []
    // Exclude these sourceTags
    const excludeSourceTags = [0, 222, 777, 4004, 604802567, 446588767]
    const filtered = list.filter((d) => {
      if (excludeSourceTags.includes(Number(d?.sourceTag))) return false
      const hasName = dappBySourceTag(d?.sourceTag)
      if (hasName) return true
      return Number(d?.uniqueSourceAddresses) > 3
    })
    return sortDapps(filtered, order)
  }, [rawData, order])

  const orderList = [
    { value: 'performingHigh', label: 'Performing wallets: High to Low' },
    { value: 'totalSentHigh', label: 'Total Sent: High to Low' },
    { value: 'interactingHigh', label: 'Interacting wallets: High to Low' },
    { value: 'txHigh', label: 'Transactions: High to Low' },
    { value: 'successRateHigh', label: 'Success rate: High to Low' }
  ]

  // CSV headers for export
  const csvHeaders = [
    { label: 'Dapp Name', key: 'dappName' },
    { label: 'Performing wallets', key: 'uniqueSourceAddresses' },
    { label: 'Interacting wallets', key: 'uniqueInteractedAddresses' },
    { label: 'Transactions', key: 'totalTransactions' },
    { label: 'Types', key: 'transactionTypes' },
    { label: 'Success', key: 'successTransactions' },
    { label: 'Success %', key: 'successRate' },
    { label: 'Fees', key: 'totalFees' },
    { label: `Fees (${convertCurrency.toUpperCase()})`, key: `totalFeesInFiats.${convertCurrency}` },
    { label: `Total sent (${convertCurrency.toUpperCase()})`, key: `totalSentInFiats.${convertCurrency}` }
  ]

  useEffect(() => {
    if (!router.isReady) return
    if (period === 'day') {
      setTabParams(router, [], [], ['period'])
    } else {
      setTabParams(router, [], [{ name: 'period', value: period }], [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, router.isReady])

  return (
    <div className={dappsPageClass}>
      <SEO title="Dapps" />

      <h1 className="center">{explorerName} Dapps Radar</h1>

      <div className="center" style={{ marginBottom: 16, fontSize: 15, color: '#888' }}>
        {rawData?.updatedAt ? (
          <>
            Last update: {timeOrDate(rawData.updatedAt)} ({timeFromNow(rawData.updatedAt, i18n)})
          </>
        ) : (
          <br />
        )}
      </div>

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        data={data}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        csvHeaders={csvHeaders}
      >
        <>
          Stats period:
          <RadioOptions tabList={periodOptions} tab={period} setTab={setPeriod} name="period" />
          <div style={{ maxWidth: 800, padding: 20, margin: 'auto' }}>
            <b>Interacting wallets</b> - Unique Interacted Addresses: <code>tx.Address</code>,{' '}
            <code>tx.Destination</code>
            , actual sender, and actual receiver (the latter two may differ from source and destination in some
            transactions).
            <br />
            <br />
            <b>Total sent</b> — This is the sum of all {nativeCurrency} and IOU tokens sent, converted to{' '}
            {nativeCurrency} at the rate at the time of each transaction.
          </div>
        </>
        {loading ? (
          <table className={windowWidth && windowWidth <= 860 ? 'table-mobile' : 'table-large expand'}>
            <tbody>
              <tr className="center">
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />
                  {t('general.loading')}
                  <br />
                  <br />
                </td>
              </tr>
            </tbody>
          </table>
        ) : !errorMessage ? (
          !windowWidth || windowWidth > 860 ? (
            <table className="table-large expand no-hover border">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>Dapp</th>
                  <th className="right">Performing</th>
                  <th className="right">Interacting</th>
                  <th className="right">Activity</th>
                  <th className="right">Fees</th>
                  <th className="right">Total sent</th>
                </tr>
              </thead>
              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const rowKey = d?.sourceTag ?? idx
                    const isOpen = expandedRowKey === rowKey
                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td className="center">{idx + 1}</td>
                        <td className="no-brake">{dappBySourceTag(d?.sourceTag) || d?.sourceTag}</td>
                        <td className="right">{shortNiceNumber(d?.uniqueSourceAddresses, 0)}</td>
                        <td className="right">{shortNiceNumber(d?.uniqueInteractedAddresses, 0)}</td>
                        <td className="right">
                          <TypeMixCell
                            transactionTypes={d?.transactionTypes}
                            totalTransactions={d?.totalTransactions}
                            successTransactions={d?.successTransactions}
                            isOpen={isOpen}
                            onToggle={() => setExpandedRowKey(isOpen ? null : rowKey)}
                          />
                        </td>
                        <td className="right no-brake">
                          {amountFormat(d?.totalFees, { short: true })}
                          <br />
                          <span style={{ opacity: 0.7 }} suppressHydrationWarning>
                            {shortNiceNumber(d?.totalFeesInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                          </span>
                        </td>
                        <td className="right no-brake">
                          {amountFormat(d?.totalSent, { short: true })}
                          <br />
                          <span style={{ opacity: 0.7 }} suppressHydrationWarning>
                            {shortNiceNumber(d?.totalSentInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="100" className="center orange bold">
                      {t('general.no-data')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="table-mobile">
              <thead></thead>
              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const successRate = calcSuccessRate(d?.totalTransactions, d?.successTransactions)
                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td style={{ padding: '10px 5px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                            {idx + 1}. {dappBySourceTag(d?.sourceTag) || d?.sourceTag}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Performing wallets:</b> {shortNiceNumber(d?.uniqueSourceAddresses, 0)}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Interacting wallets:</b> {shortNiceNumber(d?.uniqueInteractedAddresses, 0)}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Transactions:</b> {shortNiceNumber(d?.totalTransactions, 0)}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Types:</b>{' '}
                            {d?.transactionTypes
                              ? Object.entries(d.transactionTypes)
                                  .map(([type, count]) => `${type}: ${shortNiceNumber(count, 0)}`)
                                  .join(', ')
                              : ''}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Success:</b> {shortNiceNumber(d?.successTransactions, 0)}
                            <span style={{ opacity: 0.7, marginLeft: 8 }}>{successRate.toFixed(2)}%</span>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Fees:</b> {amountFormat(d?.totalFees, { short: true })}
                            <span style={{ opacity: 0.7, marginLeft: 8 }} suppressHydrationWarning>
                              {shortNiceNumber(d?.totalFeesInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                            </span>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <b>Total sent:</b> {amountFormat(d?.totalSent, { short: true })}
                            <span style={{ opacity: 0.7, marginLeft: 8 }} suppressHydrationWarning>
                              {shortNiceNumber(d?.totalSentInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="100" className="center orange bold">
                      {t('general.no-data')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        ) : (
          <div className="center orange bold" style={{ marginTop: 20 }}>
            {errorMessage}
          </div>
        )}
      </FiltersFrame>
    </div>
  )
}
