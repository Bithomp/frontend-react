import { TransactionRowCard } from './TransactionRowCard'
import { BsFillSafeFill } from 'react-icons/bs'

export const TransactionRowEscrow = ({ data, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<BsFillSafeFill style={{ color: '#2980ef', fontSize: 20 }} title="Escrow" />}
    >
      {/* Escrow */}
    </TransactionRowCard>
  )
}
