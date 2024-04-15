import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react';
import axios from 'axios'
import { CSVLink } from "react-csv"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

import { FaSortAmountDown } from "react-icons/fa"

import {
  useWidth,
  isAddressOrUsername,
  addAndRemoveQueryParams,
  addQueryParams,
  removeQueryParams
} from '../../utils'
import { isValidTaxon } from '../../utils/nft'
import {
  nftsExplorerLink,
  addressUsernameOrServiceLink,
  userOrServiceLink,
  niceNumber
} from '../../utils/format'

import DownloadIcon from "../../public/images/download.svg"

export async function getServerSideProps(context) {
  const { locale, query } = context
  const { taxon, issuer, id, order } = query
  //keep query instead of params, anyway it is an array sometimes
  const idQuery = id ? (Array.isArray(id) ? id[0] : id) : ""
  let issuerQuery = isAddressOrUsername(idQuery) ? idQuery : issuer
  issuerQuery = isAddressOrUsername(issuerQuery) ? issuerQuery : ""
  return {
    props: {
      idQuery,
      issuerQuery,
      orderQuery: order || "nonSelfIssued",
      taxonQuery: taxon || "",
      ...(await serverSideTranslations(locale, ['common', 'nft-distribution']))
    }
  }
}

import SEO from '../../components/SEO'

export default function NftDistribution({ issuerQuery, taxonQuery, idQuery, orderQuery }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()
  const router = useRouter()

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [taxon, setTaxon] = useState(taxonQuery)
  const [issuer, setIssuer] = useState(issuerQuery)
  const [issuerInput, setIssuerInput] = useState(issuerQuery)
  const [taxonInput, setTaxonInput] = useState(taxonQuery)
  const [order, setOrder] = useState(orderQuery)

  const checkApi = async () => {
    /*
    "issuer": "rMCfTcW9k2Z21cm4zWj2mgHaTrxxrHtL7n",
    "issuerDetails": {
      "username": null,
      "service": null
    },
    "taxon": 0,
    "order": "nonSelfIssued",
    "owners": [
      {
        "address": "r4iCcnDXzCZCDkrbWyebk5aNwg55R8PyB9",
        "addressDetails": {
          "username": null,
          "service": null
        },
        "total": 9,
        "selfIssued": 0,
        "nonSelfIssued": 9
      }
    ],
    "summary: {
      "totalNfts": 1375421,
      "totalOwners": 35309
    }
    */
    setData([])
    let taxonUrlPart = ""
    if (taxon > -1) {
      taxonUrlPart = '&taxon=' + taxon
    }

    setLoading(true)

    let orderPart = order
    if (issuer) {
      orderPart = 'total'
    }

    //marker=m
    const response = await axios(
      'v2/nft-owners?issuer=' + issuer + taxonUrlPart + '&order=' + orderPart
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    })
    setLoading(false)
    const newdata = response?.data
    if (newdata) {
      if (newdata.owners) {
        if (newdata.owners.length > 0) {
          setErrorMessage("")
          setData(newdata)
        } else {
          setErrorMessage(t("no-nfts", { ns: "nft-distribution" }))
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

  useEffect(() => {
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer, taxon, order])

  let csvHeaders = [
    { label: t("table.owner"), key: "address" },
    { label: t("table.username"), key: "addressDetails.username" },
    { label: t("table.non-self-issued", { ns: "nft-distribution" }), key: "nonSelfIssued" },
    { label: t("table.self-issued", { ns: "nft-distribution" }), key: "selfIssued" },
    { label: t("table.total", { ns: "nft-distribution" }), key: "total" }
  ]

  const searchClick = () => {
    let queryAddList = []
    let queryRemoveList = []
    if (isAddressOrUsername(issuerInput)) {
      setIssuer(issuerInput)
      if (!idQuery) {
        queryAddList.push({
          name: "issuer",
          value: issuerInput
        })
      }
      if (isValidTaxon(taxonInput)) {
        setTaxon(taxonInput)
        queryAddList.push({
          name: "taxon",
          value: taxonInput
        })
      } else {
        setTaxonInput("")
        setTaxon("")
        queryRemoveList.push("taxon")
      }
    } else {
      setIssuerInput("")
      setIssuer("")
      setTaxonInput("")
      setTaxon("")
      queryRemoveList.push("issuer")
      queryRemoveList.push("taxon")
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
  }

  const enterPress = e => {
    if (e.key === 'Enter') {
      searchClick()
    }
  }

  const onTaxonInput = e => {
    if (!/^\d+$/.test(e.key)) {
      e.preventDefault()
    }
    enterPress(e)
  }

  const changeOrder = order => {
    setOrder(order)
    if (order !== 'nonSelfIssued') {
      addQueryParams(router, [{ name: "order", value: order }])
    } else {
      removeQueryParams(router, ["order"])
    }
  }

  return <>
    <SEO
      title={
        t("header", { ns: "nft-distribution" }) +
        (issuer ? (" " + issuer) : "") +
        (taxon ? (" " + taxon) : "") +
        (order === "total" ? (" " + t("table.total", { ns: "nft-distribution" })) : "") +
        (order === "selfIssued" ? (" " + t("table.self-issued", { ns: "nft-distribution" })) : "")
      }
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      <h1 className='center'>{t("header", { ns: 'nft-distribution' })}</h1>
      <div className='center'>
        <span className='halv'>
          <span className='input-title'>{t("table.issuer")} {userOrServiceLink(data, 'issuer')}</span>
          <input
            placeholder={t("nfts.search-by-issuer")}
            value={issuerInput}
            onChange={(e) => { setIssuerInput(e.target.value) }}
            onKeyPress={enterPress}
            className="input-text"
            spellCheck="false"
            maxLength="35"
          />
        </span>
        <span className='halv'>
          <span className='input-title'>{t("table.taxon")}</span>
          <input
            placeholder={t("nfts.search-by-taxon")}
            value={taxonInput}
            onChange={(e) => { setTaxonInput(e.target.value) }}
            onKeyPress={onTaxonInput}
            className="input-text"
            spellCheck="false"
            maxLength="35"
            disabled={issuerInput ? false : true}
          />
        </span>
      </div>
      <p className="center" style={{ marginBottom: "20px" }}>
        <input type="button" className="button-action" value={t("button.search")} onClick={searchClick} />
      </p>

      {data?.summary?.totalNfts &&
        <p className='center'>
          <Trans
            i18nKey={order}
            ns="nft-distribution"
            values={{
              users: niceNumber(data.summary?.totalOwners),
              nfts: niceNumber(data.summary.totalNfts)
            }}
          >
            {niceNumber(data.summary?.totalOwners)} users own {niceNumber(data.summary.totalNfts)} NFTs
          </Trans>
          {windowWidth < 960 ? <><br /><br /></> : " "}
          <CSVLink
            data={data.owners}
            headers={csvHeaders}
            filename={'nft_destribution_' + (data.issuer || "") + '_' + (new Date().toLocaleString()) + '.csv'}
            className='button-action thin narrow'
          >
            <DownloadIcon /> CSV
          </CSVLink>
        </p>
      }

      {(windowWidth < 960 && !issuer) &&
        <>
          <p>
            <span
              onClick={() => changeOrder('nonSelfIssued')}
              style={order !== 'nonSelfIssued' ? { cursor: "pointer" } : {}}
              className={order === 'nonSelfIssued' ? "blue" : ""}
            >
              {t("table.non-self-issued", { ns: "nft-distribution" })} <FaSortAmountDown />
            </span>
          </p>
          <p>
            <span
              onClick={() => changeOrder('selfIssued')}
              style={order !== 'selfIssued' ? { cursor: "pointer" } : {}}
              className={order === 'selfIssued' ? "blue" : ""}
            >
              {t("table.self-issued", { ns: "nft-distribution" })} <FaSortAmountDown />
            </span>
          </p>
          <p>
            <span
              onClick={() => changeOrder('total')}
              style={order !== 'total' ? { cursor: "pointer" } : {}}
              className={order === 'total' ? "blue" : ""}
            >
              {t("table.total", { ns: "nft-distribution" })} <FaSortAmountDown />
            </span>
          </p>
        </>
      }

      {(!windowWidth || windowWidth >= 960) ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th>{t("table.owner")}</th>
              {!issuer &&
                <>
                  <th className='right'>
                    <span
                      onClick={() => changeOrder('nonSelfIssued')}
                      style={order !== 'nonSelfIssued' ? { cursor: "pointer" } : {}}
                      className={order === 'nonSelfIssued' ? "blue" : ""}
                    >
                      {t("table.non-self-issued", { ns: "nft-distribution" })} <FaSortAmountDown />
                    </span>
                  </th>
                  <th className='right'>
                    <span
                      onClick={() => changeOrder('selfIssued')}
                      style={order !== 'selfIssued' ? { cursor: "pointer" } : {}}
                      className={order === 'selfIssued' ? "blue" : ""}
                    >
                      {t("table.self-issued", { ns: "nft-distribution" })} <FaSortAmountDown />
                    </span>
                  </th>
                </>
              }
              <th className='right'>
                {issuer ?
                  t("table.nfts")
                  :
                  <span
                    onClick={() => changeOrder('total')}
                    style={order !== 'total' ? { cursor: "pointer" } : {}}
                    className={order === 'total' ? "blue" : ""}
                  >
                    {t("table.total", { ns: "nft-distribution" })} <FaSortAmountDown />
                  </span>
                }
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'>
                <td colSpan="100">
                  <span className="waiting"></span>
                  <br />{t("general.loading")}
                </td>
              </tr>
              :
              <>
                {!errorMessage ? data.owners?.map((user, i) =>
                  <tr key={i}>
                    <td className="center">{i + 1}</td>
                    <td>
                      {addressUsernameOrServiceLink(user, 'address')}
                    </td>
                    {!issuer &&
                      <>
                        <td className='right'>
                          {niceNumber(user.nonSelfIssued)}
                        </td>
                        <td className='right'>
                          {niceNumber(user.selfIssued)}
                          {user.selfIssued > 0 &&
                            <>
                              {" "}
                              {
                                nftsExplorerLink(
                                  {
                                    owner: user.address,
                                    ownerDetails: user.addressDetails,
                                    issuer: user.address,
                                    issuerDetails: user.addressDetails
                                  }
                                )
                              }
                            </>
                          }
                        </td>
                      </>
                    }
                    <td className='right'>
                      {niceNumber(user.total)}
                      {" "}
                      {
                        nftsExplorerLink(
                          {
                            owner: user.address,
                            ownerDetails: user.addressDetails,
                            issuer: data.issuer,
                            issuerDetails: data.issuerDetails
                          }
                        )
                      }
                    </td>
                  </tr>)
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
                {!errorMessage ?
                  data?.owners?.map((user, i) =>
                    <tr key={i}>
                      <td style={{ padding: "5px" }} className='center'>
                        <p>{i + 1}</p>
                      </td>
                      <td>
                        <p>
                          {addressUsernameOrServiceLink(user, 'address')}
                        </p>
                        {!issuer &&
                          <>
                            <p>
                              {t("table.non-self-issued", { ns: "nft-distribution" })}:
                              {" "}
                              {niceNumber(user.nonSelfIssued)}
                            </p>
                            <p>
                              {t("table.self-issued", { ns: "nft-distribution" })}:
                              {" "}
                              {niceNumber(user.selfIssued)}
                            </p>
                          </>
                        }
                        <p>
                          {issuer ? t("table.nfts") : t("table.total", { ns: "nft-distribution" })}:
                          {" "}
                          {niceNumber(user.total)}
                          {" "}
                          {
                            nftsExplorerLink(
                              {
                                owner: user.address,
                                ownerDetails: user.addressDetails,
                                issuer: data.issuer,
                                issuerDetails: data.issuerDetails
                              }
                            )
                          }
                        </p>
                      </td>
                    </tr>
                  )
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
