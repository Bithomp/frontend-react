import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDelegateSet = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Delegate Set */}
    </TransactionRowCard>
  )
}