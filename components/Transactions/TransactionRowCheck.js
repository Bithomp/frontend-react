import { TransactionRowCard } from './TransactionRowCard'
import { amountFormat, nativeCurrencyToFiat, addressUsernameOrServiceLink } from '../../utils/format'
import { useTxFiatRate } from './FiatRateContext'

 const TransactionRowCheckContent = ({ tx, selectedCurrency}) => {
  const pageFiatRate = useTxFiatRate()

  const { outcome } = tx

  const checkChanges = outcome?.checkChanges

  return (
    <>
      {checkChanges?.sendMax && (
        <div>
          <span>Max amount: </span>
          <span>
            <span className="bold orange">{amountFormat(checkChanges.sendMax, { icon: true })}</span>
            {checkChanges.sendMax?.issuer && (
              <>({addressUsernameOrServiceLink(checkChanges.sendMax, 'issuer', { short: true })})</>
            )}
            {nativeCurrencyToFiat({
              amount: checkChanges.sendMax,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
          </span>
        </div>
      )}
    </>
  )
}

export const TransactionRowCheck = ({ tx, address, index, selectedCurrency}) => {
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
    >
      <TransactionRowCheckContent 
        tx={tx} 
        selectedCurrency={selectedCurrency} 
      />
    </TransactionRowCard>
  )
}
