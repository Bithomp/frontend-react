import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

let ws = null;

export default function LastLedgerInformation({ server }) {
  const { t } = useTranslation();

  const [ledger, setLedger] = useState(null);
  const [connected, setConnected] = useState(false);

  const connect = () => {
    const wssServer = server.replace("https://", "wss://") + '/wss';
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      setConnected(true);
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
      setConnected(false);
    }
  }

  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = () => {
    connect();
  }

  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.last-ledger-information")}</h1>
      <div className="bordered brake" style={{ padding: "0 20px", position: "relative" }}>
        <p>{t("last-ledger-information.ledger-hash")}: {ledger?.validatedLedger.hash.toLowerCase()}</p>
        <p>{t("last-ledger-information.ledger")}: {ledger?.validatedLedger.ledgerIndex && '#' + ledger.validatedLedger.ledgerIndex}</p>
        <p>{t("last-ledger-information.ledger-closed-at")}: {ledger?.validatedLedger.ledgerTime}</p>
        <p>{t("last-ledger-information.ledger-interval")}: {ledger?.lastClose.convergeTimeS && ledger?.lastClose.convergeTimeS + ' ' + t("units.seconds-short")}</p>
        <p>{t("last-ledger-information.transactions")}: {ledger?.validatedLedger.transactionsCount}</p>
        <p>{t("last-ledger-information.transaction-speed")}: {ledger && (ledger.validatedLedger.transactionsCount / ledger.lastClose.convergeTimeS).toFixed(2)}</p>
        <p>{t("last-ledger-information.proposers")}: {ledger?.lastClose.proposers}</p>
        <p>{t("last-ledger-information.validation-quorum")}: {ledger?.validationQuorum}</p>
        <p>{t("last-ledger-information.base-fee")}: {ledger?.validatedLedger.baseFeeXRP && (ledger.validatedLedger.baseFeeXRP * 1).toFixed(6) + ' XRP'}</p>
        <p>{t("last-ledger-information.base-reserve")}: {ledger?.validatedLedger.reserveBaseXRP && ledger.validatedLedger.reserveBaseXRP + ' XRP'}</p>
        <p>{t("last-ledger-information.increment-reserve")}: {ledger?.validatedLedger.reserveIncrementXRP && ledger.validatedLedger.reserveIncrementXRP + ' XRP'}</p>
        <p>{t("last-ledger-information.total-supply")}: {ledger?.totalCoins && (ledger.totalCoins / 1000000).toFixed(6) + ' XRP'}</p>
        <p>{t("last-ledger-information.total-burned")}: {ledger?.totalCoins && (100000000000 - ledger.totalCoins / 1000000).toFixed(6) + ' XRP'}</p>
        <p className="center" style={{ position: "absolute", top: "calc(50% - 72px)", left: "calc(50% - 54px)" }}>
          {!ledger && <span className="waiting"></span>}
        </p>
      </div>

      {!connected && ledger &&
        <p className="center">
          <input type="button" value={t("last-ledger-information.reconnect")} className="button-action" onClick={onConnect} />
        </p>
      }
    </div>
  );
};
