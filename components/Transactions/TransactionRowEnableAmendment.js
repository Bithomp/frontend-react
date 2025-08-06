import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowEnableAmendment = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Enable Amendment */}
    </TransactionRowCard>
  )
}