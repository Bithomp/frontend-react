import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';
import Tabs from '../../components/Tabs';

import { onFailedRequest, setTabParams } from '../../utils';
import { amountFormat, shortNiceNumber, addressUsernameOrServiceLink, usernameOrAddress } from '../../utils/format';

import { ReactComponent as LinkIcon } from "../../assets/images/link.svg";

export default function NftVolumes() {
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [periodTab, setPeriodTab] = useState(searchParams.get("period") || "all");
  const [saleTab, setSaleTab] = useState(searchParams.get("sale") || "all");
  const [listTab, setListTab] = useState(searchParams.get("list") || "issuers");

  const listTabList = [
    { value: 'issuers', label: (t("tabs.issuers")) },
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
    let params = '';
    let apiUrl = 'v2/nft-volumes-issuers';
    if (listTab === 'currencies') {
      apiUrl = 'v2/nft-volumes';
    }
    if (listTab === 'issuers') {
      params = '&currency=xrp';
    }

    const response = await axios(apiUrl + '?period=' + periodTab + '&saleType=' + saleTab + params).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);

    const data = response?.data;
    if (data) {
      if (data.period) {
        if (listTab === 'issuers') {
          if (data.issuers.length > 0) {
            setErrorMessage("");
            setData(data.issuers.sort((a, b) => (parseFloat(a.volumes[0].amount) < parseFloat(b.volumes[0].amount)) ? 1 : -1));
          } else {
            setErrorMessage(t("general.no-data"));
          }
        } else if (listTab === 'currencies') {
          if (data.volumes.length > 0) {
            setErrorMessage("");
            setData(data.volumes.sort((a, b) => (a.sales < b.sales) ? 1 : -1));
          } else {
            setErrorMessage(t("general.no-data"));
          }
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
    setSearchParams(searchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleTab, periodTab, listTab]);

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
      urlPart = urlPart + "&issuer=" + usernameOrAddress(volume, "issuer") + "&currency=xrp";
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
            {listTab === 'currencies' &&
              <>
                <th className='right'>{t("table.sales")}</th>
                <th className='center'>{t("tabs.top-sales")}</th>
                <th className='center'>{t("tabs.latest-sales")}</th>
                <th>{t("table.volume")}</th>
              </>
            }
            {listTab === 'issuers' &&
              <>
                <th>{t("table.issuer")}</th>
                <th className='center'>{t("tabs.top-sales")}</th>
                <th className='center'>{t("tabs.latest-sales")}</th>
                <th>{t("table.sales")}</th>
                <th>{t("table.volume")}</th>
              </>
            }
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='center'><td colSpan="100"><span className="waiting"></span></td></tr>
            :
            <>
              {(!errorMessage && data) ?
                <>
                  {listTab === 'currencies' && data.length > 0 &&
                    data.map((volume, i) =>
                      <tr key={i}>
                        <td className='center'>{i + 1}</td>
                        <td className='right'>{shortNiceNumber(volume.sales, 0)}</td>
                        <td className='center'><a href={'/top-nft-sales' + urlParams(volume)}><LinkIcon /></a></td>
                        <td className='center'><a href={'/latest-nft-sales' + urlParams(volume)}><LinkIcon /></a></td>
                        <td>{amountFormat(volume.amount, { tooltip: 'right' })}</td>
                      </tr>)
                  }
                  {listTab === 'issuers' && data.length > 0 &&
                    data.map((issuer, i) =>
                      <tr key={i}>
                        <td className='center'>{i + 1}</td>
                        <td>{addressUsernameOrServiceLink(issuer, "issuer", "/nft-explorer?issuer=")}</td>
                        <td className='center'>{issuer.volumes && <a href={'/top-nft-sales' + urlParams(issuer)}><LinkIcon /></a>}</td>
                        <td className='center'>{issuer.volumes && <a href={'/latest-nft-sales' + urlParams(issuer)}><LinkIcon /></a>}</td>
                        <td>{issuer.volumes && issuer.volumes[0].sales}</td>
                        <td>{issuer.volumes && amountFormat(issuer.volumes[0].amount, { tooltip: 'right' })}</td>
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
