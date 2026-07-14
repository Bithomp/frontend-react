const escapeChartTooltipHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const chartTooltipRow = ({ color, label, value, markerSize, valueFormatter }) =>
  `<div class="apexcharts-tooltip-series-group apexcharts-active" style="display:flex;align-items:center;gap:8px;padding:6px 10px;line-height:1.25;">
    <span class="apexcharts-tooltip-marker" style="display:block;flex:0 0 ${markerSize}px;width:${markerSize}px;height:${markerSize}px;margin:0;border-radius:999px;background-color:${color};"></span>
    <div class="apexcharts-tooltip-text" style="display:flex;flex:1 1 auto;min-width:0;font-family:Helvetica, Arial, sans-serif;font-size:12px;">
      <div class="apexcharts-tooltip-y-group" style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;width:100%;">
        <span class="apexcharts-tooltip-text-y-label" style="font-size:12px;white-space:normal;">${escapeChartTooltipHtml(label)}:</span>
        <span class="apexcharts-tooltip-text-y-value" style="font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;">${escapeChartTooltipHtml(valueFormatter(value))}</span>
      </div>
    </div>
  </div>`

export const ammChartTooltip = ({
  date,
  rows,
  minWidth = 190,
  maxWidth = 320,
  markerSize = 9,
  valueFormatter
}) => {
  const formatValue = typeof valueFormatter === 'function' ? valueFormatter : (value) => value

  return `<div style="min-width:${minWidth}px;max-width:${maxWidth}px;color:var(--text-main);">
    <div class="apexcharts-tooltip-title" style="font-family:Helvetica, Arial, sans-serif;font-size:12px;">${escapeChartTooltipHtml(date)}</div>
    ${rows.map((row) => chartTooltipRow({ ...row, markerSize, valueFormatter: formatValue })).join('')}
  </div>`
}
