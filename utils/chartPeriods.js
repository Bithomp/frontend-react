export const CHART_PERIODS = ['week', 'month', 'year', 'all']
export const DEFAULT_CHART_PERIOD = 'month'
export const TOKEN_CHART_PERIODS = ['month', 'week']

export const normalizeChartPeriod = (period) => {
  const value = Array.isArray(period) ? period[0] : period
  return CHART_PERIODS.includes(value) ? value : DEFAULT_CHART_PERIOD
}

export const chartPeriodQuery = (period) => `period=${encodeURIComponent(normalizeChartPeriod(period))}`
