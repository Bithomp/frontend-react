import { TransactionRowCard } from './TransactionRowCard'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'
import { amountFormat, nativeCurrencyToFiat, addressUsernameOrServiceLink } from '../../utils/format'

export const TransactionRowCheck = ({ tx, address, index, selectedCurrency}) => {
  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !tx?.outcome) return
    const { ledgerTimestamp } = tx?.outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, tx])

  const { outcome } = tx

  const checkChanges = outcome?.checkChanges

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
    >
      {checkChanges.sendMax && (
        <div>
          <span>Max amount: </span>
          <span>
            <span className="bold orange">{amountFormat(checkChanges.sendMax)}</span>
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
    </TransactionRowCard>
  )
}