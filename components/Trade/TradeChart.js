import dynamic from 'next/dynamic'
import { useState } from 'react'

import { useTheme } from '../Layout/ThemeContext'
import useTradePriceHistory from './useTradePriceHistory'
import { CHART_PERIODS, DEFAULT_CHART_PERIOD } from '../../utils/chartPeriods'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })
const TRADE_CHART_PERIODS = CHART_PERIODS.filter((period) => period !== 'all')

export default function TradeChart({ baseAsset, quoteAsset, baseName, quoteName, labels, className, headerClassName, controlsClassName, periodClassName, activePeriodClassName }) {
  const { theme } = useTheme()
  const [period, setPeriod] = useState(DEFAULT_CHART_PERIOD)
  const [scale, setScale] = useState('linear')
  const { points, loading, error } = useTradePriceHistory(baseAsset, quoteAsset, period)
  const isDark = theme === 'dark'
  const options = {
    chart: { type: 'line', animations: { enabled: false }, toolbar: { show: false }, background: 'transparent' },
    colors: ['#20a6b5'],
    stroke: { width: 2, curve: 'straight' },
    theme: { mode: isDark ? 'dark' : 'light' },
    grid: { borderColor: isDark ? '#2b3535' : '#dce4e4', padding: { left: 4, right: 8 } },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, hideOverlappingLabels: true },
      tooltip: { enabled: false }
    },
    yaxis: { logarithmic: scale === 'log', decimalsInFloat: 6, tooltip: { enabled: true }, labels: { formatter: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 }) } },
    tooltip: { shared: false },
    noData: { text: loading ? labels.loading : error ? labels.error : labels.empty }
  }

  return (
    <section className={className}>
      <div className={headerClassName}>
        <div>
          <h2>{labels.title}</h2>
          <span>{baseName} / {quoteName} · {labels.scope}</span>
        </div>
        <div className={controlsClassName}>
          <div className={periodClassName} role="group" aria-label={labels.scaleLabel}>
            {['log', 'linear'].map((value) => (
              <button type="button" key={value} className={scale === value ? activePeriodClassName : ''} onClick={() => setScale(value)}>
                {labels[value]}
              </button>
            ))}
          </div>
          <div className={periodClassName} role="group" aria-label={labels.intervalLabel}>
            {TRADE_CHART_PERIODS.map((value) => (
              <button type="button" key={value} className={period === value ? activePeriodClassName : ''} onClick={() => setPeriod(value)}>
                {labels[value]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Chart
        key={`${baseAsset?.issuer || ''}:${baseAsset?.currency}:${quoteAsset?.issuer || ''}:${quoteAsset?.currency}:${period}:${scale}`}
        type="line"
        series={[{ name: `${baseName}/${quoteName}`, data: points }]}
        options={options}
        height={300}
      />
    </section>
  )
}
