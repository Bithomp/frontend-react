import { TData, TRow } from '../TableDetails'

import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'

export const TransactionAmm = ({ data }) => {
  if (!data) return null
  const { tx } = data

  return (
    <TransactionCard data={data}>
      <TRow>
        <TData>Initiated by:</TData>
        <TData>
          <LinkAccount address={tx.Account} />
        </TData>
      </TRow>
    </TransactionCard>
  )
}
