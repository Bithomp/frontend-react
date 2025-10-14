import { TransactionRowCard } from './TransactionRowCard'
import { useTxFiatRate } from './FiatRateContext'
import { addressBalanceChanges } from '../../utils/transaction'
import { amountFormat, nativeCurrencyToFiat } from '../../utils/format'

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

const TransactionRowOfferContent = ({ tx, selectedCurrency }) => {
  const pageFiatRate = useTxFiatRate()

  const { specification, outcome } = tx

  const sourceOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === specification.source.address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const takerGets = specification.takerGets || sourceOrderbookChange?.takerGets
  const takerPays = specification.takerPays || sourceOrderbookChange?.takerPays

  const flagsAsString = flagList(specification?.flags)

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(tx, specification.source.address)

  return (
    <>
      {takerGets && (
        <div>
          <span>Taker Gets: </span>
          <span>{amountFormat(takerGets, { icon: true, withIssuer: true, bold: true })}</span>
        </div>
      )}
      {takerPays && (
        <div>
          <span>Taker Pays: </span>
          <span>{amountFormat(takerPays, { icon: true, withIssuer: true, bold: true })}</span>
        </div>
      )}
      {sourceBalanceChangesList.length === 2 && (
        <>
          <div className="flex gap-1">
            <span>Exchanged: </span>
            <span>
              {sourceBalanceChangesList.map((change, index) => (
                <div key={index}>
                  {amountFormat(change, {
                    icon: true,
                    showPlus: true,
                    withIssuer: true,
                    bold: true,
                    color: 'direction'
                  })}
                  {nativeCurrencyToFiat({ amount: change, selectedCurrency, fiatRate: pageFiatRate })}
                </div>
              ))}
            </span>
          </div>
          <div>
            <span>Rate: </span>
            <span>
              {amountFormat(
                {
                  currency: sourceBalanceChangesList[0].currency,
                  issuer: sourceBalanceChangesList[0].issuer,
                  value: 1
                },
                { icon: true }
              )}{' '}
              ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...sourceBalanceChangesList[1],
                    value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                  },
                  { icon: true }
                )}
              </span>
              <br />
              {amountFormat(
                {
                  currency: sourceBalanceChangesList[1].currency,
                  issuer: sourceBalanceChangesList[1].issuer,
                  value: 1
                },
                { icon: true }
              )}{' '}
              ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...sourceBalanceChangesList[0],
                    value: Math.abs(sourceBalanceChangesList[0].value / sourceBalanceChangesList[1].value)
                  },
                  { icon: true }
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
    </>
  )
}

export const TransactionRowOffer = ({ tx, address, index, selectedCurrency }) => {
  const { specification, outcome } = tx

  const sourceOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === specification.source.address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const direction = (specification.flags ? specification.flags.sell : sourceOrderbookChange?.direction) ? 'Sell' : 'Buy'

  const txTypeSpecial = tx.tx?.TransactionType + ' - ' + direction + ' Order'
  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <TransactionRowOfferContent tx={tx} selectedCurrency={selectedCurrency} />
    </TransactionRowCard>
  )
}
