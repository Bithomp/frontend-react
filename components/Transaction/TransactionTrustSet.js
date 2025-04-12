import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat } from '../../utils/format'

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
        <TData>Trust to the issuer</TData>
        <TData>
          <AddressWithIconFilled data={specification} name="counterparty" />
        </TData>
      </tr>
      <tr>
        <TData>Limit</TData>
        <TData className="bold">
          {amountFormat({
            value: specification.limit,
            currency: specification.currency,
            issuer: specification?.counterparty
          })}
        </TData>
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
