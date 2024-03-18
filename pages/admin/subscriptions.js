import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

import { useWidth } from '../../utils'
import { fullDateAndTime, shortNiceNumber } from '../../utils/format'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Admin/Tabs'
import Select from 'react-select'
import BillingCountry from '../../components/Admin/BillingCountry'
import Link from 'next/link'
import CopyButton from '../../components/UI/CopyButton'
import LinkIcon from "../../public/images/link.svg"

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Subscriptions() {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState("")
  const [loading, setLoading] = useState(true) // keep true in order not to have hydr error for rendering the select
  const [packages, setPackages] = useState([])
  const [bithompProPlan, setBithompProPlan] = useState("1m")
  const [payData, setPayData] = useState(null)
  const [billingCountry, setBillingCountry] = useState("")
  const [choosingCountry, setChoosingCountry] = useState(false)

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
    { value: 'm1', label: '6 months', price: "60 EUR" },
    { value: 'y1', label: '1 year', price: "100 EUR" }
  ]

  const onPurchaseClick = async () => {
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
            "periodCount": 3
          },
          "transactions": []
        }
      */
    }
    setPayData(paymentData?.data)
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

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
        }

        {errorMessage &&
          <div className='center orange bold'>
            <br />
            {errorMessage}
          </div>
        }

        {!(!billingCountry || choosingCountry || loading) &&
          <>
            <h4 className='center'>Purchase subscription</h4>
            <div className='center'>
              Here you can purchase <b>Bithomp Pro</b> subscription.
            </div>
            <br />

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

              <>
                {payData &&
                  <>

                    <h4 className='center'>Bithomp Pro payment details</h4>

                    {width > 600 ?
                      <table className='table-large shrink'>
                        <tbody>
                          <tr>
                            <td className='right'>Address</td>
                            <td className='left'>rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3 <CopyButton text="rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3" /></td>
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
                          rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3 <CopyButton text="rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3" />
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
                    <br />
                    Your Pro account will be activated when the payment is received.
                  </>
                }

                {payData?.transactions?.length > 0 &&
                  <div style={{ marginTop: "20px", textAlign: "left" }}>
                    <h4 className='center'>Transactions</h4>
                    {width > 600 ?
                      <table className='table-large shrink'>
                        <thead>
                          <tr>
                            <th>Date & Time</th>
                            <th>From</th>
                            <th>Amount</th>
                            <th>Fiat</th>
                            <th>Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payData?.transactions?.map((payment, index) => {
                            return <tr key={index}>
                              <td>{fullDateAndTime(payment.processedAt)}</td>
                              <td><Link href={"/explorer/" + payment.sourceAddress}>{payment.sourceAddress}</Link></td>
                              <td>{amountFormat(payment.amount)}</td>
                              <td>
                                {payment.fiatAmount}
                              </td>
                              <td><Link href={"/explorer/" + payment.hash}><LinkIcon /></Link></td>
                            </tr>
                          })}
                        </tbody>
                      </table>
                      :
                      <table className='table-mobile'>
                        <tbody>
                          {payData?.transactions?.map((payment, index) => {
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
              </>




            </div>
          </>
        }

      </div>
    </div >
  </>
}
