import { TransactionRowCard } from './TransactionRowCard'
import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { useTxFiatRate } from './FiatRateContext'
import { dappBySourceTag } from '../../../utils/transaction'

const TransactionRowCheckContent = ({ tx, selectedCurrency }) => {
  const pageFiatRate = useTxFiatRate()

  const { outcome, specification } = tx

  const checkChanges = outcome?.checkChanges

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)

  return (
    <>
      {checkChanges?.sendMax && (
        <div>
          <span>Max amount: </span>
          <span>
            {amountFormat(checkChanges.sendMax, { icon: true, withIssuer: true, bold: true, color: 'orange' })}
            {nativeCurrencyToFiat({
              amount: checkChanges.sendMax,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
          </span>
        </div>
      )}

      {checkChanges?.source?.tag !== undefined && !dapp && (
        <>
          <span>Source tag:</span>
          <span className="bold">{checkChanges.source.tag}</span>
        </>
      )}
    </>
  )
}

export const TransactionRowCheck = ({ tx, address, index, selectedCurrency }) => {
  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      <TransactionRowCheckContent tx={tx} selectedCurrency={selectedCurrency} />
    </TransactionRowCard>
  )
}
