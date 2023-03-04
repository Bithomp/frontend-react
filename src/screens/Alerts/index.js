import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react';
import axios from 'axios';
import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";
import { isMobile } from "react-device-detect";

import './styles.scss';

momentDurationFormatSetup(moment);

function localDateAndTime(timestamp) {
  let params = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
  if (isMobile) {
    params = { month: '2-digit', day: '2-digit',  hour: 'numeric', minute: 'numeric' };
  }
  return new Date(timestamp * 1000).toLocaleString([], params);
}

export default function Alerts() {
  const { t } = useTranslation();
  const [data, setData] = useState({});

  useEffect(() => {
    async function fetchData() {
      /*
      {
        "count": 18,
        "timestamp": 1553244122,
        "alerts": [
          {
            "currency":"eur",
            "change":"+10.07%",
            "timestamp_old":1551052200,
            "timestamp_new":1551118200,
            "rate_old":0.2621,
            "rate_new":0.2885
          },
      */
      const response = await axios('v2/price/xrp/alerts');
      setData(response.data);
    }
    fetchData();
  }, [setData]);

  function duration(seconds) {
    return moment.duration(seconds, "seconds").format("h[" + t("units.hours-short") + "], m[" + t("units.minutes-short") + "]", { trim: "both" });
  }

  return (
    <div className="page-alerts content-center">
      <h1 className='center'>{t("menu.price-alerts")}</h1>
      <p>
        <Trans i18nKey="alerts.text0">
          Get notified when XRP/USD or XRP/BTC market price by <a href="https://www.bitstamp.net/">Bitstamp</a> changes for more than 5% within an hour or more than 10% within a day.
        </Trans>
      </p>
      <p>
        <Trans i18nKey="alerts.text1">
          Follow the Telegram channel: <a href="https://t.me/bithomp">bithomp</a> or the twitter account: <a href="https://twitter.com/bithompAlerts">bithompAlerts</a>.
        </Trans>
      </p>
      <br />
      <h3 className="center">{t("alerts.last-alerts")}</h3>
      <table className="table-large">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("alerts.date-and-time")}</th>
            <th>{t("alerts.currency-pair")}</th>
            <th>{t("alerts.change-duration")}</th>
            <th>{t("alerts.change")}</th>
            <th>{t("alerts.old-rate")}</th>
            <th>{t("alerts.new-rate")}</th>
          </tr>
        </thead>
        <tbody>
          {data?.alerts?.map((alert, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{localDateAndTime(alert.timestamp_new)}</td>
              <td>XRP/{isMobile && " "}{alert.currency.toUpperCase()}</td>
              <td>{duration(alert.timestamp_new - alert.timestamp_old)}</td>
              <td>{alert.change}</td>
              <td>{alert.rate_old}</td>
              <td>{alert.rate_new}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
