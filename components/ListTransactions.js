import { useEffect, useState } from 'react'
import { useWidth } from '../utils'
import { amountFormat, fullDateAndTime, addressLink, AddressWithIconFilled } from '../utils/format'
import { niceNumber } from '../utils/format'
import axios from 'axios'

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

const fiatAmountAt = async (payment) => {
  const rate = await axios
    .get(
      'v2/rates/history/nearest/eur?date=' + payment.processedAt + '000' //13 digits
    )
    .catch((error) => {
      console.log(error)
    })
  if (rate?.data?.eur) {
    return niceNumber((payment.amount / 1000000) * rate.data.eur, 2, 'EUR')
  }
  return 0
}

export default function ListTransactions({ transactions }) {
  const width = useWidth()
  const [transactionList, setTransactionList] = useState([])

  const assignFiatAmount = async (list) => {
    if (!list) return
    for (let transaction of list) {
      transaction.fiatAmount = await fiatAmountAt(transaction)
    }
    setTransactionList(transactions)
  }

  useEffect(() => {
    assignFiatAmount(transactions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  return (
    <>
      {transactionList?.length > 0 && (
        <>
          {width > 600 ? (
            <table className="table-large">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>From</th>
                  <th>Amount</th>
                  <th>Fiat</th>
                  <th>Memo</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {transactionList?.map((payment, index) => {
                  return (
                    <tr key={index}>
                      <td>{fullDateAndTime(payment.processedAt)}</td>
                      <td>
                        <AddressWithIconFilled data={payment} name="sourceAddress" />
                      </td>
                      <td>{amountFormat(payment.amount)}</td>
                      <td>{payment.fiatAmount}</td>
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
                {transactionList?.map((payment, index) => {
                  return (
                    <tr key={index}>
                      <td style={{ padding: '5px' }} className="center">
                        <b>{index + 1}</b>
                      </td>
                      <td>
                        <p>{fullDateAndTime(payment.processedAt)}</p>
                        <p>
                          From: <br />
                          {addressLink(payment.sourceAddress)}
                        </p>
                        <p>Amount: {amountFormat(payment.amount)}</p>
                        <p>Fiat equivalent: {payment.fiatAmount}</p>
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
