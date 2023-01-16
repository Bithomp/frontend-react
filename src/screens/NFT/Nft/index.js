import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../../components/SEO';
import SearchBlock from '../../../components/SearchBlock';
import CopyButton from '../../../components/CopyButton';
import Tabs from '../../../components/Tabs';

import { onFailedRequest, onApiError, stripText } from '../../../utils';
import {
  shortHash,
  trWithAccount,
  trWithFlags,
  fullDateAndTime,
  amountFormat,
  expirationExpired,
  nftOfferLink,
  codeHighlight
} from '../../../utils/format';
import { nftUrl } from '../../../utils/nft';

import './styles.scss';
import { ReactComponent as LinkIcon } from "../../../assets/images/link.svg";

export default function Nft() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [showRawMetadata, setShowRawMetadata] = useState(false);
  const [contentTab, setContentTab] = useState("image");

  const checkApi = async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    //&offersHistory=true
    const response = await axios('v2/nft/' + id + '?uri=true&metadata=true&history=true&sellOffers=true&buyOffers=true&offersValidate=true').catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);
    let newdata = response?.data;
    if (newdata) {
      if (newdata.flags) {
        newdata.history = newdata.history.sort((a, b) => (a.changedAt < b.changedAt) ? 1 : -1);
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
      "flags": {
        "burnable":false,
        "onlyXRP":false,
        "trustLine":false,
        "transferable":true
      },
      "issuer":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "nftokenID":"000800005822D634B22590727E3CB2431F03C3B8B041528316E72FD300000001",
      "nftokenTaxon":193871,
      "transferFee":0,
      "sequence":1,
      "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "uri":"68747470733A2F2F697066732E696F2F697066732F6261667962656964727274376C6C796A6232717167337533376F61676E77726D707779756F686C74373637676B6E7635707966796A3668706F68342F6D657461646174612E6A736F6E",
      "issuedAt":1667328041,
      "ownerChangedAt":1667328041,
      "deletedAt":null,
      "url":"https://cloudflare-ipfs.com/ipfs/bafybeidrrt7llyjb2qqg3u37oagnwrmpwyuohlt767gknv5pyfyj6hpoh4/metadata.json",
      "metadata":{
        "name":"Pirate Edition",
        "description":"-Sanctum NFTs 007-\n\n&quot;The discovery of treasure in the land of Atlantis.&quot;",
        "external_url":"https://www.xsanctumchain.com/nfts",
        "attributes":[
          {
            "trait_type":"skin",
            "value":"PIRATES SKIN"
          }
        ],
        "category":"collectibles",
        "md5hash":"3c18d8be15e2fa09879dfcf9ab7050d5",
        "is_explicit":false,
        "content_type":"image/jpeg",
        "image_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/image.jpeg",
        "animation_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/animation.jpeg"
      },
      "history":[
        {
          "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "changedAt":1667328041,
          "ledgerIndex":75463709,
          "txHash":"5F0162B9FB19F2D88F5EC38AEA9984B0BAD11E1CD960B135F4BA128BF980AA4D"
        }
      ],
      "sellOffers":[
        {
          "amount":"1500000000",
          "offerIndex":"7E2B5165926818732C3EC244ACD9B550294EF4B091713A99F6A083487D3ABA40",
          "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "expiration":null,
          "destination":null,
          "createdAt": 1670451431,
          "createdLedgerIndex":75483425,
          "createdTxHash":"9573894AE03706B98909DBABD9D670AF6BACBB704AA053E7DC15AD9EB4F79208"
        },
        {
          "amount": {
            "currency": "534F4C4F00000000000000000000000000000000",
            "issuer": "rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz",
            "value": "10000"
          },
          "offerIndex": "E992835C148C9EAA7A93EABDD397A84333F27F99DA386255378A3C16A8B0DEF3",
          "owner": "r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "expiration": null,
          "destination": null,
          "createdAt": 1670721431,
          "createdLedgerIndex": 76344438,
          "createdTxHash": "616CAAAC1C737C964C4A3B27DEAFE2F172D5A82FDD9342A1F5C677ACABC5AE7B"
        }
      ],
      "buyOffers":null
    }
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const externalUrl = (meta) => {
    let url = meta.external_url || meta.external_link;
    if (url) {
      url = stripText(url);
      url = url.toLowerCase();
      if (url.slice(0, 8) !== 'https://' && url.slice(0, 7) !== 'http://') {
        url = 'https://' + url;
      }
      return <a href={url} target="_blank" rel="noreferrer nofollow">{url}</a>;
    }
    return null;
  }

  const eventType = (event) => {
    if (event.owner) {
      if (event.amount === "0") {
        return t("table.transferred");
      } else if (event.amount) {
        return t("table.sold");
      } else {
        return t("table.minted");
      }
    } else {
      return <span className="red">{t("table.burned")}</span>;
    }
  }

  const ownerName = (nftEvent) => {
    if (nftEvent.owner) {
      if (nftEvent.amount === "0") {
        return t("table.receiver");
      } else if (nftEvent.amount) {
        return t("table.buyer");
      } else {
        return t("table.minter");
      }
    }
  }

  const nftHistory = (history) => {
    /*
      "history": [
        {
          "owner": "rJcEbVWJ7xFjL8J9LsbxBMVSRY2C7DU7rz",
          "changedAt": 1653941441,
          "ledgerIndex": 2577883,
          "txHash": "28261C06ECF7B0E8F5843213122DB62A4B8064C22AD5D947A97AF0F1E604123D"
        }
      ],
    */
    if (history) {
      return history.map((nftEvent, i) =>
        <tbody key={i}>
          <tr>
            <td className='bold'>{eventType(nftEvent)}</td>
            <td>{fullDateAndTime(nftEvent.changedAt)} <a href={"/explorer/" + nftEvent.txHash}><LinkIcon /></a></td>
          </tr>
          {(nftEvent.amount && nftEvent.amount !== "0") &&
            <tr>
              <td>{t("table.price")}</td>
              <td>{amountFormat(nftEvent.amount, { tooltip: "right" })}</td>
            </tr>
          }
          {trWithAccount(nftEvent, 'owner', ownerName(nftEvent), "/explorer/")}
          {i !== history.length - 1 &&
            <tr><td colSpan="100"><hr /></td></tr>
          }
        </tbody>
      );
    }
  }

  const nftOffers = (offers, type) => {
    if (type !== 'sell' && type !== 'buy') {
      return <tbody><tr><td colSpan="100">Error, no offer type</td></tr></tbody>;
    }
    /*
      {
        "amount": "1000000000",
        "offerIndex": "D9C7F16C02CEBFF5D4D17F891503253AE6485F6863DEC25D2B095B919D478E06",
        "owner": "rsr1kvnWTNNxaX24Ny2ccE3onPMukiEHY3",
        "expiration": null,
        "destination": null,
        "createdLedgerIndex": 75640602,
        "createdTxHash": "AF8A46B6C49DAF95B44BC34B8961D19B19B5D5C52071BEA3CF0DEE038BFCDEC1",
        "createdAt": 1667249811,
        "valid": true
      }
    */

    const buyerOrSeller = type === 'sell' ? t("table.seller") : t("table.buyer");

    let validExists = 0;
    if (offers) {
      for (let i = 0; i < offers.length; i++) {
        if (offers[i].valid === true) {
          validExists++;
        }
      }
    }

    if (validExists) {
      return offers.filter(function (offer) { return offer.valid; }).map((offer, i) =>
        <tbody key={i}>
          {trWithAccount(offer, 'owner', buyerOrSeller, "/explorer/")}
          <tr>
            <td>{t("table.amount")}</td>
            <td>{amountFormat(offer.amount, { tooltip: "right" })}</td>
          </tr>
          <tr>
            <td>{t("table.placed")}</td>
            <td>{fullDateAndTime(offer.createdAt)} <a href={"/explorer/" + offer.createdTxHash}><LinkIcon /></a></td>
          </tr>
          {offer.expiration &&
            <tr>
              <td>{expirationExpired(offer.expiration)}</td>
              <td>{fullDateAndTime(offer.expiration, "expiration")}</td>
            </tr>
          }
          {offer.destination &&
            trWithAccount(offer, 'destination', t("table.destination"), "/explorer/")
          }
          <tr>
            <td>{t("table.offer")}</td>
            <td>{nftOfferLink(offer.offerIndex, 10)}</td>
          </tr>
          {i !== validExists - 1 &&
            <tr><td colSpan="100"><hr /></td></tr>
          }
        </tbody>
      )
    } else {
      return <tbody>
        <tr><td colSpan="100">{t("table.text.no-offers")}</td></tr>
      </tbody>;
    }
  }

  const nftAudio = (nft) => {
    const audioUrl = nftUrl(nft, 'audio');
    if (audioUrl) {
      return <audio src={audioUrl} controls style={{ display: 'block', margin: "20px auto" }}></audio>;
    } else {
      return <></>;
    }
  }

  const loadingImage = () => {
    const style = {
      textAlign: "center",
      marginTop: "40px",
      marginBottom: "20px"
    };
    if (errored) {
      return <div style={style}>{t("general.load-failed")}<br /></div>;
    } else if (!loaded) {
      return <div style={style}><span className="waiting"></span><br />{t("general.loading")}</div>;
    }
  }

  const nftImageAndVideo = (nft) => {
    const imageUrl = nftUrl(nft, 'image');
    const videoUrl = nftUrl(nft, 'video');
    const clUrl = {
      image: nftUrl(nft, 'image', 'cl'),
      video: nftUrl(nft, 'video', 'cl')
    }

    const contentTabList = [
      { value: 'image', label: (t("tabs.image")) },
      { value: 'video', label: (t("tabs.video")) }
    ];
    let imageStyle = { width: "100%", height: "auto" };
    if (imageUrl) {
      if (imageUrl.slice(0, 10) === 'data:image') {
        imageStyle.imageRendering = 'pixelated';
      }
      if (nft.deletedAt) {
        imageStyle.filter = 'grayscale(1)';
      }
    }
    return <>
      {imageUrl && videoUrl &&
        <div style={{ height: "31px", marginBottom: "10px" }}>
          <span className='tabs-inline' style={{ float: "left" }}>
            <Tabs
              tabList={contentTabList}
              tab={contentTab}
              setTab={setContentTab}
              name="content"
              style={{ margin: 0 }}
            />
          </span>
          <span style={{ float: "right", padding: "4px 0px" }}>
            <a href={clUrl[contentTab]} target="_blank" rel="noreferrer">
              {t("tabs." + contentTab)} IPFS
            </a>
          </span>
        </div>
      }
      {(imageUrl || videoUrl) && loadingImage(nft)}
      {imageUrl && contentTab === 'image' &&
        <img
          style={imageStyle}
          src={imageUrl}
          onLoad={() => setLoaded(true)}
          onError={({ currentTarget }) => {
            currentTarget.onerror = () => {
              setErrored(true);
            };
            currentTarget.src = clUrl.image;
          }}
          alt={nft.metadata?.name}
        />
      }
      {videoUrl && contentTab === 'video' &&
        <video
          autoPlay
          playsInline
          muted
          loop
          controls
          style={{ width: "100%", height: "auto" }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      }
    </>
  }

  const otherOwnedNftsTr = (owner) => {
    if (!owner) return <></>;
    return <tr>
      <td></td>
      <td><a href={"/nfts/" + owner}>{t("links.owned-nfts-same-account")}</a></td>
    </tr>
  }

  const otherIssuedNftsTr = (issuer) => {
    if (!issuer) return <></>;
    return <tr>
      <td></td>
      <td>
        {t("links.nfts-same-issuer")}:{" "}
        <a href={"/nft-explorer?issuer=" + issuer}>{t("links.all")}</a>,{" "}
        <a href={"/top-nft-sales?issuer=" + issuer}>{t("links.top-sold")}</a>,{" "}
        <a href={"/latest-nft-sales?issuer=" + issuer}>{t("links.latest-sold")}</a>
      </td>
    </tr>
  }

  return <>
    {data && <SEO title={t("menu.nft") + " " + data.metadata?.name} />}
    <SearchBlock
      searchPlaceholderText={t("nft.enter-nft-id")}
      tab="nft"
    />
    <div className="content-center short-top nft">
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
                    {nftImageAndVideo(data)}
                    <div>
                      {nftAudio(data)}
                      {data.metadata?.attributes && data.metadata?.attributes[0] &&
                        <table className='table-details autowidth'>
                          <thead>
                            <tr>
                              <th colSpan="100">{t("table.attributes")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.metadata.attributes.map((attr, i) =>
                              <tr key={i}>
                                <td>{attr.trait_type}</td>
                                <td>{attr.value}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      }
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
                        {data.metadata &&
                          <>
                            {data.metadata.name &&
                              <tr>
                                <td>{t("table.name")}</td>
                                <td>{stripText(data.metadata.name)}</td>
                              </tr>
                            }
                            {data.metadata.description &&
                              <tr>
                                <td>{t("table.description")}</td>
                                <td>{stripText(data.metadata.description)}</td>
                              </tr>
                            }
                            {data.metadata.collection &&
                              <>
                                {data.metadata.collection.name &&
                                  <tr>
                                    <td>{t("table.collection")}</td>
                                    <td>{stripText(data.metadata.collection.name)}</td>
                                  </tr>
                                }
                              </>
                            }
                            {externalUrl(data.metadata) &&
                              <tr>
                                <td>{t("table.external-url")}</td>
                                <td>{externalUrl(data.metadata)}</td>
                              </tr>
                            }
                            <tr>
                              <td>{t("table.raw-data")}</td>
                              <td>
                                <span className='link' onClick={() => setShowRawMetadata(!showRawMetadata)}>
                                  {showRawMetadata ? t("table.text.hide") : t("table.text.show")}
                                </span>
                              </td>
                            </tr>
                          </>
                        }
                      </tbody>
                    </table>

                    <div className={'slide ' + (showRawMetadata ? "opened" : "closed")}>
                      {codeHighlight(data.metadata)}
                    </div>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.ledger-data")}</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>NFT ID</td>
                          <td>{shortHash(data.nftokenID, 10)} <CopyButton text={data.nftokenID} /></td>
                        </tr>
                        {data.issuer === data.owner ?
                          <>
                            {trWithAccount(data, 'owner', t("table.issuer-owner"), "/explorer/")}
                            {otherOwnedNftsTr(data.owner)}
                            {otherIssuedNftsTr(data.issuer)}
                          </>
                          :
                          <>
                            {trWithAccount(data, 'owner', t("table.owner"), "/explorer/")}
                            {otherOwnedNftsTr(data.owner)}
                            {trWithAccount(data, 'issuer', t("table.issuer"), "/explorer/")}
                            {otherIssuedNftsTr(data.issuer)}
                          </>
                        }
                        <tr>
                          <td>{t("table.taxon")}</td>
                          <td>{data.nftokenTaxon}</td>
                        </tr>
                        <tr>
                          <td>{t("table.serial")}</td>
                          <td>{data.sequence}</td>
                        </tr>
                        {!data.uri &&
                          <tr>
                            <td>URI</td>
                            <td>{t("table.text.unspecified")}</td>
                          </tr>
                        }
                        {!!data.transferFee && <tr>
                          <td>{t("table.transfer-fee")}</td>
                          <td>{data.transferFee / 1000}%</td>
                        </tr>}
                        {trWithFlags(data.flags)}
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.history")}</th></tr>
                      </thead>
                      {nftHistory(data.history)}
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.sell-offers")}</th></tr>
                      </thead>
                      {nftOffers(data.sellOffers, "sell")}
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">{t("table.buy-offers")}</th></tr>
                      </thead>
                      {nftOffers(data.buyOffers, "buy")}
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
          <h2 className='center'>{t("menu.nft")}</h2>
          <p className='center'>
            {t("nft.desc")}
          </p>
        </>
      }
    </div>
  </>;
};
