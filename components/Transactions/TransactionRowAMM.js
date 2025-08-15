import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAMM = ({ tx, address, index, selectedCurrency}) => {
  
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
    >
      {/* AMM */}
    </TransactionRowCard>
  )
}