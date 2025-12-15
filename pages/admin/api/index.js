import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { axiosAdmin } from '../../../utils/axios'
import Link from 'next/link'

import SEO from '../../../components/SEO'

import { isDomainValid, isUrlValid } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'
import CopyButton from '../../../components/UI/CopyButton'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { IoMdCreate, IoMdCheckmark, IoMdClose } from 'react-icons/io'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Api({ sessionToken, openEmailLogin }) {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [apiData, setApiData] = useState(null)
  const [domain, setDomain] = useState('')
  const [apiDescription, setApiDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditingDomain, setIsEditingDomain] = useState(false)
  const [domainEdit, setDomainEdit] = useState('')
  const [domainSaving, setDomainSaving] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionEdit, setDescriptionEdit] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)

  useEffect(() => {
    if (sessionToken) {
      getApiData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    if (apiData?.domain) {
      setDomainEdit(apiData.domain)
    }
  }, [apiData?.domain])

  useEffect(() => {
    if (apiData?.memo) {
      setDescriptionEdit(apiData.memo)
    }
  }, [apiData?.memo])

  const getApiData = async () => {
    setLoading(true)
    setErrorMessage('')
    const data = await axiosAdmin.get('partner/accessToken').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
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

    if (!isUrlValid(domain) && !isDomainValid(domain) && domain !== 'localhost') {
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

  const saveDomain = async () => {
    setErrorMessage('')

    if (!domainEdit || !domainEdit.trim()) {
      setErrorMessage(t('form.error.domain-empty'))
      return
    }

    const cleanDomain = domainEdit.trim()

    if (!isUrlValid(cleanDomain) && !isDomainValid(cleanDomain) && cleanDomain !== 'localhost') {
      setErrorMessage(t('form.error.domain-invalid'))
      return
    }

    setDomainSaving(true)

    const resp = await axiosAdmin.put('partner/accessToken', { id: apiData.id, domain: cleanDomain }).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    setDomainSaving(false)

    if (resp?.data) {
      setApiData(resp.data)
      setIsEditingDomain(false)
    } else {
      setIsEditingDomain(false)
    }
  }

  const saveDescription = async () => {
    setErrorMessage('')

    if (!descriptionEdit || !descriptionEdit.trim()) {
      setErrorMessage(t('form.error.description-empty'))
      return
    }

    const cleanDescription = descriptionEdit.trim()

    if (cleanDescription.length < 10) {
      setErrorMessage(t('form.error.description-short'))
      return
    }

    setDescriptionSaving(true)

    const resp = await axiosAdmin
      .put('partner/accessToken', {
        id: apiData.id,
        memo: cleanDescription,
        description: cleanDescription
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      })

    setDescriptionSaving(false)

    if (resp?.data) {
      setApiData(resp.data)
      setIsEditingDescription(false)
    } else {
      setIsEditingDescription(false)
    }
  }

  return (
    <>
      <SEO title="API" />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="api" />
        <AdminTabs name="apiTabs" tab="api-info" />

        {sessionToken ? (
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
                          <td className="right">{t('table.status')}</td>
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
                          <td className="left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {!isEditingDomain ? (
                              <>
                                {apiData.domain}
                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label="Edit domain"
                                  title="Edit domain"
                                  onClick={() => {
                                    setDomainEdit(apiData.domain || '')
                                    setIsEditingDomain(true)
                                  }}
                                >
                                  <IoMdCreate />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  className="input-text"
                                  value={domainEdit}
                                  onChange={(e) => setDomainEdit(e.target.value)}
                                  spellCheck="false"
                                  maxLength="60"
                                  style={{ maxWidth: '260px' }}
                                  disabled={domainSaving}
                                />

                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label="Save domain"
                                  title="Save"
                                  onClick={saveDomain}
                                  disabled={domainSaving}
                                >
                                  <IoMdCheckmark />
                                </button>

                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label="Cancel"
                                  title="Cancel"
                                  onClick={() => {
                                    setDomainEdit(apiData.domain || '')
                                    setIsEditingDomain(false)
                                  }}
                                  disabled={domainSaving}
                                >
                                  <IoMdClose />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="right">{t('table.description')}</td>
                          <td className="left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {!isEditingDescription ? (
                              <>
                                {apiData.memo || apiData.description || ''}
                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label="Edit description"
                                  title="Edit description"
                                  onClick={() => {
                                    setDescriptionEdit(apiData.memo || '')
                                    setIsEditingDescription(true)
                                  }}
                                >
                                  <IoMdCreate />
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  className="input-text"
                                  value={descriptionEdit}
                                  onChange={(e) => setDescriptionEdit(e.target.value)}
                                  maxLength="120"
                                  disabled={descriptionSaving}
                                  style={{ maxWidth: '360px' }}
                                />

                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label="Save description"
                                  title="Save"
                                  onClick={saveDescription}
                                  disabled={descriptionSaving}
                                >
                                  <IoMdCheckmark />
                                </button>

                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label="Cancel"
                                  title="Cancel"
                                  onClick={() => {
                                    setDescriptionEdit(apiData.memo || '')
                                    setIsEditingDescription(false)
                                  }}
                                  disabled={descriptionSaving}
                                >
                                  <IoMdClose />
                                </button>
                              </>
                            )}
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
            <br />
            {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
          </div>
        ) : (
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- Access and manage your API keys and settings.</p>
              <p>- View API documentation and usage statistics.</p>
            </div>
            <br />
            <center>
              <button className="button-action" onClick={() => openEmailLogin()}>
                Register or Sign In
              </button>
            </center>
          </div>
        )}
      </div>
    </>
  )
}
