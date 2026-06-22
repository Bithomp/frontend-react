import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next'

import { useTheme } from '../Layout/ThemeContext'
import { normalizeLocale } from '../../utils'
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

  const textColor = theme === 'light' ? '#1c2430' : '#f7f8fb'
  const gridColor = theme === 'light' ? '#d8dee6' : '#2c3442'

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
        foreColor: textColor,
        stacked: false
      },
      colors: ['#2f80ed', '#00a676', '#f2994a'],
      dataLabels: { enabled: false },
      grid: {
        borderColor: gridColor,
        padding: { top: -8, right: 6, bottom: 4, left: 0 },
        strokeDashArray: 4
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '12px',
        offsetY: -4,
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
          style: { fontSize: '11px' },
          datetimeFormatter: {
            day: 'd MMM'
          }
        }
      },
      yaxis: [
        {
          seriesName: 'Active pools',
          labels: {
            style: { fontSize: '11px' },
            formatter: (value) => shortNiceNumber(value, 0)
          },
          tickAmount: 3
        },
        {
          seriesName: 'Created pools',
          opposite: true,
          labels: {
            style: { fontSize: '11px' },
            formatter: (value) => shortNiceNumber(value, 0)
          },
          tickAmount: 3
        }
      ]
    }),
    [dateLocale, gridColor, textColor, theme]
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
