import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDID = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* DID */}
    </TransactionRowCard>
  )
}
