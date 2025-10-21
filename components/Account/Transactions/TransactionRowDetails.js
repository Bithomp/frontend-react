
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDetails = ({ tx, address, index, selectedCurrency}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
    >
      {/* Details */}
    </TransactionRowCard>
  )
}