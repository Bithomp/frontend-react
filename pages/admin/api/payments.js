import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation, i18n } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'
import CopyButton from '../../../components/UI/CopyButton'

import { amountFormat, fullDateAndTime } from '../../../utils/format'
import { nativeCurrency, useWidth } from '../../../utils'

//PayPal
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
    });
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
    }}
  />)
}

//https://paypal.github.io/react-paypal-js/?path=/docs/example-paypalbuttons--default

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

import LinkIcon from "../../../public/images/link.svg"

export default function Admin() {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [apiData, setApiData] = useState(null)
  const [apiPayments, setApiPayments] = useState({})
  const router = useRouter()
  const width = useWidth()
  const [eurRate, setEurRate] = useState(0)

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

  const mainTabs = [
    { value: "account", label: "Account" },
    { value: "api", label: "API" },
    { value: "bots", label: "Bots" },
  ]

  const apiTabs = [
    { value: "api-info", label: "Information" },
    { value: "api-payments", label: "Payments" },
    { value: "api-statistics", label: "Statistics" },
    { value: "api-requests", label: "Requests" },
  ]

  const changePage = tab => {
    if (tab === "api") {
      router.push("/admin/api")
    } else if (tab === "bots") {
      router.push("/admin/bots")
    } else if (tab === "account") {
      router.push("/admin")
    } else if (tab === "api-info") {
      router.push("/admin/api")
    } if (tab === "api-payments") {
      router.push("/admin/api/payments")
    } if (tab === "api-requests") {
      router.push("/admin/api/requests")
    } if (tab === "api-statistics") {
      router.push("/admin/api/statistics")
    }
  }

  const getApiData = async () => {
    const data = await axios.get(
      'partner/partner/accessToken',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
      }
    })

    setApiData(data?.data)
    /*
    {
      "token": "werwerw-werwer-werc",
      "locked": false,
      "domain": "slavkino.narod.ru",
      "tier": "free"
    }
    */

    const rate = await axios.get('v2/rates/current/eur').catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
      }
    })
    /* { "eur": 0.57814 } */

    if (rate?.data?.eur) {
      setEurRate(rate.data.eur)
    }

    const apiTransactions = await axios.get(
      'partner/partner/accessToken/transactions?limit=50&offset=0',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
        if (error.response?.data?.error === "errors.token.required") {
          router.push('/admin')
        }
      }
    })

    setApiPayments(apiTransactions?.data)
  }

  const apiPrice = (tier, months = 1) => {
    if (tier === "free") {
      return "Free"
    }

    if (!eurRate) return ""

    let tierRate = ""

    if (tier === "basic") {
      tierRate = "30"
    } else if (tier === "standard") {
      tierRate = "100"
    } else if (tier === "premium") {
      tierRate = "250"
    }

    return <><b>{(tierRate * months / eurRate).toFixed(2)} {nativeCurrency}</b> ({tierRate * months} EUR)</>
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <Tabs tabList={mainTabs} tab="api" setTab={changePage} name="mainTabs" />
      <Tabs tabList={apiTabs} tab="api-payments" setTab={changePage} name="apiTabs" />

      <div className='center'>
        {apiData &&
          <>
            <h4 className='center'>API payment details</h4>
            {width > 600 ?
              <table className='table-large shrink'>
                <tbody>
                  <tr>
                    <td className='right'>Address</td>
                    <td className='left'>rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy <CopyButton text="rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy" /></td>
                  </tr>
                  <tr>
                    <td className='right'>Destination tag</td>
                    <td className='left bold'>{apiData.id} <CopyButton text={apiData.id} /></td>
                  </tr>
                  <tr>
                    <td className='right'>Tier {apiData.tier} (1 month)</td>
                    <td className='left'>
                      {apiPrice(apiData?.tier, 1)}
                    </td>
                  </tr>
                  {apiData.tier !== "free" &&
                    <tr>
                      <td className='right'>Tier {apiData.tier} (1 year)</td>
                      <td className='left'>
                        {apiPrice(apiData?.tier, 12)}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              :
              <div className='left'>
                <p>
                  Address: <br />
                  rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy <CopyButton text="rPPHhfSQbHt1t2XPHWAK1HTcjqDg56TzZy" />
                </p>
                <p>
                  Destination tag:<br />
                  {apiData.id} <CopyButton text={apiData.id} />
                </p>
                <p>
                  Tier {apiData.tier} (1 month):<br />
                  {apiPrice(apiData?.tier, 1)}
                </p>
                {apiData.tier !== "free" &&
                  <p>
                    Tier {apiData.tier} (1 year):<br />
                    {apiPrice(apiData?.tier, 12)}
                  </p>
                }
              </div>
            }
          </>
        }

        <h4>
          Subcribe to the Standard plan 100 EUR / month with PayPal
        </h4>

        <PayPalScriptProvider
          options={{
            clientId: "AcUlMvkL6Uc6OVv-USMK3fg2wZ_xEBolL0-yyzWkOnS7vF2aWbu_AJFYJxaRRfPoiN0SBEnSFHUTbSUn",
            components: "buttons",
            intent: "subscription",
            vault: true,
            locale: i18n.language,
          }}
        >
          <ButtonWrapper type="subscription" />
        </PayPalScriptProvider>

        {apiPayments?.transactions?.length > 0 &&
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            <h4 className='center'>The last XRP API payments</h4>
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
                  {apiPayments?.transactions?.map((payment, index) => {
                    return <tr key={index}>
                      <td>{fullDateAndTime(payment.processedAt)}</td>
                      <td><Link href={"/explorer/" + payment.sourceAddress}>{payment.sourceAddress}</Link></td>
                      <td>{amountFormat(payment.amount)}</td>
                      <td><Link href={"/explorer/" + payment.hash}><LinkIcon /></Link></td>
                    </tr>
                  })}
                </tbody>
              </table>
              :
              <table className='table-mobile'>
                <tbody>
                  {apiPayments?.transactions?.map((payment, index) => {
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
                          Amount: {amountFormat(payment.amount * 1000000)}
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

        <br />
        {errorMessage ?
          <div className='center orange bold'>
            {errorMessage}
          </div>
          :
          <br />
        }
      </div>
    </div>
  </>
}
