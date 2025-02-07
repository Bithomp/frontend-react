import { TData, TRow } from '../TableDetails'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionAmm = ({ data, pageFiatRate, selectedCurrency }) => {
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
    </TransactionCard>
  )
}
