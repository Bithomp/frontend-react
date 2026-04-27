import axios from 'axios'
import SEO from '../../components/SEO'
import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { explorerName, ledgerName, turnstileSupportedLanguages, xahauNetwork } from '../../utils'

const COOLDOWN_SECONDS = 10

const normalizeDomain = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  return trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').toLowerCase()
}

const isDomainValid = (value) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(value)

const formatResponse = (value) => {
  if (typeof value === 'string') return value
  if (value == null) return ''

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'toml-checker']))
    }
  }
}

export default function TomlCheckerPage() {
  const { t, i18n } = useTranslation(['common', 'toml-checker'])
  const tt = (key, options) => t(key, { ns: 'toml-checker', ...options })
  const tomlName = xahauNetwork ? 'xahau.toml' : 'xrp-ledger.toml'

  const [domain, setDomain] = useState('')
  const [siteKey, setSiteKey] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState(null)
  const [cooldownUntil, setCooldownUntil] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchCaptcha = async () => {
      const response = await axios.get('client/captcha').catch(() => null)
      if (cancelled) return

      const nextSiteKey = response?.data?.captcha?.siteKey
      if (nextSiteKey) setSiteKey(nextSiteKey)
    }

    fetchCaptcha()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cooldownUntil) return undefined

    const interval = setInterval(() => {
      if (Date.now() >= cooldownUntil) setCooldownUntil(0)
    }, 250)

    return () => clearInterval(interval)
  }, [cooldownUntil])

  const cooldownLeft = useMemo(() => {
    if (!cooldownUntil) return 0
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  }, [cooldownUntil])

  const onSubmit = async (e) => {
    e.preventDefault()

    const normalizedDomain = normalizeDomain(domain)
    setErrorMessage('')
    setResult(null)

    if (!isDomainValid(normalizedDomain)) {
      setErrorMessage(tt('errors.invalid-domain'))
      return
    }

    if (!turnstileToken) {
      setErrorMessage(tt('errors.captcha-required'))
      return
    }

    setLoading(true)

    const response = await axios
      .post('v2/domainVerification', {
        domain: normalizedDomain,
        'cf-turnstile-response': turnstileToken
      })
      .catch((error) => {
        setErrorMessage(error?.response?.data?.error || tt('errors.failed'))
        return null
      })

    setLoading(false)
    setTurnstileToken('')
    setTurnstileResetKey((value) => value + 1)
    setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000)

    const data = response?.data
    if (!data) return

    if (data.error) {
      setErrorMessage(data.error)
      return
    }

    setDomain(normalizedDomain)
    setResult(data)
  }

  return (
    <>
      <SEO
        title={tt('title', { explorerName })}
        description={tt('description', { explorerName, ledgerName, tomlName })}
      />
      <div className="content-text content-center">
        <h1 className="center">{tt('title', { explorerName })}</h1>
        <p className="center">{tt('description', { explorerName, ledgerName, tomlName })}</p>

        <div className="grey-box" style={{ maxWidth: 860, margin: '24px auto', textAlign: 'left' }}>
          <h4>{tt('check-title')}</h4>
          <p>{tt('check-description', { tomlName })}</p>

          <form onSubmit={onSubmit}>
            <input
              className="input-text"
              type="text"
              placeholder={tt('domain-placeholder')}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              autoComplete="off"
              spellCheck="false"
              style={{ width: '100%', marginBottom: 16 }}
            />

            {siteKey && (
              <div style={{ marginBottom: 16 }}>
                <Turnstile
                  key={turnstileResetKey}
                  siteKey={siteKey}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                  options={{
                    theme: 'light',
                    language: turnstileSupportedLanguages.includes(i18n.language) ? i18n.language : 'en'
                  }}
                />
              </div>
            )}

            <button className="button-action" type="submit" disabled={loading || cooldownLeft > 0 || !siteKey}>
              {loading ? tt('checking') : tt('button')}
            </button>

            <p style={{ marginTop: 16, marginBottom: 0 }}>
              {cooldownLeft > 0 ? tt('cooldown-left', { seconds: cooldownLeft }) : tt('cooldown-note')}
            </p>
          </form>

          {errorMessage && (
            <div className="red" style={{ marginTop: 16 }}>
              {errorMessage}
            </div>
          )}
        </div>

        {result && (
          <div className="grey-box" style={{ maxWidth: 860, margin: '24px auto', textAlign: 'left' }}>
            <h4>{tt('result-title')}</h4>

            <div style={{ marginBottom: 16 }}>
              <b>{tt('fields.domain')}</b>
              <div>{result.domain || '-'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <b>{tt('fields.tomlfile')}</b>
              <div>
                {result.tomlfile ? (
                  <a href={result.tomlfile} target="_blank" rel="noreferrer">
                    {result.tomlfile}
                  </a>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <b>{tt('fields.toml')}</b>
              <pre className="toml-checker-pre">{formatResponse(result.toml)}</pre>
            </div>

            <div>
              <b>{tt('fields.rawtoml')}</b>
              <pre className="toml-checker-pre">{formatResponse(result.rawtoml)}</pre>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .toml-checker-pre {
          margin: 8px 0 0;
          padding: 16px;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
          overflow-x: auto;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.04);
          font-size: 14px;
          line-height: 1.5;
        }
      `}</style>
    </>
  )
}
