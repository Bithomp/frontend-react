import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAccountSet = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Account Set */}
    </TransactionRowCard>
  )
}