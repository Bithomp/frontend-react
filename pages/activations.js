import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export const getServerSideProps = async ({ query, locale }) => {
  const { period } = query
  return {
    props: {
      periodQuery: period || "year",
      ...(await serverSideTranslations(locale, ['common', 'activations'])),
    },
  }
}

import SEO from '../components/SEO'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'
import SimpleChart from '../components/SimpleChart'

import { chartSpan } from '../utils'

export default function Activations({ periodQuery }) {
  const { t } = useTranslation(['common', 'activations'])

  const [period, setPeriod] = useState(periodQuery)
  const [loadingChart, setLoadingChart] = useState(false)
  const [chartData, setChartData] = useState([])

  const controller = new AbortController()

  const checkApi = async () => {
    setLoadingChart(true)
    setChartData([])

    const chartDataResponse = await axios.get(
      'v2/account-chart?span=' + chartSpan(period) + '&period=' + period,
    ).catch(error => {
      if (error && error.message !== "canceled") {
        console.error("error", error)
      }
      setLoadingChart(false)
    })
    setLoadingChart(false)

    if (chartDataResponse?.data?.chart?.length > 0) {
      const newChartData = chartDataResponse.data.chart.map((item) => {
        return [item.time, item.activations]
      })
      setChartData(newChartData)
    }
  }

  useEffect(() => {
    if (period) {
      checkApi()
    }
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  return <>
    <SEO
      title={
        t("header", { ns: "activations" }) + ' '
        + (period ? (" (" + (period === 'all' ? t("tabs.all-time") : t("tabs." + period)) + ")") : "")
      }
    />
    <div className="content-text">
      <h1 className="center">{t("header", { ns: "activations" })}</h1>
      <div className='tabs-inline'>
        <DateAndTimeRange
          period={period}
          setPeriod={setPeriod}
          defaultPeriod={periodQuery}
          tabs={true}
        />
      </div>

      <center>
        {loadingChart ?
          <>
            <br />
            <span className="waiting"></span>
            <br />{t("general.loading")}<br />
            <br />
          </>
          :
          <>
            {chartData.length > 0 &&
              <div style={{ maxWidth: "600px" }}>
                <SimpleChart data={chartData} />
              </div>
            }
          </>
        }
      </center>
    </div>
  </>
}
