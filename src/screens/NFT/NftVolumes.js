import { useTranslation, Trans } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';
import Tabs from '../../components/Tabs';

import { onFailedRequest, setTabParams, stripText, isAddressOrUsername } from '../../utils';
import {
  amountFormat,
  shortNiceNumber,
  addressUsernameOrServiceLink,
  usernameOrAddress,
  persentFormat
} from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftVolumes() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [periodTab, setPeriodTab] = useState(searchParams.get("period") || "all");
  const [saleTab, setSaleTab] = useState(searchParams.get("sale") || "all");
  const [listTab, setListTab] = useState(searchParams.get("list") || "issuers");
  const [currency] = useState(searchParams.get("currency") || "xrp");
  const [currencyIssuer] = useState(searchParams.get("currencyIssuer"));
  const [sortConfig, setSortConfig] = useState({});

  const listTabList = [
    { value: 'issuers', label: (t("tabs.issuers")) },
    { value: 'brokers', label: (t("tabs.brokers")) },
    { value: 'currencies', label: (t("tabs.currencies")) }
  ];

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ];

  const saleTabList = [
    { value: 'all', label: t("tabs.all-sales") },
    { value: 'secondary', label: (t("tabs.secondary-sales")) },
    { value: 'primary', label: (t("tabs.primary-sales")) }
  ];

  const checkApi = async () => {
    let apiUrl = 'v2/nft-volumes';
    if (listTab === 'currencies') {
      apiUrl += '?list=currencies';
    } else if (listTab === 'issuers' || listTab === 'brokers') {
      apiUrl += '?list=' + listTab;
      if (listTab === 'issuers') {
        apiUrl += '&floorPrice=true';
      }
      if (currency && currencyIssuer) {
        apiUrl += '&currency=' + stripText(currency) + '&currencyIssuer=' + stripText(currencyIssuer);
      } else {
        apiUrl += '&currency=xrp';
      }
    } else {
      return;
    }

    setLoading(true);
    const response = await axios(apiUrl + '&period=' + periodTab + '&saleType=' + saleTab).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);

    const data = response?.data;
    if (data) {
      setRawData(data);
      if (data.period) {
        if (data.volumes.length > 0) {
          setErrorMessage("");
          if (listTab === 'issuers' || listTab === 'brokers') {
            if (data.volumes[0].amount.value) {
              setData(data.volumes.sort((a, b) => (parseFloat(a.amount.value) < parseFloat(b.amount.value)) ? 1 : -1));
            } else {
              let volumes = data.volumes;
              if (listTab === 'brokers' && data.summary) {
                volumes.push({
                  broker: "no broker",
                  sales: data.summary.all.sales - data.summary.brokers.sales,
                  amount: data.summary.all.volume - data.summary.brokers.volume
                });
              }
              setData(volumes.sort((a, b) => (parseFloat(a.amount) < parseFloat(b.amount)) ? 1 : -1));
            }
          } else if (listTab === 'currencies') {
            setData(data.volumes.sort((a, b) => (a.sales < b.sales) ? 1 : -1));
          }
        } else {
          setErrorMessage(t("general.no-data"));
        }
      } else {
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage("Error");
          console.log(data);
        }
      }
    }
  }

  /*
    //currencies
    {
      "period": "day",
      "volumes": [
        {
          "amount": "133874897159",
          "sales": 768
        },
        {
          "amount": {
            "currency": "RCN",
            "issuer": "r4GquJLRTAmEMLECBKaSMLB8pV4dmLWNxX",
            "value": "3900"
          },
          "sales": 4
        },
      ]
    }

    //issuers
    {
      "period": "day",
      "saleType": "all",
      "volumes": [
        {
          "amount": "2944063846633",
          "sales": 1255,
          "issuer": "rpbjkoncKiv1LkPWShzZksqYPzKXmUhTW7",
          "issuerDetails": {
            "username": "XPUNKS",
            "service": "XPUNKS"
          },
          "buyers": 392,
          "tradedNfts": 938,
          "totalOwners": 1849,
          "totalNfts": 6655,
          "floorPrice": {
            "open": {
              "amount": "350000000"
            },
            "private": {
              "amount": "470000000",
              "destination": "rpx9JThQ2y37FaGeeJP7PXDUVEXY3PHZSC",
              "destinationDetails": {
                "username": null,
                "service": "xrp.cafe"
              }
            }
          }
        }
      ]
    }
    //brokers
    {
      "period": "day",
      "saleType": "all",
      "summary": {
        "all": {
          "volume": "15591.737407",
          "sales": 49506
        },
        "brokers": {
          "volume": "1168.622930",
          "sales": 2106
        }
      },
      "volumes": []
  */

  useEffect(() => {
    checkApi();
    setTabParams(listTabList, listTab, "issuers", setListTab, searchParams, "list");
    setTabParams(periodTabList, periodTab, "all", setPeriodTab, searchParams, "period");
    setTabParams(saleTabList, saleTab, "all", setSaleTab, searchParams, "sale");
    setSortConfig({});

    if ((!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) || listTab === 'currencies') {
      searchParams.delete("currency");
      searchParams.delete("currencyIssuer");
    }

    navigate('/nft-volumes?' + searchParams.toString(), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, periodTab, listTab, currency, currencyIssuer]);

  const urlParams = (volume) => {
    let urlPart = "?period=" + periodTab + "&sale=" + saleTab;
    if (volume?.amount) {
      if (volume.amount.currency) {
        urlPart = urlPart + "&currency=" + volume.amount.currency + '&currencyIssuer=' + volume.amount.issuer;
      } else {
        urlPart = urlPart + "&currency=xrp";
      }
    }
    if (volume?.issuer) {
      urlPart = urlPart + "&issuer=" + usernameOrAddress(volume, "issuer");
    }
    return urlPart;
  }

  const sortTable = key => {
    if (!data || !data[0] || !data[0][key]) return;
    let direction = 'descending';
    let sortA = 1;
    let sortB = -1;
    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = 'ascending';
      sortA = -1;
      sortB = 1;
    }
    setSortConfig({ key, direction });

    if (key === 'amount' && data[0].amount.value) {
      setData(data.sort((a, b) => (parseFloat(a.amount.value) < parseFloat(b.amount.value)) ? sortA : sortB));
    } else {
      setData(data.sort((a, b) => (parseFloat(a[key]) < parseFloat(b[key])) ? sortA : sortB));
    }
  }

  const showFloor = priceFloor => {
    if (!priceFloor) return "";
    let open = null;
    let priv = null;

    if (priceFloor.open?.amount?.value) {
      open = Number(priceFloor.open.amount.value);
    } else if (priceFloor.open?.amount) {
      open = Number(priceFloor.open.amount);
    }

    if (priceFloor.private?.amount?.value) {
      priv = Number(priceFloor.private.amount.value);
    } else if (priceFloor.private?.amount) {
      priv = Number(priceFloor.private.amount);
    }

    let floor = priv;
    let priceColor = "orange";
    if (open && priv) {
      if (open <= priv) {
        floor = open;
        priceColor = "";
      }
    } else if (open) {
      floor = open;
      priceColor = "";
    }

    let output = amountFormat(floor, { tooltip: 'left', maxFractionDigits: 2 });
    if (priceColor === 'orange') {
      if (window.innerWidth > 1000) {
        output = (
          <span className={'tooltip ' + priceColor}>
            {output}
            <span className='tooltiptext left'>
              {priceFloor.private?.destinationDetails?.service ? priceFloor.private.destinationDetails.service : "Private market"}
            </span>
          </span>
        )
      } else {
        output = output + (priceFloor.private?.destinationDetails?.service ? (" (" + priceFloor.private.destinationDetails.service + ")") : "");
      }
    }
    return output;
  }

  return <>
    <SEO title={t("menu.nft-volumes")} />
    <div className="content-text">
      <h2 className="center">{t("menu.nft-volumes") + " "}</h2>
      <div className='tabs-inline'>
        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name="list" />
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      {listTab === 'brokers' &&
        <p>
          {t("nft-volumes.brokers.not-a-marketplace-list")}
          <br /><br />
          {rawData?.summary && !loading &&
            <>
              {t("nft-volumes.brokers.period." + periodTab)}{" "}
              <Trans
                i18nKey="nft-volumes.brokers.text0"
                values={{
                  allSales: shortNiceNumber(rawData.summary.all.sales, 0),
                  allVolume: amountFormat(rawData.summary.all.volume, { tooltip: 'right', maxFractionDigits: 2 }),
                  brokerSales: shortNiceNumber(rawData.summary.brokers.sales, 0),
                  percentBrokerSales: persentFormat(rawData.summary.brokers.sales, rawData.summary.all.sales),
                  brokerVolume: amountFormat(rawData.summary.brokers.volume, { tooltip: 'right', maxFractionDigits: 2 }),
                  percentBrokerVolume: persentFormat(rawData.summary.brokers.volume, rawData.summary.all.volume)
                }}
              >
                XRPL had {shortNiceNumber(rawData.summary.all.sales, 0)} NFT trades for {amountFormat(rawData.summary.all.volume, { tooltip: 'right', maxFractionDigits: 2 })},
                from which {shortNiceNumber(rawData.summary.brokers.sales, 0)} ({persentFormat(rawData.summary.brokers.sales, rawData.summary.all.sales)}) of trades for {amountFormat(rawData.summary.brokers.volume, { tooltip: 'right', maxFractionDigits: 2 })} ({persentFormat(rawData.summary.brokers.volume, rawData.summary.all.volume)}) were through the brokerage model.
              </Trans>
            </>
          }
        </p>
      }
      {(listTab !== 'issuers' || (listTab === 'issuers' && window.innerWidth > 1000)) ?
        <table className="table-large shrink">
          <thead>
            <tr>
              <th className='center'>{t("table.index")}</th>
              {listTab === 'issuers' && <th>{t("table.issuer")}</th>}
              {listTab === 'issuers' && <th className='right hide-on-mobile'>{t("table.nfts-now")} <b className={"link" + (sortConfig.key === 'totalNfts' ? " orange" : "")} onClick={() => sortTable('totalNfts')}>⇅</b></th>}
              {listTab === 'issuers' && <th className='right hide-on-mobile'>{t("table.owners-now")} <b className={"link" + (sortConfig.key === 'totalOwners' ? " orange" : "")} onClick={() => sortTable('totalOwners')}>⇅</b></th>}
              {listTab === 'issuers' && <th className='right'>{t("table.floor-now")}</th>}
              {listTab === 'issuers' && <th className='right hide-on-mobile'>{t("table.traded-nfts")} <b className={"link" + (sortConfig.key === 'tradedNfts' ? " orange" : "")} onClick={() => sortTable('tradedNfts')}>⇅</b></th>}
              {listTab === 'brokers' && <th>{t("table.broker")}</th>}
              {listTab === 'currencies' && <th>{t("table.issuers")}</th>}
              <th className='right'>{t("table.sales")} <b className={"link" + (sortConfig.key === 'sales' ? " orange" : "")} onClick={() => sortTable('sales')}>⇅</b></th>
              {listTab === 'issuers' && <th className='right hide-on-mobile'>{t("table.buyers")} <b className={"link" + (sortConfig.key === 'buyers' ? " orange" : "")} onClick={() => sortTable('buyers')}>⇅</b></th>}
              <th className='right'>{t("table.volume")} <b className={"link" + (sortConfig.key === 'amount' ? " orange" : "")} onClick={() => sortTable('amount')}>⇅</b></th>
            </tr>
          </thead>
          <tbody>
            {loading ?
              <tr className='center'><td colSpan="100"><span className="waiting"></span></td></tr>
              :
              <>
                {(!errorMessage && data) ?
                  <>
                    {data.length > 0 &&
                      data.map((volume, i) =>
                        <tr key={i}>
                          <td className='center'>{i + 1}</td>
                          {listTab === 'issuers' && <td>{addressUsernameOrServiceLink(volume, "issuer", { short: true })}</td>}
                          {listTab === 'issuers' && <td className='right hide-on-mobile'>{shortNiceNumber(volume.totalNfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a></td>}
                          {listTab === 'issuers' && <td className='right hide-on-mobile'>{shortNiceNumber(volume.totalOwners, 0)} <a href={'/nft-distribution/' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a></td>}
                          {listTab === 'issuers' && <td className='right'>{showFloor(volume.floorPrice)}</td>}
                          {listTab === 'issuers' && <td className='right hide-on-mobile'>{shortNiceNumber(volume.tradedNfts, 0)}</td>}
                          {listTab === 'brokers' && <td>{addressUsernameOrServiceLink(volume, "broker", { short: true })}</td>}
                          {listTab === 'currencies' && <td className='center'><a href={'/nft-volumes' + urlParams(volume) + '&list=issuers'}><LinkIcon /></a></td>}
                          <td className='right'>
                            {shortNiceNumber(volume.sales, 0)}
                            {listTab === 'brokers' ?
                              <>
                                {rawData?.summary &&
                                  <> ({persentFormat(volume.sales, rawData.summary.all.sales)})</>
                                }
                              </>
                              :
                              <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                            }
                          </td>
                          {listTab === 'issuers' && <td className='right hide-on-mobile'>{shortNiceNumber(volume.buyers, 0)}</td>}
                          <td className='right'>
                            {amountFormat(volume.amount, { tooltip: 'right', maxFractionDigits: 2 })}
                            {listTab === 'brokers' && rawData?.summary &&
                              <> ({persentFormat(volume.amount, rawData.summary.all.volume)})</>
                            }
                          </td>
                        </tr>)
                    }
                  </>
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
                  <span className="waiting"></span>
                  <br />{t("general.loading")}
                </td>
              </tr>
              :
              <>
                {!errorMessage ? data.map((volume, i) =>
                  <tr key={i}>
                    <td style={{ padding: "5px" }} className='center'>
                      <p>{i + 1}</p>
                    </td>
                    <td>
                      <p>
                        {t("table.issuer")}: {addressUsernameOrServiceLink(volume, "issuer")}
                      </p>
                      <p>
                        {t("table.nfts-now")}:{" "}
                        {shortNiceNumber(volume.totalNfts, 0)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a>
                      </p>
                      <p>
                        {t("table.owners-now")}:{" "}
                        {shortNiceNumber(volume.totalOwners, 0)} <a href={'/nft-distribution/' + usernameOrAddress(volume, 'issuer')}><LinkIcon /></a>
                      </p>
                      {showFloor(volume.floorPrice) ?
                        <p>
                          {t("table.floor-now")}: {showFloor(volume.floorPrice)}
                        </p>
                        :
                        ""
                      }
                      <p>
                        {t("table.traded-nfts")}: {shortNiceNumber(volume.tradedNfts, 0)}
                      </p>
                      <p>
                        {t("table.sales")}: {shortNiceNumber(volume.sales, 0)} <a href={'/nft-sales' + urlParams(volume)}> <LinkIcon /></a>
                      </p>
                      <p>
                        {t("table.buyers")}: {shortNiceNumber(volume.buyers, 0)}
                      </p>
                      <p>
                        {t("table.volume")}: {amountFormat(volume.amount, { tooltip: 'right', maxFractionDigits: 2 })}
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
    </div>
  </>;
};
