import { TransactionRowCard } from './TransactionRowCard'
import { addressUsernameOrServiceLink, amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { useTxFiatRate } from './FiatRateContext'

const TransactionRowAccountDeleteContent = ({ tx, address, selectedCurrency }) => {
  const pageFiatRate = useTxFiatRate()
  const { outcome, specification } = tx

  return (
    <>
      <div className="flex items-center gap-1">
        {specification?.destination?.address === address ? (
          <>
            <FiDownload style={{ stroke: 'green', fontSize: 16 }} />
            <span>{addressUsernameOrServiceLink(specification?.source, 'address')}</span>
          </>
        ) : (
          <>
            <FiUpload style={{ stroke: 'red', fontSize: 16 }} />
            <span>{addressUsernameOrServiceLink(specification?.destination, 'address')}</span>
          </>
        )}
      </div>
      {outcome?.deliveredAmount && (
        <div>
          <span>Delivered amount: </span>
          <span className="green bold">{amountFormat(outcome?.deliveredAmount, { icon: true })}</span>
          {nativeCurrencyToFiat({
            amount: outcome?.deliveredAmount,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
        </div>
      )}
    </>
  )
}

export const TransactionRowAccountDelete = ({ tx, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      <TransactionRowAccountDeleteContent tx={tx} address={address} selectedCurrency={selectedCurrency} />
    </TransactionRowCard>
  )
}
