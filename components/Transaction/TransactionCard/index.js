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
import { dappBySourceTag, errorCodeDescription, memoNode, shortErrorCode } from '../../../utils/transaction'
import { add } from '../../../utils/calc'
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
  const [showRawData, setShowRawData] = useState(false)
  const [showRawMeta, setShowRawMeta] = useState(false)
  const [showAdditionalData, setShowAdditionalData] = useState(false)
  const [showBalanceChanges, setShowBalanceChanges] = useState(false)

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

  const txLink = server + '/tx/' + (tx?.ctid || tx?.hash)

  const filteredBalanceChanges = outcome?.balanceChanges?.filter((change) => !noBalanceChange(change))

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
        <h1 className="tx-header">{txT('details.title')}</h1>
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
              {outcome ? (
                <p className="center">
                  {isSuccessful ? (
                    <>
                      {txT('messages.successful.prefix')} <b className="green">{txT('status.successful')}</b>{' '}
                      {txT('messages.successful.suffix')}{' '}
                      <LedgerLink version={outcome.ledgerIndex} /> (index: {outcome.indexInLedger}).
                    </>
                  ) : (
                    <>
                      {txT('messages.failed.prefix')} <b className="red">{txT('status.failed')}</b>{' '}
                      {txT('messages.failed.suffix')}{' '}
                      <LedgerLink version={outcome.ledgerIndex} /> (index: {outcome.indexInLedger}).
                    </>
                  )}
                </p>
              ) : (
                !validated &&
                tx && (
                  <p className="center red bold">
                    {txT('messages.notValidated')}
                    {tx?.LastLedgerSequence && (
                      <>
                        <br />
                        {txT('messages.notValidatedAfterLedger', { ledger: tx.LastLedgerSequence })}
                      </>
                    )}
                  </p>
                )
              )}
              <table style={{ width: '100%' }}>
                <tbody>
                  {tx?.ctid && id === tx.ctid && (
                    <tr>
                      <TData>Compact Tx ID</TData>
                      <TData>
                        <span className="bold">{tx.ctid}</span> <CopyButton text={tx.ctid} />
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
                  <tr>
                    <TData>{t('table.type')}</TData>
                    <TData>
                      <span className="bold">
                        {specification?.domainID && (
                          <>
                            <span className="orange bold">{txT('labels.Permissioned')}</span>{' '}
                          </>
                        )}
                        {txTypeSpecial || tx?.TransactionType}
                      </span>
                    </TData>
                  </tr>
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
                        <TData className="bold">Failure</TData>
                        <TData className="red bold">{shortErrorCode(outcome.result)}</TData>
                      </tr>
                      <tr>
                        <TData className="bold">Description</TData>
                        <TData className="orange bold">{errorCodeDescription(outcome.result)}</TData>
                      </tr>
                    </>
                  )}
                  {validated && (
                    <tr>
                      <TData>{isSuccessful ? 'Validated' : 'Rejected'}</TData>
                      <TData>
                        {timeFromNow(tx.date, i18n, 'ripple')} ({fullDateAndTime(tx.date, 'ripple')})
                      </TData>
                    </tr>
                  )}
                  {children}
                  <tr>
                    <TData>Ledger fee</TData>
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
                        <TData>Memos note</TData>
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
                    <tr>
                      <TData>
                        {specification.delegate?.address === specification.signer.address && (
                          <span className="bold orange">{txT('labels.Delegate')} </span>
                        )}
                        Signer
                      </TData>
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
                  {tx?.TransactionType !== 'UNLReport' &&
                    (filteredBalanceChanges?.length > 2 || notFullySupported || showBalanceChanges) && (
                      <>
                        <tr>
                          <TData>Affected accounts</TData>
                          <TData>
                            {filteredBalanceChanges?.length > 1 && (
                              <>
                                {txT('messages.affectedAccounts.prefix')}{' '}
                                <span className="bold">{filteredBalanceChanges.length}</span>{' '}
                                {txT('messages.affectedAccounts.suffix')}
                              </>
                            )}
                          </TData>
                        </tr>
                        {filteredBalanceChanges?.map((change, index) => {
                          let gateway = change?.balanceChanges?.every(
                            (changeItem) => changeItem.issuer === change.address
                          )
                          return (
                            <tr key={index}>
                              <TData>
                                {txT('labels.Account')} {index + 1}
                                {change.address === tx.Account && (
                                  <span className="bold">
                                    <br />
                                    {txT('labels.Initiator')}
                                  </span>
                                )}
                                {gateway && (
                                  <span className="bold">
                                    <br />
                                    {niceCurrency(change.balanceChanges[0].currency)} {txT('labels.issuer')}
                                  </span>
                                )}
                              </TData>
                              <TData>
                                <div style={{ height: '10px' }}></div>
                                <AddressWithIconFilled data={change} name="address" />
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
                                          {tokenToFiat({
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
                  {!tx?.TransactionType.includes('AMM') && outcome?.exchanges?.length > 0 && (
                    <>
                      <tr>
                        <TData style={{ verticalAlign: 'top' }}>
                          {outcome?.exchanges?.length > 1 ? txT('labels.Exchanges') : txT('labels.Exchange')}
                        </TData>
                        <TData>
                          {outcome?.exchanges?.length > 1 && (
                            <>
                              {txT('messages.exchanges.prefix')}{' '}
                              <span className="bold">{outcome?.exchanges?.length}</span>{' '}
                              {txT('messages.exchanges.suffix')}
                              <br />
                              <br />
                            </>
                          )}
                          <ExchangesTable exchanges={outcome.exchanges} ledgerIndex={outcome.ledgerIndex} />
                        </TData>
                      </tr>
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
                        {txT('actions.additionalData')}
                      </span>{' '}
                      |{' '}
                      {!(filteredBalanceChanges?.length > 2 || notFullySupported) && (
                        <>
                          <span className="link" onClick={() => setShowBalanceChanges(!showBalanceChanges)}>
                            {txT('actions.balanceChanges')}
                          </span>{' '}
                          |{' '}
                        </>
                      )}
                      <span className="link" onClick={() => setShowRawData(!showRawData)}>
                        {t('table.raw-data')}
                      </span>{' '}
                      |{' '}
                      <span className="link" onClick={() => setShowRawMeta(!showRawMeta)}>
                        {txT('actions.txMetadata')}
                      </span>
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
                                Sequence
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
