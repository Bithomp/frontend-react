import { useState, useEffect } from 'react'
import { fullDateAndTime, addressUsernameOrServiceLink, amountFormat } from '../../utils/format'
import { decode } from '../../utils'
import { LinkTx } from '../../utils/links'
import axios from 'axios'
import CopyButton from '../UI/CopyButton'

export default function RecentTransactions({ userData, ledgerTimestamp }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const address = userData?.address

  const title = ledgerTimestamp ? (
    <span className="red bold">Recent transactions ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'Recent transactions'
  )

  const fetchTransactions = async () => {
    if (!address) return
    setLoading(true)
    setError(null)
    const res = await axios(`/v3/transactions/${address}?limit=5` + (ledgerTimestamp ? '&toDate=' + new Date(ledgerTimestamp).toISOString() : '')).catch((error) => {
      setError(error.message)
      setLoading(false)
    })
    setTransactions(res?.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [address, ledgerTimestamp])

  if (!transactions || !transactions.length) {
    return null
  }

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
          <tr>
            <th>#</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan="100">Loading recent transactions...</td></tr>}
          {error && <tr><td colSpan="100" className="red">Error: {error}</td></tr>}
          {!loading && !error && transactions.map((tx, i) => (
            <tr key={tx.txHash || tx.tx?.hash || i}>
              <td className="center" style={{ width: 30 }}>{i + 1}</td>
              <td>
                <span className="grey">Date & Time: </span>
                {tx.outcome?.timestamp ? fullDateAndTime(new Date(tx.outcome.timestamp)) : '-'}
                <br />
                <span className="grey">Transaction Type: </span>
                {tx.tx?.TransactionType}
                <br />
                {
                  tx.tx?.Amount && (
                    <>
                      <span className="grey">Amount: </span>
                        {amountFormat(tx.tx.Amount)} from {addressUsernameOrServiceLink({ address: tx.tx.Account }, 'address', { short: true })} to {addressUsernameOrServiceLink({ address: tx.tx.Destination }, 'address', { short: true })}
                      <br />
                    </>
                  )
                }
                {
                  tx.tx.Memos && tx.tx.Memos.length > 0 && (
                    <>
                      <span className="grey">Memos: </span>
                      {tx.tx.Memos.map((memo, i) => (
                        <span key={i}>{memo.Memo.MemoData ? decode(memo.Memo.MemoData) : '-'}</span>
                      ))}
                      <br />
                    </>
                  )
                }
                <span className="grey">Transaction Hash: </span>
                <LinkTx tx={tx.txHash || tx.tx?.hash}/> <CopyButton text={tx.txHash || tx.tx?.hash} />
                <br />
                <span className="grey">Status: </span>
                <span className={tx.outcome?.result === 'tesSUCCESS' ? 'green' : 'red'}>
                  {tx.outcome?.result === 'tesSUCCESS' ? 'Success' : 'Failed'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <h4 className="center">Recent transactions</h4>
        {loading && <div>Loading recent transactions...</div>}
        {error && <div className="red">Error: {error}</div>}
        {!loading && !error && transactions.map((tx, i) => (
          <div key={tx.txHash || tx.tx?.hash || i} style={{ marginBottom: '6px' }} suppressHydrationWarning>
            <span className="grey">{i + 1}. </span>
            {tx.outcome?.timestamp ? fullDateAndTime(new Date(tx.outcome.timestamp)) : '-'}
            <br />
            <span className="grey">Transaction Type: </span>
            {tx.tx?.TransactionType}
            <br />
            {
              tx.tx?.Amount && (
                <>
                  <span className="grey">Amount: </span> <span className="bold">{amountFormat(tx.tx.Amount)}</span>
                  <br />
                  <span>from {addressUsernameOrServiceLink({ address: tx.tx.Account }, 'address', { short: true })} to {addressUsernameOrServiceLink({ address: tx.tx.Destination }, 'address', { short: true })}</span>
                  <br />
                </>
              )
            }
            {
              tx.tx?.Memos && tx.tx.Memos.length > 0 && (
                <>
                  <span className="grey">Memos: </span>
                  {tx.tx.Memos.map((memo, i) => (
                    <span key={i}>{memo.Memo.MemoData ? decode(memo.Memo.MemoData) : '-'}</span>
                  ))}
                </>
              )
            }            
            <span className="grey">Transaction Hash: </span>
            <LinkTx tx={tx.txHash || tx.tx?.hash}/> <CopyButton text={tx.txHash || tx.tx?.hash} />
            <br />
            <span className="grey">Status: </span>
            <span className={tx.outcome?.result === 'tesSUCCESS' ? 'green' : 'red'}>
              {tx.outcome?.result === 'tesSUCCESS' ? 'Success' : 'Failed'}
            </span>
          </div>
        ))}
      </div>
      <style jsx>{``}</style>
    </>
  )
} 