import { TData } from './TData'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'
import { useTranslation } from 'next-i18next'

export const TransactionSignerListSet = ({ data, pageFiatRate, selectedCurrency }) => {
  const { t: txT } = useTranslation('transaction')

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
            {txT('labels.signerNumberNoColon', { number: index + 1 })}
            <br />
            {txT('labels.Weight')}: <span className="bold">{entry.signerWeight}</span>
          </TData>
          <TData>
            <AddressWithIconFilled data={entry} name="account" />
          </TData>
        </tr>
      ))}
    </TransactionCard>
  )
}
