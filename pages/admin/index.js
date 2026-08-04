import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import Mailto from 'react-protected-mailto'

import SEO from '../../components/SEO'

import { getIsSsrMobile } from '../../utils/mobile'
import { dateFormat } from '../../utils/format'
import AdminTabs from '../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../utils/axios'
import styles from '@/styles/pages/admin.module.scss'
import BillingCountry from '../../components/Admin/BillingCountry'
import SubscriptionManager from '../../components/Admin/subscriptions/SubscriptionManager'
import BithompProSubscription from '../../components/Admin/subscriptions/BithompPro'
import { VerifiedAddresses } from './pro'

const subscriptionRemaining = (expiredAt, language) => {
  const remainingDays = Math.max(1, Math.round((expiredAt * 1000 - Date.now()) / 86400000))
  const unit = remainingDays >= 365 ? 'year' : remainingDays >= 30 ? 'month' : 'day'
  const divisor = unit === 'year' ? 365 : unit === 'month' ? 30 : 1
  const value = Math.max(1, Math.round(remainingDays / divisor))

  return new Intl.NumberFormat(language || 'en', {
    style: 'unit',
    unit,
    unitDisplay: 'long'
  }).format(value)
}

const AdminProfileSkeleton = ({ t }) => (
  <>
    <section className={styles.profileCard} aria-hidden="true">
      <div className={styles.profileCardHeader}>
        <div className={styles.profileIdentity}>
          <span>{t('tabs.profile', { ns: 'admin' })}</span>
          <h2><span className={`${styles.skeletonLine} ${styles.wide}`}></span></h2>
        </div>
        <span className={`${styles.skeletonLine} ${styles.small}`}></span>
      </div>
      <div className={styles.profileCardFooter}>
        <div className={styles.profileCountry}>
          <span>{t('billing.country', { ns: 'admin' })}</span>
          <span className={`${styles.skeletonLine} ${styles.small}`}></span>
        </div>
        <span className={`button-action ${styles.skeletonAction}`}>
          <span className={`${styles.skeletonLine} ${styles.buttonSkeletonLine}`}></span>
        </span>
      </div>
    </section>
  </>
)

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      redirectToken: query.redirectToken || null,
      ...(await serverSideTranslations(locale, ['common', 'admin', 'services']))
    }
  }
}

export default function Admin({
  redirectToken,
  account,
  setAccount,
  setSignRequest,
  setProExpire,
  setSubscriptionExpired,
  sessionToken,
  setSessionToken,
  signOutPro,
  openEmailLogin,
  clientReady,
  refreshPage,
  subscriptionExpired
}) {
  const { t, i18n } = useTranslation()

  const [loggedUserData, setLoggedUserData] = useState(null)
  const [partnerData, setPartnerData] = useState(null)
  const [packageData, setPackageData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPrioritySupport, setShowPrioritySupport] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [billingCountry, setBillingCountry] = useState('')
  const [choosingBillingCountry, setChoosingBillingCountry] = useState(false)
  const [subscriptionOpenRequest, setSubscriptionOpenRequest] = useState(0)
  const proSubscriptionActive = !!packageData && (!packageData.expiredAt || packageData.expiredAt * 1000 > Date.now())

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
      } else {
        setProExpire('0')
      }
    }
    setProfileLoaded(true)
  }

  const onLogOut = () => {
    signOutPro()
    setErrorMessage('')
    setLoggedUserData(null)
    setPartnerData(null)
    setPackageData(null)
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
              <section className={styles.profileCard}>
                <div className={styles.profileCardHeader}>
                  <div className={styles.profileIdentity}>
                    <span>{t('tabs.profile', { ns: 'admin' })}</span>
                    <h2>{loggedUserData.email}</h2>
                  </div>
                  <div className={styles.profileStatus}>
                    <b className={proSubscriptionActive ? styles.active : styles.inactive}>
                      {t('profile.subscription-status', { ns: 'admin' })}:{' '}
                      {proSubscriptionActive
                        ? t('profile.subscription-active', { ns: 'admin' })
                        : t('profile.subscription-inactive', { ns: 'admin' })}
                    </b>
                    {proSubscriptionActive && packageData?.expiredAt ? (
                      <small>
                        {t('profile.until', { ns: 'admin' })}{' '}
                        {dateFormat(packageData.expiredAt + 1)}{' '}
                        (<span suppressHydrationWarning>{subscriptionRemaining(packageData.expiredAt + 1, i18n.language)}</span>)
                      </small>
                    ) : null}
                  </div>
                </div>
                <div className={styles.profileCardFooter}>
                  <div className={styles.profileCountry}>
                    <span>{t('billing.country', { ns: 'admin' })}</span>
                    <BillingCountry
                      billingCountry={billingCountry}
                      compact={true}
                      setBillingCountry={setBillingCountry}
                      choosingCountry={choosingBillingCountry}
                      setChoosingCountry={setChoosingBillingCountry}
                      showLabel={false}
                      onSaved={(country) => setPartnerData((prev) => ({ ...(prev || {}), country }))}
                    />
                  </div>
                  <button
                    className={`button-action thin ${styles.profileSubscriptionAction}`}
                    onClick={() => {
                      setSubscriptionOpenRequest((request) => request + 1)
                    }}
                    type="button"
                  >
                    {proSubscriptionActive
                      ? t('api.manage-subscription', { ns: 'admin' })
                      : t('profile.subscription-buy', { ns: 'admin' })}
                  </button>
                </div>
                <SubscriptionManager
                  embedded={true}
                  id="bithomp-pro-subscription"
                  initiallyExpanded={false}
                  openEmailLogin={openEmailLogin}
                  packageType="bithomp_pro"
                  PlanComponent={BithompProSubscription}
                  sessionToken={sessionToken}
                  setProExpire={setProExpire}
                  setSignRequest={setSignRequest}
                  setSubscriptionExpired={setSubscriptionExpired}
                  title="Bithomp Pro"
                  externalBillingCountry={billingCountry}
                  externalChoosingCountry={choosingBillingCountry}
                  openRequest={subscriptionOpenRequest}
                  showExpired={false}
                />
              </section>
              <VerifiedAddresses
                account={account}
                setSignRequest={setSignRequest}
                refreshPage={refreshPage}
                subscriptionExpired={subscriptionExpired}
                sessionToken={sessionToken}
                openEmailLogin={openEmailLogin}
              />
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
                <p>- {t('profile.guest.alerts', { ns: 'admin' })}</p>
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
