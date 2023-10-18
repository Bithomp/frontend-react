import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { Buffer } from 'buffer'
import Link from 'next/link'

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { id } = query
  //keep it from query instead of params, anyway it is an array sometimes
  const account = id ? (Array.isArray(id) ? id[0] : id) : ""
  return {
    props: {
      id: account,
      ...(await serverSideTranslations(locale, ['common', 'governance'])),
    },
  }
}

import SEO from '../../components/SEO'

import { useWidth, ledgerName, xlfToSeconds } from '../../utils'
import { codeHighlight, duration } from '../../utils/format'

export default function Governance({ id }) {
  const { t } = useTranslation(['common', 'governance'])
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [rawData, setRawData] = useState({})
  const [data, setData] = useState([])
  const [govData, setGovData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showRawData, setShowRawData] = useState(false)

  const controller = new AbortController()

  const checkApi = async () => {
    if (!id) {
      //genesis account
      id = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
    }
    let apiUrl = '/xrpl/objects/' + id

    setLoading(true)
    setRawData({})
    setData([])
    setGovData({})

    const response = await axios.get(apiUrl, {
      signal: controller.signal
    }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    const newdata = response?.data?.[0]

    if (newdata) {
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.Hooks) {
        setErrorMessage("")
        for (let i = 0; i < newdata.Hooks.length; i++) {
          if (newdata.Hooks[i].Hook.HookHash === "78CA3F5BD3D4F7B32A6BEBB3844380A9345C9BA496EFEB30314BDDF405D7B4B3") {
            const hookParameters = newdata.Hooks[i].Hook.HookParameters
            let parameters = []
            let governanceData = {
              rewardRate: null,
              rewardDuration: null,
              memberCount: null
            }
            for (let j = 0; j < hookParameters.length; j++) {
              if (hookParameters[j].HookParameter.HookParameterName === "494D43") {
                governanceData.memberCount = parseInt(hookParameters[j].HookParameter.HookParameterValue, 16)
              } else if (hookParameters[j].HookParameter.HookParameterName === "495252") {
                governanceData.rewardRate = xlfToSeconds(hookParameters[j].HookParameter.HookParameterValue)
              } else if (hookParameters[j].HookParameter.HookParameterName === "495244") {
                governanceData.rewardDuration = xlfToSeconds(hookParameters[j].HookParameter.HookParameterValue)
              } else if (hookParameters[j].HookParameter.HookParameterName.substring(0, 4) === "4953") {
                parameters.push({
                  name: "Seat " + parseInt(hookParameters[j].HookParameter.HookParameterName.substring(4), 16),
                  value: hookParameters[j].HookParameter.HookParameterValue
                })
              } else {
                parameters.push({
                  name: Buffer.from(hookParameters[j].HookParameter.HookParameterName, 'hex').toString(),
                  value: hookParameters[j].HookParameter.HookParameterValue
                })
              }
            }
            setGovData(governanceData)
            setData(parameters)
            break
          }
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
    [
      {
        "Account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        "Flags": 0,
        "Hooks": [
          {
            "Hook": {
              "HookHash": "78CA3F5BD3D4F7B32A6BEBB3844380A9345C9BA496EFEB30314BDDF405D7B4B3",
              "HookParameters": [
                {
                  "HookParameter": {
                    "HookParameterName": "495252",
                    "HookParameterValue": "55554025A6D7CB53"
                  }
                },
                {
                  "HookParameter": {
                    "HookParameterName": "494D43",
                    "HookParameterValue": "08"
                  }
                }
              ]
            }
          },
          {
            "Hook": {
              "HookHash": "610F33B8EBF7EC795F822A454FB852156AEFE50BE0CB8326338A81CD74801864",
              "HookParameters": []
            }
          }
        ],
        "LedgerEntryType": "Hook",
        "OwnerNode": "0",
        "PreviousTxnID": "4349F9C72C5C9A562299D82E46CDFFEEB9BA75F4E544DE38555FBCB53E7F310A",
        "PreviousTxnLgrSeq": 3,
        "index": "469372BEE8814EC52CA2AECB5374AB57A47B53627E3C0E2ACBE3FDC78DBFEC7B"
      }
    ]
  */

  useEffect(() => {
    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id])

  return <>
    <SEO title={t("header", { ns: "governance", ledgerName })} />
    <div className="content-text">
      <h1 className="center">
        {t("header", { ns: "governance", ledgerName })}
        {id ? <><br /><br />{id}</> : ""}
      </h1>
      <div className='flex'>
        <div className="grey-box center">
          {loading ?
            t("general.loading")
            :
            <>
              <Trans i18nKey="summary" ns="governance">
                There are <b>{{ countTables: govData?.memberCount }}</b> seats.
              </Trans>
              {govData?.rewardRate &&
                <>
                  {" "}
                  <Trans i18nKey="reward-rate" ns="governance">
                    Reward rate: <b>{{ rewardRate: (Math.round((((1 + govData.rewardRate) ** 12) - 1) * 10000) / 100) + " % pa" }}</b>.
                  </Trans>
                </>
              }
              {govData?.rewardDuration &&
                <>
                  {" "}
                  <Trans i18nKey="reward-duration" ns="governance">
                    Reward duration: <b>{{ rewardDuration: duration(t, govData.rewardDuration, { seconds: true }) }}</b> ({{
                      rewardDurationSeconds: govData.rewardDuration
                    }} seconds).
                  </Trans>
                </>
              }
            </>
          }
        </div >
      </div >
      {!id &&
        <div className='center'>
          <br />
          <Link href="r4FRPZbLnyuVeGiSi1Ap6uaaPvPXYZh1XN">Table 6: r4FRPZbLnyuVeGiSi1Ap6uaaPvPXYZh1XN</Link>
        </div>
      }
      <br />
      {
        (windowWidth > 1000) ?
          <table className="table-large shrink">
            <thead>
              <tr>
                <th className='left'>{t("table.name")}</th>
                <th className='right'>{t("table.address")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ?
                <tr className='right'>
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
                        data.map((p, i) =>
                          <tr key={i}>
                            <td className='left'>
                              {p.name}
                            </td>
                            <td className='right'>
                              {p.value}
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
                  {!errorMessage ? data.map((av, i) =>
                    <tr key={i}>
                      <td style={{ padding: "0 10px" }}>
                        <p>
                          {t("table.name")}: {av.name}
                        </p>
                        <p>
                          {t("table.address")}: {av.value}
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
      <div className='center'>
        <br />
        {t("table.raw-data")}: <span className='link' onClick={() => setShowRawData(!showRawData)}>
          {showRawData ? t("table.text.hide") : t("table.text.show")}
        </span>
        <br /><br />
      </div>
      <div className={'slide ' + (showRawData ? "opened" : "closed")}>
        {codeHighlight(rawData)}
      </div>
    </div>
  </>
}
