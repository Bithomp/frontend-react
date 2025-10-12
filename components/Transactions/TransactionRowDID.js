import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowDID = ({ tx, address, index, selectedCurrency}) => {

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* DID */}
    </TransactionRowCard>
  )
}