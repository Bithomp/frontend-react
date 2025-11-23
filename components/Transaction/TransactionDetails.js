import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, showFlags } from '../../utils/format'

export const TransactionDetails = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data
  const flags = showFlags(specification?.flags)

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      notFullySupported={true}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification?.source} name="address" />
        </TData>
      </tr>
      {flags && (
        <tr>
          <TData>Flags</TData>
          <TData>{flags}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
