import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const XahauRewardTr = dynamic(() => import('./XahauRewardTr'), { ssr: false })

import {
  AddressWithIconFilled,
  amountFormat,
  fullDateAndTime,
  nativeCurrencyToFiat,
  timeFromNow,
  txIdLink
} from '../../utils/format'
import { devNet, getCoinsUrl, isDomainValid, nativeCurrency, stripDomain, xahauNetwork } from '../../utils'

import CopyButton from '../UI/CopyButton'
import { LinkAmm } from '../../utils/links'

import { MdDeleteForever, MdVerified } from 'react-icons/md'
import { FiEdit } from 'react-icons/fi'

export default function HistoricalData({
  data,
  account,
  balances,
  selectedCurrency,
  pageFiatRate,
  networkInfo,
  setSignRequest
}) {
  const { t, i18n } = useTranslation()

  return (
    <table className="table-details">
      <thead>
        <tr>
          <th colSpan="100">
            {data?.ledgerInfo?.ledgerTimestamp ? (
              <span className="red bold">Historical data ({fullDateAndTime(data.ledgerInfo.ledgerTimestamp)})</span>
            ) : (
              t('table.ledger-data')
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {data?.ledgerInfo?.accountIndex && (
          <>
            <tr>
              <td>Account index:</td>
              <td>
                {data.ledgerInfo.accountIndex} <CopyButton text={data.ledgerInfo.accountIndex}></CopyButton> (
                {parseInt(data.ledgerInfo.accountIndex, 16)})
              </td>
            </tr>
          </>
        )}
        <tr>
          <td>{t('table.address')}</td>
          <td className="bold">
            {data.address} <CopyButton text={data.address}></CopyButton>
          </td>
        </tr>
        {data?.ledgerInfo?.blackholed ? (
          <tr>
            <td className="orange">Blackholed</td>
            <td>
              This account is BLACKHOLED{' '}
              {data?.ledgerInfo?.lastSubmittedAt && (
                <>
                  {timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)} (
                  {fullDateAndTime(data.ledgerInfo.lastSubmittedAt)}).
                </>
              )}{' '}
              It can not issue more tokens.
            </td>
          </tr>
        ) : (
          <tr>
            <td>{t('table.status')}</td>
            <td>
              {data?.ledgerInfo?.activated ? (
                <>
                  {data.ledgerInfo.lastSubmittedAt ? (
                    <>
                      <span className="green">Active </span>
                      {data?.ledgerInfo?.lastSubmittedAt && (
                        <>
                          {timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)} (
                          {fullDateAndTime(data.ledgerInfo.lastSubmittedAt)})
                        </>
                      )}
                      {data?.ledgerInfo?.lastSubmittedTxHash && (
                        <> {txIdLink(data.ledgerInfo.lastSubmittedTxHash, 0)}</>
                      )}
                    </>
                  ) : (
                    <>
                      Activated {timeFromNow(data.inception, i18n)} ({fullDateAndTime(data.inception)})
                      {data?.inceptionTxHash && <> {txIdLink(data.inceptionTxHash, 0)}</>}
                    </>
                  )}
                </>
              ) : (
                <>
                  {data?.ledgerInfo?.deleted ? (
                    <>
                      <span className="red bold">Account deleted.</span>
                      <br />
                      <span className="orange">
                        This account has been deactivated and is no longer active. It can be restored by sending at
                        least {amountFormat(networkInfo?.reserveBase)} to the address.
                      </span>
                    </>
                  ) : (
                    <>
                      {data?.ledgerInfo?.activated === false ? (
                        <>
                          <span className="orange">
                            Not activated yet. The owner with full access to the account can activate it by sending at
                            least {amountFormat(networkInfo?.reserveBase)} to the address.
                          </span>
                          {getCoinsUrl && (
                            <>
                              {' '}
                              <a
                                href={getCoinsUrl + (devNet ? '?address=' + data?.address : '')}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Get your first {nativeCurrency}.
                              </a>
                            </>
                          )}
                          <br />
                          <a href="https://xrpl.org/reserves.html" target="_blank" rel="noreferrer">
                            Learn more about reserves.
                          </a>
                        </>
                      ) : (
                        <span className="orange">
                          Network error. The account status is unknown. Please try again later.
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </td>
          </tr>
        )}
        {data?.ledgerInfo?.balance && (
          <>
            {/*
          <tr>
            <td>Available</td>
            <td>
              <b className="green">
                {amountFormat(balances?.available?.native, { precise: 'nice' })}
              </b>
              {nativeCurrencyToFiat({
                amount: balances.available?.native,
                selectedCurrency,
                fiatRate: pageFiatRate
              })}
            </td>
          </tr>
          */}
            <tr>
              <td>Reserved</td>
              <td>
                {amountFormat(balances?.reserved?.native, { precise: 'nice' })}
                {nativeCurrencyToFiat({
                  amount: balances.reserved?.native,
                  selectedCurrency,
                  fiatRate: pageFiatRate
                })}
              </td>
            </tr>
            <tr>
              <td>Total balance</td>
              <td>
                {amountFormat(balances?.total?.native, { precise: 'nice' })}
                {nativeCurrencyToFiat({
                  amount: balances.total?.native,
                  selectedCurrency,
                  fiatRate: pageFiatRate
                })}
              </td>
            </tr>
          </>
        )}

        {data.ledgerInfo?.domain && (
          <tr>
            <td>Domain</td>
            <td>
              {isDomainValid(stripDomain(data.ledgerInfo.domain)) ? (
                <>
                  <a
                    href={'https://' + stripDomain(data.ledgerInfo.domain)}
                    className={data.verifiedDomain ? 'green bold' : ''}
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    {stripDomain(data.ledgerInfo.domain)}
                  </a>{' '}
                  {data.verifiedDomain ? (
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
                  ) : (!data.service?.domain ||
                      !data.ledgerInfo.domain.toLowerCase().includes(data.service.domain.toLowerCase())) &&
                    data?.address !== account?.address ? (
                    <span className="orange">(unverified)</span>
                  ) : (
                    ''
                  )}
                </>
              ) : (
                <code className="code-highlight">{data.ledgerInfo.domain}</code>
              )}
              {data?.address === account?.address && (
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
              )}
            </td>
          </tr>
        )}
        {data.ledgerInfo?.importSequence && (
          <tr>
            <td>Import sequence</td>
            <td>#{data.ledgerInfo.importSequence}</td>
          </tr>
        )}
        {xahauNetwork ? (
          <>
            <XahauRewardTr data={data} setSignRequest={setSignRequest} account={account} />
            {data.ledgerInfo?.hookNamespaces && (
              <>
                <tr>
                  <td>Hook namespaces</td>
                  <td className="bold">{data.ledgerInfo?.hookNamespaces.length}</td>
                </tr>
                {/* data.ledgerInfo.hookNamespaces.map((hook, i) => (
                <tr key={i}>
                  <td>Hook #{i + 1}</td>
                  <td style={{ fontSize: 14 }}>{hook}</td>
                </tr>
              )) */}
              </>
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
                <td>
                  <LinkAmm ammId={data.ledgerInfo.ammID} hash={true} icon={true} copy={true} />
                </td>
              </tr>
            )}
            {data.ledgerInfo?.mintedNFTokens && (
              <tr>
                <td>Minted NFTs</td>
                <td>
                  <Link
                    href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true'}
                  >
                    {data.ledgerInfo.mintedNFTokens}
                  </Link>
                </td>
              </tr>
            )}
            {data.ledgerInfo?.burnedNFTokens && (
              <tr>
                <td>Burned NFTs</td>
                <td>
                  <Link
                    href={
                      '/nft-explorer?includeWithoutMediaData=true&issuer=' +
                      data?.address +
                      '&includeBurned=true&burnedPeriod=all'
                    }
                  >
                    {data.ledgerInfo.burnedNFTokens}
                  </Link>
                </td>
              </tr>
            )}
            {data.ledgerInfo?.firstNFTokenSequence && (
              <tr>
                <td>First NFT sequence</td>
                <td>{data.ledgerInfo.firstNFTokenSequence}</td>
              </tr>
            )}
            {data.ledgerInfo?.nftokenMinter && (
              <tr>
                <td>NFT minter</td>
                <td>
                  <AddressWithIconFilled data={data.ledgerInfo} name="nftokenMinter" />
                </td>
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
            <td className="bold">{data.ledgerInfo.ticketCount}</td>
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
            <td className="bold">{Math.ceil((data.ledgerInfo.transferRate - 1) * 10000) / 100}</td>
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
        {data.ledgerInfo?.flags?.uriTokenIssuer && (
          <tr>
            <td>URI token issuer</td>
            <td className="bold">true</td>
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
        {data.ledgerInfo?.regularKey && (
          <tr>
            <td>Regular key</td>
            <td>
              <AddressWithIconFilled data={data.ledgerInfo} name="regularKey" />
            </td>
          </tr>
        )}
        {data.ledgerInfo?.flags?.passwordSpent && (
          <tr>
            <td>Free re-key</td>
            <td>spent</td>
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
        {data.ledgerInfo?.sequence && (
          <tr>
            <td>Next sequence</td>
            <td>#{data.ledgerInfo.sequence}</td>
          </tr>
        )}
        {data.ledgerInfo?.previousTxnID && (
          <tr>
            <td>Last affecting tx</td>
            <td>{txIdLink(data.ledgerInfo.previousTxnID)}</td>
          </tr>
        )}
        {data.ledgerInfo?.accountTxnID && (
          <tr>
            <td>Last initiated tx:</td>
            <td>{txIdLink(data.ledgerInfo.accountTxnID)}</td>
          </tr>
        )}
        {data.ledgerInfo?.messageKey &&
          data.ledgerInfo?.messageKey.substring(0, 26) !== '02000000000000000000000000' && (
            <tr>
              <td>Message key</td>
              <td>
                <code className="code-highlight">{data.ledgerInfo.messageKey}</code>
              </td>
            </tr>
          )}
        {data.ledgerInfo?.walletLocator && (
          <tr>
            <td>Wallet locator</td>
            <td>
              <code className="code-highlight">{data.ledgerInfo.walletLocator}</code>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
