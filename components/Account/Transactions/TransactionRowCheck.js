import { TransactionRowCard } from './TransactionRowCard'
import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { useTxFiatRate } from './FiatRateContext'
import { dappBySourceTag } from '../../../utils/transaction'

export const TransactionRowCheck = ({ data, address, index, selectedCurrency }) => {
  const pageFiatRate = useTxFiatRate()

  const { outcome, specification } = data

  const checkChanges = outcome?.checkChanges

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)
  return (
    <TransactionRowCard data={data} address={address} index={index} selectedCurrency={selectedCurrency}>
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
    </TransactionRowCard>
  )
}
