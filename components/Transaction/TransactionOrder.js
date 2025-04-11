import { TData } from '../TableDetails'
import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionOrder = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData>Quantity</TData>
        <TData>
          {specification.quantity.value} {specification.quantity.currency}
        </TData>
      </tr>
      <tr>
        <TData>Total Price</TData>
        <TData>
          {specification.totalPrice.value} {specification.totalPrice.currency} (
          <LinkAccount address={specification.totalPrice.counterparty} />)
        </TData>
      </tr>
    </TransactionCard>
  )
}
