import { useTranslation } from 'next-i18next'

import { TRow, TData } from '../TableDetails'
import { AddressWithIconFilled, amountFormat, fullDateAndTime } from '../../utils/format'

import * as Styled from './styled'
import { TransactionCard } from './TransactionCard'

export const TransactionPayment = ({ tx }) => {
  const { t } = useTranslation()

  return (
    <TransactionCard tx={tx}>
      <TRow>
        <TData>{t('table.type')}:</TData>
        <TData>
          <Styled.Type>Payment</Styled.Type>
        </TData>
      </TRow>
      <TRow>
        <TData>Date and time:</TData>
        <TData>{fullDateAndTime(tx.rawTransaction?.date, 'ripple')}</TData>
      </TRow>
      <TRow>
        <TData>Source:</TData>
        <TData>
          <AddressWithIconFilled data={tx.rawTransaction} name="Account" />
        </TData>
      </TRow>
      <TRow>
        <TData>Destination:</TData>
        <TData>
          <AddressWithIconFilled data={tx.rawTransaction} name="Destination" />
        </TData>
      </TRow>
      {tx.rawTransaction?.DestinationTag && (
        <TRow>
          <TData>Destination tag:</TData>
          <TData>{tx.rawTransaction.DestinationTag}</TData>
        </TRow>
      )}
      <TRow>
        <TData>Delivered amount:</TData>
        <TData className="bold green">{amountFormat(tx.outcome.deliveredAmount)}</TData>
      </TRow>
    </TransactionCard>
  )
}
