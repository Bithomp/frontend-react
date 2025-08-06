import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowOffer = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Offer */}
    </TransactionRowCard>
  )
}