import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Mailto from 'react-protected-mailto'

import SEO from '../../components/SEO'

import { getIsSsrMobile } from '../../utils/mobile'
import AdminTabs from '../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../utils/axios'
import styles from '@/styles/pages/admin.module.scss'
import BillingCountry from '../../components/Admin/BillingCountry'

const AdminProfileSkeleton = ({ t }) => (
  <>
    <table className="table-large no-hover shrink" aria-hidden="true">
      <tbody>
        <tr>
          <td className="left">{t('profile.email', { ns: 'admin' })}</td>
          <td className="left">
            <span className={`${styles.skeletonLine} ${styles.wide}`}></span>
          </td>
        </tr>
        <tr>
          <td className="left">Bithomp Pro</td>
          <td className="left">
            <span className={`${styles.skeletonLine} ${styles.small}`}></span>
          </td>
        </tr>
        <tr>
          <td className="left">{t('billing.country', { ns: 'admin' })}</td>
          <td className="left">
            <span className={`${styles.skeletonLine} ${styles.small}`}></span>
          </td>
        </tr>
      </tbody>
    </table>
    <br />
    <br />
    <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
      <span className={`button-action ${styles.skeletonAction}`}>
        <span className={`${styles.skeletonLine} ${styles.buttonSkeletonLine}`}></span>
      </span>
      <span className={`button-action ${styles.skeletonAction}`}>
        <span className={`${styles.skeletonLine} ${styles.buttonSkeletonLine}`}></span>
      </span>
    </div>
  </>
)

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      redirectToken: query.redirectToken || null,
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Admin({
  redirectToken,
  account,
  setAccount,
  setProExpire,
  sessionToken,
  setSessionToken,
  signOutPro,
  openEmailLogin,
  clientReady
}) {
  const { t } = useTranslation()

  const [loggedUserData, setLoggedUserData] = useState(null)
  const [partnerData, setPartnerData] = useState(null)
  const [checkedPackageData, setCheckedPackageData] = useState(false)
  const [packageData, setPackageData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPrioritySupport, setShowPrioritySupport] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [billingCountry, setBillingCountry] = useState('')
  const [choosingBillingCountry, setChoosingBillingCountry] = useState(false)

  useEffect(() => {
    redirectTokenRun()
    if (sessionToken) {
      getLoggedUserData()
    } else {
      setProfileLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  const redirectTokenRun = async () => {
    if (redirectToken) {
      const formData = await axiosAdmin.post('auth', { redirectToken }).catch((error) => {
        if (error?.response?.data?.error) {
          setErrorMessage(error.response.data.error)
        } else if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
        }
      })

      const data = formData?.data
      /*
        {
          "status": "success",
          "token": "b625c631-45a9-43b3-935f-4af7667852a3-045d2763-bbb6-4693-bace-52d3417bfd3c",
          "tokenExpiredAt": 1698497754
        }
      */
      if (data?.status === 'success') {
        axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + data.token
        setErrorMessage('')
        setSessionToken(data.token)
        getLoggedUserData()
      }
    }
  }

  const getLoggedUserData = async () => {
    setProfileLoaded(false)
    const data = await axiosAdmin.get('user').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    if (data?.data) {
      /*
        {
          "id": 2,
          "created_at": "2023-10-13T10:22:08.000Z",
          "updated_at": "2023-10-13T10:22:08.000Z",
          "email": "vasia@pupkin.tk"
        }
      */
      setLoggedUserData(data.data)
      setAccount({ ...account, pro: data.data.email })
    }

    const partnerDataRaw = await axiosAdmin.get('partner').catch((error) => {
      if (error.response?.data?.error === 'errors.token.required') {
        onLogOut()
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    if (partnerDataRaw?.data) {
      setPartnerData(partnerDataRaw.data)
      setBillingCountry(partnerDataRaw.data.country || '')
      /*
        {
          "bithompProPackageID": 48,
          "id": 4450,
          "created_at": "2023-11-10T18:54:52.000Z",
          "updated_at": "2024-01-15T09:19:40.000Z",
          "name": "Vasia TEST",
          "email": "vasia@pupkin.tk",
          "country": "BO"
        }
      */

      if (partnerDataRaw.data.bithompProPackageID) {
        //request to get the package data
        const packageData = await axiosAdmin
          .get('partner/package/' + partnerDataRaw.data.bithompProPackageID)
          .catch((error) => {
            if (error.response?.data?.error === 'errors.token.required') {
              onLogOut()
              return
            }
            if (error && error.message !== 'canceled') {
              setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
            }
          })

        if (packageData?.data) {
          /*
            {
              "id": 4,
              "createdAt": 1710684170,
              "updatedAt": 1710684170,
              "startedAt": 1710288000,
              "expiredAt": 1711151999,
              "cancelledAt": null,
              "unlockedAt": null,
              "type": "bithomp_pro",
              "metadata": {}
            }
          */
          setPackageData(packageData.data)
          setProExpire(JSON.stringify(packageData.data.expiredAt * 1000))
        }
        setCheckedPackageData(true)
      } else {
        setProExpire('0')
        setCheckedPackageData(true)
      }
    } else {
      setCheckedPackageData(true)
    }
    setProfileLoaded(true)
  }

  const onLogOut = () => {
    signOutPro()
    setErrorMessage('')
    setLoggedUserData(null)
    setPartnerData(null)
    setPackageData(null)
    setCheckedPackageData(false)
    setShowPrioritySupport(false)
    setProfileLoaded(false)
    setBillingCountry('')
    setChoosingBillingCountry(false)
  }

  return (
    <>
      <SEO title={t('header', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="profile" />

        <div className="center">
          {!clientReady || (sessionToken && !profileLoaded) ? (
            <AdminProfileSkeleton t={t} />
          ) : sessionToken && loggedUserData ? (
            <>
              <table className="table-large no-hover shrink">
                <tbody>
                  <tr>
                    <td className="left">{t('profile.email', { ns: 'admin' })}</td>
                    <td className="left">
                      <b>{loggedUserData.email}</b>
                    </td>
                  </tr>
                  <tr>
                    <td className="left">Bithomp Pro</td>
                    <td className="left">
                      {checkedPackageData ? (
                        <>
                          {packageData ? (
                            <>
                              <b className="green">{t('status.active', { ns: 'admin' })}</b>
                              {packageData.expiredAt && (
                                <> {t('profile.until', { ns: 'admin' })} {new Date(packageData.expiredAt * 1000).toLocaleDateString()}</>
                              )}
                            </>
                          ) : (
                            <Link href="/admin/subscriptions?tab=pro">{t('button.activate', { ns: 'admin' })}</Link>
                          )}
                        </>
                      ) : (
                        '...'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="left">{t('billing.country', { ns: 'admin' })}</td>
                    <td className="left">
                      <BillingCountry
                        billingCountry={billingCountry}
                        compact={true}
                        setBillingCountry={setBillingCountry}
                        choosingCountry={choosingBillingCountry}
                        setChoosingCountry={setChoosingBillingCountry}
                        showLabel={false}
                        onSaved={(country) => setPartnerData((prev) => ({ ...(prev || {}), country }))}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
              <br />
              <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
                {packageData && partnerData && (
                  <button
                    aria-controls="priority-support-message"
                    aria-expanded={showPrioritySupport}
                    className="button-action secondary"
                    onClick={() => setShowPrioritySupport((visible) => !visible)}
                    type="button"
                  >
                    {t('button.contact-support', { ns: 'admin' })}
                  </button>
                )}
                <button className="button-action" onClick={onLogOut}>
                  {t('button.logout', { ns: 'admin' })}
                </button>
              </div>
              {packageData && partnerData && showPrioritySupport && (
                <div id="priority-support-message">
                  <br />
                  {t('profile.priority-support-before', { ns: 'admin' })} <b>PRO user {partnerData.id}</b>{' '}
                  {t('profile.priority-support-after', { ns: 'admin' })}{' '}
                  <b>
                    <Mailto email="pro@bithomp.com" headers={{ subject: 'PRO user ' + partnerData.id }} />
                  </b>
                  .
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
                <p>- {t('profile.guest.pro', { ns: 'admin' })}</p>
                <p>- {t('profile.guest.history', { ns: 'admin' })}</p>
                <p>- {t('profile.guest.api', { ns: 'admin' })}</p>
                <p>- {t('profile.guest.watchlist', { ns: 'admin' })}</p>
                <p>- {t('profile.guest.avatars', { ns: 'admin' })}</p>
              </div>
              <br />
              <center>
                <button className="button-action" onClick={() => openEmailLogin()}>
                  {t('button.register-sign-in', { ns: 'admin' })}
                </button>
              </center>
            </>
          )}

          {errorMessage && (
            <div className="center">
              <br />
              <span className="orange bold">{errorMessage}</span>
            </div>
          )}
        </div>
        <br />
        <br />
      </div>
    </>
  )
}
