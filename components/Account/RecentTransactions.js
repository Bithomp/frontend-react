import { useState, useEffect } from 'react'
import { fullDateAndTime, timeOrDate, amountFormat, nftIdLink, shortAddress } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import axios from 'axios'
import { addressBalanceChanges } from '../../utils/transaction'
import { xls14NftValue } from '../../utils'

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

  // Function to get all transaction changes
  const getAllTransactionChanges = (txdata, userAddress) => {
    // Check for balance changes first
    const balanceChanges = addressBalanceChanges(txdata, userAddress)
    if (balanceChanges && balanceChanges.length > 0) {
      return balanceChanges.map((change, index) => (
        <span key={index}>
          <span className={Number(change.value) > 0 ? 'green' : 'red'}>
            {Number(change.value) > 0 ? '+' : ''}
            <span className="tooltip">
              <span>
                {amountFormat(change, { short: true, maxFractionDigits: 2 })}
              </span>
              <span className="tooltiptext">
                <strong>Change:</strong>
                {amountFormat(change, { precise: 'nice' })}
              </span>
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
          <span className="tooltip">
            <span className="inline-flex items-center gap-1">
              <span className="text-purple-600">NFT</span>
              {nftoken_id && (
                <span className='bold'>
                  {nftIdLink(nftoken_id)}
                </span>
              )}
            </span>
            <span className="tooltiptext">
              <span>NFT: {nftoken_id || 'N/A'}</span> 
            </span>
          </span>
        )
      }
    }
    
    // Check for AccountSet transactions
    if (txdata.tx?.TransactionType === 'AccountSet') {
      const accountSetData = txdata.tx
      const specification = txdata.specification
      const changes = []

      if (accountSetData.Domain !== undefined) {
        if (specification?.domain) {
          changes.push(`Set domain to ${specification.domain}`)
        } else {
          changes.push('Remove domain')
        }
      }
      if (accountSetData.EmailHash !== undefined) {
        if (specification?.emailHash) {
          changes.push(`Set email hash to ${shortAddress(specification.emailHash)}` )
        } else {
          changes.push('Remove email hash')
        }
      }
      if (accountSetData.MessageKey !== undefined) {
        if (specification?.messageKey) {
          changes.push(`Set message key to ${shortAddress(specification.messageKey)}`)
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
          changes.push(`Set wallet locator to ${shortAddress(specification.walletLocator)}`)
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
          changes.push(`Set NFT minter to ${shortAddress(specification.nftokenMinter)}`)
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
        return (
          <span className="inline-flex items-center gap-1">
            {changes[0]}
          </span>
        )
      }
    }
    
    // If no balance changes, try to show relevant transaction information
    if (txdata.specification?.limit) {
      const limitAmount = {
        value: txdata.specification.limit,
        currency: txdata.specification.currency,
        issuer: txdata.specification?.counterparty
      }
      return (
        <span className="tooltip">
          <span style={{ color: '#ce8e12' }}>
            {amountFormat(limitAmount, { short: true, maxFractionDigits: 2 })}
          </span>
          <span className="tooltiptext">
            <strong>Limit:</strong>
            {amountFormat(limitAmount, { precise: 'nice' })}
          </span>
        </span>
      )
    }
    
    return '-'
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

    // Check if IOU is involved (pathfinding or IOU with fee)
    const sourceBalanceChangesList = addressBalanceChanges(txdata, specification?.source?.address)
    if (
      !outcome?.deliveredAmount?.mpt_issuance_id &&
      sourceBalanceChangesList?.[0]?.value !== '-' + outcome?.deliveredAmount?.value
    ) {
      return 'IOU Payment'
    }

    return 'Payment'
  }

  const fetchTransactions = async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    const res = await axios(
      `/v3/transactions/${address}?limit=5` +
        (ledgerTimestamp ? '&toDate=' + new Date(ledgerTimestamp).toISOString() : '')
    ).catch((error) => {
      setError(error.message)
      setLoading(false)
    })
    const transactions = Array.isArray(res?.data) ? res.data : res?.data?.transactions
    setTransactions(transactions || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!transactions?.length) {
    return null
  }

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">
              Last 5 transactions [<a href={'/explorer/' + address}>View all</a>]{historicalTitle}
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
                <th>#</th>
                <th className="right min-w-[90px]">Validated</th>
                <th className="right">Type</th>
                <th className="right min-w-[50px]">Hash</th>
                <th className="right">Changes</th>
              </tr>
              {transactions.map((txdata, i) => (
                <tr key={txdata.tx?.hash || i}>
                  <td className="center" style={{ width: 30 }}>
                    {i + 1}
                  </td>
                  <td className="right" style={{ minWidth: "fit-content" }}>{txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'}</td>
                  <td className="right">{getPaymentType(txdata)}</td>
                  <td className="right">
                    <LinkTx tx={txdata.tx?.hash} icon={true} />
                  </td>
                  <td className="right">
                    {getAllTransactionChanges(txdata, userData.address)}
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {'Last 5 Transactions'.toUpperCase()} [<a href={'/explorer/' + address}>View all</a>]{historicalTitle}
        </center>
        <br />
        {loading && <span className="grey">Loading recent transactions...</span>}
        {error && <span className="red">Error: {error}</span>}
        {!loading && !error && transactions.length > 0 && (
          <table className="table-mobile wide">
            <tbody>
              <tr>
                <th>#</th>
                <th className="right">Validated</th>
                <th className="right">Type</th>
                <th className="center">Link</th>
                <th className="right">Changes</th>
              </tr>
              {transactions.map((txdata, i) => (
                <tr key={txdata.tx?.hash || i}>
                  <td className="center" style={{ width: 30 }}>
                    {i + 1}
                  </td>
                  <td className="right">{txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'}</td>
                  <td className="right">{getPaymentType(txdata)}</td>
                  <td className="center">
                    <LinkTx tx={txdata.tx?.hash} icon={true} />
                  </td>
                  <td className="right">
                    {getAllTransactionChanges(txdata, userData.address)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
