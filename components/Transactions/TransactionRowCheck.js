import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowCheck = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Check */}
    </TransactionRowCard>
  )
}