import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { nativeCurrency, explorerName, turnstileSupportedLanguages, isAddressValid, server } from '../../utils'
import { useTheme } from '../../components/Layout/ThemeContext'

import AddressInput from '../UI/AddressInput'
import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect, useState } from 'react'
import { amountFormat, duration, shortHash } from '../../utils/format'
import { LedgerLink } from '../../utils/links'

export default function Converter({ account }) {
  const [data, setData] = useState({})
  const [address, setAddress] = useState(account?.address)
  const [siteKey, setSiteKey] = useState('')
  const [errorMessage, setErrorMessage] = useState()
  const [token, setToken] = useState()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const { t, i18n } = useTranslation()
  const { theme } = useTheme()

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
    if (!token) {
      return
    }

    if (!address) {
      setErrorMessage(t('form.error.address-empty'))
      return
    }

    setLoading(true)

    const data = { 'cf-turnstile-response': token, address }
    const response = await axios.post('v2/testPayment', data).catch((error) => {
      if (error && error.message !== 'canceled') {
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
          <p className="center">
            Experience how fast and easy it is to make transactions on the {explorerName} network!
          </p>
          <div>
            <AddressInput
              title={t('table.address')}
              placeholder={'Enter your ' + explorerName + ' address'}
              setValue={setAddress}
              rawData={{
                address: account?.address,
                addressDetails: { username: account?.username, service: account?.service }
              }}
              type="address"
              hideButton={true}
            />
          </div>
          <div>
            <p>How It Works:</p>
            <ul>
              <li>
                <b>Activated Wallet Required</b>: Ensure your wallet is activated.
              </li>
              <li>
                <b>Receive {nativeCurrency} Drops</b>: Get between 1 to 600 drops of {nativeCurrency}.
              </li>
              <li>
                <b>Get Instant Feedback</b>: See if the payment Succeeded or Failed. Find out the exact time it took to
                arrive, check the transaction fee, and get a transaction link to view the full details.
              </li>
              {/*
            <li>
              <b>Get Daily Statistics</b>: See the day's stats, including the total number of transactions, the total
              amount sent, and the fees paid.
            </li>
            */}
              <li>
                <b>Daily Testing Limit</b>: You can test it only once per day (one wallet per IP).
              </li>
            </ul>
            <center>
              {siteKey && (
                <>
                  {!token && (
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
                    </>
                  )}
                  <br />

                  <button
                    className="center button-action"
                    disabled={!token || !isAddressValid(address)}
                    onClick={onSubmit}
                  >
                    Test Now
                  </button>
                </>
              )}
              <p>Try it now and see how quickly {nativeCurrency} payments are processed!</p>
            </center>
          </div>
        </>
      )}
      {step === 1 && (
        <div>
          {errorMessage ? (
            <div className="center">
              <span className="bold red center">{errorMessage}</span>
            </div>
          ) : (
            <>
              <h3 className="center">Test completed!</h3>
              <p>
                Status:{' '}
                {data.state === 'validated' ? (
                  <span>
                    <b className="green">Validated</b> on the Ledger
                    {data.ledgerIndex && (
                      <>
                        {' '}
                        <LedgerLink version={data.ledgerIndex} />
                      </>
                    )}
                  </span>
                ) : (
                  data.state
                )}
              </p>
              {data.amount && (
                <p>
                  Amount: <b className="green">{data.amount} drops</b> ({amountFormat(data.amount, 6)?.trim()})
                </p>
              )}
              {data.fee && (
                <p>
                  Fee: <b className="green">{data.fee} drops</b> ({amountFormat(data.fee, 6)?.trim()})
                </p>
              )}
              {data.executionTime && (
                <p>
                  Confirmed within: <b className="green">{Math.ceil(data.executionTime / 10) / 100} seconds</b>
                </p>
              )}
              <p>
                Transaction hash: <a href={server + '/explorer/' + data.hash}>{shortHash(data.hash)}</a>
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}
