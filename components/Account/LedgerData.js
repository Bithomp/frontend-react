import React from 'react'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const XahauRewardTr = dynamic(() => import('./XahauRewardTr'), { ssr: false })

import {
  AddressWithIconFilled,
  amountFormat,
  fullDateAndTime,
  nativeCurrencyToFiat,
  timeFromNow
} from '../../utils/format'
import { devNet, getCoinsUrl, isDomainValid, nativeCurrency, server, stripDomain, xahauNetwork } from '../../utils'

import CopyButton from '../UI/CopyButton'
import { LinkAmm, LinkTx } from '../../utils/links'

import { MdDeleteForever, MdVerified } from 'react-icons/md'
import { FiEdit } from 'react-icons/fi'

export default function LedgerData({
  data,
  account,
  balances,
  selectedCurrency,
  pageFiatRate,
  networkInfo,
  setSignRequest,
  fiatRate,
  objects,
  gateway
}) {
  const { t, i18n } = useTranslation()

  const title = data?.ledgerInfo?.ledgerTimestamp ? (
    <span className="red bold">Historical data ({fullDateAndTime(data.ledgerInfo.ledgerTimestamp)})</span>
  ) : (
    t('table.ledger-data').toUpperCase()
  )

  const accountIndex = (
    <>
      {data.ledgerInfo.accountIndex} <CopyButton text={data.ledgerInfo.accountIndex}></CopyButton> (
      {parseInt(data.ledgerInfo.accountIndex, 16)})
    </>
  )

  const addressNode = (
    <>
      <span className="bold">{data.address}</span> <CopyButton text={data.address}></CopyButton>
    </>
  )

  const blackholedNode = (
    <>
      This account is <span className="orange bold">blackholed</span>
      {data?.ledgerInfo?.lastSubmittedAt ? (
        <>
          {' '}
          {timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)} ({fullDateAndTime(data.ledgerInfo.lastSubmittedAt)}).
        </>
      ) : (
        '.'
      )}{' '}
      It can not issue more tokens.
    </>
  )

  const activeNode = (
    <>
      <span className="green">Active </span>
      {data?.ledgerInfo?.lastSubmittedAt && (
        <>
          {timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)} ({fullDateAndTime(data.ledgerInfo.lastSubmittedAt)})
        </>
      )}
      {data?.ledgerInfo?.lastSubmittedTxHash && (
        <>
          {' '}
          <LinkTx tx={data.ledgerInfo.lastSubmittedTxHash} icon={true} />
        </>
      )}
    </>
  )

  const activatedNode = (
    <>
      Activated{' '}
      {data.inception && (
        <>
          {timeFromNow(data.inception, i18n)} ({fullDateAndTime(data.inception)})
          {data?.inceptionTxHash && (
            <>
              {' '}
              <LinkTx tx={data.inceptionTxHash} icon={true} />
            </>
          )}
        </>
      )}
    </>
  )

  const deletedNode = (
    <>
      <span className="red bold">Account deleted.</span>
      <br />
      <span className="orange">
        This account has been deactivated and is no longer active. It can be restored by sending at least{' '}
        {amountFormat(networkInfo?.reserveBase)} to the address.
      </span>
    </>
  )

  const notActivatedNode = (
    <>
      <span className="orange">
        Not activated yet. The owner with full access to the account can activate it by sending at least{' '}
        {amountFormat(networkInfo?.reserveBase)} to the address.
      </span>
      {getCoinsUrl && (
        <>
          {' '}
          <a href={getCoinsUrl + (devNet ? '?address=' + data?.address : '')} target="_blank" rel="noreferrer">
            Get your first {nativeCurrency}.
          </a>
        </>
      )}
      <br />
      <a href="https://xrpl.org/reserves.html" target="_blank" rel="noreferrer">
        Learn more about reserves.
      </a>
    </>
  )

  const networkErrorNode = (
    <span className="orange">Network error. The account status is unknown. Please try again later.</span>
  )

  const statusNode = data?.ledgerInfo?.blackholed
    ? blackholedNode
    : data?.ledgerInfo?.activated
    ? data.ledgerInfo.lastSubmittedAt
      ? activeNode
      : activatedNode
    : data?.ledgerInfo?.deleted
    ? deletedNode
    : data?.ledgerInfo?.activated === false
    ? notActivatedNode
    : networkErrorNode

  const reservedBalanceNode = (
    <>
      {amountFormat(balances?.reserved?.native, { precise: 'nice' })}
      {nativeCurrencyToFiat({
        amount: balances.reserved?.native,
        selectedCurrency,
        fiatRate: pageFiatRate
      })}
    </>
  )

  const totalBalanceNode = (
    <>
      {amountFormat(balances?.total?.native, { precise: 'nice' })}
      {nativeCurrencyToFiat({
        amount: balances.total?.native,
        selectedCurrency,
        fiatRate: pageFiatRate
      })}
    </>
  )

  const availableBalanceNode = (
    <>
      {amountFormat(balances?.available?.native, { precise: 'nice' })}
      {nativeCurrencyToFiat({
        amount: balances.available?.native,
        selectedCurrency,
        fiatRate: pageFiatRate
      })}
    </>
  )

  const domainLinkNode = (
    <>
      <a
        href={'https://' + stripDomain(data.ledgerInfo.domain)}
        className={data.verifiedDomain ? 'green bold' : ''}
        target="_blank"
        rel="noopener nofollow"
      >
        {stripDomain(data.ledgerInfo.domain)}
      </a>{' '}
    </>
  )

  const domainVerifiedSign = data.verifiedDomain ? (
    <span
      className="blue tooltip"
      style={{
        display: 'inline-block',
        verticalAlign: 'bottom',
        marginBottom: -3
      }}
    >
      <MdVerified />
      <span className="tooltiptext small no-brake">TOML Verified Domain</span>
    </span>
  ) : (
    ''
  )

  const domainUnverifiedSign =
    isDomainValid(stripDomain(data.ledgerInfo.domain)) &&
    !data.verifiedDomain &&
    (!data.service?.domain || !data.ledgerInfo.domain.toLowerCase().includes(data.service.domain.toLowerCase())) ? (
      <span className="orange">(unverified)</span>
    ) : (
      ''
    )

  const domainNotValidNode = <code className="code-highlight">{data.ledgerInfo.domain}</code>

  const domainChangeAndRemoveButtons = data?.address === account?.address && (
    <>
      <span className="tooltip tooltip-icon" style={{ marginLeft: 5 }}>
        <div
          style={{ fontSize: 18, marginBottom: -4 }}
          onClick={() =>
            setSignRequest({
              action: 'setDomain',
              redirect: 'account',
              request: {
                TransactionType: 'AccountSet',
                Account: data?.address
              }
            })
          }
        >
          <FiEdit />
        </div>
        <span className="tooltiptext">Change</span>
      </span>{' '}
      <span className="tooltip tooltip-icon">
        <div
          className="red"
          style={{ fontSize: 20, marginBottom: -6 }}
          onClick={() =>
            setSignRequest({
              redirect: 'account',
              request: {
                TransactionType: 'AccountSet',
                Domain: '',
                Account: data?.address
              }
            })
          }
        >
          <MdDeleteForever />
        </div>
        <span className="tooltiptext">Remove</span>
      </span>
    </>
  )

  const ammIdNode = <LinkAmm ammId={data.ledgerInfo.ammID} hash={true} icon={true} copy={true} />

  const transferRateNode = Math.ceil((data.ledgerInfo.transferRate - 1) * 10000) / 100

  const regularKeyNode = <AddressWithIconFilled data={data.ledgerInfo} name="regularKey" />

  const showLastEffectedTx =
    data?.ledgerInfo?.previousTxnID &&
    (data?.ledgerInfo?.blackholed || data?.ledgerInfo?.lastSubmittedTxHash !== data.ledgerInfo.previousTxnID)

  const lastEffectedTxNode = showLastEffectedTx && (
    <>
      {data?.ledgerInfo?.previousTxnAt && (
        <>
          {timeFromNow(data.ledgerInfo.previousTxnAt, i18n)} ({fullDateAndTime(data.ledgerInfo.previousTxnAt)})
        </>
      )}
      {data?.ledgerInfo?.previousTxnID && (
        <>
          {' '}
          <LinkTx tx={data.ledgerInfo.previousTxnID} icon={true} />
        </>
      )}
    </>
  )

  //const lastAccountTxNode = <LinkTx tx={data.ledgerInfo.accountTxnID} />

  const messageKeyNode = <code className="code-highlight">{data.ledgerInfo.messageKey}</code>

  const walletLocatorNode = <code className="code-highlight">{data.ledgerInfo.walletLocator}</code>

  const isValidDomain = isDomainValid(stripDomain(data.ledgerInfo.domain))

  const verifyDomainNode = data?.address === account?.address && isValidDomain && !data.verifiedDomain && (
    <>
      {' '}
      (<Link href="/domains">verify</Link>)
    </>
  )

  const tokensNode = !objects?.rippleStateList ? (
    'Loading...'
  ) : objects?.rippleStateList?.length > 0 ? (
    data?.ledgerInfo?.ledgerTimestamp ? (
      <span className="orange bold">{objects?.rippleStateList?.length}</span>
    ) : (
      <a href={server + '/explorer/' + data.address} className="bold">
        View tokens ({objects?.rippleStateList?.length})
      </a>
    )
  ) : (
    "This account doesn't hold Tokens."
  )

  const dexOrdersNode = !objects?.offerList ? (
    'Loading...'
  ) : objects?.offerList?.length > 0 ? (
    data?.ledgerInfo?.ledgerTimestamp ? (
      <span className="orange bold">{objects?.offerList?.length}</span>
    ) : (
      <a href={server + '/explorer/' + data.address} className="bold">
        View orders ({objects?.offerList?.length})
      </a>
    )
  ) : (
    "This account doesn't have DEX orders."
  )

  const escrowNode = !objects?.escrowList ? (
    'Loading...'
  ) : objects?.escrowList?.length > 0 ? (
    data?.ledgerInfo?.ledgerTimestamp ? (
      <span className="orange bold">{objects?.escrowList?.length}</span>
    ) : (
      <a href={server + '/explorer/' + data.address} className="bold">
        View Escrows ({objects?.escrowList?.length})
      </a>
    )
  ) : (
    "This account doesn't have Escrows."
  )

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t('table.address')}</td>
            <td>{addressNode}</td>
          </tr>
          <tr>
            <td>{t('table.status')}</td>
            <td>{statusNode}</td>
          </tr>
          {data?.ledgerInfo?.accountIndex && (
            <>
              <tr>
                <td>Account index:</td>
                <td>{accountIndex}</td>
              </tr>
            </>
          )}
          {data?.ledgerInfo?.balance && (
            <>
              <tr>
                <td>Total balance</td>
                <td>{totalBalanceNode}</td>
              </tr>
              <tr>
                <td>Reserved</td>
                <td>{reservedBalanceNode}</td>
              </tr>
              <tr>
                <td>Available balance</td>
                <td>{availableBalanceNode}</td>
              </tr>
            </>
          )}
          {data?.ledgerInfo?.activated && !gateway && (
            <>
              <tr>
                <td>{t('explorer.menu.tokens')}</td>
                <td>{tokensNode}</td>
              </tr>
              <tr>
                <td>DEX orders</td>
                <td>{dexOrdersNode}</td>
              </tr>
              <tr>
                <td>Escrows</td>
                <td>{escrowNode}</td>
              </tr>
            </>
          )}
          {data.ledgerInfo?.domain && (
            <tr>
              <td>Domain</td>
              <td>
                {isValidDomain ? (
                  <>
                    {domainLinkNode}
                    {domainVerifiedSign}
                    {data?.address !== account?.address ? domainUnverifiedSign : ''}
                  </>
                ) : (
                  domainNotValidNode
                )}
                {domainChangeAndRemoveButtons}
                {verifyDomainNode}
              </td>
            </tr>
          )}
          {xahauNetwork ? (
            <>
              <XahauRewardTr
                data={data}
                setSignRequest={setSignRequest}
                account={account}
                selectedCurrency={selectedCurrency}
                fiatRate={fiatRate}
              />
              {data.ledgerInfo?.importSequence && (
                <tr>
                  <td>Import sequence</td>
                  <td>#{data.ledgerInfo.importSequence}</td>
                </tr>
              )}
              {data.ledgerInfo?.hookNamespaces && (
                <tr>
                  <td>Hook namespaces</td>
                  <td>{data.ledgerInfo?.hookNamespaces.length}</td>
                </tr>
              )}
              {data.ledgerInfo?.hookStateCount && (
                <tr>
                  <td>Hook state count</td>
                  <td>{data.ledgerInfo?.hookStateCount}</td>
                </tr>
              )}
            </>
          ) : (
            <>
              {data.ledgerInfo?.ammID && (
                <tr>
                  <td>AMM ID</td>
                  <td>{ammIdNode}</td>
                </tr>
              )}
            </>
          )}

          {data.ledgerInfo?.flags?.disallowXRP && (
            <tr>
              <td>Receiving {nativeCurrency}</td>
              <td className="bold">disabled</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.requireDestTag && (
            <tr>
              <td>Destination tag</td>
              <td className="bold">required</td>
            </tr>
          )}
          {data.ledgerInfo?.ticketCount && (
            <tr>
              <td>Tickets</td>
              <td>{data.ledgerInfo.ticketCount}</td>
            </tr>
          )}
          {data.ledgerInfo?.tickSize && (
            <tr>
              <td>Tick size</td>
              <td className="bold">{data.ledgerInfo.tickSize}</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.transferRate && (
            <tr>
              <td>Transfer rate</td>
              <td className="bold">{transferRateNode}</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.globalFreeze && (
            <tr>
              <td>Global freeze</td>
              <td className="bold">true</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.noFreeze && (
            <tr>
              <td>Freeze</td>
              <td className="bold">disabled</td>
            </tr>
          )}
          {/* If set, this account must individually approve other users in order for those users to hold this account’s issuances. */}
          {data.ledgerInfo?.flags?.requireAuth && (
            <tr>
              <td>Token authorization</td>
              <td className="bold">required</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.depositAuth && (
            <tr>
              <td>Deposit authorization</td>
              <td className="bold">required</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.defaultRipple && (
            <tr>
              <td>Rippling</td>
              <td className="bold">enabled</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
            <tr>
              <td>Incoming NFT offers</td>
              <td className="bold">disallowed</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.disallowIncomingCheck && (
            <tr>
              <td>Incoming checks</td>
              <td className="bold">disallowed</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.disallowIncomingPayChan && (
            <tr>
              <td>Incoming payment channels</td>
              <td className="bold">disallowed</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.disallowIncomingTrustline && (
            <tr>
              <td>Incoming trustlines</td>
              <td className="bold">disallowed</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.allowTrustLineClawback && (
            <tr>
              <td>Trustline clawback</td>
              <td className="bold">enabled</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.disallowIncomingRemit && (
            <tr>
              <td>Incoming Remit</td>
              <td className="bold">disallowed</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.disableMaster && (
            <tr>
              <td>Master key</td>
              <td className="bold">disabled</td>
            </tr>
          )}
          {data.ledgerInfo?.flags?.passwordSpent && (
            <tr>
              <td>Free re-key</td>
              <td>spent</td>
            </tr>
          )}
          {data.ledgerInfo?.sequence && (
            <tr>
              <td>Next sequence</td>
              <td>#{data.ledgerInfo.sequence}</td>
            </tr>
          )}
          {showLastEffectedTx && (
            <tr>
              <td>Last affecting tx</td>
              <td>{lastEffectedTxNode}</td>
            </tr>
          )}
          {/* data.ledgerInfo?.accountTxnID && (
            <tr>
              <td>Last initiated tx</td>
              <td>{lastAccountTxNode}</td>
            </tr>
          ) */}
          {data.ledgerInfo?.messageKey &&
            data.ledgerInfo?.messageKey.substring(0, 26) !== '02000000000000000000000000' && (
              <tr>
                <td>Message key</td>
                <td>{messageKeyNode}</td>
              </tr>
            )}
          {data.ledgerInfo?.walletLocator && (
            <tr>
              <td>Wallet locator</td>
              <td>{walletLocatorNode}</td>
            </tr>
          )}
          {data.ledgerInfo?.regularKey && (
            <tr>
              <td>Regular key</td>
              <td>{regularKeyNode}</td>
            </tr>
          )}
          {data.ledgerInfo?.signerList && (
            <>
              <tr>
                <td>Multi-signing</td>
                <td className="bold">enabled</td>
              </tr>
              {data.ledgerInfo.signerList.signerQuorum && (
                <tr>
                  <td>Multi-signing threshold</td>
                  <td className="bold">{data.ledgerInfo.signerList.signerQuorum}</td>
                </tr>
              )}
              {data.ledgerInfo.signerList.signerEntries.map((signer, index) => (
                <tr key={index}>
                  <td>
                    Signer #{index + 1}
                    <br />
                    Weight: <b>{signer.signerWeight}</b>
                  </td>
                  <td>
                    <AddressWithIconFilled data={signer} name="account" />
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <center>{addressNode}</center>
        <br />
        <center>{title}</center>
        <p>{statusNode}</p>
        {data?.ledgerInfo?.accountIndex && (
          <p>
            <span className="grey">Account index:</span> {accountIndex}
          </p>
        )}
        {data?.ledgerInfo?.balance && (
          <>
            <p>
              <span className="grey">Total balance</span>
              <br />
              {totalBalanceNode}
            </p>
            <p>
              <span className="grey">Reserved</span>
              <br />
              {reservedBalanceNode}
            </p>
            <p>
              <span className="grey">Available balance</span>
              <br />
              {availableBalanceNode}
            </p>
          </>
        )}
        {data?.ledgerInfo?.activated && (
          <>
            <p>
              {objects?.rippleStateList?.length > 0 && (
                <>
                  <span className="grey">{t('explorer.menu.tokens')}</span>{' '}
                </>
              )}
              {tokensNode}
            </p>
            <p>
              {objects?.offerList?.length > 0 && <span className="grey">DEX orders</span>} {dexOrdersNode}
            </p>
            <p>
              {objects?.escrowList?.length > 0 && <span className="grey">Escrows</span>} {escrowNode}
            </p>
          </>
        )}
        {data.ledgerInfo?.domain && (
          <div>
            <span className="grey">Domain </span>
            {domainUnverifiedSign}
            {verifyDomainNode}
            <br />
            {isValidDomain ? (
              <>
                {domainLinkNode}
                {domainVerifiedSign}
              </>
            ) : (
              domainNotValidNode
            )}
            {domainChangeAndRemoveButtons}
          </div>
        )}
        {xahauNetwork ? (
          <>
            {data.ledgerInfo?.importSequence && (
              <p>
                <span className="grey">Import sequence</span> #{data.ledgerInfo.importSequence}
              </p>
            )}
            <XahauRewardTr
              data={data}
              setSignRequest={setSignRequest}
              account={account}
              mobile={true}
              selectedCurrency={selectedCurrency}
              fiatRate={fiatRate}
            />
            {data.ledgerInfo?.hookNamespaces && (
              <p>
                <span className="grey">Hook namespaces</span> {data.ledgerInfo?.hookNamespaces.length}
              </p>
            )}
            {data.ledgerInfo?.hookStateCount && (
              <p>
                <span className="grey">Hook state count</span> {data.ledgerInfo?.hookStateCount}
              </p>
            )}
          </>
        ) : (
          <>
            {data.ledgerInfo?.ammID && (
              <p>
                <span className="grey">AMM ID</span>
                <br />
                {ammIdNode}
              </p>
            )}
          </>
        )}
        {data.ledgerInfo?.flags?.disallowXRP && (
          <p>
            <span className="grey">Receiving {nativeCurrency}</span> <span className="bold">disabled</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.requireDestTag && (
          <p>
            <span className="grey">Destination tag</span> <span className="bold">required</span>
          </p>
        )}
        {data.ledgerInfo?.ticketCount && (
          <p>
            <span className="grey">Tickets</span> <span className="bold">{data.ledgerInfo.ticketCount}</span>
          </p>
        )}
        {data.ledgerInfo?.tickSize && (
          <p>
            <span className="grey">Tick size</span> <span className="bold">{data.ledgerInfo.tickSize}</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.transferRate && (
          <p>
            <span className="grey">Transfer rate</span> <span className="bold">{transferRateNode}</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.globalFreeze && (
          <p>
            <span className="grey">Global freeze</span> <span className="bold">true</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.noFreeze && (
          <p>
            <span className="grey">Freeze</span> <span className="bold">disabled</span>
          </p>
        )}
        {/* If set, this account must individually approve other users in order for those users to hold this account’s issuances. */}
        {data.ledgerInfo?.flags?.requireAuth && (
          <p>
            <span className="grey">Token authorization</span> <span className="bold">required</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.depositAuth && (
          <p>
            <span className="grey">Deposit authorization</span> <span className="bold">required</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.defaultRipple && (
          <p>
            <span className="grey">Rippling</span> <span className="bold">enabled</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
          <p>
            <span className="grey">Incoming NFT offers</span> <span className="bold">disallowed</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.disallowIncomingCheck && (
          <p>
            <span className="grey">Incoming checks</span> <span className="bold">disallowed</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.disallowIncomingPayChan && (
          <p>
            <span className="grey">Incoming payment channels</span> <span className="bold">disallowed</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.disallowIncomingTrustline && (
          <p>
            <span className="grey">Incoming trustlines</span> <span className="bold">disallowed</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.allowTrustLineClawback && (
          <p>
            <span className="grey">Trustline clawback</span> <span className="bold">enabled</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.disallowIncomingRemit && (
          <p>
            <span className="grey">Incoming Remit</span> <span className="bold">disallowed</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.disableMaster && (
          <p>
            <span className="grey">Master key</span> <span className="bold">disabled</span>
          </p>
        )}
        {data.ledgerInfo?.flags?.passwordSpent && (
          <p>
            <span className="grey">Free re-key</span> spent
          </p>
        )}
        {data.ledgerInfo?.sequence && (
          <p>
            <span className="grey">Next sequence</span> #{data.ledgerInfo.sequence}
          </p>
        )}
        {showLastEffectedTx && (
          <p>
            <span className="grey">Last affecting tx</span>
            <br />
            {lastEffectedTxNode}
          </p>
        )}
        {/* data.ledgerInfo?.accountTxnID && (
          <p>
            <span className="grey">Last initiated tx</span>
            <br />
            {lastAccountTxNode}
          </p>
        ) */}
        {data.ledgerInfo?.messageKey &&
          data.ledgerInfo?.messageKey.substring(0, 26) !== '02000000000000000000000000' && (
            <p>
              <span className="grey">Message key</span>
              <br />
              {messageKeyNode}
            </p>
          )}
        {data.ledgerInfo?.walletLocator && (
          <p>
            <span className="grey">Wallet locator</span>
            <br />
            {walletLocatorNode}
          </p>
        )}
        {data.ledgerInfo?.regularKey && (
          <>
            <p>
              <span className="grey">Regular key</span>
            </p>
            {regularKeyNode}
          </>
        )}
        {data.ledgerInfo?.signerList && (
          <>
            <p>
              <span className="grey">Multi-signing</span> <span className="bold">enabled</span>
            </p>
            {data.ledgerInfo.signerList.signerQuorum && (
              <p>
                <span className="grey">Multi-signing threshold</span>{' '}
                <span className="bold">{data.ledgerInfo.signerList.signerQuorum}</span>
              </p>
            )}
            {data.ledgerInfo.signerList.signerEntries.map((signer, index) => (
              <React.Fragment key={index}>
                <p>
                  <span className="grey">Signer #{index + 1}</span>, weight: <b>{signer.signerWeight}</b>
                </p>
                <AddressWithIconFilled data={signer} name="account" />
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </>
  )
}
