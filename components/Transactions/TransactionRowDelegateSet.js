import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDelegateSet = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Delegate Set */}
    </TransactionRowCard>
  )
}