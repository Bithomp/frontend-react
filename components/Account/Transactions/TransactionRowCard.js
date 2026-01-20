import {
  amountFormat,
  dateFormat,
  fullDateAndTime,
  nativeCurrencyToFiat,
  shortHash,
  timeFormat,
  timeFromNow
} from '../../../utils/format'
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
import { isRipplingOnIssuer } from '../../../utils/transaction/payment'
import Link from 'next/link'

/*
  {
    "result": "tesSUCCESS",
    "timestamp": "2025-11-21T17:20:10.000Z",
    "fee": "0.000011",
    "ledgerIndex": 100363821,
    "indexInLedger": 51,
    "deliveredAmount": {
      "currency": "XRP",
      "value": "0.000001",
      "valueInConvertCurrencies": {
        "eur": "0.00000169979"
      }
    },
    "ledgerTimestamp": 1763745610,
    "feeInFiats": {
      "eur": "0.00001869769"
    },
    "balanceChanges": [
      {
        "currency": "XRP",
        "value": "0.000001",
        "valueInConvertCurrencies": {
          "eur": "0.00000169979"
        }
      }
    ]
  }
*/

export const TransactionRowCard = ({ data, address, index, txTypeSpecial, children, selectedCurrency, icon }) => {
  const width = useWidth()
  const { specification, tx, outcome, fiatRates } = data
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  const isConvertion = isConvertionTx(specification)
  const sourceBalanceChangesList = addressBalanceChanges(data, address)
  const pageFiatRate = fiatRates?.[selectedCurrency]

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(tx.SourceTag)

  const sequence = tx.TicketSequence || tx.Sequence

  const addressIsSource = specification?.source?.address === address

  const isMobile = useIsMobile(600)

  const typeNode = txTypeSpecial || <span className="bold">{tx?.TransactionType}</span>

  const rippling = isRipplingOnIssuer(sourceBalanceChangesList, address)

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
        <div>{index + 1}</div>
        <div style={{ marginTop: 2 }}>{icon}</div>
      </td>
      {!isMobile && (
        <td style={{ width: 120, verticalAlign: 'top' }}>
          {typeNode}
          <br />
          <br />
          {!rippling &&
            sourceBalanceChangesList?.map((change, index) => (
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
        {!rippling && !isConvertion && specification?.destination?.address && (
          <>
            {specification?.source?.address === address ? (
              <>
                To:{' '}
                <Link className="bold" href={'/account/' + specification?.destination?.address}>
                  {specification?.destination?.address}
                </Link>{' '}
                <CopyButton text={specification?.destination?.address} />{' '}
              </>
            ) : (
              <>
                {specification?.destination?.address === address ? 'From' : 'Submitter'}:{' '}
                <Link className="bold" href={'/account/' + specification?.source?.address}>
                  {specification?.source?.address}
                </Link>{' '}
                <CopyButton text={specification?.source?.address} />
              </>
            )}
            <br />
          </>
        )}
        {!rippling && isTagValid(tx.DestinationTag) && (
          <>
            Destination tag: <span className="bold">{tx.DestinationTag}</span>
            <br />
          </>
        )}
        {!rippling && isTagValid(tx.SourceTag) && !dapp && (
          <>
            Source tag: <span className="bold">{tx.SourceTag}</span>
            <br />
          </>
        )}
        {children}
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
            {nativeCurrencyToFiat({
              amount: tx.Fee,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
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
