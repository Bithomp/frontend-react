import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import Image from 'next/image'
import moment from 'moment'

import { server, getCoinsUrl, nativeCurrency } from '../../utils'
import { amountFormat, shortNiceNumber, fullDateAndTime } from '../../utils/format'
import { getIsSsrMobile } from "../../utils/mobile"

import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import LinkIcon from "../../public/images/link.svg"

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let pageMeta = null
  const { id, ledgerTimestamp } = query
  //keep it from query instead of params, anyway it is an array sometimes
  const account = id ? (Array.isArray(id) ? id[0] : id) : ""
  if (account) {
    let headers = {}
    if (req.headers["x-real-ip"]) {
      headers["x-real-ip"] = req.headers["x-real-ip"]
    }
    if (req.headers["x-forwarded-for"]) {
      headers["x-forwarded-for"] = req.headers["x-forwarded-for"]
    }
    try {
      const res = await axios({
        method: 'get',
        url: server + '/api/cors/v2/address/' + account + '?username=true&service=true&twitterImageUrl=true&blacklist=true' + (ledgerTimestamp ? ('&ledgerTimestamp=' + ledgerTimestamp) : ""),
        headers
      })
      pageMeta = res?.data
    } catch (error) {
      console.error(error)
    }
  }

  return {
    props: {
      id: account,
      ledgerTimestampQuery: ledgerTimestamp || "",
      isSsrMobile: getIsSsrMobile(context),
      pageMeta,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'

// setSignRequest, account
export default function Account({ pageMeta, signRequest, id, selectedCurrency, ledgerTimestampQuery }) {
  const { t } = useTranslation()

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [ledgerTimestamp, setLedgerTimestamp] = useState(ledgerTimestampQuery)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(ledgerTimestampQuery)
  const [fiatRate, setFiatRate] = useState("")
  const [userData, setUserData] = useState({
    username: pageMeta?.username,
    service: pageMeta?.service?.name,
    address: pageMeta?.address || id
  })
  const [networkInfo, setNetworkInfo] = useState({})
  const [balances, setBalances] = useState({})

  useEffect(() => {
    async function fetchData() {
      const networkInfoData = await axios('v2/server')
      setNetworkInfo(networkInfoData?.data)
    }
    fetchData()
  }, [])

  const checkApi = async (opts) => {
    if (!id) return
    setLoading(true)

    let noCache = ""

    if (opts?.noCache) {
      noCache = "&timestamp=" + Date.now()
    }

    //&hashicon=true
    const response = await axios(
      '/v2/address/' + id
      + '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&twitterImageUrl=true&xummMeta=true'
      + noCache
      + (ledgerTimestamp ? ('&ledgerTimestamp=' + ledgerTimestamp.toISOString()) : "")
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.address) {
        setData(newdata)
        setUserData({
          username: newdata.username,
          service: newdata.service?.name,
          address: newdata.address
        })
      } else {
        if (newdata.error) {
          setErrorMessage(t("error-api." + newdata.error))
        } else {
          setErrorMessage("Error")
          console.log(newdata)
        }
      }
    }
  }

  useEffect(() => {
    if (!selectedCurrency) return
    if (!signRequest) {
      if (!data?.address) {
        // no token - first time fetching - allow right away
        checkApi()
      } else {
        checkApi({ noCache: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signRequest, selectedCurrency, ledgerTimestamp])

  useEffect(() => {
    if (!ledgerTimestamp) return
    getHistoricalRate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerTimestamp])

  useEffect(() => {
    if (!ledgerTimestamp) {
      //if there is ledgerTimestamp then we need a historicalrate
      async function fetchRate() {
        const response = await axios(
          'v2/rates/current/' + selectedCurrency,
        )
        setFiatRate(response.data[selectedCurrency])
      }
      fetchRate()
    } else {
      getHistoricalRate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  const getHistoricalRate = () => {
    if (ledgerTimestamp && selectedCurrency) {
      async function fetchHistoricalRate() {
        const response = await axios(
          'v2/rates/history/nearest/' + selectedCurrency + '?date=' + new Date(ledgerTimestamp).valueOf()
        ).catch(error => {
          console.log(error)
        })
        if (response?.data?.[selectedCurrency]) {
          setFiatRate(response.data[selectedCurrency])
        }
      }
      fetchHistoricalRate()
    }
  }

  const avatarSrc = data => {
    /*
      1) if in blacklist - alert image
      2) if bithomp image, show it 
      3) if valid twitter - image from twitter
      4) if gravatar - image from gravatar 
      5) if xummPro or xummCurratedAssets - from xumm 
      6) otherwise show hashicon 

      our cdn image:
      1) if in blacklist - alert image
      3) if valid twitter - image from twitter
      6) otherwise show hashicon
    */
    if (!data) return ""

    if (data.blacklist?.blacklisted) {
      return "/images/fraud-alert.png"
    }

    let gravatarUrl = null
    if (data.ledgerInfo?.emailHash) {
      gravatarUrl = 'https://secure.gravatar.com/avatar/' + data.ledgerInfo?.emailHash + '?d=mm&s=200'
    }

    let xummAvatarUrl = null
    if (data.xummMeta?.xummPro || data.xummMeta?.curated_asset) {
      xummAvatarUrl = data.xummMeta?.avatar
    }

    return data.service?.twitterImageUrl || gravatarUrl || xummAvatarUrl || ('https://cdn.bithomp.com/avatar/' + data.address)
  }

  const accountNameTr = data => {
    if (!data) return ""

    let output = []

    if (data.ledgerInfo?.activated) {
      //show username registartion link and usernsmes only for active accounts
      if (data.username) {
        output.push(<tr key="0">
          <td>Username</td>
          <td className='blue bold'>{data.username} <CopyButton text={server + "/account/" + data.username}></CopyButton></td>
        </tr>)
      } else if (!data.service?.name) {
        //if no username and no service - show register link
        output.push(<tr key="0">
          <td>Username</td>
          <td><Link href={"/username?address=" + data.address}>register</Link></td>
        </tr>)
      }
    }

    let thirdPartyService = null
    if (data.xummMeta?.thirdPartyProfiles?.length) {
      for (let i = 0; i < data.xummMeta.thirdPartyProfiles.length; i++) {
        const excludeList = ["xumm.app", "xrpl", "bithomp.com"]
        if (!excludeList.includes(data.xummMeta.thirdPartyProfiles[i].source)) {
          thirdPartyService = data.xummMeta.thirdPartyProfiles[i].accountAlias
          break
        }
      }
    }

    if (data.service?.name || thirdPartyService) {
      output.push(<tr key="1">
        <td>Service</td>
        {data.service?.name ?
          <td className='green bold'>{data.service.name}</td>
          :
          <td><span className='bold'>{thirdPartyService}</span> (unverified)</td>
        }
      </tr>)
    }

    if (data.nickname) {
      output.push(<tr key="2">
        <td>Nickname</td>
        <td className='orange bold'>{data.nickname}</td>
      </tr>)
    }

    return output
  }

  useEffect(() => {
    if (!data?.ledgerInfo || !networkInfo) return
    let balanceList = {
      total: {
        native: data.ledgerInfo.balance
      },
      reserved: {
        native: data.ledgerInfo.ownerCount * networkInfo.reserveIncrement
      },
      available: {}
    }

    if (balanceList.reserved.native > balanceList.total.native) {
      balanceList.reserved.native = balanceList.total.native
    }

    balanceList.available.native = balanceList.total.native - balanceList.reserved.native

    if (balanceList.available.native < 0) {
      balanceList.available.native = 0
    }

    balanceList.total.fiat = ((balanceList.total.native / 1000000) * fiatRate).toFixed(2)
    balanceList.reserved.fiat = ((balanceList.reserved.native / 1000000) * fiatRate).toFixed(2)
    balanceList.available.fiat = ((balanceList.available.native / 1000000) * fiatRate).toFixed(2)

    setBalances(balanceList)
  }, [data, networkInfo, fiatRate])

  const resetTimeMachine = () => {
    setLedgerTimestampInput(null)
    setLedgerTimestamp(null)
  }

  return <>
    <SEO
      page="Account"
      title={t("explorer.header.account") + " " + (pageMeta?.service?.name || pageMeta?.username || pageMeta?.address || id)}
      description={"Account details, transactions, NFTs, Tokens for " + (pageMeta?.service?.name || pageMeta?.username) + " " + (pageMeta?.address || id)}
      image={{ file: avatarSrc(pageMeta) }}
    />
    <SearchBlock
      searchPlaceholderText={t("explorer.enter-address")}
      tab="account"
      userData={userData}
    />
    <div className="content-center short-top account">
      {id ? <>
        {loading ?
          <div className='center' style={{ marginTop: "80px" }}>
            <span className="waiting"></span>
            <br />{t("general.loading")}
          </div>
          :
          <>
            {errorMessage ?
              <div className='center orange bold'>{errorMessage}</div>
              :
              <>{data.address &&
                <>
                  <div className="column-left">
                    <Image
                      alt="avatar"
                      src={avatarSrc(data)}
                      width="200"
                      height="200"
                      className="avatar"
                    />
                    <div>
                      <table className='table-details autowidth'>
                        <thead>
                          <tr>
                            <th colSpan="100">Time machine</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan="2">
                              {/*  (info) Check account balance and settings in any Time in the past. */}
                              <center>
                                <DatePicker
                                  selected={ledgerTimestampInput || new Date()}
                                  onChange={setLedgerTimestampInput}
                                  selectsStart
                                  showTimeInput
                                  timeInputLabel={t("table.time")}
                                  minDate={new Date(data.inception * 1000)}
                                  maxDate={new Date()}
                                  dateFormat="yyyy/MM/dd HH:mm:ss"
                                  className="dateAndTimeRange"
                                  showMonthDropdown
                                  showYearDropdown
                                />
                              </center>
                              <div className='flex flex-center'>
                                <button onClick={() => setLedgerTimestamp(ledgerTimestampInput)} className='button-action thin narrow'>Update</button>
                                {" "}
                                <button onClick={resetTimeMachine} className='button-action thin narrow'>Reset</button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {(
                      data.xummMeta?.kycApproved ||
                      data.xummMeta?.xummPro ||
                      data.xummMeta?.globalid?.profileUrl
                    ) &&
                      <div>
                        <table className='table-details autowidth'>
                          <thead>
                            <tr>
                              <th colSpan="100">Statuses</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.xummMeta?.kycApproved &&
                              <tr>
                                <td>KYC</td>
                                <td>XUMM verified</td>
                              </tr>
                            }
                            {data.xummMeta?.xummPro &&
                              <tr>
                                <td>XUMM Pro</td>
                                <td>
                                  {data?.xummMeta?.xummProfile?.slug ?
                                    <a href={data.xummMeta.xummProfile.profileUrl}>
                                      <u class="bold orange">{data.xummMeta.xummProfile.slug}</u>
                                    </a>
                                    :
                                    <span class="bold orange">activated <i class="fa fa-heart"></i></span>
                                  }
                                </td>
                              </tr>
                            }
                            {data.xummMeta?.globalid?.profileUrl &&
                              <tr>
                                <td>
                                  GlobaliD
                                </td>
                                <td>
                                  <a href={data.xummMeta.globalid.profileUrl}>
                                    <u class="bold green">{data.xummMeta.globalid.profileUrl.strReplace("https://app.global.id/u/", "")}</u>
                                  </a>
                                  {" "}
                                  <a href={data.xummMeta.globalid.profileUrl}>
                                    <b class="green"><i class="fa fa-globe"></i></b>
                                  </a>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                  <div className="column-right">
                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">
                            {data?.ledgerInfo?.ledgerTimestamp ?
                              <span className='red bold'>
                                Historical data ({fullDateAndTime(data.ledgerInfo.ledgerTimestamp)})
                              </span>
                              :
                              t("table.ledger-data")
                            }
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.ledgerInfo?.accountIndex &&
                          <tr>
                            <td>Account index</td>
                            <td>
                              <table style={{ marginLeft: "-5px" }}>
                                <tbody>
                                  <tr>
                                    <td>Hex:</td>
                                    <td>
                                      {data.ledgerInfo.accountIndex} <CopyButton text={data.ledgerInfo.accountIndex}></CopyButton>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Decimal:</td>
                                    <td>
                                      {parseInt(data.ledgerInfo.accountIndex, 16)} <CopyButton text={parseInt(data.ledgerInfo.accountIndex, 16)}></CopyButton>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        }
                        <tr>
                          <td>{t("table.address")}</td>
                          <td>{data.address} <CopyButton text={data.address}></CopyButton></td>
                        </tr>
                        <tr>
                          <td>{t("table.status")}</td>
                          {data?.ledgerInfo?.activated ?
                            <td>
                              <span className='green'>Active </span>
                              {data?.ledgerInfo?.lastSubmittedAt &&
                                <>
                                  {moment((data.ledgerInfo.lastSubmittedAt) * 1000, "unix").fromNow()}
                                  {" "}
                                  ({fullDateAndTime(data.ledgerInfo.lastSubmittedAt)})
                                </>
                              }
                              {data?.ledgerInfo?.lastSubmittedTxHash &&
                                <Link href={"/explorer/" + data.ledgerInfo.lastSubmittedTxHash}> <LinkIcon /></Link>
                              }
                            </td>
                            :
                            <td>
                              {/* Also show blackholed status */}
                              {data?.ledgerInfo?.deleted ?
                                <>
                                  <span className='red bold'>Account deleted.</span>
                                  <br />
                                  <span className='orange'>
                                    This account has been deactivated and is no longer active. It can be restored by sending at least {amountFormat(networkInfo?.reserveBase)} to the address.
                                  </span>
                                </>
                                :
                                <span className='orange'>
                                  Not activated yet. The owner with full access to the account can activate it by sending at least {amountFormat(networkInfo?.reserveBase)} to the address.
                                </span>
                              }
                              {getCoinsUrl &&
                                <>
                                  {" "}
                                  <a href={getCoinsUrl} target="_blank" rel="noreferrer">Get your first {nativeCurrency}.</a>
                                </>
                              }
                              <br />
                              <a href="https://xrpl.org/reserves.html" target="_blank" rel="noreferrer">Learn more about reserves.</a>
                            </td>
                          }
                        </tr>
                        {data?.ledgerInfo?.balance &&
                          <tr>
                            <td>{t("table.balance")}</td>
                            <td>
                              <table style={{ marginLeft: "-5px" }}>
                                <tbody>
                                  <tr>
                                    <td>Available:</td>
                                    <td>
                                      <b className='green'>{amountFormat(balances?.available?.native)}</b>
                                    </td>
                                    <td>
                                      {balances?.available?.fiat &&
                                        <>≈ {shortNiceNumber(balances.available.fiat, 2, 3, selectedCurrency)}</>
                                      }
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Reserved:</td>
                                    <td>
                                      {amountFormat(balances?.reserved?.native, { minFractionDigits: 6 })}
                                    </td>
                                    <td>
                                      {balances?.reserved?.fiat &&
                                        <>≈ {shortNiceNumber(balances.reserved.fiat, 2, 3, selectedCurrency)}</>
                                      }
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className='right'>Total:</td>
                                    <td>
                                      {amountFormat(balances?.total?.native)}
                                    </td>
                                    <td>
                                      {balances?.total?.fiat &&
                                        <>≈ {shortNiceNumber(balances.total.fiat, 2, 3, selectedCurrency)}</>
                                      }
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        }
                        {data.ledgerInfo?.importSequence &&
                          <tr>
                            <td>
                              Import sequence
                            </td>
                            <td>
                              #{data.ledgerInfo.importSequence}
                            </td>
                          </tr>
                        }
                        {/**
    $ledger = $ledgerInfo['ledger'];
    $xahauReward['accumulator'] = $ledgerInfo["rewardAccumulator"];
    $xahauReward['lgrFirst'] = $ledgerInfo["rewardLgrFirst"];
    $xahauReward['lgrLast'] = $ledgerInfo["rewardLgrLast"];
    $xahauReward['time'] = $ledgerInfo["rewardTime"];

    if ($xahauReward['lgrFirst']) {
    $rewardDelay = 2600000; //seconds // take it from hook instead later
    $rewardRate = 0.0033333333300000004; // get it from hook later
    $remainingSec = $rewardDelay - (time() - ($xahauReward['time'] + 946684800));
    //$claimable = $remainingSec <= 0;
    $claimableDate = date('Y-m-d H:i:s', (time() + $remainingSec));

    // calculate reward
    $elapsed = $ledger - $xahauReward['lgrFirst'];
    $elapsedSinceLast = $ledger - $xahauReward['lgrLast'];
    $accumulator = hexdec($xahauReward['accumulator']);
    if (intval($balance) > 0 && $elapsedSinceLast > 0) {
      $accumulator += intval($balance) / 1000000 * $elapsedSinceLast;
    }
    $reward = $accumulator / $elapsed * $rewardRate;
    $output .= '<div>Reward: <b>≈ ' . number_format($reward, 6) . ' XAH</b></div>';
    $output .= '<div>Claimable: <b>' . $claimableDate . '</b></div>';
  }
                         */}
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">Public data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountNameTr(data)}

                        <tr>
                          <td>Activated</td>
                          <td>
                            {moment((data.inception) * 1000, "unix").fromNow()}
                            {" "}
                            ({fullDateAndTime(data.inception)})
                          </td>
                        </tr>



                      </tbody>
                    </table>
                  </div>
                </>
              }
              </>
            }
          </>
        }
      </>
        :
        <>
          <h1 className='center'>{t("explorer.header.account")}</h1>
          <p className='center'>
            Here you will be able to see all the information about the account, including the transactions, tokens, NFTs, and more.
          </p>
        </>
      }
    </div>
  </>
}
