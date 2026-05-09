import { TransactionRowCard } from './TransactionRowCard'
import { getTransactionNftPreview } from '../../../utils/transaction/nftPreview'
import { FaLink } from 'react-icons/fa'

export const TransactionRowURIToken = ({ data, address, index, selectedCurrency }) => {
  const nftPreview = getTransactionNftPreview(data)

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      icon={<FaLink style={{ color: '#2980ef', fontSize: 20 }} title="URI Token" />}
      nftPreview={nftPreview}
    >
      {/* URI Token */}
    </TransactionRowCard>
  )
}
