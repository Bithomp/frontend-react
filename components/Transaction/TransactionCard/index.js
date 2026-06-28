import React from 'react'
import CopyButton from '../../UI/CopyButton'
import { useState } from 'react'
import { i18n, Trans, useTranslation } from 'next-i18next'

import { LedgerLink, LinkTx } from '../../../utils/links'
import { TData } from '../TData'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  codeHighlight,
  fullDateAndTime,
  tokenToFiat,
  niceCurrency,
  shortHash,
  timeFromNow
} from '../../../utils/format'
import { decodeCTID, isValidCTID, localePath, nativeCurrency, networksIds, server, xahauNetwork } from '../../../utils'
import {
  dappBySourceTag,
  errorCodeDescription,
  getTransactionTypeLabel,
  memoNode,
  shortErrorCode
} from '../../../utils/transaction'
import { add } from '../../../utils/calc'
import { useIsMobile } from '../../../utils/mobile'
import ExchangesTable from './ExchangeTable'

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

const titleCaseStatus = (status, locale) => {
  if (!status) return ''

  const value = status.toLocaleLowerCase(locale)
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1)
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
  const { t: txT } = useTranslation('transaction')
  const { t: txErrorT } = useTranslation('transaction-errors')
  const [showRawData, setShowRawData] = useState(false)
  const [showRawMeta, setShowRawMeta] = useState(false)
  const [showAdditionalData, setShowAdditionalData] = useState(false)
  const [showBalanceChanges, setShowBalanceChanges] = useState(false)
  const isMobile = useIsMobile(560)

  if (!data) return null

  const { id, error_message, tx, outcome, meta, specification, error, validated, message } = data
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  let errorMessage = error_message || error

  if (message && message === 'Invalid Network ID' && id) {
    if (isValidCTID(id)) {
      try {
        const { networkId: CTIDnetworkId } = decodeCTID(id)
        if (networksIds[CTIDnetworkId]) {
          errorMessage = (
            <>
              {txT('messages.invalidNetworkKnown.prefix')}{' '}
              <span className="bold">{networksIds[CTIDnetworkId].name}</span>{' '}
              {txT('messages.invalidNetworkKnown.suffix')}
              <br />
              <br />
              <a href={networksIds[CTIDnetworkId].server + localePath('/tx/' + id, i18n.language)}>
                {networksIds[CTIDnetworkId].server + localePath('/tx/' + id, i18n.language)}
              </a>
            </>
          )
        } else {
          errorMessage =
            'This transaction is from the ' + CTIDnetworkId + ' network, ' + t('explorer.not-supported-network')
        }
      } catch (e) {
        return
      }
    }
  }

  /*
  {
    transaction: '2617C08D8D62E90083EC8EE5B573673B96C16CF3D64CF374F3C73A6A653C769E',
    error: 'txnNotFound',
    error_code: 29,
    error_message: 'Transaction not found.',
    status: 'error'
  }
  */

  const waitLedgers = outcome ? tx?.LastLedgerSequence - outcome?.ledgerIndex : null

  const showHeaderTxId = id === tx?.hash || id === tx?.ctid
  const headerTxId = showHeaderTxId ? id : null
  const headerTxLink = headerTxId ? server + '/tx/' + headerTxId : null

  const filteredBalanceChanges = outcome?.balanceChanges?.filter((change) => !noBalanceChange(change))
  const hasFilteredBalanceChanges = filteredBalanceChanges?.length > 0
  const showAffectedAccounts =
    tx?.TransactionType !== 'UNLReport' &&
    hasFilteredBalanceChanges &&
    (filteredBalanceChanges.length > 2 || notFullySupported || showBalanceChanges)
  const showBalanceChangesAction =
    hasFilteredBalanceChanges && !(filteredBalanceChanges.length > 2 || notFullySupported)

  const isInsufFee = outcome?.result === 'tecINSUFF_FEE'
  const actualBurnedFeeAmount = (() => {
    if (!isInsufFee || !tx?.Account) return null
    const senderChange = outcome?.balanceChanges?.find((c) => c.address === tx.Account)
    const nativeChange = senderChange?.balanceChanges?.find((c) => c.currency === nativeCurrency)
    if (!nativeChange?.value) return null
    const absValue = Math.abs(parseFloat(nativeChange.value))
    if (!absValue) return null
    return { currency: nativeCurrency, value: String(absValue) }
  })()

  let emitTX = null
  if (xahauNetwork) {
    //check why wouldn't it be always in specs
    emitTX = specification?.emittedDetails?.emitParentTxnID || tx?.EmitDetails?.EmitParentTxnID
  }

  const dapp = dappBySourceTag(tx?.SourceTag)
  const transactionTypeTitle = txTypeSpecial || tx?.TransactionType
  const transactionTypeLabel = transactionTypeTitle
    ? txT(`labels.${transactionTypeTitle}`, { defaultValue: getTransactionTypeLabel(transactionTypeTitle) })
    : ''
  const transactionStatusTitle = outcome
    ? titleCaseStatus(isSuccessful ? txT('status.successful') : txT('status.failed'), i18n.language)
    : null
  const transactionFinalityTitle = validated
    ? titleCaseStatus(
        isSuccessful ? txT('status.confirmed') : txT('status.final', { defaultValue: 'final' }),
        i18n.language
      )
    : null
  const transactionTitle = transactionTypeLabel || txT('details.title')
  const txCopyButtonText = isMobile
    ? txT('actions.copyLinkMobile', {
        defaultValue: t('button.copy') + ' link'
      })
    : txT('actions.copyLink')
  const memoLabels = {
    memoLabel: txT('labels.Memo'),
    labels: {
      'JWT Header': txT('labels.JWT Header'),
      'JWT Payload': txT('labels.JWT Payload'),
      'JWT Signature': txT('labels.JWT Signature'),
      'Client web': txT('labels.Client web')
    },
    label: (value) => txT(`labels.${value}`, { defaultValue: value })
  }

  return (
    <>
      <div className="tx-body">
        <div className="card-block">
          <div className="tx-title-block">
            <div className="tx-title-line">
              <h1 className="tx-header">{transactionTitle}</h1>
              {transactionStatusTitle && (
                <span className={'tx-status-badge ' + (isSuccessful ? 'successful' : 'failed')}>
                  {transactionStatusTitle}
                </span>
              )}
              {transactionFinalityTitle && (
                <span className={'tx-status-badge ' + (isSuccessful ? 'confirmed' : 'final')}>
                  {transactionFinalityTitle}
                </span>
              )}
            </div>
            {showHeaderTxId && (
              <div className="tx-id-row">
                <span className="tx-id-value">{headerTxId}</span>
                <span className="tx-id-actions">
                  <CopyButton
                    text={headerTxLink}
                    copyText={txCopyButtonText}
                    className="tx-copy-tooltip"
                    buttonClassName="tx-copy-action"
                    clickTooltipOnly={true}
                    title={false}
                  >
                    {txCopyButtonText}
                  </CopyButton>
                </span>
              </div>
            )}
          </div>
          {errorMessage ? (
            <p className="center orange">{errorMessage}</p>
          ) : (
            <>
              {!outcome && !validated && tx && (
                <p className="center red bold">
                  {txT('messages.notValidated')}
                  {tx?.LastLedgerSequence && (
                    <>
                      <br />
                      {txT('messages.notValidatedAfterLedger', { ledger: tx.LastLedgerSequence })}
                    </>
                  )}
                </p>
              )}
              <table className="tx-detail-table">
                <tbody>
                  {tx?.TransactionType && (
                    <tr>
                      <TData>{txT('labels.Transaction type', { defaultValue: 'Transaction type' })}</TData>
                      <TData>
                        <span className="bold">{tx.TransactionType}</span>
                      </TData>
                    </tr>
                  )}
                  {specification?.flags?.innerBatchTxn && (
                    <tr>
                      <TData>Batch</TData>
                      <TData>
                        <span className="bold orange">{txT('labels.Inner transaction')}</span>
                      </TData>
                    </tr>
                  )}
                  {specification?.domainID && (
                    <tr>
                      <TData>Domain ID</TData>
                      <TData>
                        {shortHash(specification.domainID)} <CopyButton text={specification.domainID} />
                      </TData>
                    </tr>
                  )}
                  {outcome?.hooksExecutions?.map((hr, i) => (
                    <tr key={i}>
                      <TData>Hook return{outcome?.hooksExecutions.length > 1 ? ' ' + (i + 1) : ''}</TData>
                      <TData className="orange bold">{hr.returnString}</TData>
                    </tr>
                  ))}
                  {outcome && !isSuccessful && (
                    <>
                      <tr>
                        <TData className="bold">{txT('labels.Failure')}</TData>
                        <TData className="red bold">{shortErrorCode(outcome.result)}</TData>
                      </tr>
                      <tr>
                        <TData className="bold">{txT('labels.Description')}</TData>
                        <TData className="orange bold">{errorCodeDescription(outcome.result, txErrorT)}</TData>
                      </tr>
                    </>
                  )}
                  {children}
                  {validated && (
                    <tr className="tx-confirmed-row">
                      <TData>{isSuccessful ? transactionFinalityTitle : txT('labels.Rejected')}</TData>
                      <TData>
                        {timeFromNow(tx.date, i18n, 'ripple')} ({fullDateAndTime(tx.date, 'ripple')})
                        {outcome?.ledgerIndex && (
                          <>
                            {' '}
                            <Trans
                              i18nKey="messages.validatedInLedger"
                              ns="transaction"
                              values={{ index: outcome.indexInLedger }}
                              components={{ ledgerLink: <LedgerLink version={outcome.ledgerIndex} /> }}
                            />
                          </>
                        )}
                      </TData>
                    </tr>
                  )}
                  <tr className="tx-fee-row">
                    <TData>{txT('labels.Ledger fee')}</TData>
                    <TData>
                      <span className="bold">
                        {amountFormat(isInsufFee && actualBurnedFeeAmount ? actualBurnedFeeAmount : tx?.Fee)}
                      </span>
                      {tokenToFiat({
                        amount: isInsufFee && actualBurnedFeeAmount ? actualBurnedFeeAmount : tx?.Fee,
                        selectedCurrency,
                        fiatRate: pageFiatRate
                      })}
                      {isInsufFee && tx?.Fee && (
                        <div className="orange" style={{ fontSize: '0.9em', marginTop: '2px' }}>
                          {txT('messages.specifiedFee', { fee: amountFormat(tx?.Fee) })}
                        </div>
                      )}
                    </TData>
                  </tr>

                  {xahauNetwork && (
                    <>
                      {outcome?.emittedTxns?.map((etx, i) => (
                        <tr key={i}>
                          <TData>Emitted TX {outcome?.emittedTxns?.length > 1 ? i + 1 : ''}</TData>
                          <TData>
                            {etx?.tx?.TransactionType}{' '}
                            {etx?.tx?.TransactionType === 'Payment' && (
                              <>
                                [<span className="bold">{amountFormat(etx?.tx?.Amount, { noSpace: true })} </span>
                                {tokenToFiat({
                                  amount: etx?.tx?.Amount,
                                  selectedCurrency,
                                  fiatRate: pageFiatRate
                                })}{' '}
                                ]{' '}
                              </>
                            )}
                            <LinkTx tx={etx?.txHash} icon={true} />
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
                      <TData>App/Dapp</TData>
                      <TData>{dapp}</TData>
                    </tr>
                  )}

                  {(tx?.TransactionType === 'EscrowFinish' || tx?.TransactionType === 'EscrowCancel') &&
                    specification?.source?.address !== outcome?.escrowChanges?.source?.address &&
                    specification?.source?.address !== outcome?.escrowChanges?.destination?.address &&
                    isSuccessful && (
                      <tr>
                        <TData>{txT('labels.Memos note')}</TData>
                        <TData className="orange">
                          {txT('messages.memosThirdParty.prefix')}{' '}
                          {addressUsernameOrServiceLink(specification?.source, 'address')}{' '}
                          {txT('messages.memosThirdParty.suffix')}
                        </TData>
                      </tr>
                    )}

                  {specification?.memos && memoNode(specification.memos, 'tr', memoLabels)}
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
                    <tr className="tx-signer-row">
                      <TData>
                        {specification.delegate?.address === specification.signer.address && (
                          <span className="bold orange">{txT('labels.Delegate')} </span>
                        )}
                        {txT('labels.Signer')}
                      </TData>
                      <TData>
                        <AddressWithIconFilled data={specification.signer} name="address" />
                      </TData>
                    </tr>
                  )}
                  {specification?.signers &&
                    specification?.signers.map((signer, index) => (
                      <tr className="tx-signer-row" key={index}>
                        <TData>{txT('labels.signerNumber', { number: index + 1 })}</TData>
                        <TData>
                          <AddressWithIconFilled data={signer} name="address" />
                        </TData>
                      </tr>
                    ))}
                  {showAffectedAccounts && (
                    <>
                      <tr>
                        <TData>Affected accounts</TData>
                        <TData>
                          {filteredBalanceChanges.length > 1 && (
                            <Trans
                              i18nKey="messages.affectedAccounts.summary"
                              ns="transaction"
                              count={filteredBalanceChanges.length}
                              components={{ bold: <span className="bold" /> }}
                            />
                          )}
                        </TData>
                      </tr>
                      {filteredBalanceChanges.map((change, index) => {
                        let gateway = change?.balanceChanges?.every((changeItem) => changeItem.issuer === change.address)
                        return (
                          <tr key={index}>
                            <TData>
                              {txT('labels.Account')} {index + 1}
                              {change.address === tx.Account && (
                                <span className="bold tx-account-role">
                                  {txT('labels.Initiator')}
                                </span>
                              )}
                              {gateway && (
                                <span className="bold tx-account-role">
                                  {niceCurrency(change.balanceChanges[0].currency)} {txT('labels.issuer')}
                                </span>
                              )}
                            </TData>
                            <TData>
                              <div className="tx-affected-account">
                                <div className="tx-affected-address">
                                  <AddressWithIconFilled data={change} name="address" />
                                </div>
                                <div className="tx-affected-balances">
                                  {gateway
                                    ? gatewayChanges(change.balanceChanges)
                                    : change.balanceChanges?.map((c, i) => {
                                        return (
                                          <div key={i}>
                                            {amountFormat(c, {
                                              precise: 'nice',
                                              withIssuer: true,
                                              bold: true,
                                              showPlus: true,
                                              color: 'direction'
                                            })}
                                            <span suppressHydrationWarning>
                                              {tokenToFiat({
                                                amount: c,
                                                selectedCurrency,
                                                fiatRate: pageFiatRate,
                                                asText: true
                                              })}
                                            </span>
                                          </div>
                                        )
                                      })}
                                </div>
                              </div>
                            </TData>
                          </tr>
                        )
                      })}
                    </>
                  )}
                  {!tx?.TransactionType.includes('AMM') && outcome?.exchanges?.length > 0 && (
                    <>
                      <tr>
                        <TData style={{ verticalAlign: 'top' }}>
                          {outcome?.exchanges?.length > 1 ? txT('labels.Exchanges') : txT('labels.Exchange')}
                        </TData>
                        <TData>
                          {outcome?.exchanges?.length > 1 && (
                            <>
                              <Trans
                                i18nKey="messages.exchanges.summary"
                                ns="transaction"
                                count={outcome.exchanges.length}
                                components={{ bold: <span className="bold" /> }}
                              />
                              <br />
                              <br />
                            </>
                          )}
                          <ExchangesTable exchanges={outcome.exchanges} ledgerIndex={outcome.ledgerIndex} />
                        </TData>
                      </tr>
                    </>
                  )}

                  <tr className="tx-show-more-row">
                    <TData>Show more</TData>
                    <TData>
                      <span className="tx-action-list">
                        <span className="link" onClick={() => setShowAdditionalData(!showAdditionalData)}>
                          {txT('actions.additionalData')}
                        </span>
                      </span>
                      {showBalanceChangesAction && (
                        <>
                          <span className="tx-action-separator">|</span>
                          <span className="tx-action-list">
                            <span className="link" onClick={() => setShowBalanceChanges(!showBalanceChanges)}>
                              {txT('actions.balanceChanges')}
                            </span>
                          </span>{' '}
                        </>
                      )}
                      <span className="tx-action-separator">|</span>
                      <span className="tx-action-list">
                        <span className="link" onClick={() => setShowRawData(!showRawData)}>
                          {t('table.raw-data')}
                        </span>
                      </span>
                      <span className="tx-action-separator">|</span>
                      <span className="tx-action-list">
                        <span className="link" onClick={() => setShowRawMeta(!showRawMeta)}>
                          {txT('actions.txMetadata')}
                        </span>
                      </span>{' '}
                    </TData>
                  </tr>
                  {showAdditionalData && (
                    <>
                      {specification?.memos && memoNode(specification.memos, 'additional', memoLabels)}
                      {tx.SetFlag !== undefined && (
                        <tr>
                          <TData>Set flag</TData>
                          <TData>{tx.SetFlag}</TData>
                        </tr>
                      )}
                      {tx.Flags !== undefined && (
                        <tr>
                          <TData tooltip="Set of bit-flags for this transaction (UInt32)">Flags value</TData>
                          <TData>{tx.Flags}</TData>
                        </tr>
                      )}
                      {tx.ClearFlag !== undefined && (
                        <tr>
                          <TData tooltip="Unique identifier of a flag to disable for this account.">Clear flag</TData>
                          <TData>{tx.ClearFlag}</TData>
                        </tr>
                      )}
                      {tx?.TransactionType !== 'UNLReport' && (
                        <>
                          {tx.TicketSequence ? (
                            <tr>
                              <TData tooltip="The sequence number of the ticket to use in place of a Sequence number.">
                                <Trans
                                  i18nKey="labels.ticketSequenceRich"
                                  ns="transaction"
                                  components={{ bold: <span className="bold" /> }}
                                />
                              </TData>
                              <TData>{tx.TicketSequence}</TData>
                            </tr>
                          ) : (
                            <tr>
                              <TData tooltip="The sequence number of the account sending the transaction.">
                                {txT('labels.Sequence')}
                              </TData>
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
                          <TData>{txT('labels.Source tag')}</TData>
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
                            #{tx.LastLedgerSequence}
                            {waitLedgers && (
                              <>
                                {' '}
                                ({waitLedgers}{' '}
                                {waitLedgers === 1 ? txT('labels.ledger') : txT('labels.ledgers')})
                              </>
                            )}
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
              <div className={'tx-raw-slide slide ' + (showRawData ? 'opened' : 'closed')}>
                {codeHighlight(tx)}
              </div>
              <div className={'tx-raw-slide slide ' + (showRawMeta ? 'opened' : 'closed')}>
                {codeHighlight(meta)}
              </div>
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .card-block {
          border-top: 4px solid var(--accent-link);
          border-radius: 10px;
          box-shadow: 0 1px 3px 0 var(--shadow);
          padding: 8px;
          overflow: hidden;
        }
        .tx-body {
          margin: 40px auto;
          width: calc(100% - 40px);
          max-width: 760px;
          z-index: 1;
          position: relative;
          --tx-mobile-divider: 1px solid color-mix(in srgb, var(--accent-link) 16%, transparent);
          --tx-mobile-section-space: 10px;
        }
        .tx-title-block {
          margin: 4px 4px 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid color-mix(in srgb, var(--accent-link) 18%, transparent);
        }
        .tx-title-line {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
        }
        .tx-header {
          margin: 0;
          color: var(--text-main);
          font-size: 18px;
          font-weight: 700;
          line-height: 1.2;
          text-align: left;
          overflow-wrap: anywhere;
        }
        .tx-status-badge {
          flex: 0 0 auto;
          border: 0;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
        }
        .tx-status-badge.successful {
          background: color-mix(in srgb, var(--green) 11%, transparent);
          color: var(--green);
        }
        .tx-status-badge.failed {
          background: color-mix(in srgb, var(--red) 11%, transparent);
          color: var(--red);
        }
        .tx-status-badge.confirmed {
          background: color-mix(in srgb, var(--accent-link) 11%, transparent);
          color: var(--accent-link);
        }
        .tx-status-badge.final {
          background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
          color: var(--text-secondary);
        }
        .tx-id-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          margin-top: 10px;
          text-align: left;
        }
        .tx-id-value {
          order: 1;
          flex: 1;
          min-width: 0;
          color: var(--text-main);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
            monospace;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .tx-id-row :global(.tooltip) {
          flex: 0 0 auto;
          margin-top: 0;
        }
        .tx-id-actions {
          display: flex;
          order: 2;
          flex: 0 0 auto;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          justify-content: flex-end;
        }
        .tx-id-actions :global(.tx-copy-tooltip) {
          display: inline-flex;
        }
        .tx-id-actions :global(.tx-copy-action) {
          appearance: none;
          border: 1px solid color-mix(in srgb, var(--accent-link) 26%, transparent);
          border-radius: 6px;
          background: color-mix(in srgb, var(--card-bg) 85%, var(--accent-link) 15%);
          color: var(--accent-link);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          padding: 5px 8px;
          white-space: nowrap;
        }
        .tx-id-actions :global(.tx-copy-action:hover),
        .tx-id-actions :global(.tx-copy-action:focus-visible) {
          border-color: color-mix(in srgb, var(--accent-link) 44%, transparent);
          background: color-mix(in srgb, var(--card-bg) 78%, var(--accent-link) 22%);
        }
        :global(.tx-detail-table > tbody > tr > td.tx-td) {
          padding: 5px 4px;
          font-size: 15px;
          letter-spacing: 0;
          line-height: 1.38;
          vertical-align: top;
        }
        :global(.tx-detail-table > tbody > tr.tx-nft-preview-row),
        :global(.tx-detail-table > tbody > tr.tx-nft-preview-row > td.tx-td) {
          width: 100%;
        }
        :global(.tx-detail-table > tbody > tr:not(.tx-nft-preview-row) > td.tx-td:first-child) {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          padding-top: 8px;
          text-transform: uppercase;
          width: 160px;
          white-space: nowrap;
        }
        :global(.tx-detail-table > tbody > tr > td.tx-td:nth-child(2)) {
          color: var(--text-main);
          font-weight: 400;
        }
        .tx-detail-table {
          margin: 0 4px;
          width: calc(100% - 8px);
        }
        .tx-action-list,
        .tx-action-separator {
          display: inline-block;
        }
        .tx-action-separator {
          margin: 0 8px;
        }
        .tx-account-role {
          display: inline-block;
          margin-left: 6px;
        }
        .tx-affected-balances {
          margin: 8px 0 10px;
        }
        .tx-raw-slide {
          margin: 0 15px;
        }
        @media only screen and (max-width: 560px) {
          .card-block {
            border-top: 0;
            border-radius: 0;
            box-shadow: none;
            padding: 0;
            overflow: visible;
          }
          .tx-body {
            width: calc(100% - 28px);
            margin: 20px auto;
          }
          .tx-title-block {
            margin: 0;
            padding-bottom: var(--tx-mobile-section-space);
            border-bottom: var(--tx-mobile-divider);
          }
          .tx-header {
            font-size: 13px;
          }
          .tx-id-row {
            display: flex;
            align-items: center;
            flex-wrap: nowrap;
            gap: 10px;
            margin-top: 9px;
            min-height: 0;
          }
          .tx-id-value {
            display: block;
            font-size: 13px;
            min-width: 0;
            flex: 1 1 auto;
            overflow-wrap: anywhere;
          }
          .tx-id-actions {
            display: inline-flex;
            justify-content: flex-end;
            margin-left: auto;
            align-self: center;
            flex: 0 0 auto;
          }
          .tx-id-actions :global(.tx-copy-action) {
            padding: 5px 6px;
            white-space: nowrap;
          }
          .tx-outcome-message {
            margin: 8px 0 12px;
            font-size: 15px;
            line-height: 1.35;
          }
          .tx-detail-table {
            table-layout: fixed;
          }
          :global(.tx-detail-table > tbody > tr) {
            display: block;
            padding: var(--tx-mobile-section-space) 0;
            border-top: var(--tx-mobile-divider);
          }
          :global(.tx-detail-table > tbody > tr:first-child) {
            border-top: 0;
          }
          :global(.tx-detail-table > tbody > tr > td.tx-td) {
            display: block;
            width: 100%;
            box-sizing: border-box;
            padding: 0;
            text-align: left !important;
            overflow-wrap: anywhere;
          }
          :global(.tx-detail-table > tbody > tr:not(.tx-nft-preview-row) > td.tx-td:first-child) {
            margin-bottom: 5px;
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 700;
            line-height: 1.2;
            text-align: left !important;
            text-transform: uppercase;
          }
          :global(.tx-detail-table > tbody > tr > td.tx-td:nth-child(2)) {
            color: var(--text-main);
            font-size: 15px;
            line-height: 1.35;
            text-align: left !important;
          }
          .tx-account-role {
            margin-left: 6px;
          }
          .tx-affected-account {
            min-width: 0;
          }
          .tx-affected-address {
            min-width: 0;
          }
          .tx-affected-balances {
            margin: 8px 0 0;
            padding-left: 42px;
            font-size: 15px;
            line-height: 1.35;
          }
          .tx-action-list,
          .tx-action-separator {
            margin: 0;
          }
          .tx-show-more-row .tx-action-separator {
            display: none;
          }
          :global(.tx-detail-table > tbody > tr.tx-show-more-row > td.tx-td:nth-child(2)) {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 7px 12px;
          }
          .tx-action-list .link {
            display: inline-flex;
            align-items: center;
            min-height: 0;
            line-height: 1.35;
          }
          .tx-raw-slide {
            margin: 0;
          }
          .tx-raw-slide.opened {
            padding-top: var(--tx-mobile-section-space);
            border-top: var(--tx-mobile-divider);
          }
          .tx-raw-slide :global(pre) {
            margin: 0;
            padding: 12px;
            border-radius: 6px;
            box-shadow: none;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre;
            overflow-wrap: normal;
            word-break: normal;
          }
        }
      `}</style>
    </>
  )
}
