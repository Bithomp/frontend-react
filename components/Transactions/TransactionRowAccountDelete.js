import { TransactionRowCard } from './TransactionRowCard'
import { addressUsernameOrServiceLink, amountFormat, nativeCurrencyToFiat } from '../../utils/format'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { useTxFiatRate } from './FiatRateContext'

export const TransactionRowAccountDelete = ({ tx, address, index, selectedCurrency}) => {
  const pageFiatRate = useTxFiatRate()

  const { outcome, specification } = tx

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
    >
      <div className="flex items-center gap-1">
        {specification?.destination?.address === address ? (
          <>              
            <FiDownload style={{ stroke: 'green', fontSize: 16 }}/>
            <span>
              {addressUsernameOrServiceLink(specification?.source, 'address')}
            </span>
          </>
        ) : (
          <>
            <FiUpload style={{ stroke: 'red', fontSize: 16 }}/>
            <span>
              {addressUsernameOrServiceLink(specification?.destination, 'address')}
            </span>
          </>
        )}
      </div>
      {outcome?.deliveredAmount && (
        <div>
          <span className="bold">Delivered amount: </span>
          <span className="green">{amountFormat(outcome?.deliveredAmount, { precise: 'nice', icon: true })}</span>
          {nativeCurrencyToFiat({
            amount: outcome?.deliveredAmount,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
        </div>)}
    </TransactionRowCard>
  )
}