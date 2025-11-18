import { TransactionRowCard } from './TransactionRowCard'
import { AddressWithIconInline, amountFormat, nativeCurrencyToFiat } from '../../../utils/format'
import { dappBySourceTag } from '../../../utils/transaction'

export const TransactionRowCheck = ({ data, address, index, selectedCurrency }) => {
  const { outcome, specification, tx } = data

  const checkTypeLabels = {
    CheckCreate: 'Check creation',
    CheckCash: 'Check cashing',
    CheckCancel: 'Check cancelation'
  }

  const txTypeSpecial = (
    <span className="bold">
      {tx?.Destination === address ? (
        <>
          Incoming check from
          <br />
          <AddressWithIconInline data={specification.source} options={{ short: 5 }} />
        </>
      ) : (
        checkTypeLabels[tx?.TransactionType] || tx?.TransactionType
      )}
    </span>
  )

  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)
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
          {tx?.SourceTag !== undefined && !dapp && (
            <>
              <span>Source tag:</span>
              <span className="bold">{tx?.SourceTag}</span>
            </>
          )}
          {outcome?.deliveredAmount && (
            <div>
              {tx?.Account === address ? 'Received' : 'Amount'}:{' '}
              {amountFormat(outcome?.deliveredAmount, {
                icon: true,
                bold: true,
                color: 'direction',
                precise: true
              })}
              {nativeCurrencyToFiat({
                amount: outcome?.deliveredAmount,
                selectedCurrency,
                fiatRate
              })}
            </div>
          )}
        </>
      )}
    </TransactionRowCard>
  )
}
