import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'

import BillingCountry from '../BillingCountry'
import CopyButton from '../../UI/CopyButton'
import Receipt from '../../Receipt'
import ListTransactions from '../../ListTransactions'
import { axiosAdmin } from '../../../utils/axios'
import { addAndRemoveQueryParams, encode, useWidth, wssServer } from '../../../utils'
import {
  AddressWithIconFilled,
  addressLink,
  amountFormat,
  fullDateAndTime,
  shortNiceNumber,
  timeFromNow
} from '../../../utils/format'
import { LinkTx } from '../../../utils/links'
import { bidFullServiceName, bidTypeToName } from '../../../utils/bids'
import { splitSubscriptionPackages, subscriptionTierLabel } from '../../../utils/adminSubscriptions'

let interval
let ws = null
let paymentTracking = false

const packageExpireDate = (row, t) => {
  if (!row?.expiredAt && row?.metadata?.forever) return t('common.never')
  if (row?.expiredAt) return fullDateAndTime(row.expiredAt + 1, 'expiration')
  return t('common.unknown')
}

const packagePeriodLabel = (row, t) => {
  if (row?.metadata?.forever) return t('common.never')
  if (!row?.expiredAt || !row?.startedAt) return t('common.unknown')
  if (row.expiredAt <= row.startedAt) return t('common.unknown')

  const durationDays = Math.max(1, Math.round((row.expiredAt - row.startedAt) / 86400))
  const periods = [
    { key: 'w1', days: 7 },
    { key: 'm1', days: 30 },
    { key: 'm3', days: 91 },
    { key: 'm6', days: 182 },
    { key: 'y1', days: 365 }
  ]
  const closestPeriod = periods.reduce((closest, period) => (
    Math.abs(period.days - durationDays) < Math.abs(closest.days - durationDays) ? period : closest
  ), periods[0])

  return t(`period.${closestPeriod.key}`, { ns: 'admin' })
}

const SubscriptionPackageSummary = ({ packages, status = 'active', t, i18n }) => {
  const [expandedPackages, setExpandedPackages] = useState({})

  if (!packages?.length) return null

  const togglePackage = (key) => {
    setExpandedPackages((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="subscription-summary-list">
      {packages.map((row) => {
        const tier = subscriptionTierLabel(row, t)
        const isExpired = status === 'expired'
        const key = row.id || `${row.type}-${row.startedAt}`
        const isUpcoming = !isExpired && row.startedAt && row.startedAt > Math.floor(Date.now() / 1000)
        const isExpanded = !!expandedPackages[key]
        const expires = packageExpireDate(row, t)
        const durationText = packagePeriodLabel(row, t)

        return (
          <article
            className={`subscription-summary-card ${isExpired ? 'is-expired' : 'is-active'}`}
            key={key}
          >
            <button className="subscription-summary-toggle" onClick={() => togglePackage(key)} type="button">
              <div className="subscription-summary-main">
                <span className={`subscription-status-pill ${isExpired ? 'is-expired' : isUpcoming ? 'is-upcoming' : 'is-active'}`}>
                  {isExpired ? t('status.expired') : isUpcoming ? t('referrals.status.pending') : t('status.active')}
                </span>
                {tier && <span className="subscription-tier-pill">{tier}</span>}
              </div>
              <dl className="subscription-summary-dates">
                {isExpired ? (
                  <div>
                    <dt>{t('table.expire')}</dt>
                    <dd>{row.expiredAt ? timeFromNow(row.expiredAt + 1, i18n) : expires}</dd>
                  </div>
                ) : isUpcoming ? (
                  <>
                    <div>
                      <dt>{t('table.start')}</dt>
                      <dd>{timeFromNow(row.startedAt, i18n)}</dd>
                    </div>
                    <div>
                      <dt>{t('subscriptions.period', { ns: 'admin' })}</dt>
                      <dd>{durationText}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>{t('table.expire')}</dt>
                    <dd>{row.expiredAt ? timeFromNow(row.expiredAt + 1, i18n) : expires}</dd>
                  </div>
                )}
              </dl>
              <span className="subscription-summary-caret">{isExpanded ? '−' : '+'}</span>
            </button>
            {isExpanded && (
              <dl className="subscription-summary-details">
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
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function SubscriptionManager({
  packageType,
  PlanComponent,
  sessionToken,
  openEmailLogin,
  setSignRequest,
  setSubscriptionExpired,
  setProExpire,
  id,
  title,
  initiallyExpanded = false,
  externalBillingCountry,
  externalChoosingCountry,
  showExpired = true
}) {
  const { t, i18n } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const width = useWidth()

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activePackages, setActivePackages] = useState([])
  const [expiredPackages, setExpiredPackages] = useState([])
  const [transactions, setTransactions] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(initiallyExpanded)
  const [checkoutTouched, setCheckoutTouched] = useState(false)
  const [payPeriod, setPayPeriod] = useState('m3')
  const [tier, setTier] = useState(packageType === 'bot' ? 'basic' : 'standard')
  const [billingCountry, setBillingCountry] = useState('')
  const [choosingCountry, setChoosingCountry] = useState(false)
  const [payData, setPayData] = useState(null)
  const [bidData, setBidData] = useState(null)
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('')
  const [step, setStep] = useState(0)
  const [update, setUpdate] = useState(false)
  const [receiptVisible, setReceiptVisible] = useState(false)
  const billingCountryManagedExternally = externalBillingCountry !== undefined || externalChoosingCountry !== undefined
  const activeBillingCountry = billingCountryManagedExternally ? externalBillingCountry : billingCountry
  const activeChoosingCountry = billingCountryManagedExternally ? externalChoosingCountry : choosingCountry

  useEffect(() => {
    setCheckoutOpen(initiallyExpanded)
    setCheckoutTouched(false)
  }, [initiallyExpanded, packageType])

  useEffect(() => {
    if (sessionToken) {
      getPackages()
      getTransactions()
    } else {
      setActivePackages([])
      setExpiredPackages([])
      setTransactions([])
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, packageType])

  useEffect(() => {
    setPayData(null)
    setPaymentErrorMessage('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payPeriod, tier, packageType])

  useEffect(() => {
    if (payData?.bid?.destinationTag && payData?.bid?.partnerID && update) {
      interval = setInterval(() => checkPayment(payData.bid.partnerID, payData.bid.destinationTag), 60000)
      checkPaymentWs(payData.bid.partnerID, payData.bid.destinationTag)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payData, update])

  const getTransactions = async (type = packageType) => {
    setTransactions([])

    const response = await axiosAdmin.get(`partner/transactions?limit=5&packageType=${encodeURIComponent(type)}`).catch((error) => {
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

  const getPackages = async (type = packageType) => {
    setLoading(true)
    setErrorMessage('')
    setActivePackages([])
    setExpiredPackages([])

    const packagesData = await axiosAdmin.get(`partner/packages?type=${encodeURIComponent(type)}`).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        }
      }
      setLoading(false)
    })

    if (packagesData?.data) {
      const packages = Array.isArray(packagesData.data.packages) ? packagesData.data.packages : []
      const { active, expired } = splitSubscriptionPackages(packages)

      if (type === 'bithomp_pro' && active.some((item) => item.type === 'bithomp_pro')) {
        const proPackage = active.find((item) => item.type === 'bithomp_pro')
        setSubscriptionExpired?.(false)
        if (proPackage?.expiredAt) {
          setProExpire?.(JSON.stringify(proPackage.expiredAt * 1000))
        }
      }

      setActivePackages(active)
      setExpiredPackages(expired)
      if (!checkoutTouched) {
        setCheckoutOpen(initiallyExpanded || active.length === 0)
      }
    }
    setLoading(false)
  }

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
    setCheckoutTouched(true)
    setCheckoutOpen(false)
  }

  const onBackToPlans = () => {
    resetPaymentFlow({ clearReceipt: true })
    setBidData(null)
    setCheckoutTouched(true)
    setCheckoutOpen(true)
  }

  const onPurchaseClick = async () => {
    resetPaymentFlow({ clearReceipt: true })

    if (packageType === 'bot' && tier === 'trial') {
      const trialPackage = await axiosAdmin.post('partner/packages', { trial: true, type: 'bot' }).catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
          if (error.response?.data?.error === 'errors.token.required') {
            openEmailLogin()
          }
        }
      })

      if (trialPackage?.data) {
        setErrorMessage('')
        setCheckoutTouched(true)
        setCheckoutOpen(false)
        getPackages('bot')
        getTransactions('bot')
      }
      return
    }

    const period = payPeriod.substring(0, 1) === 'm' ? 'month' : 'year'
    const periodCount = payPeriod.substring(1)

    const options = {
      type: packageType,
      period,
      periodCount: 1 * periodCount
    }

    if (packageType === 'token' || packageType === 'bot') {
      options.tier = tier
    }

    const paymentData = await axiosAdmin.post('partner/bids', options).catch((error) => {
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
        }
      }
    })

    if (paymentData?.data) {
      setPayData(paymentData.data)
      updateBid(paymentData.data)
      paymentTracking = true
      setUpdate(true)
      setStep(1)
    }
  }

  const updateBid = (data) => {
    if (!data?.bid?.status) return

    setBidData(data)
    setPaymentErrorMessage('')

    if (data.bid.status === 'Completed') {
      if (data.bid.type === 'bithomp_pro') {
        setSubscriptionExpired?.(false)
      }
      setStep(2)
      setPayData(null)
      stopPaymentTracking()
      setErrorMessage('')
      getPackages(data.bid.type)
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

  if (!sessionToken) return null

  const completedBid = bidData?.bid
  const completedServiceName = completedBid ? bidFullServiceName(completedBid) : bidTypeToName(packageType)
  const completedIsNotifications = completedBid?.type === 'bot' || packageType === 'bot'
  const hasActivePackage = activePackages.length > 0
  const titleText = title || bidTypeToName(packageType)
  const showPlan = checkoutOpen

  return (
    <section className={`admin-subscription-manager ${hasActivePackage ? 'has-active' : 'needs-subscription'}`} id={id}>
      <div className="admin-subscription-manager-header">
        <div>
          <span>{t('tabs.subscriptions', { ns: 'admin' })}</span>
          <h3>{titleText}</h3>
        </div>
        {(hasActivePackage || !checkoutOpen) && (
          <button
            className="button-action thin"
            onClick={() => {
              setCheckoutTouched(true)
              setCheckoutOpen((open) => !open)
            }}
            type="button"
          >
            {t('api.manage-subscription', { ns: 'admin' })}
          </button>
        )}
      </div>

      {loading && (
        <div className="center subscription-loading">
          <span className="waiting"></span>
          <span>{t('general.loading', { ns: 'admin' })}</span>
        </div>
      )}

      {!loading && activePackages?.length > 0 && (
        <SubscriptionPackageSummary
          i18n={i18n}
          packages={activePackages}
          t={(key, options) => t(key, { ns: 'admin', ...options })}
        />
      )}

      {errorMessage && (
        <div className="center orange bold">
          <br />
          {errorMessage}
        </div>
      )}

      {showPlan && (
        <div className="subscription-checkout">
          {!billingCountryManagedExternally && (
            <BillingCountry
              billingCountry={billingCountry}
              setBillingCountry={setBillingCountry}
              choosingCountry={choosingCountry}
              setChoosingCountry={setChoosingCountry}
              showSelected={false}
            />
          )}

          {!activeChoosingCountry && activeBillingCountry && (
            <>
              {step < 2 && (
                <section className="subscription-offer-section">
                  {PlanComponent && <PlanComponent setPayPeriod={setPayPeriod} setTier={setTier} tier={tier} />}

                  <button className="button-action narrow subscription-purchase-button" onClick={onPurchaseClick}>
                    {packageType === 'bot' && tier === 'trial'
                      ? t('button.activate', { ns: 'admin' })
                      : t('button.purchase', { ns: 'admin' })}
                  </button>
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
                              {payData.bid.destinationAddress} <CopyButton text={payData.bid.destinationAddress} />
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
                              {shortNiceNumber(Math.ceil(payData.bid.price * 100) / 100, 2, 2)} {payData.bid.currency}{' '}
                              <CopyButton text={payData.bid.price} />
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
                          {shortNiceNumber(Math.ceil(payData.bid.price * 100) / 100, 2, 2)} {payData.bid.currency}{' '}
                          <CopyButton text={payData.bid.price} />
                        </p>
                      </div>
                    )}

                    <p className="center">
                      <input type="button" value={t('button.cancel', { ns: 'admin' })} className="button-action" onClick={onCancel} />

                      {setSignRequest && (
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
                      )}
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
                    <p className="center">
                      <button className="button-action narrow" onClick={onBackToPlans} type="button">
                        {t('subscriptions.back-to-plans', { ns: 'admin' })}
                      </button>
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
                  <p className="red center" dangerouslySetInnerHTML={{ __html: paymentErrorMessage || '&nbsp;' }} />
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
                          {bidData.transactions.map((payment, index) => (
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
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="table-mobile">
                        <tbody>
                          {bidData.transactions.map((payment, index) => (
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
                                  {t('table.amount', { ns: 'admin' })}: {amountFormat(payment.amount * 1000000)}
                                </p>
                                <p>
                                  {t('table.fiat-equivalent', { ns: 'admin' })}: {payment.fiatAmount}
                                </p>
                                <p>
                                  {t('table.transaction', { ns: 'admin' })}: <LinkTx tx={payment.hash} icon={true} />
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && showExpired && expiredPackages?.length > 0 && (
        <SubscriptionPackageSummary
          i18n={i18n}
          packages={expiredPackages}
          status="expired"
          t={(key, options) => t(key, { ns: 'admin', ...options })}
        />
      )}

      {showPlan && transactions?.length > 0 && (
        <div className="subscription-transactions">
          <h4 className="center">{t('subscriptions.last-payments', { ns: 'admin' })}</h4>
          <div className="subscription-transactions-table">
            <ListTransactions transactions={transactions} />
          </div>
        </div>
      )}

      <style jsx global>{`
        .admin-subscription-manager {
          max-width: 900px;
          margin: 18px auto 26px;
          padding: 16px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 24%, var(--table-frame));
          border-radius: 12px;
          background: color-mix(in srgb, var(--background-secondary) 42%, transparent);
          text-align: left;
        }

        .admin-subscription-manager-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .admin-subscription-manager-header span {
          display: block;
          margin-bottom: 4px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-subscription-manager-header h3 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
        }

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

        .subscription-summary-list {
          display: grid;
          gap: 10px;
          margin: 0;
          text-align: left;
        }

        .subscription-summary-card {
          display: block;
          padding: 0;
          border: 1px solid color-mix(in srgb, var(--accent-link) 20%, var(--table-frame));
          border-radius: 10px;
          background: color-mix(in srgb, var(--background-secondary) 74%, transparent);
          overflow: hidden;
        }

        .subscription-summary-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          width: 100%;
          padding: 12px 14px;
          border: 0;
          background: transparent;
          color: var(--text-main);
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .subscription-summary-toggle:hover {
          background: color-mix(in srgb, var(--accent-link) 6%, transparent);
        }

        .subscription-summary-main {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          flex: 0 0 auto;
        }

        .subscription-status-pill,
        .subscription-tier-pill {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.2;
        }

        .subscription-status-pill.is-active {
          color: var(--green);
          background: color-mix(in srgb, var(--green) 12%, transparent);
        }

        .subscription-status-pill.is-expired {
          color: var(--red);
          background: color-mix(in srgb, var(--red) 12%, transparent);
        }

        .subscription-status-pill.is-upcoming {
          color: var(--orange);
          background: color-mix(in srgb, var(--orange) 14%, transparent);
        }

        .subscription-tier-pill {
          color: var(--accent-link);
          background: color-mix(in srgb, var(--accent-link) 12%, transparent);
        }

        .subscription-summary-dates {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          flex: 1 1 auto;
          gap: 12px;
          margin: 0;
        }

        .subscription-summary-dates div {
          min-width: 0;
        }

        .subscription-summary-dates dt {
          margin-bottom: 2px;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .subscription-summary-dates dd {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .subscription-summary-caret {
          flex: 0 0 auto;
          width: 24px;
          color: var(--accent-link);
          font-size: 22px;
          font-weight: 800;
          line-height: 1;
          text-align: center;
        }

        .subscription-summary-details {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 0;
          padding: 0 14px 12px 14px;
          color: var(--text-secondary);
        }

        .subscription-summary-details dt {
          margin-bottom: 2px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .subscription-summary-details dd {
          margin: 0;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .subscription-checkout {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid color-mix(in srgb, var(--accent-link) 18%, transparent);
        }

        .subscription-offer-section {
          max-width: 1180px;
          margin: 0 auto 20px;
        }

        .subscription-purchase-button {
          display: block;
          margin: 24px auto 8px;
        }

        .subscription-success {
          max-width: 720px;
          margin: 18px auto;
          text-align: center;
        }

        .subscription-success-next {
          max-width: 520px;
          margin: 18px auto;
          padding: 16px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 24%, var(--table-frame));
          border-radius: 12px;
          background: color-mix(in srgb, var(--background-secondary) 90%, transparent);
        }

        .subscription-transactions {
          max-width: 100%;
          margin-top: 18px;
          text-align: left;
        }

        .subscription-transactions h4 {
          margin: 0 0 10px;
        }

        .subscription-transactions-table {
          max-width: 100%;
        }

        .subscription-transactions-table .table-large {
          min-width: 0;
          width: 100%;
          table-layout: fixed;
        }

        .subscription-transactions-table .table-large th,
        .subscription-transactions-table .table-large td {
          padding: 8px 6px;
          overflow-wrap: anywhere;
        }

        .subscription-transactions-table .table-large th:nth-child(1),
        .subscription-transactions-table .table-large td:nth-child(1) {
          width: 17%;
        }

        .subscription-transactions-table .table-large th:nth-child(2),
        .subscription-transactions-table .table-large td:nth-child(2) {
          width: 25%;
        }

        .subscription-transactions-table .table-large th:nth-child(3),
        .subscription-transactions-table .table-large td:nth-child(3),
        .subscription-transactions-table .table-large th:nth-child(4),
        .subscription-transactions-table .table-large td:nth-child(4) {
          width: 13%;
        }

        .subscription-transactions-table .table-large th:nth-child(5),
        .subscription-transactions-table .table-large td:nth-child(5) {
          width: 24%;
        }

        .subscription-transactions-table .table-large th:nth-child(6),
        .subscription-transactions-table .table-large td:nth-child(6) {
          width: 8%;
        }

        @media only screen and (max-width: 700px) {
          .admin-subscription-manager {
            padding: 16px;
          }

          .admin-subscription-manager-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .subscription-summary-toggle {
            flex-direction: column;
            align-items: flex-start;
          }

          .subscription-summary-dates {
            grid-template-columns: 1fr;
            width: 100%;
          }

          .subscription-summary-details {
            grid-template-columns: 1fr;
          }

          .admin-subscription-manager-header .button-action {
            align-self: stretch;
          }
        }
      `}</style>
    </section>
  )
}
