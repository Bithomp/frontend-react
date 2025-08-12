import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowEscrow = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
    >
      {/* Escrow */}
    </TransactionRowCard>
  )
}