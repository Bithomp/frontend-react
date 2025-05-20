import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'
import CopyButton from '../UI/CopyButton'

export const TransactionEnableAmendment = ({ data, pageFiatRate, selectedCurrency }) => {
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
      {specification.amendmentDetails?.name && (
        <tr>
          <TData>Amendment</TData>
          <TData className="bold">
            {specification.amendmentDetails.name} <CopyButton text={specification.amendmentDetails.name} />
          </TData>
        </tr>
      )}
      <tr>
        <TData>Amendment hash</TData>
        <TData>
          {specification.amendment} <CopyButton text={specification.amendment} />
        </TData>
      </tr>
      {specification.amendmentDetails?.introduced && (
        <tr>
          <TData>Introduced</TData>
          <TData>{specification.amendmentDetails?.introduced}</TData>
        </tr>
      )}
      {specification.amendmentDetails?.enabled !== undefined && (
        <tr>
          <TData>Enabled</TData>
          <TData>{specification.amendmentDetails.enabled ? 'true' : 'false'}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
