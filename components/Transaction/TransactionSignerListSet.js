import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

export const TransactionSignerListSet = ({ data, pageFiatRate, selectedCurrency }) => {
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
        <TData>Signer quorum</TData>
        <TData className="bold">{specification.signerQuorum}</TData>
      </tr>
      {specification?.signerEntries?.map((entry, index) => (
        <tr key={index}>
          <TData>
            Signer {index + 1}
            <br />
            Weight: <span className="bold">{entry.signerWeight}</span>
          </TData>
          <TData>
            <AddressWithIconFilled data={entry} name="account" />
          </TData>
        </tr>
      ))}
    </TransactionCard>
  )
}
