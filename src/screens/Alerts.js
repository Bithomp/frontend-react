import { useTranslation, Trans } from 'react-i18next';
import { useState, useEffect } from 'react';
import axios from 'axios';
import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";

momentDurationFormatSetup(moment);

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

  return (
    <div className="content-text">
      <h1>{t("menu.price-alerts")}</h1>

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

      <p>{t("alerts.last-alerts")}</p>

      <table className="center">
        <thead>
          <tr>
            <th>#</th>
            <th role="button">Date &amp; time</th>
            <th role="button">Currency pair</th>
            <th role="button">Change duration</th>
            <th role="button">Change</th>
            <th role="button">Old rate</th>
            <th role="button">New rate</th>
          </tr>
        </thead>
        <tbody>
          {data?.alerts?.map((alert, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{new Date(alert.timestamp_new * 1000).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</td>
              <td>XRP/{alert.currency.toUpperCase()}</td>
              <td>{moment.duration(alert.timestamp_new - alert.timestamp_old, "seconds").format("d [days], h [hours], m [minutes]", { trim: "both" })}</td>
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
