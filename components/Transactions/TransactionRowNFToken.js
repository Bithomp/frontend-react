import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowNFToken = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* NFToken */}
    </TransactionRowCard>
  )
}