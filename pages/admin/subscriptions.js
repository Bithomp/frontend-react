import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { axiosAdmin } from '../../utils/axios'

import { useWidth, encode, wssServer, timestampExpired, addAndRemoveQueryParams } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { fullDateAndTime, shortNiceNumber, amountFormat, AddressWithIconFilled, addressLink } from '../../utils/format'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import BillingCountry from '../../components/Admin/BillingCountry'
import CopyButton from '../../components/UI/CopyButton'
import LinkIcon from '../../public/images/link.svg'
import Receipt from '../../components/Receipt'
import Tabs from '../../components/Tabs'
import Pro from '../../components/Admin/subscriptions/BithompPro'
import Api from '../../components/Admin/subscriptions/Api'
import ListTransactions from '../../components/ListTransactions'

//PayPal option starts
/*
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer
} from "@paypal/react-paypal-js"

const ButtonWrapper = ({ type }) => {
  const [{ options }, dispatch] = usePayPalScriptReducer()

  useEffect(() => {
    dispatch({
      type: "resetOptions",
      value: {
        ...options,
        intent: "subscription",
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  return (<PayPalButtons
    createSubscription={(data, actions) => {
      return actions.subscription
        .create({
          plan_id: "P-274307709T351962WMWF67RA",
        })
        .then((orderId) => {
          // Your code here after create the order
          return orderId
        })
    }}
    style={{
      label: "subscribe",
      layout: "vertical",
      color: "silver",
      tagline: false,
      height: 40
    }}
  />)
}

//https://paypal.github.io/react-paypal-js/?path=/docs/example-paypalbuttons--default

//PayPal option ends
*/

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { receipt, tab } = query
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      receiptQuery: receipt || 'false',
      tabQuery: tab || 'pro',
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

let interval
let ws = null

const typeName = (type) => {
  switch (type) {
    case 'bithomp_pro':
      return 'Bithomp Pro'
    case 'token':
      return 'API'
    case 'bot':
      return 'Bot'
    default:
      return type
  }
}

const tabTotype = (tab) => {
  switch (tab) {
    case 'pro':
      return 'bithomp_pro'
    case 'api':
      return 'token'
    case 'bot':
      return 'bot'
    default:
      return tab
  }
}

const packageList = (packages, width) => {
  return (
    <div style={{ textAlign: 'left' }}>
      {width > 600 ? (
        <table className="table-large no-hover">
          <thead>
            <tr>
              <th>Type</th>
              <th>Created</th>
              <th>Start</th>
              <th>Expire</th>
            </tr>
          </thead>
          <tbody>
            {packages?.map((row, index) => {
              return (
                <tr key={index}>
                  <td>{typeName(row.type)}</td>
                  <td>{fullDateAndTime(row.createdAt)}</td>
                  <td>{fullDateAndTime(row.startedAt)}</td>
                  <td>
                    {!row.expiredAt && row.metadata?.forever
                      ? 'Never'
                      : fullDateAndTime(row.expiredAt + 1, 'expiration')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <table className="table-mobile">
          <tbody>
            {packages?.map((row, index) => {
              return (
                <tr key={index}>
                  <td style={{ padding: '5px' }} className="center">
                    <b>{index + 1}</b>
                  </td>
                  <td>
                    <p>Type: {row.type}</p>
                    <p>
                      Created: <br />
                      {fullDateAndTime(row.createdAt)}
                    </p>
                    <p>
                      Start: <br />
                      {fullDateAndTime(row.startedAt)}
                    </p>
                    <p>
                      Expire: <br />
                      {!row.expiredAt && row.metadata?.forever ? 'Never' : fullDateAndTime(row.expiredAt + 1)}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

const subscriptionsTabList = [
  { value: 'pro', label: 'Bithomp Pro' },
  { value: 'api', label: 'API' }
]

export default function Subscriptions({
  setSignRequest,
  receiptQuery,
  tabQuery,
  setSubscriptionExpired,
  setProExpire
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true) // keep true in order not to have hydr error for rendering the select
  const [newAndActivePackages, setNewAndActivePackages] = useState([])
  const [expiredPackages, setExpiredPackages] = useState([])
  const [payPeriod, setPayPeriod] = useState('m3')
  const [tier, setTier] = useState('standard')
  const [payData, setPayData] = useState(null)
  const [billingCountry, setBillingCountry] = useState('')
  const [choosingCountry, setChoosingCountry] = useState(false)
  const [update, setUpdate] = useState(false)
  const [bidData, setBidData] = useState(null)
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('')
  const [step, setStep] = useState(0)
  const [subscriptionsTab, setSubscriptionsTab] = useState(tabQuery)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    getApiData()
    getTransactions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []
    if (subscriptionsTab === 'pro') {
      queryRemoveList.push('tab')
    } else {
      queryAddList.push({
        name: 'tab',
        value: subscriptionsTab
      })
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionsTab])

  const getTransactions = async () => {
    const response = await axiosAdmin.get('partner/transactions?limit=5').catch((error) => {
      if (error && error.message !== 'canceled') {
        console.log(error)
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        }
      }
    })
    if (response?.data) {
      setTransactions(response.data?.transactions)
      return response.data
    }
  }

  const getApiData = async () => {
    setLoading(true)
    setErrorMessage('')

    const packagesData = await axiosAdmin.get('partner/packages').catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response.data.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        }
      }
      setLoading(false)
    })

    if (packagesData?.data) {
      /*
        {
          "total": 1,
          "count": 1,
          "packages": [
            {
              "id": 5,
              "createdAt": 1710692670,
              "updatedAt": 1710692670,
              "startedAt": 1710633600,
              "expiredAt": 1711324799,
              "cancelledAt": null,
              "unlockedAt": null,
              "type": "bithomp_pro",
              "metadata": {}
            }
          ]
        }
      */

      //for each package, check if it is expired
      let newAndActive = []
      let expired = []
      packagesData.data.packages.forEach((packageItem) => {
        if (packageItem.expiredAt && timestampExpired(packageItem.expiredAt)) {
          expired.push(packageItem)
        } else {
          newAndActive.push(packageItem)
          if (packageItem.type === 'bithomp_pro') {
            setSubscriptionExpired(false)
            setProExpire(JSON.stringify(packageItem.expiredAt * 1000))
          }
        }
      })

      setNewAndActivePackages(newAndActive)
      setExpiredPackages(expired)
    }
    setLoading(false)
  }

  const onPurchaseClick = async () => {
    setPayData(null)
    const period = payPeriod.substring(0, 1) === 'm' ? 'month' : 'year'
    const periodCount = payPeriod.substring(1)

    let options = {
      type: tabTotype(subscriptionsTab),
      period,
      periodCount: 1 * periodCount
    }

    if (subscriptionsTab === 'api') {
      options.tier = tier
    }

    const paymentData = await axiosAdmin.post('partner/bids', options).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response.data.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        }
      }
    })

    if (paymentData?.data) {
      /*
        {
          "bid": {
            "id": 40155,
            "createdAt": 1710704288,
            "updatedAt": 1710704288,
            "destinationTag": 880260947,
            "action": "Pay for Bithomp Pro",
            "status": "Created",
            "price": 52.549528,
            "totalReceivedAmount": 0,
            "currency": "XRP",
            "priceInSEK": 338.02,
            "country": "BO",
            "priceInEUR": 30,
            "type": "bithomp_pro",
            "period": "month",
            "periodCount": 3,
            "partnerID": 44598
          },
          "transactions": []
        }
      */
      setPayData(paymentData?.data)
      updateBid(paymentData?.data)
      setUpdate(true)
      setStep(1)
    }
  }

  useEffect(() => {
    if (payData?.bid?.destinationTag && payData?.bid?.partnerID && update) {
      interval = setInterval(() => checkPayment(payData.bid.partnerID, payData.bid.destinationTag), 60000)
      checkPaymentWs(payData.bid.partnerID, payData.bid.destinationTag)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payData, update])

  useEffect(() => {
    setPayData(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payPeriod, tier, subscriptionsTab])

  const onCancel = () => {
    setUpdate(false)
    clearInterval(interval)
    setStep(0)
    setPayData(null)
    if (ws) ws.close()
  }

  const updateBid = (data) => {
    if (!data?.bid?.status) return

    setBidData(data)
    setPaymentErrorMessage('')
    /* 
        {
          "bid": {
            "id": 52,
            "createdAt": 1713180049,
            "updatedAt": 1713180071,
            "destinationTag": 978199589,
            "action": "Pay for Bithomp Pro",
            "status": "Completed",
            "price": 20.653049,
            "totalReceivedAmount": 20.66,
            "currency": "XRP",
            "priceInSEK": 115.7,
            "country": "SE",
            "completedAt": 1713180071,
            "txHash": "B900B65B243E473D1A06CBD53464D305156A7A691FF4AC1B14323AF17C389AC9",
            "priceInEUR": 10,
            "type": "bithomp_pro",
            "period": "month",
            "periodCount": 1
          },
          "transactions": [
            {
              "id": 46,
              "processedAt": 1713180071,
              "hash": "B900B65B243E473D1A06CBD53464D305156A7A691FF4AC1B14323AF17C389AC9",
              "ledger": 5933482,
              "type": "Payment",
              "sourceAddress": "raNf8ibQZECTaiFqkDXKRmM2GfdWK76cSu",
              "destinationAddress": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
              "destinationTag": 978199589,
              "amount": 20.66,
              "status": "Completed",
              "memos": "[{\"data\":\"Payment for Bithomp Pro (1 month)\"},{\"data\":\"xrplexplorer.com\"}]"
            }
        ]
      }
    */
    if (data.bid.status === 'Completed') {
      if (data.bid.type === 'bithomp_pro') {
        setSubscriptionExpired(false)
      }
      setStep(2)
      setUpdate(false)
      setErrorMessage('')
      clearInterval(interval)
      getApiData()
      getTransactions()
      if (ws) ws.close()
      return
    }
    if (data.bid.status === 'Partly paid') {
      getTransactions()
      setPaymentErrorMessage(
        t('error.payment-partly', {
          received: data.bid.totalReceivedAmount,
          required: shortNiceNumber(Math.ceil(data.bid.price * 100) / 100, 2, 2),
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

  const checkPayment = async (partnerId, destinationTag) => {
    const response = await axios('v2/bid/partner:' + partnerId + '/' + destinationTag + '/status').catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    const data = response.data
    if (data) {
      updateBid(data)
    }
  }

  const checkPaymentWs = (partnerId, destinationTag) => {
    if (!update) return

    function sendData() {
      if (ws.readyState) {
        ws.send(JSON.stringify({ command: 'subscribe', bids: [{ partnerID: partnerId, destinationTag }], id: 1 }))
      } else {
        setTimeout(sendData, 1000)
      }
    }

    ws = new WebSocket(wssServer)

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
        checkPaymentWs(partnerId, destinationTag)
      }
    }
  }

  return (
    <>
      <SEO title="Subscription" />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="subscriptions" />

        <div className="center">
          <BillingCountry
            billingCountry={billingCountry}
            setBillingCountry={setBillingCountry}
            choosingCountry={choosingCountry}
            setChoosingCountry={setChoosingCountry}
          />
          <br />
          <br />

          {!choosingCountry && (
            <>
              {loading && (
                <div className="center">
                  <br />
                  <br />
                  <span className="waiting"></span>
                  <br />
                  {t('general.loading')}
                  <br />
                  <br />
                </div>
              )}

              {newAndActivePackages?.length > 0 && (
                <>
                  <h4 className="center">Your active subscriptions</h4>
                  {packageList(newAndActivePackages, width)}
                </>
              )}

              {errorMessage && (
                <div className="center orange bold">
                  <br />
                  {errorMessage}
                </div>
              )}

              <Tabs
                tabList={subscriptionsTabList}
                tab={subscriptionsTab}
                setTab={setSubscriptionsTab}
                name="subscriptions"
                style={{ marginTop: '20px' }}
              />

              {!(!billingCountry || loading) && (
                <>
                  {step < 2 && (
                    <>
                      {subscriptionsTab === 'pro' && <Pro setPayPeriod={setPayPeriod} />}
                      {subscriptionsTab === 'api' && <Api setPayPeriod={setPayPeriod} setTier={setTier} tier={tier} />}

                      <button
                        className="button-action narrow"
                        onClick={onPurchaseClick}
                        style={{ height: '37px', marginLeft: '10px', marginTop: '20px' }}
                      >
                        Purchase
                      </button>

                      {/*
                    <h4>
                      Pay with PayPal - 1 Year, 100 EUR
                    </h4>

                    <div className='center' style={{ width: "350px", margin: "auto" }}>
                      <PayPalScriptProvider
                        options={{
                          clientId: "AcUlMvkL6Uc6OVv-USMK3fg2wZ_xEBolL0-yyzWkOnS7vF2aWbu_AJFYJxaRRfPoiN0SBEnSFHUTbSUn",
                          components: "buttons",
                          intent: "subscription",
                          vault: true,
                          locale: 'en_US'
                        }}
                      >
                        <ButtonWrapper type="subscription" />
                      </PayPalScriptProvider>
                    </div>
                  */}
                    </>
                  )}

                  <div className="center">
                    {payData && step === 1 && (
                      <>
                        <h4 className="center">Subscription payment details</h4>
                        {width > 600 ? (
                          <table className="table-large shrink">
                            <tbody>
                              <tr>
                                <td className="right">Address</td>
                                <td className="left">
                                  {payData.bid.destinationAddress} <CopyButton text={payData.bid.destinationAddress} />
                                </td>
                              </tr>
                              <tr>
                                <td className="right">Destination tag</td>
                                <td className="left bold">
                                  {payData.bid.destinationTag} <CopyButton text={payData.bid.destinationTag} />
                                </td>
                              </tr>
                              <tr>
                                <td className="right">Amount</td>
                                <td className="left">
                                  {shortNiceNumber(Math.ceil(payData.bid.price * 100) / 100, 2, 2)}{' '}
                                  {payData.bid.currency} <CopyButton text={payData.bid.price} />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : (
                          <div className="left">
                            <p>
                              Address: <br />
                              {payData.bid.destinationAddress} <CopyButton text={payData.bid.destinationAddress} />
                            </p>
                            <p>
                              Destination tag:
                              <br />
                              <b>{payData.bid.destinationTag}</b> <CopyButton text={payData.bid.destinationTag} />
                            </p>
                            <p>
                              Amount:
                              <br />
                              {shortNiceNumber(Math.ceil(payData.bid.price * 100) / 100, 2, 2)} {payData.bid.currency}{' '}
                              <CopyButton text={payData.bid.price} />
                            </p>
                            <table className="table-mobile">
                              <tbody></tbody>
                            </table>
                          </div>
                        )}
                        <p className="center">
                          <input
                            type="button"
                            value={t('button.cancel')}
                            className="button-action"
                            onClick={onCancel}
                          />

                          <button
                            className="button-action"
                            style={{ margin: '10px 10px 20px' }}
                            onClick={() =>
                              setSignRequest({
                                request: {
                                  TransactionType: 'Payment',
                                  Destination: payData.bid.destinationAddress,
                                  DestinationTag: payData.bid.destinationTag,
                                  Amount: (Math.ceil(payData.bid.price * 100) * 10000).toString(),
                                  Memos: [
                                    {
                                      Memo: {
                                        MemoData: encode(
                                          'Payment for ' +
                                            typeName(payData.bid.type) +
                                            (payData.bid.tier ? ' ' + payData.bid.tier.toUpperCase() : '') +
                                            ' (' +
                                            payData.bid.periodCount +
                                            ' ' +
                                            payData.bid.period +
                                            (payData.bid.periodCount > 1 ? 's' : '') +
                                            ')'
                                        )
                                      }
                                    }
                                  ]
                                }
                              })
                            }
                          >
                            Pay
                          </button>
                        </p>
                        <br />
                        Your Pro account will be activated when the payment is received.
                      </>
                    )}

                    {(receiptQuery === 'true' || step === 2) && (
                      <>
                        <p className="center orange">We have received your payment.</p>
                        {receiptQuery === 'false' && <Receipt item="subscription" details={bidData.bid} />}
                      </>
                    )}
                    {paymentErrorMessage && (
                      <p className="red center" dangerouslySetInnerHTML={{ __html: paymentErrorMessage || '&nbsp;' }} />
                    )}

                    {bidData?.transactions?.length > 0 && (
                      <div style={{ marginTop: '20px', textAlign: 'left' }}>
                        <h4 className="center">Transactions</h4>
                        {width > 600 ? (
                          <table className="table-large shrink">
                            <thead>
                              <tr>
                                <th>Date & Time</th>
                                <th>From</th>
                                <th>Amount</th>
                                <th>Tx</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bidData?.transactions?.map((payment, index) => {
                                return (
                                  <tr key={index}>
                                    <td>{fullDateAndTime(payment.processedAt)}</td>
                                    <td>
                                      <AddressWithIconFilled data={payment} name="sourceAddress" />
                                    </td>
                                    <td>{amountFormat(payment.amount * 1000000)}</td>
                                    <td>
                                      <a href={'/explorer/' + payment.hash}>
                                        <LinkIcon />
                                      </a>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <table className="table-mobile">
                            <tbody>
                              {bidData?.transactions?.map((payment, index) => {
                                return (
                                  <tr key={index}>
                                    <td style={{ padding: '5px' }} className="center">
                                      <b>{index + 1}</b>
                                    </td>
                                    <td>
                                      <p>{fullDateAndTime(payment.processedAt)}</p>
                                      <p>
                                        From: <br />
                                        {addressLink(payment.sourceAddress)}
                                      </p>
                                      <p>Amount: {amountFormat(payment.amount)}</p>
                                      <p>Fiat equivalent: {payment.fiatAmount}</p>
                                      <p>
                                        Transaction:{' '}
                                        <a href={'/explorer/' + payment.hash}>
                                          <LinkIcon />
                                        </a>
                                      </p>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {expiredPackages?.length > 0 && (
                <>
                  <h4 className="center">Your expired subscriptions</h4>
                  {packageList(expiredPackages, width)}
                </>
              )}

              {transactions?.length > 0 && (
                <div style={{ marginTop: '20px', textAlign: 'left' }}>
                  <h4 className="center">Your last payments</h4>
                  <ListTransactions transactions={transactions} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
