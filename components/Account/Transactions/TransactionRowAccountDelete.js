import { TransactionRowCard } from './TransactionRowCard'
import { addressUsernameOrServiceLink, amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { FiDownload, FiUpload } from 'react-icons/fi'

export const TransactionRowAccountDelete = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification } = data
  return (
    <TransactionRowCard data={data} address={address} selectedCurrency={selectedCurrency} index={index}>
      {(fiatRate) => (
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
                fiatRate
              })}
            </div>
          )}
        </>
      )}
    </TransactionRowCard>
  )
}
