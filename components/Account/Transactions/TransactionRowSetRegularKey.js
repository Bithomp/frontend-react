import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowSetRegularKey = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Set Regular Key */}
    </TransactionRowCard>
  )
}
