import { amountFormat, dateFormat, nativeCurrencyToFiat, timeFormat } from '../../utils/format'
import { LinkTx } from '../../utils/links'
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
  const { specification, tx } = data
  console.log(data, address)
  const date = dateFormat(tx.date + 946684800)
  const time = timeFormat(tx.date + 946684800)
  const memos = specification.memos

  return (
    <tr index={index}>
      <td className="bold center" style={{width: 15}}>{index + 1}</td>      
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
        {tx.DestinationTag && (
          <>
            <span className="gray">Destination tag: {tx.DestinationTag}</span>
            <br />
          </>
        )}
        {tx.SourceTag && (
          <>
            <span className="gray">Source tag: {tx.SourceTag}</span>
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
