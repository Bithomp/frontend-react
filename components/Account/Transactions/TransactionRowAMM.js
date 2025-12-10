import { amountFormat } from '../../../utils/format'
import { addressBalanceChanges } from '../../../utils/transaction'
import { isRipplingOnIssuer } from '../../../utils/transaction/payment'
import { RipplingChanges } from './Elements/RipplingChanges'
import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAMM = ({ data, address, index, selectedCurrency }) => {
  const { tx } = data

  const ammTypeLabels = {
    AMMCreate: 'AMM create',
    AMMDeposit: 'AMM deposit',
    AMMWithdraw: 'AMM withdraw',
    AMMVote: 'AMM vote'
  }

  const sourceBalanceChangesList = addressBalanceChanges(data, address) || []
  const depositedList = sourceBalanceChangesList.filter((c) => Number(c?.value) < 0)
  const receivedList = sourceBalanceChangesList.filter((c) => Number(c?.value) > 0)

  const rippling = isRipplingOnIssuer(sourceBalanceChangesList, address)
  const ripplingTitle = rippling ? 'Rippling through ' : ''
  const txTypeSpecial = (
    <span className="bold">{ripplingTitle + (ammTypeLabels[tx?.TransactionType] || tx?.TransactionType)}</span>
  )

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {rippling ? (
        <RipplingChanges balanceChanges={sourceBalanceChangesList} />
      ) : (
        <>
          {(tx.TradingFee || tx.TradingFee === 0) && (
            <>
              Trading fee: <span className="bold">{tx.TradingFee / 100000}%</span>
              <br />
            </>
          )}
          {depositedList.length > 0 && (
            <>
              {depositedList.map((change, index) => (
                <div key={index}>
                  Deposited Asset{depositedList.length > 1 ? ' ' + (index + 1) : ''}:{' '}
                  {amountFormat(change, {
                    icon: true,
                    bold: true,
                    precise: 'nice',
                    absolute: true
                  })}
                </div>
              ))}
            </>
          )}
          {receivedList.length > 0 && (
            <>
              {receivedList.map((change, index) => (
                <div key={index}>
                  Received Asset{receivedList.length > 1 ? ' ' + (index + 1) : ''}:{' '}
                  {amountFormat(change, {
                    icon: true,
                    bold: true,
                    precise: 'nice'
                  })}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </TransactionRowCard>
  )
}
