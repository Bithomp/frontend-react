import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

import { wssServer } from '../utils'
import { niceNumber, ledgerLink } from '../utils/format'

import SEO from '../components/SEO'

let ws = null;

export default function LastLedgerInformation() {
  const { t } = useTranslation()

  const [ledger, setLedger] = useState(null);
  const [update, setUpdate] = useState(true);

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
        },
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
      if (update) {
        connect();
      }
    }
  }

  useEffect(() => {
    connect();
    return () => {
      setLedger(null);
      setUpdate(false);
      if (ws) ws.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let closedAt = '';
  if (ledger) {
    closedAt = ledger.validatedLedger.ledgerTime * 1000;
    closedAt = new Date(closedAt).toLocaleTimeString();
  }

  return <>
    <SEO title={t("menu.last-ledger-information")} />
    <div className="content-text content-center">
      <h1 className="center">{t("menu.last-ledger-information")}</h1>
      <div className="main-box">
        <p>
          {t("last-ledger-information.ledger-hash")}: {ledger?.validatedLedger.hash.toLowerCase()}
        </p>
        <p>
          {t("last-ledger-information.ledger")}: {ledgerLink(ledger?.validatedLedger.ledgerIndex)}
        </p>
        <p>
          {t("last-ledger-information.ledger-closed-at")}: {closedAt}</p>
        <p>
          {t("last-ledger-information.ledger-interval")}: {ledger?.lastClose?.convergeTimeS && ledger?.lastClose.convergeTimeS + ' ' + t("units.seconds-short")}
        </p>
        <p>
          {t("last-ledger-information.transactions")}: {ledger?.validatedLedger.transactionsCount && <Link href={"ledger/" + ledger.validatedLedger.ledgerIndex}>{ledger.validatedLedger.transactionsCount}</Link>}</p>
        <p>
          {t("last-ledger-information.transaction-speed")}: {ledger?.lastClose && (ledger.validatedLedger.transactionsCount / ledger.lastClose.convergeTimeS).toFixed(2)}
        </p>
        <p>
          {t("last-ledger-information.proposers")}: {ledger?.lastClose?.proposers && <Link href="/validators">{ledger.lastClose.proposers}</Link>}
        </p>
        <p>
          {t("last-ledger-information.validation-quorum")}: {ledger?.validationQuorum}
        </p>
        <p>
          {t("last-ledger-information.base-fee")}: {ledger?.validatedLedger.baseFeeXRP && (ledger.validatedLedger.baseFeeXRP * 1).toFixed(6) + ' XRP'}
        </p>
        <p>
          {t("last-ledger-information.base-reserve")}: {ledger?.validatedLedger.reserveBaseXRP && ledger.validatedLedger.reserveBaseXRP + ' XRP'}
        </p>
        <p>
          {t("last-ledger-information.increment-reserve")}: {ledger?.validatedLedger.reserveIncrementXRP && ledger.validatedLedger.reserveIncrementXRP + ' XRP'}
        </p>
        <p>
          {t("last-ledger-information.total-supply") + ": "}
          <span className='no-brake'>
            {niceNumber(ledger?.totalCoins && (ledger.totalCoins / 1000000), 6) + ' XRP'}
          </span>
        </p>
        <p>
          {t("last-ledger-information.total-burned") + ": "}
          <span className='no-brake'>
            {niceNumber(ledger?.totalCoins && (100000000000 - ledger.totalCoins / 1000000), 6) + ' XRP'}
          </span>
        </p>
        <p className="center" style={{ position: "absolute", top: "calc(50% - 72px)", left: "calc(50% - 54px)" }}>
          {!ledger &&
            <>
              <span className="waiting"></span>
              <br />{t("general.loading")}
            </>
          }
        </p>
      </div>
    </div>
  </>
};
