import { useState, useEffect } from 'react'
import { fullDateAndTime, timeOrDate, amountFormat, nftIdLink, shortAddress } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import axios from 'axios'
import { addressBalanceChanges } from '../../utils/transaction'
import { isNativeCurrency, xls14NftValue } from '../../utils'
import Link from 'next/link'

export default function RecentTransactions({ userData, ledgerTimestamp }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const address = userData?.address

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold"> Historical data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const showOfferLink = (changes, title) => {
    for (let i = 0; i < changes?.length; i++) {
      for (let j = 0; j < changes[i]?.nftokenOfferChanges?.length; j++) {
        return <Link href={'/nft-offer/' + changes[i].nftokenOfferChanges[j].index}>{title}</Link>
      }
    }
  }

  // Tooltip function for AccountSet fields
  const createTooltip = (text, fullValue, label) => (
    <span className="tooltip">
      {text}
      <span className="tooltiptext">
        <strong>{label}:</strong> {fullValue}
      </span>
    </span>
  )

  // Function to detect spam transactions (incoming payments for 0.000001/0.0001 XRP)
  const skipTx = (txdata) => {
    //check if no balance, nft changes and if addres is not a sender/receiver - skip
    const balanceChanges = addressBalanceChanges(txdata, address)
    const { specification, outcome } = txdata
    const senderOrReceiver =
      specification?.destination?.address === address || specification?.source?.address === address

    if (!balanceChanges?.length && !senderOrReceiver) {
      // if not sender and not receiver and balance is not effected..
      //shall we check for burned nfts, so for nft changes?
      return true
    }

    // discard payments with 1 drop (spamm)

    if (txdata.tx?.TransactionType !== 'Payment') {
      return false
    }

    // Check if it's an incoming payment to the user
    const isIncoming = specification?.destination?.address === address

    if (!isIncoming) {
      return false
    }

    const deliveredAmount = outcome?.deliveredAmount

    if (
      deliveredAmount &&
      isNativeCurrency(deliveredAmount) &&
      (deliveredAmount === '1' || deliveredAmount.value === '0.000001' || deliveredAmount.value === '0.0001')
    ) {
      return true
    }

    return false
  }

  // Function to get transaction status
  const getTransactionStatus = (txdata) => {
    const outcome = txdata.outcome
    if (!outcome) return { status: 'unknown', color: 'grey' }

    if (outcome.result === 'tesSUCCESS') {
      return { status: '✓', color: 'green' }
    } else {
      return { status: '✗', color: 'red' }
    }
  }

  // Function to get all transaction changes
  const getAllTransactionChanges = (txdata) => {
    // Check for balance changes first
    const balanceChanges = addressBalanceChanges(txdata, address)
    if (balanceChanges && balanceChanges.length > 0) {
      return balanceChanges.map((change, index) => (
        <span key={index}>
          <span className={Number(change.value) > 0 ? 'green' : 'red'}>
            <span className="tooltip">
              {Number(change.value) > 0 ? '+' : ''}
              <span>{amountFormat(change, { short: true, maxFractionDigits: 2, noSpace: true })}</span>
              <span className="tooltiptext no-brake">{amountFormat(change, { precise: 'nice' })}</span>
            </span>
          </span>
          {index < balanceChanges.length - 1 && ', '}
        </span>
      ))
    }

    // Check for NFTokenMint transactions
    if (txdata.tx?.TransactionType === 'NFTokenMint') {
      const nftoken_id = txdata.meta?.nftoken_id
      if (nftoken_id) {
        return (
          <span className="inline-flex items-center gap-1">
            <span className="text-purple-600">NFT</span>
            {nftoken_id && <span className="bold">{nftIdLink(nftoken_id, 4)}</span>}
          </span>
        )
      }
    }

    // Check for NFTokenBurn transactions
    if (txdata.tx?.TransactionType === 'NFTokenBurn') {
      const nftoken_id = txdata.tx?.NFTokenID
      if (nftoken_id) {
        return (
          <span className="inline-flex items-center gap-1">
            <Link href={'/nft/' + nftoken_id}>NFT</Link>
            <span className="text-red-600">burned</span>
          </span>
        )
      }
    }

    // Check for NFTokenAcceptOffer transactions
    if (txdata.tx?.TransactionType === 'NFTokenAcceptOffer') {
      const nftokenChanges = txdata.outcome?.nftokenChanges
      if (nftokenChanges && nftokenChanges.length > 0) {
        const addedNft = nftokenChanges.find((change) =>
          change.nftokenChanges?.some((nftChange) => nftChange.status === 'added')
        )
        if (addedNft) {
          const nftId = addedNft.nftokenChanges.find((nftChange) => nftChange.status === 'added')?.nftokenID
          if (nftId) {
            return (
              <span className="inline-flex items-center gap-1">
                <span className="text-green-600">NFT added: </span>
                <span className="bold">{nftIdLink(nftId, 4)}</span>
              </span>
            )
          }
        }
      }
    }

    // Check for OfferCreate transactions (when no balance change)
    if (txdata.tx?.TransactionType === 'OfferCreate') {
      const specification = txdata.specification
      const direction = specification?.flags?.sell ? 'Sell' : 'Buy'
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-blue-600">{direction} order created</span>
        </span>
      )
    }

    // Check for OfferCancel transactions (when no balance change)
    if (txdata.tx?.TransactionType === 'OfferCancel') {
      const sourceOrderbookChange = txdata.outcome?.orderbookChanges
        ?.filter((entry) => entry.address === txdata.specification?.source?.address)?.[0]
        ?.orderbookChanges.filter((entry) => entry.sequence === txdata.specification?.orderSequence)?.[0]

      const direction = sourceOrderbookChange?.direction ? 'Sell' : 'Buy'
      return (
        <span className="inline-flex items-center gap-1">
          <span className="text-orange-600">{direction} order cancelled</span>
        </span>
      )
    }

    // Check for NFTokenCreateOffer transactions
    if (txdata.tx?.TransactionType === 'NFTokenCreateOffer') {
      const specification = txdata.specification
      const direction = specification?.flags?.sellToken ? 'Sell' : 'Buy'
      return (
        <span className="inline-flex items-center gap-1 text-purple-600">
          {showOfferLink(txdata.outcome?.nftokenOfferChanges, direction + ' offer')} created
        </span>
      )
    }

    // Check for AccountSet transactions
    if (txdata.tx?.TransactionType === 'AccountSet') {
      const accountSetData = txdata.tx
      const specification = txdata.specification
      const changes = []

      if (accountSetData.Domain !== undefined) {
        if (specification?.domain) {
          changes.push(
            createTooltip(`Set domain to ${shortAddress(specification.domain)}`, specification.domain, 'Domain')
          )
        } else {
          changes.push('Remove domain')
        }
      }
      if (accountSetData.EmailHash !== undefined) {
        if (specification?.emailHash) {
          changes.push(
            createTooltip(
              `Set email hash to ${shortAddress(specification.emailHash)}`,
              specification.emailHash,
              'Email Hash'
            )
          )
        } else {
          changes.push('Remove email hash')
        }
      }
      if (accountSetData.MessageKey !== undefined) {
        if (specification?.messageKey) {
          changes.push(
            createTooltip(
              `Set message key to ${shortAddress(specification.messageKey)}`,
              specification.messageKey,
              'Message Key'
            )
          )
        } else {
          changes.push('Remove message key')
        }
      }
      if (accountSetData.TransferRate !== undefined) {
        if (accountSetData.TransferRate) {
          const rate = accountSetData.TransferRate / 1000000000
          changes.push(`Set transfer rate to ${rate}`)
        } else {
          changes.push('Remove transfer rate')
        }
      }
      if (accountSetData.TickSize !== undefined) {
        changes.push(`Set tick size to ${accountSetData.TickSize}`)
      }
      if (accountSetData.WalletLocator !== undefined) {
        if (specification?.walletLocator) {
          changes.push(
            createTooltip(
              `Set wallet locator to ${shortAddress(specification.walletLocator)}`,
              specification.walletLocator,
              'Wallet Locator'
            )
          )
        } else {
          changes.push('Remove wallet locator')
        }
      }
      if (specification?.defaultRipple !== undefined) {
        changes.push(`Default ripple ${specification.defaultRipple ? 'enabled' : 'disabled'}`)
      }
      if (specification?.disallowXRP !== undefined) {
        changes.push(`Incoming XRP ${specification.disallowXRP ? 'disallowed' : 'allowed'}`)
      }
      if (specification?.requireDestTag !== undefined) {
        changes.push(`Destination tag ${specification.requireDestTag ? 'required' : 'not required'}`)
      }
      if (specification?.disableMaster !== undefined) {
        changes.push(`Master key ${specification.disableMaster ? 'disabled' : 'enabled'}`)
      }
      if (specification?.noFreeze) {
        changes.push('No freeze enabled')
      }
      if (specification?.depositAuth !== undefined) {
        changes.push(`Deposit authorization ${specification.depositAuth ? 'enabled' : 'disabled'}`)
      }
      if (specification?.requireAuth !== undefined) {
        changes.push(`Require authorization ${specification.requireAuth ? 'enabled' : 'disabled'}`)
      }
      if (specification?.disallowIncomingCheck !== undefined) {
        changes.push(`Incoming check ${specification.disallowIncomingCheck ? 'disallowed' : 'allowed'}`)
      }
      if (specification?.disallowIncomingPayChan !== undefined) {
        changes.push(`Incoming payment channel ${specification.disallowIncomingPayChan ? 'disallowed' : 'allowed'}`)
      }
      if (specification?.disallowIncomingNFTokenOffer !== undefined) {
        changes.push(`Incoming NFT offer ${specification.disallowIncomingNFTokenOffer ? 'disallowed' : 'allowed'}`)
      }
      if (specification?.disallowIncomingTrustline !== undefined) {
        changes.push(`Incoming trust line ${specification.disallowIncomingTrustline ? 'disallowed' : 'allowed'}`)
      }
      if (specification?.enableTransactionIDTracking !== undefined) {
        changes.push(`Transaction ID tracking ${specification.enableTransactionIDTracking ? 'enabled' : 'disabled'}`)
      }
      if (specification?.globalFreeze !== undefined) {
        changes.push(`Global freeze ${specification.globalFreeze ? 'enabled' : 'disabled'}`)
      }
      if (specification?.authorizedMinter !== undefined) {
        changes.push(`Authorized minter ${specification.authorizedMinter ? 'enabled' : 'disabled'}`)
      }
      if (accountSetData.NFTokenMinter !== undefined) {
        if (specification?.nftokenMinter) {
          changes.push(
            createTooltip(
              `Set NFT minter to ${shortAddress(specification.nftokenMinter)}`,
              specification.nftokenMinter,
              'NFT Minter'
            )
          )
        } else {
          changes.push('Remove NFT minter')
        }
      }
      if (specification?.allowTrustLineClawback !== undefined) {
        changes.push(`Trust line clawback ${specification.allowTrustLineClawback ? 'allowed' : 'disallowed'}`)
      }
      if (specification?.disallowIncomingRemit !== undefined) {
        changes.push(`Incoming remit ${specification.disallowIncomingRemit ? 'disallowed' : 'allowed'}`)
      }

      if (changes.length > 0) {
        return <span className="inline-flex items-center gap-1">{changes[0]}</span>
      }
    }

    const limit = txdata.specification?.limit

    // If no balance changes, try to show relevant transaction information
    if (limit || txdata.tx?.TransactionType === 'CheckCreate') {
      let limitAmount
      if (limit) {
        limitAmount = {
          value: txdata.specification.limit,
          currency: txdata.specification.currency,
          issuer: txdata.specification?.counterparty
        }
      } else {
        limitAmount = txdata.specification?.sendMax
      }
      return (
        <span className="tooltip">
          <span style={{ color: '#ce8e12' }}>{amountFormat(limitAmount, { short: true, maxFractionDigits: 2 })}</span>
          <span className="tooltiptext">
            <strong>{limit ? 'Limit' : 'Amount'}:</strong>
            {amountFormat(limitAmount, { precise: 'nice' })}
          </span>
        </span>
      )
    }

    return ''
  }

  // Function to get specific payment type
  const getPaymentType = (txdata) => {
    if (txdata.tx?.TransactionType !== 'Payment') {
      return txdata.tx?.TransactionType
    }

    const { outcome, specification } = txdata

    // Check if it's a conversion payment (same source and destination)
    const isConversion =
      specification?.source?.address === specification?.destination?.address &&
      (specification?.source?.tag === specification?.destination?.tag || !specification?.destination?.tag)

    if (isConversion) {
      return 'Exchange'
    }

    // Check if it's an NFT transfer (XLS-14)
    if (xls14NftValue(outcome?.deliveredAmount?.value)) {
      return 'NFT transfer (XLS-14)'
    }

    return 'Payment'
  }

  const fetchTransactions = async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    const res = await axios(
      `/v3/transactions/${address}?limit=15` +
        (ledgerTimestamp ? '&toDate=' + new Date(ledgerTimestamp).toISOString() : '')
    ).catch((error) => {
      setError(error.message)
      setLoading(false)
    })
    const allTransactions = Array.isArray(res?.data) ? res.data : res?.data?.transactions

    // Filter out spam transactions and take the latest 5
    const filteredTransactions = (allTransactions || []).filter((txdata) => !skipTx(txdata)).slice(0, 5)

    setTransactions(filteredTransactions)
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!transactions?.length) {
    return null
  }

  const transactionCount = transactions.length < 5 ? transactions.length : 5
  const title = `Last ${transactionCount} transactions`

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              {title} [<a href={'/explorer/' + address}>View all</a>]{historicalTitle}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan="100">Loading recent transactions...</td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan="100" className="red">
                Error: {error}
              </td>
            </tr>
          )}
          {!loading && !error && (
            <>
              <tr>
                <th className="center">Status</th>
                <th className="right">Validated</th>
                <th className="right">Type</th>
                <th className="right">Hash</th>
                <th className="right">Changes</th>
              </tr>
              {transactions.map((txdata, i) => {
                const status = getTransactionStatus(txdata)
                return (
                  <tr key={txdata.tx?.hash || i}>
                    <td className="center" style={{ width: 65 }}>
                      <span className={status.color}>{status.status}</span>
                    </td>
                    <td className="right no-brake">{txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'}</td>
                    <td className="right no-brake">{getPaymentType(txdata)}</td>
                    <td className="right">
                      <LinkTx tx={txdata.tx?.hash} short={4} />
                    </td>
                    <td className="right">{getAllTransactionChanges(txdata, address)}</td>
                  </tr>
                )
              })}
            </>
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {title.toUpperCase()} [<a href={'/explorer/' + address}>View all</a>]{historicalTitle}
        </center>
        <br />
        {loading && <span className="grey">Loading recent transactions...</span>}
        {error && <span className="red">Error: {error}</span>}
        {!loading && !error && transactions.length > 0 && (
          <table className="table-mobile wide">
            <tbody>
              <tr>
                <th className="center">Status</th>
                <th className="right">Validated</th>
                <th className="right">Type</th>
                <th className="center">Link</th>
                <th className="right">Changes</th>
              </tr>
              {transactions.map((txdata, i) => {
                const status = getTransactionStatus(txdata)
                return (
                  <tr key={txdata.tx?.hash || i}>
                    <td className="center" style={{ width: 20 }}>
                      <span className={status.color}>{status.status}</span>
                    </td>
                    <td className="right">{txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'}</td>
                    <td className="right">{getPaymentType(txdata)}</td>
                    <td className="center">
                      <LinkTx tx={txdata.tx?.hash} icon={true} />
                    </td>
                    <td className="right">{getAllTransactionChanges(txdata, address)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
