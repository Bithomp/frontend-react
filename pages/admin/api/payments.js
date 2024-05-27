import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import CopyButton from '../../../components/UI/CopyButton'

import { amountFormat, fullDateAndTime, niceNumber } from '../../../utils/format'
import { nativeCurrency, useWidth } from '../../../utils'
import { getIsSsrMobile } from '../../../utils/mobile'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

import LinkIcon from "../../../public/images/link.svg"
import AdminTabs from '../../../components/Admin/Tabs'
import BillingCountry from '../../../components/Admin/BillingCountry'

export default function Payments() {
  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [apiData, setApiData] = useState(null)
  const [apiPayments, setApiPayments] = useState({})
  const router = useRouter()
  const width = useWidth()
  const [eurRate, setEurRate] = useState(0)
  const [billingCountry, setBillingCountry] = useState("")
  const [choosingCountry, setChoosingCountry] = useState(false)
  const [loading, setLoading] = useState(false)
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
    //check rates, and show transaction history only 
    setLoading(true)
    const data = await axios.get(
      'partner/partner/accessToken',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response?.data?.error || "error." + error.message))
      }
      setLoading(false)
    })

    setLoading(false)

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

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <AdminTabs name="mainTabs" tab="api" />
      <AdminTabs name="apiTabs" tab="api-payments" />

      <div className='center'>

        <BillingCountry
          billingCountry={billingCountry}
          setBillingCountry={setBillingCountry}
          choosingCountry={choosingCountry}
          setChoosingCountry={setChoosingCountry}
        />

        {!((!billingCountry || choosingCountry) && !loading) &&
          <>
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
                        <td className='left'>rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3 <CopyButton text="rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3" /></td>
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
                      rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3 <CopyButton text="rEDakigd4Cp78FioF3qvQs6TrjFLjKLqM3" />
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
