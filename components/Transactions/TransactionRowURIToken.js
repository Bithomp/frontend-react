import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowURIToken = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* URI Token */}
    </TransactionRowCard>
  )
}