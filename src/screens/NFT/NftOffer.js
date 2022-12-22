import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';
import CopyButton from '../../components/CopyButton';

import { onFailedRequest } from '../../utils';
import { fullDateAndTime, amountFormat, shortHash } from '../../utils/format';
import { nftImageStyle, nftUrl } from '../../utils/nft';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftOffer() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const checkApi = async () => {
    if (!id) {
      return;
    }

    const response = await axios('v2/nft/offer/' + id).catch(error => {
      onFailedRequest(error, setErrorMessage);
      setLoading(false);
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
    width: "calc(40% - 80px)",
    height: "400px",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    verticalAlign: "top"
  }

  const imageOrVideo = (nft) => {
    let imageStyle = nftImageStyle(nft, nftPrev);
    if (!Object.keys(imageStyle).includes("backgroundImage")) {
      const nftVideoUrl = nftUrl(nft, 'video');
      if (nftVideoUrl) {
        return <div style={nftPrev}>
          <video autoPlay playsInline muted loop>
            <source src={nftVideoUrl} type="video/mp4" />
          </video>
        </div>;
      } else {
        return <div className='background-secondary' style={nftPrev}></div>;
      }
    } else {
      return <div style={imageStyle}></div>;
    }
  }

  const sellerOrBuyer = data?.flags?.sellToken === true ? "Seller" : "Buyer";

  return <>
    {data && <SEO title={t("menu.nft-offers") + " " + data.offerIndex} />}
    <SearchBlock
      searchPlaceholderText="Enter an NFT offer ID"
      tab="nft-offer"
    />
    <div className="content-text">
      {loading ?
        <div className='center' style={{ marginTop: "20px" }}><span className="waiting"></span></div>
        :
        <>
          {errorMessage ?
            <div className='center'>{errorMessage}</div>
            :
            <>{data.flags &&
              <div>
                {imageOrVideo(data.nftoken)}
                <div style={{ display: "inline-block", margin: "0 20px", maxWidth: "60%" }}>
                  Offer: {shortHash(data.offerIndex)} <CopyButton text={data.offerIndex} /><br />
                  {data.flags.sellToken === true ? "Selling" : "Buying"} NFT: {data.nftoken.metadata?.name ? data.nftoken.metadata.name : ""} <a href={"/explorer/" + data.nftokenID}><LinkIcon /></a><br />
                  {sellerOrBuyer}: <a href={"/nfts/" + data.account}>{data.account}</a><br />
                  Destination: <a href={"/nfts/" + data.destination}>{data.destination}</a><br />
                  Price: {amountFormat(data.amount)}<br />

                  Offer created: {fullDateAndTime(data.createdAt)}<br />
                  Offer creation transaction: <a href={"/explorer/" + data.createdTxHash}><LinkIcon /></a><br />

                  {data.expiration ? <>Expiration: {fullDateAndTime(data.expiration)}<br /></> : ""}


                  {data.acceptedAt && <>
                    Offer accepted: {fullDateAndTime(data.acceptedAt)}<br />
                    Offer accept transaction: <a href={"/explorer/" + data.acceptedTxHash}><LinkIcon /></a><br />
                  </>}
                  {data.canceledAt && <>
                    Offer canceled: {fullDateAndTime(data.canceledAt)}<br />
                    Offer cancel transaction: <a href={"/explorer/" + data.canceledTxHash}><LinkIcon /></a><br />
                  </>}
                  <br />
                  <a href={"/nft-offers/" + data.account}>Active offers from the same {sellerOrBuyer}</a><br />
                  <a href={"/nft-explorer?issuer=" + data.nftoken.issuer}>NFTs from the same issuer</a><br />
                  <a href={"/nfts/" + data.account}>NFTs owned by the same {sellerOrBuyer}</a><br />
                </div>
              </div>
            }
            </>
          }
        </>
      }
    </div>
  </>;
};
