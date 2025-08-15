import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowSetRegularKey = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Set Regular Key */}
    </TransactionRowCard>
  )
}