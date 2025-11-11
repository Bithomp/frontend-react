import {
  AddressWithIconFilled,
  amountFormat,
  dateFormat,
  nativeCurrencyToFiat,
  shortHash,
  timeFormat,
  timeFromNow
} from '../../../utils/format'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../../utils/common'
import { TxFiatRateContext } from './FiatRateContext'
import { LinkTx } from '../../../utils/links'
import { errorCodeDescription, shortErrorCode, dappBySourceTag, isConvertionTx } from '../../../utils/transaction'
import { useWidth } from '../../../utils'
import { i18n } from 'next-i18next'

export const TransactionRowCard = ({ data, address, index, txTypeSpecial, children, selectedCurrency }) => {
  const width = useWidth()
  const { specification, tx, outcome } = data
  const memos = specification?.memos
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  const isConvertion = isConvertionTx(specification)

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
      style={{
        background: !isSuccessful
          ? 'repeating-linear-gradient(45deg, rgba(255, 150, 0, 0.15), rgba(255, 180, 80, 0.15) 10px, transparent 10px, transparent 20px)'
          : 'none'
      }}
      className="border-b-1"
    >
      <td className="bold center" style={{ width: 10, verticalAlign: 'top' }}>
        {index + 1}
      </td>
      <td className="left" style={{ width: 100, verticalAlign: 'top' }}>
        <span className="bold">{txTypeSpecial || tx?.TransactionType} </span>
        {!isConvertion && tx?.TransactionType === 'Payment' && (
          <>
            <br />
            {specification?.destination?.address === address
              ? 'from'
              : specification?.source?.address === address
              ? 'to'
              : 'Payment by'}
          </>
        )}
        {tx?.TransactionType === 'TrustSet' && (
          <>
            {specification.limit === '0' ? (
              <span className="orange bold">removed</span>
            ) : (
              <>
                <span className="bold">set</span>
                {amountFormat(
                  {
                    currency: specification.currency,
                    issuer: specification.counterparty,
                    issuerDetails: specification.counterpartyDetails,
                    value: specification.limit
                  },
                  { icon: true, bold: true, color: 'orange', short: true }
                )}
              </>
            )}
          </>
        )}
      </td>
      <td className="left" style={{ maxWidth: width > 800 ? 800 : '100%', wordBreak: 'break-word' }}>
        {!isConvertion && tx?.TransactionType === 'Payment' && (
          <>
            {specification?.destination?.address === address ? (
              <AddressWithIconFilled data={specification.source} name="address" />
            ) : specification?.source?.address === address ? (
              <AddressWithIconFilled data={specification.destination} name="address" />
            ) : (
              addressUsernameOrServiceLink(specification.source, 'address')
            )}
          </>
        )}
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
        {tx.DestinationTag !== undefined && tx.DestinationTag !== null && (
          <>
            Destination tag: <span className="bold">{tx.DestinationTag}</span>
            <br />
          </>
        )}
        <span>
          {tx.TicketSequence && 'Ticket '}Sequence: {tx.Sequence || tx.TicketSequence}
        </span>
        <br />
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
                    <span>Memo{memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                    <span className="gray"> {memo.data}</span>
                  </>
                ) : (
                  <>
                    <span>
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
        Fee: {amountFormat(tx.Fee, { icon: true })}
        {nativeCurrencyToFiat({ amount: tx.Fee, selectedCurrency, fiatRate: pageFiatRate })}
        <br />
        Tx hash:{' '}
        <LinkTx tx={tx.hash} copy={true}>
          {width > 800 ? tx.hash : shortHash(tx.hash, 12)}
        </LinkTx>
      </td>
      <td className="right" style={{ width: 100, verticalAlign: 'top' }}>
        <span className="bold">{timeFromNow(tx.date, i18n, 'ripple')}</span>
        <br />
        <span className="grey">
          {dateFormat(tx.date, {}, { type: 'ripple' })}
          <br />
          {timeFormat(tx.date, 'ripple')}
        </span>
      </td>
    </tr>
  )
}
