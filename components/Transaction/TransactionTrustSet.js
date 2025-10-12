import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat } from '../../utils/format'

export const TransactionTrustSet = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx } = data

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
      {specification.ripplingDisabled !== undefined && (
        <tr>
          <TData>Rippling</TData>
          <TData>{specification.ripplingDisabled ? 'disabled' : 'enabled'}</TData>
        </tr>
      )}
      {tx?.QualityIn && (
        <tr>
          <TData>Quality in</TData>
          <TData className="bold">{tx.QualityIn / 10000000}%</TData>
        </tr>
      )}
      {tx?.QualityOut && (
        <tr>
          <TData>Quality out</TData>
          <TData className="bold">{tx.QualityOut / 10000000}%</TData>
        </tr>
      )}
      {specification.frozen !== undefined && (
        <tr>
          <TData>Frozen</TData>
          <TData>{specification.frozen ? 'yes' : 'no'}</TData>
        </tr>
      )}
      {specification.deepFrozen !== undefined && (
        <tr>
          <TData>Deep frozen</TData>
          <TData>{specification.deepFrozen ? 'yes' : 'no'}</TData>
        </tr>
      )}
      {specification.authorized && (
        <tr>
          <TData>Authorized</TData>
          <TData>yes</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
