import { TransactionRowCard } from './TransactionRowCard'
import { GiPassport } from 'react-icons/gi'

export const TransactionRowDID = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<GiPassport style={{ color: '#2980ef', fontSize: 20 }} title="DID" />}
    >
      {/* DID */}
    </TransactionRowCard>
  )
}
