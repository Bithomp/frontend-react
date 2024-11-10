import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import Link from 'next/link'

import { useIsMobile, getIsSsrMobile } from '../../utils/mobile'

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { id } = query
  //keep it from query instead of params, anyway it is an array sometimes
  const account = id ? (Array.isArray(id) ? id[0] : id) : ''
  return {
    props: {
      id: account,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'governance']))
    }
  }
}

import SEO from '../../components/SEO'

import { ledgerName, rewardRateHuman } from '../../utils'
import { duration, shortAddress, shortHash, addressUsernameOrServiceLink, userOrServiceName } from '../../utils/format'

import LinkIcon from '../../public/images/link.svg'
import CopyButton from '../../components/UI/CopyButton'

export default function Governance({ id, setSignRequest, refreshPage, account }) {
  const { t } = useTranslation(['common', 'governance'])
  const router = useRouter()
  const isMobile = useIsMobile()

  const { isReady } = router

  const [data, setData] = useState({})
  const [majority, setMajority] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingHooksList, setLoadingHooksList] = useState(false)
  const [hookList, setHookList] = useState([])

  const controller = new AbortController()
  const controller2 = new AbortController()

  const mainTable = !id || id === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
  const tableAddress = id || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'

  const showMajority = (data, typeName) => {
    if (!typeName) return ''
    const needVotes = mainTable || data.targetLayer !== '1' ? majority[typeName] : majority.fromL1ToL2
    if (data.value >= needVotes)
      return (
        <span className="green">
          {data.value} / {needVotes}
        </span>
      )
    return (
      <>
        {data.value} / {needVotes}
      </>
    )
  }

  const reachedMajority = (data, typeName) => {
    if (!typeName) return ''
    const needVotes = mainTable || data.targetLayer !== '1' ? majority[typeName] : majority.fromL1ToL2
    if (data.value >= needVotes) return true
    return false
  }

  const tableLink = (p) => {
    if (p.layer === 2) {
      return (
        <Link href={p.value}>
          L2 <LinkIcon />
        </Link>
      )
    }
    return 'L1'
  }

  const seatNumber = (members, address) => {
    if (members?.length > 0) {
      const seat = members.find((m) => m.value === address)
      if (seat) {
        return seat.key
      }
    }
    return 'not found'
  }

  const seatAddress = (addressData, addessName, addressOption) => {
    if (addressData[addessName] === 'rrrrrrrrrrrrrrrrrrrrrhoLvTp') {
      return t('table.text.vacate-seat', { ns: 'governance' })
    }
    return (
      <>
        <CopyButton text={addressData[addessName]} />{' '}
        {addressUsernameOrServiceLink(addressData, addessName, addressOption)}
      </>
    )
  }

  const hookHash = (value) => {
    if (value === '0000000000000000000000000000000000000000000000000000000000000000') {
      return t('table.text.vacate-place', { ns: 'governance' })
    }
    return (
      <>
        {shortHash(value, 16)} <CopyButton text={value} />
      </>
    )
  }

  const seatNumberAndName = (addressData, addessName, options) => {
    const seat = seatNumber(data?.members, addressData[addessName])
    let coloredName = userOrServiceName(addressData[addessName + 'Details'])

    if (coloredName) {
      coloredName = (
        <span className="tooltip">
          {coloredName}
          <span className="tooltiptext right">{shortAddress(addressData[addessName])}</span>
        </span>
      )
    }

    if (seat === 'not found') {
      return (
        <>
          <span className="orange">{t('table.no-seat', { ns: 'governance' })}</span>
          {!options?.short && (
            <>
              {' '}
              - <CopyButton text={addressData[addessName]} /> {coloredName || shortAddress(addressData[addessName], 4)}
            </>
          )}
        </>
      )
    }
    return (
      <>
        {t('table.seat', { ns: 'governance' })} {seat}
        {!options?.short && <> - {coloredName || shortAddress(addressData[addessName])}</>}
      </>
    )
  }

  const checkApi = async () => {
    if (!id) {
      //genesis account
      id = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
    }
    let apiUrl = 'v2/governance/' + id

    setLoading(true)
    setLoadingHooksList(true)
    setData({})
    setMajority({})
    setHookList([])

    const accountObjectsData = await axios
      .get('xrpl/objects/' + id, {
        signal: controller2.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoadingHooksList(false)
        }
      })
    const accountObjects = accountObjectsData?.data
    if (accountObjects) {
      setLoadingHooksList(false)
      const accountObjectWithHooks =
        accountObjects.length > 0 ? accountObjects.find((o) => o.LedgerEntryType === 'Hook') : []
      if (accountObjectWithHooks?.Hooks?.length > 0) {
        const hooks = accountObjectWithHooks.Hooks
        const hookHashes = hooks.map((h) => h.Hook.HookHash)
        setHookList(hookHashes)
      }
    }

    const response = await axios
      .get(apiUrl, {
        signal: controller.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false) //keep here for fast tab clickers
        }
      })
    const newdata = response?.data
    if (newdata) {
      setLoading(false) //keep here for fast tab clickers
      if (newdata.members) {
        setErrorMessage('')
        let majObj = {
          voteL1: Math.floor(newdata.memberCount * 0.8), //80% of seats
          fromL1ToL2: Math.floor(newdata.memberCount * 0.5), //50% of seats
          reward: newdata.memberCount, // 100% of seats
          hook: newdata.memberCount // 100% of seats
        }
        if (majObj.fromL1ToL2 < 2) majObj.fromL1ToL2 = 2 //minimum 2 votes
        if (majObj.voteL1 < 2) majObj.voteL1 = 2 //minimum 2 votes
        setMajority(majObj)
        //sort by vote count
        if (newdata.count && newdata.votes) {
          const members = newdata.members
          newdata.count = {
            seat: newdata.count.seat.sort((a, b) =>
              a.value < b.value ? 1 : a.value > b.value ? -1 : a.seat > b.seat ? 1 : -1
            ),
            hook: newdata.count.hook.sort((a, b) =>
              a.value < b.value
                ? 1
                : a.value > b.value
                ? -1
                : a.targetLayer > b.targetLayer
                ? 1
                : a.targetLayer < b.targetLayer
                ? -1
                : a.topic > b.topic
                ? 1
                : -1
            ),
            reward: {
              rate: newdata.count.reward.rate.sort((a, b) => (a.value < b.value ? 1 : -1)),
              delay: newdata.count.reward.delay.sort((a, b) => (a.value < b.value ? 1 : -1))
            }
          }
          newdata.votes = {
            seat: newdata.votes.seat.sort((a, b) =>
              a.seat > b.seat
                ? 1
                : a.seat < b.seat
                ? -1
                : seatNumber(members, a.voter) > seatNumber(members, b.voter)
                ? 1
                : -1
            ),
            hook: newdata.votes.hook.sort((a, b) =>
              a.targetLayer > b.targetLayer
                ? 1
                : a.targetLayer < b.targetLayer
                ? -1
                : a.topic > b.topic
                ? 1
                : a.topic < b.topic
                ? -1
                : seatNumber(members, a.voter) > seatNumber(members, b.voter)
                ? 1
                : -1
            ),
            reward: {
              rate: newdata.votes.reward.rate.sort((a, b) =>
                a.value < b.value
                  ? 1
                  : a.value > b.value
                  ? -1
                  : seatNumber(members, a.voter) > seatNumber(members, b.voter)
                  ? 1
                  : -1
              ),
              delay: newdata.votes.reward.delay.sort((a, b) =>
                a.value < b.value
                  ? 1
                  : a.value > b.value
                  ? -1
                  : seatNumber(members, a.voter) > seatNumber(members, b.voter)
                  ? 1
                  : -1
              )
            }
          }
          newdata.parameters = newdata.parameters.sort((a, b) => (a.value > b.value ? 1 : -1))
        }
        //newdata.nftOffers.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1)
        setData(newdata)
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }
    }
  }

  /*
    {
      "rewardRate": 0.003333333333333333,
      "rewardDelay": 2600000,
      "rewardDuration": 2600000, //deprecated
      "memberCount": 9,
      "members": [
        {
          "key": 0,
          "value": "rD74dUPRFNfgnY2NzrxxYRXN4BrfGSN6Mv",
          "layer": 1
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
      controller2.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id, refreshPage])

  const addressOption = isMobile ? { short: true } : {}
  const canVote = account?.address && data?.members?.find((m) => m.value === account.address)

  return (
    <>
      <SEO title={t('header', { ns: 'governance', ledgerName })} />
      <div className="page-governance content-text">
        <h1 className="center">{t('header', { ns: 'governance', ledgerName })}</h1>
        {id ? <h4 className="center">{id}</h4> : ''}
        <div className="center">
          {loading ? (
            t('general.loading')
          ) : (
            <>
              <Trans i18nKey="summary" ns="governance">
                There are <b>{{ countTables: data?.memberCount }}</b> seats.
              </Trans>
              {data?.rewardRate && (
                <>
                  {' '}
                  <Trans i18nKey="reward-rate" ns="governance">
                    Reward rate: <b>{{ rewardRate: rewardRateHuman(data.rewardRate) }}</b>.
                  </Trans>
                </>
              )}
              {(data?.rewardDelay || data?.rewardDuration) && (
                <>
                  {' '}
                  <Trans i18nKey="reward-delay" ns="governance">
                    Reward delay:{' '}
                    <b>{{ rewardDelay: duration(t, data.rewardDelay || data.rewardDuration, { seconds: true }) }}</b> (
                    {{
                      rewardDelaySeconds: data.rewardDelay || data.rewardDuration
                    }}{' '}
                    seconds).
                  </Trans>
                </>
              )}
            </>
          )}
        </div>
        {!mainTable && (
          <div className="center">
            <br />
            <br />
            <button className="button-action center" onClick={() => router.push('/governance')}>
              <b>{t('button.show-main-table', { ns: 'governance' })}</b>
            </button>
          </div>
        )}
        <br />
        <div className="flex flex-center">
          <div className="div-with-table">
            <h4 className="center">{t('table.members', { ns: 'governance' })}</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th className="center">{t('table.seat', { ns: 'governance' })}</th>
                  <th>{t('table.address')}</th>
                  {mainTable && <th>{t('table.layer', { ns: 'governance' })}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {!errorMessage && data?.members ? (
                      <>
                        {data.members.length &&
                          data.members.map((p, i) => (
                            <tr key={i}>
                              <td className="center">{p.key}</td>
                              <td>{seatAddress(p, 'value')}</td>
                              {mainTable && <td>{tableLink(p)}</td>}
                            </tr>
                          ))}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <div className="div-with-table">
            <h4 className="center">{t('table.hooks', { ns: 'governance' })}</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th className="center">{t('table.place', { ns: 'governance' })}</th>
                  <th className="right">{t('table.hook', { ns: 'governance' })}</th>
                </tr>
              </thead>
              <tbody>
                {loadingHooksList ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {hookList.length > 0 ? (
                      <>
                        {hookList.map((p, i) => (
                          <tr key={i}>
                            <td className="center">{i}</td>
                            <td className="right">
                              {isMobile ? shortHash(p, 16) : p} <CopyButton text={p} />
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <br />
        <div className="flex flex-center">
          <div className="div-with-table">
            <h4 className="center">{t('table.seat-votes', { ns: 'governance' })}</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th>{t('table.voter', { ns: 'governance' })}</th>
                  {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                  <th className="center">{t('table.seat', { ns: 'governance' })}</th>
                  <th>{t('table.address')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {!errorMessage && data?.votes?.seat ? (
                      <>
                        {data.votes.seat.length > 0 ? (
                          data.votes.seat.map((p, i) => (
                            <tr key={i}>
                              <td>{seatNumberAndName(p, 'voter', addressOption)}</td>
                              {!mainTable && <td className="center">L{p.targetLayer}</td>}
                              <td className="center">{p.seat}</td>
                              <td>{seatAddress(p, 'value', addressOption)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={100} className="center">
                              {t('table.text.no-votes')}
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          {(canVote || data?.count?.seat?.length > 0) && (
            <div className="div-with-table">
              {data?.count?.seat?.length > 0 ? (
                <>
                  <h4 className="center">{t('table.seat-votes-count', { ns: 'governance' })}</h4>
                  <table className="table-large shrink">
                    <thead>
                      <tr>
                        <th>{t('table.address')}</th>
                        {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                        <th className="center">{t('table.seat', { ns: 'governance' })}</th>
                        <th className="right">{t('table.votes', { ns: 'governance' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="right">
                          <td colSpan="100">
                            <br />
                            <div className="center">
                              <span className="waiting"></span>
                              <br />
                              {t('general.loading')}
                            </div>
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && data?.count?.seat ? (
                            <>
                              {data.count.seat.length > 0 &&
                                data.count.seat.map((p, i) => (
                                  <tr key={i} className={reachedMajority(p, 'voteL1') ? 'bold' : ''}>
                                    <td>{seatAddress(p, 'address', addressOption)}</td>
                                    {!mainTable && <td className="center">L{p.targetLayer}</td>}
                                    <td className="center">{p.seat}</td>
                                    <td className="right">{showMajority(p, 'voteL1')}</td>
                                  </tr>
                                ))}
                            </>
                          ) : (
                            <tr>
                              <td colSpan="100" className="center orange bold">
                                {errorMessage}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                  <br />
                </>
              ) : (
                canVote && <h4 className="center">{t('table.cast-first-vote', { ns: 'governance' })}</h4>
              )}
              {canVote && (
                <button
                  className="button-action wide center"
                  onClick={() =>
                    setSignRequest({
                      action: 'castVoteSeat',
                      layer: mainTable ? 1 : 2,
                      request: {
                        TransactionType: 'Invoke',
                        Destination: tableAddress
                      }
                    })
                  }
                >
                  {t('button.vote-seat', { ns: 'governance' })}
                </button>
              )}
            </div>
          )}
        </div>
        <br />
        <div className="flex flex-center">
          <div className="div-with-table">
            <h4 className="center">{t('table.reward-rate-votes', { ns: 'governance' })}</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th>{t('table.voter', { ns: 'governance' })}</th>
                  {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                  <th className="right">{t('table.rate', { ns: 'governance' })}</th>
                  <th className="right">{t('table.value', { ns: 'governance' })}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {!errorMessage && data?.votes?.reward?.rate ? (
                      <>
                        {data.votes.reward.rate.length > 0 ? (
                          data.votes.reward.rate.map((p, i) => (
                            <tr key={i}>
                              <td>{seatNumberAndName(p, 'voter', addressOption)}</td>
                              {!mainTable && <td className="center">L{p.targetLayer}</td>}
                              <td className="right">{rewardRateHuman(p.value)}</td>
                              <td className="right">
                                {p.value} <CopyButton text={p.value} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={100} className="center">
                              {t('table.text.no-votes')}
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          {(canVote || data?.count?.reward?.rate?.length > 0) && (
            <div className="div-with-table">
              {data?.count?.reward?.rate?.length > 0 ? (
                <>
                  <h4 className="center">{t('table.reward-rate-votes-count', { ns: 'governance' })}</h4>
                  <table className="table-large shrink">
                    <thead>
                      <tr>
                        <th className="right">{t('table.rate', { ns: 'governance' })}</th>
                        <th className="right">{t('table.value', { ns: 'governance' })}</th>
                        {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                        <th className="right">{t('table.votes', { ns: 'governance' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="right">
                          <td colSpan="100">
                            <br />
                            <div className="center">
                              <span className="waiting"></span>
                              <br />
                              {t('general.loading')}
                            </div>
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && data?.count?.reward?.rate ? (
                            <>
                              {data.count.reward.rate.length > 0 &&
                                data.count.reward.rate.map((p, i) => (
                                  <tr key={i} className={reachedMajority(p, 'reward') ? 'bold' : ''}>
                                    <td className="right">{rewardRateHuman(p.rate)}</td>
                                    <td className="right">{p.rate}</td>
                                    {!mainTable && <td className="center">L{p.targetLayer}</td>}
                                    <td className="right">{showMajority(p, 'reward')}</td>
                                  </tr>
                                ))}
                            </>
                          ) : (
                            <tr>
                              <td colSpan="100" className="center orange bold">
                                {errorMessage}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                  <br />
                </>
              ) : (
                canVote && <h4 className="center">{t('table.cast-first-vote', { ns: 'governance' })}</h4>
              )}
              {canVote && (
                <button
                  className="button-action wide center"
                  onClick={() =>
                    setSignRequest({
                      action: 'castVoteRewardRate',
                      request: {
                        TransactionType: 'Invoke',
                        Destination: tableAddress
                      }
                    })
                  }
                >
                  {t('button.vote-reward-rate', { ns: 'governance' })}
                </button>
              )}
            </div>
          )}
        </div>
        <br />
        <div className="flex flex-center">
          <div className="div-with-table">
            <h4 className="center">{t('table.reward-delay-votes', { ns: 'governance' })}</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th>{t('table.voter', { ns: 'governance' })}</th>
                  {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                  <th className="right">{t('table.delay', { ns: 'governance' })}</th>
                  <th className="right">{t('table.in-seconds', { ns: 'governance' })}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {!errorMessage && data?.votes?.reward?.delay ? (
                      <>
                        {data.votes.reward.delay.length > 0 ? (
                          data.votes.reward.delay.map((p, i) => (
                            <tr key={i}>
                              <td>{seatNumberAndName(p, 'voter', addressOption)}</td>
                              {!mainTable && <td className="center">L{p.targetLayer}</td>}
                              <td className="right">{duration(t, p.value, { seconds: true })}</td>
                              <td className="right">
                                {p.value} <CopyButton text={p.value} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={100} className="center">
                              {t('table.text.no-votes')}
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          {(canVote || data?.count?.reward?.delay?.length > 0) && (
            <div className="div-with-table">
              {data?.count?.reward?.delay?.length > 0 ? (
                <>
                  <h4 className="center">{t('table.reward-delay-votes-count', { ns: 'governance' })}</h4>
                  <table className="table-large shrink">
                    <thead>
                      <tr>
                        <th className="right">{t('table.delay', { ns: 'governance' })}</th>
                        <th className="right">{t('table.in-seconds', { ns: 'governance' })}</th>
                        {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                        <th className="right">{t('table.votes', { ns: 'governance' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="right">
                          <td colSpan="100">
                            <br />
                            <div className="center">
                              <span className="waiting"></span>
                              <br />
                              {t('general.loading')}
                            </div>
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && data?.count?.reward?.delay ? (
                            <>
                              {data.count.reward.delay.length > 0 &&
                                data.count.reward.delay.map((p, i) => (
                                  <tr key={i} className={reachedMajority(p, 'reward') ? 'bold' : ''}>
                                    <td className="right">{duration(t, p.delay, { seconds: true })}</td>
                                    <td className="right">{p.delay}</td>
                                    {!mainTable && <td className="center">L{p.targetLayer}</td>}
                                    <td className="right">{showMajority(p, 'reward')}</td>
                                  </tr>
                                ))}
                            </>
                          ) : (
                            <tr>
                              <td colSpan="100" className="center orange bold">
                                {errorMessage}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                  <br />
                </>
              ) : (
                canVote && <h4 className="center">{t('table.cast-first-vote', { ns: 'governance' })}</h4>
              )}
              {canVote && (
                <button
                  className="button-action wide center"
                  onClick={() =>
                    setSignRequest({
                      action: 'castVoteRewardDelay',
                      request: {
                        TransactionType: 'Invoke',
                        Destination: tableAddress
                      }
                    })
                  }
                >
                  {t('button.vote-reward-delay', { ns: 'governance' })}
                </button>
              )}
            </div>
          )}
        </div>
        <br />
        <div className="flex flex-center">
          <div className="div-with-table">
            <h4 className="center">{t('table.hook-votes', { ns: 'governance' })}</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th>{t('table.voter', { ns: 'governance' })}</th>
                  {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                  <th className="center">{t('table.place', { ns: 'governance' })}</th>
                  <th className="right">{t('table.hook', { ns: 'governance' })}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {!errorMessage && data?.votes?.hook ? (
                      <>
                        {data.votes.hook.length > 0 ? (
                          data.votes.hook.map((p, i) => (
                            <tr key={i}>
                              <td>{seatNumberAndName(p, 'voter', addressOption)}</td>
                              {!mainTable && <td className="center">L{p.targetLayer}</td>}
                              <td className="center">{p.topic}</td>
                              <td className="right">{hookHash(p.value)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={100} className="center">
                              {t('table.text.no-votes')}
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {(canVote || data?.count?.hook?.length > 0) && (
            <div className="div-with-table">
              {data?.count?.hook?.length > 0 ? (
                <>
                  <h4 className="center">{t('table.hook-votes-count', { ns: 'governance' })}</h4>
                  <table className="table-large shrink">
                    <thead>
                      <tr>
                        <th>Hook</th>
                        {!mainTable && <th className="center">{t('table.target', { ns: 'governance' })}</th>}
                        <th className="center">{t('table.place', { ns: 'governance' })}</th>
                        <th className="right">{t('table.votes', { ns: 'governance' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr className="right">
                          <td colSpan="100">
                            <br />
                            <div className="center">
                              <span className="waiting"></span>
                              <br />
                              {t('general.loading')}
                            </div>
                            <br />
                          </td>
                        </tr>
                      ) : (
                        <>
                          {!errorMessage && data.count.hook ? (
                            <>
                              {data.count.hook.length > 0 &&
                                data.count.hook.map((p, i) => (
                                  <tr key={i} className={reachedMajority(p, 'hook') ? 'bold' : ''}>
                                    <td>
                                      {p.key.substr(8) ===
                                      '00000000000000000000000000000000000000000000000000000000' ? (
                                        t('table.text.vacate-place', { ns: 'governance' })
                                      ) : (
                                        <>...{p.key.substr(p.key.length - 16)}</>
                                      )}
                                    </td>
                                    {!mainTable && <td className="center">L{p.targetLayer}</td>}
                                    <td className="center">{p.topic}</td>
                                    <td className="right">{showMajority(p, 'hook')}</td>
                                  </tr>
                                ))}
                            </>
                          ) : (
                            <tr>
                              <td colSpan="100" className="center orange bold">
                                {errorMessage}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                  <br />
                </>
              ) : (
                canVote && <h4 className="center">{t('table.cast-first-vote', { ns: 'governance' })}</h4>
              )}
              {canVote && (
                <button
                  className="button-action wide center"
                  onClick={() =>
                    setSignRequest({
                      action: 'castVoteHook',
                      layer: mainTable ? 1 : 2,
                      request: {
                        TransactionType: 'Invoke',
                        Destination: tableAddress
                      }
                    })
                  }
                >
                  {t('button.vote-hook', { ns: 'governance' })}
                </button>
              )}
            </div>
          )}
        </div>

        {data?.parameters?.length > 0 && (
          <>
            <br />
            <h4 className="center">Parameters</h4>
            <table className="table-large shrink">
              <thead>
                <tr>
                  <th>Key</th>
                  <th className="right">Value</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="right">
                    <td colSpan="100">
                      <br />
                      <div className="center">
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                      </div>
                      <br />
                    </td>
                  </tr>
                ) : (
                  <>
                    {!errorMessage && data?.parameters ? (
                      <>
                        {data.parameters.length > 0 &&
                          data.parameters.map((p, i) => (
                            <tr key={i}>
                              <td>{isMobile ? shortHash(p.key) : p.key}</td>
                              <td className="right">{p.value}</td>
                            </tr>
                          ))}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="100" className="center orange bold">
                          {errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}
