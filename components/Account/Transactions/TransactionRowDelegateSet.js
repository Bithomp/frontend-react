import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDelegateSet = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Delegate Set */}
    </TransactionRowCard>
  )
}
