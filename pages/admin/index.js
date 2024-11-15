import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useTheme } from '../../components/Layout/ThemeContext'
import Link from 'next/link'
import Mailto from 'react-protected-mailto'

import SEO from '../../components/SEO'
import CheckBox from '../../components/UI/CheckBox'

import { isEmailValid, turnstileSupportedLanguages, useWidth } from '../../utils'
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

const checkmark = '/images/checkmark.svg'

export default function Admin({
  redirectToken,
  account,
  setAccount,
  setProExpire,
  sessionToken,
  setSessionToken,
  signOutPro
}) {
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()
  const width = useWidth()

  const [siteKey, setSiteKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [token, setToken] = useState('') // CL token
  const [authToken, setAuthToken] = useState('') // our site auth token
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState(-1)
  const [loggedUserData, setLoggedUserData] = useState(null)
  const [partnerData, setPartnerData] = useState(null)
  const [checkedPackageData, setCheckedPackageData] = useState(false)
  const [packageData, setPackageData] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const checkApi = async () => {
    /*
      {
        "authToken": "e358869d-3cca-433d-badc-f5ee04bf8b6f",
        "captcha": {
          "siteKey": "0x4AAAAAAAK0rIXv7pr1Jl3p"
        },
        "authTokenExpiredAt": 1698490659
      }
    */
    const siteKeyData = await axiosAdmin.get('auth').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t('error.' + error.message))
      }
    })

    const authData = siteKeyData?.data
    if (authData) {
      if (authData.authToken) setAuthToken(siteKeyData.data.authToken)
      if (authData.captcha?.siteKey) setSiteKey(authData.captcha.siteKey)
    }
  }

  useEffect(() => {
    redirectTokenRun()
    if (!sessionToken) {
      checkApi()
      setStep(0)
    } else {
      setStep(2)
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
        setStep(2)
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

  let emailRef
  let passwordRef

  const onEmailChange = (e) => {
    let x = e.target.value
    // our backend doesnt like yet Upper Case for some reason :)
    x = x.trim().toLowerCase()
    setEmail(x)
    if (isEmailValid(x)) {
      setErrorMessage('')
    }
  }

  const onLogin = async () => {
    if (!email) {
      setErrorMessage(t('form.error.email-empty'))
      emailRef?.focus()
      return
    }

    if (!isEmailValid(email)) {
      setErrorMessage(t('form.error.email-invalid'))
      emailRef?.focus()
      return
    }

    if (!token || !authToken) return

    setErrorMessage('')

    if (step === 0) {
      const formData = await axiosAdmin
        .put('auth', { email, authToken, 'cf-turnstile-response': token, rememberMe })
        .catch((error) => {
          if (error?.response?.data?.error === 'errors.token.required') {
            onLogOut()
            return
          }
          if (error.response?.data?.error === 'Invalid captcha') {
            setErrorMessage('Captcha timeout, try again.')
          } else if (error && error.message !== 'canceled') {
            setErrorMessage(t(error.response.data.error || 'error.' + error.message))
            //{"error":"Authentication token is invalid"}
          }
        })

      /*
      {
        "status": "success",
        "message": "Temporary password sent",
        "requestNewPasswordAt": 1698492460,
        "passwordExpiredAt": 1698493350
      }
      */

      const data = formData?.data
      if (data?.status === 'success') {
        setErrorMessage('Check your email for a temporary password.')
        setStep(1)
      }
    } else {
      //step 1
      if (!password) {
        setErrorMessage(t('form.error.password-empty'))
        passwordRef?.focus()
        return
      }

      const formData = await axiosAdmin.post('auth', { email, password, authToken, rememberMe }).catch((error) => {
        if (error?.response?.data?.error === 'Invalid password') {
          setErrorMessage(t('form.error.password-invalid'))
        } else if (error?.response?.data?.error) {
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
        setStep(2)
        setErrorMessage('')
        setSessionToken(data.token)
        getLoggedUserData()
      }
    }
  }

  const onLogOut = () => {
    signOutPro()
    setStep(0)
    setErrorMessage('')
    setAuthToken('')
    setPassword('')
    setLoggedUserData(null)
    checkApi()
  }

  const flexWidth = (minus = 0) => {
    return width > 480 ? 440 - minus + 'px' : '100%'
  }

  return (
    <>
      <SEO title={t('header', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{step < 1 ? 'Welcome to Bithomp Pro' : t('header', { ns: 'admin' })}</h1>

        {step === 0 && (
          <div>
            <div style={{ maxWidth: flexWidth(), margin: 'auto' }}>
              - Access advanced features with Bithomp Pro subscription.
              <br />- Manage your API keys and view your API statistics.
            </div>
            <br />
            <center>
              <b>Register</b> or <b>Sign In</b> to get started.
            </center>
          </div>
        )}

        {step === 2 && <AdminTabs name="mainTabs" tab="profile" />}

        <br />
        <div className="center">
          {(step === 0 || step === 1) && (
            <div className="input-validation" style={{ margin: 'auto', width: flexWidth() }}>
              <input
                name="email"
                placeholder="Email address"
                value={email}
                onChange={onEmailChange}
                className="input-text"
                ref={(node) => {
                  emailRef = node
                }}
                spellCheck="false"
                disabled={step !== 0}
                autoFocus={step === 0}
              />
              {isEmailValid(email) && <img src={checkmark} className="validation-icon" alt="validated" />}
            </div>
          )}

          {step === 1 && (
            <div className="input-validation" style={{ margin: 'auto', width: flexWidth(), marginTop: '20px' }}>
              <input
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-text"
                ref={(node) => {
                  passwordRef = node
                }}
                spellCheck="false"
              />
              {password?.length > 8 && <img src={checkmark} className="validation-icon" alt="validated" />}
            </div>
          )}

          {step === 0 && (
            <>
              <br />
              <div style={{ height: '65px' }}>
                <Turnstile
                  siteKey={siteKey}
                  style={{ margin: 'auto' }}
                  options={{
                    theme,
                    language: turnstileSupportedLanguages.includes(i18n.language) ? i18n.language : 'en'
                  }}
                  onSuccess={setToken}
                />
              </div>
              <br />
              <div
                style={{
                  display: 'inline-block',
                  marginBottom: '20px',
                  textAlign: 'left',
                  width: flexWidth(2),
                  margin: 'auto'
                }}
              >
                <CheckBox checked={rememberMe} setChecked={setRememberMe}>
                  Remember me
                </CheckBox>
                <CheckBox checked={termsAccepted} setChecked={setTermsAccepted}>
                  I agree with the <Link href="/terms-and-conditions">{t('menu.terms-and-conditions')}</Link>.
                </CheckBox>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {loggedUserData && (
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
                      For priority support, please use subject <b>PRO user {partnerData.id}</b> when sending us an
                      e-mail to{' '}
                      <b>
                        <Mailto email="pro@bithomp.com" headers={{ subject: 'PRO user ' + partnerData.id }} />
                      </b>
                      .
                    </span>
                  )}
                </>
              )}
            </>
          )}
          <br />
          {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}

          {(step === 0 || step === 1) && (
            <>
              <br />
              <button
                className="button-action"
                onClick={onLogin}
                disabled={!termsAccepted || !token || !email || !isEmailValid(email)}
              >
                Submit
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <br />
              <button className="button-action" onClick={onLogOut}>
                Log out
              </button>
            </>
          )}
        </div>
        <br />
        <br />
      </div>
    </>
  )
}
