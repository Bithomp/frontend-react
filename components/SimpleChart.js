import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'

import { useTheme } from "./Layout/ThemeContext"
import { shortNiceNumber } from '../utils/format'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const oneHour = 1000 * 60 * 60
const oneDay = oneHour * 24
const oneMonth = oneDay * 30

const locales = {
  months: {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  }
}

export default function PriceChart({ data }) {
  const { i18n } = useTranslation()
  const { theme } = useTheme()

  const supportedLanguages = ["en", "ru"]
  let chartLang = "en"
  if (supportedLanguages.includes(i18n.language)) {
    chartLang = i18n.language
  }

  const textColor = theme === 'light' ? '#000000' : '#ffffff'

  const timeDifference = new Date(data[data.length - 1][0]).valueOf() - new Date(data[0][0]).valueOf()

  const options = {
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: true,
        datetimeFormatter: {
          day: 'd MMM'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => {
          return shortNiceNumber(val, 0, 0)
        }
      },
      tickAmount: 5,
    },
    chart: {
      id: "simple-chart",
      type: 'area',
      animations: {
        enabled: false
      },
      defaultLocale: chartLang,
      locales: [
        {
          name: 'en',
          options: {
            shortMonths: locales.months.en,
          }
        },
        {
          name: 'ru',
          options: {
            shortMonths: locales.months.ru,
          }
        }
      ],
      toolbar: {
        tools: {
          download: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      foreColor: textColor
    },
    tooltip: {
      x: {
        formatter: val => {
          if (timeDifference <= oneHour) {
            return new Date(val).toLocaleDateString(undefined, {
              hour: 'numeric',
              minute: 'numeric'
            })
          }
          if (timeDifference <= 60 * oneHour) {
            const start = new Date(val).setMinutes(0)
            const end = new Date(val).setMilliseconds(new Date(val).getMilliseconds() + 1)
            return new Date(start).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit'
            }) + ' - ' + new Date(end).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit'
            })
          }
          if (timeDifference <= 60 * oneDay) {
            const start = new Date(val).setUTCHours(0, 0, 0, 0)
            const end = new Date(val).setMilliseconds(new Date(val).getMilliseconds() + 1)
            return new Date(start).getUTCDate() + " " + locales.months[chartLang][new Date(start).getUTCMonth()] + " - " +
              new Date(end).getUTCDate() + " " + locales.months[chartLang][new Date(end).getUTCMonth()]

          }
          if (timeDifference <= 12 * oneMonth) {
            return locales.months[chartLang][new Date(val).getUTCMonth()] + " " + new Date(val).getUTCFullYear()
          }
          return new Date(val).getUTCFullYear()
        }
      },
      y: {
        formatter: (val) => shortNiceNumber(val, 0, 0)
      },
      theme,
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    //colors: ['#006B7D'],
  }

  const series = [{
    name: '',
    data
  }]

  return <>
    <Chart type="line" series={series} options={options} />
  </>
}