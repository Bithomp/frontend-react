import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

import { numberWithSpaces, wssServer } from '../utils';

let ws = null;

export default function LastLedgerInformation() {
  const { t } = useTranslation();

  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');

  const connect = () => {
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "subscribe", streams: ["nftokens"], id: 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      setData(message);
      setLastUpdate(new Date().toLocaleTimeString());
      /*
        {
          "type": "NFTokens",
          "validatedLedger": {
            "age": 3,
            "hash": "814430F058D4BBFB3677E6536EA61D0FA8125E18351FE47C467E09322F8BF5F5",
            "ledgerTime": 1656405521,
            "ledgerIndex": 3384852
          },
          "allTime": {
            "created": 139470,
            "burned": 9298,
            "burnable": 21054,
            "onlyXRP": 12607,
            "transferable": 112271,
            "owners": 12396,
            "issuers": 14186,
            "transfers": 18552,
            "forSale": 5750,
            "forSaleWithoutDestination": 3829,
            "forSaleWithDestination": 1928
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
      setData(null);
      if (ws) ws.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nft = data?.allTime;

  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.nft-statistics")}</h1>
      <div className="main-box">
        <p>
          {t("nft-statistics.updated")}: {lastUpdate}
        </p>
        <p>
          {t("nft-statistics.ledger-index")}: {data?.validatedLedger.ledgerIndex && '#' + data.validatedLedger.ledgerIndex}
        </p>
        <p>
          {t("nft-statistics.created")}: {numberWithSpaces(nft?.created)}
        </p>
        <p>
          {t("nft-statistics.burned")}: {numberWithSpaces(nft?.burned)}
        </p>
        <p>
          {t("nft-statistics.exist")}: {nft && numberWithSpaces(nft.created - nft.burned)}
        </p>
        <p>
          {t("nft-statistics.owners")}: {numberWithSpaces(nft?.owners)}
        </p>
        <p>
          {t("nft-statistics.issuers")}: {numberWithSpaces(nft?.issuers)}
        </p>
        <p>
          {t("nft-statistics.transfers")}: {numberWithSpaces(nft?.transfers)}
        </p>
        <p>
          {t("nft-statistics.for-sale")}: {numberWithSpaces(nft?.forSale)}
        </p>
        <p>
          {t("nft-statistics.for-sale-without-destination")}: {numberWithSpaces(nft?.forSaleWithoutDestination)}
        </p>
        <p>
          {t("nft-statistics.for-sale-with-destination")}: {numberWithSpaces(nft?.forSaleWithDestination)}
        </p>
        <p>
          {t("nft-statistics.burnable")}: {numberWithSpaces(nft?.burnable)}
        </p>
        <p>
          {t("nft-statistics.only-xrp")}: {numberWithSpaces(nft?.onlyXRP)}
        </p>
        <p>
          {t("nft-statistics.transferable")}: {numberWithSpaces(nft?.transferable)}
        </p>
        <p className="center" style={{ position: "absolute", top: "calc(50% - 72px)", left: "calc(50% - 54px)" }}>
          {!data && <span className="waiting"></span>}
        </p>
      </div>
    </div>
  );
};
