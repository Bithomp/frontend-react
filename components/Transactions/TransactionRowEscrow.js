import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowEscrow = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Escrow */}
    </TransactionRowCard>
  )
}