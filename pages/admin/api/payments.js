import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'
import CopyButton from '../../../components/UI/CopyButton'

import { amountFormat, fullDateAndTime } from '../../../utils/format'
import { useWidth } from '../../../utils'

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

    const apiTransactions = await axios.get(
      'partner/partner/accessToken/transactions?limit=50&offset=0',
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
      }
    })

    setApiPayments(apiTransactions?.data)
  }

  const apiPrice = tier => {
    if (tier === "free") {
      return "Free"
    } else if (tier === "basic") {
      return "30 EUR/month"
    } else if (tier === "standard") {
      return "100 EUR/month"
    } else if (tier === "premium") {
      return "250 EUR/month"
    } else {
      return ""
    }
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-center" style={{ maxWidth: "1040px", marginBottom: "400px" }}>
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <Tabs tabList={mainTabs} tab="api" setTab={changePage} name="mainTabs" />
      <Tabs tabList={apiTabs} tab="api-payments" setTab={changePage} name="apiTabs" />

      <div className='center' style={{ height: "300px" }}>
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
                    <td className='right'>Tier {apiData.tier}</td>
                    <td className='left'>
                      {apiPrice(apiData?.tier)}
                    </td>
                  </tr>
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
                  Tier {apiData.tier}:<br />
                  {apiPrice(apiData?.tier)}
                </p>
              </div>
            }
          </>
        }
        <div style={{ marginTop: "20px", textAlign: "left" }}>
          <h4 className='center'>The last API payments</h4>
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
                    <td>{amountFormat(payment.amount * 1000000)}</td>
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
