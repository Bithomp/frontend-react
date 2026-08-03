import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

import { useTheme } from '../Layout/ThemeContext'
import { candleData } from './useTradeHistory'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })
const CANDLE_INTERVALS = { '5m': 5 * 60, '15m': 15 * 60, '1h': 60 * 60 }

export default function TradeChart({ baseAsset, quoteAsset, baseName, quoteName, history, labels, className, headerClassName, controlsClassName, periodClassName, activePeriodClassName }) {
  const { theme } = useTheme()
  const [interval, setInterval] = useState('5m')
  const [chartType, setChartType] = useState('candlestick')
  const { swaps, loading, error } = history
  const candles = useMemo(
    () => candleData(swaps, baseAsset, quoteAsset, CANDLE_INTERVALS[interval]),
    [swaps, baseAsset, quoteAsset, interval]
  )
  const isDark = theme === 'dark'
  const categoricalAxis = interval !== '5m' && candles.length > 0
  const chartCandles = categoricalAxis
    ? candles.map((candle) => ({
        ...candle,
        x: `${candle.x}|${new Date(candle.x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      }))
    : candles
  const chartData = chartType === 'line'
    ? chartCandles.map((candle) => ({ x: candle.x, y: candle.y[3] }))
    : chartCandles
  const options = {
    chart: { type: chartType, animations: { enabled: false }, toolbar: { show: false }, background: 'transparent' },
    colors: ['#20a6b5'],
    stroke: { width: chartType === 'line' ? 2 : 1, curve: 'straight' },
    theme: { mode: isDark ? 'dark' : 'light' },
    plotOptions: { candlestick: { colors: { upward: '#20a66a', downward: '#d75b5b' }, wick: { useFillColor: true } } },
    grid: { borderColor: isDark ? '#2b3535' : '#dce4e4', padding: { left: 4, right: 8 } },
    xaxis: {
      type: categoricalAxis ? 'category' : 'datetime',
      labels: {
        datetimeUTC: false,
        hideOverlappingLabels: true,
        formatter: categoricalAxis ? (value) => String(value).split('|')[1] : undefined
      },
      tooltip: { enabled: false }
    },
    yaxis: { decimalsInFloat: 6, tooltip: { enabled: true }, labels: { formatter: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 }) } },
    tooltip: {
      shared: false,
      x: { formatter: categoricalAxis ? (value) => String(value).split('|')[1] : undefined }
    },
    noData: { text: loading ? labels.loading : error ? labels.error : labels.empty }
  }

  return (
    <section className={className}>
      <div className={headerClassName}>
        <div>
          <h2>{labels.title}</h2>
          <span>{baseName} / {quoteName}</span>
        </div>
        <div className={controlsClassName}>
          <div className={periodClassName} role="group" aria-label={labels.chartTypeLabel}>
            <button type="button" className={chartType === 'candlestick' ? activePeriodClassName : ''} onClick={() => setChartType('candlestick')}>{labels.candles}</button>
            <button type="button" className={chartType === 'line' ? activePeriodClassName : ''} onClick={() => setChartType('line')}>{labels.line}</button>
          </div>
          <div className={periodClassName} role="group" aria-label={labels.intervalLabel}>
            {Object.keys(CANDLE_INTERVALS).map((value) => (
              <button type="button" key={value} className={interval === value ? activePeriodClassName : ''} onClick={() => setInterval(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Chart
        key={`${baseAsset?.issuer || ''}:${baseAsset?.currency}:${quoteAsset?.issuer || ''}:${quoteAsset?.currency}:${interval}:${chartType}`}
        type={chartType}
        series={[{ name: `${baseName}/${quoteName}`, data: chartData }]}
        options={options}
        height={300}
      />
    </section>
  )
}
