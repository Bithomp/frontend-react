import { useTranslation } from 'next-i18next'

import { fullDateAndTime } from '../../utils/format'
import { TData, TRow } from '../TableDetails'

import * as Styled from './styled'
import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'

export const TransactionOrder = ({ tx }) => {
  const { t } = useTranslation()

  const direction = tx.specification?.direction
  let txType = direction === 'sell' ? 'Sell Order' : 'Buy Order'

  return (
    <TransactionCard tx={tx}>
      <TRow>
        <TData>{t('table.type')}:</TData>
        <TData>
          <Styled.Type>{txType}</Styled.Type>
        </TData>
      </TRow>
      <TRow>
        <TData>Time:</TData>
        <TData>{fullDateAndTime(tx.rawTransaction?.date, 'ripple')}</TData>
      </TRow>
      <TRow>
        <TData>Initiated by:</TData>
        <TData>
          <LinkAccount address={tx.address} />
        </TData>
      </TRow>
      <TRow>
        <TData>Quantity:</TData>
        <TData>
          {tx.specification.quantity.value} {tx.specification.quantity.currency}
        </TData>
      </TRow>
      <TRow>
        <TData>Total Price:</TData>
        <TData>
          {tx.specification.totalPrice.value} {tx.specification.totalPrice.currency} (
          <LinkAccount address={tx.specification.totalPrice.counterparty} />)
        </TData>
      </TRow>
    </TransactionCard>
  )
}
