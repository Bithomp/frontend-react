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
import styles from '@/styles/pages/admin.module.scss'

const maskApiToken = (token) => {
  if (!token) return ''

  const value = String(token)
  if (value.length <= 8) return '*'.repeat(value.length)

  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`
}

const ApiDataSkeleton = ({ t }) => (
  <>
    <table className="table-large no-hover" aria-hidden="true">
      <tbody>
        <tr>
          <td className="right">{t('api.token', { ns: 'admin' })}</td>
          <td className="left">
            <span className={`${styles.skeletonLine} ${styles.token}`}></span>
          </td>
        </tr>
        <tr>
          <td className="right">{t('table.status')}</td>
          <td className="left">
            <span className={`${styles.skeletonLine} ${styles.small}`}></span>
          </td>
        </tr>
        <tr>
          <td className="right">{t('table.domain')}</td>
          <td className="left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`${styles.skeletonLine} ${styles.wide}`}></span>
            <span className={`${styles.skeletonLine} ${styles.tiny}`}></span>
          </td>
        </tr>
        <tr>
          <td className="right">{t('table.description')}</td>
          <td className="left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`${styles.skeletonLine} ${styles.wide}`}></span>
            <span className={`${styles.skeletonLine} ${styles.tiny}`}></span>
          </td>
        </tr>
        <tr>
          <td className="right">{t('api.tier', { ns: 'admin' })}</td>
          <td className="left">
            <span className={`${styles.skeletonLine} ${styles.small}`}></span>
          </td>
        </tr>
      </tbody>
    </table>
    <br />
    <br />
    <span className={`button-action ${styles.skeletonAction} ${styles.skeletonActionWide}`}>
      <span className={`${styles.skeletonLine} ${styles.buttonSkeletonLine}`}></span>
    </span>
  </>
)

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Api({ sessionToken, openEmailLogin, clientReady }) {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [apiData, setApiData] = useState(null)
  const [apiDataLoaded, setApiDataLoaded] = useState(false)
  const [domain, setDomain] = useState('')
  const [apiDescription, setApiDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditingDomain, setIsEditingDomain] = useState(false)
  const [domainEdit, setDomainEdit] = useState('')
  const [domainSaving, setDomainSaving] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [descriptionEdit, setDescriptionEdit] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)
  const [tokenRevealed, setTokenRevealed] = useState(false)

  useEffect(() => {
    if (sessionToken) {
      getApiData()
    } else {
      setApiData(null)
      setApiDataLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    if (apiData?.domain) {
      setDomainEdit(apiData.domain)
    }
  }, [apiData?.domain])

  useEffect(() => {
    if (apiData?.description) {
      setDescriptionEdit(apiData.description)
    }
  }, [apiData?.description])

  useEffect(() => {
    setTokenRevealed(false)
  }, [apiData?.token])

  const getApiData = async () => {
    setLoading(true)
    setApiDataLoaded(false)
    setErrorMessage('')

    let data = null
    try {
      data = await axiosAdmin.get('partner/accessToken')
    } catch (error) {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        }
      }
    }

    setLoading(false)
    setApiDataLoaded(true)

    setApiData(data?.data || null)
    /*
    {
      "token": "werwerw-werwer-werc",
      "locked": false,
      "domain": "slavkino.narod.ru",
      "tier": "free"
    }
    */
  }

  const apiDataPending = !clientReady || (sessionToken && (!apiDataLoaded || loading))

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
            <h4 className="center">{t('api.data-title', { ns: 'admin' })}</h4>
            {t('api.documentation', { ns: 'admin' })}:{' '}
            <a href="https://docs.bithomp.com" target="_blank" rel="noreferrer">
              https://docs.bithomp.com
            </a>
            <br />
            <br />
            {apiDataPending ? (
              <ApiDataSkeleton t={t} />
            ) : (
              <>
                {apiData ? (
                  <>
                    <table className="table-large no-hover">
                      <tbody>
                        <tr>
                          <td className="right">{t('api.token', { ns: 'admin' })}</td>
                          <td className="left">
                            <CopyButton
                              ariaLabel={
                                tokenRevealed
                                  ? t('api.copy-token', { ns: 'admin' })
                                  : t('api.show-copy-token', { ns: 'admin' })
                              }
                              buttonClassName={tokenRevealed ? 'brake' : 'no-brake'}
                              buttonStyle={{
                                background: 'none',
                                border: 0,
                                color: 'var(--accent-link)',
                                cursor: 'pointer',
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                fontSize: 'inherit',
                                padding: 0,
                                textAlign: 'left',
                                textDecoration: 'underline'
                              }}
                              clickTooltipOnly
                              copyText={
                                tokenRevealed
                                  ? t('api.copy-token', { ns: 'admin' })
                                  : t('api.show-copy-token', { ns: 'admin' })
                              }
                              onCopy={() => setTokenRevealed(true)}
                              text={apiData.token}
                              title={
                                tokenRevealed
                                  ? t('api.copy-token', { ns: 'admin' })
                                  : t('api.show-copy-token', { ns: 'admin' })
                              }
                              tooltipClassName="below no-brake"
                            >
                              {tokenRevealed ? apiData.token : maskApiToken(apiData.token)}
                            </CopyButton>{' '}
                          </td>
                        </tr>
                        <tr>
                          <td className="right">{t('table.status')}</td>
                          <td className="left">
                            {apiData.locked ? (
                              <b className="red">{t('status.locked', { ns: 'admin' })}</b>
                            ) : (
                              <>
                                {apiData.tier === 'free' ? (
                                  <b className="green">{t('status.active', { ns: 'admin' })}</b>
                                ) : (
                                  <>
                                    {apiData.expirationAt ? (
                                      <>
                                        {new Date(apiData.expirationAt) > nowDate ? (
                                          <>
                                            <b className="green">{t('status.active', { ns: 'admin' })}</b>{' '}
                                            {t('profile.until', { ns: 'admin' })}
                                          </>
                                        ) : (
                                          <b className="red">{t('status.expired', { ns: 'admin' })}</b>
                                        )}
                                        <> {new Date(apiData.expirationAt).toLocaleDateString()}</>
                                      </>
                                    ) : (
                                      <b className="green">{t('status.active', { ns: 'admin' })}</b>
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
                                  aria-label={t('api.edit-domain', { ns: 'admin' })}
                                  title={t('api.edit-domain', { ns: 'admin' })}
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
                                  aria-label={t('api.save-domain', { ns: 'admin' })}
                                  title={t('button.save', { ns: 'admin' })}
                                  onClick={saveDomain}
                                  disabled={domainSaving}
                                >
                                  <IoMdCheckmark />
                                </button>

                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label={t('button.cancel', { ns: 'admin' })}
                                  title={t('button.cancel', { ns: 'admin' })}
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
                                {apiData.description || ''}
                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label={t('api.edit-description', { ns: 'admin' })}
                                  title={t('api.edit-description', { ns: 'admin' })}
                                  onClick={() => {
                                    setDescriptionEdit(apiData.description || '')
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
                                  aria-label={t('api.save-description', { ns: 'admin' })}
                                  title={t('button.save', { ns: 'admin' })}
                                  onClick={saveDescription}
                                  disabled={descriptionSaving}
                                >
                                  <IoMdCheckmark />
                                </button>

                                <button
                                  className="button-icon"
                                  type="button"
                                  aria-label={t('button.cancel', { ns: 'admin' })}
                                  title={t('button.cancel', { ns: 'admin' })}
                                  onClick={() => {
                                    setDescriptionEdit(apiData.description || '')
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
                          <td className="right">{t('api.tier', { ns: 'admin' })}</td>
                          <td className="left">{apiData.tier}</td>
                        </tr>
                      </tbody>
                    </table>
                    <br />
                    <br />
                    <Link className="button-action" href="/admin/subscriptions?tab=api">
                      {t('api.manage-subscription', { ns: 'admin' })}
                    </Link>
                  </>
                ) : (
                  <div>
                    <h4>{t('api.registration', { ns: 'admin' })}</h4>
                    <p>
                      <input
                        placeholder={t('api.domain-placeholder', { ns: 'admin' })}
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
                        placeholder={t('api.description-placeholder', { ns: 'admin' })}
                        value={apiDescription}
                        onChange={(e) => {
                          setApiDescription(e.target.value)
                        }}
                        className="input-text"
                        maxLength="60"
                      />
                    </p>
                    <button className="button-action" onClick={requestApiKey}>
                      {t('api.request-key', { ns: 'admin' })}
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
              <p>- {t('api.guest.keys', { ns: 'admin' })}</p>
              <p>- {t('api.guest.stats', { ns: 'admin' })}</p>
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
