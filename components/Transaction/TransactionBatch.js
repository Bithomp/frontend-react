import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormatWithIcon, amountToFiat, shortAddress, showFlags } from '../../utils/format'
import Link from 'next/link'

export const TransactionBatch = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      notFullySupported={true}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData>Flags</TData>
        <TData>
          {showFlags(specification?.flags)}
        </TData>
      </tr>
      {specification?.transactions?.map((transaction, index) => {
        const maxAmount = transaction.specification?.source?.maxAmount
        return <React.Fragment key={transaction.id || index}>
          <tr>
            <TData className="bold">
                Transaction {index + 1}
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>ID</TData>
            <TData>
              <Link href={`/tx/${transaction.id}`}>
                {shortAddress(transaction.id)}
              </Link>
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>Type</TData>
            <TData>
              <span className="bold">{transaction?.type}</span>
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>Sequence</TData>
            <TData>
              #{transaction?.sequence}
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>Flags</TData>
            <TData>
              {showFlags(transaction?.specification?.flags)}
            </TData>
          </tr>
          {
            transaction.specification.destination &&
            <tr>
              <TData style={{ paddingLeft: '30px' }}>Destination</TData>
              <TData>
                <AddressWithIconFilled data={transaction.specification.destination} name="address" />
              </TData>
            </tr>
          }
          {
            maxAmount &&
            <tr>
              <TData style={{ paddingLeft: '30px' }}>Max Amount</TData>
              <TData style={{ display: 'flex' }}>
                {amountFormatWithIcon({ amount: maxAmount })}
                {amountToFiat({
                  amount: maxAmount,
                  selectedCurrency: selectedCurrency,
                  fiatRate: pageFiatRate
                })}
              </TData>
            </tr>
          }
        </React.Fragment>
      })}
    </TransactionCard>
  )
}

