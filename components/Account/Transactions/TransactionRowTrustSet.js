import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowTrustSet = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Trust Set */}
    </TransactionRowCard>
  )
}
