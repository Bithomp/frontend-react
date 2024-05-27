import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react';
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { getIsSsrMobile } from '../utils/mobile'

export const getServerSideProps = async ({ locale }) => {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

import SEO from '../components/SEO'

import { wssServer } from '../utils'
import { niceNumber, fullDateAndTime } from '../utils/format'
import { LedgerLink } from '../utils/links'

let ws = null;

export default function NftStatistics() {
  const { t } = useTranslation()

  const [data, setData] = useState(null)

  const connect = () => {
    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: "subscribe", streams: ["nftokens"], id: 1 }));
    }

    ws.onmessage = evt => {
      const message = JSON.parse(evt.data);
      setData(message);
      /*
        {
          "type": "NFTokens",
          "crawler": {
            "ledgerIndex": 7025469,
            "ledgerTime": 1656405521,
          },
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
  const crawlerIndex = data?.crawler?.ledgerIndex;
  const currentLedgerIndex = data?.validatedLedger.ledgerIndex;
  const crawlerTime = data?.crawler?.ledgerTime && fullDateAndTime(data.crawler.ledgerTime);
  const currentLedgerTime = data?.validatedLedger.ledgerTime && fullDateAndTime(data.validatedLedger.ledgerTime);

  let lag = false;
  if (crawlerIndex && currentLedgerIndex) {
    //check if ledger index gap is more than 2
    if (currentLedgerIndex - crawlerIndex > 2) {
      //crawler is lagging bihind
      lag = currentLedgerIndex - crawlerIndex;
    }
  }

  return (
    <div className="content-text content-center">
      <SEO title={t("nft-statistics.header")} />
      <h1 className="center">{t("nft-statistics.header")}</h1>
      <div className="main-box">
        {lag ?
          <p className='orange'>
            <Trans i18nKey="nft-statistics.text0">
              The informations is a bit outdated, we need to catch up with <b>{{ lag }}</b> ledgers.
              <br />
              The data is provided for the ledger #{{ crawlerIndex }}, ({{ crawlerTime }}).
              The last validated ledger is #{{ currentLedgerIndex }}, ({{ currentLedgerTime }}).
            </Trans>
          </p>
          :
          <>
            <p>
              {t("nft-statistics.updated")}: {crawlerTime}
            </p>
            <p>
              {t("nft-statistics.ledger-index")}: <LedgerLink version={crawlerIndex} />
            </p>
          </>
        }
        <p>
          {t("nft-statistics.created")}: {niceNumber(nft?.created)}
        </p>
        <p>
          {t("nft-statistics.burned")}: {niceNumber(nft?.burned)}
        </p>
        <p>
          {t("nft-statistics.exist")}: {nft && niceNumber(nft.created - nft.burned)}
        </p>
        <p>
          {t("nft-statistics.owners")}: <Link href='/nft-distribution'>{niceNumber(nft?.owners)}</Link>
        </p>
        <p>
          {t("nft-statistics.issuers")}: <Link href='/nft-volumes'>{niceNumber(nft?.issuers)}</Link>
        </p>
        <p>
          {t("nft-statistics.transfers")}: {niceNumber(nft?.transfers)}
        </p>
        <p>
          {t("nft-statistics.for-sale")}: {niceNumber(nft?.forSale)}
        </p>
        <p>
          {t("nft-statistics.for-sale-without-destination")}: {niceNumber(nft?.forSaleWithoutDestination)}
        </p>
        <p>
          {t("nft-statistics.for-sale-with-destination")}: {niceNumber(nft?.forSaleWithDestination)}
        </p>
        <p>
          {t("nft-statistics.burnable")}: {niceNumber(nft?.burnable)}
        </p>
        <p>
          {t("nft-statistics.only-xrp")}: {niceNumber(nft?.onlyXRP)}
        </p>
        <p>
          {t("nft-statistics.transferable")}: {niceNumber(nft?.transferable)}
        </p>
        <p className="center" style={{ position: "absolute", top: "calc(50% - 72px)", left: "calc(50% - 54px)" }}>
          {!data &&
            <>
              <span className="waiting"></span>
              <br />{t("general.loading")}
            </>
          }
        </p>
      </div>
    </div>
  );
};
