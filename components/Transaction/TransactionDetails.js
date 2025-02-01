import { useTranslation } from 'next-i18next'

import { fullDateAndTime } from '../../utils/format'
import { TData, TRow } from '../TableDetails'

import * as Styled from './styled'
import { LinkAccount } from '../../utils/links'
import { TransactionCard } from './TransactionCard'

export const TransactionDetails = ({ tx }) => {
  const { t } = useTranslation()

  return (
    <TransactionCard tx={tx}>
      <TRow>
        <TData>{t('table.type')}:</TData>
        <TData>
          <Styled.Type>{tx.type}</Styled.Type>
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
    </TransactionCard>
  )
}
