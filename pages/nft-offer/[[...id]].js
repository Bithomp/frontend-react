import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'

import {
  fullDateAndTime,
  amountFormat,
  shortHash,
  trWithAccount,
  expirationExpired,
  trStatus,
  nftIdLink
} from '../../utils/format'

//import { delay } from '../../utils'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import NftImageAndVideo from '../../components/NftPreview'

import LinkIcon from "../../public/images/link.svg"
const xummImg = "/images/xumm.png"

export default function NftOffer({ setSignRequest, signRequest, account }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = router.query

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const checkApi = async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    const response = await axios('v2/nft/offer/' + id + '?offersValidate=true').catch(error => {
      setErrorMessage(t("error." + error.message))
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.offerIndex) {
        setData(newdata);
      } else {
        if (newdata.error) {
          setErrorMessage(t("error-api." + newdata.error))
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  /*
    {
      "nftokenID": "00081068F3D76A09647C813D0363E6F820BB7C797D2EB704E0422464000001C9",
      "offerIndex": "0CD12DD4975654BF1022241D92D63BA7297B579DF685A9BF0777A0D1BAB738BB",
      "createdAt": 1671836850,
      "createdLedgerIndex": 76632990,
      "createdTxHash": "13FDE6CC174F4FDC4D61673064E552D8B370A91DEF4DD9D510089105B7F8ED7B",
      "account": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
      "owner": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
      "destination": null,
      "expiration": null,
      "amount": "50750000",
      "flags": {
        "sellToken": false
      },
      "acceptedAt": 1671836851,
      "acceptedLedgerIndex": 76632991,
      "acceptedTxHash": "FA9A48CCA34EFA25C94D6DD0F7B2B70D00AE0BE6446CF08D044D246BFB0DBB0B",
      "acceptedAccount": "rsQmGXm3G4FA6n5L5QqTELBqTph9xEP5nK",
      "nftoken": {
        "flags": {
          "burnable": false,
          "onlyXRP": false,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "rPNKEiCGzPd53MhqjkQJrtJKLLVWi6bav1",
        "nftokenID": "00081068F3D76A09647C813D0363E6F820BB7C797D2EB704E0422464000001C9",
        "nftokenTaxon": 0,
        "transferFee": 4200,
        "sequence": 457,
        "owner": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
        "uri": "68747470733A2F2F7468657368696C6C76657273652E636F6D2F6E66742F6A736F6E2F70756E6B2F3431382E6A736F6E",
        "issuedAt": 1670143680,
        "ownerChangedAt": 1671836851,
        "deletedAt": null,
        "url": "https://theshillverse.com/nft/json/punk/418.json",
        "metadata": {
          "name": "Shill Punk #418",
          "description": "Assassin Doge (Shill Punk #418) reporting for Duty!\nA collection of Punks on the XRPL.",
          "image": "https://theshillverse.com/nft/img/punk/418.png",
          "edition": 418,
          "date": 1670134831294,
          "actions": [],
          "attributes": [
            {
              "trait_type": "Base",
              "value": "Doge"
            }
          ]
        },
        "issuerDetails": {
          "username": null,
          "service": null
        },
        "ownerDetails": {
          "username": null,
          "service": null
        }
      },
      "accountDetails": {
        "username": null,
        "service": null
      },
      "ownerDetails": {
        "username": null,
        "service": null
      },
      "acceptedAccountDetails": {
        "username": null,
        "service": null
      },
      "issuerDetails": {
        "username": null,
        "service": null
      }
    }
  */

  useEffect(() => {
    if (!signRequest) {
      checkApi()
      /*
      //commented for now, to remove delays on updates when closing the sign window
      if (!data?.nftokenID) {
        // no token - first time fetching - allow right away
        checkApi()
      } else {
        //wait for changes
        //not in use now, as sign will redirect to transaction page for now in the components/SignForm
        //we should better discard the cache, send no-cache request
        //if canceled - do not send a request (no data will be updated)
        //setLoading(true)
        //delay(5000, checkApi).catch(console.error) //may be 4 seconds is enough?
      }
      */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signRequest])

  const sellerOrBuyer = data?.flags?.sellToken === true ? t("table.seller") : t("table.buyer");

  return <>
    {data && <SEO title={t("nft-offer.header") + " " + data.offerIndex} />}
    <SearchBlock
      searchPlaceholderText={t("nft-offer.enter-offer-id")}
      tab="nft-offer"
    />
    <div className="content-center short-top nft-offer">
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
              <>{data.flags &&
                <>
                  <div className="column-left">
                    <NftImageAndVideo nft={data.nftoken} />
                    <div className='center'>
                      {data.nftoken.metadata?.name ? data.nftoken.metadata.name : ""}
                      <br /><br />
                    </div>

                    {!data.canceledAt && ((data?.owner && account?.address && account.address === data.owner) || data?.validationErrors?.includes('Offer is expired')) &&
                      <>
                        <button
                          className='button-action wide center'
                          onClick={() => setSignRequest({
                            wallet: "xumm",
                            request: {
                              "TransactionType": "NFTokenCancelOffer",
                              "Account": data.owner,
                              "NFTokenOffers": [
                                data.offerIndex
                              ]
                            }
                          })}
                        >
                          <Image src={xummImg} className='xumm-logo' alt="xumm" height={24} width={24} />
                          {t("nft.cancel-for")} {amountFormat(data.amount)}
                        </button>
                        <br /><br />
                      </>
                    }

                    {(data?.destination && account?.address && account.address === data.destination && data.valid && data.flags?.sellToken) &&
                      <>
                        <button
                          className='button-action wide center'
                          onClick={() => setSignRequest({
                            wallet: "xumm",
                            request: {
                              "TransactionType": "NFTokenAcceptOffer",
                              "NFTokenSellOffer": data.offerIndex,
                            }
                          })}
                        >
                          <Image src={xummImg} className='xumm-logo' alt="xumm" height={24} width={24} />
                          {t("nft.buy-for")} {amountFormat(data.amount)}
                        </button>
                        <br /><br />
                      </>
                    }
                  </div>
                  <div className="column-right">
                    <table className='table-details'>
                      <tbody>
                        {trStatus(t, data)}
                        <tr>
                          <td>{t("table.offer")}</td>
                          <td>{shortHash(data.offerIndex, 10)} <CopyButton text={data.offerIndex} /></td>
                        </tr>
                        {trWithAccount(data, 'account', sellerOrBuyer, "/explorer/")}
                        <tr>
                          <td>{data.flags.sellToken === true ? t("nft-offer.selling") : t("nft-offer.buying")} NFT</td>
                          <td>{nftIdLink(data.nftokenID)}</td>
                        </tr>
                        {trWithAccount(data, 'destination', t("table.destination"), "/explorer/")}
                        <tr>
                          <td>{t("table.price")}</td>
                          <td>{amountFormat(data.amount, { tooltip: 'right' })}</td>
                        </tr>
                        <tr>
                          <td>{t("table.placed")}</td>
                          <td>{fullDateAndTime(data.createdAt)} <Link href={"/explorer/" + data.createdTxHash}><LinkIcon /></Link></td>
                        </tr>
                        {data.expiration &&
                          <tr>
                            <td>{expirationExpired(t, data.expiration)}</td>
                            <td>{fullDateAndTime(data.expiration, "expiration")}</td>
                          </tr>
                        }
                        {data.acceptedAt &&
                          <>
                            <tr>
                              <td>{t("table.accepted")}</td>
                              <td>{fullDateAndTime(data.acceptedAt)} <Link href={"/explorer/" + data.acceptedTxHash}><LinkIcon /></Link></td>
                            </tr>
                            {data.acceptedAccount && trWithAccount(data, 'acceptedAccount', t("table.accepted-by"), "/explorer/")}
                          </>
                        }
                        {data.canceledAt &&
                          <tr>
                            <td>{t("table.canceled")}</td>
                            <td>{fullDateAndTime(data.canceledAt)} <Link href={"/explorer/" + data.canceledTxHash}><LinkIcon /></Link></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                    <p>
                      <Link href={"/nft-offers/" + data.account}>{t("links.active-offers-same-account")}</Link>
                    </p>
                    <p>
                      <Link href={"/nfts/" + data.account}>{t("links.owned-nfts-same-account")}</Link>
                    </p>
                    <p>
                      {t("links.nfts-same-issuer")}: <Link href={"/nft-explorer?issuer=" + data.nftoken.issuer}>{t("links.all")}</Link>, <Link href={"/nft-sales?issuer=" + data.nftoken.issuer}>{t("links.sold")}</Link>
                    </p>
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
          <h2 className='center'>{t("nft-offer.header")}</h2>
          <p className='center'>
            {t("nft-offer.desc")}
          </p>
        </>
      }
    </div>
  </>;
};
