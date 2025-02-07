import { TData, TRow } from '../TableDetails'
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
      {/* Different data for EscrowCreation vs Execution/Cancellation */}
      {isEscrowCreation ? (
        <TRow>
          <TData>Escrow Owner</TData>
          <TData>
            <LinkAccount address={specification?.source?.address} />
          </TData>
        </TRow>
      ) : (
        <>
          <TRow>
            <TData>Initiated by</TData>
            <TData>
              <AddressWithIconFilled data={specification.source} name="address" />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Owner</TData>
            <TData>
              <LinkAccount address={specification?.owner} />
            </TData>
          </TRow>
        </>
      )}

      <TRow>
        <TData>Escrow Sequence</TData>
        <TData>#{outcome?.escrowChanges?.escrowSequence}</TData>
      </TRow>

      {/* Additional details for EscrowCreation */}
      {isEscrowCreation && (
        <>
          <TRow>
            <TData>Destination</TData>
            <TData>
              <LinkAccount address={specification?.destination?.address} />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Amount</TData>
            <TData>{amountFormat(escrowAmount)}</TData>
          </TRow>
          <TRow>
            <TData>Source Tag</TData>
            <TData>{specification?.source?.tag}</TData>
          </TRow>
          <TRow>
            <TData>Destination Tag</TData>
            <TData>{specification?.destination?.tag}</TData>
          </TRow>
          <TRow>
            <TData>Execute After</TData>
            <TData>{fullDateAndTime(specification?.allowExecuteAfter)}</TData>
          </TRow>
          <TRow>
            <TData>Cancel After</TData>
            <TData>{fullDateAndTime(specification?.allowCancelAfter)}</TData>
          </TRow>
          <TRow>
            <TData>Condition</TData>
            <TData>{specification?.condition}</TData>
          </TRow>
        </>
      )}

      {!isEscrowCreation && (
        <>
          <TRow>
            <TData>Escrow Receiver:</TData>
            <TData>
              <LinkAccount address={escrowReciever} />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Amount:</TData>
            <TData>{amountFormat(escrowAmount)}</TData>
          </TRow>
        </>
      )}
    </TransactionCard>
  )
}
