import { fullDateAndTime, addressUsernameOrServiceLink, amountFormat } from '../../utils/format'
import { LinkTx } from '../../components/Transaction'

export default function RecentTransactions({ transactions, ledgerTimestamp }) {
    console.log(transactions)

  const title = ledgerTimestamp ? (
    <span className="red bold">Recent transactions ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    'Recent transactions'
  )

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
            <th>Date & Time</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Transaction</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr key={i}>
              <td className="center" style={{ width: 30 }}>{i + 1}</td>
              <td>{fullDateAndTime(tx.date)}</td>
              <td>{tx.type}</td>
              <td>{addressUsernameOrServiceLink({ address: tx.from }, 'address', { short: true })}</td>
              <td>{addressUsernameOrServiceLink({ address: tx.to }, 'address', { short: true })}</td>
              <td className="right">{amountFormat(tx.amount)}</td>
              <td className={tx.status === 'tesSUCCESS' ? 'green' : 'red'}>{tx.status}</td>
              <td><LinkTx tx={tx.hash} icon={true} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="show-on-small-w800">
        <br />
        <center>{title}</center>
        {transactions.map((tx, i) => (
          <div key={i} style={{ marginBottom: '6px' }} suppressHydrationWarning>
            <span className="grey">{i + 1}. </span>
            {fullDateAndTime(tx.date)}
            <br />
            <span className="grey">Type: </span>
            {tx.type}
            <br />
            <span className="grey">From: </span>
            {addressUsernameOrServiceLink({ address: tx.from }, 'address', { short: true })}
            <br />
            <span className="grey">To: </span>
            {addressUsernameOrServiceLink({ address: tx.to }, 'address', { short: true })}
            <br />
            <span className="grey">Amount: </span>
            {amountFormat(tx.amount)}
            <br />
            <span className="grey">Status: </span>
            <span className={tx.status === 'tesSUCCESS' ? 'green' : 'red'}>{tx.status}</span>
            <br />
            <span className="grey">Transaction: </span>
            <LinkTx tx={tx.hash} />
          </div>
        ))}
      </div>
      <style jsx>{``}</style>
    </>
  )
} 