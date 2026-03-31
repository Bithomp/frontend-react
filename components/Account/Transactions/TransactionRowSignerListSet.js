import { TransactionRowCard } from './TransactionRowCard'
import { GiKeyring } from 'react-icons/gi'

export const TransactionRowSignerListSet = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<GiKeyring style={{ color: '#9b59b6', fontSize: 22 }} title="Signer List Set" />}
    >
      {/* Signer List Set */}
    </TransactionRowCard>
  )
}
