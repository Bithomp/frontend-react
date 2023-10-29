import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import axios from 'axios'
import { useTheme } from '../../components/Layout/ThemeContext'

import SEO from '../../components/SEO'

import { isEmailValid } from '../../utils'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

const turnstileSypportedLanguages = ['ar-EG', 'de', 'en', 'es', 'fa', 'fr', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt-BR', 'ru', 'tr', 'zh-CN', 'zh-TW']
const checkmark = '/images/checkmark.svg'

export default function Admin() {
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

  const getLoggedUserData = async () => {
    const userData = await axios.get(
      'partner/user',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
      }
    })

    setLoggedUserData(userData?.data)
    /*
      {
        "id": 2,
        "created_at": "2023-10-13T10:22:08.000Z",
        "updated_at": "2023-10-13T10:22:08.000Z",
        "email": "bakshayev@gmail.com"
      }
    */
  }

  let emailRef
  let passwordRef

  const onEmailChange = e => {
    let x = e.target.value
    x = x.trim()
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
          setErrorMessage(t("error." + error.message))
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
    <div className="page-admin content-text">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>
      <div className='center' style={{ height: "300px" }}>

        {(step === 0 || step === 1) &&
          <div className="input-validation" style={{ margin: "auto", width: "300px" }}>
            <input
              placeholder="Email address"
              value={email}
              onChange={onEmailChange}
              className="input-text"
              ref={node => { emailRef = node; }}
              spellCheck="false"
              disabled={step !== 0}
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
                  language: turnstileSypportedLanguages.includes(i18n.language) ? i18n.language : 'en',
                }}
                onSuccess={setToken}
              />
            </div>
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
              className={"button-action" + ((!token || !email || !isEmailValid(email)) ? " disabled" : "")}
              onClick={onLogin}
            >
              Submit
            </button>
          </>
        }

        {step === 2 &&
          <div className="center">
            {loggedUserData &&
              <table className='table-large shrink'>
                <tbody>
                  <tr>
                    <td className='right'>User ID</td>
                    <td className='left'><b>{loggedUserData.id}</b></td>
                  </tr>
                  <tr>
                    <td className='right'>Signed</td>
                    <td> {loggedUserData.created_at}</td>
                  </tr>
                </tbody>
              </table>
            }
            <br />
            <button
              className={"button-action"}
              onClick={onLogOut}
            >
              log out
            </button>
          </div>
        }
      </div>
    </div>
  </>
}
