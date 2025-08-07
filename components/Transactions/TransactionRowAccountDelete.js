import { TransactionRowCard } from './TransactionRowCard'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'
import { addressUsernameOrServiceLink, amountFormat, nativeCurrencyToFiat } from '../../utils/format'
import { FiDownload, FiUpload } from 'react-icons/fi'


export const TransactionRowAccountDelete = ({ tx, address, index, selectedCurrency}) => {
  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !tx?.outcome) return
    const { ledgerTimestamp } = tx?.outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, tx])

  const { outcome, specification } = tx

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      pageFiatRate={pageFiatRate}
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
          <span className="green">{amountFormat(outcome?.deliveredAmount, { precise: 'nice' })}</span>
          {nativeCurrencyToFiat({
            amount: outcome?.deliveredAmount,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
      </div>)}
    </TransactionRowCard>
  )
}