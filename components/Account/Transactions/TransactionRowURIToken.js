import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowURIToken = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* URI Token */}
    </TransactionRowCard>
  )
}
