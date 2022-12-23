import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import axios from 'axios';

import SEO from '../../components/SEO';
import Tabs from '../../components/Tabs';

import { onFailedRequest } from '../../utils';
import { amountFormat } from '../../utils/format';

export default function NftVolumes() {
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [periodTab, setPeriodTab] = useState(searchParams.get("period") || "all");

  const periodTabList = [
    { value: 'all', label: t("tabs.all-time") },
    //{ value: 'year', label: t("tabs.year") },
    { value: 'month', label: t("tabs.month") },
    { value: 'week', label: t("tabs.week") },
    { value: 'day', label: t("tabs.day") }
  ];

  const checkApi = async () => {
    let periodUrlPart = '';
    if (periodTab) {
      periodUrlPart = '?period=' + periodTab;
    }

    const response = await axios('v2/nft-volumes' + periodUrlPart).catch(error => {
      onFailedRequest(error, setErrorMessage);
    });
    setLoading(false);

    const data = response?.data;
    if (data) {
      if (data.period) {
        if (data.volumes.length > 0) {
          setErrorMessage("");
          setData(data.volumes.sort((a, b) => (a.sales < b.sales) ? 1 : -1));
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
  */

  useEffect(() => {
    checkApi();

    const existPeriod = periodTabList.some(t => t.value === periodTab);
    if (!existPeriod) {
      setPeriodTab("all");
      searchParams.delete("period");
    } else if (periodTab === 'all') {
      searchParams.delete("period");
    } else {
      searchParams.set("period", periodTab);
    }
    setSearchParams(searchParams);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodTab]);

  const currencyPeriodUrlPart = (amount) => {
    if (amount.currency) {
      return "?currency=" + amount.currency + '&currencyIssuer=' + amount.issuer + (periodTab ? ("&period=" + periodTab) : "");
    }
    let urlPart = '';
    if (periodTab) {
      urlPart = '?period=' + periodTab;
    }
    return urlPart;
  }

  return <>
    <SEO title={t("menu.nft-volumes")} />
    <div className="content-text">
      <h2 className="center">{t("menu.nft-volumes") + " "}</h2>
      <Tabs tabList={periodTabList} tab={periodTab} setTab={setPeriodTab} name="period" />
      <table className="table-large shrink">
        <thead>
          <tr>
            <th>{t("table.index")}</th>
            <th>{t("table.sales")}</th>
            <th>{t("table.volume")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ?
            <tr className='center'><td colSpan="100"><span className="waiting"></span></td></tr>
            :
            <>
              {(!errorMessage && data) ? data.map((volume, i) =>
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td><a href={'/top-nft-sales' + currencyPeriodUrlPart(volume.amount)}>{volume.sales}</a></td>
                  <td>{amountFormat(volume.amount, { tooltip: 'right' })}</td>
                </tr>)
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
