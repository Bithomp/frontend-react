import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowRemit = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Remit */}
    </TransactionRowCard>
  )
}