import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowEscrow = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Escrow */}
    </TransactionRowCard>
  )
}
