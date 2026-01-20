import { TransactionRowCard } from './TransactionRowCard'
import { LuFileCheck2 } from 'react-icons/lu'

export const TransactionRowEnableAmendment = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency} icon={<LuFileCheck2 style={{ color: '#2980ef', fontSize: 20 }} title="Enable Amendment" />}>
      {/* Enable Amendment */}
    </TransactionRowCard>
  )
}
