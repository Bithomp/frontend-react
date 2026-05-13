import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { chartSpan, useWidth } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import SimpleChart from '../../../components/SimpleChart'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'
import AdminTabs from '../../../components/Tabs/AdminTabs'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Charts({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation(['common', 'admin'])
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState('')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('')

  useEffect(() => {
    if (sessionToken && period) {
      getData(period)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, sessionToken])

  const getData = async (period) => {
    setLoading(true)

    //&search=text&ip=z
    const apiRequests = await axiosAdmin
      .get('partner/accessToken/requests/chart?span=' + chartSpan(period) + '&period=' + period)
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response.data.error || 'error.' + error.message))
          if (error.response?.data?.error === 'errors.token.required') {
            openEmailLogin()
          }
        }
        setLoading(false)
      })
    setLoading(false)

    if (apiRequests?.data?.requests?.length > 0) {
      const data = apiRequests.data.requests.map((item) => {
        return [item.time, item.count]
      })
      setChartData(data)
    }
  }

  return (
    <>
      <SEO title={t('api.charts.seo', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-charts" />

        {sessionToken ? (
          <>
            <center>
              <DateAndTimeRange defaultPeriod="day" setPeriod={setPeriod} tabs={true} />
              {width < 500 && <br />}
            </center>

            <div className="center">
              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <h4 className="center">{t('api.charts.requests-count', { ns: 'admin' })}</h4>
                {!loading && chartData?.length > 0 && (
                  <div style={{ maxWidth: '800px', margin: 'auto' }}>
                    <SimpleChart data={chartData} />
                  </div>
                )}
                {!loading && chartData.length === 0 && (
                  <div className="center" style={{ marginTop: '20px' }}>
                    {t('common.no-data', { ns: 'admin' })}
                  </div>
                )}
                {loading && (
                  <div className="center" style={{ marginTop: '20px' }}>
                    <span className="waiting"></span>
                    <br />
                    {t('general.loading')}
                  </div>
                )}
              </div>

              <br />
              {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
            </div>
          </>
        ) : (
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- {t('api.charts.guest.charts', { ns: 'admin' })}</p>
              <p>- {t('api.charts.guest.metrics', { ns: 'admin' })}</p>
            </div>
            <br />
            <center>
              <button className="button-action" onClick={() => openEmailLogin()}>
                {t('button.register-sign-in', { ns: 'admin' })}
              </button>
            </center>
          </div>
        )}
      </div>
    </>
  )
}
