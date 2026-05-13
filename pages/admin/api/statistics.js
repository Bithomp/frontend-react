import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'

import { useWidth } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'
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

export default function Statistics({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const width = useWidth()
  const [statistics, setStatistics] = useState({})

  useEffect(() => {
    if (sessionToken) {
      getData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  const getData = async () => {
    setLoading(true)
    //period=from..to&span=minute&search=text&ip=z
    //max=20
    const requestStats = await axiosAdmin.get('partner/accessToken/requests/statistics?limit=20').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response.data.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        }
      }
      setLoading(false)
    })
    setLoading(false)

    setStatistics(requestStats?.data)
  }

  return (
    <>
      <SEO title={t('api.statistics.seo', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-statistics" />

        {sessionToken ? (
          <div className="center">
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <h4 className="center">{t('api.statistics.urls-title', { ns: 'admin' })}</h4>
              {width > 750 ? (
                <table className="table-large">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="right">{t('table.count', { ns: 'admin' })}</th>
                      <th>URL</th>
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
                    {statistics?.urls?.map((item, i) => {
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="right">{item.count}</td>
                          <td className="brake">{item.url}</td>
                        </tr>
                      )
                    })}
                    {!statistics?.urls?.[0] && (
                      <tr>
                        <td colSpan="100" className="center">
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
                          <span className="waiting"></span>
                          <br />
                          {t('general.loading')}
                        </td>
                      </tr>
                    )}
                    {statistics?.urls?.map((item, i) => {
                      return (
                        <tr key={i}>
                          <td style={{ padding: '5px' }} className="center">
                            <b>{i + 1}</b>
                          </td>
                          <td>
                            <p>
                              {t('table.count', { ns: 'admin' })}: {item.count}
                            </p>
                            <p>
                              URL:
                              <br />
                              <span style={{ wordBreak: 'break-all' }}>{item.url}</span>
                            </p>
                          </td>
                        </tr>
                      )
                    })}
                    {!statistics?.urls?.[0] && (
                      <tr>
                        <td colSpan="100" className="center">
                          <b>{t('common.no-data', { ns: 'admin' })}</b>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <h4 className="center">{t('api.statistics.ips-title', { ns: 'admin' })}</h4>
              <table className="table-large">
                <thead>
                  <tr>
                    <th></th>
                    <th className="right">{t('table.count', { ns: 'admin' })}</th>
                    <th className="right">IP</th>
                    <th className="right">{t('table.country', { ns: 'admin' })}</th>
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
                  {statistics?.ips?.map((item, i) => {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="right">{item.count}</td>
                        <td className="right">{item.ip}</td>
                        <td className="right">{item.country}</td>
                      </tr>
                    )
                  })}
                  {!statistics?.ips?.[0] && (
                    <tr>
                      <td colSpan="100" className="center">
                        <b>{t('common.no-data', { ns: 'admin' })}</b>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <br />
            {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
          </div>
        ) : (
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- {t('api.statistics.guest.analytics', { ns: 'admin' })}</p>
              <p>- {t('api.statistics.guest.patterns', { ns: 'admin' })}</p>
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
