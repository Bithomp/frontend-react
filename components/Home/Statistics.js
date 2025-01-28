import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { ledgerName, xahauNetwork } from '../../utils'
import { amountFormat, niceNumber } from '../../utils/format'
import { LedgerLink } from '../../utils/links'

export default function Statistics({ data, setData }) {
  const { t } = useTranslation()

  const checkStatApi = async () => {
    const response = await axios('v2/statistics')
    const data = response.data
    if (data) {
      setData(data)
    }
  }

  /* 
      {
        "lastClose": {
          "convergeTimeS": 3.002,
          "proposers": 34
        },
        "validatedLedger": {
          "age": 1, // ledger ws (current time - ledgerTime)
          "hash": "E40A884142D9B2345FBBD873B258243380AF9FC478D1482F1CE6DD127C051B7E",
          "baseFeeXRP": "0.00001",
          "reserveBaseXRP": "1",
          "reserveIncrementXRP": "0.2",
          "ledgerIndex": 93302604,
          "ledgerTime": 1736272900,
          "transactionsCount": 158
        },
        "validationQuorum": 28,
        "validatedLedgers": "32570-93302604",
        "totalCoins": "99986665562376584",
        "accounts": {
          "crawler": {
            "ledgerIndex": 93302577,
            "ledgerTime": 1736272791
          },
          "created": 6411212,
          "blackholed": 33230,
          "deleted": 548331,
          "activeLast24h": 33812
        },
        "amms": {
          "crawler": {
            "ledgerIndex": 93302577,
            "ledgerTime": 1736272791
          },
          "existing": 14168
        },
        "escrows": {
          "crawler": {
            "ledgerIndex": 93302577,
            "ledgerTime": 1736272791
          },
          "existing": 10855
        },
        "nftokens": {
          "crawler": {
            "ledgerIndex": 93302603,
            "ledgerTime": 1736272892
          },
          "created": 7480601,
          "burned": 1962594,
          "burnable": 1135168,
          "onlyXRP": 124255,
          "transferable": 5497202,
          "owners": 51749,
          "issuers": 7790,
          "transfers": 2310166,
          "forSale": 166868,
          "forSaleWithoutDestination": 38909,
          "forSaleWithDestination": 128897
        },
        "uritokens": null,
        "transactions": {
          "crawler": {
            "ledgerIndex": 93302586,
            "ledgerTime": 1736272830
          },
          "last24h": {
            "count": 2339404,
            "success": 1922896,
            "successPayments": 959349,
            "hooksEmitted": 0,
            "hooksEmittedSuccess": 0,
            "accounts": 33824,
            "emitTxs": 0,
            "emitHooks": 0,
            "fee": "4593995472"
          }
        },
        "usernames": 133554,
        "nodes": {
          "crawler": {
            "time": 1736272720
          },
          "total": 817
        }
      }
    */

  useEffect(() => {
    checkStatApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let closedAt = 'xx:xx:xx'
  let ledgerIndex = 'xxxxxxxx'
  let txPerSecond = 'x.xx'
  let txCount = 'x'
  let quorum = 'x'
  let proposers = 'x'
  let createdAccounts = 'xxxx'
  let registeredUsernames = 'xx'
  let nft = {
    created: 'xxx',
    burned: 'xxx',
    owners: 'xxx',
    issuers: 'xxx',
    transfers: 'xxx',
    forSale: 'xxx'
  }
  let escrowsCount = 'xxx'
  let ammsCount = 'xxx'
  let nodesCount = 'xxx'
  let transactionsLast24h = {
    activeAccounts: 'xxx',
    transactions: 'xxx',
    payments: 'xxx',
    fees: 'xxx'
  }

  let hooksLast24h = {
    emitHooks: 'xxx',
    emitTxs: 'xxx',
    hooksEmitted: 'xxx',
    hooksEmittedFee: 'xxx'
  }

  if (data) {
    const {
      validatedLedger,
      lastClose,
      validationQuorum,
      accounts,
      usernames,
      nftokens,
      uritokens,
      escrows,
      amms,
      nodes,
      transactions
    } = data
    closedAt = validatedLedger?.ledgerTime * 1000
    closedAt = new Date(closedAt).toLocaleTimeString()
    ledgerIndex = validatedLedger?.ledgerIndex
    txCount = validatedLedger?.transactionsCount
    quorum = validationQuorum
    if (lastClose) {
      txPerSecond = (validatedLedger?.transactionsCount / lastClose.convergeTimeS).toFixed(2)
      proposers = lastClose.proposers
    } else {
      txPerSecond = (validatedLedger?.transactionsCount / 3).toFixed(2)
    }
    if (accounts) {
      createdAccounts = niceNumber(accounts.created - accounts.deleted)
    }
    registeredUsernames = niceNumber(usernames)
    if (nftokens) {
      nft = nftokens
    } else if (uritokens) {
      nft = uritokens
    }
    escrowsCount = niceNumber(escrows?.existing)
    ammsCount = niceNumber(amms?.existing)
    nodesCount = niceNumber(nodes?.total)

    if (transactions?.last24h) {
      transactionsLast24h.transactions = niceNumber(transactions.last24h.success)
      transactionsLast24h.payments = niceNumber(transactions.last24h.successPayments)
      transactionsLast24h.fees = amountFormat(transactions.last24h.fee)
      transactionsLast24h.activeAccounts = niceNumber(transactions.last24h.accounts)

      /*
        "count": 2339404, //total txs
        "success": 1922896, // total success txs
        "successPayments": 959349, //  total success payments txs
        "accounts": 33824, //uniq list of senders, anothe way to count used accounts
        "fee": "4593995472" // fee paid for all txs

        "hooksEmitted": 0, // txs created by hooks 
        "hooksEmittedSuccess": 0, //successed executed txs created by hooks 
        "emitTxs": 0, //uniq count of txs executed hooks
        "emitHooks": 0, //uniq count of executed hooks

        hooksEmittedFee - fee paid for txs executed by hooks
      */
    }

    if (xahauNetwork) {
      hooksLast24h = {
        emitHooks: niceNumber(transactions.last24h.emitHooks),
        emitTxs: niceNumber(transactions.last24h.emitTxs),
        hooksEmitted: niceNumber(transactions.last24h.hooksEmitted),
        hooksEmittedFee: amountFormat(transactions.last24h.hooksEmittedFee)
      }
    }
  }

  return (
    <>
      <h2 className="center landing-h2">{t('home.stat.header', { ledgerName })}</h2>

      <div className="statistics-block">
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.accountsActiveLast24h')}</div>
          <div>{transactionsLast24h.activeAccounts}</div>
        </div>

        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.transactionsLast24h')}</div>
          <div>{transactionsLast24h.transactions}</div>
        </div>

        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.paymentsLast24h')}</div>
          <div>{transactionsLast24h.payments}</div>
        </div>

        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.feesLast24h')}</div>
          <div>{transactionsLast24h.fees}</div>
        </div>
      </div>

      {xahauNetwork && (
        <div className="statistics-block">
          <div className="stat-piece">
            <div className="stat-piece-header">Hook's parent txs (24h)</div>
            <div>{hooksLast24h.emitTxs}</div>
          </div>
          <div className="stat-piece">
            <div className="stat-piece-header">Hooks emitting txs (24h)</div>
            <div>{hooksLast24h.emitHooks}</div>
          </div>
          <div className="stat-piece">
            <div className="stat-piece-header">Txs emitted by Hooks (24h)</div>
            <div>{hooksLast24h.hooksEmitted}</div>
          </div>
          <div className="stat-piece">
            <div className="stat-piece-header">Fees paid by Hooks (24h)</div>
            <div>{hooksLast24h.hooksEmittedFee}</div>
          </div>
        </div>
      )}

      <div className="statistics-block">
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.ledger-index')}</div>
          <div>
            <LedgerLink version={ledgerIndex} />
          </div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.close-time')}</div>
          <div>{closedAt}</div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.transactions')}</div>
          <div>
            {txCount ? <LedgerLink version={ledgerIndex} text={txCount} /> : '0'} ({txPerSecond}{' '}
            {t('home.stat.txs-per-sec')})
          </div>
        </div>
        {nodesCount > 0 && (
          <div className="stat-piece">
            <div className="stat-piece-header">{t('home.stat.nodes')}</div>
            <div>
              <Link href="/nodes">{nodesCount}</Link>
            </div>
          </div>
        )}
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.quorum')}</div>
          <div>
            {quorum} (
            <Link href="/validators">
              {proposers} {t('home.stat.proposers')}
            </Link>
            )
          </div>
        </div>
      </div>

      <div className="statistics-block">
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.accounts')}</div>
          <div>
            <Link href="/activations?period=all">{createdAccounts}</Link>
          </div>
        </div>

        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.usernames')}</div>
          <div>{registeredUsernames}</div>
        </div>
        {!xahauNetwork && (
          <div className="stat-piece">
            <div className="stat-piece-header">{t('home.stat.amms')}</div>
            <div>
              <Link href="/amms">{ammsCount}</Link>
            </div>
          </div>
        )}
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.escrows')}</div>
          <div>{escrowsCount}</div>
        </div>
      </div>

      <div className="statistics-block">
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.nft.created')}</div>
          <div>
            <Link href="/nft-explorer?mintedPeriod=all&includeBurned=true&includeWithoutMediaData=true">
              {niceNumber(nft.created)}
            </Link>
          </div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.nft.burned')}</div>
          <div>
            <Link href="/nft-explorer?includeBurned=true&includeWithoutMediaData=true&burnedPeriod=all&mintedPeriod=all">
              {niceNumber(nft.burned)}
            </Link>
          </div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.nft.issuers')}</div>
          <div>
            <Link href="/nft-volumes?period=all&list=issuers">{niceNumber(nft.issuers)}</Link>
          </div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.nft.owners')}</div>
          <div>
            <Link href="/nft-distribution?order=total">{niceNumber(nft.owners)}</Link>
          </div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.nft.transfers')}</div>
          <div>{niceNumber(nft.transfers)}</div>
        </div>
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.nft.for-sale')}</div>
          <div>
            <Link
              href={
                '/nft-explorer?list=onSale&includeWithoutMediaData=true' +
                (xahauNetwork ? '' : '&saleDestination=publicAndKnownBrokers')
              }
            >
              {niceNumber(nft.forSale)}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
