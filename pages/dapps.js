import { useTranslation } from 'next-i18next'
import { useMemo, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import RadioOptions from '../components/UI/RadioOptions'
import FiltersFrame from '../components/Layout/FiltersFrame'
import CheckBox from '../components/UI/CheckBox'
import { axiosServer, passHeaders, currencyServer } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { explorerName, nativeCurrency, useWidth } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { useRouter } from 'next/router'
import { setTabParams } from '../utils'

import SEO from '../components/SEO'
import { shortNiceNumber, amountFormat, timeOrDate, timeFromNow } from '../utils/format'
import { dappBySourceTag } from '../utils/transaction'
import { DAPPS_META } from '../utils/dapps'
import DappLogo from '../components/Dapps/DappLogo'
import WalletsCell from '../components/Dapps/WalletsCell'
import TypeMixCell from '../components/Dapps/TypeMixCell'
import { dappsPageClass } from '../styles/pages/dapps.module.scss'
import { HeaderTooltip } from '../components/UI/HeaderTooltip'

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
    if (res?.data) {
      if (res.data?.error) {
        initialErrorMessage = res.data.error
      } else {
        initialData = res.data
      }
    } else {
      initialErrorMessage = 'Dapps info not found'
    }
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

// Build success-by-type map from transactionTypesResults
const getSuccessByType = (transactionTypesResults) => {
  const res = {}
  const src = transactionTypesResults && typeof transactionTypesResults === 'object' ? transactionTypesResults : {}
  for (const [txType, codes] of Object.entries(src)) {
    const ok = Number(codes?.tesSUCCESS || 0)
    if (ok > 0) res[txType] = ok
  }
  return res
}

export default function Dapps({
  initialData,
  initialErrorMessage,
  orderQuery,
  periodQuery,
  selectedCurrency: selectedCurrencyApp,
  setSelectedCurrency,
  fiatRate: fiatRateApp,
  selectedCurrencyServer
}) {
  const [excludeNoWallets, setExcludeNoWallets] = useState(true)
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
    const excludeSourceTags = [0, 222, 777, 4004, 555002, 604802567, 446588767]
    const filtered = list.filter((d) => {
      if (excludeSourceTags.includes(Number(d?.sourceTag))) return false
      const hasName = dappBySourceTag(d?.sourceTag)
      if (hasName) return true
      return Number(d?.uniqueSourceAddresses) > 3
    })
    const metaObj = DAPPS_META[0] || {}
    const filteredWallets = excludeNoWallets
      ? filtered.filter((d) => {
          const entry = metaObj && metaObj[String(d?.sourceTag)]
          return entry && Array.isArray(entry.wallets) && entry.wallets.length > 0
        })
      : filtered
    return sortDapps(filteredWallets, order)
  }, [rawData, order, excludeNoWallets])

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

  // Helper to get dapp logo by sourceTag
  const getDappLogo = (sourceTag) => {
    const metaObj = DAPPS_META[0] || {}
    const entry = metaObj && metaObj[String(sourceTag)]
    if (entry && entry.logo) {
      return `/images/dapps/${entry.logo}`
    }
    return null
  }

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
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
      >
        <>
          {true === false && <RadioOptions tabList={periodOptions} tab={period} setTab={setPeriod} name="period" />}
          <CheckBox checked={excludeNoWallets} setChecked={setExcludeNoWallets}>
            Exclude apps without external signing
          </CheckBox>
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
          !windowWidth || windowWidth > 1000 ? (
            <table className="table-large expand no-hover border">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th className="left pl-2.5">Dapp</th>
                  <th className="left pl-2.5">Wallets</th>
                  <HeaderTooltip
                    label="PA"
                    tip={
                      <>
                        <b>Performing addresses</b>
                        <br />
                        Unique addresses that have signed transactions.
                      </>
                    }
                  />
                  <HeaderTooltip
                    label="IA"
                    tip={
                      <>
                        <b>Interacting addresses</b>
                        <br />
                        Unique Interacted Addresses: <code>tx.Address</code>, <code>tx.Destination</code>, actual
                        sender, and actual receiver (the latter two may differ from source and destination in some
                        transactions).
                      </>
                    }
                  />
                  <th className="left pl-2.5">Activity</th>
                  {/* <th className="right pr-2.5">Fees</th> */}
                  <HeaderTooltip
                    label="Total sent"
                    tip={
                      <>
                        <b>Total sent</b>
                        <br />
                        This is the sum of all {nativeCurrency} and IOU tokens sent, converted to {nativeCurrency} at
                        the rate at the time of each transaction.
                      </>
                    }
                  />
                </tr>
              </thead>
              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const rowKey = d?.sourceTag ?? idx
                    const isOpen = expandedRowKey === rowKey

                    const successByType = getSuccessByType(d?.transactionTypesResults)

                    // Swaps are always successful and included in Payment.tesSUCCESS
                    if (typeof d?.swaps === 'number' && d.swaps > 0) {
                      const swaps = Number(d.swaps)
                      const payOk = Number(successByType.Payment || 0)

                      // Ensure we don't go negative if data mismatch
                      const swapsOk = Math.min(swaps, payOk)
                      if (swapsOk > 0) {
                        successByType.Payment = Math.max(0, payOk - swapsOk)
                        successByType['Payment:swap'] = swapsOk
                      }
                    }

                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td className="center">{idx + 1}</td>
                        <td className="no-brake">
                          {(() => {
                            const logo = getDappLogo(d?.sourceTag)
                            return logo ? <DappLogo src={logo} /> : null
                          })()}
                          {dappBySourceTag(d?.sourceTag) || d?.sourceTag}
                        </td>
                        <td className="center">
                          {(() => {
                            const metaObj = DAPPS_META[0] || {}
                            const entry = metaObj && metaObj[String(d?.sourceTag)]
                            return entry && entry.wallets ? <WalletsCell wallets={entry.wallets} /> : null
                          })()}
                        </td>
                        <td className="right">{shortNiceNumber(d?.uniqueSourceAddresses, 0)}</td>
                        <td className="right">{shortNiceNumber(d?.uniqueInteractedAddresses, 0)}</td>
                        <td className="right">
                          <TypeMixCell
                            // IMPORTANT: now pass success counts, not totals
                            successByType={successByType}
                            totalTransactions={d?.totalTransactions}
                            successTransactions={d?.successTransactions}
                            // detailed results by tx type (for failed drilldown)
                            transactionTypesResults={d?.transactionTypesResults}
                            isOpen={isOpen}
                            onToggle={() => setExpandedRowKey(isOpen ? null : rowKey)}
                          />
                        </td>
                        {/* <td className="right no-brake">
                          {amountFormat(d?.totalFees, { short: true })}
                          <br />
                          <span style={{ opacity: 0.7 }} suppressHydrationWarning>
                            {shortNiceNumber(d?.totalFeesInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                          </span>
                        </td> */}
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
                          {/* <div style={{ marginBottom: 4 }}>
                            <b>Fees:</b> {amountFormat(d?.totalFees, { short: true })}
                            <span style={{ opacity: 0.7, marginLeft: 8 }} suppressHydrationWarning>
                              {shortNiceNumber(d?.totalFeesInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                            </span>
                          </div> */}
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
