import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';
import Tabs from '../../components/Tabs';

import { onFailedRequest, setTabParams } from '../../utils';
import {
  amountFormat,
  fullDateAndTime,
  expirationExpired,
  nftLink,
  nftOfferLink
} from '../../utils/format';
import { nftNameLink, nftThumbnail } from '../../utils/nft';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftOffers() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userData, setUserData] = useState({});
  const [showExpirationColumn, setShowExpirationColumn] = useState(false);
  const [showDestinationColumn, setShowDestinationColumn] = useState(false);
  const [offerListTab, setOfferListTab] = useState(searchParams.get("offerList") || "owned");

  const offerListTabList = [
    { value: 'owned', label: t("tabs.owned-offers") },
    { value: 'for-owned-nfts', label: t("tabs.offers-for-owned-nfts") }
  ];

  const checkApi = async () => {
    if (!id) {
      return;
    }

    let offerListUrlPart = '?nftoken=true&offersValidate=true';
    if (offerListTab === 'for-owned-nfts') {
      offerListUrlPart += '&list=counterOffers';
    }

    setLoading(true);
    const response = await axios('v2/nft-offers/' + id + offerListUrlPart).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);
    let newdata = response?.data;
    if (newdata) {

      if (newdata.owner) {
        setUserData({
          username: newdata.ownerDetails?.username,
          service: newdata.ownerDetails?.service,
          address: newdata.owner
        });

        if (newdata.nftOffers.length > 0) {
          setErrorMessage("");

          if (offerListTab === 'for-owned-nfts') {
            newdata.nftOffers = newdata.nftOffers.filter(function (offer) { return offer.valid; });
          }

          setData(newdata.nftOffers.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1));
        } else {
          setErrorMessage(t("nft-offers.no-nft-offers"));
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
    let showDestination = false;
    let showExpiration = false;
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        if (data[i].destination && data[i].valid) {
          showDestination = true;
        }
        if (data[i].expiration) {
          showExpiration = true;
        }
      }
    }
    setShowDestinationColumn(showDestination);
    setShowExpirationColumn(showExpiration);
  }, [data]);

  /*
  {
    "owner": "rDpLcKCi18ixgzJEseKbi2krRGTWZM69gX",
    "list": "offers",
    "ownerDetails": {
      "username": null,
      "service": null
    },
    "nftOffers": [
      {
        "nftokenID": "0008177072631AFCCECFF285A11CDC6159CE3E5AB34920B98AE3FE8E00000421",
        "offerIndex": "7EB78A66242F9F64BBF5117B75A9190CF173D7190AE5113CBF2C2AA3D6024038",
        "createdAt": 1667702700,
        "createdLedgerIndex": 75560558,
        "createdTxHash": "89C4725397796B0B6EB6F095E90023A1DA63FBA7F4724793D6D32148FF97274B",
        "account": "rDpLcKCi18ixgzJEseKbi2krRGTWZM69gX",
        "owner": "rDpLcKCi18ixgzJEseKbi2krRGTWZM69gX",
        "destination": "rpZqTPC8GvrSvEfFsUuHkmPCg29GdQuXhC",
        "expiration": null,
        "amount": "200000000",
        "flags": {
          "sellToken": true
        },
        "accountDetails": {
          "username": null,
          "service": null
        },
        "ownerDetails": {
          "username": null,
          "service": null
        },
        "destinationDetails": {
          "username": null,
          "service": "onXRP"
        },
        "valid": false,
        "validationErrors": [
          "NFT is not owned by the seller account"
        ]
      },
  */

  useEffect(() => {
    checkApi();
    setTabParams(offerListTabList, offerListTab, "owned", setOfferListTab, searchParams, "offerList");
    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, offerListTab]);

  return <>
    <SEO title={t("nft-offers.header") + " " + id} />
    <SearchBlock
      searchPlaceholderText={t("explorer.enter-address")}
      tab="nft-offers"
      userData={userData}
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      <Tabs tabList={offerListTabList} tab={offerListTab} setTab={setOfferListTab} name="offerList" />
      {id ?
        <>
          {window.innerWidth > 960 ?
            <table className="table-large">
              <thead>
                <tr>
                  <th className='center'>{t("table.index")}</th>
                  <th className='center'>{t("table.offer")}</th>
                  <th>NFT</th>
                  <th></th>
                  <th>{t("table.type")}</th>
                  <th>{t("table.amount")}</th>
                  <th>{t("table.placed")}</th>
                  {showExpirationColumn && <th>{t("table.expiration")}</th>}
                  {showDestinationColumn && <th>{t("table.destination")}</th>}
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
                    {!errorMessage ? data.map((offer, i) =>
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td className='center'><Link to={"/nft-offer/" + offer.offerIndex}><LinkIcon /></Link></td>
                        <td>{nftThumbnail(offer.nftoken)}</td>
                        <td>{nftNameLink(offer.nftoken)}</td>
                        <td>{offer.flags?.sellToken === true ? t("table.text.sell") : t("table.text.buy")}</td>
                        <td>{amountFormat(offer.amount, { tooltip: true, maxFractionDigits: 2 })}</td>
                        <td>{fullDateAndTime(offer.createdAt)}</td>
                        {showExpirationColumn && <td>{offer.expiration ? fullDateAndTime(offer.expiration, "expiration") : t("table.text.no-expiration")}</td>}
                        {showDestinationColumn && <td>{nftLink(offer, 'destination')}</td>}
                      </tr>)
                      :
                      <tr><td colSpan="9" className='center orange bold'>{errorMessage}</td></tr>
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
                      <br />{t("general.loading")}
                    </td>
                  </tr>
                  :
                  <>
                    {!errorMessage ? data.map((offer, i) =>
                      <tr key={i}>
                        <td style={{ padding: "5px" }} className='center'>
                          <p>{i + 1}</p>
                          <p>{nftThumbnail(offer.nftoken)}</p>
                        </td>
                        <td>
                          <p>
                            {t("table.offer")}: {nftOfferLink(offer.offerIndex)}
                          </p>
                          <p>
                            NFT:{" "}
                            {offer.nftoken?.metadata?.name ?
                              nftNameLink(offer.nftoken)
                              :
                              nftOfferLink(offer.offerIndex)
                            }
                          </p>
                          <p>
                            {t("table.type")}: {offer.flags?.sellToken === true ? t("table.text.sell") : t("table.text.buy")}
                          </p>
                          <p>
                            {t("table.amount")}: {amountFormat(offer.amount)}
                          </p>
                          <p>
                            {t("table.placed")}: {fullDateAndTime(offer.createdAt)}
                          </p>
                          {offer.expiration &&
                            <p>
                              {expirationExpired(offer.expiration)}: {fullDateAndTime(offer.expiration, "expiration")}
                            </p>
                          }
                          {offer.destination &&
                            <p>
                              {t("table.destination")}: {nftLink(offer, 'destination')}
                            </p>
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
          }
        </>
        :
        <>
          <h2 className='center'>{t("nft-offers.header")}</h2>
          <p className='center'>
            {t("nft-offers." + offerListTab + "-desc")}
          </p>
        </>
      }
    </div>
  </>;
};
