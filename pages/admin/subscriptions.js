import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

import { useWidth } from '../../utils'
import { fullDateAndTime } from '../../utils/format'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Admin/Tabs'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Subscriptions() {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState([])

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

  const getApiData = async () => {
    setLoading(true)
    setErrorMessage("")

    const packagesData = await axios.get(
      'partner/partner/packages',
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

    if (packagesData?.data) {
      /*
        {
          "total": 1,
          "count": 1,
          "packages": [
            {
              "id": 5,
              "createdAt": 1710692670,
              "updatedAt": 1710692670,
              "startedAt": 1710633600,
              "expiredAt": 1711324799,
              "cancelledAt": null,
              "unlockedAt": null,
              "type": "bithomp_pro",
              "metadata": {}
            }
          ]
        }
      */
      setPackages(packagesData.data.packages)
    }

    setLoading(false)
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <AdminTabs name="mainTabs" tab="subscriptions" />

      <div className='center'>
        {errorMessage ?
          <div className='center orange bold'>
            {errorMessage}
          </div>
          :
          <br />
        }

        {loading &&
          <div className='center'>
            <br /><br />
            <span className="waiting"></span>
            <br />
            {t("general.loading")}
            <br /><br />
          </div>
        }

        {packages?.length > 0 &&
          <div style={{ textAlign: "left" }}>
            {width > 600 ?
              <table className='table-large shrink'>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Created</th>
                    <th>Start</th>
                    <th>Expire</th>
                  </tr>
                </thead>
                <tbody>
                  {packages?.map((row, index) => {
                    return <tr key={index}>
                      <td>{row.type}</td>
                      <td>{fullDateAndTime(row.createdAt)}</td>
                      <td>{fullDateAndTime(row.startedAt)}</td>
                      <td>{fullDateAndTime(row.expiredAt)}</td>
                    </tr>
                  })}
                </tbody>
              </table>
              :
              <table className='table-mobile'>
                <tbody>
                  {packages?.map((row, index) => {
                    return <tr key={index}>
                      <td style={{ padding: "5px" }} className='center'>
                        <b>{index + 1}</b>
                      </td>
                      <td>
                        <p>
                          Type: {row.type}
                        </p>
                        <p>
                          Created: <br />
                          {fullDateAndTime(row.createdAt)}
                        </p>
                        <p>
                          Start: <br />
                          {fullDateAndTime(row.startedAt)}
                        </p>
                        <p>
                          Expire: <br />
                          {fullDateAndTime(row.expiredAt)}
                        </p>
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
            }
          </div>
        }
      </div>
    </div>
  </>
}
