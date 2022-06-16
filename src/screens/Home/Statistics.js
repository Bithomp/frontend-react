import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { wssServer } from '../../utils/utils';

let ws = null;

export default function Statistics() {
  const [ledger, setLedger] = useState(null);
  const { t } = useTranslation();

  const connect = () => {
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "subscribe", streams: ["ledger"], id: 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      setLedger(message);

      /* 
      {
        "type": "ledgerClosed", // ledger ws
        "lastClose": { 
          "convergeTimeS": 2, // server info
          "proposers": 6 // server info
        },
        "validationQuorum": 5, // server info
        "totalCoins": "99999573822861715", // ledger info
        "validatedLedgers": "27887240-28154648", // ledger ws
        "validatedLedger": {
          "age": 2, // ledger ws (current time - ledgerTime)
          "hash": "CEFB234BABF6592B973D108F4C4283711878425F1A4ABF3B5F9703B1B703F908", // ledger ws
          "baseFeeXRP": "0.00001", // ledger ws
          "reserveBaseXRP": "10", // ledger ws
          "reserveIncrementXRP": "2", // ledger ws
          "ledgerTime": 1653770111, // ledger ws
          "ledgerIndex": 28154648, // ledger ws
          "transactionsCount": 7 // ledger ws
        }
      }
      */
    }

    ws.onclose = () => {
      connect();
    }
  }

  useEffect(() => {
    connect();
    return () => {
      if (ws) ws.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let closedAt = 'xx:xx:xx';
  let ledgerIndex = 'xxxxxxxx';
  let txPerSecond = 'x.xx';
  let txCount = 'x';
  let quorum = 'x';
  let proposers = "x";

  if (ledger) {
    closedAt = ledger.validatedLedger.ledgerTime * 1000;
    closedAt = new Date(closedAt).toLocaleTimeString();
    ledgerIndex = ledger.validatedLedger.ledgerIndex;
    txPerSecond = (ledger.validatedLedger.transactionsCount / ledger.lastClose.convergeTimeS).toFixed(2);
    txCount = ledger.validatedLedger.transactionsCount;
    quorum = ledger.validationQuorum;
    proposers = ledger.lastClose.proposers;
  }

  return <div className='statistics-block'>
    <div className='stat-piece'>
      <div className='stat-piece-header'>{t("home.stat.ledger-index")}</div>
      <div>#{ledgerIndex}</div>
    </div>
    <div className='stat-piece'>
      <div className='stat-piece-header'>{t("home.stat.close-time")}</div>
      <div>{closedAt}</div>
    </div>
    <div className='stat-piece'>
      <div className='stat-piece-header'>{t("home.stat.transactions")}</div>
      <div>{txCount} ({txPerSecond} {t("home.stat.txs-per-sec")})</div>
    </div>
    <div className='stat-piece'>
      <div className='stat-piece-header'>{t("home.stat.quorum")}</div>
      <div>{quorum} ({proposers} {t("home.stat.proposers")})</div>
    </div>
    {/* 
    <div className='stat-piece'>
      <div className='stat-piece-header'>{t("home.stat.accounts")}</div>
      <div>xxxxx</div>
    </div>
    <div className='stat-piece'>
      <div className='stat-piece-header'>{t("home.stat.usernames")}</div>
      <div>xxxxx</div>
    </div>
    */}
  </div>;
}