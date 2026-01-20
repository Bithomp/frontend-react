import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { TransactionRowCard } from './TransactionRowCard'
import { FiDownload } from 'react-icons/fi'

export const TransactionRowImport = ({ data, address, index, selectedCurrency }) => {
  const { outcome, fiatRates } = data
  const fiatRate = fiatRates?.[selectedCurrency]
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency} icon={<FiDownload style={{ color: '#27ae60', fontSize: 20 }} title="Import" />}>
      <div>
        Received:{' '}
        {amountFormat(outcome?.deliveredAmount, {
          icon: true,
          bold: true,
          color: 'green',
          precise: true
        })}
        {nativeCurrencyToFiat({
          amount: outcome?.deliveredAmount,
          selectedCurrency,
          fiatRate
        })}
      </div>
    </TransactionRowCard>
  )
}
