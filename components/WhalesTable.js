import { AddressWithIconFilled, amountFormat, fullNiceNumber } from '../utils/format'

export const WhalesTable = ({ isMobile, data, noAmount, showFee }) => (
  <>
    {Array.isArray(data?.addresses) && (
      <>
        {!isMobile ? (
          <table className="table-large shrink">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th className="right">Transactions</th>
                {!noAmount && <th className="right">Amount</th>}
                {showFee && <th className="right">Fees paid</th>}
              </tr>
            </thead>
            <tbody>
              {data?.addresses?.map((tx, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <AddressWithIconFilled data={tx} />
                  </td>
                  <td className="right">{fullNiceNumber(tx.transactionsCount)}</td>
                  {!noAmount && (
                    <td className="right">{amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}</td>
                  )}
                  {showFee && <td className="right">{amountFormat(tx.fee, { short: true, maxFractionDigits: 2 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="table-mobile">
            <thead></thead>
            <tbody>
              {data?.map((tx, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px' }} className="center">
                    <b>{i + 1}</b>
                  </td>
                  <td>
                    <br />
                    <AddressWithIconFilled data={tx} />
                    <p>Transactions: {fullNiceNumber(tx.transactionsCount)}</p>
                    {!noAmount && (
                      <p>
                        Amount:{' '}
                        <span className="bold">{amountFormat(tx.amount, { short: true, maxFractionDigits: 2 })}</span>
                      </p>
                    )}
                    {showFee && (
                      <p>
                        Fees paid:{' '}
                        <span className="bold">{amountFormat(tx.fee, { short: true, maxFractionDigits: 2 })}</span>
                      </p>
                    )}
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
