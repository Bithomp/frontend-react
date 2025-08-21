import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowTrustSet = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
    >
      {/* Trust Set */}
    </TransactionRowCard>
  )
}