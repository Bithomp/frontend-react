import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowPayment = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Payment */}
    </TransactionRowCard>
  )
}