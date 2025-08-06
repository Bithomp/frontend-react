import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowRemit = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Remit */}
    </TransactionRowCard>
  )
}