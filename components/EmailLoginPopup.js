import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { Turnstile } from '@marsidev/react-turnstile'
import { useTheme } from './Layout/ThemeContext'
import Link from 'next/link'
import { axiosAdmin } from '../utils/axios'
import { isEmailValid, turnstileSupportedLanguages } from '../utils'
import CheckBox from './UI/CheckBox'

const checkmark = '/images/checkmark.svg'

export default function EmailLoginPopup({ isOpen, onClose, onSuccess, setAccount, setProExpire, setSessionToken }) {
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()
  const [siteKey, setSiteKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [token, setToken] = useState('') // CL token
  const [authToken, setAuthToken] = useState('') // our site auth token
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const checkApi = async () => {
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
    if (isOpen) {
      checkApi()
      setStep(0)
      setErrorMessage('')
      setEmail('')
      setPassword('')
      setToken('')
      setTermsAccepted(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const getLoggedUserData = async () => {
    const data = await axiosAdmin.get('user').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    if (data?.data) {
      setAccount({ ...data.data, pro: data.data.email })
    }

    const partnerDataRaw = await axiosAdmin.get('partner').catch((error) => {
      if (error.response?.data?.error === 'errors.token.required') {
        onClose()
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })

    if (partnerDataRaw?.data) {
      if (partnerDataRaw.data.bithompProPackageID) {
        const packageData = await axiosAdmin
          .get('partner/package/' + partnerDataRaw.data.bithompProPackageID)
          .catch((error) => {
            if (error.response?.data?.error === 'errors.token.required') {
              onClose()
              return
            }
            if (error && error.message !== 'canceled') {
              setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
            }
          })

        if (packageData?.data) {
          setProExpire(JSON.stringify(packageData.data.expiredAt * 1000))
        }
      } else {
        setProExpire('0')
      }
    }
  }

  let emailRef
  let passwordRef

  const onEmailChange = (e) => {
    let x = e.target.value
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
            onClose()
            return
          }
          if (error.response?.data?.error === 'Invalid captcha') {
            setErrorMessage('Captcha timeout, try again.')
          } else if (error && error.message !== 'canceled') {
            setErrorMessage(t(error.response.data.error || 'error.' + error.message))
          }
        })

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
      if (data?.status === 'success') {
        axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + data.token
        setStep(2)
        setErrorMessage('')
        setSessionToken(data.token)
        getLoggedUserData()
        onSuccess()
        onClose()
      }
    }
  }

  const handleClose = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="sign-in-form">
      <div className="sign-in-body center loginform">
        <div className="close-button" onClick={handleClose}></div>

        <div className="header">Bithomp Pro</div>

        {step === 0 && (
          <div>
            <br />
            <center>
              <b>Register</b> or <b>Sign In</b> to get started.
            </center>
          </div>
        )}

        <br />
        <div className="center" style={{ maxWidth: 300, margin: 'auto', padding: '0 20px' }}>
          {(step === 0 || step === 1) && (
            <div className="input-validation">
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
            <>
              <br />
              <div className="input-validation">
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
            </>
          )}

          {step === 0 && (
            <>
              <br />
              <div style={{ height: '65px' }}>
                {siteKey && (
                  <Turnstile
                    siteKey={siteKey}
                    style={{ margin: 'auto' }}
                    options={{
                      theme,
                      language: turnstileSupportedLanguages.includes(i18n.language) ? i18n.language : 'en'
                    }}
                    onSuccess={setToken}
                    onError={() => {
                      // ignore Turnstile errors
                    }}
                  />
                )}
              </div>
              <br />
              <div
                style={{
                  display: 'inline-block',
                  marginBottom: '20px',
                  textAlign: 'left',
                  width: '398px',
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
        </div>

        <br />
        {errorMessage ? (
          <div className="center">
            <span className="orange bold">{errorMessage}</span>
            {step === 1 && (
              <>
                <br />
                <br />
                <span className="link" onClick={() => setStep(0)}>
                  Change email.
                </span>
              </>
            )}
          </div>
        ) : (
          <>
            {step === 1 && (
              <>
                <br />
                <br />
                <br />
              </>
            )}
          </>
        )}

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
        <br />
        <br />
      </div>
    </div>
  )
}
