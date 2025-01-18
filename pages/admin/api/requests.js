import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'
import ReactCountryFlag from 'react-country-flag'

import { fullDateAndTime } from '../../../utils/format'
import { useWidth } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const now = new Date()
let minDate = now.setDate(now.getDate() - 5) // 5 days ago
minDate = new Date(minDate)

export default function Requests() {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState('')
  const [apiRequests, setApiRequests] = useState({})
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('')

  useEffect(() => {
    getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getData = async () => {
    setApiRequests({})
    setLoading(true)
    //&search=text&ip=z
    const apiRequests = await axiosAdmin
      .get('partner/accessToken/requests?limit=50&offset=0&period=' + period)
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
          if (error.response?.data?.error === 'errors.token.required') {
            router.push('/admin')
          }
        }
        setLoading(false)
      })
    setLoading(false)
    setApiRequests(apiRequests?.data)
  }

  return (
    <>
      <SEO title="API requests" />
      <div className="page-admin content-text">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-requests" />

        <center>
          <DateAndTimeRange setPeriod={setPeriod} minDate={minDate} />
          {width < 500 && <br />}
          <button className="button-action narrow thin" onClick={getData}>
            Search
          </button>
        </center>

        <div className="center">
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            <h4 className="center">The last 50 API requests (the last 5 days)</h4>
            {width > 1240 ? (
              <table className="table-large">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Timestamp</th>
                    <th>Response</th>
                    <th>IP</th>
                    <th className="center">Country</th>
                    <th>URL</th>
                    <th className="right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="center">
                      <td colSpan="100">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </td>
                    </tr>
                  )}
                  {apiRequests?.requests?.map((req, index) => {
                    return (
                      <tr key={index}>
                        <td>{index}</td>
                        <td>{fullDateAndTime(req.createdAt / 1000)}</td>
                        <td>{req.completedAt - req.createdAt} ms</td>
                        <td>{req.ip}</td>
                        <td className="center">
                          {req.country}{' '}
                          <ReactCountryFlag
                            countryCode={req.country}
                            style={{
                              fontSize: '1.5em',
                              lineHeight: '1.5em'
                            }}
                          />
                        </td>
                        <td className="brake">{req.url}</td>
                        <td className="right">{req.status}</td>
                      </tr>
                    )
                  })}
                  {apiRequests?.requests?.length === 0 && (
                    <tr className="center">
                      <td colSpan="100">
                        <b>no data available</b>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table-mobile">
                <tbody>
                  {loading && (
                    <tr className="center">
                      <td colSpan="100">
                        <br />
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                        <br />
                        <br />
                      </td>
                    </tr>
                  )}
                  {apiRequests?.requests?.map((req, index) => {
                    return (
                      <tr key={index}>
                        <td style={{ padding: '5px' }} className="center">
                          <b>{index + 1}</b>
                        </td>
                        <td>
                          <p>{fullDateAndTime(req.createdAt / 1000)}</p>
                          <p>Response: {req.completedAt - req.createdAt} ms</p>
                          <p>IP: {req.ip}</p>
                          <p>
                            Country: {req.country}{' '}
                            <ReactCountryFlag
                              countryCode={req.country}
                              style={{
                                fontSize: '1.5em',
                                lineHeight: '1.5em'
                              }}
                            />
                          </p>
                          <p>
                            URL:
                            <br />
                            <span style={{ wordBreak: 'break-all' }}>{req.url}</span>
                          </p>
                          <p>Status: {req.status}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <br />
          {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
        </div>
      </div>
    </>
  )
}
