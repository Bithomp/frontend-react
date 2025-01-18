import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { axiosAdmin } from '../../../utils/axios'
import Link from 'next/link'

import SEO from '../../../components/SEO'

import { isUrlValid } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'
import CopyButton from '../../../components/UI/CopyButton'
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

export default function Api() {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [apiData, setApiData] = useState(null)
  const [domain, setDomain] = useState('')
  const [apiDescription, setApiDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getApiData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getApiData = async () => {
    setLoading(true)
    setErrorMessage('')
    const data = await axiosAdmin.get('partner/accessToken').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        }
      }
      setLoading(false)
    })
    setLoading(false)

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
    setErrorMessage('')

    if (!domain) {
      setErrorMessage(t('form.error.domain-empty'))
      return
    }

    if (!isUrlValid(domain) && domain !== 'localhost') {
      setErrorMessage(t('form.error.domain-invalid'))
      return
    }

    if (!apiDescription) {
      setErrorMessage(t('form.error.description-empty'))
      return
    }

    if (apiDescription.length < 10) {
      setErrorMessage(t('form.error.description-short'))
      return
    }

    const data = await axiosAdmin
      .post('partner/accessToken', { domain, description: apiDescription })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response.data.error || 'error.' + error.message))
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
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return (
    <>
      <SEO title="API" />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-info" />

        <div className="center">
          <h4 className="center">API data</h4>
          Documentation:{' '}
          <a href="https://docs.bithomp.com" target="_blank" rel="noreferrer">
            https://docs.bithomp.com
          </a>
          <br />
          <br />
          {loading ? (
            <table className="table-large">
              <tbody>
                <tr>
                  <td className="center" colSpan="2">
                    <span className="waiting"></span>
                    <br />
                    {t('general.loading')}
                    <br />
                    <br />
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <>
              {apiData ? (
                <>
                  <table className="table-large no-hover">
                    <tbody>
                      <tr>
                        <td className="right">Token</td>
                        <td className="left">
                          {apiData.token} <CopyButton text={apiData.token} />{' '}
                        </td>
                      </tr>
                      <tr>
                        <td className="right">Status</td>
                        <td className="left">
                          {apiData.locked ? (
                            <b className="red">locked</b>
                          ) : (
                            <>
                              {apiData.tier === 'free' ? (
                                <b className="green">active</b>
                              ) : (
                                <>
                                  {apiData.expirationAt ? (
                                    <>
                                      {new Date(apiData.expirationAt) > nowDate ? (
                                        <>
                                          <b className="green">active</b> until
                                        </>
                                      ) : (
                                        <b className="red">expired</b>
                                      )}
                                      <> {new Date(apiData.expirationAt).toLocaleDateString()}</>
                                    </>
                                  ) : (
                                    <b className="green">active</b>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="right">{t('table.domain')}</td>
                        <td className="left">
                          <b>{apiData.domain}</b>
                        </td>
                      </tr>
                      <tr>
                        <td className="right">Tier</td>
                        <td className="left">{apiData.tier}</td>
                      </tr>
                    </tbody>
                  </table>
                  <br />
                  <br />
                  <Link className="button-action" href="/admin/subscriptions?tab=api">
                    Manage your API subscription
                  </Link>
                </>
              ) : (
                <div>
                  <h4>API registration</h4>
                  <p>
                    <input
                      placeholder='Your website domain or "localhost" for a local project'
                      value={domain}
                      onChange={(e) => {
                        setDomain(e.target.value)
                      }}
                      className="input-text"
                      spellCheck="false"
                      maxLength="30"
                    />
                  </p>
                  <p>
                    <input
                      placeholder="Description how API will be used"
                      value={apiDescription}
                      onChange={(e) => {
                        setApiDescription(e.target.value)
                      }}
                      className="input-text"
                      maxLength="60"
                    />
                  </p>
                  <button className="button-action" onClick={requestApiKey}>
                    Request API key
                  </button>
                  <br />
                </div>
              )}
            </>
          )}
          <br />
          {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
        </div>
      </div>
    </>
  )
}
