import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'

import { useTheme } from "./Layout/ThemeContext"

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })
const zoomicon = "/images/zoom.svg"
const zoominicon = "/images/zoom-in.svg"
const zoomouticon = "/images/zoom-out.svg"
const panicon = "/images/panning.svg"

export default function PriceChart({ data }) {
  const { i18n } = useTranslation()
  const { theme } = useTheme()

  const supportedLanguages = ["en", "ru"]
  let chartLang = "en"
  if (supportedLanguages.includes(i18n.language)) {
    chartLang = i18n.language
  }

  const textColor = theme === 'light' ? '#000000' : '#ffffff'

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
    title: {
      //text: 'Chart',
      align: 'center'
    },
    chart: {
      id: "simple-chart",
      type: 'area',
      animations: {
        enabled: false
      },
      zoom: {
        autoScaleYaxis: true
      },
      defaultLocale: chartLang,
      locales: [
        {
          name: 'en',
          options: {
            shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            toolbar: {
              selectionZoom: 'Selection Zoom',
              zoomIn: 'Zoom In',
              zoomOut: 'Zoom Out',
              pan: 'Panning'
            }
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
        autoSelected: 'zoom',
        tools: {
          download: false,
          zoom: '<img src="' + zoomicon + '" width="20">',
          zoomin: '<img src="' + zoominicon + '" width="20">',
          zoomout: '<img src="' + zoomouticon + '" width="20">',
          pan: '<img src="' + panicon + '" width="20">',
          reset: false
        }
      },
      events: {
        beforeZoom: (e, { xaxis }) => {
          // dont zoom out any further
          let maindifference = new Date(data[data.length - 1][0]).valueOf() - new Date(data[0][0]).valueOf()
          let zoomdifference = new Date(xaxis.max).valueOf() - new Date(xaxis.min).valueOf()
          if (zoomdifference > maindifference) {
            return {
              xaxis: {
                min: data[0][0],
                max: data[data.length - 1][0]
              }
            };
          }
        }
      },
      foreColor: textColor
    },
    tooltip: {
      x: {
        formatter: val => {
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