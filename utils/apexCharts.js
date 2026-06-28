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
