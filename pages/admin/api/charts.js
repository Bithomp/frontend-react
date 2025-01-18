import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
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

export default function Charts() {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState('')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('')

  useEffect(() => {
    if (period) {
      getData(period)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const getData = async (period) => {
    setLoading(true)

    //&search=text&ip=z
    const apiRequests = await axiosAdmin
      .get('partner/accessToken/requests/chart?span=' + chartSpan(period) + '&period=' + period)
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response.data.error || 'error.' + error.message))
          if (error.response?.data?.error === 'errors.token.required') {
            router.push('/admin')
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
      <SEO title="API charts" />
      <div className="page-admin content-text">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-charts" />

        <center>
          <DateAndTimeRange defaultPeriod="day" setPeriod={setPeriod} tabs={true} />
          {width < 500 && <br />}
        </center>

        <div className="center">
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            <h4 className="center">Requests count</h4>
            {!loading && chartData?.length > 0 && (
              <div style={{ maxWidth: '800px', margin: 'auto' }}>
                <SimpleChart data={chartData} />
              </div>
            )}
            {!loading && chartData.length === 0 && (
              <div className="center" style={{ marginTop: '20px' }}>
                no data available
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
      </div>
    </>
  )
}
