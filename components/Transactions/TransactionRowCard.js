import { amountFormat, dateFormat, nativeCurrencyToFiat, timeFormat, addressUsernameOrServiceLink } from '../../utils/format'
import { LinkTx } from '../../utils/links'
import { dappBySourceTag, errorCodeDescription, shortErrorCode } from '../../utils/transaction'
import { nativeCurrency } from '../../utils'
import { FiCalendar, FiClock } from 'react-icons/fi'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'

export const TransactionRowCard = ({
  data, 
  address, 
  index, 
  txTypeSpecial, 
  children, 
  selectedCurrency, 
  pageFiatRate
}) => {
  const { specification, tx, outcome } = data
  console.log(data, address)
  const date = dateFormat(tx.date + 946684800)
  const time = timeFormat(tx.date + 946684800)
  const memos = specification.memos
  const myBalanceChanges = outcome?.balanceChanges?.find((change) => change.address === address)?.balanceChanges?.filter((change) => !(change.currency === nativeCurrency && change.value == -outcome.fee))
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  console.log(myBalanceChanges)

  return (
    <tr index={index} style={{ background: !isSuccessful ? 'repeating-linear-gradient(45deg, #f9e3b9, #f9e3b9 10px, #fff 10px, #fff 20px)' : '' }}>
      <td className="bold center" style={{width: 10}}>{index + 1}</td>      
      <td className="left" style={{width: 100}}>
        <span className="flex items-center gap-1"><FiCalendar style={{ stroke: '#666' }} /> {date}</span>
        <span className="flex items-center gap-1"><FiClock style={{ stroke: '#666' }} /> {time}</span>
      </td>
      <td className="left" style={{width: 600}}>
        <span className="flex items-center gap-1">
          <FaArrowRightArrowLeft style={{ stroke: '#666', color: '#666' }} /> 
          <LinkTx tx={tx.hash}>{tx.hash}</LinkTx>
        </span>
        <span>Type: </span>
        <span className="bold">{txTypeSpecial || tx?.TransactionType}</span>
        <br />
        {children}
        {outcome && !isSuccessful && (
          <>
            <span className="bold">Failure</span>
            <span className="red bold">{shortErrorCode(outcome.result)}</span>
            <br />
            <span className="bold">Description: </span>
            <span className="orange bold">{errorCodeDescription(outcome.result)}</span>
          </>
        )}
        {tx.DestinationTag && (
          <>
            <span className="gray">Destination tag: {tx.DestinationTag}</span>
            <br />
          </>
        )}
        {tx.SourceTag && (
          <>
            <span className="gray">Source tag: {dappBySourceTag(tx.SourceTag)}</span>
            <br />
          </>
        )}
        {memos && memos.length > 0 && (
          <>
            {memos.map((memo, idx) => (
              <div key={idx}>
                {memo.data? (
                  <>
                  <span className="bold">Memo{memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                  <span className="gray"> {memo.data}</span>                                  
                  </>
                ) : (
                  <>
                     <span className="bold">{memo.type}{memos.length > 1 ? ` (${idx + 1})` : ''}:</span>
                     <span className="gray"> {memo.format}</span>                
                  </>
                )}
              </div>
            ))}
          </>
        )}

      </td>
      <td className="right">
        {myBalanceChanges?.map((c, i) => {
          return (
            <div key={i}>
              <span className={'bold tooltip ' + (Number(c.value) > 0 ? 'green' : 'red')}>
                {amountFormat(c, { short: true, maxFractionDigits: 2 })}
                <span className="tooltiptext">{amountFormat(c, { precise: true })}</span>
              </span>
              {c.issuer && (
                <>({addressUsernameOrServiceLink(c, 'issuer', { short: true })})</>
              )}
              {nativeCurrencyToFiat({
                amount: c,
                selectedCurrency,
                fiatRate: pageFiatRate
              })}
            </div>
          )
        })}
        <span>Fee:</span> 
        <span className="bold">{amountFormat(tx.Fee)}</span>
        <span>
          {nativeCurrencyToFiat({
            amount: tx.Fee,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
        </span>
      </td>
    </tr>
  )
}
