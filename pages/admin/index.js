import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Mailto from 'react-protected-mailto'

import SEO from '../../components/SEO'

import { getIsSsrMobile } from '../../utils/mobile'
import AdminTabs from '../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../utils/axios'

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
  openEmailLogin
}) {
  const { t } = useTranslation()

  const [loggedUserData, setLoggedUserData] = useState(null)
  const [partnerData, setPartnerData] = useState(null)
  const [checkedPackageData, setCheckedPackageData] = useState(false)
  const [packageData, setPackageData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    redirectTokenRun()
    if (sessionToken) {
      getLoggedUserData()
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
  }

  const onLogOut = () => {
    signOutPro()
    setErrorMessage('')
    setLoggedUserData(null)
    setPartnerData(null)
    setPackageData(null)
    setCheckedPackageData(false)
  }

  return (
    <>
      <SEO title={t('header', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="profile" />

        <br />
        <div className="center">
          {sessionToken && loggedUserData ? (
            <>
              <table className="table-large no-hover shrink">
                <tbody>
                  <tr>
                    <td className="left">E-mail</td>
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
                              <b className="green">Active</b>
                              {packageData.expiredAt && (
                                <> until {new Date(packageData.expiredAt * 1000).toLocaleDateString()}</>
                              )}
                            </>
                          ) : (
                            <Link href="/admin/subscriptions?tab=pro">Activate</Link>
                          )}
                        </>
                      ) : (
                        '...'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              {packageData && partnerData && (
                <span>
                  <br />
                  For priority support, please use subject <b>PRO user {partnerData.id}</b> when sending us an e-mail to{' '}
                  <b>
                    <Mailto email="pro@bithomp.com" headers={{ subject: 'PRO user ' + partnerData.id }} />
                  </b>
                  .
                </span>
              )}
              <br />
              <br />
              <button className="button-action" onClick={onLogOut}>
                Log out
              </button>
            </>
          ) : (
            <>
              <div style={{ maxWidth: '440px', margin: 'auto' }}>
                <p>Access advanced features with Bithomp Pro subscription.</p>
                <p>Manage your API keys and view your API statistics.</p>
              </div>
              <br />
              <center>
                <button className="button-action" onClick={() => openEmailLogin()}>
                  Register or Sign In
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
