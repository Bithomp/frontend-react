import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'

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

export default function Requests({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation(['common', 'admin'])
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState('')
  const [apiRequests, setApiRequests] = useState({})
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('')

  useEffect(() => {
    if (sessionToken) {
      getData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

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
            openEmailLogin()
          }
        }
        setLoading(false)
      })
    setLoading(false)
    setApiRequests(apiRequests?.data)
  }

  return (
    <>
      <SEO title={t('api.requests.seo', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-requests" />

        {sessionToken ? (
          <>
            <center>
              <DateAndTimeRange setPeriod={setPeriod} minDate={minDate} />
              {width < 500 && <br />}
              <button className="button-action narrow thin" onClick={getData}>
                {t('button.search', { ns: 'admin' })}
              </button>
            </center>

            <div className="center">
              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <h4 className="center">{t('api.requests.title', { ns: 'admin' })}</h4>
                {width > 1240 ? (
                  <table className="table-large">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('table.timestamp', { ns: 'admin' })}</th>
                        <th>{t('table.response', { ns: 'admin' })}</th>
                        <th>IP</th>
                        <th className="center">{t('table.country', { ns: 'admin' })}</th>
                        <th>URL</th>
                        <th className="right">{t('table.status', { ns: 'admin' })}</th>
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
                            <b>{t('common.no-data', { ns: 'admin' })}</b>
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
                              <p>
                                {t('table.response', { ns: 'admin' })}: {req.completedAt - req.createdAt} ms
                              </p>
                              <p>IP: {req.ip}</p>
                              <p>
                                {t('table.country', { ns: 'admin' })}: {req.country}{' '}
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
                              <p>
                                {t('table.status', { ns: 'admin' })}: {req.status}
                              </p>
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
          </>
        ) : (
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- {t('api.requests.guest.logs', { ns: 'admin' })}</p>
              <p>- {t('api.requests.guest.performance', { ns: 'admin' })}</p>
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
