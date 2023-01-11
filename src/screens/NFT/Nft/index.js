import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../../components/SEO';
import SearchBlock from '../../../components/SearchBlock';
import CopyButton from '../../../components/CopyButton';

import { onFailedRequest, onApiError, stripText } from '../../../utils';
import { shortHash, userOrServiceLink, fullDateAndTime } from '../../../utils/format';
import { nftImageStyle, nftUrl } from '../../../utils/nft';

import './styles.scss';

export default function Nft() {
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
    const response = await axios('v2/nft/' + id + '?uri=true&metadata=true&history=true&sellOffers=true&buyOffers=true').catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.flags) {
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

  //copied
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

  //copied
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

  const audio = (nft) => {
    const audioUrl = nftUrl(nft, 'audio');
    if (audioUrl) {
      return <audio src={audioUrl} controls style={{ display: 'block', margin: "20px auto" }}></audio>;
    } else {
      return <></>;
    }
  }

  //copied
  const loadingImage = (nft) => {
    if (errored) {
      return <div className="img-status" style={nftPrev}>{t("general.load-failed")}</div>;
    } else if (!loaded) {
      return <div className="img-status" style={nftPrev}><span className="waiting"></span><br />{t("general.loading")}</div>;
    }
  }

  //copied
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

  const externalUrl = (meta) => {
    let url = meta.external_url || meta.external_link;
    url = stripText(url);
    if (url) {
      return <a href={url} target="_blank" rel="noreferrer nofollow">{url}</a>;
    }
    return null;
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
                    <div className="dummy"></div>
                    {loadingImage(data)}
                    {imageOrVideo(data)}
                    <div className='column-left-bottom'>
                      {audio(data)}
                    </div>
                  </div>
                  <div className="column-right">
                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">META DATA</th></tr>
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
                            {externalUrl(data.metadata) &&
                              <tr>
                                <td>{t("table.external-url")}</td>
                                <td>{externalUrl(data.metadata)}</td>
                              </tr>
                            }
                          </>
                        }
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">LEDGER DATA</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>NFT ID</td>
                          <td>{shortHash(data.nftokenID, 10)} <CopyButton text={data.nftokenID} /></td>
                        </tr>
                        {trWithAccount(data, 'issuer', t("table.issuer"), "/explorer/")}
                        <tr>
                          <td>{t("table.taxon")}</td>
                          <td>{data.nftokenTaxon}</td>
                        </tr>
                        <tr>
                          <td>{t("table.serial")}</td>
                          <td>{data.sequence}</td>
                        </tr>
                        {trWithAccount(data, 'owner', t("table.owner"), "/explorer/")}
                      </tbody>
                    </table>

                    <table className='table-details'>
                      <thead>
                        <tr><th colSpan="100">History</th></tr>
                      </thead>
                      <tbody>
                        {data.deletedAt &&
                          <tr>
                            <td className='red'>Burned</td>
                            <td>{fullDateAndTime(data.deletedAt)}</td>
                          </tr>
                        }
                        <tr>
                          <td>Minted</td>
                          <td>{fullDateAndTime(data.issuedAt)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p>
                      <a href={"/nfts/" + data.owner}>{t("links.owned-nfts-same-account")}</a>
                    </p>
                    <p>
                      <a href={"/nft-explorer?issuer=" + data.issuer}>{t("links.nfts-same-issuer")}</a>
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
          <h2 className='center'>{t("menu.nft")}</h2>
          <p className='center'>
            {t("nft.desc")}
          </p>
        </>
      }
    </div>
  </>;
};
