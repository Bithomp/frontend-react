import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionSetRegularKey = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data
  const regularKey = specification?.regularKey
  const hasNewRegularKey = typeof regularKey === 'string' && regularKey.length > 0

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData className="bold">Regular key</TData>
        <TData>
          {hasNewRegularKey ? (
            <AddressWithIconFilled data={{ ...specification, regularKey }} name="regularKey" />
          ) : (
            <span className="orange">removed</span>
          )}
        </TData>
      </tr>
    </TransactionCard>
  )
}
