import {
  AddressWithIconInline,
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
import {
  errorCodeDescription,
  shortErrorCode,
  dappBySourceTag,
  isConvertionTx,
  addressBalanceChanges
} from '../../../utils/transaction'
import { isTagValid, useWidth } from '../../../utils'
import { i18n } from 'next-i18next'
import { isIOUpayment, optionalAbsPaymentAmount } from '../../../utils/transaction/payment'
import CopyButton from '../../UI/CopyButton'

export const TransactionRowCard = ({ data, address, index, txTypeSpecial, children, selectedCurrency }) => {
  const width = useWidth()
  const { specification, tx, outcome } = data
  const memos = specification?.memos
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  const isConvertion = isConvertionTx(specification)
  const iouPayment = isIOUpayment(data)
  const sourceBalanceChangesList = addressBalanceChanges(data, address)

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
      <td className="bold center grey" style={{ width: 10, verticalAlign: 'top' }}>
        {index + 1}
      </td>
      <td className="left" style={{ width: 120, verticalAlign: 'top' }}>
        <span className={tx?.TransactionType !== 'Payment' ? 'bold' : ''}>{txTypeSpecial || tx?.TransactionType} </span>
        {!isConvertion && tx?.TransactionType === 'Payment' && (
          <>
            <AddressWithIconInline
              data={
                specification?.destination?.address === address
                  ? specification.source
                  : specification?.source?.address === address
                  ? specification.destination
                  : specification.source
              }
              options={{ short: 5 }}
            />
          </>
        )}
        {tx?.TransactionType === 'TrustSet' && (
          <>
            {specification.limit !== '0' && (
              <>
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
        {tx?.TransactionType === 'Payment' && (
          <>
            {(isConvertion || iouPayment) && sourceBalanceChangesList?.length > 0 && (
              <>
                <br />
                <br />
                {sourceBalanceChangesList.map((change, index) => (
                  <div key={index}>
                    {amountFormat(change, {
                      icon: true,
                      bold: true,
                      color: 'direction',
                      absolute: true
                    })}
                    {nativeCurrencyToFiat({
                      amount: optionalAbsPaymentAmount(change, isConvertion),
                      selectedCurrency,
                      fiatRate: pageFiatRate
                    })}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </td>
      <td className="left" style={{ maxWidth: width > 800 ? 800 : '100%', wordBreak: 'break-word' }}>
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
        {!isConvertion && specification?.destination?.address && (
          <>
            {specification?.source?.address === address ? (
              <>
                Destination: <span className="bold">{specification?.destination?.address}</span>{' '}
                <CopyButton text={specification?.destination?.address} />{' '}
              </>
            ) : (
              <>
                {specification?.destination?.address === address ? 'Sender' : 'Submitter'}:{' '}
                <span className="bold">{specification?.source?.address}</span>{' '}
                <CopyButton text={specification?.source?.address} />
              </>
            )}
            <br />
          </>
        )}
        {isTagValid(tx.DestinationTag) && (
          <>
            Destination tag: <span className="bold">{tx.DestinationTag}</span>
          </>
        )}
        {isTagValid(tx.SourceTag) && !dapp && (
          <>
            Source tag: <span className="bold">{tx.SourceTag}</span>
          </>
        )}
        <TxFiatRateContext.Provider value={pageFiatRate}>{children}</TxFiatRateContext.Provider>
        <span>
          {tx.TicketSequence && 'Ticket '}Sequence: {tx.Sequence || tx.TicketSequence}
        </span>
        <br />
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
