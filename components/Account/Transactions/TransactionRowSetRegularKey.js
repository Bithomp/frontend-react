import { TransactionRowCard } from './TransactionRowCard'
import { FiKey } from 'react-icons/fi'

export const TransactionRowSetRegularKey = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<FiKey style={{ color: '#9b59b6', fontSize: 20 }} title="Set Regular Key" />}
    >
      {/* Set Regular Key */}
    </TransactionRowCard>
  )
}
