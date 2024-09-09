import { useWidth } from '../utils'
import { amountFormat, fullDateAndTime } from '../utils/format'

import LinkIcon from '../public/images/link.svg'

/*
  [
    {
      "id": 48,
      "processedAt": 1713181173,
      "hash": "0EA5179DA06E523624D6D07450D1E09A5F0C5000D4183FB763BB0B841FF6F0AE",
      "ledger": 5933835,
      "type": "Payment",
      "sourceAddress": "raNf8ibQZECTaiFqkDXKRmM2GfdWK76cSu",
      "destinationAddress": "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
      "destinationTag": 357944708,
      "amount": 20.72,
      "status": "Completed",
      "memos": [
        {
          "data": "Payment for Bithomp Pro (1 month)"
        },
        {
          "data": "staging.bithomp.com"
        }
      ]
    },
  ]
*/

export default function ListTransactions({ transactions }) {
  const width = useWidth()

  return (
    <>
      {transactions?.length > 0 && (
        <>
          {width > 600 ? (
            <table className="table-large no-hover">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>From</th>
                  <th>Amount</th>
                  <th>Memo</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((payment, index) => {
                  return (
                    <tr key={index}>
                      <td>{fullDateAndTime(payment.processedAt)}</td>
                      <td>
                        <a href={'/explorer/' + payment.sourceAddress}>{payment.sourceAddress}</a>
                      </td>
                      <td>{amountFormat(payment.amount, { maxFractionDigits: 6 })}</td>
                      <td>{payment.memos?.[0]?.data}</td>
                      <td>
                        <a href={'/explorer/' + payment.hash}>
                          <LinkIcon />
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="table-mobile">
              <tbody>
                {transactions?.map((payment, index) => {
                  return (
                    <tr key={index}>
                      <td style={{ padding: '5px' }} className="center">
                        <b>{index + 1}</b>
                      </td>
                      <td>
                        <p>{fullDateAndTime(payment.processedAt)}</p>
                        <p>
                          From: <br />
                          <a href={'/explorer/' + payment.sourceAddress}>{payment.sourceAddress}</a>
                        </p>
                        <p>Amount: {amountFormat(payment.amount, { maxFractionDigits: 6 })}</p>
                        <p>Memo: {payment.memos?.[0]?.data}</p>
                        <p>
                          Transaction:{' '}
                          <a href={'/explorer/' + payment.hash}>
                            <LinkIcon />
                          </a>
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  )
}
