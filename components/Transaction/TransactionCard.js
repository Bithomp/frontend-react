import CopyButton from '../UI/CopyButton'
import { useState } from 'react'
import { i18n, useTranslation } from 'next-i18next'

import { Card, Info, Heading, MainBody, Type } from './styled'
import { LedgerLink } from '../../utils/links'
import { TDetails, TBody, TRow, TData } from '../TableDetails'
import {
  AddressWithIconFilled,
  amountFormat,
  codeHighlight,
  fullDateAndTime,
  nativeCurrencyToFiat,
  timeFromNow
} from '../../utils/format'

export const TransactionCard = ({ data, pageFiatRate, selectedCurrency, children }) => {
  const { t } = useTranslation()
  const [showRawData, setShowRawData] = useState(false)
  const [showRawMeta, setShowRawMeta] = useState(false)

  if (!data) return null
  const { txHash, error_message, tx, outcome, meta, specification } = data
  const isSuccessful = outcome?.result == 'tesSUCCESS'

  /*
  {
    transaction: '2617C08D8D62E90083EC8EE5B573673B96C16CF3D64CF374F3C73A6A653C769E',
    error: 'txnNotFound',
    error_code: 29,
    error_message: 'Transaction not found.',
    status: 'error'
  }
  */

  return (
    <MainBody>
      <Heading>Transaction Details</Heading>
      <Card>
        <Info>
          {txHash} <CopyButton text={txHash} />
        </Info>
        {error_message ? (
          <Info className="orange">{error_message}</Info>
        ) : (
          <>
            {isSuccessful ? (
              <Info>
                The transaction was <b className="green">successfull</b> and validated in the ledger{' '}
                <LedgerLink version={outcome.ledgerIndex} /> (index: {outcome.indexInLedger}).
              </Info>
            ) : (
              <Info>
                The transaction <b className="red">FAILED</b> and included to the ledger{' '}
                <LedgerLink version={outcome.ledgerIndex} /> (index: {outcome.indexInLedger}).
              </Info>
            )}
            <TDetails>
              <TBody>
                <TRow>
                  <TData>{t('table.type')}</TData>
                  <TData>
                    <Type>{tx.TransactionType}</Type>
                  </TData>
                </TRow>
                <TRow>
                  <TData>Date and time</TData>
                  <TData>
                    {timeFromNow(tx.date, i18n, 'ripple')} ({fullDateAndTime(tx.date, 'ripple')})
                  </TData>
                </TRow>
                {children}
                <TRow>
                  <TData>Sequence</TData>
                  <TData>#{tx.Sequence}</TData>
                </TRow>
                <TRow>
                  <TData>Ledger fee</TData>
                  <TData>
                    {amountFormat(tx.Fee)}
                    {nativeCurrencyToFiat({
                      amount: tx.Fee,
                      selectedCurrency,
                      fiatRate: pageFiatRate
                    })}
                  </TData>
                </TRow>
                {tx?.ctid && (
                  <TRow>
                    <TData>CTID</TData>
                    <TData>
                      {tx.ctid} <CopyButton text={tx.ctid} />
                    </TData>
                  </TRow>
                )}
                {specification?.signer && (
                  <TRow>
                    <TData>Signer</TData>
                    <TData>
                      <AddressWithIconFilled data={specification.signer} name="address" />
                    </TData>
                  </TRow>
                )}
                {specification?.signers &&
                  specification?.signers.map((signer, index) => (
                    <TRow key={index}>
                      <TData>Signer {index + 1}:</TData>
                      <TData>
                        <AddressWithIconFilled data={signer} name="address" />
                      </TData>
                    </TRow>
                  ))}
                <TRow>
                  <TData>{t('table.raw-data')}</TData>
                  <TData>
                    <span className="link" onClick={() => setShowRawData(!showRawData)}>
                      {showRawData ? t('table.text.hide') : t('table.text.show')}
                    </span>
                  </TData>
                </TRow>
                <TRow>
                  <TData>Raw Tx Metadata</TData>
                  <TData>
                    <span className="link" onClick={() => setShowRawMeta(!showRawMeta)}>
                      {showRawMeta ? t('table.text.hide') : t('table.text.show')}
                    </span>
                  </TData>
                </TRow>
              </TBody>
            </TDetails>
            <div className={'slide ' + (showRawData ? 'opened' : 'closed')} style={{ margin: '0 15px' }}>
              {codeHighlight(tx)}
            </div>
            <div className={'slide ' + (showRawMeta ? 'opened' : 'closed')} style={{ margin: '0 15px' }}>
              {codeHighlight(meta)}
            </div>
          </>
        )}
      </Card>
    </MainBody>
  )
}
