import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { period } = query
  return {
    props: {
      periodQuery: period || 'year',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'activations']))
    }
  }
}

import SEO from '../components/SEO'
import DateAndTimeRange from '../components/UI/DateAndTimeRange'
import SimpleChart from '../components/SimpleChart'

import { chartSpan, nativeCurrency } from '../utils'
import { niceNumber } from '../utils/format'

export default function Activations({ periodQuery }) {
  const { t } = useTranslation(['common', 'activations'])

  const [period, setPeriod] = useState(periodQuery)
  const [loadingChart, setLoadingChart] = useState(false)
  const [chartData, setChartData] = useState([])
  const [total, setTotal] = useState(0)

  const controller = new AbortController()

  const checkApi = async () => {
    setLoadingChart(true)
    setChartData([])

    const chartDataResponse = await axios
      .get('v2/account-chart?span=' + chartSpan(period) + '&period=' + period)
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          console.error('error', error)
        }
        setLoadingChart(false)
      })
    setLoadingChart(false)

    if (chartDataResponse?.data?.chart?.length > 0) {
      const newChartData = chartDataResponse.data.chart.map((item) => {
        return [item.time, item.activations]
      })
      const totalAccounts = chartDataResponse.data.chart.reduce(function (a, b) {
        return a + b.activations
      }, 0)
      setTotal(niceNumber(totalAccounts))
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

  return (
    <>
      <SEO
        title={
          t('header', { ns: 'activations' }) +
          ' ' +
          (period
            ? ' (' +
              (period === 'all' ? t('tabs.all-time') : period?.includes('..') ? period : t('tabs.' + period)) +
              ')'
            : '')
        }
        description={nativeCurrency + ' ' + t('header', { ns: 'activations' })}
      />
      <div className="content-text">
        <h1 className="center">{t('header', { ns: 'activations' })}</h1>
        <div className="tabs-inline">
          <DateAndTimeRange period={period} setPeriod={setPeriod} defaultPeriod={periodQuery} tabs={true} />
        </div>

        <center>
          {loadingChart ? (
            <>
              <br />
              <span className="waiting"></span>
              <br />
              {t('general.loading')}
              <br />
              <br />
            </>
          ) : (
            <>
              <Trans i18nKey="account-activations-for-that-period" ns="activations" count={total}>
                For that period <b>{{ count: total }}</b> accounts were activated.
              </Trans>
              {chartData.length > 0 && (
                <div style={{ maxWidth: '600px' }}>
                  <SimpleChart data={chartData} />
                </div>
              )}
            </>
          )}
        </center>
      </div>
    </>
  )
}
