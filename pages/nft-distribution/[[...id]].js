import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react';
import axios from 'axios'
import { CSVLink } from "react-csv"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

import { useWidth, isAddressOrUsername, addAndRemoveQueryParams } from '../../utils'
import { isValidTaxon } from '../../utils/nft'
import {
  nftsExplorerLink,
  addressUsernameOrServiceLink,
  userOrServiceLink
} from '../../utils/format'

import DownloadIcon from "../../public/images/download.svg"

export async function getServerSideProps(context) {
  const { locale, query } = context
  const { taxon, issuer, id } = query
  //keep query instead of params, anyway it is an array sometimes
  const idQuery = id ? (Array.isArray(id) ? id[0] : id) : ""
  let issuerQuery = isAddressOrUsername(idQuery) ? idQuery : issuer
  issuerQuery = isAddressOrUsername(issuerQuery) ? issuerQuery : ""

  return {
    props: {
      idQuery,
      issuerQuery,
      taxonQuery: taxon || "",
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'

export default function NftDistribution({ issuerQuery, taxonQuery, idQuery }) {
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

  const checkApi = async () => {
    if (!issuer) {
      return
    }
    /*
      {
        "issuer": "rDANq225BqjoyiFPXGcpBTzFdQTnn6aK6z",
        "issuerDetails": {
          "username": "Junkies",
          "service": "Junkies"
        },
        "list": "owners",
        "totalNfts": 4730,
        "totalOwners": 996,
        "owners": [
          {
            "owner": "rDANq225BqjoyiFPXGcpBTzFdQTnn6aK6z",
            "ownerDetails": {
              "username": "Junkies",
              "service": "Junkies"
            },
            "count": 500
          },
      */
    let taxonUrlPart = ""
    if (taxon > -1) {
      taxonUrlPart = '&taxon=' + taxon
    }
    const response = await axios(
      'v2/nft-count/' + issuer + '?list=owners' + taxonUrlPart
    ).catch(error => {
      setErrorMessage(t("error." + error.message))
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.issuer) {
        if (newdata.owners.length > 0) {
          setErrorMessage("");
          setData(newdata);
        } else {
          setErrorMessage(t("nft-distribution.no-nfts"));
        }
      } else {
        if (newdata.error) {
          setErrorMessage(newdata.error);
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  useEffect(() => {
    if (!issuer) return
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuer, taxon])

  let csvHeaders = [
    { label: t("table.owner"), key: "owner" },
    { label: t("table.username"), key: "ownerDetails.username" },
    { label: t("table.count"), key: "count" }
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

  return <>
    <SEO
      title={t("nft-distribution.header") + (issuer ? (" " + issuer) : "") + (taxon ? (" " + taxon) : "")}
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      <h1 className='center'>{t("nft-distribution.header")}</h1>
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

      {data?.totalNfts &&
        <p className='center'>
          <Trans i18nKey="nft-distribution.text0" values={{ users: data.totalOwners, nfts: data.totalNfts }}>
            {{ users: data.totalOwners }} users own {{ nfts: data.totalNfts }} NFTs
          </Trans>
          <br /><br />
          <CSVLink
            data={data.owners}
            headers={csvHeaders}
            filename={'nft_destribution_' + data.issuer + '_UTC_' + (new Date().toJSON()) + '.csv'}
            className='button-action thin narrow'
          >
            <DownloadIcon/> CSV
          </CSVLink>
        </p>
      }
      {issuer ?
        <table className={"table-large" + (windowWidth < 640 ? "" : " shrink")}>
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              <th className='center'>{t("table.count")}</th>
              <th>{t("table.owner")}</th>
              <th className='center'>{t("table.nfts")}</th>
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
                    <td className='center'>{user.count}</td>
                    <td>{addressUsernameOrServiceLink({ owner: user.owner, ownerDetails: user.ownerDetails }, 'owner', { short: (windowWidth < 640) })}</td>
                    <td className='center'>
                      {
                        nftsExplorerLink(
                          {
                            owner: user.owner,
                            ownerDetails: user.ownerDetails,
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
        <p className='center'>
          {t("nft-distribution.desc")}
        </p>
      }
    </div>
  </>
}
