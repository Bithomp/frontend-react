import { TransactionRowCard } from './TransactionRowCard'
import { AddressWithIconInline, amountFormat, tokenToFiat } from '../../../utils/format'
import { FaMoneyCheckAlt } from 'react-icons/fa'
import { useTranslation } from 'next-i18next'

export const TransactionRowCheck = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, tx, fiatRates } = data
  const { t } = useTranslation('account')

  const fiatRate = fiatRates?.[selectedCurrency]
  const sendMax = tx?.TransactionType === 'CheckCreate' ? specification?.sendMax : null

  const checkTypeLabels = {
    CheckCreate: t('detail.transactions.check-created'),
    CheckCash: t('detail.transactions.check-redeemed'),
    CheckCancel: t('detail.transactions.check-canceled')
  }

  const txTypeSpecial = (
    <span className="bold">
      {tx?.TransactionType === 'CheckCreate' && tx?.Destination === address ? (
        <>
          {t('detail.transactions.check-received-from')}
          <br />
          <AddressWithIconInline data={specification.source} options={{ labelClassName: 'responsive-address' }} />
        </>
      ) : (
        checkTypeLabels[tx?.TransactionType] || tx?.TransactionType
      )}
    </span>
  )

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
      icon={<FaMoneyCheckAlt style={{ color: '#27ae60', fontSize: 20 }} title="Check" />}
    >
      {sendMax && (
        <div>
          Max amount:{' '}
          {amountFormat(sendMax, {
            icon: true,
            withIssuer: true,
            bold: true,
            color: 'orange',
            precise: 'nice'
          })}
          {tokenToFiat({
            amount: sendMax,
            selectedCurrency,
            fiatRate
          })}
        </div>
      )}
      {outcome?.deliveredAmount && (
        <div>
          {tx?.Account === address ? 'Received' : 'Amount'}:{' '}
          {amountFormat(outcome?.deliveredAmount, {
            icon: true,
            bold: true,
            color: 'direction',
            precise: 'nice'
          })}
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
