import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

export const getServerSideProps = async ({ query, locale }) => {
  const { period, sale, list, currency, currencyIssuer } = query
  return {
    props: {
      period: period || "all",
      sale: sale || "all",
      list: list || "issuers",
      currency: currency || "xrp",
      currencyIssuer: currencyIssuer || "",
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

import SEO from '../components/SEO'
import Tabs from '../components/Tabs'

import { setTabParams, stripText, isAddressOrUsername, useWidth, removeQueryParams } from '../utils'
import {
  amountFormat,
  shortNiceNumber,
  addressUsernameOrServiceLink,
  usernameOrAddress,
  persentFormat
} from '../utils/format';

import LinkIcon from "../public/images/link.svg"

export default function NftVolumes({ period, sale, list, currency, currencyIssuer }) {
  const { t } = useTranslation()
  const router = useRouter()

  const { isReady } = router

  const windowWidth = useWidth()

  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [periodTab, setPeriodTab] = useState(period);
  const [saleTab, setSaleTab] = useState(sale);
  const [listTab, setListTab] = useState(list);
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

  const controller = new AbortController();

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
    setRawData({});
    setData([]);
    const response = await axios.get(apiUrl + '&period=' + periodTab + '&saleType=' + saleTab, {
      signal: controller.signal
    }).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t("error." + error.message))
        setLoading(false) //keep here for fast tab clickers
      }
    });

    const newdata = response?.data;
    if (newdata) {
      setRawData(newdata);
      setLoading(false); //keep here for fast tab clickers
      if (newdata.period) {
        if (newdata.volumes.length > 0) {
          setErrorMessage("");
          if (listTab === 'issuers' || listTab === 'brokers') {
            if (newdata.volumes[0].amount.value) {
              setData(newdata.volumes.sort((a, b) => (parseFloat(a.amount.value) < parseFloat(b.amount.value)) ? 1 : -1));
            } else {
              let volumes = newdata.volumes;
              if (listTab === 'brokers' && newdata.summary) {
                volumes.push({
                  broker: "no broker",
                  sales: newdata.summary.all.sales - newdata.summary.brokers.sales,
                  amount: newdata.summary.all.volume - newdata.summary.brokers.volume
                });
              }
              setData(volumes.sort((a, b) => (parseFloat(a.amount) < parseFloat(b.amount)) ? 1 : -1));
            }
          } else if (listTab === 'currencies') {
            setData(newdata.volumes.sort((a, b) => (a.sales < b.sales) ? 1 : -1));
          }
        } else {
          setErrorMessage(t("general.no-data"));
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
    setTabParams(router, [
      {
        tabList: listTabList,
        tab: listTab,
        defaultTab: "issuers",
        setTab: setListTab,
        paramName: "list"
      },
      {
        tabList: periodTabList,
        tab: periodTab,
        defaultTab: "all",
        setTab: setPeriodTab,
        paramName: "period"
      },
      {
        tabList: saleTabList,
        tab: saleTab,
        defaultTab: "all",
        setTab: setSaleTab,
        paramName: "sale"
      }
    ])

    setSortConfig({});

    if ((!currency || (currency.toLowerCase() !== 'xrp' && !isAddressOrUsername(currencyIssuer))) || listTab === 'currencies') {
      removeQueryParams(router, ["currency", "currencyIssuer"])
    }
    return () => {
      controller.abort();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, saleTab, periodTab, listTab, currency, currencyIssuer]);

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

    let floor = priceFloor.private?.amount;
    let priceColor = "orange";
    if (open && priv) {
      if (open <= priv) {
        floor = priceFloor.open?.amount;
        priceColor = "";
      }
    } else if (open) {
      floor = priceFloor.open?.amount;
      priceColor = "";
    }

    let output = amountFormat(floor, { tooltip: 'left', maxFractionDigits: 2 });
    if (output && priceColor === 'orange') {
      if (windowWidth > 1000) {
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
    <SEO title={t("nft-volumes.header")} />
    <div className="content-text">
      <h2 className="center">{t("nft-volumes.header") + " "}</h2>
      <div className='tabs-inline'>
        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name="list" />
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      {listTab === 'brokers' &&
        <>
          <div className='flex'>
            <div className="grey-box">
              {t("nft-volumes.brokers.not-a-marketplace-list")}
            </div>
            <div className="grey-box">
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
            </div>
          </div>
          <br />
        </>
      }
      {(listTab !== 'issuers' || (listTab === 'issuers' && windowWidth > 1000)) ?
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
              <tr className='center'>
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
                </td>
              </tr>
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
                          {listTab === 'issuers' &&
                            <td className='right'>
                              {showFloor(volume.floorPrice) &&
                                <>{showFloor(volume.floorPrice)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer') + '&list=onSale'}><LinkIcon /></a></>
                              }
                            </td>
                          }
                          {listTab === 'issuers' && <td className='right hide-on-mobile'>{shortNiceNumber(volume.tradedNfts, 0)}</td>}
                          {listTab === 'brokers' && <td>{addressUsernameOrServiceLink(volume, "broker", { short: true, noBroker: t("nft-volumes.brokers.no-broker") })}</td>}
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
                  <br />
                  <span className="waiting"></span>
                  <br />{t("general.loading")}<br />
                  <br />
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
                          {t("table.floor-now")}: {showFloor(volume.floorPrice)} <a href={'/nft-explorer?issuer=' + usernameOrAddress(volume, 'issuer') + '&list=onSale'}><LinkIcon /></a>
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
