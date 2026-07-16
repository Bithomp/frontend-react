export const apexChartTheme = (theme) => {
  const dark = theme === 'dark'

  return {
    textColor: dark ? '#f4f7fb' : '#2f3337',
    labelColor: dark ? '#d2dbe8' : '#5f6670',
    gridColor: dark ? 'rgba(196, 210, 232, 0.26)' : 'rgba(52, 59, 66, 0.18)',
    tooltipTheme: dark ? 'dark' : 'light'
  }
}

export const apexAxisLabelStyle = (theme, options = {}) => ({
  colors: apexChartTheme(theme).labelColor,
  fontSize: options.fontSize || '11px',
  fontWeight: options.fontWeight ?? 600
})

export const apexSafeChartId = (id) => String(id || 'chart').replace(/[^a-zA-Z0-9_-]/g, '-')

export const apexDonutSliceColor = (index, count) => {
  if (index === count - 1) return '#CBD5E1'
  const maxIndex = Math.max(count - 2, 1)
  const step = index / maxIndex
  const tonalStep = Math.pow(step, 0.58)
  const saturation = 98 - tonalStep * 18
  const lightness = 84 - tonalStep * 62
  return `hsl(214 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`
}

export const apexDonutSliceColors = (count) => Array.from({ length: count }, (_, index) => apexDonutSliceColor(index, count))

const execApexChart = (chartId, method, ...args) => {
  if (typeof window === 'undefined') return

  if (window.ApexCharts?.exec) {
    window.ApexCharts.exec(chartId, method, ...args)
    return
  }

  const chart = window.Apex?._chartInstances?.find((instance) => instance.id === chartId)?.chart
  chart?.[method]?.(...args)
}

export const syncApexDonutSelection = (chartId, previousIndex, nextIndex) => {
  if (!chartId || previousIndex === nextIndex) return

  if (previousIndex !== null && previousIndex !== undefined) {
    execApexChart(chartId, 'toggleDataPointSelection', previousIndex)
  }

  if (nextIndex !== null && nextIndex !== undefined) {
    execApexChart(chartId, 'toggleDataPointSelection', nextIndex)
  }
}
