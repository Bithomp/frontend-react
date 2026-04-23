import { useTranslation } from 'next-i18next'
import { useState, useMemo } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import dynamic from 'next/dynamic'
import { IoChevronDownOutline, IoChevronForwardOutline } from 'react-icons/io5'
import Link from 'next/link'

import SEO from '../components/SEO'
import { nativeCurrency } from '../utils'
import { fullDateAndTime, shortNiceNumber, timeFromNow } from '../utils/format'
import { getIsSsrMobile } from '../utils/mobile'
import { axiosServer, passHeaders } from '../utils/axios'
import { useTheme } from '../components/Layout/ThemeContext'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export async function getServerSideProps(context) {
  const { locale, req } = context

  let data = null
  let errorMessage = null

  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/token/' + nativeCurrency + '/allocation',
      headers: passHeaders(req)
    })
    data = res?.data
  } catch (e) {
    errorMessage = e?.response?.data?.message || e.message
  }

  return {
    props: {
      initialData: data || null,
      errorMessage: errorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'allocation']))
    }
  }
}

// Color palette per category
const CATEGORY_COLORS = {
  escrowRipple: '#1a6e8c',
  ripple: '#0d4d82',
  escrowService: '#2196F3',
  escrowRest: '#64B5F6',
  rest: '#00B1C1',
  service: '#00828E',
  amm: '#9C27B0',
  notActive1: '#F59E0B',
  notActive2: '#D97706',
  notActive3: '#B45309',
  notActive5: '#991B1B',
  notActive10: '#6B1717',
  blackholed: '#90A4AE'
}

// Inactive category groupings
const INACTIVE_RECENT = ['notActive1', 'notActive2', 'notActive3']
const INACTIVE_OLD = ['notActive5', 'notActive10']
const INACTIVE_ALL = [...INACTIVE_RECENT, ...INACTIVE_OLD]

const categoryLabel = (category, t) => {
  const map = {
    escrowRipple: t('category.escrowRipple', { ns: 'allocation' }),
    ripple: t('category.ripple', { ns: 'allocation' }),
    escrowService: t('category.escrowService', { ns: 'allocation' }),
    escrowRest: t('category.escrowRest', { ns: 'allocation' }),
    rest: t('category.rest', { ns: 'allocation' }),
    service: t('category.service', { ns: 'allocation' }),
    amm: t('category.amm', { ns: 'allocation' }),
    notActive1: t('category.notActive1', { ns: 'allocation' }),
    notActive2: t('category.notActive2', { ns: 'allocation' }),
    notActive3: t('category.notActive3', { ns: 'allocation' }),
    notActive5: t('category.notActive5', { ns: 'allocation' }),
    notActive10: t('category.notActive10', { ns: 'allocation' }),
    blackholed: t('category.blackholed', { ns: 'allocation' })
  }
  return map[category] || category
}

// Convert drops to XRP billions for display
const dropsToXrp = (drops) => Number(drops) / 1_000_000
const xrpToBillions = (xrp) => xrp / 1_000_000_000

const formatBillions = (xrp) => {
  const b = xrpToBillions(xrp)
  if (b >= 1) return shortNiceNumber(b, 2, 1) + 'B'
  const m = xrp / 1_000_000
  return shortNiceNumber(m, 2, 1) + 'M'
}

export default function Allocation({ initialData, errorMessage }) {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const [data] = useState(initialData)
  const [expanded, setExpanded] = useState({})

  const toggleGroup = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  const isDark = theme === 'dark'
  const textColor = isDark ? '#ffffff' : '#333333'

  const distribution = (data?.distribution || []).filter((d) => Number(d.amount) > 0)
  const burned = data?.burned ? dropsToXrp(data.burned) : 0
  const totalCoins = data?.totalCoins ? dropsToXrp(data.totalCoins) : data?.maxCoins ? dropsToXrp(data.maxCoins) : 0
  const maxCoins = data?.maxCoins ? dropsToXrp(data.maxCoins) : totalCoins
  const updatedAt = data?.updatedAt

  // Circulating = total outstanding minus escrowed and blackholed (totalCoins already excludes burned)
  const ESCROW_CATS = ['escrowRipple', 'escrowService', 'escrowRest']
  const DEDUCT_CATS = [...ESCROW_CATS, 'blackholed']
  const distMap0 = Object.fromEntries((data?.distribution || []).map((d) => [d.category, d]))
  const deducted = DEDUCT_CATS.reduce((s, c) => s + (distMap0[c] ? dropsToXrp(Number(distMap0[c].amount)) : 0), 0)
  const circulatingSupply = totalCoins - deducted

  // Build donut chart data
  const { chartSeries, chartOptions } = useMemo(() => {
    const chartSeries = distribution.map((d) => parseFloat(d.percentage))
    const chartLabels = distribution.map((d) => categoryLabel(d.category, t))
    const chartColors = distribution.map((d) => CATEGORY_COLORS[d.category] || '#888888')

    const chartOptions = {
      chart: {
        type: 'donut',
        background: 'transparent',
        animations: {
          enabled: true,
          speed: 600,
          dynamicAnimation: { enabled: false }
        }
      },
      labels: chartLabels,
      colors: chartColors,
      dataLabels: {
        enabled: true,
        formatter: (val) => (val >= 2 ? val.toFixed(1) + '%' : ''),
        style: {
          fontSize: '12px',
          fontWeight: 600,
          colors: ['#fff']
        },
        dropShadow: { enabled: false }
      },
      legend: { show: false },
      stroke: { width: 2, colors: [isDark ? '#111' : '#fff'] },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              total: {
                show: true,
                showAlways: true,
                label: t('chart-center-label', { ns: 'allocation' }),
                fontSize: '13px',
                color: textColor,
                formatter: () => formatBillions(totalCoins) + ' ' + nativeCurrency
              },
              value: {
                show: true,
                fontSize: '16px',
                fontWeight: 600,
                color: textColor,
                formatter: (val) => val + '%'
              },
              name: {
                show: true,
                fontSize: '11px',
                color: isDark ? '#aaa' : '#666'
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val, opts) => {
            const item = distribution[opts.seriesIndex]
            const xrp = dropsToXrp(item.amount)
            return formatBillions(xrp) + ' ' + nativeCurrency + ' (' + val.toFixed(4) + '%)'
          }
        }
      },
      theme: { mode: isDark ? 'dark' : 'light' }
    }
    return { chartSeries, chartOptions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, data, totalCoins])

  // Build lookup and grouped table rows, sorted by descending amount
  const distMap = Object.fromEntries(distribution.map((d) => [d.category, d]))

  const buildGroup = (cats, key, label) => {
    const items = cats.filter((c) => distMap[c]).map((c) => distMap[c])
    const totalAmt = items.reduce((s, i) => s + Number(i.amount), 0)
    const totalPct = items.reduce((s, i) => s + parseFloat(i.percentage), 0)
    return { type: 'group', key, label, items, totalAmt, totalPct }
  }

  const recentGroup = buildGroup(INACTIVE_RECENT, 'inactive-short', t('group.inactive-short', { ns: 'allocation' }))
  const oldGroup = buildGroup(INACTIVE_OLD, 'inactive-long', t('group.inactive-long', { ns: 'allocation' }))

  // Flatten into sortable entries: each entry has an amount for sorting
  const sortableEntries = []

  distribution
    .filter((d) => !INACTIVE_ALL.includes(d.category) && d.category !== 'blackholed')
    .forEach((item) => sortableEntries.push({ type: 'item', item, sortAmt: Number(item.amount) }))

  if (recentGroup.items.length >= 2) {
    sortableEntries.push({ ...recentGroup, sortAmt: recentGroup.totalAmt })
  } else {
    recentGroup.items.forEach((item) => sortableEntries.push({ type: 'item', item, sortAmt: Number(item.amount) }))
  }

  if (oldGroup.items.length >= 2) {
    sortableEntries.push({ ...oldGroup, sortAmt: oldGroup.totalAmt })
  } else {
    oldGroup.items.forEach((item) => sortableEntries.push({ type: 'item', item, sortAmt: Number(item.amount) }))
  }

  // Sort descending by amount, then append blackholed fixed at bottom
  sortableEntries.sort((a, b) => b.sortAmt - a.sortAmt)
  if (distMap['blackholed']) sortableEntries.push({ type: 'item', item: distMap['blackholed'], sortAmt: 0 })

  // Expand sorted entries: groups get their subrows injected when open
  const tableRows = []
  sortableEntries.forEach((entry) => {
    if (entry.type === 'group') {
      tableRows.push(entry)
      if (expanded[entry.key]) {
        entry.items.forEach((item) => tableRows.push({ type: 'subitem', item }))
      }
    } else {
      tableRows.push(entry)
    }
  })

  return (
    <>
      <SEO title={t('title', { ns: 'allocation', currency: nativeCurrency })} />
      <div className="page-allocation content-profile">
        <h1 className="center">{t('title', { ns: 'allocation', currency: nativeCurrency })}</h1>
        <p className="center allocation-subtitle">
          {t('subtitle', { ns: 'allocation', currency: nativeCurrency, supply: formatBillions(totalCoins) })}
        </p>

        {errorMessage && <div className="center orange">{errorMessage}</div>}

        {data && (
          <>
            {/* Key stats */}
            <div className="flex-container flex-center allocation-stats">
              <div className="grey-box allocation-stat-box">
                <div className="allocation-stat-label">{t('max-supply', { ns: 'allocation' })}</div>
                <div className="allocation-stat-value">
                  {formatBillions(maxCoins)} {nativeCurrency}
                </div>
              </div>
              <div className="grey-box allocation-stat-box">
                <div className="allocation-stat-label">
                  {t('current-supply', { ns: 'allocation', defaultValue: 'Current Supply' })}
                </div>
                <div className="allocation-stat-value">
                  {formatBillions(totalCoins)} {nativeCurrency}
                </div>
              </div>
              <div className="grey-box allocation-stat-box">
                <div className="allocation-stat-label">{t('circulating', { ns: 'allocation' })}</div>
                <div className="allocation-stat-value">
                  {formatBillions(circulatingSupply)} {nativeCurrency}
                </div>
                <div className="allocation-stat-note">{t('circulating-note', { ns: 'allocation' })}</div>
              </div>
              <div className="grey-box allocation-stat-box">
                <div className="allocation-stat-label">{t('burned', { ns: 'allocation' })}</div>
                <div className="allocation-stat-value red">
                  {formatBillions(burned)} {nativeCurrency}
                </div>
              </div>
            </div>

            <p className="center allocation-distribution-link">
              <Link href="/distribution">{t('distribution-link', { ns: 'allocation', currency: nativeCurrency })}</Link>
            </p>

            {/* Chart + Table layout */}
            <div className="flex-container allocation-main">
              {/* Donut chart */}
              <div className="grey-box allocation-chart-box">
                <h3 className="center allocation-section-title">{t('chart-title', { ns: 'allocation' })}</h3>
                <Chart options={chartOptions} series={chartSeries} type="donut" height={400} />
              </div>

              {/* Legend + table */}
              <div className="grey-box allocation-table-box">
                <h3 className="allocation-section-title">{t('breakdown-title', { ns: 'allocation' })}</h3>
                <table className="allocation-table">
                  <thead>
                    <tr>
                      <th>{t('col-category', { ns: 'allocation' })}</th>
                      <th className="right">{t('col-amount', { ns: 'allocation' })}</th>
                      <th className="right">{t('col-percent', { ns: 'allocation' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => {
                      if (row.type === 'group') {
                        const isOpen = !!expanded[row.key]
                        return (
                          <tr key={row.key} className="allocation-group-header" onClick={() => toggleGroup(row.key)}>
                            <td>
                              <span className="allocation-group-chevron">
                                {isOpen ? <IoChevronDownOutline /> : <IoChevronForwardOutline />}
                              </span>
                              <span className="allocation-group-label">{row.label}</span>
                            </td>
                            <td className="right no-brake">
                              {formatBillions(dropsToXrp(row.totalAmt))} {nativeCurrency}
                            </td>
                            <td className="right no-brake allocation-pct">{row.totalPct.toFixed(2)}%</td>
                          </tr>
                        )
                      }
                      const { item } = row
                      const isSubitem = row.type === 'subitem'
                      return (
                        <tr key={item.category} className={isSubitem ? 'allocation-subrow' : ''}>
                          <td>
                            {isSubitem && <span className="allocation-sub-indent" />}
                            <span
                              className="allocation-color-dot"
                              style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#888' }}
                            />
                            {categoryLabel(item.category, t)}
                          </td>
                          <td className="right no-brake">
                            {formatBillions(dropsToXrp(item.amount))} {nativeCurrency}
                          </td>
                          <td className="right no-brake allocation-pct">{parseFloat(item.percentage).toFixed(2)}%</td>
                        </tr>
                      )
                    })}
                    {/* Burned row */}
                    <tr className="allocation-burned-row">
                      <td>
                        <span className="allocation-color-dot" style={{ backgroundColor: '#D23A1C' }} />
                        {t('burned', { ns: 'allocation' })}
                      </td>
                      <td className="right no-brake">
                        {formatBillions(burned)} {nativeCurrency}
                      </td>
                      <td className="right no-brake allocation-pct">
                        {((xrpToBillions(burned) / xrpToBillions(totalCoins)) * 100).toFixed(4)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {updatedAt && (
              <p className="center allocation-updated">
                {t('updated-at', { ns: 'allocation' })}: {timeFromNow(updatedAt, i18n)} ({fullDateAndTime(updatedAt)})
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
