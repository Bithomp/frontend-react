import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowSetRegularKey = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Set Regular Key */}
    </TransactionRowCard>
  )
}