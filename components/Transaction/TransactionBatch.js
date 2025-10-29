import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat, amountToFiat, showFlags } from '../../utils/format'
import { LinkTx } from '../../utils/links'

export const TransactionBatch = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, outcome } = data

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
      {outcome?.parentBatchID && (
        <tr>
          <TData>Parent batch ID</TData>
          <TData>
            <LinkTx tx={outcome?.parentBatchID} />
          </TData>
        </tr>
      )}
      <tr>
        <TData>Flags</TData>
        <TData>{showFlags(specification?.flags)}</TData>
      </tr>
      {specification?.transactions?.map((transaction, index) => {
        const maxAmount = transaction.specification?.source?.maxAmount
        return (
          <React.Fragment key={transaction.id || index}>
            <tr>
              <TData className="bold">Transaction {index + 1}</TData>
            </tr>
            <tr>
              <TData>ID</TData>
              <TData>
                <LinkTx tx={transaction?.id} />
              </TData>
            </tr>
            <tr>
              <TData>Type</TData>
              <TData>
                <span className="bold">{transaction?.type}</span>
              </TData>
            </tr>
            <tr>
              <TData>Sequence</TData>
              <TData>#{transaction?.sequence}</TData>
            </tr>
            <tr>
              <TData>Flags</TData>
              <TData>{showFlags(transaction?.specification?.flags)}</TData>
            </tr>
            {transaction?.specification?.destination && (
              <tr>
                <TData>Destination</TData>
                <TData>
                  <AddressWithIconFilled data={transaction.specification.destination} name="address" />
                </TData>
              </tr>
            )}
            {maxAmount && (
              <tr>
                <TData>Max Amount</TData>
                <TData style={{ display: 'flex' }}>
                  {amountFormat(maxAmount, { icon: true, presice: 'nice' })}{' '}
                  {amountToFiat({
                    amount: maxAmount,
                    selectedCurrency: selectedCurrency,
                    fiatRate: pageFiatRate
                  })}
                </TData>
              </tr>
            )}
          </React.Fragment>
        )
      })}
    </TransactionCard>
  )
}
