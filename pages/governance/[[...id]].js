import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
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

import { ledgerName } from '../../utils'
import { duration } from '../../utils/format'

const l2Tables = [
  'rwyypATD1dQxDbdQjMvrqnsHr2cQw5rjMh',
  'r4FRPZbLnyuVeGiSi1Ap6uaaPvPXYZh1XN',
  'r6QZ6zfK37ZSec5hWiQDtbTxUaU2NWG3F'
]

const rewardRateHuman = rewardRate => {
  if (!rewardRate) return "0 % pa"
  if (rewardRate < 0 || rewardRate > 1) return "Invalid rate"
  return (Math.round((((1 + rewardRate) ** 12) - 1) * 10000) / 100) + " % pa"
}

export default function Governance({ id }) {
  const { t } = useTranslation(['common', 'governance'])
  const router = useRouter()

  const { isReady } = router

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const controller = new AbortController()

  const checkApi = async () => {
    if (!id) {
      //genesis account
      id = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
    }
    let apiUrl = 'v2/governance/' + id

    setLoading(true)
    setData({})

    const response = await axios.get(apiUrl, {
      signal: controller.signal
    }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    })
    const newdata = response?.data
    if (newdata) {
      setLoading(false) //keep here for fast tab clickers
      if (newdata.members) {
        setErrorMessage("")
        setData(newdata)
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
      "rewardRate": 0.003333333333333333,
      "rewardDuration": 2600000,
      "memberCount": 9,
      "members": [
        {
          "key": 0,
          "value": "rD74dUPRFNfgnY2NzrxxYRXN4BrfGSN6Mv"
        }
      ],
      "votes": {
        "seat": [
          {
            "key": "5653130100000000000000003C04E36FA4EEFC7F60CD7BF0D966DCADF183EA88",
            "value": "rGcK1jLkmSvWfiSW58cZZehCVxxMQUYpSz",
            "targetLayer": "1",
            "voter": "ra7MQw7YoMjUw6thxmSGE6jpAEY3LTHxev",
            "seat": 19
          }
        ],
        "hook": [
          {
            "key": "564801010000000000000000AB383381108A6BAA758168D5204C351534DE0D11",
            "value": "8D88E66BF2DA605E74BC4E3BB8945948F6EC5D9AD4BDE4568C95B200BBD4E0A5",
            "targetLayer": "1",
            "voter": "rGcK1jLkmSvWfiSW58cZZehCVxxMQUYpSz",
            "topic": 1
          }
        ],
        "reward": {
          "rate": [
            {
              "key": "565252010000000000000000EF6606A681D2ECB99EA04FC0229C23153D76BC59",
              "value": 0.00333333333333333,
              "targetLayer": "1",
              "voter": "r4FF5jjJMS2XqWDyTYStWrgARsj3FjaJ2J"
            }
          ],
          "delay": [
            {
              "key": "5652440100000000000000003C04E36FA4EEFC7F60CD7BF0D966DCADF183EA88",
              "value": 60,
              "targetLayer": "1",
              "voter": "ra7MQw7YoMjUw6thxmSGE6jpAEY3LTHxev"
            }
          ]
        }
      },
      "count": {
        "seat": [
          {
            "key": "435308010000000000000000ECB683302AEF5DA5515D2A74F5CD20D5974B36D7",
            "value": 1,
            "targetLayer": "1",
            "address": "r42dfTCpeAFcNnjSuvDszkFPJE4z6jMMJ4",
            "seat": 8
          }
        ],
        "hook": [
          {
            "key": "43480101F2DA605E74BC4E3BB8945948F6EC5D9AD4BDE4568C95B200BBD4E0A5",
            "value": 1,
            "targetLayer": "1",
            "address": "rHFyskWsfqqhdTVfHVBagsEvuXxLJ4vsXy",
            "topic": 1
          }
        ],
        "reward": {
          "rate": [
            {
              "key": "43525201000000000000000000000000000000000000000052554025A6D7CB53",
              "value": 2,
              "targetLayer": "1",
              "address": "rrrrrrrrrrrrrpZfdWaH5NW4982mSX",
              "rate": 0.00333333333333333
            }
          ],
          "delay": [
            {
              "key": "4352440100000000000000000000000000000000000000000000A7DCF750D554",
              "value": 7,
              "targetLayer": "1",
              "address": "rrrrrrrrrrrrrrrwRzQG1jSrGzrxT",
              "delay": 0
            }
          ]
        }
      },
      "parameters": [
        {
          "key": "00000000000000000000000088CECA8ED635F79573136EAAA2B70F07C2F2B9D8",
          "value": "00"
        }
      ]
    }
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
                There are <b>{{ countTables: data?.memberCount }}</b> seats.
              </Trans>
              {data?.rewardRate &&
                <>
                  {" "}
                  <Trans i18nKey="reward-rate" ns="governance">
                    Reward rate: <b>{{ rewardRate: rewardRateHuman(data.rewardRate) }}</b>.
                  </Trans>
                </>
              }
              {data?.rewardDuration &&
                <>
                  {" "}
                  <Trans i18nKey="reward-duration" ns="governance">
                    Reward duration: <b>{{ rewardDuration: duration(t, data.rewardDuration, { seconds: true }) }}</b> ({{
                      rewardDurationSeconds: data.rewardDuration
                    }} seconds).
                  </Trans>
                </>
              }
            </>
          }
        </div>
      </div>
      <br />
      <h4 className='center'>Members</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='center'>Seat</th>
            <th>{t("table.address")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.members) ?
                <>
                  {data.members.length &&
                    data.members.map((p, i) =>
                      <tr key={i}>
                        <td className='center'>
                          {p.key}
                        </td>
                        <td>
                          {l2Tables.includes(p.value) ?
                            <Link href={p.value}>{p.value}</Link> :
                            p.value
                          }
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
      <br />
      <h4 className='center'>Seat votes</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Voter</th>
            <th className='center'>Target layer</th>
            <th className='center'>Seat</th>
            <th>{t("table.address")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.votes?.seat) ?
                <>
                  {data.votes.seat.length > 0 &&
                    data.votes.seat.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.voter}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
                        </td>
                        <td className='center'>
                          {p.seat}
                        </td>
                        <td>
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
      <br />
      <h4 className='center'>Reward rate votes</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Voter</th>
            <th className='center'>Target layer</th>
            <th className='right'>Rate</th>
            <th className='right'>Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.votes?.reward?.rate) ?
                <>
                  {data.votes.reward.rate.length > 0 &&
                    data.votes.reward.rate.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.voter}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
                        </td>
                        <td className='right'>
                          {rewardRateHuman(p.value)}
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
      <br />
      <h4 className='center'>Reward delay votes</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Voter</th>
            <th className='center'>Target layer</th>
            <th className='right'>Delay</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.votes?.reward?.delay) ?
                <>
                  {data.votes.reward.delay.length > 0 &&
                    data.votes.reward.delay.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.voter}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
                        </td>
                        <td className='right'>
                          {p.value} seconds
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
      <br />
      <h4 className='center'>Hook votes</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Voter</th>
            <th className='center'>Topic</th>
            <th className='center'>Target layer</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.votes?.hook) ?
                <>
                  {data.votes.hook.length > 0 &&
                    data.votes.hook.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.voter}
                        </td>
                        <td className='center'>
                          {p.topic}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
                        </td>
                        <td>
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
      <br />
      <br />
      <h4 className='center'>Seat votes count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Address</th>
            <th className='center'>Target layer</th>
            <th className='center'>Seat</th>
            <th className='right'>Votes</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.count?.seat) ?
                <>
                  {data.count.seat.length > 0 &&
                    data.count.seat.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.address}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
                        </td>
                        <td className='center'>
                          {p.seat}
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
      <br />
      <h4 className='center'>Reward rate votes count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='right'>Rate</th>
            <th className='right'>Value</th>
            <th className='center'>Target layer</th>
            <th className='right'>Count</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.count?.reward?.rate) ?
                <>
                  {data.count.reward.rate.length > 0 &&
                    data.count.reward.rate.map((p, i) =>
                      <tr key={i}>
                        <td className='right'>
                          {rewardRateHuman(p.rate)}
                        </td>
                        <td className='right'>
                          {p.rate}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
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
      <br />
      <h4 className='center'>Reward delay votes count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='right'>Delay</th>
            <th className='center'>Target layer</th>
            <th className='right'>Count</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.count?.reward?.delay) ?
                <>
                  {data.count.reward.delay.length > 0 &&
                    data.count.reward.delay.map((p, i) =>
                      <tr key={i}>
                        <td className='right'>
                          {p.delay} seconds
                        </td>
                        <td className='center'>
                          {p.targetLayer}
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
      <br />
      <h4 className='center'>Hook votes count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Key</th>
            <th className='center'>Topic</th>
            <th className='center'>Target layer</th>
            <th className='right'>Count</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.count?.hook) ?
                <>
                  {data.count.hook.length > 0 &&
                    data.count.hook.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.key}
                        </td>
                        <td className='center'>
                          {p.topic}
                        </td>
                        <td className='center'>
                          {p.targetLayer}
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
      <br />
      <h4 className='center'>Parameters</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>Key</th>
            <th className='right'>Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <div className='center'>
                  <span className="waiting"></span>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && data?.members) ?
                <>
                  {data.parameters.length &&
                    data.parameters.map((p, i) =>
                      <tr key={i}>
                        <td>
                          {p.key}
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
    </div>
  </>
}
