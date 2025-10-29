import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowRemit = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Remit */}
    </TransactionRowCard>
  )
}
