import { TransactionRowCard } from './TransactionRowCard'
import { FaUserShield } from 'react-icons/fa'

export const TransactionRowDelegateSet = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency} icon={<FaUserShield style={{ color: '#1abc9c', fontSize: 20 }} title="Delegate Set" />}>
      {/* Delegate Set */}
    </TransactionRowCard>
  )
}
