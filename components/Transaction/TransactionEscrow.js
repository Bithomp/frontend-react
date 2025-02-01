import { useTranslation } from 'next-i18next'

import { TData, TRow } from '../TableDetails'
import { amountFormat, fullDateAndTime } from '../../utils/format'

import * as Styled from './styled'
import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'

export const TransactionEscrow = ({ tx }) => {
  const { t } = useTranslation()

  let isEscrowCreation, isEscrowExecution, isEscrowCancelation
  switch (tx.type) {
    case 'escrowCreation':
      isEscrowCreation = true
      break
    case 'escrowExecution':
      isEscrowExecution = true
      break
    case 'escrowCancellation':
      isEscrowCancelation = true
      break
  }

  const fee = Number(tx.rawTransaction?.Fee)
  let escrowAmount = tx.specification?.amount
  let escrowReciever = ''

  if (isEscrowCreation) {
    escrowAmount = tx.specification?.amount
  } else {
    if (Object.keys(tx.outcome?.balanceChanges).length == 2) {
      for (const [account, change] of Object.entries(tx.outcome?.balanceChanges)) {
        if (Number(change[0].value) != -fee) {
          escrowReciever = account
          escrowAmount = Number(change[0].value) + fee
        }
      }
    } else if (Object.keys(tx.outcome?.balanceChanges).length == 1) {
      const [account, change] = Object.entries(tx.outcome?.balanceChanges)[0]
      if (tx.rawTransaction?.outcome?.lockedBalanceChanges) {
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
    <TransactionCard tx={tx}>
      <TRow>
        <TData>{t('table.type')}:</TData>
        <TData>
          {isEscrowCreation && <Styled.Type>Escrow Creation</Styled.Type>}
          {isEscrowExecution && <Styled.Type>Escrow Execution</Styled.Type>}
          {isEscrowCancelation && <Styled.Type>Escrow Cancellation</Styled.Type>}
        </TData>
      </TRow>
      <TRow>
        <TData>Time:</TData>
        <TData>{fullDateAndTime(tx.rawTransaction?.date, 'ripple')}</TData>
      </TRow>

      {/* Different data for EscrowCreation vs Execution/Cancellation */}
      {isEscrowCreation ? (
        <TRow>
          <TData>Escrow Owner:</TData>
          <TData>
            <LinkAccount address={tx.specification?.source?.address} />
          </TData>
        </TRow>
      ) : (
        <>
          <TRow>
            <TData>Initiated by:</TData>
            <TData>
              <LinkAccount address={tx.address} />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Owner:</TData>
            <TData>
              <LinkAccount address={tx.specification?.owner} />
            </TData>
          </TRow>
        </>
      )}

      <TRow>
        <TData>Escrow Sequence:</TData>
        <TData>#{tx.outcome?.escrowChanges?.escrowSequence}</TData>
      </TRow>

      {/* Additional details for EscrowCreation */}
      {isEscrowCreation && (
        <>
          <TRow>
            <TData>Destination:</TData>
            <TData>
              <LinkAccount address={tx.specification?.destination?.address} />
            </TData>
          </TRow>
          <TRow>
            <TData>Escrow Amount:</TData>
            <TData>{amountFormat(escrowAmount)}</TData>
          </TRow>
          <TRow>
            <TData>Source Tag:</TData>
            <TData>{tx.specification?.source?.tag}</TData>
          </TRow>
          <TRow>
            <TData>Destination Tag:</TData>
            <TData>{tx.specification?.destination?.tag}</TData>
          </TRow>
          <TRow>
            <TData>Execute After:</TData>
            <TData>{fullDateAndTime(tx.specification?.allowExecuteAfter)}</TData>
          </TRow>
          <TRow>
            <TData>Cancel After:</TData>
            <TData>{fullDateAndTime(tx.specification?.allowCancelAfter)}</TData>
          </TRow>
          <TRow>
            <TData>Condition:</TData>
            <TData>{tx.specification?.condition}</TData>
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
