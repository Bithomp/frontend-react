import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowTrustSet = ({ tx, address, index}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
    >
      {/* Trust Set */}
    </TransactionRowCard>
  )
}