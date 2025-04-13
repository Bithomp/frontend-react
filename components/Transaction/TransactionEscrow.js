import { TData } from '../Table'
import { AddressWithIconFilled, amountFormat, fullDateAndTime, nativeCurrencyToFiat } from '../../utils/format'

import { TransactionCard } from './TransactionCard'

export const TransactionEscrow = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, specification, outcome } = data

  const isEscrowCreation = tx.TransactionType === 'EscrowCreate'
  const isEscrowFinish = tx.TransactionType === 'EscrowFinish'

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Escrow source</TData>
        <TData>
          <AddressWithIconFilled data={outcome?.escrowChanges?.source} name="address" />
        </TData>
      </tr>

      {outcome?.escrowChanges?.source?.tag !== undefined && (
        <tr>
          <TData>Source tag</TData>
          <TData>{outcome.escrowChanges.source.tag}</TData>
        </tr>
      )}

      <tr>
        <TData>Escrow sequence</TData>
        <TData>#{outcome?.escrowChanges?.escrowSequence}</TData>
      </tr>

      <tr>
        <TData>Destination</TData>
        <TData>
          <AddressWithIconFilled data={outcome?.escrowChanges?.destination} name="address" />
        </TData>
      </tr>

      {outcome?.escrowChanges?.destination?.tag !== undefined && (
        <tr>
          <TData>Destination tag</TData>
          <TData>{outcome.escrowChanges.destination.tag}</TData>
        </tr>
      )}

      <tr>
        <TData>Escrow amount</TData>
        <TData className="bold">
          <span className={isEscrowFinish ? 'green' : ''}>{amountFormat(outcome?.escrowChanges?.amount)}</span>

          {isEscrowFinish &&
            nativeCurrencyToFiat({
              amount: outcome?.escrowChanges?.amount,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
        </TData>
      </tr>

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
            specification.source?.address !== outcome?.escrowChanges?.destination?.address && (
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
