import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import countries from "i18n-iso-countries"

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'
import CopyButton from '../../../components/UI/CopyButton'

import { amountFormat, fullDateAndTime, niceNumber } from '../../../utils/format'
import { nativeCurrency, useWidth } from '../../../utils'

//PayPal option is off for now
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

*/

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

import LinkIcon from "../../../public/images/link.svg"
import CountrySelect from '../../../components/UI/CountrySelect'

export default function Payments() {
  const { t, i18n } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [apiData, setApiData] = useState(null)
  const [apiPayments, setApiPayments] = useState({})
  const router = useRouter()
  const width = useWidth()
  const [eurRate, setEurRate] = useState(0)
  const [billingCountry, setBillingCountry] = useState("")
  const [choosingCountry, setChoosingCountry] = useState(false)
  const [loading, setLoading] = useState(true) //keep true for country select
  const [loadingPayments, setLoadingPayments] = useState(false)

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

  let lang = i18n.language.slice(0, 2)
  const notSupportedLanguages = ['my'] // supported "en", "ru", "ja", "ko" etc
  if (notSupportedLanguages.includes(lang)) {
    lang = "en"
  }
  const languageData = require('i18n-iso-countries/langs/' + lang + '.json')
  countries.registerLocale(languageData)

  const mainTabs = [
    { value: "account", label: "Account" },
    { value: "api", label: "API" },
    //{ value: "bots", label: "Bots" },
  ]

  const apiTabs = [
    { value: "api-info", label: "Information" },
    { value: "api-payments", label: "Payments" },
    { value: "api-statistics", label: "Statistics" },
    { value: "api-requests", label: "Requests" },
    { value: "api-charts", label: "Charts" },
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
    } else if (tab === "api-payments") {
      router.push("/admin/api/payments")
    } else if (tab === "api-requests") {
      router.push("/admin/api/requests")
    } else if (tab === "api-statistics") {
      router.push("/admin/api/statistics")
    } else if (tab === "api-charts") {
      router.push("/admin/api/charts")
    }
  }

  const fiatAmountAt = async payment => {
    const rate = await axios.get(
      'v2/rates/history/nearest/eur?date=' + payment.processedAt + '000', //13 digits
    ).catch(error => {
      console.log(error)
    })
    if (rate?.data?.eur) {
      return niceNumber(payment.amount / 1000000 * rate.data.eur, 2, "EUR")
    }
    return 0
  }

  const getApiData = async () => {
    const partnerData = await axios.get(
      'partner/partner',
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

    /*
    {
      "id": 321098,
      "created_at": "2022-09-20T12:42:38.000Z",
      "updated_at": "2024-01-09T12:08:33.000Z",
      "name": "vasia.com",
      "email": "sasha@public.com",
      "country": "GB"
    }
    */

    setLoading(false)

    const partnerCountry = partnerData?.data?.country

    //if we have country available: set country, check rates, and show transaction history only 
    if (partnerCountry) {
      setBillingCountry(partnerCountry)

      const data = await axios.get(
        'partner/partner/accessToken',
        { baseUrl: '/api/' }
      ).catch(error => {
        if (error && error.message !== "canceled") {
          setErrorMessage(t(error.response?.data?.error || "error." + error.message))
        }
      })

      setApiData(data?.data)
      /*
      {
        "token": "werwerw-werwer-werc",
        "locked": false,
        "domain": "slavkia.122.com",
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

      setLoadingPayments(true)
      setApiPayments({})
      const apiTransactions = await axios.get(
        'partner/partner/accessToken/transactions?limit=50&offset=0',
        { baseUrl: '/api/' }
      ).catch(error => {
        setLoadingPayments(false)
        if (error && error.message !== "canceled") {
          setErrorMessage(t(error.response.data.error || "error." + error.message))
          if (error.response?.data?.error === "errors.token.required") {
            router.push('/admin')
          }
        }
      })

      if (apiTransactions?.data?.transactions) {
        let apiData = apiTransactions.data
        for (let transaction of apiData.transactions) {
          transaction.fiatAmount = await fiatAmountAt(transaction)
        }
        setApiPayments(apiData)
        setLoadingPayments(false)
      }
    } else {
      //if no country available
      setChoosingCountry(true)
    }
  }

  const apiPlans = {
    free: { label: "Free", price: "0" },
    basic: { label: "Basic", price: "30" },
    standard: { label: "Standard", price: "100" },
    premium: { label: "Premium", price: "250" },
  }

  const apiPrice = (tier, months = 1) => {
    if (!eurRate) return ""
    let tierRate = apiPlans[tier].price
    return <>
      <b>{(tierRate * months / eurRate).toFixed(2)} {nativeCurrency}</b> ({tierRate * months} EUR)
    </>
  }

  const apiPlanName = (userTier, tierName) => {
    let name = apiPlans[tierName].label
    if (tierName === userTier) {
      return <b>{name}</b>
    }
    return name
  }

  const apiPlanTr = (tierName, months = 1) => {
    return <tr>
      <td className='right'>
        Tier {apiPlanName(apiData.tier, tierName)} ({months === 12 ? "1 year" : (months + " month")})
      </td>
      <td className='left'>
        {apiPrice(tierName, months)}
      </td>
    </tr>
  }

  const listOfApiPlans = () => {
    if (!apiData) return ""
    return <>
      {apiData.tier !== "premium" &&
        <>
          {apiPlanTr("basic", 1)}
          {apiPlanTr("basic", 12)}
        </>
      }
      {apiPlanTr("standard", 1)}
      {apiPlanTr("standard", 12)}
      {(apiData.tier === "standart" || apiData.tier === "premium") &&
        <>
          {apiPlanTr("premium", 1)}
          {apiPlanTr("premium", 12)}
        </>
      }
    </>
  }

  const saveCountry = async () => {
    const data = await axios.put(
      'partner/partner',
      { country: billingCountry },
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response?.data?.error || "error." + error.message))
      }
    })
    if (data?.data?.country) {
      setChoosingCountry(false)
    }
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
        {((!billingCountry || choosingCountry) && !loading) ?
          <>
            <h4>Choose your country of residence</h4>
            <CountrySelect
              countryCode={billingCountry}
              setCountryCode={setBillingCountry}
              type="onlySelect"
            />
            <br />
            <button
              onClick={() => saveCountry()}
              className='button-action'
            >
              Save
            </button>
            <br />
          </>
          :
          <>
            {billingCountry &&
              <>
                Your billing country is {" "}
                <a onClick={() => setChoosingCountry(true)}>
                  {countries.getName(billingCountry, lang, { select: "official" })}
                </a>
              </>
            }

            {apiData &&
              <>
                <br /><br />
                Choose your API plan:
                {" "}
                <a href="https://docs.bithomp.com/#price-and-limits" target="_blank" rel="noreferrer">
                  https://docs.bithomp.com/#price-and-limits
                </a>

                <h4 className='center'>{/* 1. */}XRP API payment details</h4>

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
                      {listOfApiPlans()}
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
                    <table className='table-mobile'>
                      <tbody>
                        {listOfApiPlans()}
                      </tbody>
                    </table>
                  </div>
                }
                <br />
                Your plan will be activated after the payment is received.
                {width > 500 ? <br /> : " "}
                If it's not activated within 24h, please contact us at <b>partner@bithomp.com</b> <CopyButton text="partner@bithomp.com" />
              </>
            }

            {loadingPayments &&
              <div className='center'>
                <br /><br />
                <span className="waiting"></span>
                <br />
                {t("general.loading")}
                <br /><br />
              </div>
            }

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
                        <th>Fiat</th>
                        <th>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiPayments?.transactions?.map((payment, index) => {
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

            {/* PayPal option is off for now 

            {billingCountry &&
              <>
                <h4>
                  2. PayPal subcription for the Standard plan 100 EUR/month
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
              </>
            }

          */}
          </>
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
