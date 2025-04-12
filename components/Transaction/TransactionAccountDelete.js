import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat, nativeCurrencyToFiat } from '../../utils/format'

export const TransactionAccountDelete = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, outcome } = data

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData>Destination</TData>
        <TData>
          <AddressWithIconFilled data={specification.destination} name="address" />
        </TData>
      </tr>
      {specification.destination?.tag !== undefined && (
        <tr>
          <TData>Destination tag</TData>
          <TData className="bold">{specification.destination.tag}</TData>
        </tr>
      )}
      <tr>
        <TData>Delivered amount</TData>
        <TData className="bold">
          <span className="green">{amountFormat(outcome.deliveredAmount)}</span>
          {nativeCurrencyToFiat({
            amount: outcome.deliveredAmount,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
        </TData>
      </tr>
    </TransactionCard>
  )
}
