import axios from 'axios'
import { useTranslation, Trans } from 'next-i18next'
import {
  nativeCurrency,
  explorerName,
  ledgerName,
  turnstileSupportedLanguages,
  isTagValid,
  typeNumberOnly,
  devNet,
  isAddressValid,
  addAndRemoveQueryParams,
  removeQueryParams,
  addQueryParams,
  countriesTranslated
} from '../utils'
import { useTheme } from './Layout/ThemeContext'
import { useRouter } from 'next/router'

import AddressInput from './UI/AddressInput'
import FormInput from './UI/FormInput'
import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect, useState } from 'react'
import { addressLink, amountFormat, capitalize, duration, fullNiceNumber } from '../utils/format'
import { LedgerLink, LinkTx } from '../utils/links'
import Link from 'next/link'
import Image from 'next/image'
import { errorCodeDescription } from '../utils/transaction'

const convertToDrops = (amount) => {
  return parseInt(amount * 1000000).toString()
}

const maxAmount = 100 // in native currency
const defaultAmount = 10 // in native currency

export default function Faucet({ account, type, sessionTokenData, countryCode }) {
  const router = useRouter()
  const { address: queryAddress, amount: queryAmount, destinationTag: queryDestinationTag } = router.query

  const [data, setData] = useState({})
  const [address, setAddress] = useState(isAddressValid(queryAddress) ? queryAddress : account?.address)
  const [destinationTag, setDestinationTag] = useState(isTagValid(queryDestinationTag) ? queryDestinationTag : null)
  const [amount, setAmount] = useState(queryAmount ? convertToDrops(queryAmount) : convertToDrops(defaultAmount))
  const [siteKey, setSiteKey] = useState('')
  const [errorMessage, setErrorMessage] = useState()
  const [token, setToken] = useState()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [lastLedgerIndex, setLastLedgerIndex] = useState()
  const [resetKey, setResetKey] = useState(0)
  const [countries, setCountries] = useState(null)

  const { t, i18n } = useTranslation()
  const { theme } = useTheme()

  const testPayment = type === 'testPayment'

  const FAUCET_DENIED_COUNTRIES = [
    'BJ', // Benin
    'CM', // Cameroon
    'ID', // Indonesia
    'IN', // India
    'TG', // Togo
    'VN', // Vietnam

    'AF', // Afghanistan
    'BF', // Burkina Faso
    'BI', // Burundi
    'CD', // Democratic Republic of the Congo
    'CF', // Central African Republic
    'CG', // Republic of the Congo
    'CI', // Côte d’Ivoire
    'ET', // Ethiopia
    'GH', // Ghana
    'GM', // Gambia
    'GN', // Guinea
    'GW', // Guinea-Bissau
    'HT', // Haiti
    'KH', // Cambodia
    'LA', // Laos
    'LK', // Sri Lanka
    'LR', // Liberia
    'MG', // Madagascar
    'ML', // Mali
    'MM', // Myanmar
    'MZ', // Mozambique
    'NE', // Niger
    'NG', // Nigeria
    'NP', // Nepal
    'PH', // Philippines
    'PK', // Pakistan
    'RW', // Rwanda
    'SD', // Sudan
    'SL', // Sierra Leone
    'SN', // Senegal
    'SO', // Somalia
    'SS', // South Sudan
    'SY', // Syria
    'TD', // Chad
    'TZ', // Tanzania
    'UG', // Uganda
    'YE', // Yemen
    'ZM', // Zambia
    'ZW' // Zimbabwe
  ]

  const isCountryKnown = Boolean(countryCode)
  const isBlockedCountry = !isCountryKnown || FAUCET_DENIED_COUNTRIES.includes(countryCode)

  useEffect(() => {
    const loadCountries = async () => {
      const data = await countriesTranslated(i18n.language)
      setCountries(data)
    }
    loadCountries()
  }, [i18n.language])

  const countryName = (countryCode && countries?.getNameTranslated?.(countryCode)) || countryCode || 'Unknown'

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []

    if (address !== queryAddress && address !== account?.address) {
      if (isAddressValid(address)) {
        queryAddList.push({
          name: 'address',
          value: address
        })
      } else {
        queryRemoveList.push('address')
      }
    }

    if (destinationTag !== queryDestinationTag) {
      if (isTagValid(destinationTag)) {
        queryAddList.push({
          name: 'destinationTag',
          value: destinationTag
        })
      } else {
        queryRemoveList.push('destinationTag')
      }
    }

    if (amount !== convertToDrops(queryAmount) && amount !== convertToDrops(defaultAmount)) {
      if (amount) {
        queryAddList.push({
          name: 'amount',
          value: amount / 1000000
        })
      } else {
        queryRemoveList.push('amount')
      }
    } else {
      queryRemoveList.push('amount')
    }

    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, destinationTag, amount, account])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!account?.address) return
    if (address === queryAddress && isAddressValid(address)) return
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

    let data = { 'cf-turnstile-response': token, address }

    if (testPayment) {
      if (!lastLedgerIndex) {
        setErrorMessage('Please enter the Latest Ledger Index, you can find the number on the landing page')
        return
      }
      data.lastLedgerIndex = lastLedgerIndex
    } else {
      data.amount = amount
    }

    if (destinationTag) {
      data.destinationTag = parseInt(destinationTag)
    }

    if (sessionTokenData) {
      if (testPayment) {
        data.testPaymentSessionToken = sessionTokenData.testPaymentSessionToken
      } else {
        data.faucetSessionToken = sessionTokenData.faucetSessionToken
      }
    }

    setLoading(true)

    const endPoint = testPayment ? 'v2/testPayment' : 'v2/faucet'

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

    setResetKey(Date.now())

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
        setErrorMessage(
          response?.data?.message || errorCodeDescription(response?.data?.state) || t('error-occured', { ns: 'faucet' })
        )
      }
    }
  }

  const onAmountChange = (value) => {
    setErrorMessage('')
    let amountString = value
    if (!amountString || amountString < 0) return
    if (amountString > maxAmount) {
      setErrorMessage("The amount can't be more than " + maxAmount + ' ' + nativeCurrency)
    }
    amountString = convertToDrops(amountString)
    setAmount(amountString)
  }

  const setAddressValue = (value) => {
    //do not erase fetched names by updating the address in raw data
    if (!isAddressValid(address)) {
      setAddress(value)
    } else if (account?.address && account.address !== value) {
      setAddress(value)
    } else if (!isAddressValid(value)) {
      removeQueryParams(router, ['address'])
    } else {
      addQueryParams(router, [{ name: 'address', value }])
    }
  }

  return (
    <>
      {(step === 0 || !testPayment) && (
        <>
          {testPayment ? (
            <p className="center">{t('experience-fast-transactions', { ns: 'faucet', explorerName })}</p>
          ) : (
            <p>{t('faucet-description', { ns: 'faucet', explorerName, nativeCurrency, ledgerName, devNet })}</p>
          )}
          {!devNet && isBlockedCountry ? (
            <div className="content-text content-center">
              {!isCountryKnown ? (
                <p className="center">Please wait...</p>
              ) : (
                <>
                  <p className="center">
                    Your country: <b>{countryName}</b>
                  </p>

                  <p className="center">This page is not available in your country.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div>
                <AddressInput
                  title={t('table.address')}
                  placeholder={t('form.placeholder.enter-address', { ns: 'faucet', ledgerName })}
                  setInnerValue={setAddressValue}
                  rawData={
                    address === account?.address
                      ? {
                          address,
                          addressDetails: { username: account?.username, service: account?.service }
                        }
                      : address === queryAddress && isAddressValid(queryAddress)
                      ? { address }
                      : {}
                  }
                  type="address"
                  hideButton={true}
                />
                <div className="form-spacing" />
                <FormInput
                  title={t('table.destination-tag')}
                  placeholder={t('form.placeholder.destination-tag')}
                  setInnerValue={setDestinationTag}
                  hideButton={true}
                  onKeyPress={typeNumberOnly}
                  defaultValue={destinationTag}
                />
                {testPayment ? (
                  <div>
                    <div className="form-spacing" />
                    <FormInput
                      title={
                        <>
                          <Image src="/images/pages/faucet/lastLedgerIndex.png" alt="Ledger" width={141} height={55} />{' '}
                          <Trans
                            i18nKey="last-ledger-index-find-on-landing-page"
                            ns="faucet"
                            components={[
                              <strong key="strong" />,
                              <Link key="link" href="/" passHref>
                                <a />
                              </Link>
                            ]}
                          />
                        </>
                      }
                      placeholder={t('form.placeholder.enter-latest-ledger-index', { ns: 'faucet' })}
                      setInnerValue={setLastLedgerIndex}
                      hideButton={true}
                      onKeyPress={typeNumberOnly}
                      maxLength={10}
                      min={0}
                      type="text"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="form-spacing" />
                    <FormInput
                      title={capitalize(t('enter-amount', { ns: 'faucet', nativeCurrency, devNet, maxAmount }))}
                      placeholder={'Enter amount in ' + nativeCurrency}
                      setInnerValue={onAmountChange}
                      hideButton={true}
                      onKeyPress={typeNumberOnly}
                      defaultValue={amount / 1000000}
                      maxLength={35}
                      min={0}
                      type="text"
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
                        key={resetKey}
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
                      <br />
                      <button
                        className="center button-action"
                        disabled={
                          !token ||
                          !isAddressValid(address) ||
                          loading ||
                          (Number(amount) > maxAmount * 1000000 && !testPayment)
                        }
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
                      {amountFormat(data.amount, { noSpaces: true })})
                    </>
                  ) : (
                    <b className="green">{amountFormat(data.amount, { noSpaces: true })}</b>
                  )}
                </p>
              )}
              {data.fee && (
                <p>
                  {t('table.fee', { ns: 'faucet' })}: <b className="green">{data.fee} drops</b> (
                  {amountFormat(data.fee, { noSpaces: true })})
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
                  {t('table.transaction-hash', { ns: 'faucet' })}: <LinkTx tx={data.hash} />
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
