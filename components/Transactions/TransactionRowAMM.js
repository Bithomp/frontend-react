import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAMM = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* AMM */}
    </TransactionRowCard>
  )
}