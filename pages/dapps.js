import { useTranslation } from 'next-i18next'
import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import axios from 'axios'
import RadioOptions from '../components/UI/RadioOptions'
import FiltersFrame from '../components/Layout/FiltersFrame'
import CheckBox from '../components/UI/CheckBox'
import { axiosServer, passHeaders, currencyServer, logServerSideError } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { explorerName, nativeCurrency } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import { useRouter } from 'next/router'
import { setTabParams } from '../utils'

import SEO from '../components/SEO'
import { shortNiceNumber, amountFormat, timeOrDate, timeFromNow, niceNumber } from '../utils/format'
import { dappBySourceTag } from '../utils/transaction'
import { DAPPS_META, buildPrevMapBySourceTag, generatedAgentNameBySourceTag } from '../utils/dapps'
import DappLogo from '../components/Dapps/DappLogo'
import WalletsCell from '../components/Dapps/WalletsCell'
import TypeMixCell from '../components/Dapps/TypeMixCell'
import { dappsPageClass } from '../styles/pages/dapps.module.scss'
import { HeaderTooltip } from '../components/UI/HeaderTooltip'
import { useIsMobile } from '../utils/mobile'
import DappCard from '../components/Dapps/DappCard'
import WalletSelect from '../components/Dapps/WalletSelect'
import Delta from '../components/UI/Delta'

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

const dappsApiUrl = (convertCurrency, period) => {
  let apiUrl = `v2/dapps?convertCurrencies=${encodeURIComponent(convertCurrency)}&previousPeriod=true&previousPeriodMode=calendar-1`
  if (period) {
    apiUrl += `&period=${encodeURIComponent(period)}`
  }
  return apiUrl
}

const periodComparisonText = (t, period) => {
  if (period === 'week') {
    return t('dapps:periodComparison.week')
  }
  if (period === 'month') {
    return t('dapps:periodComparison.month')
  }
  return t('dapps:periodComparison.day')
}

export async function getServerSideProps(context) {
  const { locale, req, query } = context
  const { order, period, includeAppsWithoutExternalSigning, wallet } = query

  let initialData = null
  let initialErrorMessage = null

  const selectedCurrencyServer = currencyServer(req)
  const convertCurrency = (selectedCurrencyServer || 'usd').toLowerCase()

  const apiUrl = dappsApiUrl(convertCurrency, period)

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
    logServerSideError(error, req, 'dapps')
  }

  return {
    props: {
      initialData: initialData || null,
      orderQuery: order || 'performingHigh',
      periodQuery: period || 'day',
      includeAppsWithoutExternalSigningQuery: includeAppsWithoutExternalSigning === 'true',
      walletQuery: typeof wallet === 'string' ? wallet.toLowerCase() : '',
      initialErrorMessage: initialErrorMessage || '',
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'dapps']))
    }
  }
}

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
  includeAppsWithoutExternalSigningQuery,
  walletQuery,
  selectedCurrency: selectedCurrencyApp,
  setSelectedCurrency,
  fiatRate: fiatRateApp,
  selectedCurrencyServer
}) {
  const router = useRouter()
  const { t, i18n } = useTranslation(['common', 'dapps'])
  const isMobile = useIsMobile(764)
  const hasCompactFilters = useIsMobile(1301)

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
  const [excludeNoWallets, setExcludeNoWallets] = useState(!includeAppsWithoutExternalSigningQuery)
  const [walletFilter, setWalletFilter] = useState(walletQuery || '')
  const [sentTip, setSentTip] = useState(null)

  const initialFetchSkippedRef = useRef(false)

  const abortControllerRef = useRef()

  const walletsOptionsList = useMemo(() => {
    const metaObj = DAPPS_META[0] || {}
    const set = new Set()

    Object.values(metaObj).forEach((entry) => {
      ;(entry?.wallets || []).forEach((w) => set.add(String(w).toLowerCase()))
      ;(entry?.walletconnect || []).forEach((w) => set.add(String(w).toLowerCase()))
    })

    return Array.from(set)
  }, [])

  useEffect(() => {
    if (walletFilter && !excludeNoWallets) {
      setExcludeNoWallets(true)
    }
  }, [walletFilter, excludeNoWallets])

  useEffect(() => {
    if (!initialFetchSkippedRef.current) {
      initialFetchSkippedRef.current = true
      if (initialData) return
    }
    setLoading(true)
    setErrorMessage('')
    setRawData({})
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    axios
      .get('/' + dappsApiUrl(convertCurrency, period), {
        signal: controller.signal
      })
      .then((res) => {
        setRawData(res?.data || {})
        setLoading(false)
      })
      .catch((error) => {
        if (error?.message !== 'canceled') {
          setErrorMessage(error?.message || t('general.error'))
        }
        setLoading(false)
      })
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, convertCurrency])

  const prevByTag = useMemo(() => {
    return buildPrevMapBySourceTag(rawData?.previousPeriod?.dapps)
  }, [rawData?.previousPeriod?.dapps])

  const data = useMemo(() => {
    const list = Array.isArray(rawData?.dapps) ? rawData.dapps : []
    const metaObj = DAPPS_META[0] || {}
    // Exclude these sourceTags
    const excludeSourceTags = [0, 222, 777, 4004, 555002, 604802567, 446588767]
    const filtered = list.filter((d) => {
      const sourceTag = Number(d?.sourceTag)
      if (sourceTag < 100 || excludeSourceTags.includes(sourceTag)) return false
      const hasName =
        dappBySourceTag(d?.sourceTag) ||
        metaObj[String(d?.sourceTag)]?.name ||
        generatedAgentNameBySourceTag(d?.sourceTag)
      if (hasName) return true
      return Number(d?.uniqueSourceAddresses) > 3
    })
    const hasAnyExternalSigning = (entry) => {
      const hasWallets = Array.isArray(entry?.wallets) && entry.wallets.length > 0
      const hasWC = Array.isArray(entry?.walletconnect) && entry.walletconnect.length > 0
      return hasWallets || hasWC
    }

    const filteredWallets = excludeNoWallets
      ? filtered.filter((d) => {
          const entry = metaObj && metaObj[String(d?.sourceTag)]
          return hasAnyExternalSigning(entry)
        })
      : filtered

    const byWallet = walletFilter
      ? filteredWallets.filter((d) => {
          const entry = metaObj && metaObj[String(d?.sourceTag)]
          const all = [
            ...(Array.isArray(entry?.wallets) ? entry.wallets : []),
            ...(Array.isArray(entry?.walletconnect) ? entry.walletconnect : [])
          ].map((w) => String(w).toLowerCase())
          return all.includes(String(walletFilter).toLowerCase())
        })
      : filteredWallets

    return sortDapps(byWallet, order)
  }, [rawData, order, excludeNoWallets, walletFilter])

  const orderList = useMemo(
    () => [
      { value: 'performingHigh', label: t('dapps:sort.performingHigh') },
      { value: 'totalSentHigh', label: t('dapps:sort.totalSentHigh') },
      { value: 'interactingHigh', label: t('dapps:sort.interactingHigh') },
      { value: 'txHigh', label: t('dapps:sort.txHigh') },
      { value: 'successRateHigh', label: t('dapps:sort.successRateHigh') }
    ],
    [t]
  )

  // CSV headers for export
  const csvHeaders = useMemo(
    () => [
      { label: t('dapps:csv.dappName'), key: 'dappName' },
      { label: t('dapps:metrics.performingAddresses'), key: 'uniqueSourceAddresses' },
      { label: t('dapps:metrics.interactingAddresses'), key: 'uniqueInteractedAddresses' },
      { label: t('dapps:metrics.transactions'), key: 'totalTransactions' },
      { label: t('dapps:csv.types'), key: 'transactionTypes' },
      { label: t('dapps:activity.success'), key: 'successTransactions' },
      { label: t('dapps:csv.successPercent'), key: 'successRate' },
      { label: t('dapps:csv.fees'), key: 'totalFees' },
      {
        label: t('dapps:csv.feesCurrency', { currency: convertCurrency.toUpperCase() }),
        key: `totalFeesInFiats.${convertCurrency}`
      },
      {
        label: t('dapps:csv.volumeCurrency', { currency: convertCurrency.toUpperCase() }),
        key: `totalSentInFiats.${convertCurrency}`
      }
    ],
    [convertCurrency, t]
  )

  const csvData = useMemo(() => {
    const metaObj = DAPPS_META[0] || {}
    return (data || []).map((d) => {
      const successByType = getSuccessByType(d?.transactionTypesResults)
      const typesText = Object.entries(successByType)
        .filter(([, count]) => Number(count) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .map(([type, count]) => `${type}: ${shortNiceNumber(count, 0)}`)
        .join(', ')

      return {
        ...d,
        dappName:
          dappBySourceTag(d?.sourceTag) ||
          metaObj[String(d?.sourceTag)]?.name ||
          generatedAgentNameBySourceTag(d?.sourceTag) ||
          String(d?.sourceTag || ''),
        transactionTypes: typesText,
        successRate: Number(calcSuccessRate(d?.totalTransactions, d?.successTransactions).toFixed(1))
      }
    })
  }, [data])

  useEffect(() => {
    if (!router.isReady) return

    const add = []
    const remove = []

    // period
    if (period === 'day') {
      remove.push('period')
    } else {
      add.push({ name: 'period', value: period })
    }

    // includeAppsWithoutExternalSigning
    // excludeNoWallets=false => includeAppsWithoutExternalSigning=true
    if (excludeNoWallets) {
      remove.push('includeAppsWithoutExternalSigning')
    } else {
      add.push({ name: 'includeAppsWithoutExternalSigning', value: 'true' })
    }

    // wallet filter (только если excludeNoWallets=true; иначе filter скрыт/сброшен)
    if (excludeNoWallets && walletFilter) {
      add.push({ name: 'wallet', value: walletFilter })
    } else {
      remove.push('wallet')
    }

    setTabParams(router, [], add, remove)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, excludeNoWallets, walletFilter, router.isReady])

  const onToggleExclude = useCallback((v) => {
    setExcludeNoWallets(v)
    if (!v) setWalletFilter('')
  }, [])

  const periodOptions = useMemo(
    () => [
      { value: 'day', label: t('tabs.day'), shortLabel: `24${t('units.hours-short')}` },
      { value: 'week', label: t('tabs.week'), shortLabel: `7${t('units.days-short')}` },
      { value: 'month', label: t('tabs.month'), shortLabel: `30${t('units.days-short')}` }
    ],
    [t]
  )

  const activeFilters = useMemo(
    () => ({
      ...(!excludeNoWallets ? { [t('general.external-signing')]: t('general.optional') } : {}),
      ...(walletFilter ? { [t('wallet.connected-wallets')]: walletFilter } : {})
    }),
    [excludeNoWallets, t, walletFilter]
  )

  const periodSwitch = useMemo(
    () => (
      <div className="dapps-period-switch" aria-label={t('table.period')}>
        {periodOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`dapps-period-switch__button${period === option.value ? ' is-active' : ''}`}
            onClick={() => setPeriod(option.value)}
            aria-pressed={period === option.value}
            aria-label={option.label}
            title={option.label}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>
    ),
    [period, periodOptions, t]
  )

  return (
    <div className={dappsPageClass}>
      <SEO title={t('dapps:seo.title')} />

      <h1 className="center">{t('dapps:title', { explorerName })}</h1>

      <div className="center" style={{ marginBottom: 16, fontSize: 15, color: '#888' }}>
        {rawData?.updatedAt ? (
          <>
            {t('dapps:lastUpdate')}: {timeOrDate(rawData.updatedAt)} ({timeFromNow(rawData.updatedAt, i18n)})
          </>
        ) : (
          <br />
        )}
      </div>

      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={orderList}
        data={csvData}
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        csvHeaders={csvHeaders}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        filters={activeFilters}
        navExtra={hasCompactFilters ? periodSwitch : null}
      >
        <>
          <div>
            {t('table.period')}
            <RadioOptions tabList={periodOptions} tab={period} setTab={setPeriod} name="period" />
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {periodComparisonText(t, period)}
            </div>
          </div>
          <div>
            <CheckBox checked={excludeNoWallets} setChecked={onToggleExclude}>
              {t('dapps:filters.excludeWithoutExternalSigning')}
            </CheckBox>
          </div>
          {excludeNoWallets ? (
            <>
              <div style={{ marginBottom: 10 }}>{t('dapps:filters.walletFilter')}</div>
              <WalletSelect value={walletFilter} setValue={setWalletFilter} walletsList={walletsOptionsList} />
            </>
          ) : null}
        </>
        {loading ? (
          <table className={isMobile ? 'table-mobile' : 'table-large expand'}>
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
          isMobile ? (
            <div style={{ width: 'calc(100% - 30px)', margin: '0 auto' }}>
              {(() => {
                const metaObj = DAPPS_META[0] || {}
                return data?.length ? (
                  data.map((d, idx) => (
                    <DappCard
                      key={d?.sourceTag ?? idx}
                      dapp={d}
                      prevDapp={prevByTag ? prevByTag.get(String(d?.sourceTag)) : null}
                      index={idx}
                      convertCurrency={convertCurrency}
                      dappsMeta={metaObj}
                      expandedRowKey={expandedRowKey}
                      setExpandedRowKey={setExpandedRowKey}
                    />
                  ))
                ) : (
                  <div className="center orange bold" style={{ marginTop: 20 }}>
                    {t('general.no-data')}
                  </div>
                )
              })()}
            </div>
          ) : (
            <table className="table-large expand no-hover border">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th className="left pl-2.5">{t('dapps:columns.dapp')}</th>
                  <th className="left pl-2.5">{t('dapps:columns.wallets')}</th>
                  <HeaderTooltip
                    label="PA"
                    tip={
                      <>
                        <b>{t('dapps:metrics.performingAddresses')}</b>
                        <br />
                        {t('dapps:tooltips.performingAddresses')}
                      </>
                    }
                  />
                  <HeaderTooltip
                    label="IA"
                    tip={
                      <>
                        <b>{t('dapps:metrics.interactingAddresses')}</b>
                        <br />
                        {t('dapps:tooltips.interactingAddresses.before')} <code>tx.Address</code>,{' '}
                        <code>tx.Destination</code>, {t('dapps:tooltips.interactingAddresses.after')}
                      </>
                    }
                  />
                  <HeaderTooltip
                    label="TXs"
                    tip={
                      <>
                        <b>{t('dapps:metrics.transactions')}</b>
                        <br />
                        {t('dapps:tooltips.transactions')}
                      </>
                    }
                  />
                  <th className="left pl-2.5">{t('dapps:columns.activity')}</th>
                  <HeaderTooltip
                    label={t('dapps:metrics.volume')}
                    tip={
                      <>
                        <b>{t('dapps:metrics.volume')}</b>
                        <br />
                        {t('dapps:tooltips.volumeTypes')}
                        <br />
                        {t('dapps:tooltips.volumeSum', { nativeCurrency })}
                      </>
                    }
                  />
                </tr>
              </thead>

              <tbody>
                {data?.length ? (
                  data.map((d, idx) => {
                    const prev = prevByTag ? prevByTag.get(String(d?.sourceTag)) : null
                    const rowKey = d?.sourceTag ?? idx
                    const isOpen = expandedRowKey === rowKey

                    const successByType = getSuccessByType(d?.transactionTypesResults)

                    // Swaps are always successful and included in Payment.tesSUCCESS
                    if (typeof d?.swaps === 'number' && d.swaps > 0) {
                      const swaps = Number(d.swaps)
                      const payOk = Number(successByType.Payment || 0)
                      const swapsOk = Math.min(swaps, payOk)
                      if (swapsOk > 0) {
                        successByType.Payment = Math.max(0, payOk - swapsOk)
                        successByType['Payment:swap'] = swapsOk
                      }
                    }

                    const metaObj = DAPPS_META[0] || {}
                    const entry = metaObj && metaObj[String(d?.sourceTag)]
                    const logo = entry?.logo ? `/images/dapps/${entry.logo}` : null
                    const knownName = dappBySourceTag(d?.sourceTag) || entry?.name
                    const generatedName = knownName ? null : generatedAgentNameBySourceTag(d?.sourceTag)

                    return (
                      <tr key={d?.sourceTag ?? idx}>
                        <td className="center">
                          <span style={{ display: 'inline-block', transform: 'translateY(10px)' }}>{idx + 1}</span>
                        </td>

                        <td>
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            {logo ? <DappLogo src={logo} /> : null}
                            <span className="dapp-name-stack">
                              <span>{knownName || generatedName || d?.sourceTag}</span>
                              {generatedName && <span className="dapp-source-tag">{d?.sourceTag}</span>}
                            </span>
                          </span>
                        </td>

                        <td>
                          {entry?.wallets?.length || entry?.walletconnect?.length ? (
                            <WalletsCell wallets={entry?.wallets || []} walletconnect={entry?.walletconnect || []} />
                          ) : null}
                        </td>

                        <td className="right">
                          {shortNiceNumber(d?.uniqueSourceAddresses, 0)}
                          <span style={{ opacity: 0.7 }}>
                            <Delta cur={d?.uniqueSourceAddresses} prev={prev?.uniqueSourceAddresses} />
                          </span>
                        </td>
                        <td className="right">
                          {shortNiceNumber(d?.uniqueInteractedAddresses, 0)}
                          <span style={{ opacity: 0.7 }}>
                            <Delta cur={d?.uniqueInteractedAddresses} prev={prev?.uniqueInteractedAddresses} />
                          </span>
                        </td>
                        <td className="right">
                          {shortNiceNumber(d?.totalTransactions, 0)}
                          <span style={{ opacity: 0.7 }}>
                            <Delta cur={d?.totalTransactions} prev={prev?.totalTransactions} />
                          </span>
                        </td>

                        <td className="right">
                          <TypeMixCell
                            successByType={successByType}
                            totalTransactions={d?.totalTransactions}
                            successTransactions={d?.successTransactions}
                            transactionTypesResults={d?.transactionTypesResults}
                            isOpen={isOpen}
                            onToggle={() => setExpandedRowKey(isOpen ? null : rowKey)}
                            breakpoint={600}
                          />
                        </td>

                        <td className="right no-brake">
                          <span
                            onMouseEnter={(e) => {
                              if (isMobile) return
                              setSentTip({
                                x: e.clientX,
                                y: e.clientY,
                                lines: [
                                  amountFormat(d?.totalSent, { short: true }),
                                  niceNumber(d?.totalSentInFiats?.[convertCurrency], 2, convertCurrency)
                                ]
                              })
                            }}
                            onMouseMove={(e) => {
                              if (isMobile) return
                              setSentTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))
                            }}
                            onMouseLeave={() => {
                              if (isMobile) return
                              setSentTip(null)
                            }}
                            style={{ cursor: 'default' }}
                            suppressHydrationWarning
                          >
                            {shortNiceNumber(d?.totalSentInFiats?.[convertCurrency], 2, 1, convertCurrency)}
                          </span>

                          <br />

                          <span style={{ opacity: 0.7 }}>
                            <Delta
                              inline
                              cur={d?.totalSentInFiats?.[convertCurrency]}
                              prev={prev?.totalSentInFiats?.[convertCurrency]}
                            />
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
          )
        ) : (
          <div className="center orange bold" style={{ marginTop: 20 }}>
            {errorMessage}
          </div>
        )}
      </FiltersFrame>
      {!isMobile && sentTip
        ? (() => {
            const pad = 10
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
            const vh = typeof window !== 'undefined' ? window.innerHeight : 800

            const openLeft = sentTip.x > vw * 0.7
            const openUp = sentTip.y > vh * 0.7

            const left = Math.max(pad, Math.min(sentTip.x + 12, vw - pad))
            const top = Math.max(pad, Math.min(sentTip.y + 12, vh - pad))

            return (
              <div
                className="dapps-activity-tooltip"
                style={{
                  left,
                  top,
                  transform: `${openLeft ? 'translateX(-100%)' : 'translateX(0)'} ${openUp ? 'translateY(-100%)' : 'translateY(0)'}`
                }}
              >
                {sentTip.lines?.map((line, i) => (
                  <div key={i} className="dapps-activity-tooltip__line">
                    {line}
                  </div>
                ))}
              </div>
            )
          })()
        : null}
    </div>
  )
}
