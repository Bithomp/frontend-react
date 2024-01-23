import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'

import { useWidth } from '../../../utils'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Statistics() {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const width = useWidth()
  const [statistics, setStatistics] = useState({})

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axios.defaults.headers.common['Authorization'] = "Bearer " + sessionToken
      getData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mainTabs = [
    { value: "account", label: "Account" },
    { value: "api", label: "API" },
    //{ value: "bots", label: "Bots" },
  ]

  const apiTabs = [
    { value: "api-info", label: "Information" },
    { value: "api-payments", label: "Payments" },
    { value: "api-statistics", label: "Statistics" },
    { value: "api-requests", label: "Requests" },
    { value: "api-charts", label: "Charts" },
  ]

  const changePage = tab => {
    if (tab === "api") {
      router.push("/admin/api")
    } else if (tab === "bots") {
      router.push("/admin/bots")
    } else if (tab === "account") {
      router.push("/admin")
    } else if (tab === "api-info") {
      router.push("/admin/api")
    } else if (tab === "api-payments") {
      router.push("/admin/api/payments")
    } else if (tab === "api-requests") {
      router.push("/admin/api/requests")
    } else if (tab === "api-statistics") {
      router.push("/admin/api/statistics")
    } else if (tab === "api-charts") {
      router.push("/admin/api/charts")
    }
  }

  const getData = async () => {
    setLoading(true)
    //period=from..to&span=minute&search=text&ip=z
    //max=20
    const requestStats = await axios.get(
      'partner/partner/accessToken/requests/statistics?limit=20',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
        if (error.response?.data?.error === "errors.token.required") {
          router.push('/admin')
        }
      }
      setLoading(false)
    })
    setLoading(false)

    setStatistics(requestStats?.data)
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-text">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <Tabs tabList={mainTabs} tab="api" setTab={changePage} name="mainTabs" />
      <Tabs tabList={apiTabs} tab="api-statistics" setTab={changePage} name="apiTabs" />

      <div className='center'>
        <div style={{ marginTop: "20px", textAlign: "left" }}>
          <h4 className='center'>20 most common URLs in the last 24h</h4>
          {width > 750 ?
            <table className='table-large shrink'>
              <thead>
                <tr>
                  <th></th>
                  <th className='right'>Count</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  <tr className='center'>
                    <td colSpan="100">
                      <span className="waiting"></span>
                      <br />{t("general.loading")}
                    </td>
                  </tr>
                }
                {statistics?.urls?.map((item, i) => {
                  return <tr key={i}>
                    <td>{i + 1}</td>
                    <td className='right'>{item.count}</td>
                    <td className='brake'>{item.url}</td>
                  </tr>
                }
                )}
                {!statistics?.urls?.[0] &&
                  <tr>
                    <td colSpan="100" className='center'>
                      <b>no data available</b>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            :
            <table className='table-mobile'>
              <tbody>
                {loading &&
                  <tr className='center'>
                    <td colSpan="100">
                      <span className="waiting"></span>
                      <br />{t("general.loading")}
                    </td>
                  </tr>
                }
                {statistics?.urls?.map((item, i) => {
                  return <tr key={i}>
                    <td style={{ padding: "5px" }} className='center'>
                      <b>{i + 1}</b>
                    </td>
                    <td>
                      <p>Count: {item.count}</p>
                      <p>URL:<br /><span style={{ wordBreak: "break-all" }}>{item.url}</span></p>
                    </td>
                  </tr>
                }
                )}
                {!statistics?.urls?.[0] &&
                  <tr>
                    <td colSpan="100" className='center'>
                      <b>no data available</b>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <div style={{ marginTop: "20px", textAlign: "left" }}>
          <h4 className='center'>The most common IPs in the last 24h</h4>
          <table className='table-large shrink'>
            <thead>
              <tr>
                <th></th>
                <th className='right'>Count</th>
                <th className='right'>IP</th>
                <th className='right'>Country</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                <tr className='center'>
                  <td colSpan="100">
                    <span className="waiting"></span>
                    <br />{t("general.loading")}
                  </td>
                </tr>
              }
              {statistics?.ips?.map((item, i) => {
                return <tr key={i}>
                  <td>{i + 1}</td>
                  <td className='right'>{item.count}</td>
                  <td className='right'>{item.ip}</td>
                  <td className='right'>{item.country}</td>
                </tr>
              }
              )}
              {!statistics?.ips?.[0] &&
                <tr>
                  <td colSpan="100" className='center'>
                    <b>no data available</b>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <br />
        {errorMessage ?
          <div className='center orange bold'>
            {errorMessage}
          </div>
          :
          <br />
        }
      </div>
    </div>
  </>
}
