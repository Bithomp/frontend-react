import { amountFormat } from '../../../utils/format'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowImport = ({ data, address, index, selectedCurrency }) => {
  const { outcome } = data
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      <div>
        Received:{' '}
        {amountFormat(outcome?.deliveredAmount, {
          icon: true,
          bold: true,
          color: 'green',
          precise: true
        })}
      </div>
    </TransactionRowCard>
  )
}
