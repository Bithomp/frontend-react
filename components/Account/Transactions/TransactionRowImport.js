import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowImport = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Import */}
    </TransactionRowCard>
  )
}
