import { TransactionRowCard } from './TransactionRowCard'
import { useTxFiatRate } from './FiatRateContext'
import { addressBalanceChanges } from '../../../utils/transaction'
import { amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { nativeCurrency } from '../../../utils'

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

const TransactionRowOfferContent = ({ tx, selectedCurrency, myOrderbookChange, myBalanceChangesList }) => {
  const pageFiatRate = useTxFiatRate()

  const { specification } = tx

  const takerGets = specification.takerGets || myOrderbookChange?.takerGets
  const takerPays = specification.takerPays || myOrderbookChange?.takerPays

  const flagsAsString = flagList(specification?.flags)

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
      {myBalanceChangesList.length === 2 && (
        <>
          <div className="flex gap-1">
            <span>Exchanged: </span>
            <span>
              {myBalanceChangesList.map((change, index) => (
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
                  currency: myBalanceChangesList[0].currency,
                  issuer: myBalanceChangesList[0].issuer,
                  value: 1
                },
                { icon: true }
              )}{' '}
              ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...myBalanceChangesList[1],
                    value: Math.abs(myBalanceChangesList[1].value / myBalanceChangesList[0].value)
                  },
                  { icon: true }
                )}
              </span>
              <br />
              {amountFormat(
                {
                  currency: myBalanceChangesList[1].currency,
                  issuer: myBalanceChangesList[1].issuer,
                  value: 1
                },
                { icon: true }
              )}{' '}
              ={' '}
              <span className="bold">
                {amountFormat(
                  {
                    ...myBalanceChangesList[0],
                    value: Math.abs(myBalanceChangesList[0].value / myBalanceChangesList[1].value)
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

  const myOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const direction = (specification.flags ? specification.flags.sell : myOrderbookChange?.direction) ? 'Sell' : 'Buy'

  const myBalanceChangesList = addressBalanceChanges(tx, address)

  let orderStatus = ''

  if (
    myBalanceChangesList?.length === 1 &&
    myBalanceChangesList[0].currency === nativeCurrency &&
    myBalanceChangesList[0].value === -tx.Fee
  ) {
    orderStatus = 'placed'
  } else {
    if (address !== tx.tx?.Account) {
      orderStatus = 'fullfilled'
      const seq = specification.sequence || specification.ticketSequence
      if (seq) {
        orderStatus += ' #'.seq
      }
    } else {
      orderStatus = 'placed and fulfilled'
    }
  }

  const txTypeSpecial = tx.tx?.TransactionType + ' - ' + direction + ' Order ' + orderStatus

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <TransactionRowOfferContent
        tx={tx}
        selectedCurrency={selectedCurrency}
        myOrderbookChange={myOrderbookChange}
        myBalanceChangesList={myBalanceChangesList}
      />
    </TransactionRowCard>
  )
}
