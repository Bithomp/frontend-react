import axios from 'axios'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa'
import { FaDiscord, FaFacebook, FaInstagram, FaLinkedin, FaTelegram, FaXTwitter } from 'react-icons/fa6'

import SEO from '../../components/SEO'
import DappLogo from '../../components/Dapps/DappLogo'
import WalletsCell from '../../components/Dapps/WalletsCell'
import TypeMixCell from '../../components/Dapps/TypeMixCell'
import DappSelect from '../../components/Dapps/DappSelect'
import DappsDataNote from '../../components/Dapps/DappsDataNote'
import ChartPeriodSwitch from '../../components/UI/ChartPeriodSwitch'
import { useTheme } from '../../components/Layout/ThemeContext'
import { axiosServer, currencyServer, passHeaders } from '../../utils/axios'
import { explorerName, nativeCurrency, normalizeLocale } from '../../utils'
import { apexAxisLabelStyle, apexChartTheme } from '../../utils/apexCharts'
import { DAPPS_META, DAPP_CHART_PERIODS, dappChartApiUrl, dappChartSpan, generatedAgentNameBySourceTag } from '../../utils/dapps'
import { shortNiceNumber } from '../../utils/format'
import { dappBySourceTag } from '../../utils/transaction'
import styles from '../../styles/pages/dappDetails.module.scss'
import { dappsPageClass } from '../../styles/pages/dapps.module.scss'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })
const DEFAULT_PERIOD = 'month'

const DAPP_SOCIAL_LINKS = [
  { key: 'x', label: 'X', href: (value) => `https://x.com/${value}`, Icon: FaXTwitter },
  { key: 'discord', label: 'Discord', href: (value) => `https://discord.gg/${value.replace(/^invite\//, '')}`, Icon: FaDiscord },
  { key: 'telegram', label: 'Telegram', href: (value) => `https://t.me/${value.replace(/^@/, '')}`, Icon: FaTelegram },
  { key: 'linkedin', label: 'LinkedIn', href: (value) => `https://linkedin.com/${value}`, Icon: FaLinkedin },
  { key: 'instagram', label: 'Instagram', href: (value) => `https://instagram.com/${value}`, Icon: FaInstagram },
  { key: 'facebook', label: 'Facebook', href: (value) => `https://facebook.com/${value}`, Icon: FaFacebook }
]

const numberValue = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const sumRows = (rows, getter) => rows.reduce((sum, row) => sum + numberValue(getter(row)), 0)

const averageRows = (rows, getter) => (rows.length ? sumRows(rows, getter) / rows.length : 0)

const chartTimestamp = (row) => numberValue(row?.time || row?.timestamp) * 1000

const CHART_SPAN_MS = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 31 * 24 * 60 * 60 * 1000
}

const periodFromQuery = (period) => {
  const value = Array.isArray(period) ? period[0] : period
  return DAPP_CHART_PERIODS.includes(value) ? value : DEFAULT_PERIOD
}

const absoluteUrl = (url) => {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

const dappIdentity = (sourceTag) => {
  const meta = DAPPS_META?.[0]?.[String(sourceTag)] || {}
  const knownName = dappBySourceTag(sourceTag) || meta.name
  return {
    meta,
    name: knownName || generatedAgentNameBySourceTag(sourceTag) || String(sourceTag),
    generated: !knownName
  }
}

export async function getServerSideProps(context) {
  const { locale, params, query, req } = context
  const sourceTag = String(params?.id || '')
  if (!/^\d+$/.test(sourceTag)) return { notFound: true }

  const period = periodFromQuery(query?.period)
  const selectedCurrencyServer = currencyServer(req)
  let initialData = null
  let initialErrorMessage = ''

  try {
    const response = await axiosServer({
      method: 'get',
      url: dappChartApiUrl(sourceTag, selectedCurrencyServer, period),
      headers: passHeaders(req)
    })
    initialData = response?.data || null
  } catch (error) {
    initialErrorMessage = error?.message || 'Dapp data not found'
  }

  return {
    props: {
      sourceTag,
      periodQuery: period,
      selectedCurrencyServer,
      initialData,
      initialErrorMessage,
      ...(await serverSideTranslations(locale, ['common', 'dapps']))
    }
  }
}

function DappHistoryChart({ title, rows, series, currency = '', type = 'line', showYear = false }) {
  const { t, i18n } = useTranslation('dapps')
  const { theme } = useTheme()
  const chartTheme = useMemo(() => apexChartTheme(theme), [theme])
  const hasData = rows.length > 0 && series.some((item) => item.data.some((point) => point.y !== null))
  const options = useMemo(
    () => ({
      chart: { animations: { enabled: false }, toolbar: { show: false }, zoom: { enabled: false }, foreColor: chartTheme.textColor },
      colors: series.map((item) => item.color).filter(Boolean),
      dataLabels: { enabled: false },
      grid: { borderColor: chartTheme.gridColor, strokeDashArray: 3, padding: { top: 2, right: 8, bottom: 0, left: 6 } },
      legend: {
        show: series.length > 1,
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '11px',
        labels: { colors: chartTheme.labelColor }
      },
      stroke: { curve: 'smooth', width: type === 'bar' ? 0 : 2 },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          hideOverlappingLabels: true,
          style: apexAxisLabelStyle(theme, { fontSize: '10px' }),
          formatter: (_value, timestamp) =>
            new Date(timestamp).toLocaleDateString(
              normalizeLocale(i18n.language),
              showYear ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' }
            )
        },
        axisBorder: { color: chartTheme.gridColor },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          formatter: (value) => shortNiceNumber(value, 2, 1, currency || null),
          style: apexAxisLabelStyle(theme, { fontSize: '10px' })
        }
      },
      tooltip: { shared: true, intersect: false, theme: chartTheme.tooltipTheme }
    }),
    [chartTheme, currency, i18n.language, series, showYear, theme, type]
  )

  return (
    <section className={styles.chartCard}>
      <h2>{title}</h2>
      {hasData ? (
        <Chart height={220} options={options} series={series} type={type} />
      ) : (
        <div className={styles.emptyChart}>{t('detail.noChartData')}</div>
      )}
    </section>
  )
}

function MetricLabel({ label, tip }) {
  return (
    <span className={styles.metricLabel} tabIndex={0}>
      {label} <small aria-hidden="true">ⓘ</small>
      <span className={styles.metricTooltip} role="tooltip">{tip}</span>
    </span>
  )
}

export default function DappDetails({
  sourceTag,
  periodQuery,
  initialData,
  initialErrorMessage,
  selectedCurrency: selectedCurrencyApp,
  fiatRate,
  selectedCurrencyServer
}) {
  const router = useRouter()
  const { t } = useTranslation('dapps')
  const identity = useMemo(() => dappIdentity(sourceTag), [sourceTag])
  const currency = ((fiatRate ? selectedCurrencyApp : selectedCurrencyServer) || 'usd').toLowerCase()
  const [period, setPeriod] = useState(periodQuery)
  const [payload, setPayload] = useState(initialData || {})
  const [loading, setLoading] = useState(!initialData)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const initialRequestRef = useRef(true)

  useEffect(() => {
    if (initialRequestRef.current) {
      initialRequestRef.current = false
      if (initialData && currency === String(initialData?.convertCurrencies?.[0] || currency).toLowerCase()) return
    }

    const controller = new AbortController()
    setLoading(true)
    setErrorMessage('')
    axios
      .get(dappChartApiUrl(sourceTag, currency, period), { signal: controller.signal })
      .then((response) => setPayload(response?.data || {}))
      .catch((error) => {
        if (error?.message !== 'canceled') setErrorMessage(error?.message || t('detail.loadError'))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [currency, initialData, period, sourceTag, t])

  const rows = useMemo(
    () => (Array.isArray(payload?.chart) ? [...payload.chart].sort((a, b) => chartTimestamp(a) - chartTimestamp(b)) : []),
    [payload?.chart]
  )
  const span = payload?.span || dappChartSpan(period)
  const summary = useMemo(() => {
    const transactions = sumRows(rows, (row) => row.totalTransactions)
    const success = sumRows(rows, (row) => row.successTransactions)
    return {
      transactions,
      success,
      failed: Math.max(transactions - success, 0),
      successRate: transactions ? (success / transactions) * 100 : 0,
      swaps: sumRows(rows, (row) => row.swaps),
      nativeVolume: sumRows(rows, (row) => row.totalSent) / 1000000,
      nativeFees: sumRows(rows, (row) => row.totalFees) / 1000000,
      volume: sumRows(rows, (row) => row.totalSentInFiats?.[currency]),
      fees: sumRows(rows, (row) => row.totalFeesInFiats?.[currency]),
      performing: averageRows(rows, (row) => row.uniqueSourceAddresses),
      interacting: averageRows(rows, (row) => row.uniqueInteractedAddresses)
    }
  }, [currency, rows])

  const typeResultTotals = useMemo(() => {
    const totals = {}
    rows.forEach((row) => {
      Object.entries(row.transactionTypesResults || {}).forEach(([type, results]) => {
        if (!totals[type]) totals[type] = {}
        Object.entries(results || {}).forEach(([result, count]) => {
          totals[type][result] = (totals[type][result] || 0) + numberValue(count)
        })
      })
    })
    return totals
  }, [rows])

  const failedByType = useMemo(
    () =>
      Object.entries(typeResultTotals)
        .map(([type, results]) => {
          const codes = Object.entries(results || {})
            .filter(([code, count]) => code !== 'tesSUCCESS' && numberValue(count) > 0)
            .map(([code, count]) => [code, numberValue(count)])
            .sort((a, b) => b[1] - a[1])
          return { type, codes, total: sumRows(codes, (entry) => entry[1]) }
        })
        .filter((entry) => entry.total > 0)
        .sort((a, b) => b.total - a.total),
    [typeResultTotals]
  )

  const successByType = useMemo(() => {
    const successes = {}
    Object.entries(typeResultTotals).forEach(([type, results]) => {
      const count = numberValue(results?.tesSUCCESS)
      if (count > 0) successes[type] = count
    })

    if (summary.swaps > 0 && successes.Payment > 0) {
      const swaps = Math.min(summary.swaps, successes.Payment)
      successes.Payment -= swaps
      successes['Payment:swap'] = swaps
    }
    return successes
  }, [summary.swaps, typeResultTotals])

  const chartSeries = useMemo(() => {
    const expectedSpan = CHART_SPAN_MS[span] || CHART_SPAN_MS.day
    const points = (getter) => {
      const data = []
      rows.forEach((row, index) => {
        const x = chartTimestamp(row)
        const previousX = index > 0 ? chartTimestamp(rows[index - 1]) : null
        if (previousX && x - previousX > expectedSpan * 1.6) {
          data.push({ x: previousX + expectedSpan, y: null })
        }
        data.push({ x, y: getter(row) })
      })
      return data
    }
    const optionalNumber = (value) => (value === null || value === undefined || value === '' ? null : numberValue(value))
    return {
      transactions: [
        { name: t('detail.successful'), data: points((row) => numberValue(row.successTransactions)), color: '#15a66d' },
        {
          name: t('activity.failed'),
          data: points((row) => Math.max(numberValue(row.totalTransactions) - numberValue(row.successTransactions), 0)),
          color: '#d9534f'
        }
      ],
      addresses: [
        { name: t('metrics.performingAddresses'), data: points((row) => numberValue(row.uniqueSourceAddresses)), color: '#00a8b5' },
        { name: t('metrics.interactingAddresses'), data: points((row) => numberValue(row.uniqueInteractedAddresses)), color: '#8c6ff7' }
      ],
      volume: [
        { name: t('metrics.volume'), data: points((row) => optionalNumber(row.totalSentInFiats?.[currency])), color: '#20a464' }
      ],
      fees: [{ name: t('detail.fees'), data: points((row) => optionalNumber(row.totalFeesInFiats?.[currency])), color: '#eb9b34' }]
    }
  }, [currency, rows, span, t])

  const setChartPeriod = (nextPeriod) => {
    const normalized = periodFromQuery(nextPeriod)
    setPeriod(normalized)
    router.replace({ pathname: router.pathname, query: { id: sourceTag, period: normalized } }, undefined, { shallow: true })
  }

  const logo = identity.meta?.logo ? `/images/dapps/${identity.meta.logo}` : ''
  const website = absoluteUrl(identity.meta?.url)
  const socialLinks = DAPP_SOCIAL_LINKS.filter(({ key }) => identity.meta?.[key]).map(({ key, label, href, Icon }) => ({
    key,
    label,
    href: href(identity.meta[key]),
    Icon
  }))
  const intervalLabel = t(`detail.span.${span}`)
  const averageIntervalLabel = t(`detail.averageSpan.${span}`)
  const successColor = summary.successRate >= 98 ? styles.good : summary.successRate >= 90 ? styles.warn : styles.bad

  return (
    <main className={styles.page}>
      <SEO title={t('detail.seoTitle', { name: identity.name })} description={t('detail.seoDescription', { name: identity.name, explorerName })} />

      <div className={styles.topNav}>
        <Link className={styles.backLink} href="/dapps">
          <FaArrowLeft aria-hidden="true" /> {t('detail.backToDapps')}
        </Link>
        <DappSelect sourceTag={sourceTag} />
      </div>

      <section className={styles.hero}>
        <div className={styles.identity}>
          {logo ? <DappLogo src={logo} alt={identity.name} width={72} height={72} className={styles.logo} /> : null}
          <div>
            <span className={styles.eyebrow}>{t('detail.dappAnalytics')}</span>
            <h1>{identity.name}</h1>
            <span className={styles.sourceTag}>{t('detail.sourceTag')}: {sourceTag}</span>
          </div>
        </div>
        <div className={styles.heroActions}>
          {identity.meta?.wallets?.length || identity.meta?.walletconnect?.length ? (
            <div className={styles.walletRow}>
              <WalletsCell
                wallets={identity.meta.wallets || []}
                walletconnect={identity.meta.walletconnect || []}
                singleRow
                iconSize={32}
              />
            </div>
          ) : null}
          {website || socialLinks.length ? (
            <div className={styles.externalActions}>
              {website ? (
                <a className={styles.websiteLink} href={website} target="_blank" rel="nofollow noopener noreferrer">
                  {identity.meta.url} <FaExternalLinkAlt aria-hidden="true" />
                </a>
              ) : null}
              {socialLinks.length ? (
                <div className={styles.socialLinks}>
                  {socialLinks.map(({ key, label, href, Icon }) => (
                    <a key={key} href={href} target="_blank" rel="nofollow noopener noreferrer" aria-label={label} title={label}>
                      <Icon aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.toolbar}>
        <div>
          <strong>{t('detail.activityHistory')}</strong>
          <span>{t('detail.aggregatedBy', { interval: intervalLabel })}</span>
        </div>
        <ChartPeriodSwitch value={period} periods={DAPP_CHART_PERIODS} onChange={setChartPeriod} />
      </section>

      {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
      {loading && !rows.length ? <div className={styles.loading}><span className="waiting" /></div> : null}

      {rows.length ? (
        <>
          <section className={styles.metrics}>
            <div>
              <span>{t('detail.transactions')}</span>
              <strong suppressHydrationWarning>{shortNiceNumber(summary.transactions, 0)}</strong>
              <small className={styles.metricSecondary} suppressHydrationWarning>
                {t('activity.groups.swaps')}: {shortNiceNumber(summary.swaps, 0)}
              </small>
            </div>
            <div>
              <span>{t('detail.successRate')}</span>
              <strong className={successColor}>{summary.successRate.toFixed(1)}%</strong>
              <small className={styles.failedCount} suppressHydrationWarning>
                {t('activity.failed')}: {shortNiceNumber(summary.failed, 0)}
              </small>
            </div>
            <div>
              <MetricLabel label={t('metrics.performingAddresses')} tip={t('detail.avgPerforming', { interval: averageIntervalLabel })} />
              <strong suppressHydrationWarning>{shortNiceNumber(summary.performing, 1)}</strong>
            </div>
            <div>
              <MetricLabel label={t('metrics.interactingAddresses')} tip={t('detail.avgInteracting', { interval: averageIntervalLabel })} />
              <strong suppressHydrationWarning>{shortNiceNumber(summary.interacting, 1)}</strong>
            </div>
            <div>
              <span>{t('detail.volume')}</span>
              <strong suppressHydrationWarning>{shortNiceNumber(summary.volume, 2, 1, currency)}</strong>
              <small className={styles.metricSecondary} suppressHydrationWarning>
                {shortNiceNumber(summary.nativeVolume, 2, 1)} {nativeCurrency}
              </small>
            </div>
            <div>
              <span>{t('detail.fees')}</span>
              <strong suppressHydrationWarning>{shortNiceNumber(summary.fees, 2, 1, currency)}</strong>
              <small className={styles.metricSecondary} suppressHydrationWarning>
                {shortNiceNumber(summary.nativeFees, 6, 1)} {nativeCurrency}
              </small>
            </div>
          </section>

          <section className={styles.charts}>
            <DappHistoryChart title={t('detail.addressHistory')} rows={rows} series={chartSeries.addresses} showYear={period === 'all'} />
            <DappHistoryChart title={t('detail.transactionHistory')} rows={rows} series={chartSeries.transactions} type="bar" showYear={period === 'all'} />
            <DappHistoryChart title={t('detail.volumeHistory')} rows={rows} series={chartSeries.volume} currency={currency} showYear={period === 'all'} />
            <DappHistoryChart title={t('detail.feeHistory')} rows={rows} series={chartSeries.fees} currency={currency} showYear={period === 'all'} />
          </section>

          <section className={`${styles.typeCard} ${dappsPageClass}`}>
            <div className={styles.sectionHeader}>
              <div><h2>{t('detail.transactionMix')}</h2><span>{t('detail.periodTotal')}</span></div>
            </div>
            <TypeMixCell
              successByType={successByType}
              totalTransactions={summary.transactions}
              successTransactions={summary.success}
              transactionTypesResults={typeResultTotals}
              isOpen
              breakpoint={700}
              showStats={false}
              showToggle={false}
              showAllDetails
            />
          </section>

          {failedByType.length ? <section className={styles.errorCard}>
            <div className={styles.sectionHeader}>
              <div><h2>{t('activity.failedTransactions')}</h2><span>{t('detail.periodTotal')}</span></div>
              <div className={styles.errorSummary}>
                <strong suppressHydrationWarning>{shortNiceNumber(summary.failed, 0)} ({(100 - summary.successRate).toFixed(1)}%)</strong>
              </div>
            </div>
            <div className={styles.errorGrid}>
              {failedByType.map(({ type, codes, total }) => (
                <div className={styles.errorBlock} key={type}>
                  <div className={styles.errorBlockTitle}>
                    <strong>{type}</strong>
                    <span suppressHydrationWarning>
                      {shortNiceNumber(total, 0)} <small>({((total / summary.failed) * 100).toFixed(1)}%)</small>
                    </span>
                  </div>
                  {codes.map(([code, count]) => (
                    <div className={styles.errorRow} key={code}>
                      <code>{code.startsWith('tec') ? code.slice(3) : code}</code>
                      <strong suppressHydrationWarning>
                        {shortNiceNumber(count, 0)} <small>({((count / total) * 100).toFixed(1)}%)</small>
                      </strong>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section> : null}
        </>
      ) : !loading ? <div className={styles.empty}>{t('detail.noChartData')}</div> : null}

      {!loading ? <DappsDataNote /> : null}
    </main>
  )
}
