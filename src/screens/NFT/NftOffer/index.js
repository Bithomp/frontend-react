import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../../components/SEO';
import SearchBlock from '../../../components/SearchBlock';
import CopyButton from '../../../components/CopyButton';

import { onFailedRequest, onApiError } from '../../../utils';
import { fullDateAndTime, amountFormat, shortHash, trWithAccount, expirationExpired } from '../../../utils/format';
import { nftImageStyle, nftUrl } from '../../../utils/nft';

import { ReactComponent as LinkIcon } from "../../../assets/images/link.svg";
import './styles.scss';

export default function NftOffer() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const checkApi = async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    const response = await axios('v2/nft/offer/' + id).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.offerIndex) {
        setData(newdata);
      } else {
        if (newdata.error) {
          onApiError(newdata.error, setErrorMessage);
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
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const nftPrev = {
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    position: "absolute",
    backgroundPosition: "center",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: "40px",
    textAlign: "center"
  }

  const imageOrVideo = (nft) => {
    let imageStyle = nftImageStyle(nft, nftPrev);
    if (!Object.keys(imageStyle).includes("backgroundImage")) {
      const nftVideoUrl = nftUrl(nft, 'video');
      if (nftVideoUrl) {
        return <span style={nftPrev}>
          <video autoPlay playsInline muted loop>
            <source src={nftVideoUrl} type="video/mp4" />
          </video>
        </span>;
      } else {
        return <span className='background-secondary' style={nftPrev}></span>;
      }
    } else {
      return <>
        <span style={imageStyle}></span>
        <img
          style={{ display: "none" }}
          src={nftUrl(nft, 'image')}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          alt={nft.metadata?.name}
        />
      </>;
    }
  }

  const sellerOrBuyer = data?.flags?.sellToken === true ? t("table.seller") : t("table.buyer");

  const loadingImage = (nft) => {
    if (errored) {
      return <div className="img-status" style={nftPrev}>{t("general.load-failed")}</div>;
    } else if (!loaded) {
      return <div className="img-status" style={nftPrev}><span className="waiting"></span><br />{t("general.loading")}</div>;
    }
  }

  return <>
    {data && <SEO title={t("menu.nft-offer") + " " + data.offerIndex} />}
    <SearchBlock
      searchPlaceholderText={t("nft-offer.enter-offer-id")}
      tab="nft-offer"
    />
    <div className="content-center short-top nft-offer">
      {id ? <>
        {loading ?
          <div className='center' style={{ marginTop: "80px" }}><span className="waiting"></span></div>
          :
          <>
            {errorMessage ?
              <div className='center orange bold'>{errorMessage}</div>
              :
              <>{data.flags &&
                <>
                  <div className="column-left">
                    <div className="dummy"></div>
                    {loadingImage(data.nftoken)}
                    {imageOrVideo(data.nftoken)}
                    <div className='column-left-bottom'>
                      {data.nftoken.metadata?.name ? data.nftoken.metadata.name : ""}
                    </div>
                  </div>
                  <div className="column-right">
                    <table className='table-details'>
                      <tbody>
                        <tr>
                          <td>{t("table.offer")}</td>
                          <td>{shortHash(data.offerIndex)} <CopyButton text={data.offerIndex} /></td>
                        </tr>
                        {trWithAccount(data, 'account', sellerOrBuyer, "/explorer/")}
                        <tr>
                          <td>{data.flags.sellToken === true ? t("nft-offer.selling") : t("nft-offer.buying")} NFT</td>
                          <td><a href={"/explorer/" + data.nftokenID}>{shortHash(data.nftokenID)}</a></td>
                        </tr>
                        {trWithAccount(data, 'destination', t("table.destination"), "/explorer/")}
                        <tr>
                          <td>{t("table.price")}</td>
                          <td>{amountFormat(data.amount)}</td>
                        </tr>
                        <tr>
                          <td>{t("table.placed")}</td>
                          <td>{fullDateAndTime(data.createdAt)} <a href={"/explorer/" + data.createdTxHash}><LinkIcon /></a></td>
                        </tr>
                        {data.expiration &&
                          <tr>
                            <td>{expirationExpired(data.expiration)}</td>
                            <td>{fullDateAndTime(data.expiration, "expiration")}</td>
                          </tr>
                        }
                        {data.acceptedAt &&
                          <>
                            <tr>
                              <td>{t("table.accepted")}</td>
                              <td>{fullDateAndTime(data.acceptedAt)} <a href={"/explorer/" + data.acceptedTxHash}><LinkIcon /></a></td>
                            </tr>
                            {data.acceptedAccount && trWithAccount(data, 'acceptedAccount', t("table.accepted-by"), "/explorer/")}
                          </>
                        }
                        {data.canceledAt &&
                          <tr>
                            <td>{t("table.canceled")}</td>
                            <td>{fullDateAndTime(data.canceledAt)} <a href={"/explorer/" + data.canceledAt}><LinkIcon /></a></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                    <p>
                      <a href={"/nft-offers/" + data.account}>{t("links.active-offers-same-account")}</a>
                    </p>
                    <p>
                      <a href={"/nfts/" + data.account}>{t("links.owned-nfts-same-account")}</a>
                    </p>
                    <p>
                      {t("links.nfts-same-issuer")}: <a href={"/nft-explorer?issuer=" + data.nftoken.issuer}>{t("links.all")}</a>, <a href={"/top-nft-sales?issuer=" + data.nftoken.issuer}>{t("links.top-sold")}</a>, <a href={"/latest-nft-sales?issuer=" + data.nftoken.issuer}>{t("links.latest-sold")}</a>
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
          <h2 className='center'>{t("menu.nft-offer")}</h2>
          <p className='center'>
            {t("nft-offer.desc")}
          </p>
        </>
      }
    </div>
  </>;
};
