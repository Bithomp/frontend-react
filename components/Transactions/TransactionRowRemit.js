import { TransactionRowCard } from './TransactionRowCard'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'

export const TransactionRowRemit = ({ tx, address, index, selectedCurrency}) => {
  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !tx?.outcome) return
    const { ledgerTimestamp } = tx?.outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, tx])

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
    >
      {/* Remit */}
    </TransactionRowCard>
  )
}