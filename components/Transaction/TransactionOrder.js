import { TData, TRow } from '../TableDetails'
import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'

export const TransactionOrder = ({ data }) => {
  if (!data) return null
  const { tx, specification } = data

  return (
    <TransactionCard data={data}>
      <TRow>
        <TData>Initiated by:</TData>
        <TData>
          <LinkAccount address={tx.Account} />
        </TData>
      </TRow>
      <TRow>
        <TData>Quantity:</TData>
        <TData>
          {specification.quantity.value} {specification.quantity.currency}
        </TData>
      </TRow>
      <TRow>
        <TData>Total Price:</TData>
        <TData>
          {specification.totalPrice.value} {specification.totalPrice.currency} (
          <LinkAccount address={specification.totalPrice.counterparty} />)
        </TData>
      </TRow>
    </TransactionCard>
  )
}
