import { TransactionRowCard } from './TransactionRowCard'
import { addressBalanceChanges } from '../../../utils/transaction'
import { amountFormat, nativeCurrencyToFiat, showFlags } from '../../../utils/format'

export const TransactionRowOffer = ({ data, address, index, selectedCurrency }) => {
  const { specification, outcome, tx } = data

  const myOrderbookChange = outcome?.orderbookChanges
    ?.filter((entry) => entry.address === address)?.[0]
    ?.orderbookChanges.filter((entry) => entry.sequence === specification.orderSequence)?.[0]

  const direction = (specification.flags ? specification.flags.sell : myOrderbookChange?.direction) ? 'Sell' : 'Buy'

  const myBalanceChangesList = addressBalanceChanges(data, address)

  const flags = showFlags(specification?.flags)

  const myOrder = tx?.Account === address

  let orderStatus = ''

  if (tx?.TransactionType === 'OfferCancel') {
    orderStatus = 'canceled'
  } else if (myBalanceChangesList?.length === 0 && myOrder) {
    orderStatus = 'placed'
  } else {
    if (!myOrder) {
      orderStatus = 'fullfilled'
      const seq = specification.sequence || specification.ticketSequence
      if (seq) {
        orderStatus += ' #'.seq
      }
    } else {
      orderStatus = 'placed and fulfilled'
    }
  }

  const txTypeSpecial = <span className="bold">{direction + ' order ' + orderStatus}</span>

  const takerGets = specification.takerGets || myOrderbookChange?.takerGets
  const takerPays = specification.takerPays || myOrderbookChange?.takerPays

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
              Order specification:
              <br />
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
          {myOrder && myBalanceChangesList?.length === 2 && <br />}
          {myBalanceChangesList?.length === 2 && (
            <>
              <div>
                <span>Exchanged: </span>
                <br />
                <span>
                  {myBalanceChangesList.map((change, index) => (
                    <div key={index}>
                      {amountFormat(change, {
                        icon: true,
                        showPlus: true,
                        withIssuer: true,
                        bold: true,
                        color: 'direction',
                        precise: 'nice'
                      })}
                      {nativeCurrencyToFiat({ amount: change, selectedCurrency, fiatRate })}
                    </div>
                  ))}
                </span>
              </div>
              <div>
                <br />
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
                      { icon: true, precise: 'nice' }
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
                <br />
                <br />
              </div>
            </>
          )}
          {flags && <div>Flags: {flags}</div>}
        </>
      )}
    </TransactionRowCard>
  )
}
