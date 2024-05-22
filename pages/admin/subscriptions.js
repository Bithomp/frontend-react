import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

import { useWidth, encode, wssServer } from '../../utils'
import { fullDateAndTime, shortNiceNumber, amountFormat } from '../../utils/format'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Admin/Tabs'
import Select from 'react-select'
import BillingCountry from '../../components/Admin/BillingCountry'
import Link from 'next/link'
import CopyButton from '../../components/UI/CopyButton'
import LinkIcon from "../../public/images/link.svg"
import Image from 'next/image'
import Receipt from '../../components/Receipt'

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

const xummImg = "/images/xumm.png"

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

let interval
let ws = null

export default function Subscriptions({ setSignRequest }) {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(true) // keep true in order not to have hydr error for rendering the select
  const [packages, setPackages] = useState([])
  const [bithompProPlan, setBithompProPlan] = useState("m1")
  const [payData, setPayData] = useState(null)
  const [billingCountry, setBillingCountry] = useState("")
  const [choosingCountry, setChoosingCountry] = useState(false)
  const [update, setUpdate] = useState(false)
  const [bidData, setBidData] = useState(null)
  const [paymentErrorMessage, setPaymentErrorMessage] = useState("")
  const [step, setStep] = useState(0)

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axios.defaults.headers.common['Authorization'] = "Bearer " + sessionToken
      getApiData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getApiData = async () => {
    setLoading(true)
    setErrorMessage("")

    const packagesData = await axios.get(
      'partner/partner/packages',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
        if (error.response?.data?.error === "errors.token.required") {
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
      setPackages(packagesData.data.packages)
    }

    setLoading(false)
  }

  const typeName = type => {
    switch (type) {
      case "bithomp_pro":
        return "Bithomp Pro"
      default:
        return type
    }
  }

  const bithompProOptions = [
    { value: 'm1', label: '1 month', price: "10 EUR" },
    { value: 'm3', label: '3 months', price: "30 EUR" },
    { value: 'm6', label: '6 months', price: "60 EUR" },
    { value: 'y1', label: '1 year', price: "100 EUR" }
  ]

  const onPurchaseClick = async () => {
    setPayData(null)
    if (!bithompProPlan) {
      setErrorMessage("No plan selected")
      return
    }
    const period = bithompProPlan.substring(0, 1) === "m" ? "month" : "year"
    const periodCount = bithompProPlan.substring(1)

    const paymentData = await axios.post(
      'partner/partner/bids',
      {
        type: "bithomp_pro",
        //tier: "standard", //only for api plans
        period,
        periodCount: 1 * periodCount,
      },
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
        if (error.response?.data?.error === "errors.token.required") {
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

  const onCancel = () => {
    setUpdate(false)
    clearInterval(interval)
    setStep(0)
    setPayData(null)
    if (ws) ws.close()
  }

  const updateBid = data => {
    if (!data?.bid?.status) return

    setBidData(data)
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
      setStep(2)
      setUpdate(false)
      setErrorMessage("")
      clearInterval(interval)
      getApiData()
      if (ws) ws.close()
      return
    }
    if (data.bid.status === "Partly paid") {
      setPaymentErrorMessage(t("error.payment-partly", { received: data.bid.totalReceivedAmount, required: data.bid.price, currency: data.bid.currency, ns: "username" }));
      return
    }
    if (data.bid.status === "Timeout") {
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
    const response = await axios('v2/bid/partner:' + partnerId + '/' + destinationTag + '/status').catch(error => {
      setErrorMessage(t("error." + error.message))
    })
    const data = response.data
    if (data) {
      updateBid(data)
    }
  }

  const checkPaymentWs = (partnerId, destinationTag) => {
    if (!update) return
    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ command: "subscribe", bids: [{ partnerID: partnerId, destinationTag }], id: 1 }))
      }
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      if (message) {
        updateBid(message);
      }
    }

    ws.onclose = () => {
      if (update) {
        checkPaymentWs(partnerId, destinationTag)
      }
    }
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center">
      <h1 className='center'>{t("header", { ns: "admin" })}</h1>

      <AdminTabs name="mainTabs" tab="subscriptions" />

      <div className='center'>

        <BillingCountry
          billingCountry={billingCountry}
          setBillingCountry={setBillingCountry}
          choosingCountry={choosingCountry}
          setChoosingCountry={setChoosingCountry}
        />

        <br /><br />

        {loading &&
          <div className='center'>
            <br /><br />
            <span className="waiting"></span>
            <br />
            {t("general.loading")}
            <br /><br />
          </div>
        }

        {packages?.length > 0 &&
          <>
            <h4 className='center'>Your purchased subscriptions</h4>
            <div style={{ textAlign: "left" }}>
              {width > 600 ?
                <table className='table-large shrink'>
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
                      return <tr key={index}>
                        <td>{typeName(row.type)}</td>
                        <td>{fullDateAndTime(row.createdAt)}</td>
                        <td>{fullDateAndTime(row.startedAt)}</td>
                        <td>{fullDateAndTime(row.expiredAt + 1)}</td>
                      </tr>
                    })}
                  </tbody>
                </table>
                :
                <table className='table-mobile'>
                  <tbody>
                    {packages?.map((row, index) => {
                      return <tr key={index}>
                        <td style={{ padding: "5px" }} className='center'>
                          <b>{index + 1}</b>
                        </td>
                        <td>
                          <p>
                            Type: {row.type}
                          </p>
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
                            {fullDateAndTime(row.expiredAt + 1)}
                          </p>
                        </td>
                      </tr>
                    })}
                  </tbody>
                </table>
              }
            </div>
          </>
        }

        {errorMessage &&
          <div className='center orange bold'>
            <br />
            {errorMessage}
          </div>
        }

        {!(!billingCountry || choosingCountry || loading) &&
          <>
            {step < 2 &&
              <>
                <h4 className='center'>Purchase Bithomp Pro</h4>

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

                <h4>
                  Pay with XRP
                </h4>
                */}

                <div className='center'>
                  <Select
                    options={bithompProOptions}
                    getOptionLabel={
                      (option) => <div style={{ width: "150px" }}>
                        {option.label} <span style={{ float: "right" }}>{option.price}</span>
                      </div>
                    }
                    onChange={(selected) => {
                      setBithompProPlan(selected.value)
                      setPayData(null)
                    }}
                    defaultValue={bithompProOptions[0]}
                    isSearchable={false}
                    className="simple-select"
                    classNamePrefix="react-select"
                    instanceId="period-select"
                  />

                  <button
                    className="button-action narrow"
                    onClick={onPurchaseClick}
                    style={{ height: "37px", marginLeft: "10px" }}
                  >
                    Purchase
                  </button>
                </div>
              </>
            }

            <div className='center'>
              {payData && step === 1 &&
                <>
                  <h4 className='center'>Subscription payment details</h4>

                  {width > 600 ?
                    <table className='table-large shrink'>
                      <tbody>
                        <tr>
                          <td className='right'>Address</td>
                          <td className='left'>{payData.bid.destinationAddress} <CopyButton text={payData.bid.destinationAddress} /></td>
                        </tr>
                        <tr>
                          <td className='right'>Destination tag</td>
                          <td className='left bold'>{payData.bid.destinationTag} <CopyButton text={payData.bid.destinationTag} /></td>
                        </tr>
                        <tr>
                          <td className='right'>Amount</td>
                          <td className='left'>
                            {shortNiceNumber(Math.ceil(payData.bid.price * 100) / 100, 2, 2)} {payData.bid.currency} <CopyButton text={payData.bid.price} />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    :
                    <div className='left'>
                      <p>
                        Address: <br />
                        {payData.bid.destinationAddress} <CopyButton text={payData.bid.destinationAddress} />
                      </p>
                      <p>
                        Destination tag:<br />
                        <b>{payData.bid.destinationTag}</b> <CopyButton text={payData.bid.destinationTag} />
                      </p>
                      <p>
                        Amount:<br />
                        {payData.bid.price} {payData.bid.currency} <CopyButton text={payData.bid.price} />
                      </p>
                      <table className='table-mobile'>
                        <tbody>
                        </tbody>
                      </table>
                    </div>
                  }

                  <p className="center">
                    <input type="button" value={t("button.cancel")} className="button-action" onClick={onCancel} />

                    <button
                      className='button-action'
                      style={{ margin: "10px 10px 20px" }}
                      onClick={() => setSignRequest({
                        wallet: "xumm",
                        request: {
                          TransactionType: "Payment",
                          Destination: payData.bid.destinationAddress,
                          DestinationTag: payData.bid.destinationTag,
                          Amount: (Math.ceil(payData.bid.price * 100) * 10000).toString(),
                          Memos: [
                            {
                              "Memo": {
                                "MemoData": encode("Payment for Bithomp Pro (" + payData.bid.periodCount + " " + payData.bid.period + (payData.bid.periodCount > 1 ? "s" : "") + ")"),
                              }
                            }
                          ]
                        }
                      })}
                    >
                      <Image src={xummImg} className='xumm-logo' alt="xaman" height={24} width={24} />
                      Pay with Xaman
                    </button>
                  </p>

                  <br />
                  Your Pro account will be activated when the payment is received.
                </>
              }

              {step === 2 &&
                <>
                  <p className="center">
                    We have received your purchase.
                  </p>
                  <Receipt item="subscription" details={bidData.bid} />
                </>
              }
              {paymentErrorMessage &&
                <p className="red center" dangerouslySetInnerHTML={{ __html: paymentErrorMessage || "&nbsp;" }} />
              }

              {bidData?.transactions?.length > 0 &&
                <div style={{ marginTop: "20px", textAlign: "left" }}>
                  <h4 className='center'>Transactions</h4>
                  {width > 600 ?
                    <table className='table-large shrink'>
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
                          return <tr key={index}>
                            <td>{fullDateAndTime(payment.processedAt)}</td>
                            <td><Link href={"/explorer/" + payment.sourceAddress}>{payment.sourceAddress}</Link></td>
                            <td>{amountFormat(payment.amount * 1000000)}</td>
                            <td><Link href={"/explorer/" + payment.hash}><LinkIcon /></Link></td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                    :
                    <table className='table-mobile'>
                      <tbody>
                        {bidData?.transactions?.map((payment, index) => {
                          return <tr key={index}>
                            <td style={{ padding: "5px" }} className='center'>
                              <b>{index + 1}</b>
                            </td>
                            <td>
                              <p>
                                {fullDateAndTime(payment.processedAt)}
                              </p>
                              <p>
                                From: <br />
                                <Link href={"/explorer/" + payment.sourceAddress}>{payment.sourceAddress}</Link>
                              </p>
                              <p>
                                Amount: {amountFormat(payment.amount)}
                              </p>
                              <p>
                                Fiat equivalent: {payment.fiatAmount}
                              </p>
                              <p>
                                Transaction: <Link href={"/explorer/" + payment.hash}><LinkIcon /></Link>
                              </p>
                            </td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  }
                </div>
              }
            </div>
          </>
        }
      </div>
    </div>
  </>
}
