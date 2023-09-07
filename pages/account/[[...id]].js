import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import { server, delay } from '../../utils'
import { getIsSsrMobile } from "../../utils/mobile"

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let pageMeta = null
  const { sortCurrency, id } = query
  //keep it from query instead of params, anyway it is an array sometimes
  const account = id ? (Array.isArray(id) ? id[0] : id) : ""
  if (account) {
    let headers = null
    if (process.env.NODE_ENV !== 'development') {
      //otherwise can not verify ssl serts
      headers = req.headers
    }
    try {
      const res = await axios({
        method: 'get',
        //&hashicon=true&inception=true&blacklist=true&ledgerInfo=true&twitterImageUrl=true
        // we need an image endpoint like xumm to return image by address
        // 1) if in blacklist - alert image 
        // 2) if valid twitter - image from twitter
        // 3) if gravatar - image from gravatar 
        // 4) if xummPro or xummCurratedAssets - from xumm 
        // 5) otherwise show hashicon 
        // should be good for seo for other websites to use our pictures / links
        url: server + '/api/cors/v2/address/' + account + '?username=true&service=true',
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
      sortCurrency: sortCurrency || "",
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'

// setSignRequest, account, pageMeta
export default function Nft({ signRequest, id, selectedCurrency, sortCurrency }) {
  const { t } = useTranslation()

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const convertCurrency = sortCurrency || selectedCurrency

  const checkApi = async (opts) => {
    if (!id) return
    setLoading(true)

    let noCache = ""
    if (opts?.noCache) {
      noCache = "&timestamp=" + Date.now()
    }

    const response = await axios(
      '/v2/address/' + id
      + '?username=true&service=true&verifiedDomain=true&parent=true&hashicon=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&twitterImageUrl=true'
      + noCache
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.address) {
        setData(newdata)
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
    if (!convertCurrency) return;
    if (!signRequest) {
      if (!data?.nftokenID) {
        // no token - first time fetching - allow right away
        checkApi()
      } else {
        //wait for changes
        setLoading(true)
        delay(3000, checkApi, { noCache: true }).catch(console.error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signRequest, convertCurrency])

  return <>
    <SEO
      //page={"Account " + id}
      title={"Account " + id}
    //description={pageMeta?.metadata?.description}
    //image={{ file: imageUrl }}
    />
    <SearchBlock
      searchPlaceholderText={t("account.enter-address")}
      tab="account"
    />
    <div className="content-center short-top nft">
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
                    Icon here
                    <div>
                      <table className='table-details autowidth'>
                        <thead>
                          <tr>
                            <th colSpan="100">{t("table.attributes")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Attribute</td>
                            <td>Value</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="column-right">
                    <table className='table-details'>
                      <thead>
                        <tr>
                          <th colSpan="100">{t("table.metadata")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Data</td>
                          <td>Data details</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.ledger-data")}</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Account</td>
                          <td>{id} <CopyButton text={id} /></td>
                        </tr>
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.related-lists")}</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{t("table.by-issuer")}</td>
                          <td>
                            <Link href={"/nft-distribution?issuer=" + data.issuer}>{t("nft.holders")}</Link>,{" "}
                            <Link href={"/nft-explorer?issuer=" + data.issuer}>{t("table.all-nfts")}</Link>,{" "}
                            <Link href={"/nft-sales?issuer=" + data.issuer}>{t("table.sold_few")}</Link>,{" "}
                            <Link href={"/nft-explorer?issuer=" + data.issuer + "&list=onSale"}>{t("table.on-sale")}</Link>
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
          <h1 className='center'>NFT</h1>
          <p className='center'>
            {t("account.desc")}
          </p>
        </>
      }
    </div>
  </>
}
