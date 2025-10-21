import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormatWithIcon, amountToFiat, shortAddress } from '../../utils/format'
import Link from 'next/link'

// Component to display transaction flags with tooltips
const TransactionFlags = ({ flags }) => {
  if (!flags || typeof flags !== 'object') return <span className="grey">None</span>

  const activeFlags = []

  // Check each flag in the specification.flags object
  Object.entries(flags).forEach(([flagName, isActive]) => {
    if (isActive === true) {
      activeFlags.push(flagName)
    }
  })

  if (activeFlags.length === 0) {
    return <span className="grey">None</span>
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeFlags.map((flag, index) => (
          <div key={index}>
            <span className="no-brake">
              <span className="flag">{flag}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

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
          <TransactionFlags flags={specification.flags} txType={data?.tx?.TransactionType} />
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
              <TransactionFlags flags={transaction.specification.flags} txType={transaction.type} />
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

