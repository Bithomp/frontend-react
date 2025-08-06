import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDID = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* DID */}
    </TransactionRowCard>
  )
}