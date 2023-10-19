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

import { ledgerName, xlfToSeconds } from '../../utils'
import { codeHighlight, duration } from '../../utils/format'

export default function Governance({ id }) {
  const { t } = useTranslation(['common', 'governance'])
  const router = useRouter()

  const { isReady } = router

  const [rawData, setRawData] = useState({})
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
    let apiUrl = 'xrpl/accountNamespace/' + id + '/0000000000000000000000000000000000000000000000000000000000000000'

    setLoading(true)
    setRawData({})
    setGovData({})

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
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.namespace_entries) {
        setErrorMessage("")
        const entries = newdata.namespace_entries
        let governanceData = {
          rewardRate: null,
          rewardDuration: null,
          memberCount: null,
          members: [],
          parameters: [],
          votes: {
            seat: [],
            hook: [],
            reward: {
              rate: [],
              delay: []
            }
          },
          count: {
            seat: [],
            hook: [],
            reward: {
              rate: [],
              delay: []
            }
          }
        }
        for (let j = 0; j < entries.length; j++) {
          const firstLetter = entries[j].HookStateKey.substring(0, 2)
          if (entries[j].HookStateKey === "0000000000000000000000000000000000000000000000000000000000004D43") {
            governanceData.memberCount = parseInt(entries[j].HookStateData, 16)
          } else if (entries[j].HookStateKey === "0000000000000000000000000000000000000000000000000000000000005252") {
            governanceData.rewardRate = xlfToSeconds(entries[j].HookStateData)
          } else if (entries[j].HookStateKey === "0000000000000000000000000000000000000000000000000000000000005244") {
            governanceData.rewardDuration = xlfToSeconds(entries[j].HookStateData)
          } else if (entries[j].HookStateKey.substring(0, 62) === "00000000000000000000000000000000000000000000000000000000000000") {
            //members
            const seat = parseInt(entries[j].HookStateKey.substring(62), 16)
            governanceData.members[seat] = {
              key: "Seat " + seat,
              value: entries[j].HookStateData
            }
          } else if (firstLetter === "56" || firstLetter === "43") {
            //votes and counts
            const secondLetter = entries[j].HookStateKey.substring(2, 4)
            let val = {
              key: entries[j].HookStateKey,
              value: entries[j].HookStateData,
              targetLayer: entries[j].HookStateKey.substring(7, 8)
            }
            if (firstLetter === "56") {
              //votes
              val.voter = entries[j].HookStateKey.substring(24)
            } else {
              //counts
              val.address = entries[j].HookStateKey.substring(24)
            }
            if (secondLetter === "53") {
              //seat
              val.seat = parseInt(entries[j].HookStateKey.substring(4, 6), 16)
              if (firstLetter === "56") {
                //votes
                governanceData.votes.seat.push(val)
              } else {
                //count
                val.value = parseInt(val.value, 16)
                governanceData.count.seat.push(val)
              }
            } else if (secondLetter === "48") {
              //hook
              val.topic = parseInt(entries[j].HookStateKey.substring(4, 6))
              if (firstLetter === "56") {
                governanceData.votes.hook.push(val)
              } else {
                val.value = parseInt(val.value, 16)
                governanceData.count.hook.push(val)
              }
            } else if (secondLetter === "52") {
              //reward
              const thirdLetter = entries[j].HookStateKey.substring(4, 6)
              if (thirdLetter === "52") {
                //rate
                if (firstLetter === "56") {
                  val.value = xlfToSeconds(val.value)
                  governanceData.votes.reward.rate.push(val)
                } else {
                  val.rate = xlfToSeconds(entries[j].HookStateKey.substring(48))
                  val.value = parseInt(val.value, 16)
                  governanceData.count.reward.rate.push(val)
                }
              } else if (thirdLetter === "44") {
                //delay
                if (firstLetter === "56") {
                  val.value = xlfToSeconds(val.value)
                  governanceData.votes.reward.delay.push(val)
                } else {
                  val.delay = parseInt(entries[j].HookStateKey.substring(48))
                  val.value = parseInt(val.value, 16)
                  governanceData.count.reward.delay.push(val)
                }
              }
            }
          } else {
            governanceData.parameters.push({
              key: entries[j].HookStateKey,
              value: entries[j].HookStateData
            })
          }
        }
        setGovData(governanceData)
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
      "account": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      "ledger_hash": "8B7B8254C1C01A300804DFB9885E63DB483BD9BA6676A31651DD35326877AE5B",
      "ledger_index": 259854,
      "namespace_entries": [
        {
          "Flags": 0,
          "HookStateData": "00",
          "HookStateKey": "00000000000000000000000088CECA8ED635F79573136EAAA2B70F07C2F2B9D8",
          "LedgerEntryType": "HookState",
          "OwnerNode": "0",
          "index": "0895F253FDCBFAF5A7DAE54AB2BF04A81595D360799036CAF36D2B0542C08DC7"
        },
  */

  useEffect(() => {
    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id])

  const rewardRateHuman = rewardRate => {
    if (!rewardRate) return "0 % pa"
    if (rewardRate === "<zero>") return rewardRate
    return (Math.round((((1 + rewardRate) ** 12) - 1) * 10000) / 100) + " % pa"
  }

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
                    Reward rate: <b>{{ rewardRate: rewardRateHuman(govData.rewardRate) }}</b>.
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
      <h4 className='center'>Members</h4>
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
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.members) ?
                <>
                  {govData.members.length &&
                    govData.members.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
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
      <br />
      <h4 className='center'>Votes Seats</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Voter</th>
            <th className='left'>Target layer</th>
            <th className='left'>Seat</th>
            <th className='right'>{t("table.address")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.votes?.seat) ?
                <>
                  {govData.votes.seat.length > 0 &&
                    govData.votes.seat.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.voter}
                        </td>
                        <td className='left'>
                          {p.targetLayer}
                        </td>
                        <td className='left'>
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
      <h4 className='center'>Votes Reward Rate</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Voter</th>
            <th className='left'>Target layer</th>
            <th className='right'>Rate</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.votes?.reward?.rate) ?
                <>
                  {govData.votes.reward.rate.length > 0 &&
                    govData.votes.reward.rate.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.voter}
                        </td>
                        <td className='left'>
                          {p.targetLayer}
                        </td>
                        <td className='right'>
                          {rewardRateHuman(p.value)}
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
      <h4 className='center'>Votes Reward Delay</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Voter</th>
            <th className='left'>Target layer</th>
            <th className='right'>Delay</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.votes?.reward?.delay) ?
                <>
                  {govData.votes.reward.delay.length > 0 &&
                    govData.votes.reward.delay.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.voter}
                        </td>
                        <td className='left'>
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
      <h4 className='center'>Votes Hooks</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='right'>Voter</th>
            <th className='right'>Topic</th>
            <th className='right'>Target layer</th>
            <th className='right'>Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.votes?.hook) ?
                <>
                  {govData.votes.hook.length > 0 &&
                    govData.votes.hook.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.voter}
                        </td>
                        <td className='left'>
                          {p.topic}
                        </td>
                        <td className='left'>
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
      <br />
      <h4 className='center'>Votes Seats Count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Address</th>
            <th className='left'>Target layer</th>
            <th className='left'>Seat</th>
            <th className='right'>Votes</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.count?.seat) ?
                <>
                  {govData.count.seat.length > 0 &&
                    govData.count.seat.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.address}
                        </td>
                        <td className='left'>
                          {p.targetLayer}
                        </td>
                        <td className='left'>
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
      <h4 className='center'>Votes Reward Rate Count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Rate</th>
            <th className='left'>Target layer</th>
            <th className='right'>Count</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.count?.reward?.rate) ?
                <>
                  {govData.count.reward.rate.length > 0 &&
                    govData.count.reward.rate.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {rewardRateHuman(p.rate)}
                        </td>
                        <td className='left'>
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
      <h4 className='center'>Votes Reward Delay Count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Delay</th>
            <th className='left'>Target layer</th>
            <th className='right'>Count</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.count?.reward?.delay) ?
                <>
                  {govData.count.reward.delay.length > 0 &&
                    govData.count.reward.delay.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.delay} seconds
                        </td>
                        <td className='left'>
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
      <h4 className='center'>Votes Hooks Count</h4>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='left'>Key</th>
            <th className='left'>Topic</th>
            <th className='left'>Target layer</th>
            <th className='right'>Count</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.count?.hook) ?
                <>
                  {govData.count.hook.length > 0 &&
                    govData.count.hook.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
                          {p.key}
                        </td>
                        <td className='left'>
                          {p.topic}
                        </td>
                        <td className='left'>
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
            <th className='left'>Key</th>
            <th className='right'>Value</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='right'>
              <td colSpan="100">
                <br />
                <span className="waiting"></span>
                <div className='center'>
                  <br />
                  {t("general.loading")}
                </div>
                <br />
              </td>
            </tr>
            :
            <>
              {(!errorMessage && govData?.members) ?
                <>
                  {govData.parameters.length &&
                    govData.parameters.map((p, i) =>
                      <tr key={i}>
                        <td className='left'>
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
