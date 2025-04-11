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
      {/* Different data for EscrowCreation vs Execution/Cancellation */}
      {isEscrowCreation ? (
        <tr>
          <TData>Escrow Owner</TData>
          <TData>
            <LinkAccount address={specification?.source?.address} />
          </TData>
        </tr>
      ) : (
        <>
          <tr>
            <TData>Initiated by</TData>
            <TData>
              <AddressWithIconFilled data={specification.source} name="address" />
            </TData>
          </tr>
          <tr>
            <TData>Escrow Owner</TData>
            <TData>
              <LinkAccount address={specification?.owner} />
            </TData>
          </tr>
        </>
      )}

      <tr>
        <TData>Escrow Sequence</TData>
        <TData>#{outcome?.escrowChanges?.escrowSequence}</TData>
      </tr>

      {/* Additional details for EscrowCreation */}
      {isEscrowCreation && (
        <>
          <tr>
            <TData>Destination</TData>
            <TData>
              <LinkAccount address={specification?.destination?.address} />
            </TData>
          </tr>
          <tr>
            <TData>Escrow Amount</TData>
            <TData>{amountFormat(escrowAmount)}</TData>
          </tr>
          <tr>
            <TData>Source Tag</TData>
            <TData>{specification?.source?.tag}</TData>
          </tr>
          <tr>
            <TData>Destination Tag</TData>
            <TData>{specification?.destination?.tag}</TData>
          </tr>
          <tr>
            <TData>Execute After</TData>
            <TData>{fullDateAndTime(specification?.allowExecuteAfter)}</TData>
          </tr>
          <tr>
            <TData>Cancel After</TData>
            <TData>{fullDateAndTime(specification?.allowCancelAfter)}</TData>
          </tr>
          <tr>
            <TData>Condition</TData>
            <TData>{specification?.condition}</TData>
          </tr>
        </>
      )}

      {!isEscrowCreation && (
        <>
          <tr>
            <TData>Escrow Receiver:</TData>
            <TData>
              <LinkAccount address={escrowReciever} />
            </TData>
          </tr>
          <tr>
            <TData>Escrow Amount:</TData>
            <TData>{amountFormat(escrowAmount)}</TData>
          </tr>
        </>
      )}
    </TransactionCard>
  )
}
