import { TransactionRowCard } from './TransactionRowCard'
import { addressUsernameOrServiceLink, amountFormat, tokenToFiat } from '../../../utils/format'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { MdDeleteSweep } from 'react-icons/md'
import { useTranslation } from 'next-i18next'

export const TransactionRowAccountDelete = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, fiatRates } = data
  const { t } = useTranslation('account')
  const fiatRate = fiatRates?.[selectedCurrency]
  const isDestination = specification?.destination?.address === address

  return (
    <TransactionRowCard
      data={data}
      address={address}
      selectedCurrency={selectedCurrency}
      index={index}
      txTypeSpecial={
        <span className="bold">
          {isDestination
            ? t('detail.transactions.payment-from-deleted-account')
            : t('detail.transactions.deleted-account')}
        </span>
      }
      icon={<MdDeleteSweep style={{ color: '#111', fontSize: 20 }} title="Account removed" />}
    >
      <div className="flex items-center gap-1">
        {isDestination ? (
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
          {tokenToFiat({
            amount: outcome?.deliveredAmount,
            selectedCurrency,
            fiatRate
          })}
        </div>
      )}
    </TransactionRowCard>
  )
}
