import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowImport = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Import */}
    </TransactionRowCard>
  )
}