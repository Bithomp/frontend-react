import { TData, TRow } from '../TableDetails'
import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionOrder = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <TRow>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </TRow>
      <TRow>
        <TData>Quantity</TData>
        <TData>
          {specification.quantity.value} {specification.quantity.currency}
        </TData>
      </TRow>
      <TRow>
        <TData>Total Price</TData>
        <TData>
          {specification.totalPrice.value} {specification.totalPrice.currency} (
          <LinkAccount address={specification.totalPrice.counterparty} />)
        </TData>
      </TRow>
    </TransactionCard>
  )
}
