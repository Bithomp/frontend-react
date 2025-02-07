import { TData, TRow } from '../TableDetails'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionSetRegularKey = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <TRow>
        <TData className="bold">New Regular key</TData>
        <TData>
          <AddressWithIconFilled data={specification} name="regularKey" />
        </TData>
      </TRow>
    </TransactionCard>
  )
}
