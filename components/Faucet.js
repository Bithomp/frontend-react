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
  useWidth,
  typeNumberOnly,
  devNet,
  capitalize
} from '../utils'
import { useTheme } from './Layout/ThemeContext'

import AddressInput from './UI/AddressInput'
import FormInput from './UI/FormInput'
import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect, useState } from 'react'
import { addressLink, amountFormat, duration, fullNiceNumber, shortHash } from '../utils/format'
import { LedgerLink } from '../utils/links'

export default function Converter({ account, type }) {
  const [data, setData] = useState({})
  const [address, setAddress] = useState(account?.address)
  const [destinationTag, setDestinationTag] = useState(null)
  const [amount, setAmount] = useState('100000000')
  const [siteKey, setSiteKey] = useState('')
  const [errorMessage, setErrorMessage] = useState()
  const [token, setToken] = useState()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const width = useWidth()

  const testPayment = type === 'testPayment'

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!account?.address) return
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
    setData({})
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

    if (!testPayment) {
      data.amount = amount
    }

    const endPoint = testPayment ? 'v2/testPayment' : 'xrpl/faucet'

    const response = await axios.post(endPoint, data).catch((error) => {
      if (error.response?.data?.error === 'Invalid captcha') {
        setErrorMessage('Captcha timeout, try again.')
      } else if (error && error.message !== 'canceled') {
        setErrorMessage(t('error.' + error.message))
      }
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
      } else if (response?.data?.state === 'tecNO_DST_INSUF_XRP') {
        setErrorMessage('The destination address is not activated, send a larger amount to activate it!')
      } else {
        setErrorMessage(response?.data?.message || response?.data?.state || t('error-occured', { ns: 'faucet' }))
      }
    }
  }

  const onAmountChange = (e) => {
    setErrorMessage('')
    let amountString = e.target.value
    if (!amountString || amountString < 0) return
    if (amountString > 100) {
      setErrorMessage("The amount can't be more than 100 " + nativeCurrency)
      return
    }
    amountString = (amountString * 1000000).toString()
    setAmount(amountString)
  }

  return (
    <>
      {testPayment && <h2 className="center">{t('test-the-speed', { ns: 'faucet', explorerName })}</h2>}
      {(step === 0 || !testPayment) && (
        <>
          {testPayment && <p className="center">{t('experience-fast-transactions', { ns: 'faucet', explorerName })}</p>}
          <div>
            <AddressInput
              title={t('table.address')}
              placeholder={t('form.placeholder.enter-address', { ns: 'faucet', ledgerName })}
              setInnerValue={setAddress}
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
            {!testPayment && (
              <div>
                {width > 1100 && <br />}
                <span className="input-title">
                  {capitalize(devNet)} {nativeCurrency} amount (maximum: 100 {nativeCurrency})
                </span>
                <input
                  placeholder={'Enter amount in ' + nativeCurrency}
                  onChange={onAmountChange}
                  onKeyPress={typeNumberOnly}
                  className="input-text"
                  spellCheck="false"
                  maxLength="35"
                  min="0"
                  type="text"
                  inputMode="decimal"
                  defaultValue="100"
                />
              </div>
            )}
          </div>
          <div>
            {testPayment && (
              <>
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
                    <b>{t('get-instant-feedback', { ns: 'faucet' })}</b>:{' '}
                    {t('see-if-payment-succeeded', { ns: 'faucet' })}
                  </li>
                  {/*
                  <li>
                    <b>Get Daily Statistics</b>: See the day's stats, including the total number of transactions, the total
                    amount sent, and the fees paid.
                  </li>
                  */}
                  <li>
                    <b>{t('daily-testing-limit', { ns: 'faucet' })}</b>:{' '}
                    {t('can-test-only-once-per-day', { ns: 'faucet' })}
                  </li>
                </ul>
              </>
            )}
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
                    disabled={!token || !isAddressValid(address) || loading}
                    onClick={onSubmit}
                  >
                    {testPayment
                      ? t('button.test-now', { ns: 'faucet' })
                      : 'Get ' + explorerName + ' ' + nativeCurrency}
                  </button>
                </>
              )}
              {testPayment && <p>{t('try-it-now', { ns: 'faucet', nativeCurrency })}</p>}
            </center>
          </div>
        </>
      )}
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
      {step === 1 && data.state && (
        <div>
          {!errorMessage && (
            <>
              <h3 className="center">{testPayment ? t('test-completed', { ns: 'faucet' }) : 'Submitted'}</h3>
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
                  {t('table.amount')}:{' '}
                  {testPayment ? (
                    <>
                      <b className="green">{fullNiceNumber(data.amount)} drops</b> (
                      {amountFormat(data.amount, 6)?.trim()})
                    </>
                  ) : (
                    <b className="green">{amountFormat(data.amount, 6)?.trim()}</b>
                  )}
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
              {data.hash && (
                <p>
                  {t('table.transaction-hash', { ns: 'faucet' })}:{' '}
                  <a href={server + '/explorer/' + data.hash}>{shortHash(data.hash)}</a>
                </p>
              )}
              {address && (
                <p>
                  {t('table.address')}: {addressLink(address)}
                </p>
              )}
            </>
          )}
        </div>
      )}
      {errorMessage && (
        <div className="center">
          <br />
          <span className="bold red center">{errorMessage}</span>
        </div>
      )}
    </>
  )
}
