import React from 'react'
import CopyButton from '../UI/CopyButton'
import { useState } from 'react'
import { i18n, useTranslation } from 'next-i18next'

import { LedgerLink, LinkTx } from '../../utils/links'
import { TData } from '../Table'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  codeHighlight,
  decodeJsonMemo,
  fullDateAndTime,
  nativeCurrencyToFiat,
  niceCurrency,
  shortHash,
  timeFromNow
} from '../../utils/format'
import { decode, server, xahauNetwork } from '../../utils'
import { dappBySourceTag, errorCodeDescription, shortErrorCode } from '../../utils/transaction'
import { add } from '../../utils/calc'

const gatewaySum = (balances) => {
  return balances?.reduce((sum, c) => add(sum, c.value), 0) || 0
}

const gatewayChanges = (balances) => {
  const sum = gatewaySum(balances)
  return (
    <span className={'bold ' + (sum > 0 ? 'green' : 'red')}>
      {sum > 0 ? '+' : ''}
      {amountFormat(
        {
          ...balances[0],
          value: sum
        },
        { precise: true }
      )}
    </span>
  )
}

const noBalanceChange = (change) => {
  return change?.balanceChanges?.[0]?.issuer === change.address && gatewaySum(change.balanceChanges) === '0'
}

export const TransactionCard = ({
  data,
  pageFiatRate,
  selectedCurrency,
  txTypeSpecial,
  notFullySupported,
  children
}) => {
  const { t } = useTranslation()
  const [showRawData, setShowRawData] = useState(false)
  const [showRawMeta, setShowRawMeta] = useState(false)
  const [showAdditionalData, setShowAdditionalData] = useState(false)

  if (!data) return null

  //console.log('TransactionCard', data) //delete

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

  const waitLedgers = tx?.LastLedgerSequence - outcome?.ledgerIndex

  const txLink = server + '/tx/' + (tx?.ctid || tx?.hash)

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
          if (memopiece.slice(0, 16) === 'xrplexplorer.com' || memopiece.slice(0, 11) === 'bithomp.com') {
            memopiece = ''
            clientname = 'bithomp.com'
          }

          if (memopiece.slice(0, 17) === 'xahauexplorer.com') {
            memopiece = ''
            clientname = 'xahauexplorer.com'
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
          }

          if (decodeJsonMemo(memopiece)) {
            output.push(
              <tr key={'a2' + j}>
                <TData>Memo {memos.length > 1 ? j + 1 : ''}</TData>
                <TData>
                  {memotype && (
                    <>
                      {memotype}
                      <br />
                    </>
                  )}
                  {decodeJsonMemo(memopiece)}
                </TData>
              </tr>
            )
          } else {
            if (memopiece.length > 100 && memopiece.split(' ').length === 1 && memopiece.includes('.')) {
              //jwt
              memopiece = memopiece.replace('"', '')
              const pieces = memopiece.split('.')
              output.push(
                <React.Fragment key={'jwt' + j}>
                  <tr>
                    <TData>JWT Header</TData>
                    <TData>{decodeJsonMemo(pieces[0], { code: 'base64' })}</TData>
                  </tr>
                  <tr>
                    <TData>JWT Payload</TData>
                    <TData>{decodeJsonMemo(pieces[1], { code: 'base64' })}</TData>
                  </tr>
                  <tr>
                    <TData>JWT Signature</TData>
                    <TData>
                      <pre>{pieces[2]}</pre>
                    </TData>
                  </tr>
                </React.Fragment>
              )
            } else {
              if (memopiece) {
                output.push(
                  <tr key={'a1' + j}>
                    <TData>Memo {memos.length > 1 ? j + 1 : ''}</TData>
                    <TData>
                      {memotype && memotype.toLowerCase() !== 'memo' && (
                        <span className="bold">
                          {memotype}
                          <br />
                        </span>
                      )}
                      {memopiece}
                    </TData>
                  </tr>
                )
              }
            }
          }

          if (clientname) {
            output.push(
              <tr key="a3">
                <TData>Client web</TData>
                <TData>
                  <a href={'https://' + clientname} rel="nofollow">
                    {clientname}
                  </a>
                </TData>
              </tr>
            )
          }
        }
      }
    }
    return output
  }

  const errorMessage = error_message || error

  const filteredBalanceChanges = outcome?.balanceChanges.filter((change) => !noBalanceChange(change))

  let emitTX = null
  if (xahauNetwork) {
    //check why wouldn't it be always in specs
    emitTX = specification?.emittedDetails?.emitParentTxnID || tx?.EmitDetails?.EmitParentTxnID
  }

  const dapp = dappBySourceTag(tx?.SourceTag)

  return (
    <>
      <div className="tx-body">
        <h1 className="tx-header">Transaction Details</h1>
        <div className="card-block">
          {id === tx?.hash && (
            <p className="center">
              <span className="bold brake">{id}</span> <CopyButton text={id} />
            </p>
          )}
          {errorMessage ? (
            <p className="center orange">{errorMessage}</p>
          ) : (
            <>
              <p className="center">
                {isSuccessful ? (
                  <>
                    The transaction was <b className="green">successful</b> and validated in the ledger{' '}
                    <LedgerLink version={outcome.ledgerIndex} /> (index: {outcome.indexInLedger}).
                  </>
                ) : (
                  <>
                    The transaction <b className="red">FAILED</b> and included to the ledger{' '}
                    <LedgerLink version={outcome.ledgerIndex} /> (index: {outcome.indexInLedger}).
                  </>
                )}
              </p>
              <table>
                <tbody>
                  {id === tx.ctid && (
                    <tr>
                      <TData>Compact Tx ID</TData>
                      <TData>
                        <span className="bold">{tx.ctid}</span> <CopyButton text={tx.ctid} />
                      </TData>
                    </tr>
                  )}
                  <tr>
                    <TData>{t('table.type')}</TData>
                    <TData>
                      <span className="bold">{txTypeSpecial || tx.TransactionType}</span>
                    </TData>
                  </tr>
                  {meta?.HookExecutions?.map((hr, i) => (
                    <tr key={i}>
                      <TData>Hook return {meta?.HookExecutions.length > 1 ? i + 1 : ''}:</TData>
                      <TData className="orange bold">{decode(hr.HookExecution?.HookReturnString)}</TData>
                    </tr>
                  ))}
                  {!isSuccessful && (
                    <>
                      <tr>
                        <TData className="bold">Failure</TData>
                        <TData className="red bold">{shortErrorCode(outcome.result)}</TData>
                      </tr>
                      <tr>
                        <TData className="bold">Description</TData>
                        <TData className="orange bold">{errorCodeDescription(outcome.result)}</TData>
                      </tr>
                    </>
                  )}
                  <tr>
                    <TData>{isSuccessful ? 'Validated' : 'Rejected'}</TData>
                    <TData>
                      {timeFromNow(tx.date, i18n, 'ripple')} ({fullDateAndTime(tx.date, 'ripple')})
                    </TData>
                  </tr>
                  {children}
                  <tr>
                    <TData>Ledger fee</TData>
                    <TData>
                      <span className="bold">{amountFormat(tx.Fee)}</span>
                      {nativeCurrencyToFiat({
                        amount: tx.Fee,
                        selectedCurrency,
                        fiatRate: pageFiatRate
                      })}
                    </TData>
                  </tr>

                  {xahauNetwork && (
                    <>
                      {outcome?.emittedTxns?.map((etx, i) => (
                        <tr key={i}>
                          <TData>Emitted TX {outcome?.emittedTxns?.length > 1 ? i + 1 : ''}</TData>
                          <TData>
                            <LinkTx tx={etx?.id} />
                          </TData>
                        </tr>
                      ))}
                      {emitTX && (
                        <tr>
                          <TData>Emit Parent TX</TData>
                          <TData>
                            <LinkTx tx={emitTX} />
                          </TData>
                        </tr>
                      )}
                    </>
                  )}
                  {dapp && (
                    <tr>
                      <TData>Client</TData>
                      <TData>{dapp}</TData>
                    </tr>
                  )}

                  {(tx.TransactionType === 'EscrowFinish' || tx.TransactionType === 'EscrowCancel') &&
                    specification?.source?.address !== outcome?.escrowChanges?.source?.address &&
                    specification?.source?.address !== outcome?.escrowChanges?.destination?.address && (
                      <tr>
                        <TData>Memos note</TData>
                        <TData className="orange">
                          Memos were added by the third party{' '}
                          {addressUsernameOrServiceLink(specification?.source, 'address')} that finished the Escrow.
                        </TData>
                      </tr>
                    )}

                  {specification?.memos && memoNode(specification.memos)}
                  {tx?.AccountTxnID && (
                    <tr>
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
                    </tr>
                  )}
                  {specification?.signer && (
                    <tr>
                      <TData>Signer</TData>
                      <TData>
                        <AddressWithIconFilled data={specification.signer} name="address" />
                      </TData>
                    </tr>
                  )}
                  {specification?.signers &&
                    specification?.signers.map((signer, index) => (
                      <tr key={index}>
                        <TData>Signer {index + 1}:</TData>
                        <TData>
                          <AddressWithIconFilled data={signer} name="address" />
                        </TData>
                      </tr>
                    ))}
                  {/* keep here outcome?.balanceChanges.length, to hide simple xrp and to show iou payments that are filtered when gateway doesn't have a transfer fee */}
                  {tx.TransactionType !== 'UNLReport' && (outcome?.balanceChanges.length > 2 || notFullySupported) && (
                    <>
                      {filteredBalanceChanges.length > 1 && (
                        <tr>
                          <TData>Affected accounts</TData>
                          <TData>
                            There are <span className="bold">{filteredBalanceChanges.length}</span> accounts that were
                            affected by this transaction.
                          </TData>
                        </tr>
                      )}
                      {filteredBalanceChanges.map((change, index) => {
                        return (
                          <tr key={index}>
                            <TData>
                              Account {index + 1}
                              {change.address === tx.Account && (
                                <span className="bold">
                                  <br />
                                  Initiator
                                </span>
                              )}
                              {change?.balanceChanges?.[0]?.issuer === change.address && (
                                <span className="bold">
                                  <br />
                                  {niceCurrency(change.balanceChanges[0].currency)} issuer
                                </span>
                              )}
                            </TData>
                            <TData>
                              <div style={{ height: '10px' }}></div>
                              <AddressWithIconFilled data={change} name="address" />
                              {change?.balanceChanges?.[0]?.issuer === change.address
                                ? gatewayChanges(change.balanceChanges)
                                : change.balanceChanges?.map((c, i) => {
                                    return (
                                      <div key={i}>
                                        <span className={'bold ' + (Number(c.value) > 0 ? 'green' : 'red')}>
                                          {Number(c.value) > 0 ? '+' : ''}
                                          {amountFormat(c, { precise: true })}
                                        </span>
                                        {c.issuer && (
                                          <>({addressUsernameOrServiceLink(c, 'issuer', { short: true })})</>
                                        )}
                                        {nativeCurrencyToFiat({
                                          amount: c,
                                          selectedCurrency,
                                          fiatRate: pageFiatRate
                                        })}
                                      </div>
                                    )
                                  })}
                              <div style={{ height: '10px' }}></div>
                            </TData>
                          </tr>
                        )
                      })}
                    </>
                  )}
                  <tr>
                    <TData>Transaction link</TData>
                    <TData>
                      {txLink} <CopyButton text={txLink} />
                    </TData>
                  </tr>
                  <tr>
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
                  </tr>
                  {showAdditionalData && (
                    <>
                      {tx.SetFlag !== undefined && (
                        <tr>
                          <TData>Set flag</TData>
                          <TData>{tx.SetFlag}</TData>
                        </tr>
                      )}
                      {tx?.TransactionType !== 'UNLReport' && (
                        <>
                          {tx.TicketSequence ? (
                            <tr>
                              <TData>
                                <span className="bold">Ticket</span> sequence
                              </TData>
                              <TData>#{tx.TicketSequence}</TData>
                            </tr>
                          ) : (
                            <tr>
                              <TData>Sequence</TData>
                              <TData>#{tx.Sequence}</TData>
                            </tr>
                          )}
                        </>
                      )}
                      {(dapp ||
                        (tx?.SourceTag !== undefined &&
                          tx.TransactionType !== 'Payment' &&
                          !tx.TransactionType?.includes('Check'))) && (
                        <tr>
                          <TData>Source tag</TData>
                          <TData>{tx?.SourceTag}</TData>
                        </tr>
                      )}
                      {tx?.hash && id !== tx.hash && (
                        <tr>
                          <TData>Transaction hash</TData>
                          <TData>
                            {shortHash(tx.hash, 10)} <CopyButton text={tx.hash} />
                          </TData>
                        </tr>
                      )}
                      {tx?.ctid && id !== tx.ctid && (
                        <tr>
                          <TData>Compact Tx ID</TData>
                          <TData>
                            {tx.ctid} <CopyButton text={tx.ctid} />
                          </TData>
                        </tr>
                      )}
                      {tx?.LastLedgerSequence && (
                        <tr>
                          <TData tooltip="The last ledger sequence number that the transaction can be included in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected.">
                            Last ledger
                          </TData>
                          <TData>
                            #{tx.LastLedgerSequence} ({waitLedgers} {waitLedgers === 1 ? 'ledger' : 'ledgers'})
                          </TData>
                        </tr>
                      )}
                      {tx?.NetworkID && (
                        <tr>
                          <TData tooltip="The network ID of the chain this transaction is intended for.">
                            Network ID
                          </TData>
                          <TData>{tx.NetworkID}</TData>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
              <div className={'slide ' + (showRawData ? 'opened' : 'closed')} style={{ margin: '0 15px' }}>
                {codeHighlight(tx)}
              </div>
              <div className={'slide ' + (showRawMeta ? 'opened' : 'closed')} style={{ margin: '0 15px' }}>
                {codeHighlight(meta)}
              </div>
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .card-block {
          border-top: 4px solid var(--accent-link);
          box-shadow: 0 1px 3px 0 var(--shadow);
          padding: 8px;
        }
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
