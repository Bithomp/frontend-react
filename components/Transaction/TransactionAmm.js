import { TData, TRow } from '../TableDetails'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionAmm = ({ data }) => {
  if (!data) return null
  const { specification } = data

  return (
    <TransactionCard data={data}>
      <TRow>
        <TData>Initiated by:</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </TRow>
    </TransactionCard>
  )
}
