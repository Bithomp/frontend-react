import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'

import { isUrlValid } from '../../../utils'
import CopyButton from '../../../components/UI/CopyButton'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Admin() {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [apiData, setApiData] = useState(null)
  const [domain, setDomain] = useState("")
  const [apiDescription, setApiDescription] = useState("")
  const router = useRouter()

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axios.defaults.headers.common['Authorization'] = "Bearer " + sessionToken
      getApiData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mainTabs = [
    { value: "account", label: "Account" },
    { value: "api", label: "API" },
    { value: "bots", label: "Bots" },
  ]

  const apiTabs = [
    { value: "api-info", label: "Information" },
    { value: "api-payments", label: "Payments" },
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
    } if (tab === "api-payments") {
      router.push("/admin/api/payments")
    } if (tab === "api-requests") {
      router.push("/admin/api/requests")
    }
  }

  const getApiData = async () => {
    const data = await axios.get(
      'partner/partner/accessToken',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
      }
    })

    setApiData(data?.data)
    /*
    {
      "token": "werwerw-werwer-werc",
      "locked": false,
      "domain": "slavkino.narod.ru",
      "tier": "free"
    }
    */
  }

  const requestApiKey = async () => {
    setErrorMessage("")

    if (!domain) {
      setErrorMessage(t("form.error.domain-empty"))
      return
    }

    if (!isUrlValid(domain)) {
      setErrorMessage(t("form.error.domain-invalid"))
      return
    }

    if (!apiDescription) {
      setErrorMessage(t("form.error.description-empty"))
      return
    }

    if (apiDescription.length < 10) {
      setErrorMessage(t("form.error.description-short"))
      return
    }

    const data = await axios.post(
      'partner/partner/accessToken',
      { domain, description: apiDescription },
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
      }
    })

    setApiData(data?.data)
    /*
    {
      "token": "werwerw-werwer-werc",
      "locked": false,
      "domain": "slavkino.narod.ru",
      "tier": "free"
    }
    */
  }

  const now = new Date()
  const nowDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDay())

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center" style={{ maxWidth: "1040px", marginBottom: "400px" }}>
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <Tabs tabList={mainTabs} tab="api" setTab={changePage} name="mainTabs" />
      <Tabs tabList={apiTabs} tab="api-info" setTab={changePage} name="apiTabs" />

      <div className='center' style={{ height: "300px" }}>
        <h4 className='center'>API data</h4>
        <div className="flex">
          <table className='table-large shrink'>
            {apiData ?
              <tbody>
                <tr>
                  <td className='right'>Token</td>
                  <td className='left'>{apiData.token} <CopyButton text={apiData.token} /> </td>
                </tr>
                <tr>
                  <td className='right'>Status</td>
                  <td className='left'>
                    {apiData.locked ?
                      <b className='red'>locked</b>
                      :
                      <>
                        {apiData.tier === 'free' ?
                          <b className='green'>active</b>
                          :
                          <>
                            {new Date(apiData.expirationAt) > nowDate ?
                              <>
                                <b className='green'>active</b> until
                              </>
                              :
                              <b className='red'>expired</b>
                            }
                            <> {new Date(apiData.expirationAt).toLocaleDateString()}</>
                          </>
                        }
                      </>
                    }
                  </td>
                </tr>
                <tr>
                  <td className='right'>{t("table.domain")}</td>
                  <td className='left'><b>{apiData.domain}</b></td>
                </tr>
                <tr>
                  <td className='right'>Tier</td>
                  <td className='left'>{apiData.tier}</td>
                </tr>
              </tbody>
              :
              <tbody>
                <tr>
                  <td className='right'>{t("table.domain")}</td>
                  <td className='left'>
                    <input
                      placeholder="Enter website domain"
                      value={domain}
                      onChange={(e) => { setDomain(e.target.value) }}
                      className="input-text"
                      spellCheck="false"
                      maxLength="30"
                    />
                  </td>
                </tr>
                <tr>
                  <td className='right'>Description</td>
                  <td className='left'>
                    <input
                      placeholder="Enter API description"
                      value={apiDescription}
                      onChange={(e) => { setApiDescription(e.target.value) }}
                      className="input-text"
                      maxLength="60"
                    />
                  </td>
                </tr>
                <tr>
                  <td className='center' colSpan="2">
                    <button
                      className={"button-action"}
                      onClick={requestApiKey}
                    >
                      Request API key
                    </button>
                    <br />
                  </td>
                </tr>
              </tbody>
            }
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
