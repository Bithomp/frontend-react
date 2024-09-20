import axios from 'axios'
import { useTranslation, Trans } from 'next-i18next'
import {
  nativeCurrency,
  explorerName,
  ledgerName,
  turnstileSupportedLanguages,
  isAddressValid,
  server,
  isTagValid,
  useWidth
} from '../../utils'
import { useTheme } from '../../components/Layout/ThemeContext'

import AddressInput from '../UI/AddressInput'
import FormInput from '../UI/FormInput'
import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect, useState } from 'react'
import { amountFormat, duration, shortHash } from '../../utils/format'
import { LedgerLink } from '../../utils/links'

export default function Converter({ account }) {
  const [data, setData] = useState({})
  const [address, setAddress] = useState(account?.address)
  const [destinationTag, setDestinationTag] = useState(null)
  const [siteKey, setSiteKey] = useState('')
  const [errorMessage, setErrorMessage] = useState()
  const [token, setToken] = useState()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const width = useWidth()

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setAddress(account?.address)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  const fetchData = async () => {
    const siteKeyData = await axios.get('client/captcha').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t('error.' + error.message))
      }
    })

    const authData = siteKeyData?.data
    if (authData) {
      if (authData.captcha?.siteKey) setSiteKey(authData.captcha.siteKey)
    }
  }

  const onSubmit = async () => {
    setErrorMessage('')

    if (!token) {
      console.error('No token')
      return
    }

    if (!address) {
      setErrorMessage(t('form.error.address-empty'))
      return
    }

    if (destinationTag && !isTagValid(destinationTag)) {
      setErrorMessage(t('form.error.destination-tag-invalid'))
      return
    }

    setLoading(true)

    let data = { 'cf-turnstile-response': token, address }
    if (destinationTag) {
      data.destinationTag = parseInt(destinationTag)
    }
    const response = await axios.post('v2/testPayment', data).catch((error) => {
      if (error.response?.data?.error === 'Invalid captcha') {
        setErrorMessage('Captcha timeout, try again.')
      } else if (error && error.message !== 'canceled') {
        setErrorMessage(t('error.' + error.message))
      }
      setToken('')
      setLoading(false)
    })

    setLoading(false)

    setStep(1)

    if (response?.data?.success) {
      setData(response.data)
      /*
        {
          "success": true,
          "state": "validated",
          "hash": "680BC98CC17848F05EAAD1B3F8278282E49F1BBEB46C0E6C18CFE8C940597CDE",
          "executionTime": 4938
        }
      */
    } else {
      if (response?.data?.message === 'Too many requests') {
        /*
        {"success":false,"message":"Too many requests","timeLeft":85901}
        */
        let options = { seconds: false }
        if (response?.data?.timeLeft < 3600) {
          options.seconds = true
        }
        const time = duration(t, response?.data?.timeLeft, options)
        setErrorMessage(t('try-later', { ns: 'faucet', time }))
      } else {
        setErrorMessage(response?.data?.message || t('error-occured', { ns: 'faucet' }))
      }
    }
  }

  return (
    <>
      <h2 className="center">{t('test-the-speed', { ns: 'faucet', explorerName })}</h2>
      {loading && (
        <div className="center">
          <br />
          <span className="waiting"></span>
          <br />
          {t('general.loading')}
          <br />
          <br />
        </div>
      )}
      {step === 0 && !loading && (
        <>
          <p className="center">{t('experience-fast-transactions', { ns: 'faucet', explorerName })}</p>
          <div>
            <AddressInput
              title={t('table.address')}
              placeholder={t('form.placeholder.enter-address', { ns: 'faucet', ledgerName })}
              setValue={setAddress}
              rawData={{
                address: account?.address,
                addressDetails: { username: account?.username, service: account?.service }
              }}
              type="address"
              hideButton={true}
            />
            {width > 1100 && <br />}
            <FormInput
              title={t('table.destination-tag')}
              placeholder={t('form.placeholder.destination-tag')}
              setInnerValue={setDestinationTag}
              hideButton={true}
            />
          </div>
          <div>
            <p>{t('how-it-works', { ns: 'faucet' })}</p>
            <ul>
              <li>
                <b>{t('activated-wallet-required', { ns: 'faucet' })}</b>:{' '}
                {t('ensure-wallet-activated', { ns: 'faucet' })}
              </li>
              <li>
                <b>{t('receive-currency-drops', { ns: 'faucet', nativeCurrency })}</b>:{' '}
                {t('get-between-drops', { ns: 'faucet', nativeCurrency })}
              </li>
              <li>
                <b>{t('get-instant-feedback', { ns: 'faucet' })}</b>: {t('see-if-payment-succeeded', { ns: 'faucet' })}
              </li>
              {/*
              <li>
                <b>Get Daily Statistics</b>: See the day's stats, including the total number of transactions, the total
                amount sent, and the fees paid.
              </li>
              */}
              <li>
                <b>{t('daily-testing-limit', { ns: 'faucet' })}</b>: {t('can-test-only-once-per-day', { ns: 'faucet' })}
              </li>
            </ul>
            <center>
              {siteKey && (
                <>
                  <br />
                  <Turnstile
                    siteKey={siteKey}
                    style={{ margin: 'auto' }}
                    options={{
                      theme,
                      language: turnstileSupportedLanguages.includes(i18n.language) ? i18n.language : 'en'
                    }}
                    onSuccess={setToken}
                  />
                  <br />
                  <button
                    className="center button-action"
                    disabled={!token || !isAddressValid(address)}
                    onClick={onSubmit}
                  >
                    {t('button.test-now', { ns: 'faucet' })}
                  </button>
                </>
              )}
              <p>{t('try-it-now', { ns: 'faucet', nativeCurrency })}</p>
            </center>
          </div>
        </>
      )}
      {step === 1 && (
        <div>
          {!errorMessage && (
            <>
              <h3 className="center">{t('test-completed', { ns: 'faucet' })}</h3>
              <p>
                {t('table.status')}:{' '}
                {data.state === 'validated' ? (
                  <Trans i18nKey="validated-on-ledger" ns="faucet">
                    <b className="green">Validated</b> on the Ledger <LedgerLink version={data.ledgerIndex} />
                  </Trans>
                ) : (
                  data.state
                )}
              </p>
              {data.amount && (
                <p>
                  {t('table.amount')}: <b className="green">{data.amount} drops</b> (
                  {amountFormat(data.amount, 6)?.trim()})
                </p>
              )}
              {data.fee && (
                <p>
                  {t('table.fee', { ns: 'faucet' })}: <b className="green">{data.fee} drops</b> (
                  {amountFormat(data.fee, 6)?.trim()})
                </p>
              )}
              {data.executionTime && (
                <p>
                  <Trans i18nKey="confirmed-within-seconds" ns="faucet">
                    Confirmed within{' '}
                    <b className="green">{{ time: Math.ceil(data.executionTime / 10) / 100 }} seconds</b>
                  </Trans>
                </p>
              )}
              <p>
                {t('table.transaction-hash', { ns: 'faucet' })}:{' '}
                <a href={server + '/explorer/' + data.hash}>{shortHash(data.hash)}</a>
              </p>
            </>
          )}
        </div>
      )}
      {errorMessage && (
        <div className="center">
          <span className="bold red center">{errorMessage}</span>
        </div>
      )}
    </>
  )
}
