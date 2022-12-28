import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';
import Tabs from '../../components/Tabs';

import { onFailedRequest, setTabParams, stripText, isAddressOrUsername } from '../../utils';
import { amountFormat, shortNiceNumber, addressUsernameOrServiceLink, usernameOrAddress } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftVolumes() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [periodTab, setPeriodTab] = useState(searchParams.get("period") || "all");
  const [saleTab, setSaleTab] = useState(searchParams.get("sale") || "all");
  const [listTab, setListTab] = useState(searchParams.get("list") || "issuers");
  const [currency] = useState(searchParams.get("currency"));
  const [currencyIssuer] = useState(searchParams.get("currencyIssuer"));

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
      if (data.period) {
        if (data.volumes.length > 0) {
          setErrorMessage("");
          if (listTab === 'issuers' || listTab === 'brokers') {
            if (data.volumes[0].amount.value) {
              setData(data.volumes.sort((a, b) => (parseFloat(a.amount.value) < parseFloat(b.amount.value)) ? 1 : -1));
            } else {
              setData(data.volumes.sort((a, b) => (parseFloat(a.amount) < parseFloat(b.amount)) ? 1 : -1));
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
      "issuers": [
        {
          "issuer": "r3BWpaFk3rtWhhs2Q5FwFqLVdTPnfVUJLr",
          "issuerDetails": {
            "username": null,
            "service": null
          },
          "volumes": [
            {
              "amount": "1753767000",
              "sales": 7
            },
            {
              "amount": {
                "currency": "434C554200000000000000000000000000000000",
                "issuer": "r9pAKbAMx3wpMAS9XvvDzLYppokfKWTSq4",
                "value": "2"
              },
              "sales": 2
            }
          ]
        }
  */

  useEffect(() => {
    checkApi();
    setTabParams(listTabList, listTab, "issuers", setListTab, searchParams, "list");
    setTabParams(periodTabList, periodTab, "all", setPeriodTab, searchParams, "period");
    setTabParams(saleTabList, saleTab, "all", setSaleTab, searchParams, "sale");

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

  return <>
    <SEO title={t("menu.nft-volumes")} />
    <div className="content-text">
      <h2 className="center">{t("menu.nft-volumes") + " "}</h2>
      <div className='tabs-inline'>
        <Tabs tabList={listTabList} tab={listTab} setTab={setListTab} name="list" />
        <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
        <Tabs tabList={saleTabList} tab={saleTab} setTab={setSaleTab} name="sale" />
      </div>
      <table className="table-large shrink">
        <thead>
          <tr>
            <th className='center'>{t("table.index")}</th>
            {listTab === 'issuers' && <th>{t("table.issuer")}</th>}
            {listTab === 'brokers' && <th>{t("table.broker")}</th>}
            <th className='right'>{t("table.sales")}</th>
            {listTab === 'currencies' && <th>{t("table.issuers")}</th>}
            {listTab !== 'brokers' && <th className='center'>{t("tabs.top-sales")}</th>}
            {listTab !== 'brokers' && <th className='center hide-on-mobile'>{t("tabs.latest-sales")}</th>}
            <th>{t("table.volume")}</th>
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
                        {listTab === 'issuers' && <td>{addressUsernameOrServiceLink(volume, "issuer", { url: "/nft-explorer?issuer=", short: true })}</td>}
                        {listTab === 'brokers' && <td>{addressUsernameOrServiceLink(volume, "broker", { short: true })}</td>}
                        <td className='right'>{shortNiceNumber(volume.sales, 0)}</td>
                        {listTab === 'currencies' && <td className='center'><a href={'/nft-volumes' + urlParams(volume) + '&list=issuers'}><LinkIcon /></a></td>}
                        {listTab !== 'brokers' && <td className='center'><a href={'/top-nft-sales' + urlParams(volume)}><LinkIcon /></a></td>}
                        {listTab !== 'brokers' && <td className='center hide-on-mobile'><a href={'/latest-nft-sales' + urlParams(volume)}><LinkIcon /></a></td>}
                        <td>{amountFormat(volume.amount, { tooltip: 'right' })}</td>
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
    </div>
  </>;
};
