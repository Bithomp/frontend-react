import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import Image from 'next/image'

import { server, getCoinsUrl, nativeCurrency } from '../../utils'
//import { codeHighlight } from '../../utils/format'
import { getIsSsrMobile } from "../../utils/mobile"

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let pageMeta = null
  const { id } = query
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
        //&inception=true&blacklist=true&ledgerInfo=true
        // we need an image endpoint like xumm to return image by address
        // 1) if in blacklist - alert image 
        // 2) if valid twitter - image from twitter
        // 3) if gravatar - image from gravatar 
        // 4) if xummPro or xummCurratedAssets - from xumm 
        // 5) otherwise show hashicon 
        // should be good for seo for other websites to use our pictures / links
        // for now we can have hashicon and twitter
        url: server + '/api/cors/v2/address/' + account + '?username=true&service=true&twitterImageUrl=true',
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
      isSsrMobile: getIsSsrMobile(context),
      pageMeta,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'

// setSignRequest, account, pageMeta
export default function Account({ pageMeta, signRequest, id, selectedCurrency }) {
  const { t } = useTranslation()

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [userData, setUserData] = useState({
    username: pageMeta?.username,
    service: pageMeta?.service?.name,
    address: pageMeta?.address || id
  })

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
    if (!selectedCurrency) return;
    if (!signRequest) {
      if (!data?.address) {
        // no token - first time fetching - allow right away
        checkApi()
      } else {
        setLoading(true)
        checkApi({ noCache: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signRequest, selectedCurrency])

  const avatarSrc = data => {
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
                      style={{ width: "100%", height: "auto", display: "inline-block" }}
                      src={avatarSrc(data)}
                      width="200"
                      height="200"
                    />
                    <div>
                      <div className='center hidden'>
                        Time machine<br /><br />
                      </div>
                      <table className='table-details autowidth'>
                        <thead>
                          <tr>
                            <th colSpan="100">Statuses</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>XUMM Pro</td><td>{data?.xummMeta?.xummPro ? "Yes" : "No"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="column-right">
                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">Public data</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{t("table.address")}</td>
                          <td>{data.address} <CopyButton text={data.address}></CopyButton></td>
                        </tr>
                        {accountNameTr(data)}
                        {/*
                          <tr>
                            <td>Data</td>
                            <td>{codeHighlight(data)}</td>
                          </tr>
                        */}
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.ledger-data")}</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className='bold'>Status</td>
                          {data?.ledgerInfo?.activated ?
                            <td>Last active (here you will see the last submitted transaction and the time passed)</td>
                            :
                            <td>
                              {/* Reserves are different and currency codes also */}
                              {data?.ledgerInfo?.deleted ?
                                <>
                                  <span className='red bold'>Account deleted.</span>
                                  <br />
                                  <span className='orange'>
                                    This account has been deactivated and is no longer active. It can be restored by sending at least 10 XRP to the address.
                                  </span>
                                </>
                                :
                                <span className='orange'>
                                  Not activated yet. The owner with full access to the account can activate it by sending at least 10 XRP to the address.
                                </span>
                              }
                              {getCoinsUrl &&
                                <>
                                  {" "}
                                  <a href={getCoinsUrl} target="_blank" rel="noopener noreferrer">Get your first {nativeCurrency}.</a>
                                </>
                              }
                              <br />
                              <a href="https://xrpl.org/reserves.html" target="_blank" rel="noopener noreferrer">Learn more about reserves.</a>
                            </td>
                          }
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
