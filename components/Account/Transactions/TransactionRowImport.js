import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowImport = ({ data, address, index, selectedCurrency }) => {
  const { outcome } = data
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
      {(fiatRate) => (
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
      )}
    </TransactionRowCard>
  )
}
