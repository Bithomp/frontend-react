import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { wssServer, numberWithSpaces, xls20Enabled } from '../../utils';

let ws = null;

export default function Statistics() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();

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
        usernames: 1,
        accounts: {
          created: 1
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

  let closedAt = 'xx:xx:xx';
  let ledgerIndex = 'xxxxxxxx';
  let txPerSecond = 'x.xx';
  let txCount = 'x';
  let quorum = 'x';
  let proposers = 'x';
  let createdAccounts = 'xxxx';
  let registeredUsernames = 'xx';
  let nft = {
    created: 'xxx',
    burned: 'xxx',
    owners: 'xxx',
    issuers: 'xxx',
    transfers: 'xxx',
    forSaleWithoutDestination: 'xxx'
  };

  if (data) {
    const { validatedLedger, lastClose, validationQuorum, accounts, usernames, nftokens } = data;
    closedAt = validatedLedger.ledgerTime * 1000;
    closedAt = new Date(closedAt).toLocaleTimeString();
    ledgerIndex = validatedLedger.ledgerIndex;
    txCount = validatedLedger.transactionsCount;
    quorum = validationQuorum;
    if (lastClose) {
      txPerSecond = (validatedLedger.transactionsCount / lastClose.convergeTimeS).toFixed(2);
      proposers = lastClose.proposers;
    }
    createdAccounts = numberWithSpaces(accounts.created);
    registeredUsernames = numberWithSpaces(usernames);
    if (nftokens) {
      nft = nftokens;
    }
  }

  return <>
    <div className='statistics-block'>
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
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.accounts")}</div>
        <div>{createdAccounts}</div>
      </div>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.usernames")}</div>
        <div>{registeredUsernames}</div>
      </div>
    </div>
    {xls20Enabled && <div className='statistics-block'>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.nft.created")}</div>
        <div>{numberWithSpaces(nft.created)}</div>
      </div>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.nft.burned")}</div>
        <div>{numberWithSpaces(nft.burned)}</div>
      </div>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.nft.issuers")}</div>
        <div>{numberWithSpaces(nft.issuers)}</div>
      </div>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.nft.owners")}</div>
        <div>{numberWithSpaces(nft.owners)} </div>
      </div>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.nft.transfers")}</div>
        <div>{numberWithSpaces(nft.transfers)}</div>
      </div>
      <div className='stat-piece'>
        <div className='stat-piece-header'>{t("home.stat.nft.for-sale")}</div>
        <div>{numberWithSpaces(nft.forSaleWithoutDestination)}</div>
      </div>
    </div>}
  </>;
}