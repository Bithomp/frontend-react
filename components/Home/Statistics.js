import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { wssServer, ledgerName, xahauNetwork } from '../../utils'
import { amountFormat, niceNumber } from '../../utils/format'
import { LedgerLink } from '../../utils/links'

let ws = null

function sendData() {
  if (ws.readyState) {
    ws.send(JSON.stringify({ command: 'subscribe', streams: ['statistics'], id: 1 }))
  } else {
    setTimeout(sendData, 1000)
  }
}

export default function Statistics() {
  const [data, setData] = useState(null)
  const { t } = useTranslation()

  const checkStatApi = async () => {
    const response = await axios('v2/statistics')
    const data = response.data
    if (data) {
      setData(data)
    }
  }

  const connect = () => {
    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      sendData()
    }

    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      setData(message)

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
          activeLast24h: 7657,
          crawler: {},
          created: 1,
          blackholed: 5,
          deleted: 34
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
        },
        "escrows": {
          "crawler": {
            "ledgerIndex": 87214991,
            "ledgerTime": 1712755071
          },
          "existing": 10374
        },
        "amms": {
          "crawler": {
            "ledgerIndex": 87214991,
            "ledgerTime": 1712755071
          },
          "existing": 193
        },
        "nodes": {
          "crawler": {
            "time": 1714145597
          },
          "total": 606
        }
      }
      */
    }

    ws.onclose = () => {
      connect()
    }
  }

  useEffect(() => {
    checkStatApi()
    connect()
    return () => {
      setData(null)
      if (ws) ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let closedAt = 'xx:xx:xx'
  let ledgerIndex = 'xxxxxxxx'
  let txPerSecond = 'x.xx'
  let txCount = 'x'
  let quorum = 'x'
  let proposers = 'x'
  let createdAccounts = 'xxxx'
  let activeAccountsLast24h = 'xxxx'
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
    transactions: 'xxx',
    payments: 'xxx',
    fees: 'xxx'
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
    }
    createdAccounts = niceNumber(accounts.created - accounts.deleted)
    activeAccountsLast24h = niceNumber(accounts.activeLast24h)
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
    }
  }

  return (
    <>
      <h2 className="center landing-h2">{t('home.stat.header', { ledgerName })}</h2>

      <div className="statistics-block">
        <div className="stat-piece">
          <div className="stat-piece-header">{t('home.stat.accountsActiveLast24h')}</div>
          <div>{activeAccountsLast24h}</div>
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
            <LedgerLink version={ledgerIndex} text={txCount} /> ({txPerSecond} {t('home.stat.txs-per-sec')})
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
            {/* Hide link to nft-volumes while its not ready on xahau yet*/}
            {xahauNetwork ? (
              niceNumber(nft.issuers)
            ) : (
              <Link href="/nft-volumes?period=all&list=issuers">{niceNumber(nft.issuers)}</Link>
            )}
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
            {/* Hide link to nft-explorer?list=onSale while its not ready on xahau yet*/}
            {xahauNetwork ? (
              niceNumber(nft.forSale)
            ) : (
              <Link href="/nft-explorer?list=onSale&saleDestination=publicAndKnownBrokers&mintedPeriod=all&includeWithoutMediaData=true">
                {niceNumber(nft.forSale)}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
