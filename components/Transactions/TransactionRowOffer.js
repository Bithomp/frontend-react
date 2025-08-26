import { TransactionRowCard } from './TransactionRowCard'
import { useTxFiatRate } from './FiatRateContext'
import { addressBalanceChanges } from '../../utils/transaction'
import { amountFormat, nativeCurrencyToFiat, addressUsernameOrServiceLink, niceCurrency } from '../../utils/format'

const flagList = (flags) => {
    
  let flagsString = ''

  if (!flags) return flagsString

  for (let key in flags) {
    if (flags[key]) {        
      flagsString += key + ', '
    }
  }
  flagsString = flagsString.slice(0, -2) // remove the last comma

  return flagsString
}

export const TransactionRowOffer = ({ tx, address, index, selectedCurrency}) => {
  const pageFiatRate = useTxFiatRate()

  const { specification, outcome } = tx

  const sourceOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === specification.source.address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const takerGets = specification.takerGets || sourceOrderbookChange?.takerGets
  const takerPays = specification.takerPays || sourceOrderbookChange?.takerPays

  const direction = (specification.flags ? specification.flags.sell : sourceOrderbookChange?.direction) ? 'Sell' : 'Buy'

  const txTypeSpecial = tx.tx?.TransactionType + ' - ' + direction + ' Order'  

  const flagsAsString = flagList(specification?.flags)

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(tx, specification.source.address)

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency} txTypeSpecial={txTypeSpecial}>
      {takerGets && (
        <div>
          <span>Taker Gets: </span>
          <span className="bold">
            {amountFormat(takerGets, { precise: true , icon: true })}
            {takerGets?.issuer && <>({addressUsernameOrServiceLink(takerGets, 'issuer', { short: true })})</>}
          </span>
        </div>
      )}
      {takerPays && (
        <div>
          <span>Taker Pays: </span>
          <span className="bold">
            {amountFormat(takerPays, { precise: true , icon: true })}
            {takerPays?.issuer && <>({addressUsernameOrServiceLink(takerPays, 'issuer', { short: true })})</>}
          </span>
        </div>
      )}
      {sourceBalanceChangesList.length === 2 && (
        <>
          <div className="flex gap-1">
            <span>Exchanged: </span>
            <span>
            {sourceBalanceChangesList.map((change, index) => (
              <div key={index}>
                <span className={'bold ' + (Number(change?.value) > 0 ? 'green' : 'red')}>
                  {Number(change?.value) > 0 && '+'}
                  {amountFormat(change, { precise: 'nice' , icon: true })}
                </span>
                {change?.issuer && <>({addressUsernameOrServiceLink(change, 'issuer', { short: true })})</>}
                {nativeCurrencyToFiat({ amount: change, selectedCurrency, fiatRate: pageFiatRate })}
              </div>
            ))}
            </span>
          </div>
          <div>
            <span>Rate: </span>
            <span>
              1 {niceCurrency(sourceBalanceChangesList[0].currency)} ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...sourceBalanceChangesList[1],
                    value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                  },
                  { precise: 'nice', icon: true }
                )}
              </span>
              <br />1 {niceCurrency(sourceBalanceChangesList[1].currency)} ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...sourceBalanceChangesList[0],
                    value: Math.abs(sourceBalanceChangesList[0].value / sourceBalanceChangesList[1].value)
                  },
                  { precise: 'nice', icon: true }
                )}
              </span>
            </span>
          </div>
        </>
      )}
      {flagsAsString && (
        <div>
          <span>Flag{flagsAsString.includes(',') ? 's' : ''}: </span>
          <span className="bold">{flagsAsString}</span>
        </div>
      )}
    </TransactionRowCard>
  )
}
