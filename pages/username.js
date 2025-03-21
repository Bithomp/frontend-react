import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../utils/mobile'
import dynamic from 'next/dynamic'

import {
  isAddressValid,
  isUsernameValid,
  server,
  wssServer,
  addAndRemoveQueryParams,
  addQueryParams,
  encode,
  network,
  ledgerName
} from '../utils'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { address, username, receipt } = query
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      addressQuery: address || '',
      usernameQuery: username || '',
      receiptQuery: receipt || 'false',
      ...(await serverSideTranslations(locale, ['common', 'username']))
    }
  }
}

import CheckBox from '../components/UI/CheckBox'
import Receipt from '../components/Receipt'
import SEO from '../components/SEO'

const CountrySelect = dynamic(() => import('../components/UI/CountrySelect'), { ssr: false })

const checkmark = '/images/checkmark.svg'

let interval
let ws = null

const serviceAvailable = network === 'mainnet' || network === 'staging'

export default function Username({ setSignRequest, account, signOut, addressQuery, usernameQuery, receiptQuery }) {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const [address, setAddress] = useState('')
  const [username, setUsername] = useState('')
  const [receipt, setReceipt] = useState(false)
  const [agreeToPageTerms, setAgreeToPageTerms] = useState(false)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [register, setRegister] = useState({})
  const [bidData, setBidData] = useState({})
  const [step, setStep] = useState(0)
  const [onRegistration, setOnRegistration] = useState(false)
  const [update, setUpdate] = useState(false)
  const [xamanUserToken, setXamanUserToken] = useState(null)

  let addressRef
  let usernameRef

  useEffect(() => {
    setXamanUserToken(localStorage.getItem('xamanUserToken'))
    let queryAddList = []
    let queryRemoveList = []
    if (!account) {
      if (isAddressValid(addressQuery)) {
        setAddress(addressQuery)
      } else {
        queryRemoveList.push('address')
      }
    }
    if (isUsernameValid(usernameQuery)) {
      setUsername(usernameQuery)
    } else {
      queryRemoveList.push('username')
    }
    if (receiptQuery === 'true') {
      setReceipt(true)
    } else {
      queryRemoveList.push('receipt')
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)

    //on component unmount
    return () => {
      setUpdate(false)
      clearInterval(interval)
      if (ws) ws.close()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (account?.address) {
      setAddress(account.address)
      addQueryParams(router, [
        {
          name: 'address',
          value: account.address
        }
      ])
    }
    setXamanUserToken(localStorage.getItem('xamanUserToken'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  useEffect(() => {
    if (step > 0) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    setErrorMessage('')
  }, [i18n.language])

  useEffect(() => {
    // show receipt
    if (receipt && username && address && countryCode) {
      onSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, username, address, countryCode])

  const onAddressChange = (e) => {
    let address = e.target.value
    address = address.replace(/[^0-9a-zA-Z.]/g, '')
    setAddress(address)
    let queryAddList = []
    let queryRemoveList = []
    if (isAddressValid(address)) {
      queryAddList.push({
        name: 'address',
        value: address
      })
      setErrorMessage('')
    } else {
      queryRemoveList.push('address')
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
  }

  const onUsernameChange = (e) => {
    let username = e.target.value
    username = username.replace(/[^0-9a-zA-Z.]/g, '')
    setUsername(username)
    let queryAddList = []
    let queryRemoveList = []
    if (isUsernameValid(username)) {
      queryAddList.push({
        name: 'username',
        value: username
      })
      setErrorMessage('')
    } else {
      queryRemoveList.push('username')
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
  }

  const onCancel = () => {
    setUpdate(false)
    clearInterval(interval)
    setStep(0)
    setOnRegistration(false)
    if (ws) ws.close()
  }

  const oneMore = () => {
    onCancel()
    signOut()
    setAddress('')
    setUsername('')
    setAgreeToPageTerms(false)
    setAgreeToPrivacyPolicy(false)
    setAgreeToSiteTerms(false)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
  }

  const onSubmit = async () => {
    if (!address) {
      setErrorMessage(t('error.address-empty', { ns: 'username' }))
      addressRef?.focus()
      return
    }

    if (!isAddressValid(address)) {
      setErrorMessage(t('error.address-invalid', { ns: 'username' }))
      addressRef?.focus()
      return
    }

    if (!username) {
      setErrorMessage(t('error.username-empty', { ns: 'username' }))
      usernameRef?.focus()
      return
    }

    if (!isUsernameValid(username)) {
      setErrorMessage(t('error.username-invalid', { ns: 'username' }))
      usernameRef?.focus()
      return
    }

    if (!receipt) {
      if (!agreeToPageTerms) {
        setErrorMessage(t('error.agree-terms-page', { ns: 'username' }))
        return
      }

      if (!agreeToSiteTerms) {
        setErrorMessage(t('error.agree-terms-site', { ns: 'username' }))
        return
      }

      if (!agreeToPrivacyPolicy) {
        setErrorMessage(t('error.agree-privacy-policy', { ns: 'username' }))
        return
      }
    }

    const postData = {
      bithompid: username,
      address,
      countryCode
    }
    const apiData = await axios.post('v1/bithompid', postData).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })

    const data = apiData?.data

    if (data?.invoiceId) {
      let serviceName = 'XRPL'
      if (data.userInfo) {
        if (data.userInfo.name) {
          serviceName = data.userInfo.name
        } else {
          serviceName = data.userInfo.domain
        }
      }
      setErrorMessage(t('error.address-hosted', { service: serviceName, ns: 'username' }))
      return
    }

    if (data?.error) {
      let addressInput = addressRef
      let usernameInput = usernameRef
      if (data.error === 'Username is already registered') {
        setErrorMessage(t('error.username-taken', { username, ns: 'username' }))
        usernameInput?.focus()
        return
      }
      if (data.error === 'Username can not be registered') {
        setErrorMessage(t('error.username-reserved', { username, ns: 'username' }))
        usernameInput?.focus()
        return
      }
      if (data.error === 'Bithompid is on registration') {
        setErrorMessage(t('error.username-hold', { username, ns: 'username' }))
        return
      }
      if (data.error === 'Address is invalid') {
        setErrorMessage(t('error.address-invalid', { ns: 'username' }))
        addressInput?.focus()
        return
      }
      if (data.error === 'Sorry, you already have a registered username on that address. Try another address') {
        setErrorMessage(t('error.address-done', { ns: 'username' }))
        addressInput?.focus()
        return
      }
      setErrorMessage(data.error)
      return
    }

    if (data?.bithompid) {
      setRegister(data)
      setErrorMessage('')
      // if partly paid, completed or receipt
      checkPayment(data.bithompid, data.sourceAddress, data.destinationTag)

      if (data.completedAt) {
        setStep(2)
        setOnRegistration(false)
      } else {
        if (account?.wallet && (xamanUserToken || account.wallet !== 'xaman') && data.destinationAddress) {
          setOnRegistration(true)
          setSignRequest({
            wallet: account.wallet,
            request: {
              TransactionType: 'Payment',
              Destination: data.destinationAddress,
              DestinationTag: data.destinationTag,
              Amount: (Math.ceil(data.amount * 100) * 10000).toString(),
              Memos: [
                {
                  Memo: {
                    MemoData: encode(t('memo', { ns: 'username' }) + ': ' + data.bithompid)
                  }
                }
              ]
            }
          })
        } else {
          setStep(1)
        }
        //no ws when completed / receipt, no api status check every minute
        setUpdate(true)
      }
    }
  }

  useEffect(() => {
    if (agreeToPageTerms || agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage('')
    }
  }, [agreeToPageTerms, agreeToSiteTerms, agreeToPrivacyPolicy])

  useEffect(() => {
    if (register.destinationTag && update) {
      interval = setInterval(
        () => checkPayment(register.bithompid, register.sourceAddress, register.destinationTag),
        60000
      )
      checkPaymentWs(register.bithompid, register.sourceAddress, register.destinationTag)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, register])

  const updateBid = (data) => {
    setBidData(data.bid)
    /* 
      setBidData({
        "bid": {
          "id": 933,
          "createdAt": 1658837571,
          "updatedAt": 1658840261,
          "bithompid": "testtest1",
          "address": "rpqVJrX7L4yx2vjYPpDC5DAGrdp92zcsMW",
          "destinationTag": 480657625,
          "action": "Registration",
          "status": "Partly paid",
          "price": 29.46,
          "totalReceivedAmount": 29.1,
          "currency": "XRP",
          "priceInSEK": 100,
          "country": "SE",
          "totalToPay": 29.46,
          "totalPayLeft": 0.35999999999999943
        },
        "transactions": [
          {
            "id": 365,
            "processedAt": 1658837750,
            "hash": "65FC5B4F3227D385CFFEEC7DC14493A59AB78FD112096877EB94CB4C24C12CD9",
            "ledger": 29798617,
            "type": "Payment",
            "sourceAddress": "rpqVJrX7L4yx2vjYPpDC5DAGrdp92zcsMW",
            "destinationAddress": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
            "destinationTag": 480657625,
            "amount": 29,
            "status": "Completed"
          }
        ]
      });
    */
    if (data.bid.status === 'Completed') {
      setStep(2)
      setOnRegistration(false)
      setUpdate(false)
      setErrorMessage('')
      clearInterval(interval)
      if (ws) ws.close()
      return
    }
    if (data.bid.status === 'Partly paid') {
      setPaymentErrorMessage(
        t('error.payment-partly', {
          received: data.bid.totalReceivedAmount,
          required: data.bid.price,
          currency: data.bid.currency
        })
      )
      return
    }
    if (data.bid.status === 'Timeout') {
      setStep(0)
      setUpdate(false)
      clearInterval(interval)
      if (ws) ws.close()
      return
    }
    if (data.error) {
      setErrorMessage(data.error)
    }
  }

  const checkPayment = async (username, address, destinationTag) => {
    const response = await axios(
      'v1/bithompid/' + username + '/status?address=' + address + '&dt=' + destinationTag
    ).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    const data = response.data
    if (data) {
      updateBid(data)
    }
  }

  const checkPaymentWs = (bithompid, address, destinationTag) => {
    if (!update) return
    ws = new WebSocket(wssServer)

    function sendData() {
      if (ws.readyState) {
        ws.send(JSON.stringify({ command: 'subscribe', bids: [{ bithompid, address, destinationTag }], id: 1 }))
      } else {
        setTimeout(sendData, 1000)
      }
    }

    ws.onopen = () => {
      sendData()
    }

    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      if (message) {
        updateBid(message)
      }
    }

    ws.onclose = () => {
      if (update) {
        checkPaymentWs(bithompid, address, destinationTag)
      }
    }
  }

  return (
    <>
      <SEO
        title={
          t('menu.usernames') + (usernameQuery ? ' ' + usernameQuery : '') + (addressQuery ? ' ' + addressQuery : '')
        }
      />
      <div className="page-username content-center">
        <h1 className="center">{t('menu.usernames')}</h1>
        {!step && (
          <>
            <p>
              <Trans ns="username" i18nKey="step0.text0">
                Bithomp <b>username</b> is a <b>public</b> username for your {{ ledgerName }} address.
              </Trans>
            </p>
            {serviceAvailable && (
              <>
                <p className="brake">
                  <Trans ns="username" i18nKey="step0.text1">
                    The username will be assosiated with your address on the bithomp explorer and in third-party
                    services which use bithomp <a href="https://docs.bithomp.com">API</a>. After the registration it
                    will become public - <b>anyone</b> will be able to see it. Your XRPL address will be accessable by:
                  </Trans>
                  {' ' + server}/account/{isUsernameValid(username) ? username : <i>username</i>}
                </p>
                <p>
                  <Trans ns="username" i18nKey="step0.text2">
                    The username <b>can not be changed or deleted</b>.
                  </Trans>
                </p>
                <p>{t('step0.only-one-for-address', { ns: 'username' })}</p>
                <p>{t('step0.address-you-control', { ns: 'username' })}</p>
                <p>{t('step0.pay-from-your-address', { ns: 'username' })}</p>
                <p>
                  <Trans ns="username" i18nKey="step0.text3">
                    The payment is for 100 Swedish kronor denominated in XRP. The payment for the username is{' '}
                    <b>not refundable</b>. If you pay more than requested, the exceeding amount will be counted as
                    donation and won't be refunded.
                  </Trans>
                </p>
                <p>
                  <b>{t('step0.please-note', { ns: 'username' })}</b> {t('step0.we-can-revoke', { ns: 'username' })}
                </p>
              </>
            )}
            {!account?.username || onRegistration ? (
              <>
                {account?.username && onRegistration ? (
                  <div className="center">
                    <span className="waiting"></span>
                    <br />
                    {t('general.loading')}
                  </div>
                ) : (
                  <>
                    {!serviceAvailable ? (
                      <p>
                        <Trans ns="username" i18nKey="step0.text4">
                          Usernames are now used cross-chain,{' '}
                          <a
                            href={
                              'https://bithomp.com/' + (i18n.language !== 'en' ? i18n.language + '/' : '') + 'username'
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            register a username for an address on the XRPL mainnet
                          </a>{' '}
                          and it will be also available on other bithomp explorers.
                        </Trans>
                      </p>
                    ) : (
                      <>
                        {account?.address ? (
                          <>
                            <p>
                              {t('step0.your-address', { ns: 'username' })} (
                              <b className="link" onClick={signOut}>
                                {t('step0.sign-out', { ns: 'username' })}
                              </b>
                              ):
                            </p>
                            <div className="input-validation">
                              <input
                                placeholder={t('step0.your-address', { ns: 'username' })}
                                value={address}
                                className="input-text"
                                spellCheck="false"
                                readOnly
                              />
                              <img src={checkmark} className="validation-icon" alt="validated" />
                            </div>
                          </>
                        ) : (
                          <>
                            <p>
                              {t('step0.enter-address-or', { ns: 'username' })}{' '}
                              <b className="link" onClick={() => setSignRequest({})}>
                                {t('step0.sign-in', { ns: 'username' })}
                              </b>
                              :
                            </p>
                            <div className="input-validation">
                              <input
                                placeholder={t('step0.your-address', { ns: 'username' })}
                                value={address}
                                onChange={onAddressChange}
                                className="input-text"
                                ref={(node) => {
                                  addressRef = node
                                }}
                                spellCheck="false"
                                maxLength="36"
                              />
                              {isAddressValid(address) && (
                                <img src={checkmark} className="validation-icon" alt="validated" />
                              )}
                            </div>
                          </>
                        )}
                        <p>{t('step0.enter-username', { ns: 'username' })}:</p>
                        <div className="input-validation">
                          <input
                            placeholder={t('step0.your-username', { ns: 'username' })}
                            value={username}
                            onChange={onUsernameChange}
                            className="input-text"
                            ref={(node) => {
                              usernameRef = node
                            }}
                            spellCheck="false"
                            maxLength="18"
                          />
                          {isUsernameValid(username) && (
                            <img src={checkmark} className="validation-icon" alt="validated" />
                          )}
                        </div>
                        <p>{t('step0.enter-country', { ns: 'username' })}:</p>
                        <CountrySelect setCountryCode={setCountryCode} />

                        <CheckBox checked={agreeToPageTerms} setChecked={setAgreeToPageTerms}>
                          {t('step0.agree-terms-page', { ns: 'username' })}
                        </CheckBox>

                        <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms}>
                          <Trans ns="username" i18nKey="step0.agree-terms-site">
                            I agree with the{' '}
                            <Link href="/terms-and-conditions" target="_blank">
                              Terms and conditions
                            </Link>
                            .
                          </Trans>
                        </CheckBox>

                        <CheckBox checked={agreeToPrivacyPolicy} setChecked={setAgreeToPrivacyPolicy}>
                          <Trans ns="username" i18nKey="step0.agree-privacy-policy">
                            I agree with the{' '}
                            <Link href="/privacy-policy" target="_blank">
                              Privacy policy
                            </Link>
                            .
                          </Trans>
                        </CheckBox>

                        <p className="center">
                          <input
                            type="button"
                            value={t('button.continue')}
                            className="button-action"
                            onClick={onSubmit}
                          />
                        </p>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="bordered" style={{ padding: '20px' }}>
                {t('step0.already-registered', { ns: 'username' })}: <b>{account.username}</b>.
                <br />
                <Trans ns="username" i18nKey="step0.sign-out-to-register-another-one">
                  <b className="link" onClick={signOut}>
                    Sign out
                  </b>{' '}
                  from this account to register a username for a different address.
                </Trans>
              </p>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <p>
              {t('step1.to-register', { ns: 'username' })} <b>{register.bithompid}</b>
            </p>
            <p>
              {t('step1.from-your-address', { ns: 'username' })} <b>{register.sourceAddress}</b>.
              <br />
              <Trans ns="username" i18nKey="step1.text0">
                Payments made by you <b className="red">from any other addresses</b> or with a{' '}
                <b className="red">wrong destination tag</b> won't be accepted for the service, it will be accepted as a
                donation and <b className="red">won't be refunded</b>.
              </Trans>
            </p>

            <h3>{t('step1.payment-instructions', { ns: 'username' })}</h3>
            <div className="payment-instructions bordered">
              {t('step1.address', { ns: 'username' })}
              <br />
              <b>{register.destinationAddress}</b>
              <br />
              <br />
              {t('step1.tag', { ns: 'username' })}
              <br />
              <b className="red">{register.destinationTag}</b>
              <br />
              <br />
              {t('step1.amount', { ns: 'username' })}
              <br />
              <b>
                {register.amount} {register.currency}
              </b>
            </div>

            <h3>{t('step1.awaiting', { ns: 'username' })}</h3>
            <div className="payment-awaiting bordered center">
              <div className="waiting"></div>
              <br />
              <br />
              <p className="red center" dangerouslySetInnerHTML={{ __html: paymentErrorMessage || '&nbsp;' }} />
              {t('step1.about-confirmation', { ns: 'username' })}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="center">
              <Trans ns="username" i18nKey="step2.text0" values={{ username: register.bithompid }}>
                Congratulations! Your username <b className="blue">{{ username }}</b> has been succesfully registered.
              </Trans>
            </p>
            <p className="center bold">
              <Link href={'/account/' + register.bithompid}>
                {server}/account/{register.bithompid}
              </Link>
            </p>
            <Receipt item="username" details={bidData} />
            <br />
            <div className="center">
              <span className="link" onClick={oneMore}>
                {t('step2.one-more', { ns: 'username' })}
              </span>
            </div>
          </>
        )}
        <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || '&nbsp;' }} />
        {step === 1 && (
          <p className="center">
            <input type="button" value={t('button.cancel')} className="button-action" onClick={onCancel} />
          </p>
        )}
      </div>
    </>
  )
}
