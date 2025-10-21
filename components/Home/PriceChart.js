import axios from 'axios'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'

import { useTheme } from '../Layout/ThemeContext'
import { nativeCurrency } from '../../utils'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const zoomicon = '/images/chart/zoom.svg'
const zoominicon = '/images/chart/zoom-in.svg'
const zoomouticon = '/images/chart/zoom-out.svg'
const panicon = '/images/chart/panning.svg'

/* ----------------------- small helpers ----------------------- */

// Currency sign map
const CURRENCY_SYMBOL = new Map([
  ['ars', '$'],
  ['aud', '$'],
  ['bsd', '$'],
  ['bbd', '$'],
  ['bmd', '$'],
  ['bnd', '$'],
  ['cad', '$'],
  ['kyd', '$'],
  ['clp', '$'],
  ['cop', '$'],
  ['xcd', '$'],
  ['svc', '$'],
  ['fjd', '$'],
  ['gyd', '$'],
  ['hkd', '$'],
  ['lrd', '$'],
  ['mxn', '$'],
  ['nad', '$'],
  ['nzd', '$'],
  ['sgd', '$'],
  ['sbd', '$'],
  ['srd', '$'],
  ['tvd', '$'],
  ['usd', '$'],
  ['cny', '¥'],
  ['jpy', '¥'],
  ['egp', '£'],
  ['fkp', '£'],
  ['gip', '£'],
  ['ggp', '£'],
  ['imp', '£'],
  ['jep', '£'],
  ['lbp', '£'],
  ['shp', '£'],
  ['syp', '£'],
  ['gbp', '£'],
  ['eur', '€']
])

const ms = {
  day: 86400000,
  hour: 3600000,
  week: 7 * 86400000,
  month: 30 * 86400000, // fine for visualization (API provides actual points)
  halfYear: 182 * 86400000, // ~6 months
  year: 365 * 86400000
}

const getBucketMs = (period) => {
  switch (period) {
    case 'one_day':
      return 15 * 60 * 1000 // 15 min
    case 'one_week':
      return 30 * 60 * 1000 // 30 min
    default:
      return 60 * 60 * 1000 // 1 hour
  }
}

const clampDigits = (v1, v2) => {
  if (v1 == null || v2 == null) return 2
  if (v1 > 100 && v2 > 100) return 0
  if (v1 > 1 && v2 > 1) return 2
  return 4
}

/* ----------------------- hooks ----------------------- */

/**
 * useThrottle: returns a throttled version of a value.
 * It updates at most once per `delayMs`.
 */
function useThrottle(value, delayMs = 500) {
  const [throttled, setThrottled] = useState(value)
  const lastAtRef = useRef(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const now = Date.now()
    const remaining = delayMs - (now - lastAtRef.current)

    if (remaining <= 0) {
      // Update immediately and reset timer window
      lastAtRef.current = now
      setThrottled(value)
    } else {
      // Schedule trailing update if more changes keep coming
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        lastAtRef.current = Date.now()
        setThrottled(value)
      }, remaining)
    }

    return () => clearTimeout(timeoutRef.current)
  }, [value, delayMs])

  return throttled
}

/**
 * useBucketedSeries:
 * - Owns and returns the series data.
 * - Accepts initial server data via `setInitialData`.
 * - Appends/replaces points in a time-bucketed manner when `liveFiatRate` changes.
 * Rules:
 *   - On mount/first live tick: append live point immediately.
 *   - While still in the same bucket: keep only one live point (update it).
 *   - When entering a new bucket:
 *       * Replace last in-bucket live point with the bucket boundary point.
 *       * Insert any missing boundaries (if tab slept).
 *       * Append current live point (unless we're exactly on the boundary).
 */
function useBucketedSeries(liveFiatRate, chartPeriod) {
  const [seriesData, setSeriesData] = useState([])

  const setInitialData = useCallback((points) => {
    // Replace entire dataset from the server
    setSeriesData(Array.isArray(points) ? points : [])
  }, [])

  useEffect(() => {
    if (!liveFiatRate) return
    const bucketMs = getBucketMs(chartPeriod)

    setSeriesData((prev) => {
      const nowTs = Date.now()

      // Start with a live point when empty
      if (!prev.length) return [[nowTs, liveFiatRate]]

      const last = prev[prev.length - 1]
      const lastTs = Array.isArray(last) ? last[0] : null
      if (lastTs == null) return [[nowTs, liveFiatRate]]

      const lastBucketStart = Math.floor(lastTs / bucketMs) * bucketMs
      const currentBucketStart = Math.floor(nowTs / bucketMs) * bucketMs

      // Same bucket: if last is boundary — add live; else update live
      if (currentBucketStart === lastBucketStart) {
        if (lastTs === lastBucketStart) {
          return [...prev, [nowTs, liveFiatRate]]
        }
        const updated = prev.slice(0, -1)
        updated.push([nowTs, liveFiatRate])
        return updated
      }

      // New bucket: replace last live with first boundary, fill missing boundaries, then add live
      const filled = [...prev]
      let boundary = lastBucketStart + bucketMs

      if (lastTs > lastBucketStart) {
        filled[filled.length - 1] = [boundary, Array.isArray(last) ? last[1] : liveFiatRate]
        boundary += bucketMs
      }
      while (boundary <= currentBucketStart) {
        const prevVal = filled[filled.length - 1][1]
        filled.push([boundary, prevVal])
        boundary += bucketMs
      }
      if (nowTs > currentBucketStart) {
        filled.push([nowTs, liveFiatRate])
      }

      // Optional trimming to avoid unbounded growth
      const MAX_POINTS = 5000
      if (filled.length > MAX_POINTS) filled.splice(0, filled.length - MAX_POINTS)

      return filled
    })
  }, [liveFiatRate, chartPeriod])

  return { seriesData, setInitialData }
}

/* ----------------------- component ----------------------- */

export default function PriceChart({ currency, chartPeriod, setChartPeriod, hideToolbar, liveFiatRate }) {
  const showToolbar = !hideToolbar
  const { i18n } = useTranslation()
  const { theme } = useTheme()

  const [rendered, setRendered] = useState(false)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    setRendered(true)
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Supported chart locales
  const chartLang = useMemo(() => {
    const supported = ['en', 'ru']
    return supported.includes(i18n.language) ? i18n.language : 'en'
  }, [i18n.language])

  const detailedDayAndWeekChartAvailable = useMemo(() => currency === 'eur' || currency === 'usd', [currency])

  const textColor = theme === 'light' ? '#000000' : '#ffffff'

  // Throttle liveFiatRate updates so we don’t re-render too frequently
  const throttledLiveRate = useThrottle(liveFiatRate, 500)

  // Live series hook
  const { seriesData, setInitialData } = useBucketedSeries(throttledLiveRate, chartPeriod)

  // “detailed” tooltip formatter for 1D/1W when available
  const detailedFormatter = useCallback((val) => {
    return new Date(val).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }, [])

  // x-axis min/max depending on selected range
  const range = useMemo(() => {
    const now = Date.now()
    const yStart = new Date(`1 Jan ${new Date(now).getFullYear()}`).getTime()
    switch (chartPeriod) {
      case 'one_day':
        return { min: now - ms.day, max: now, detailed: true }
      case 'one_week':
        return { min: now - ms.week, max: now, detailed: detailedDayAndWeekChartAvailable }
      case 'one_month':
        return { min: now - ms.month, max: now }
      case 'six_months':
        return { min: now - ms.halfYear, max: now }
      case 'one_year':
        return { min: now - ms.year, max: now }
      case 'ytd':
        return { min: yStart, max: now }
      case 'all':
        return { min: undefined, max: undefined }
      default:
        return { min: undefined, max: undefined }
    }
  }, [chartPeriod, detailedDayAndWeekChartAvailable])

  // Base, mostly static options (locale, toolbar, style)
  const baseOptions = useMemo(
    () => ({
      xaxis: {
        type: 'datetime',
        labels: { datetimeUTC: false, datetimeFormatter: { day: 'd MMM' } }
      },
      chart: {
        id: 'currency-chart',
        defaultLocale: chartLang,
        locales: [
          {
            name: 'en',
            options: {
              shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              toolbar: { selectionZoom: 'Selection Zoom', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', pan: 'Panning' }
            }
          },
          {
            name: 'ru',
            options: {
              shortMonths: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
              toolbar: {
                selectionZoom: 'Увеличение выбора',
                zoomIn: 'Приблизить',
                zoomOut: 'Уменьшить',
                pan: 'Панорамирование'
              }
            }
          }
        ],
        toolbar: {
          show: showToolbar,
          tools: {
            download: false,
            zoom: `<img src="${zoomicon}" width="20" alt="zoom">`,
            zoomin: `<img src="${zoominicon}" width="20" alt="zoom in">`,
            zoomout: `<img src="${zoomouticon}" width="20" alt="zoom out">`,
            pan: `<img src="${panicon}" width="20" alt="pan">`,
            reset: false
          }
        },
        type: 'area',
        animations: { enabled: false },
        zoom: { autoScaleYaxis: true },
        foreColor: textColor
      },
      tooltip: {
        x: {
          formatter: (val) =>
            new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        },
        y: { formatter: (val) => String(val) },
        theme
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      title: showToolbar ? { text: `${nativeCurrency}/${currency.toUpperCase()}`, align: 'center' } : {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [chartLang, showToolbar, theme, textColor, currency]
  )

  const [options, setOptions] = useState(baseOptions)
  useEffect(() => setOptions(baseOptions), [baseOptions])

  // Fetch historical series when currency/period changes
  useEffect(() => {
    let ignore = false
    const ctrl = new AbortController()

    // Day charts are available only for EUR/USD
    if (!detailedDayAndWeekChartAvailable && chartPeriod === 'one_day') {
      setChartPeriod('one_week')
      return
    }

    const buildParams = () => {
      const now = Date.now()
      const to = '..'
      switch (chartPeriod) {
        case 'all':
          return '?date=20130804' + to
        case 'one_day':
          return '?date=' + (now - ms.day - ms.hour) + to
        case 'one_week':
          return '?date=' + (now - ms.week - ms.day) + to
        case 'one_month':
          return '?date=' + (now - ms.month - ms.day) + to
        case 'six_months':
          return '?date=' + (now - ms.halfYear - ms.day) + to
        case 'one_year':
          return '?date=' + (now - ms.year - ms.day) + to
        case 'ytd': {
          const start = new Date(`1 Jan ${new Date().getFullYear()}`).getTime()
          return '?date=' + start + to
        }
        default:
          return ''
      }
    }

    const fetchData = async () => {
      try {
        const url = 'v2/rates/history/' + currency.toLowerCase() + buildParams()
        const response = await axios.get(url, { signal: ctrl.signal })
        if (ignore || !mountedRef.current) return

        const chartData = Array.isArray(response?.data?.data) ? response.data.data : []
        setInitialData(chartData)

        if (!chartData.length) return

        const rawMin = chartData[0][0]
        const rawMax = chartData[chartData.length - 1][0]
        const d1 = chartData[0][1]
        const d2 = chartData[chartData.length - 1][1]
        const digitsAfterDot = clampDigits(d1, d2)
        const cur = currency.toLowerCase()
        const sign = CURRENCY_SYMBOL.get(cur) ?? ''

        setOptions((prev) => ({
          ...prev,
          chart: {
            ...prev.chart,
            // Prevent zooming out beyond the data domain
            events: {
              ...prev.chart?.events,
              beforeZoom: (e, { xaxis }) => {
                const zoomDiff = xaxis.max - xaxis.min
                const mainDiff = rawMax - rawMin
                if (zoomDiff > mainDiff) {
                  return { xaxis: { min: rawMin, max: rawMax } }
                }
              }
            }
          },
          xaxis: { ...prev.xaxis, min: range.min, max: range.max },
          yaxis: {
            ...prev.yaxis,
            tickAmount: 5,
            logarithmic: false,
            labels: {
              ...(prev.yaxis?.labels ?? {}),
              formatter: (val) => sign + Number(val).toFixed(digitsAfterDot)
            }
          },
          tooltip: {
            ...prev.tooltip,
            x: {
              formatter: range.detailed
                ? (val) => detailedFormatter(val)
                : (val) =>
                    new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            },
            y: { formatter: (val) => Number(val).toFixed(digitsAfterDot) + ' ' + currency.toUpperCase() },
            theme
          },
          title: showToolbar ? { text: `${nativeCurrency}/${currency.toUpperCase()}`, align: 'center' } : {}
        }))
      } catch (e) {
        if (!axios.isCancel(e)) setInitialData([])
      }
    }

    fetchData()
    return () => {
      ignore = true
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currency,
    chartPeriod,
    detailedDayAndWeekChartAvailable,
    range.min,
    range.max,
    theme,
    showToolbar,
    detailedFormatter,
    setChartPeriod,
    setInitialData
  ])

  // Keep x-axis max pinned to now (throttled)
  const xMaxTickRef = useRef(0)
  useEffect(() => {
    const now = Date.now()
    if (now - xMaxTickRef.current < 500) return
    xMaxTickRef.current = now
    setOptions((prev) => ({ ...prev, xaxis: { ...prev.xaxis, max: now } }))
  }, [throttledLiveRate])

  // Highlight the latest live point: annotation + optional discrete marker
  useEffect(() => {
    if (!seriesData.length) return
    const last = seriesData[seriesData.length - 1]
    const lastTs = last[0]
    const lastVal = last[1]

    setOptions((prev) => ({
      ...prev,
      annotations: {
        points: [
          {
            x: lastTs,
            y: lastVal,
            marker: {
              size: 4,
              strokeWidth: 2
            },
            label: {
              text: 'Now',
              borderWidth: 0,
              style: { fontSize: '10px', background: 'transparent', color: prev.chart?.foreColor || '#888' }
            }
          }
        ]
      },
      // Optional: discrete marker on the last point (works with line/area)
      markers: {
        ...(prev.markers || {}),
        size: 0,
        discrete: [
          {
            seriesIndex: 0,
            dataPointIndex: Math.max(0, seriesData.length - 1),
            size: 5
          }
        ]
      }
    }))
  }, [seriesData])

  const series = useMemo(() => [{ name: '', data: seriesData }], [seriesData])

  if (!rendered) return null

  return (
    <>
      <div className="chart-toolbar">
        {detailedDayAndWeekChartAvailable && (
          <button onClick={() => setChartPeriod('one_day')} className={chartPeriod === 'one_day' ? 'active' : ''}>
            1D
          </button>
        )}
        <button onClick={() => setChartPeriod('one_week')} className={chartPeriod === 'one_week' ? 'active' : ''}>
          1W
        </button>
        <button onClick={() => setChartPeriod('one_month')} className={chartPeriod === 'one_month' ? 'active' : ''}>
          1M
        </button>
        <button onClick={() => setChartPeriod('six_months')} className={chartPeriod === 'six_months' ? 'active' : ''}>
          6M
        </button>
        <button onClick={() => setChartPeriod('one_year')} className={chartPeriod === 'one_year' ? 'active' : ''}>
          1Y
        </button>
        <button onClick={() => setChartPeriod('ytd')} className={chartPeriod === 'ytd' ? 'active' : ''}>
          YTD
        </button>
        <button onClick={() => setChartPeriod('all')} className={chartPeriod === 'all' ? 'active' : ''}>
          ALL
        </button>
      </div>
      <Chart type="line" series={series} options={options} />
    </>
  )
}
