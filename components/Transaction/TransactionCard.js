import React from 'react'
import CopyButton from '../UI/CopyButton'
import { useState } from 'react'
import { i18n, useTranslation } from 'next-i18next'

import { Card, Info, Type } from './styled'
import { LedgerLink, LinkTx } from '../../utils/links'
import { TDetails, TBody, TRow, TData } from '../TableDetails'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  codeHighlight,
  fullDateAndTime,
  nativeCurrencyToFiat,
  shortHash,
  timeFromNow
} from '../../utils/format'
import { decode, server } from '../../utils'
import { errorCodeDescription, shortErrorCode } from '../../utils/transaction'

export const TransactionCard = ({ data, pageFiatRate, selectedCurrency, txTypeSpecial, children }) => {
  const { t } = useTranslation()
  const [showRawData, setShowRawData] = useState(false)
  const [showRawMeta, setShowRawMeta] = useState(false)
  const [showAdditionalData, setShowAdditionalData] = useState(false)

  if (!data) return null

  const { id, error_message, tx, outcome, meta, specification, error } = data
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

  const hookReturn = meta?.HookExecutions?.[0]?.HookExecution?.HookReturnString

  const waitLedgers = tx?.LastLedgerSequence - outcome?.ledgerIndex

  const txLink = server + '/tx/' + (tx?.ctid || tx?.hash)

  const decodeJsonMemo = (memopiece, options) => {
    if (options?.code === 'base64') {
      try {
        memopiece = atob(memopiece)
      } catch (e) {
        return memopiece
      }
    }
    if (memopiece[0] === '{') {
      memopiece = JSON.parse(memopiece)
      return codeHighlight(memopiece)
    }
    return ''
  }

  const memoNode = (memos) => {
    let output = []
    if (memos && Array.isArray(memos)) {
      for (let j = 0; j < memos.length; j++) {
        const memo = memos[j]
        let memotype = memo?.type
        let memopiece = memo?.data
        let memoformat = memo?.format

        if (!memopiece && memoformat?.slice(0, 2) === 'rt') {
          memopiece = memoformat
        }

        let clientname = ''

        if (memopiece) {
          if (memopiece.slice(0, 16) === 'xrplexplorer.com') {
            memopiece = memopiece.slice(16)
            clientname = 'xrplexplorer.com'
          }

          if (memotype) {
            if (memotype.slice(0, 25) === '[https://xumm.community]-') {
              memotype = memotype.slice(25)
              clientname = 'xumm.community'
            } else if (memotype.slice(0, 24) === '[https://xrpl.services]-') {
              memotype = memotype.slice(24)
              clientname = 'xrpl.services'
            } else {
              memotype = memotype.charAt(0).toUpperCase() + memotype.slice(1)
            }
          } else {
            memotype = 'Memo'
          }

          if (decodeJsonMemo(memopiece)) {
            output.push(
              <TRow key={'a2' + j}>
                <TData>{memotype}</TData>
                <TData>{decodeJsonMemo(memopiece)}</TData>
              </TRow>
            )
          } else {
            if (memopiece.length > 100 && memopiece.split(' ').length === 1) {
              //jwt
              memopiece = memopiece.replace('"', '')
              const pieces = memopiece.split('.')
              output.push(
                <React.Fragment key={'jwt' + j}>
                  <TRow>
                    <TData>JWT Header</TData>
                    <TData>{decodeJsonMemo(pieces[0], { code: 'base64' })}</TData>
                  </TRow>
                  <TRow>
                    <TData>JWT Payload</TData>
                    <TData>{decodeJsonMemo(pieces[1], { code: 'base64' })}</TData>
                  </TRow>
                  <TRow>
                    <TData>JWT Signature</TData>
                    <TData>
                      <pre>{pieces[2]}</pre>
                    </TData>
                  </TRow>
                </React.Fragment>
              )
            } else {
              output.push(
                <TRow key={'a1' + j}>
                  <TData>{memotype}</TData>
                  <TData>{memopiece}</TData>
                </TRow>
              )
            }
          }

          if (clientname) {
            output.push(
              <TRow key="a3">
                <TData>Client</TData>
                <TData>
                  <a href={'https://' + clientname} rel="nofollow">
                    {clientname}
                  </a>
                </TData>
              </TRow>
            )
          }
        }
      }
    }
    return output
  }

  const errorMessage = error_message || error

  return (
    <>
      <div className="tx-body">
        <h1 className="tx-header">Transaction Details</h1>
        <Card>
          {id === tx?.hash && (
            <Info>
              <span className="bold">{id}</span> <CopyButton text={id} />
            </Info>
          )}
          {errorMessage ? (
            <Info className="orange">{errorMessage}</Info>
          ) : (
            <>
              {isSuccessful ? (
                <Info>
                  The transaction was <b className="green">successful</b> and validated in the ledger{' '}
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
                  {id === tx.ctid && (
                    <TRow>
                      <TData>Compact Tx ID</TData>
                      <TData>
                        <span className="bold">{tx.ctid}</span> <CopyButton text={tx.ctid} />
                      </TData>
                    </TRow>
                  )}
                  <TRow>
                    <TData>{t('table.type')}</TData>
                    <TData>
                      <Type>{txTypeSpecial || tx.TransactionType}</Type>
                    </TData>
                  </TRow>
                  {hookReturn && (
                    <TRow>
                      <TData>Hook return</TData>
                      <TData className="orange bold">{decode(hookReturn)}</TData>
                    </TRow>
                  )}
                  {!isSuccessful && (
                    <>
                      <TRow>
                        <TData className="bold">Failure</TData>
                        <TData className="red bold">{shortErrorCode(outcome.result)}</TData>
                      </TRow>
                      <TRow>
                        <TData className="bold">Description</TData>
                        <TData className="orange bold">{errorCodeDescription(outcome.result)}</TData>
                      </TRow>
                      {tx?.TransactionType === 'Payment' && specification?.source?.addressDetails?.service && (
                        <TRow>
                          <TData className="bold">Problem solving</TData>
                          <TData className="bold">
                            The transaction <span class="red">FAILED</span>, if your balance changed, contact{' '}
                            {addressUsernameOrServiceLink(specification.source, 'address')} support.
                          </TData>
                        </TRow>
                      )}
                    </>
                  )}
                  <TRow>
                    <TData>{isSuccessful ? 'Validated' : 'Rejected'}</TData>
                    <TData>
                      {timeFromNow(tx.date, i18n, 'ripple')} ({fullDateAndTime(tx.date, 'ripple')})
                    </TData>
                  </TRow>
                  {children}
                  <TRow>
                    <TData>Ledger fee</TData>
                    <TData>
                      <span className="bold">{amountFormat(tx.Fee)}</span>
                      {nativeCurrencyToFiat({
                        amount: tx.Fee,
                        selectedCurrency,
                        fiatRate: pageFiatRate
                      })}
                    </TData>
                  </TRow>
                  {specification?.memos && memoNode(specification.memos)}
                  {tx?.AccountTxnID && (
                    <TRow>
                      <TData
                        tooltip={
                          isSuccessful
                            ? 'This transaction is only valid as there is such a previously-sent transaction.'
                            : 'This transaction is only valid if there is such a previously-sent transaction.'
                        }
                      >
                        Previous transaction
                      </TData>
                      <TData>
                        <LinkTx tx={tx?.AccountTxnID} />
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
                    <TData>Transaction link</TData>
                    <TData>
                      {txLink} <CopyButton text={txLink} />
                    </TData>
                  </TRow>
                  <TRow>
                    <TData>Show more</TData>
                    <TData>
                      <span className="link" onClick={() => setShowAdditionalData(!showAdditionalData)}>
                        Additional data
                      </span>{' '}
                      |{' '}
                      <span className="link" onClick={() => setShowRawData(!showRawData)}>
                        {t('table.raw-data')}
                      </span>{' '}
                      |{' '}
                      <span className="link" onClick={() => setShowRawMeta(!showRawMeta)}>
                        Tx Metadata
                      </span>
                    </TData>
                  </TRow>
                  {showAdditionalData && (
                    <>
                      {tx?.TransactionType !== 'UNLReport' && (
                        <>
                          {tx.TicketSequence ? (
                            <TRow>
                              <TData>Ticket sequence</TData>
                              <TData>#{tx.TicketSequence}</TData>
                            </TRow>
                          ) : (
                            <TRow>
                              <TData>Sequence</TData>
                              <TData>#{tx.Sequence}</TData>
                            </TRow>
                          )}
                        </>
                      )}
                      {tx?.hash && id !== tx.hash && (
                        <TRow>
                          <TData>Transaction hash</TData>
                          <TData>
                            {shortHash(tx.hash, 10)} <CopyButton text={tx.hash} />
                          </TData>
                        </TRow>
                      )}
                      {tx?.ctid && id !== tx.ctid && (
                        <TRow>
                          <TData>Compact Tx ID</TData>
                          <TData>
                            {tx.ctid} <CopyButton text={tx.ctid} />
                          </TData>
                        </TRow>
                      )}
                      {tx?.LastLedgerSequence && (
                        <TRow>
                          <TData
                            tooltip={
                              'The last ledger sequence number that the transaction can be included in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected.'
                            }
                          >
                            Last ledger
                          </TData>
                          <TData>
                            #{tx.LastLedgerSequence} ({waitLedgers} {waitLedgers === 1 ? 'ledger' : 'ledgers'})
                          </TData>
                        </TRow>
                      )}
                      {tx?.NetworkID && (
                        <TRow>
                          <TData tooltip="The network ID of the chain this transaction is intended for.">
                            Network ID
                          </TData>
                          <TData>{tx.NetworkID}</TData>
                        </TRow>
                      )}
                    </>
                  )}
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
      </div>
      <style jsx>{`
        .tx-body {
          margin: 40px auto;
          width: calc(100% - 40px);
          max-width: 760px;
          z-index: 1;
          position: relative;
        }
        .tx-header {
          margin: 24px 0;
          color: var(--text-main);
          font-size: 16px;
          font-weight: 700;
          text-align: left;
          text-transform: uppercase;
        }
      `}</style>
    </>
  )
}
