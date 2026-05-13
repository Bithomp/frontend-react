import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { axiosAdmin } from '../../utils/axios'

import { useWidth, encode, wssServer, timestampExpired, addAndRemoveQueryParams, useCookie } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { fullDateAndTime, shortNiceNumber, amountFormat, AddressWithIconFilled, addressLink } from '../../utils/format'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import BillingCountry from '../../components/Admin/BillingCountry'
import CopyButton from '../../components/UI/CopyButton'
import Receipt from '../../components/Receipt'
import Tabs from '../../components/Tabs'
import Pro from '../../components/Admin/subscriptions/BithompPro'
import Api from '../../components/Admin/subscriptions/Api'
import NotificationsBot from '../../components/Admin/subscriptions/NotificationsBot'
import ListTransactions from '../../components/ListTransactions'
import { LinkTx } from '../../utils/links'
import { bidFullServiceName, bidTypeToName } from '../../utils/bids'
import { ALERT_PLAN_TIERS } from '../../utils/notificationPlans'

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
let paymentTracking = false

const tabTotype = (tab) => {
  switch (tab) {
    case 'pro':
      return 'bithomp_pro'
    case 'api':
      return 'token'
    case 'notifications':
      return 'bot'
    case 'bot':
      return 'bot'
    default:
      return tab
  }
}

const normalizeSubscriptionsTab = (tab) => {
  if (tab === 'bot') return 'notifications'
  return ['pro', 'api', 'notifications'].includes(tab) ? tab : 'pro'
}

const tierValue = (row) => {
  const value = row?.metadata?.tier || ''
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

const botLimitLabel = (metadata = {}, t) => {
  const parts = []

  if (typeof metadata.connections === 'number') {
    parts.push(t('notifications.limit.channels', { count: metadata.connections }))
  }

  if (typeof metadata.listeners === 'number') {
    parts.push(t('notifications.limit.rules', { count: metadata.listeners }))
  }

  return parts.join(' / ')
}

const tierLabel = (row, t) => {
  if (!['bot', 'token'].includes(row?.type)) return ''

  const tier = tierValue(row)

  if (row.type === 'bot') {
    return tier ? t(`plans.${tier}`, { defaultValue: ALERT_PLAN_TIERS[tier]?.label || tier }) : botLimitLabel(row?.metadata, t)
  }

  return tier ? t(`plans.${tier}`, { defaultValue: tier }) : ''
}

const packageList = (packages, t, status = 'active') => {
  return (
    <div className="subscription-package-list">
      {packages?.map((row) => {
        const tier = tierLabel(row, t)
        const expires = !row.expiredAt && row.metadata?.forever
          ? t('common.never')
          : fullDateAndTime(row.expiredAt + 1, 'expiration')

        return (
          <article
            className={`subscription-package-card ${status === 'expired' ? 'is-expired' : 'is-active'}`}
            key={row.id || `${row.type}-${row.startedAt}`}
          >
            <div className="subscription-package-card-header">
              <div>
                <span className="subscription-package-eyebrow">
                  {status === 'expired' ? t('subscriptions.expired-title') : t('subscriptions.active-title')}
                </span>
                <h3>{bidTypeToName(row.type)}</h3>
              </div>
              {tier && <span className="subscription-package-tier">{tier}</span>}
            </div>
            <dl className="subscription-package-card-grid">
              <div>
                <dt>{t('table.created')}</dt>
                <dd>{fullDateAndTime(row.createdAt)}</dd>
              </div>
              <div>
                <dt>{t('table.start')}</dt>
                <dd>{fullDateAndTime(row.startedAt)}</dd>
              </div>
              <div>
                <dt>{t('table.expire')}</dt>
                <dd>{expires}</dd>
              </div>
            </dl>
          </article>
        )
      })}
    </div>
  )
}

export default function Subscriptions({
  setSignRequest,
  receiptQuery,
  tabQuery,
  setSubscriptionExpired,
  setProExpire,
  sessionToken,
  openEmailLogin
}) {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const width = useWidth()

  const [ref] = useCookie('ref')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
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
  const [subscriptionsTab, setSubscriptionsTab] = useState(normalizeSubscriptionsTab(tabQuery))
  const [transactions, setTransactions] = useState([])
  const [receiptVisible, setReceiptVisible] = useState(receiptQuery === 'true')
  const subscriptionsTabList = useMemo(
    () => [
      { value: 'pro', label: 'Bithomp Pro' },
      { value: 'api', label: 'API' },
      { value: 'notifications', label: t('tabs.alerts-bot', { ns: 'admin' }) }
    ],
    [t]
  )
  const selectedPackageType = tabTotype(subscriptionsTab)

  useEffect(() => {
    if (sessionToken) {
      getTransactions(selectedPackageType)
    } else {
      setTransactions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, selectedPackageType])

  useEffect(() => {
    if (sessionToken) {
      getApiData(selectedPackageType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, selectedPackageType])

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

  const getTransactions = async (packageType = selectedPackageType) => {
    setTransactions([])

    const response = await axiosAdmin.get(`partner/transactions?limit=5&packageType=${encodeURIComponent(packageType)}`).catch((error) => {
      if (error && error.message !== 'canceled') {
        console.log("ERROR: can't get partner's transactions")
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        }
      }
    })
    if (response?.data) {
      setTransactions(Array.isArray(response.data?.transactions) ? response.data.transactions : [])
      return response.data
    }
  }

  const getApiData = async (packageType = selectedPackageType) => {
    setLoading(true)
    setErrorMessage('')
    setNewAndActivePackages([])
    setExpiredPackages([])

    const packagesData = await axiosAdmin.get(`partner/packages?type=${encodeURIComponent(packageType)}`).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response.data.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
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
      const packages = Array.isArray(packagesData.data.packages) ? packagesData.data.packages : []
      packages.forEach((packageItem) => {
        if (packageItem.expiredAt && timestampExpired(packageItem.expiredAt)) {
          expired.push(packageItem)
        } else {
          newAndActive.push(packageItem)
          if (packageType === 'bithomp_pro' && packageItem.type === 'bithomp_pro') {
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
    resetPaymentFlow({ clearReceipt: true })
    const period = payPeriod.substring(0, 1) === 'm' ? 'month' : 'year'
    const periodCount = payPeriod.substring(1)

    let options = {
      type: tabTotype(subscriptionsTab),
      period,
      periodCount: 1 * periodCount,
      ...(ref ? { referralCode: ref } : {})
    }

    if (subscriptionsTab === 'api' || subscriptionsTab === 'notifications') {
      options.tier = tier
    }

    const paymentData = await axiosAdmin.post('partner/bids', options).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response.data.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
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
      paymentTracking = true
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
    setPaymentErrorMessage('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payPeriod, tier, subscriptionsTab])

  const stopPaymentTracking = () => {
    paymentTracking = false
    setUpdate(false)
    clearInterval(interval)
    if (ws) {
      ws.onclose = null
      ws.close()
      ws = null
    }
  }

  const clearReceipt = () => {
    setReceiptVisible(false)
    addAndRemoveQueryParams(router, [], ['receipt', 'uuid'])
  }

  const resetPaymentFlow = ({ clearReceipt: shouldClearReceipt = false } = {}) => {
    stopPaymentTracking()
    setStep(0)
    setPayData(null)
    setPaymentErrorMessage('')
    if (shouldClearReceipt) {
      clearReceipt()
    }
  }

  const onCancel = () => {
    resetPaymentFlow({ clearReceipt: true })
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
              "memos": "[{\"data\":\"Payment for Bithomp Pro (1 month)\"},{\"data\":\"bithomp.com\"}]"
            }
        ]
      }
    */
    if (data.bid.status === 'Completed') {
      if (data.bid.type === 'bithomp_pro') {
        setSubscriptionExpired(false)
      }
      setStep(2)
      setPayData(null)
      stopPaymentTracking()
      setErrorMessage('')
      getApiData()
      getTransactions(data.bid.type)
      return
    }
    if (data.bid.status === 'Partly paid') {
      getTransactions(data.bid.type)
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
      stopPaymentTracking()
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
    const data = response?.data
    if (data && paymentTracking) {
      updateBid(data)
    }
  }

  const checkPaymentWs = (partnerId, destinationTag) => {
    if (!paymentTracking) return

    function sendData() {
      if (!ws || !paymentTracking) {
        return
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: 'subscribe', bids: [{ partnerID: partnerId, destinationTag }], id: 1 }))
      } else if (ws.readyState === WebSocket.CONNECTING) {
        setTimeout(sendData, 1000)
      }
    }

    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      sendData()
    }

    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      if (message && paymentTracking) {
        updateBid(message)
      }
    }

    ws.onclose = () => {
      if (paymentTracking) {
        checkPaymentWs(partnerId, destinationTag)
      }
    }
  }

  const setSubscriptionsTabAndRestartSteps = (tab) => {
    resetPaymentFlow({ clearReceipt: true })
    setBidData(null)
    setNewAndActivePackages([])
    setExpiredPackages([])
    setTransactions([])
    if (sessionToken) {
      setLoading(true)
    }
    setSubscriptionsTab(tab)
  }

  const completedBid = bidData?.bid
  const completedType = completedBid?.type || tabTotype(subscriptionsTab)
  const completedServiceName = completedBid ? bidFullServiceName(completedBid) : bidTypeToName(completedType)
  const completedIsNotifications = completedType === 'bot'

  return (
    <>
      <SEO title={t('subscriptions.seo', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="subscriptions" />

        <Tabs
          tabList={subscriptionsTabList}
          tab={subscriptionsTab}
          setTab={setSubscriptionsTabAndRestartSteps}
          name="subscriptions"
          style={{ marginTop: '20px', marginBottom: '20px' }}
        />

        <div className="center">
          {sessionToken ? (
            <>
              <BillingCountry
                billingCountry={billingCountry}
                setBillingCountry={setBillingCountry}
                choosingCountry={choosingCountry}
                setChoosingCountry={setChoosingCountry}
                showSelected={false}
              />

              {!choosingCountry && (
                <>
                  {loading && (
                    <div className="center subscription-loading">
                      <span className="waiting"></span>
                      <span>{t('general.loading')}</span>
                    </div>
                  )}

                  {!loading && newAndActivePackages?.length > 0 && (
                    packageList(newAndActivePackages, (key, options) => t(key, { ns: 'admin', ...options }))
                  )}

                  {errorMessage && (
                    <div className="center orange bold">
                      <br />
                      {errorMessage}
                    </div>
                  )}

                  {billingCountry && (
                    <>
                      {step < 2 && (
                        <section className="subscription-offer-section">
                          {subscriptionsTab === 'pro' && <Pro setPayPeriod={setPayPeriod} />}
                          {subscriptionsTab === 'api' && (
                            <Api setPayPeriod={setPayPeriod} setTier={setTier} tier={tier} />
                          )}
                          {subscriptionsTab === 'notifications' && (
                            <NotificationsBot setPayPeriod={setPayPeriod} setTier={setTier} tier={tier} />
                          )}

                          <button
                            className="button-action narrow subscription-purchase-button"
                            onClick={onPurchaseClick}
                          >
                            {t('button.purchase', { ns: 'admin' })}
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
                        </section>
                      )}

                      <div className="center">
                        {payData && step === 1 && (
                          <>
                            <h4 className="center">{t('subscriptions.payment-details', { ns: 'admin' })}</h4>
                            {width > 600 ? (
                              <table className="table-large shrink">
                                <tbody>
                                  <tr>
                                    <td className="right">{t('table.address', { ns: 'admin' })}</td>
                                    <td className="left">
                                      {payData.bid.destinationAddress}{' '}
                                      <CopyButton text={payData.bid.destinationAddress} />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="right">{t('table.destination-tag', { ns: 'admin' })}</td>
                                    <td className="left bold">
                                      {payData.bid.destinationTag} <CopyButton text={payData.bid.destinationTag} />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="right">{t('table.amount', { ns: 'admin' })}</td>
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
                                  {t('table.address', { ns: 'admin' })}: <br />
                                  {payData.bid.destinationAddress} <CopyButton text={payData.bid.destinationAddress} />
                                </p>
                                <p>
                                  {t('table.destination-tag', { ns: 'admin' })}:
                                  <br />
                                  <b>{payData.bid.destinationTag}</b> <CopyButton text={payData.bid.destinationTag} />
                                </p>
                                <p>
                                  {t('table.amount', { ns: 'admin' })}:
                                  <br />
                                  {shortNiceNumber(Math.ceil(payData.bid.price * 100) / 100, 2, 2)}{' '}
                                  {payData.bid.currency} <CopyButton text={payData.bid.price} />
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
                                            MemoData: encode('Payment for ' + bidFullServiceName(payData.bid))
                                          }
                                        }
                                      ]
                                    },
                                    receipt: true
                                  })
                                }
                              >
                                {t('button.pay', { ns: 'admin' })}
                              </button>
                            </p>
                            <br />
                            {t('subscriptions.activation-note', { ns: 'admin' })}
                          </>
                        )}

                        {(receiptVisible || step === 2) && (
                          <div className="subscription-success">
                            <p className="center orange bold">{t('subscriptions.payment-received', { ns: 'admin' })}</p>
                            <p className="center">
                              {completedServiceName
                                ? t('subscriptions.service-activating', { ns: 'admin', service: completedServiceName })
                                : t('subscriptions.activating', { ns: 'admin' })}
                            </p>

                            {completedIsNotifications && (
                              <div className="subscription-success-next">
                                <h4>{t('subscriptions.next-step', { ns: 'admin' })}</h4>
                                <p>{t('subscriptions.alerts-next-step', { ns: 'admin' })}</p>
                                <Link href="/admin/notifications" className="button-action narrow">
                                  {t('notifications.open-alerts', { ns: 'admin' })}
                                </Link>
                              </div>
                            )}

                            {step === 2 && completedBid && <Receipt item="subscription" details={completedBid} />}
                          </div>
                        )}
                        {paymentErrorMessage && (
                          <p
                            className="red center"
                            dangerouslySetInnerHTML={{ __html: paymentErrorMessage || '&nbsp;' }}
                          />
                        )}

                        {bidData?.transactions?.length > 0 && (
                          <div style={{ marginTop: '20px', textAlign: 'left' }}>
                            <h4 className="center">{t('subscriptions.transactions', { ns: 'admin' })}</h4>
                            {width > 600 ? (
                              <table className="table-large shrink">
                                <thead>
                                  <tr>
                                    <th>{t('table.date-time', { ns: 'admin' })}</th>
                                    <th>{t('table.from', { ns: 'admin' })}</th>
                                    <th>{t('table.amount', { ns: 'admin' })}</th>
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
                                          <LinkTx tx={payment.hash} icon={true} />
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
                                            {t('table.from', { ns: 'admin' })}: <br />
                                            {addressLink(payment.sourceAddress)}
                                          </p>
                                          <p>
                                            {t('table.amount', { ns: 'admin' })}: {amountFormat(payment.amount)}
                                          </p>
                                          <p>
                                            {t('table.fiat-equivalent', { ns: 'admin' })}: {payment.fiatAmount}
                                          </p>
                                          <p>
                                            {t('table.transaction', { ns: 'admin' })}: <LinkTx tx={payment.hash} icon={true} />
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

                  {!loading && expiredPackages?.length > 0 && (
                    packageList(expiredPackages, (key, options) => t(key, { ns: 'admin', ...options }), 'expired')
                  )}

                  {transactions?.length > 0 && (
                    <div style={{ marginTop: '20px', textAlign: 'left' }}>
                      <h4 className="center">{t('subscriptions.last-payments', { ns: 'admin' })}</h4>
                      <ListTransactions transactions={transactions} />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="center">
              {subscriptionsTab === 'pro' && <Pro setPayPeriod={setPayPeriod} />}
              {subscriptionsTab === 'api' && <Api setPayPeriod={setPayPeriod} setTier={setTier} tier={tier} />}
              {subscriptionsTab === 'notifications' && (
                <NotificationsBot setPayPeriod={setPayPeriod} setTier={setTier} tier={tier} />
              )}

              <br />

              <center>
                <button className="button-action" onClick={() => openEmailLogin()}>
                  {t('button.register-sign-in', { ns: 'admin' })}
                </button>
              </center>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        .subscription-loading {
          display: flex;
          min-height: 86px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 8px auto 18px;
          color: var(--text-secondary);
        }

        .subscription-package-list {
          display: grid;
          gap: 12px;
          max-width: 920px;
          margin: 0 auto 24px;
          text-align: left;
        }

        .subscription-package-card {
          padding: 18px 20px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 28%, var(--table-frame));
          border-radius: 14px;
          background: color-mix(in srgb, var(--background-secondary) 90%, transparent);
          box-shadow: 0 10px 28px color-mix(in srgb, var(--accent-link) 8%, transparent);
        }

        .subscription-package-card.is-expired {
          border-color: color-mix(in srgb, var(--text-secondary) 26%, var(--table-frame));
          box-shadow: none;
          opacity: 0.84;
        }

        .subscription-package-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .subscription-package-eyebrow {
          display: block;
          margin-bottom: 5px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .subscription-package-card h3 {
          margin: 0;
          font-size: 24px;
          line-height: 1.15;
        }

        .subscription-package-tier {
          flex: 0 0 auto;
          max-width: min(48%, 360px);
          padding: 7px 11px;
          border-radius: 999px;
          color: var(--accent-link);
          background: color-mix(in srgb, var(--accent-link) 10%, transparent);
          font-size: 14px;
          font-weight: 800;
          line-height: 1.2;
          text-align: right;
        }

        .subscription-package-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 0;
        }

        .subscription-package-card-grid div {
          min-width: 0;
          padding: 12px;
          border: 1px solid color-mix(in srgb, var(--button-additional) 60%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--background-main) 72%, transparent);
        }

        .subscription-package-card-grid dt {
          margin: 0 0 5px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
        }

        .subscription-package-card-grid dd {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.25;
        }

        .subscription-offer-section {
          max-width: 920px;
          margin: 0 auto;
          text-align: left;
        }

        .subscription-offer-section > h4 {
          text-align: center;
        }

        .subscription-offer-section p {
          line-height: 1.5;
        }

        .subscription-purchase-button {
          display: flex;
          min-height: 39px;
          margin: 22px auto 0;
          align-items: center;
          justify-content: center;
        }

        .subscription-success {
          max-width: 760px;
          margin: 20px auto;
        }

        .subscription-success-next {
          max-width: 520px;
          margin: 18px auto 22px;
          padding: 18px;
          border: 1px solid var(--unaccent-icon-color);
          border-radius: 12px;
          background: var(--background-input);
          text-align: center;
        }

        .subscription-success-next h4 {
          margin: 0 0 8px;
        }

        .subscription-success-next p {
          margin: 0 0 16px;
        }

        @media only screen and (max-width: 520px) {
          .subscription-package-card-header {
            display: block;
          }

          .subscription-package-tier {
            display: block;
            max-width: 100%;
            width: fit-content;
            margin-top: 4px;
            text-align: left;
          }

          .subscription-package-card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
