import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAccountDelete = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Account Delete */}
    </TransactionRowCard>
  )
}