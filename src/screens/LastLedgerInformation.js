import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

let ws = null;

export default function LastLedgerInformation({ server }) {
  const { t } = useTranslation();

  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    const wssServer = server.replace("https://", "wss://") + '/wss';
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      console.log('ws connected');
      ws.send(JSON.stringify({ command: "subscribe", streams: ["ledger"], id: 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      setLedger(message);

      /* 
        {
          "type": "ledgerClosed",
          "lastClose": {
            "convergeTimeS": 2,
            "proposers": 6
          },
          "validationQuorum": 5,
          "validatedLedgers": "27887240-28102846",
          "validatedLedger": {
            "type": "ledgerClosed",
            "hash": "7B4C03BC011499AAF8A7605D1D0CC17170B255AAD9488A33DB68589F240C6ED0",
            "baseFeeXRP": "0.00001",
            "reserveBaseXRP": "10",
            "reserveIncrementXRP": "2",
            "ledgerTime": 706913181,
            "ledgerIndex": 28102846,
            "transactionsCount": 9
          }
        } 
      */
    }

    ws.onclose = () => {
      console.log('ws disconnected');
    }
  }, [server]);

  return (
    <div className="content-text">
      <h1 className="center">{t("menu.last-ledger-information")}</h1>
      {ledger &&
        <>
          <p>Ledger hash: {ledger.validatedLedger.hash}</p>
          <p>Ledger #{ledger.validatedLedger.ledgerIndex}</p>
          <p>Ledger closed at: {ledger.validatedLedger.ledgerTime}</p>
          <p>Transactions: {ledger.validatedLedger.transactionsCount}</p>
          <p>Proposers: {ledger.lastClose.proposers}</p>
          <p>Validation Quorum: {ledger.validationQuorum}</p>

          <p>Base fee: {ledger.validatedLedger.baseFeeXRP} XRP</p>
          <p>Base reserve: {ledger.validatedLedger.reserveBaseXRP} XRP</p>
          <p>Increment reserve: {ledger.validatedLedger.reserveIncrementXRP} XRP</p>
        </>
      }
    </div>
  );
};
