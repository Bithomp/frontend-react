import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { wssServer, devNet } from '../../utils';
import { shortNiceNumber, timeFormat } from '../../utils/format';

let ws = null;

export default function Whales({ currency }) {
  const [data, setData] = useState(null);
  const [oldData, setOldData] = useState(null);
  const [difference, setDifference] = useState(null);
  const { t } = useTranslation();

  const checkStatApi = async () => {
    //?currency=true&service=true
    const response = await axios('v2/transactions/whale');
    const data = response.data;
    if (data) {
      setData(data);
    }
  }

  const connect = () => {
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      //{ command: "subscribe", streams: ["whale_transactions"], currency: true, service: true, id: 1 }
      ws.send(JSON.stringify({ command: "subscribe", streams: ["whale_transactions"], id: 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      setData(message.transactions);
    }

    ws.onclose = () => {
      connect();
    }
  }

  useEffect(() => {
    if (oldData && data) {
      const change = data.filter(({ hash: id1 }) => !oldData.some(({ hash: id2 }) => id2 === id1));
      setDifference(change);
    }
    setOldData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    checkStatApi();
    connect();
    return () => {
      setData(null);
      setDifference(null);
      if (ws) ws.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
     {
      "hash":"59850C23F37E86A675F99C0DF29C3468C6F5BB53BDB7B9C73E6AB012DCE9D402",
      "timestamp":1663143343,
      "amount":"1000",
      "amountXRP":1000,
      "amountFiats":{
        "aed":"1240",
        "ars":"47980"
      },
      "counterparty":null,
      "currency": {
        "type": "hex",
        "currencyCode": "53616E6374756D00000000000000000000000000",
        "currency": "Sanctum"
      },
      "sourceAddress":"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
      "destinationAddress":"rKb1QJ7dxZ3piULkWbpmTg8UK9eARKFLaY"
     }
  */

  if (!data?.length) {
    return "";
  }

  return <>
    <h2 className="center">{t("home.whales.header")}</h2>
    <div className='whale-transactions-block'>
      {data.map(tx => (
        <div key={tx.hash} className={"tx-row" + (difference?.includes(tx) ? " just-added" : "")}>
          <span className='tx-time'>{timeFormat(tx.timestamp)}</span>
          <span className='tx-link'><a href={'/explorer/' + tx.hash}>{tx.hash.toLowerCase()}</a></span>
          <span className='tx-amount'>{shortNiceNumber(tx.amount, 0, 1)} {tx.currency}</span>
          <span className='tx-amount-fiat'>{devNet ? t("home.whales.no-value") : (tx.amountFiats ? shortNiceNumber(tx.amountFiats[currency?.toLowerCase()], 0, 1, currency) : "")}</span>
        </div>
      ))}
    </div>
  </>;
}