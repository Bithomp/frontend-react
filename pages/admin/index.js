import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import axios from 'axios'
import { useTheme } from '../../components/Layout/ThemeContext'
import Link from 'next/link'

import SEO from '../../components/SEO'
import CheckBox from '../../components/UI/CheckBox'

import { isEmailValid } from '../../utils'
import AdminTabs from '../../components/Admin/Tabs'

export const getServerSideProps = async ({ locale, query }) => {
  return {
    props: {
      redirectToken: query.redirectToken || null,
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

const turnstileSupportedLanguages = ['ar-EG', 'de', 'en', 'es', 'fa', 'fr', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt-BR', 'ru', 'tr', 'zh-CN', 'zh-TW']
const checkmark = '/images/checkmark.svg'

export default function Admin({ redirectToken, Account, setAccount }) {
  const { theme } = useTheme()
  const { t, i18n } = useTranslation(['common', 'admin'])
  const [siteKey, setSiteKey] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [token, setToken] = useState("") // CL token
  const [authToken, setAuthToken] = useState("") // our site auth token
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [step, setStep] = useState(-1)
  const [loggedUserData, setLoggedUserData] = useState(null)
  const [checkedPackageData, setCheckedPackageData] = useState(false)
  const [packageData, setPackageData] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

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
    const siteKeyData = await axios.get('partner/auth', { baseUrl: '/api/' }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
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
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      checkApi()
      setStep(0)
    } else {
      setStep(2)
      axios.defaults.headers.common['Authorization'] = "Bearer " + sessionToken
      getLoggedUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const redirectTokenRun = async () => {
    if (redirectToken) {
      const formData = await axios.post(
        'partner/auth',
        { redirectToken },
        { baseUrl: '/api/' }
      ).catch(error => {
        if (error?.response?.data?.error) {
          setErrorMessage(error.response.data.error)
        } else if (error && error.message !== "canceled") {
          setErrorMessage(t("error." + error.message))
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
      if (data?.status === "success") {
        setStep(2)
        setErrorMessage("")
        localStorage.setItem("sessionToken", data.token)
        axios.defaults.headers.common['Authorization'] = "Bearer " + data.token
        getLoggedUserData()
      }
    }
  }

  const getLoggedUserData = async () => {
    const data = await axios.get(
      'partner/user',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error.response?.data?.error === "errors.token.required") {
        onLogOut()
        return
      }
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response?.data?.error || "error." + error.message))
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
      setAccount({ ...Account, pro: data.data.email })
    }

    const partnerData = await axios.get(
      'partner/partner',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error.response?.data?.error === "errors.token.required") {
        onLogOut()
        return
      }
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response?.data?.error || "error." + error.message))
      }
    })

    if (partnerData?.data) {
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
      if (partnerData.data.bithompProPackageID) {
        //request to get the package data
        const packageData = await axios.get(
          'partner/partner/package/' + partnerData.data.bithompProPackageID,
          { baseUrl: '/api/' }
        ).catch(error => {
          if (error.response?.data?.error === "errors.token.required") {
            onLogOut()
            return
          }
          if (error && error.message !== "canceled") {
            setErrorMessage(t(error.response?.data?.error || "error." + error.message))
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
          localStorage.setItem("pro-expire", JSON.stringify(packageData.data.expiredAt * 1000))
        }
        setCheckedPackageData(true)
      } else {
        localStorage.setItem("pro-expire", JSON.stringify(0))
        setCheckedPackageData(true)
      }
    } else {
      setCheckedPackageData(true)
    }
  }

  let emailRef
  let passwordRef

  const onEmailChange = e => {
    let x = e.target.value
    // our backend doesnt like yet Upper Case for some reason :)
    x = x.trim().toLowerCase()
    setEmail(x)
    if (isEmailValid(x)) {
      setErrorMessage("")
    }
  }

  const onLogin = async () => {
    if (!email) {
      setErrorMessage(t("form.error.email-empty"))
      emailRef?.focus()
      return
    }

    if (!isEmailValid(email)) {
      setErrorMessage(t("form.error.email-invalid"))
      emailRef?.focus()
      return
    }

    if (!token || !authToken) return

    setErrorMessage("")

    if (step === 0) {
      const formData = await axios.put(
        'partner/auth',
        { email, authToken, "cf-turnstile-response": token },
        { baseUrl: '/api/' }
      ).catch(error => {
        if (error && error.message !== "canceled") {
          setErrorMessage(t(error.response.data.error || "error." + error.message))
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
      if (data?.status === "success") {
        setErrorMessage("Check your email for a temporary password.")
        setStep(1)
      }
    } else {
      //step 1
      if (!password) {
        setErrorMessage(t("form.error.password-empty"))
        passwordRef?.focus()
        return
      }

      const formData = await axios.post(
        'partner/auth',
        { email, password, authToken },
        { baseUrl: '/api/' }
      ).catch(error => {
        if (error?.response?.data?.error === "Invalid password") {
          setErrorMessage(t("form.error.password-invalid"))
        } else if (error?.response?.data?.error) {
          setErrorMessage(error.response.data.error)
        } else if (error && error.message !== "canceled") {
          setErrorMessage(t("error." + error.message))
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
      if (data?.status === "success") {
        setStep(2)
        setErrorMessage("")
        localStorage.setItem("sessionToken", data.token)
        axios.defaults.headers.common['Authorization'] = "Bearer " + data.token
        getLoggedUserData()
      }
    }
  }

  const onLogOut = () => {
    localStorage.removeItem('sessionToken')
    setAccount({ ...Account, pro: null })
    setStep(0)
    setErrorMessage("")
    setToken("")
    setAuthToken("")
    setPassword("")
    setLoggedUserData(null)
    checkApi()
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center">
      <h1 className='center'>
        {step < 1 ?
          <>
            Sign in / registration
          </>
          :
          t("header", { ns: "admin" })
        }
      </h1>

      {step === 0 &&
        <center>Register API key, view API statistics and charts.</center>
      }

      {step === 2 &&
        <AdminTabs name="mainTabs" tab="account" />
      }

      <br />
      <div className='center'>
        {(step === 0 || step === 1) &&
          <div className="input-validation" style={{ margin: "auto", width: "300px" }}>
            <input
              name="email"
              placeholder="Email address"
              value={email}
              onChange={onEmailChange}
              className="input-text"
              ref={node => { emailRef = node; }}
              spellCheck="false"
              disabled={step !== 0}
              autoFocus={step === 0}
            />
            {isEmailValid(email) && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
        }

        {step === 1 &&
          <div className="input-validation" style={{ margin: "auto", width: "300px", marginTop: "20px" }}>
            <input
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-text"
              ref={node => { passwordRef = node; }}
              spellCheck="false"
            />
            {password?.length > 8 && <img src={checkmark} className="validation-icon" alt="validated" />}
          </div>
        }

        {step === 0 &&
          <>
            <br />
            <div style={{ height: "65px" }}>
              <Turnstile
                siteKey={siteKey}
                style={{ margin: "auto" }}
                options={{
                  theme,
                  language: turnstileSupportedLanguages.includes(i18n.language) ? i18n.language : 'en',
                }}
                onSuccess={setToken}
              />
            </div>
            <br />
            <center>
              <div style={{ display: "inline-block", marginBottom: "20px" }}>
                <CheckBox checked={termsAccepted} setChecked={setTermsAccepted} >
                  I agree with the <Link href="/terms-api-bots" target="_blank">API & Bots terms of use</Link>.
                </CheckBox>
              </div>
            </center>
          </>
        }

        {step === 2 &&
          <>
            {loggedUserData &&
              <table className='table-large shrink'>
                <tbody>
                  <tr>
                    <td className='right'>E-mail</td>
                    <td className='left'><b>{loggedUserData.email}</b></td>
                  </tr>
                  <tr>
                    <td className='right'>Registered</td>
                    <td className='left'>{new Date(loggedUserData.created_at).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className='right'>Bithomp Pro</td>
                    <td className='left'>
                      {checkedPackageData ?
                        <>
                          {packageData ?
                            <>
                              <b className="green">Active</b> until {new Date(packageData.expiredAt * 1000).toLocaleDateString()}
                            </>
                            :
                            "not activated"
                          }
                        </>
                        :
                        "loading status..."
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            }
          </>
        }
        <br />
        {errorMessage ?
          <div className='center orange bold'>
            {errorMessage}
          </div>
          :
          <br />
        }

        {(step === 0 || step === 1) &&
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
        }

        {step === 2 &&
          <>
            <br />
            <button
              className={"button-action"}
              onClick={onLogOut}
            >
              Log out
            </button>
          </>
        }
      </div>
    </div>
  </>
}
