import {
  amountFormat,
  dateFormat,
  fullDateAndTime,
  nativeCurrencyToFiat,
  shortHash,
  timeFormat,
  timeFromNow
} from '../../../utils/format'
import { useEffect, useState } from 'react'
import { fetchHistoricalRate } from '../../../utils/common'
import { LinkTx } from '../../../utils/links'
import {
  errorCodeDescription,
  shortErrorCode,
  dappBySourceTag,
  isConvertionTx,
  addressBalanceChanges,
  memoNode
} from '../../../utils/transaction'
import { isTagValid, useWidth } from '../../../utils'
import { i18n } from 'next-i18next'
import CopyButton from '../../UI/CopyButton'
import { useIsMobile } from '../../../utils/mobile'

export const TransactionRowCard = ({ data, address, index, txTypeSpecial, children, selectedCurrency }) => {
  const width = useWidth()
  const { specification, tx, outcome } = data
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  const isConvertion = isConvertionTx(specification)
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

  const sequence = tx.TicketSequence || tx.Sequence

  const addressIsSource = specification?.source?.address === address

  const isMobile = useIsMobile(600)

  const typeNode = txTypeSpecial || <span className="bold">{tx?.TransactionType}</span>

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
      {!isMobile && (
        <td style={{ width: 120, verticalAlign: 'top' }}>
          {typeNode}
          <br />
          <br />
          {sourceBalanceChangesList?.map((change, index) => (
            <div key={index}>
              {amountFormat(change, {
                icon: true,
                bold: true,
                color: 'direction',
                showPlus: true,
                short: true
              })}
            </div>
          ))}
        </td>
      )}
      <td>
        {isMobile && (
          <>
            {typeNode}
            <br />
            {timeFromNow(tx.date, i18n, 'ripple')}, {fullDateAndTime(tx.date, 'ripple')}
            <br />
          </>
        )}
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
                To: <span className="bold">{specification?.destination?.address}</span>{' '}
                <CopyButton text={specification?.destination?.address} />{' '}
              </>
            ) : (
              <>
                {specification?.destination?.address === address ? 'From' : 'Submitter'}:{' '}
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
            <br />
          </>
        )}
        {isTagValid(tx.SourceTag) && !dapp && (
          <>
            Source tag: <span className="bold">{tx.SourceTag}</span>
            <br />
          </>
        )}
        {typeof children === 'function' ? children(pageFiatRate) : children}
        {addressIsSource && (
          <>
            {sequence ? (
              <>
                {tx.TicketSequence && 'Ticket '}Sequence: {tx.Sequence || tx.TicketSequence}
                <br />
              </>
            ) : (
              ''
            )}
            Fee: {amountFormat(tx.Fee, { icon: true, precise: 'nice' })}
            {nativeCurrencyToFiat({ amount: tx.Fee, selectedCurrency, fiatRate: pageFiatRate })}
            <br />
          </>
        )}
        {memoNode(specification?.memos, 'div')}
        Tx hash:{' '}
        <LinkTx tx={tx.hash} copy={true}>
          {width > 800 ? tx.hash : shortHash(tx.hash, 12)}
        </LinkTx>
      </td>
      {!isMobile && (
        <td className="right" style={{ width: 100, verticalAlign: 'top' }}>
          <span className="bold">{timeFromNow(tx.date, i18n, 'ripple')}</span>
          <br />
          <span className="grey">
            {dateFormat(tx.date, {}, { type: 'ripple' })}
            <br />
            {timeFormat(tx.date, 'ripple')}
          </span>
        </td>
      )}
    </tr>
  )
}
