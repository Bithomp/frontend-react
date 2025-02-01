import CopyButton from '../UI/CopyButton'
import { useState } from 'react'
import { useTranslation } from 'next-i18next'

import { Card, Info, Heading, MainBody } from './styled'
import { LedgerLink } from '../../utils/links'
import { TDetails, TBody, TRow, TData } from '../TableDetails'
import { amountFormat, codeHighlight } from '../../utils/format'

export const TransactionCard = ({ tx, children }) => {
  const isSuccessful = tx.outcome?.result == 'tesSUCCESS'

  const { t } = useTranslation()

  const [showRawData, setShowRawData] = useState(false)

  return (
    <MainBody>
      <Heading>Transaction Details</Heading>
      <Card>
        <Info>
          {tx.id} <CopyButton text={tx.id} />
        </Info>
        {tx.error ? (
          <Info>{tx.error_message}</Info>
        ) : (
          <>
            {isSuccessful ? (
              <Info>
                The transaction was <b className="green">successfull</b> and validated in the ledger{' '}
                <LedgerLink version={tx.outcome.ledgerVersion} /> (index: {tx.outcome.indexInLedger}).
              </Info>
            ) : (
              <Info>
                The transaction <b className="red">FAILED</b> and included to the ledger{' '}
                <LedgerLink version={tx.outcome.ledgerVersion} /> (index: {tx.outcome.indexInLedger}).
              </Info>
            )}
            <TDetails>
              <TBody>
                {children}
                <TRow>
                  <TData>Sequence:</TData>
                  <TData>#{tx.sequence}</TData>
                </TRow>
                <TRow>
                  <TData>Ledger fee:</TData>
                  <TData>{amountFormat(tx.rawTransaction?.Fee)}</TData>
                </TRow>
                {tx.rawTransaction?.ctid && (
                  <TRow>
                    <TData>CTID:</TData>
                    <TData>
                      {tx.rawTransaction.ctid} <CopyButton text={tx.rawTransaction.ctid} />
                    </TData>
                  </TRow>
                )}
                <TRow>
                  <TData>{t('table.raw-data')}</TData>
                  <TData>
                    <span className="link" onClick={() => setShowRawData(!showRawData)}>
                      {showRawData ? t('table.text.hide') : t('table.text.show')}
                    </span>
                  </TData>
                </TRow>
              </TBody>
            </TDetails>
            <div className={'slide ' + (showRawData ? 'opened' : 'closed')} style={{ margin: '0 15px' }}>
              {codeHighlight(tx.rawTransaction)}
            </div>
          </>
        )}
      </Card>
    </MainBody>
  )
}
