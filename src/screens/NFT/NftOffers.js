import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

import SEO from '../../components/SEO';
import SearchBlock from '../../components/SearchBlock';

import { onFailedRequest } from '../../utils';
import { amountFormat, fullDateAndTime, expirationExpired } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftOffers() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userData, setUserData] = useState({});
  const [showExpirationColumn, setShowExpirationColumn] = useState(false);
  const [showDestinationColumn, setShowDestinationColumn] = useState(false);

  const checkApi = async () => {
    if (!id) {
      return;
    }

    const response = await axios('v2/address/' + id + '?username=true&service=true&nftOffers=true').catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);
    const newdata = response?.data;
    if (newdata) {
      if (newdata.address) {
        setUserData({
          username: newdata.username,
          service: newdata.service?.name,
          address: newdata.address
        });

        if (newdata.nftOffers.length > 0) {
          setErrorMessage("");
          setData(newdata.nftOffers.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1));
        } else {
          setErrorMessage(t("explorer.nft-offers.no-nft-offers"));
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
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        if (data[i].destination) {
          setShowDestinationColumn(true);
        }
        if (data[i].expiration) {
          setShowExpirationColumn(true);
        }
      }
    }
  }, [data]);

  /*
  {
    "address": "rHAfrQNDBohGbWuWTWzpJe1LQWyYVnbG2n",
    "nftOffers": [
      {
        "nftokenID": "000D0000B9BD7D214128A91ECECE5FCFF9BDB0D043567C51368CA6C800020F2E",
        "offerIndex": "0FD2A4B5D5275F5A0BE9313B1035007CC8B1BD2E9CE46FF198B2D7A202B49E30",
        "createdLedgerIndex": 6765897,
        "createdTxHash": "D5DEA2B5AABD3F0E70B6449C9A53CC38E58EC95FC11DC086158EFE5DD818768D",
        "createdAt": 2342342342,
        "owner": "rHAfrQNDBohGbWuWTWzpJe1LQWyYVnbG2n",
        "destination": null,
        "expiration": null,
        "amount": "100",
        "flags": {
          "sellToken": true
        }
      }
    ]
  }
  */

  useEffect(() => {
    checkApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return <>
    <SEO title={t("menu.nft-offers") + " " + id} />
    <SearchBlock
      searchPlaceholderText={t("explorer.enter-address")}
      tab="nft-offers"
      userData={userData}
    />
    <div className="content-text" style={{ marginTop: "20px" }}>
      {id ?
        <>
          {window.innerWidth > 960 ?
            <table className="table-large">
              <thead>
                <tr>
                  <th className='center'>{t("table.index")}</th>
                  <th className='center'>{t("table.offer")}</th>
                  <th className='center'>NFT</th>
                  <th>{t("table.type")}</th>
                  <th>{t("table.amount")}</th>
                  <th>{t("table.placed")}</th>
                  {showExpirationColumn && <th>{t("table.expiration")}</th>}
                  {showDestinationColumn && <th className='center'>{t("table.destination")}</th>}
                  <th className='center'>{t("table.transaction")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ?
                  <tr className='center'><td colSpan="9"><span className="waiting"></span></td></tr>
                  :
                  <>
                    {!errorMessage ? data.map((offer, i) =>
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td className='center'><a href={"/nft-offer/" + offer.offerIndex}><LinkIcon /></a></td>
                        <td className='center'><a href={"/explorer/" + offer.nftokenID}><LinkIcon /></a></td>
                        <td>{offer.flags?.sellToken === true ? t("table.text.sell") : t("table.text.buy")}</td>
                        <td>{amountFormat(offer.amount, { tooltip: true })}</td>
                        <td>{fullDateAndTime(offer.createdAt)}</td>
                        {showExpirationColumn && <td>{offer.expiration ? fullDateAndTime(offer.expiration, "expiration") : t("table.text.no-expiration")}</td>}
                        {showDestinationColumn && <td className='center'>{offer.destination ? <a href={"/explorer/" + offer.destination}><LinkIcon /></a> : ""}</td>}
                        <td className='center'><a href={"/explorer/" + offer.createdTxHash}><LinkIcon /></a></td>
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
                  <tr className='center'><td colSpan="100"><span className="waiting"></span></td></tr>
                  :
                  <>
                    {!errorMessage ? data.map((offer, i) =>
                      <tr key={i}>
                        <td style={{ padding: "5px" }}>{i + 1}</td>
                        <td>
                          <p>
                            {t("table.offer")}: <a href={"/nft-offer/" + offer.offerIndex}><LinkIcon /></a>
                          </p>
                          <p>
                            NFT: <a href={"/explorer/" + offer.nftokenID}><LinkIcon /></a>
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
                              {t("table.destination")}: <a href={"/explorer/" + offer.destination}><LinkIcon /></a>
                            </p>
                          }
                          <p>
                            {t("table.transaction")}: <a href={"/explorer/" + offer.createdTxHash}><LinkIcon /></a>
                          </p>
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
          <h2 className='center'>{t("menu.nft-offers")}</h2>
          <p className='center'>
            {t("explorer.nft-offers.desc")}
          </p>
        </>
      }
    </div>
  </>;
};
