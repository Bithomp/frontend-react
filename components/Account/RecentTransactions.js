import { useState, useEffect } from 'react'
import { fullDateAndTime, timeOrDate } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import axios from 'axios'
import CopyButton from '../UI/CopyButton'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, ledgerTimestamp])

  if (!transactions || !transactions.length) {
    return null
  }

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">Recent transactions {historicalTitle}</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan="100">Loading recent transactions...</td></tr>}
          {error && <tr><td colSpan="100" className="red">Error: {error}</td></tr>}
          {!loading && !error && 
            <>
              <tr>
                <th>#</th>
                <th className="left">Time</th>
                <th className="right">Type</th>
                <th className="right">Hash</th>
                <th className="center">Status</th>
              </tr>
              {transactions.map((tx, i) => (
                <tr key={tx.txHash || tx.tx?.hash || i}>
                  <td className="center" style={{ width: 30 }}>{i + 1}</td>
                  <td className="left">
                    {tx.tx?.date ? timeOrDate(tx.tx.date + 946684800) : '-'}
                  </td>
                  <td className="right">
                    {tx.tx?.TransactionType}
                  </td>
                  <td className="right">
                    <LinkTx tx={tx.txHash || tx.tx?.hash}/> <CopyButton text={tx.txHash || tx.tx?.hash} />                    
                  </td>
                  <td className="center">
                    <span className={tx.outcome?.result === 'tesSUCCESS' ? 'green' : 'red'}>
                      {tx.outcome?.result === 'tesSUCCESS' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </>
          }
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <br />
        <center>
          {'Recent Transactions'.toUpperCase()}
          {historicalTitle}
        </center>
        <br />
        {loading && <span className="grey">Loading recent transactions...</span>}
        {error && <span className="red">Error: {error}</span>}        
        {!loading && !error && transactions.length > 0 && (
          <table className="table-mobile wide">
            <tbody>
              <tr>
                <th>#</th>
                <th className="left">Time</th>
                <th className="right">Type</th>
                <th className="right">Link</th>
                <th className="center">Status</th>
              </tr>
              {transactions.map((tx, i) => (
                <tr key={tx.txHash || tx.tx?.hash || i}>
                  <td className="center" style={{ width: 30 }}>{i + 1}</td>
                  <td className="left">
                    {tx.tx?.date ? timeOrDate(tx.tx.date + 946684800) : '-'}
                  </td>
                  <td className="right">
                    {tx.tx?.TransactionType}
                  </td>
                  <td className="right">
                    <LinkTx tx={tx.txHash || tx.tx?.hash} icon={true}/>
                  </td>
                  <td className="center">
                    <span className={tx.outcome?.result === 'tesSUCCESS' ? 'green' : 'red'}>
                      {tx.outcome?.result === 'tesSUCCESS' ? 'Success' : 'Failed'}
                    </span>
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