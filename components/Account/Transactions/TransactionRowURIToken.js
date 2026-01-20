import { TransactionRowCard } from './TransactionRowCard'
import { FaLink } from 'react-icons/fa'

export const TransactionRowURIToken = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<FaLink style={{ color: '#2980ef', fontSize: 20 }} title="URI Token" />}
    >
      {/* URI Token */}
    </TransactionRowCard>
  )
}
