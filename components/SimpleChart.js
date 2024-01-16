import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'

import { useTheme } from "./Layout/ThemeContext"

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

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
        datetimeUTC: false,
        datetimeFormatter: {
          day: 'd MMM'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => {
          return Number(val).toFixed(0)
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
            shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          }
        },
        {
          name: 'ru',
          options: {
            shortMonths: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
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
          if (timeDifference < 1000 * 60 * 60 * 24 * 5) {
            return new Date(val).toLocaleDateString(undefined, {
              hour: 'numeric',
              minute: 'numeric'
            })
          }
          return new Date(val).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
      },
      y: {
        formatter: (val) => Number(val).toFixed(0)
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