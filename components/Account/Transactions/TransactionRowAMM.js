import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAMM = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* AMM */}
    </TransactionRowCard>
  )
}
