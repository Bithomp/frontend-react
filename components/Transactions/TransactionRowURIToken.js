import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowURIToken = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* URI Token */}
    </TransactionRowCard>
  )
}