import { AddressWithIconFilled, amountFormat } from '../utils/format'

export const WhalesTable = ({ isMobile, data }) => (
  <>
    {Array.isArray(data) && (
      <>
        {!isMobile ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Txs count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((tx, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <AddressWithIconFilled data={tx} />
                  </td>
                  <td>{tx.transactionsCount}</td>
                  <td>{amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table-mobile">
            <thead></thead>
            <tbody>
              {data?.map((d, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px' }} className="center">
                    <b>{i + 1}</b>
                  </td>
                  <td>
                    <AddressWithIconFilled data={tx} name="sourceAddress" />
                    <p>Txs: {tx.transactionsCount}</p>
                    <p>Amount: {amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    )}
  </>
)
