import { amountFormat, showFlags } from '../../../utils/format'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowTrustSet = ({ data, address, index, selectedCurrency }) => {
  const { specification } = data
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {amountFormat(
        {
          currency: specification.currency,
          issuer: specification.counterparty,
          issuerDetails: specification.counterpartyDetails,
          value: specification.limit
        },
        { icon: true, withIssuer: true, bold: true, color: 'orange' }
      )}
      <span className="flex gap-1">Flags: {showFlags(specification.flags)}</span>
    </TransactionRowCard>
  )
}
