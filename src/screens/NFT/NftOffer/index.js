import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../../components/SEO';
import SearchBlock from '../../../components/SearchBlock';
import CopyButton from '../../../components/CopyButton';

import { onFailedRequest } from '../../../utils';
import { fullDateAndTime, amountFormat, shortHash, userOrServiceLink, expirationExpired } from '../../../utils/format';
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
          setErrorMessage(newdata.error);
        } else {
          setErrorMessage("Error");
          console.log(newdata);
        }
      }
    }
  }

  /*
  {
    "nftokenID": "000903E8E8A080A9F8DB20A3AAC39E00933C85DAF69E37CE0000099E00000000",
    "offerIndex": "2154FFC81426C16C906D2B8E7AB4E98DEBCE97A4087E56528AB4B840F2FC5F40",
    "createdAt": 1669036331,
    "createdLedgerIndex": 33047031,
    "createdTxHash": "A1E378EDCFDBA8DAFA11D870BBCC6EEF43E8C63FEBCB9AAEDA5375DC8D25FF84",
    "account": "r4DpsRPfURSxrjJCAv679TJWpqa9uDfXky",
    "owner": "r4DpsRPfURSxrjJCAv679TJWpqa9uDfXky",
    "destination": null,
    "expiration": null,
    "amount": "100",
    "flags": {
      "sellToken": true
    },
    "acceptedAt": 1669036370,
    "acceptedLedgerIndex": 33047043,
    "acceptedTxHash": "F50B1E61AE1AA2DCD0ECABC90AF91119F703DBED2C65E3D98BF54E0B851DC7DE",
    "canceledAt": 1669036370,
    "canceledLedgerIndex": 33047043,
    "canceledTxHash": "F50B1E61AE1AA2DCD0ECABC90AF91119F703DBED2C65E3D98BF54E0B851DC7DE",
    "nftoken": {
      "flags": {
        "burnable": true,
        "onlyXRP": false,
        "trustLine": false,
        "transferable": true
      },
      "issuer": "r4DpsRPfURSxrjJCAv679TJWpqa9uDfXky",
      "nftokenID": "000903E8E8A080A9F8DB20A3AAC39E00933C85DAF69E37CE0000099E00000000",
      "nftokenTaxon": 5,
      "transferFee": 1000,
      "sequence": 0,
      "owner": "rPN5J7wXYXctCm4HzUKptWTjV2WvbDpdxN",
      "uri": "68747470733A2F2F656E2E77696B6970656469612E6F72672F77696B692F46696C653A416C6963652D626F622D6D616C6C6F72792E6A7067",
      "issuedAt": 1669036310,
      "ownerChangedAt": 1669036370,
      "deletedAt": null,
      "url": "https://en.wikipedia.org/wiki/File:Alice-bob-mallory.jpg",
      "metadata": null
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

  const trWithAccount = (data, valueName, tableName, url = "explorer") => {
    if (!data || !data[valueName]) return null;
    let link = <a href={url + data[valueName]}>{data[valueName]}</a>;
    let userOrServicelink = userOrServiceLink(data, valueName, { url });
    return userOrServicelink ?
      <>
        <tr>
          <td>{tableName}</td>
          <td>{userOrServicelink}</td>
        </tr>
        <tr>
          <td></td>
          <td>{link}</td>
        </tr>
      </>
      :
      <tr>
        <td>{tableName}</td>
        <td>{link}</td>
      </tr>
  }

  return <>
    {data && <SEO title={t("menu.nft-offer") + " " + data.offerIndex} />}
    <SearchBlock
      searchPlaceholderText={t("nft-offer.enter-offer-id")}
      tab="nft-offer"
    />
    <div className="content-center nft-offer">
      {id ? <>
        {loading ?
          <div className='center' style={{ marginTop: "80px" }}><span className="waiting"></span></div>
          :
          <>
            {errorMessage ?
              <div className='center'>{errorMessage}</div>
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
                  <div className="main-box column-right">
                    <table>
                      <tbody>
                        <tr>
                          <td style={{ minWidth: "95px" }}>{t("table.offer")}</td>
                          <td>{shortHash(data.offerIndex)} <CopyButton text={data.offerIndex} /></td>
                        </tr>
                        {trWithAccount(data, 'account', sellerOrBuyer, "/nfts/")}
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
                          <tr>
                            <td>{t("table.accepted")}</td>
                            <td>{fullDateAndTime(data.acceptedAt)} <a href={"/explorer/" + data.acceptedTxHash}><LinkIcon /></a></td>
                          </tr>
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
                      <a href={"/nft-explorer?issuer=" + data.nftoken.issuer}>{t("links.nfts-same-issuer")}</a>
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
