import { TData } from '../Table'
import { AddressWithIconFilled, amountFormat, fullDateAndTime } from '../../utils/format'

import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'

export const TransactionEscrow = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, specification, outcome } = data

  let isEscrowCreation = tx.TransactionType === 'EscrowCreate'

  const fee = Number(tx?.Fee)
  let escrowAmount = specification?.amount
  let escrowReciever = ''

  if (isEscrowCreation) {
    escrowAmount = specification?.amount
  } else {
    if (Object.keys(outcome?.balanceChanges).length == 2) {
      for (const [account, change] of Object.entries(outcome?.balanceChanges)) {
        if (Number(change[0].value) != -fee) {
          escrowReciever = account
          escrowAmount = Number(change[0].value) + fee
        }
      }
    } else if (Object.keys(outcome?.balanceChanges).length == 1) {
      const [account, change] = Object.entries(outcome?.balanceChanges)[0]
      if (outcome?.lockedBalanceChanges) {
        escrowAmount = Number(change[0].value)
        // TODO: Find example of transaction with lockedBalanceChanges
        escrowReciever = tx.submitter
      } else {
        escrowAmount = Number(change[0].value) + fee
        escrowReciever = account
      }
    }
  }

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
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
                  This Escrow was finished by the third party (not by Sender or Receiver), anyone can finish time-based
                  escrow when the time passed.
                </TData>
              </tr>
            )}
        </>
      )}

      <tr>
        <TData>Escrow source</TData>
        <TData>
          {isEscrowCreation ? (
            <AddressWithIconFilled data={specification.source} name="address" />
          ) : (
            <AddressWithIconFilled data={specification} name="owner" />
          )}
        </TData>
      </tr>

      {specification?.source?.tag && (
        <tr>
          <TData>Source tag</TData>
          <TData>{specification.source.tag}</TData>
        </tr>
      )}

      <tr>
        <TData>Escrow sequence</TData>
        <TData>#{outcome?.escrowChanges?.escrowSequence}</TData>
      </tr>

      <tr>
        <TData>Destination</TData>
        <TData>
          {isEscrowCreation ? (
            <AddressWithIconFilled data={specification.destination} name="address" />
          ) : (
            <LinkAccount address={escrowReciever} />
          )}
        </TData>
      </tr>

      {specification?.destination?.tag && (
        <tr>
          <TData>Destination tag</TData>
          <TData>{specification.destination.tag}</TData>
        </tr>
      )}

      <tr>
        <TData>Escrow amount</TData>
        <TData className="bold">{amountFormat(escrowAmount)}</TData>
      </tr>

      {specification?.allowExecuteAfter && (
        <tr>
          <TData>Execute after</TData>
          <TData>{fullDateAndTime(specification.allowExecuteAfter)}</TData>
        </tr>
      )}

      {specification?.allowCancelAfter && (
        <tr>
          <TData>Cancel after</TData>
          <TData>{fullDateAndTime(specification.allowCancelAfter)}</TData>
        </tr>
      )}

      {specification?.condition && (
        <tr>
          <TData>Condition</TData>
          <TData>{specification?.condition}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
