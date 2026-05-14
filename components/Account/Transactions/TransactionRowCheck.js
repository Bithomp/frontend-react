import { TransactionRowCard } from './TransactionRowCard'
import { AddressWithIconInline, amountFormat, tokenToFiat } from '../../../utils/format'
import { FaMoneyCheckAlt } from 'react-icons/fa'

export const TransactionRowCheck = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, tx, fiatRates } = data

  const fiatRate = fiatRates?.[selectedCurrency]
  const sendMax = tx?.TransactionType === 'CheckCreate' ? specification?.sendMax : null

  const checkTypeLabels = {
    CheckCreate: 'Check creation',
    CheckCash: 'Check cashing',
    CheckCancel: 'Check cancelation'
  }

  const txTypeSpecial = (
    <span className="bold">
      {tx?.Destination === address ? (
        <>
          Incoming check from
          <br />
          <AddressWithIconInline data={specification.source} options={{ short: 5 }} />
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
