import { MdSend } from 'react-icons/md'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowRemit = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<MdSend style={{ color: '#e67e22', fontSize: 20 }} title="Remit" />}
    >
      {/* Remit */}
    </TransactionRowCard>
  )
}
