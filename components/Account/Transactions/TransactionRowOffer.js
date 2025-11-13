import { TransactionRowCard } from './TransactionRowCard'
import { addressBalanceChanges } from '../../../utils/transaction'
import { amountFormat, nativeCurrencyToFiat, showFlags } from '../../../utils/format'
import { nativeCurrency } from '../../../utils'

export const TransactionRowOffer = ({ data, address, index, selectedCurrency }) => {
  const { specification, outcome, tx } = data

  const myOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const direction = (specification.flags ? specification.flags.sell : myOrderbookChange?.direction) ? 'Sell' : 'Buy'

  const myBalanceChangesList = addressBalanceChanges(data, address)

  const flags = showFlags(specification?.flags)

  let orderStatus = ''

  if (
    myBalanceChangesList?.length === 1 &&
    myBalanceChangesList[0].currency === nativeCurrency &&
    myBalanceChangesList[0].value === -tx.Fee
  ) {
    orderStatus = 'placed'
  } else {
    if (address !== tx?.Account) {
      orderStatus = 'fullfilled'
      const seq = specification.sequence || specification.ticketSequence
      if (seq) {
        orderStatus += ' #'.seq
      }
    } else {
      orderStatus = 'placed and fulfilled'
    }
  }

  const txTypeSpecial = direction + ' order ' + orderStatus

  const takerGets = specification.takerGets || myOrderbookChange?.takerGets
  const takerPays = specification.takerPays || myOrderbookChange?.takerPays

  const myOrder = specification?.source?.address === address

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {(fiatRate) => (
        <>
          {myOrder && (
            <>
              {takerGets && (
                <div>
                  <span>{direction === 'Sell' ? 'Sell exactly' : 'Pay up to'}: </span>
                  <span>{amountFormat(takerGets, { icon: true, withIssuer: true, bold: true })}</span>
                </div>
              )}
              {takerPays && (
                <div>
                  <span>{direction === 'Sell' ? 'Receive at least' : 'Receive exactly'}: </span>
                  <span>{amountFormat(takerPays, { icon: true, withIssuer: true, bold: true })}</span>
                </div>
              )}
            </>
          )}
          {myBalanceChangesList?.length === 2 && (
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
                      {nativeCurrencyToFiat({ amount: change, selectedCurrency, fiatRate })}
                    </div>
                  ))}
                </span>
              </div>
              <div>
                <span>Rates: </span>
                <br />
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
          {flags && <div>Flags: {flags}</div>}
        </>
      )}
    </TransactionRowCard>
  )
}
