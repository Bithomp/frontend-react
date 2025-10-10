import { amountFormat, dateFormat, nativeCurrencyToFiat, timeFormat } from '../../utils/format'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../utils/common'
import { TxFiatRateContext } from './FiatRateContext'
import { LinkTx } from '../../utils/links'
import { errorCodeDescription, shortErrorCode, dappBySourceTag } from '../../utils/transaction'
import { useWidth } from '../../utils'
import { FiCalendar, FiClock } from 'react-icons/fi'

export const TransactionRowCard = ({ data, index, txTypeSpecial, children, selectedCurrency }) => {
  const width = useWidth()
  const { specification, tx, outcome } = data
  const date = dateFormat(tx.date + 946684800)
  const time = timeFormat(tx.date + 946684800)
  const memos = specification?.memos
  const isSuccessful = outcome?.result == 'tesSUCCESS'

  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !outcome?.ledgerTimestamp) return
    fetchHistoricalRate({
      timestamp: outcome.ledgerTimestamp * 1000,
      selectedCurrency,
      setPageFiatRate
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, outcome?.ledgerTimestamp])

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(tx.SourceTag)

  return (
    <tr
      index={index}
      style={{
        background: !isSuccessful
          ? 'repeating-linear-gradient(45deg, rgba(129, 111, 77, 0.3), rgba(249, 227, 185, 0.3), transparent 10px, transparent 20px)'
          : ''
      }}
      className="border-b-1"
      suppressHydrationWarning
    >
      <td className="bold center" style={{ width: 10 }}>
        {index + 1}
      </td>
      <td className="left" style={{ width: 70 }}>
        <span className="flex items-center gap-1" suppressHydrationWarning>
          <FiCalendar style={{ stroke: '#666' }} /> {date}
        </span>
        <span className="flex items-center gap-1" suppressHydrationWarning>
          <FiClock style={{ stroke: '#666' }} /> {time}
        </span>
      </td>
      <td className="left" style={{ maxWidth: width > 800 ? 800 : '100%', wordBreak: 'break-word' }}>
        <span className="flex items-center gap-1">
          <span>Transaction hash: </span>
          {width > 800 ? <LinkTx tx={tx.hash}>{tx.hash}</LinkTx> : <LinkTx tx={tx.hash} short={10} />}
        </span>
        <span>Type: </span>
        <span className="bold">{txTypeSpecial || tx?.TransactionType}</span>
        <br />

        <TxFiatRateContext.Provider value={pageFiatRate}>{children}</TxFiatRateContext.Provider>
        {outcome && !isSuccessful && (
          <>
            <span className="bold">Failure: </span>
            <span className="red bold">{shortErrorCode(outcome.result)}</span>
            <br />
            <span className="bold">Description: </span>
            <span className="orange bold">{errorCodeDescription(outcome.result)}</span>
            <br />
          </>
        )}
        <span>Fee: </span>
        <span className="bold">{amountFormat(tx.Fee, { icon: true })}</span>
        <span>{nativeCurrencyToFiat({ amount: tx.Fee, selectedCurrency, fiatRate: pageFiatRate })}</span>
        <br />
        {tx.DestinationTag !== undefined && tx.DestinationTag !== null && (
          <>
            <span className="gray">Destination tag: {tx.DestinationTag}</span>
            <br />
          </>
        )}
        {tx.Sequence ? (
          <>
            <span className="gray">Sequence: {tx.Sequence}</span>
            <br />
          </>
        ) : ''}
        {(dapp ||
          (tx?.SourceTag !== undefined &&
            tx.TransactionType !== 'Payment' &&
            !tx.TransactionType?.includes('Check'))) && (
          <>
            <span>Source tag: </span>
            <span>{tx?.SourceTag}</span>
          </>
        )}
        {memos && memos.length > 0 && (
          <>
            {memos.map((memo, idx) => (
              <div key={idx}>
                {memo.data ? (
                  <>
                    <span className="bold">Memo{memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                    <span className="gray"> {memo.data}</span>
                  </>
                ) : (
                  <>
                    <span className="bold">
                      {memo.type}
                      {memos.length > 1 ? ` (${idx + 1})` : ''}:
                    </span>
                    <span className="gray"> {memo.format}</span>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </td>
    </tr>
  )
}
