import { TData } from '../Table'
import { AddressWithIconFilled, amountFormat, fullDateAndTime, nativeCurrencyToFiat } from '../../utils/format'
import { addressBalanceChanges } from '../../utils/transaction'

import { TransactionCard } from './TransactionCard'

export const TransactionEscrow = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, specification, outcome } = data

  const isEscrowCreation = tx.TransactionType === 'EscrowCreate'
  const isEscrowFinish = tx.TransactionType === 'EscrowFinish'

  const isSuccessful = outcome?.result == 'tesSUCCESS'

  const sourceData = outcome?.escrowChanges?.source || (specification?.owner ? specification : specification.source)
  const sourceName = outcome?.escrowChanges?.source ? 'address' : specification?.owner ? 'owner' : 'address'

  const destinationAddress =
    outcome?.escrowChanges?.destination?.address || specification?.destination?.address || specification?.destination
  const destinationBalanceChangesList = destinationAddress ? addressBalanceChanges(data, destinationAddress) : null

  const optionalAbsAmount = (change) => {
    return (change?.value ? change.value.toString()[0] === '-' : change?.toString()[0] === '-')
      ? {
          ...change,
          value: change?.value ? change?.value.toString().slice(1) : change?.toString().slice(1)
        }
      : change
  }

  const escrowAmount = outcome?.escrowChanges?.amount
  const receivedAmount =
    destinationBalanceChangesList?.length === 1 ? optionalAbsAmount(destinationBalanceChangesList[0]) : null

  const isSameAsReceived =
    escrowAmount && receivedAmount && JSON.stringify(escrowAmount) === JSON.stringify(receivedAmount)

  const shouldShowReceived = isEscrowFinish && destinationBalanceChangesList?.length > 0 && !isSameAsReceived

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Escrow source</TData>
        <TData>
          <AddressWithIconFilled data={sourceData} name={sourceName} />
        </TData>
      </tr>

      {outcome?.escrowChanges?.source?.tag !== undefined && (
        <tr>
          <TData>Source tag</TData>
          <TData>{outcome.escrowChanges.source.tag}</TData>
        </tr>
      )}

      {(outcome?.escrowChanges?.escrowSequence || specification?.escrowSequence) && (
        <tr>
          <TData>Escrow sequence</TData>
          <TData>{outcome?.escrowChanges?.escrowSequence || specification?.escrowSequence}</TData>
        </tr>
      )}

      {outcome?.escrowChanges?.destination && (
        <tr>
          <TData>Destination</TData>
          <TData>
            <AddressWithIconFilled data={outcome?.escrowChanges?.destination} name="address" />
          </TData>
        </tr>
      )}

      {outcome?.escrowChanges?.destination?.tag !== undefined && (
        <tr>
          <TData>Destination tag</TData>
          <TData>{outcome.escrowChanges.destination.tag}</TData>
        </tr>
      )}

      {outcome?.escrowChanges?.amount && (
        <tr>
          <TData>Escrow amount</TData>
          <TData className="bold">
            <span className={shouldShowReceived ? 'orange' : isEscrowFinish ? 'green' : ''}>
              {amountFormat(outcome?.escrowChanges?.amount)}
            </span>

            {isEscrowFinish &&
              nativeCurrencyToFiat({
                amount: outcome?.escrowChanges?.amount,
                selectedCurrency,
                fiatRate: pageFiatRate
              })}
          </TData>
        </tr>
      )}

      {shouldShowReceived && (
        <tr>
          <TData>
            Received
            {destinationBalanceChangesList.map((change, index) => (
              <br key={index} />
            ))}
          </TData>
          <TData>
            {destinationBalanceChangesList.map((change, index) => (
              <div key={index}>
                {amountFormat(optionalAbsAmount(change), { withIssuer: true, bold: true, color: 'direction' })}
                {nativeCurrencyToFiat({
                  amount: optionalAbsAmount(change),
                  selectedCurrency,
                  fiatRate: pageFiatRate
                })}
              </div>
            ))}
          </TData>
        </tr>
      )}

      {outcome?.escrowChanges?.allowExecuteAfter && (
        <tr>
          <TData>Execute after</TData>
          <TData>{fullDateAndTime(outcome.escrowChanges.allowExecuteAfter)}</TData>
        </tr>
      )}

      {outcome?.escrowChanges?.allowCancelAfter && (
        <tr>
          <TData>Cancel after</TData>
          <TData>{fullDateAndTime(outcome.escrowChanges.allowCancelAfter)}</TData>
        </tr>
      )}

      {outcome?.escrowChanges?.condition && (
        <tr>
          <TData>Condition</TData>
          <TData>{outcome.escrowChanges.condition}</TData>
        </tr>
      )}

      {isEscrowFinish && specification?.fulfillment && (
        <tr>
          <TData>Fulfillment</TData>
          <TData>{specification.fulfillment}</TData>
        </tr>
      )}

      {!isEscrowCreation && (
        <>
          <tr>
            <TData>Initiated by</TData>
            <TData>
              <AddressWithIconFilled data={specification.source} name="address" />
            </TData>
          </tr>
          {specification.source?.address !== outcome?.escrowChanges?.source?.address &&
            specification.source?.address !== outcome?.escrowChanges?.destination?.address &&
            isSuccessful && (
              <tr>
                <TData>Note</TData>
                <TData className="orange">
                  This Escrow was finished by the third party (not by Source or Destination), anyone can finish
                  time-based escrow when the time passed.
                </TData>
              </tr>
            )}
        </>
      )}
    </TransactionCard>
  )
}
