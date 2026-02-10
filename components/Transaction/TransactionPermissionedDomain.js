import { TData } from '../Table'
import React from 'react'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionPermissionedDomain = ({ data, pageFiatRate, selectedCurrency }) => {
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

      {specification.acceptedCredentials?.length > 0 &&
        specification.acceptedCredentials.map((cred, i) => (
          <React.Fragment key={i}>
            <tr>
              <td colSpan={2}>
                <hr />
              </td>
            </tr>
            <tr>
              <TData className="bold">
                Accepted credential{specification.acceptedCredentials.length > 1 ? ' ' + (i + 1) : ''}
              </TData>
              <TData></TData>
            </tr>
            <tr>
              <TData>Issuer</TData>
              <TData>
                <AddressWithIconFilled data={{ address: cred.issuer || cred.Issuer }} name="address" />
              </TData>
            </tr>
            <tr>
              <TData>Type</TData>
              <TData>{cred.type}</TData>
            </tr>
            <tr>
              <td colSpan={2}>
                <hr />
              </td>
            </tr>
          </React.Fragment>
        ))}
    </TransactionCard>
  )
}
