import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

export const getServerSideProps = async ({ query, locale }) => {
  const { period } = query
  return {
    props: {
      period: period || "week",
      ...(await serverSideTranslations(locale, ['common', 'rich-list'])),
    },
  }
}

import SEO from '../components/SEO'

import { useWidth } from '../utils'
import {
  trWithAccount,
  amountFormat,
  userOrServiceLink,
  niceNumber
} from '../utils/format'

export default function RichList() {
  const { t } = useTranslation(['common', 'rich-list'])
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [data, setData] = useState([])
  const [rawData, setRawData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const controller = new AbortController()

  const checkApi = async () => {
    let apiUrl = 'v2/addresses/richlist'

    setLoading(true)
    setRawData({})
    setData([])

    const response = await axios.get(apiUrl, {
      signal: controller.signal
    }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    const newdata = response?.data;

    if (newdata) {
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.addresses) {
        let list = newdata.addresses
        if (list.length > 0) {
          setErrorMessage("")
          setData(list)
        } else {
          setErrorMessage(t("general.no-data"))
        }
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage("Error")
          console.log(newdata)
        }
      }
    }
  }

  /*
    {
      "summary": {
        "maxCoins": "100000000000000000",
        "totalCoins": "99988432439120264",
        "activeAccounts": 4771977
      },
      "addresses": [
        {
          "address": "rMQ98K56yXJbDGv49ZSmW51sLn94Xe1mu1",
          "balance": "1960027032479644",
          "addressDetails": {
              "username": null,
              "service": "Ripple"
          }
        },
  */

  useEffect(() => {
    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  return <>
    <SEO title={t("header", { ns: "rich-list" })} />
    <div className="content-text">
      <h1 className="center">{t("header", { ns: "rich-list" })}</h1>
      <div className='flex'>
        <div className="grey-box">
          {t("desc", { ns: 'rich-list' })}
        </div>
        <div className="grey-box">
          {loading ?
            t("general.loading")
            :
            <Trans i18nKey="summary" ns="rich-list">
              There are <b>{{ activeAccounts: niceNumber(rawData?.summary?.activeAccounts) }}</b> active accounts, total available: <b>{{ totalCoins: amountFormat(rawData?.summary?.totalCoins) }}</b>
            </Trans>
          }
        </div >
      </div >
      <br />
      {
        (windowWidth > 1000) ?
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className='center'>{t("table.index")}</th>
                <th>{t("table.address")}</th>
                <th className='right'>{t("table.balance")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ?
                <tr className='center'>
                  <td colSpan="100">
                    <br />
                    <span className="waiting"></span>
                    <br />{t("general.loading")}<br />
                    <br />
                  </td>
                </tr>
                :
                <>
                  {(!errorMessage && data) ?
                    <>
                      {data.length > 0 &&
                        data.map((r, i) =>
                          <tr key={i}>
                            <td className='center'>{i + 1}</td>
                            <td>
                              <table>
                                <tbody>
                                  {trWithAccount(r, 'address')}
                                </tbody>
                              </table>
                            </td>
                            <td className='right'>
                              {amountFormat(r.balance)}
                            </td>
                          </tr>
                        )
                      }
                    </>
                    :
                    <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                  }
                </>
              }
            </tbody>
          </table>
          :
          <table className="table-mobile">
            <thead>
            </thead>
            <tbody>
              {loading ?
                <tr className='center'>
                  <td colSpan="100">
                    <br />
                    <span className="waiting"></span>
                    <br />{t("general.loading")}<br />
                    <br />
                  </td>
                </tr>
                :
                <>
                  {!errorMessage ? data.map((r, i) =>
                    <tr key={i}>
                      <td style={{ padding: "5px" }} className='center'>
                        <b>{i + 1}</b>
                      </td>
                      <td>
                        <p>
                          {t("table.address")}: <a href={"/explorer/" + r.address}>{r.address}</a> {userOrServiceLink(r, 'address')}
                        </p>
                        {r.service &&
                          <p>
                            {t("table.service", { ns: "rich-list" })}: {r.service}
                          </p>
                        }
                        <p>
                          {t("table.balance")}: {amountFormat(r.balance)}
                        </p>
                      </td>
                    </tr>)
                    :
                    <tr><td colSpan="100" className='center orange bold'>{errorMessage}</td></tr>
                  }
                </>
              }
            </tbody>
          </table>
      }
    </div>
  </>
}
