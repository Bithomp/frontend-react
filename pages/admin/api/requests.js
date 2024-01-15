import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'

import { fullDateAndTime } from '../../../utils/format'
import { useWidth } from '../../../utils'

import ReactCountryFlag from "react-country-flag"

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Requests() {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [apiRequests, setApiRequests] = useState({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const width = useWidth()

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
    }
  }

  const getData = async () => {
    setLoading(true)
    //&period=from..to&search=text&ip=z
    const apiRequests = await axios.get(
      'partner/partner/accessToken/requests?limit=50&offset=0',
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
    setApiRequests(apiRequests?.data)
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-text">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <Tabs tabList={mainTabs} tab="api" setTab={changePage} name="mainTabs" />
      <Tabs tabList={apiTabs} tab="api-requests" setTab={changePage} name="apiTabs" />

      <div className='center'>
        <div style={{ marginTop: "20px", textAlign: "left" }}>
          <h4 className='center'>The last 50 API requests (the last 5 days)</h4>
          {width > 1240 ?
            <table className='table-large shrink'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Timestamp</th>
                  <th>Response</th>
                  <th>IP</th>
                  <th className='center'>Country</th>
                  <th>URL</th>
                  <th className='right'>Status</th>
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
                {apiRequests?.requests?.map((req, index) => {
                  return <tr key={index}>
                    <td>{index}</td>
                    <td>{fullDateAndTime(req.createdAt / 1000)}</td>
                    <td>{req.completedAt - req.createdAt} ms</td>
                    <td>{req.ip}</td>
                    <td className='center'>
                      {req.country}
                      {" "}
                      <ReactCountryFlag
                        countryCode={req.country}
                        style={{
                          fontSize: '1.5em',
                          lineHeight: '1.5em'
                        }}
                      />
                    </td>
                    <td className='brake'>{req.url}</td>
                    <td className='right'>{req.status}</td>
                  </tr>
                })}
                {apiRequests?.requests?.length === 0 &&
                  <tr className='center'>
                    <td colSpan="100">
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
                {apiRequests?.requests?.map((req, index) => {
                  return <tr key={index}>
                    <td style={{ padding: "5px" }} className='center'>
                      <b>{index + 1}</b>
                    </td>
                    <td>
                      <p>{fullDateAndTime(req.createdAt / 1000)}</p>
                      <p>Response: {req.completedAt - req.createdAt} ms</p>
                      <p>IP: {req.ip}</p>
                      <p>
                        Country: {req.country}
                        {" "}
                        <ReactCountryFlag
                          countryCode={req.country}
                          style={{
                            fontSize: '1.5em',
                            lineHeight: '1.5em'
                          }}
                        />
                      </p>
                      <p>URL:<br /><span style={{ wordBreak: "break-all" }}>{req.url}</span></p>
                      <p>Status: {req.status}</p>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          }
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
