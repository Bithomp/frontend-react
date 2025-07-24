import { useState, useEffect, useRef } from 'react'
import { fullDateAndTime, timeOrDate } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import axios from 'axios'
import CopyButton from '../UI/CopyButton'

export default function RecentTransactions({ userData, ledgerTimestamp, parentLoading }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const previousParentLoadingRef = useRef(parentLoading)

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
    
    try {
      const res = await axios(
        `/v3/transactions/${address}?limit=5` +
          (ledgerTimestamp ? '&toDate=' + new Date(ledgerTimestamp).toISOString() : '')
      )
      setTransactions(res?.data || [])
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Effect for initial load and address changes
  useEffect(() => {
    if (!parentLoading) {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Effect to handle parent loading state changes
  useEffect(() => {
    const wasParentLoading = previousParentLoadingRef.current
    previousParentLoadingRef.current = parentLoading

    // If parent just finished loading, now fetch transactions
    if (wasParentLoading && !parentLoading) {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentLoading, ledgerTimestamp])

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
                <th className="right">Validated</th>
                <th className="right">Type</th>
                <th className="right">Hash</th>
                <th className="right">Status</th>
              </tr>
              {transactions.map((txdata, i) => (
                <tr key={txdata.tx?.hash || i}>
                  <td className="center" style={{ width: 30 }}>
                    {i + 1}
                  </td>
                  <td className="right">{txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'}</td>
                  <td className="right">{txdata.tx?.TransactionType}</td>
                  <td className="right">
                    <LinkTx tx={txdata.tx?.hash} /> <CopyButton text={txdata.tx?.hash} />
                  </td>
                  <td className="right">
                    <span className={txdata.outcome?.result === 'tesSUCCESS' ? 'green' : 'red'}>
                      {txdata.outcome?.result === 'tesSUCCESS' ? 'Success' : 'Failed'}
                    </span>
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
                <th className="left">Status</th>
              </tr>
              {transactions.map((txdata, i) => (
                <tr key={txdata.tx?.hash || i}>
                  <td className="center" style={{ width: 30 }}>
                    {i + 1}
                  </td>
                  <td className="right">{txdata.tx?.date ? timeOrDate(txdata.tx.date, 'ripple') : '-'}</td>
                  <td className="right">{txdata.tx?.TransactionType}</td>
                  <td className="center">
                    <LinkTx tx={txdata.tx?.hash} icon={true} />
                  </td>
                  <td className="left">
                    <span className={txdata.outcome?.result === 'tesSUCCESS' ? 'green' : 'red'}>
                      {txdata.outcome?.result === 'tesSUCCESS' ? 'Success' : 'Failed'}
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
