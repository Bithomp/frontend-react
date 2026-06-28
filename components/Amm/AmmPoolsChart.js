import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next'

import { useTheme } from '../Layout/ThemeContext'
import { normalizeLocale } from '../../utils'
import { apexAxisLabelStyle, apexChartTheme } from '../../utils/apexCharts'
import { niceNumber, shortNiceNumber } from '../../utils/format'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const chartTime = (value) => {
  const time = Number(value)
  if (!Number.isFinite(time)) return null
  return time < 1000000000000 ? time * 1000 : time
}

const metricDelta = (latest, first, field) => {
  const latestValue = toNumber(latest?.[field])
  const firstValue = toNumber(first?.[field])
  if (latestValue === null || firstValue === null) return null
  return latestValue - firstValue
}

const formatSigned = (value) => {
  if (value === null) return ''
  const sign = value > 0 ? '+' : ''
  return sign + shortNiceNumber(value, 0)
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const tooltipRow = ({ color, label, value }) =>
  `<div class="apexcharts-tooltip-series-group apexcharts-active" style="display:flex;align-items:center;gap:10px;padding:7px 12px;line-height:1.25;">
    <span class="apexcharts-tooltip-marker" style="display:block;flex:0 0 18px;width:18px;height:18px;margin:0;border-radius:999px;background-color:${color};"></span>
    <div class="apexcharts-tooltip-text" style="display:flex;flex:1 1 auto;min-width:0;font-family:Helvetica, Arial, sans-serif;font-size:12px;">
      <div class="apexcharts-tooltip-y-group" style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;width:100%;">
        <span class="apexcharts-tooltip-text-y-label" style="font-size:12px;white-space:normal;">${escapeHtml(label)}:</span>
        <span class="apexcharts-tooltip-text-y-value" style="font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;">${escapeHtml(niceNumber(value, 0, 0))}</span>
      </div>
    </div>
  </div>`

export default function AmmPoolsChart({ rows }) {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const dateLocale = normalizeLocale(i18n.language)
  const chartRows = useMemo(
    () =>
      Array.isArray(rows)
        ? rows
            .map((row) => ({ ...row, timestamp: chartTime(row.time) }))
            .filter((row) => row.timestamp)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-30)
        : [],
    [rows]
  )

  const chartTheme = useMemo(() => apexChartTheme(theme), [theme])

  const series = useMemo(
    () => [
      {
        name: 'Active pools',
        type: 'line',
        data: chartRows.map((row) => [row.timestamp, toNumber(row.activePools)])
      },
      {
        name: 'Created pools',
        type: 'column',
        data: chartRows.map((row) => [row.timestamp, toNumber(row.createdPools)])
      }
    ],
    [chartRows]
  )

  const options = useMemo(
    () => ({
      chart: {
        id: 'amm-pools-chart',
        animations: { enabled: false },
        parentHeightOffset: 0,
        toolbar: { show: false },
        foreColor: chartTheme.textColor,
        stacked: false
      },
      colors: ['#2f80ed', '#00a676', '#f2994a'],
      dataLabels: { enabled: false },
      grid: {
        borderColor: chartTheme.gridColor,
        padding: { top: -8, right: 6, bottom: 4, left: 0 },
        strokeDashArray: 4
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '12px',
        offsetY: -4,
        labels: { colors: chartTheme.labelColor },
        markers: { radius: 12 }
      },
      plotOptions: {
        bar: {
          borderRadius: 3,
          columnWidth: '48%'
        }
      },
      stroke: {
        curve: 'smooth',
        width: [3, 0]
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme,
        custom: ({ series: tooltipSeries, dataPointIndex, w }) => {
          const timestamp = w?.globals?.seriesX?.[0]?.[dataPointIndex]
          const date = timestamp
            ? new Date(timestamp).toLocaleDateString(dateLocale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            : ''
          const rows = series
            .map((item, index) => ({
              color: w?.globals?.colors?.[index] || item.color || '#2f80ed',
              label: item.name,
              value: tooltipSeries?.[index]?.[dataPointIndex]
            }))
            .filter((item) => item.value !== null && item.value !== undefined)

          return `<div style="min-width:214px;max-width:330px;color:var(--text-main);">
            <div class="apexcharts-tooltip-title" style="font-family:Helvetica, Arial, sans-serif;font-size:12px;">${escapeHtml(date)}</div>
            ${rows.map(tooltipRow).join('')}
          </div>`
        },
        x: {
          formatter: (value) =>
            new Date(value).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
        },
        y: {
          formatter: (value) => niceNumber(value, 0, 0)
        }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: true,
          style: apexAxisLabelStyle(theme, { fontSize: '11px' }),
          datetimeFormatter: {
            day: 'd MMM'
          }
        },
        axisBorder: { color: chartTheme.gridColor },
        axisTicks: { color: chartTheme.gridColor }
      },
      yaxis: [
        {
          seriesName: 'Active pools',
          labels: {
            style: apexAxisLabelStyle(theme, { fontSize: '11px' }),
            formatter: (value) => shortNiceNumber(value, 0)
          },
          tickAmount: 3
        },
        {
          seriesName: 'Created pools',
          opposite: true,
          labels: {
            style: apexAxisLabelStyle(theme, { fontSize: '11px' }),
            formatter: (value) => shortNiceNumber(value, 0)
          },
          tickAmount: 3
        }
      ]
    }),
    [chartTheme, dateLocale, series, theme]
  )

  if (!chartRows.length) return null

  const first = chartRows[0]
  const latest = chartRows[chartRows.length - 1]
  const previous = chartRows[chartRows.length - 2]
  const totalCreated = chartRows.reduce((sum, row) => sum + (toNumber(row.createdPools) || 0), 0)
  const activeDelta = metricDelta(latest, previous, 'activePools')
  const totalDelta = metricDelta(latest, first, 'totalPools')

  return (
    <section className="chartPanel">
      <div className="metricGrid">
        <div className="metric">
          <span>Total pools</span>
          <strong>{shortNiceNumber(latest.totalPools, 0)}</strong>
          <small>{formatSigned(totalDelta)} last 30 days</small>
        </div>
        <div className="metric">
          <span>Active pools</span>
          <strong>{shortNiceNumber(latest.activePools, 0)}</strong>
          <small>{formatSigned(activeDelta)} since yesterday</small>
        </div>
        <div className="metric">
          <span>New pools</span>
          <strong>{shortNiceNumber(totalCreated, 0)}</strong>
          <small>Last 30 days</small>
        </div>
      </div>

      <div className="chartWrap">
        <Chart type="line" series={series} options={options} height={165} />
      </div>
    </section>
  )
}
