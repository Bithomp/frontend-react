import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat, niceCurrency } from '../../utils/format'

export const TransactionTrustSet = ({ data, pageFiatRate, selectedCurrency }) => {
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
        <TData>Counterparty</TData>
        <TData>
          <AddressWithIconFilled data={specification} name="counterparty" />
        </TData>
      </tr>
      <tr>
        <TData>Currency</TData>
        <TData className="bold">{niceCurrency(specification.currency)}</TData>
      </tr>
      <tr>
        <TData>Limit</TData>
        <TData>{amountFormat(specification.limit)}</TData>
      </tr>
      <tr>
        <TData>Rippling</TData>
        <TData>{specification.ripplingDisabled ? 'disabled' : 'enabled'}</TData>
      </tr>
      <tr>
        <TData>Frozen</TData>
        <TData>{specification.frozen ? 'yes' : 'no'}</TData>
      </tr>
      <tr>
        <TData>Authorized</TData>
        <TData>{specification.authorized ? 'yes' : 'no'}</TData>
      </tr>
    </TransactionCard>
  )
}
