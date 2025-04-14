import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionSetRegularKey = ({ data, pageFiatRate, selectedCurrency }) => {
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
        <TData className="bold">New Regular key</TData>
        <TData>
          <AddressWithIconFilled data={specification} name="regularKey" />
        </TData>
      </tr>
    </TransactionCard>
  )
}
