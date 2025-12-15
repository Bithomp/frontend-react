import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDetails = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Details */}
    </TransactionRowCard>
  )
}
