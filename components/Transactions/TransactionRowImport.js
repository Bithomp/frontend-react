import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowImport = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Import */}
    </TransactionRowCard>
  )
}