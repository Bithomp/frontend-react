import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, shortHash } from '../../utils/format'
import Link from 'next/link'

export const TransactionDelegateSet = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { outcome } = data
  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={outcome.delegateChanges.accountDetails} name="address" />
        </TData>
      </tr>
      {outcome.delegateChanges.authorize && (
        <tr>
          <TData>Authorized delegate</TData>
          <TData>
            <AddressWithIconFilled data={outcome.delegateChanges.authorizeDetails} name="address" />
          </TData>
        </tr>
      )}
      {outcome.delegateChanges?.permissions?.length > 0 && (
        <tr>
          <TData>Permissions</TData>
          <TData>
            {outcome.delegateChanges.permissions.map((permission, index) => (
              <span key={index} className="flag">
                {permission}
              </span>
            ))}
          </TData>
        </tr>
      )}
      {outcome.delegateChanges.status && (
        <tr>
          <TData>Status</TData>
          <TData className="bold">{outcome.delegateChanges.status}</TData>
        </tr>
      )}
      {outcome.delegateChanges?.delegateIndex && (
        <tr>
          <TData>Delegate index</TData>
          <TData>
            <Link href={`/object/${outcome.delegateChanges.delegateIndex}`}>
              {shortHash(outcome.delegateChanges.delegateIndex)}
            </Link>
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}
