
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDetails = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Details */}
    </TransactionRowCard>
  )
}