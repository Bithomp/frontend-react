import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowEnableAmendment = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {/* Enable Amendment */}
    </TransactionRowCard>
  )
}
