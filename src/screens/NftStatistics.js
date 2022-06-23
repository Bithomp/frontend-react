import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

import { numberWithSpaces, wssServer } from '../utils/utils';

let ws = null;

export default function LastLedgerInformation() {
  const { t } = useTranslation();

  const [data, setData] = useState(null);

  const connect = () => {
    ws = new WebSocket(wssServer);

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "subscribe", streams: ["statistics"], id: 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      setData(message);

      /* 
      {
        "nftokens":{
          "created": 138633,
          "burned": 9182,
          "burnable": 21042,
          "onlyXRP": 12602,
          "transferable": 111820,
          "owners": 11976,
          "issuers": 13671,
          "transfers": 16720,
          "forSale": 4377,
          "forSaleWithoutDestination": 2564,
          "forSaleWithDestination": 1817
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

  const nft = data?.nftokens;

  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.nft-statistics")}</h1>
      <div className="bordered brake" style={{ padding: "0 20px", position: "relative" }}>
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
