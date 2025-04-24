import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'
import { isDomainValid, nativeCurrency } from '../../utils'
import { subtract } from '../../utils/calc'

const messageKeyNode = (messageKey) => {
  if (messageKey) {
    if (messageKey.startsWith('02000000000000000000000000')) {
      const ethAddress = '0x' + messageKey.slice(26)
      return (
        <>
          Added a Flare address <br />
          <a href={`https://flarescan.com/address/${ethAddress}`} target="_blank" rel="noopener">
            {ethAddress}
          </a>
        </>
      )
    } else {
      return <pre>{messageKey}</pre>
    }
  } else {
    return <span className="orange">removed</span>
  }
}

const domainNode = (domain) => {
  if (domain) {
    if (isDomainValid(domain)) {
      return (
        <a href={`https://${domain}`} target="_blank" rel="noopener">
          {domain}
        </a>
      )
    } else {
      return <pre>{domain}</pre>
    }
  } else {
    return <span className="orange">removed</span>
  }
}

export const TransactionAccountSet = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx } = data

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {tx.ClearFlag !== undefined && (
        <tr>
          <TData className="bold" tooltip="Unique identifier of a flag to disable for this account.">
            Clear flag
          </TData>
          <TData className="bold">{tx.ClearFlag}</TData>
        </tr>
      )}
      {tx.Domain !== undefined && (
        <tr>
          <TData className="bold">Domain</TData>
          <TData className="bold">{domainNode(specification.domain)}</TData>
        </tr>
      )}
      {tx.OperationLimit !== undefined && (
        <tr>
          <TData className="bold">Operation limit</TData>
          <TData className="bold">{tx.OperationLimit}</TData>
        </tr>
      )}
      {tx.EmailHash !== undefined && (
        <tr>
          <TData
            className="bold"
            tooltip="Often used to add md5 hash of an email address for displaying a Gravatar image."
          >
            Email hash
          </TData>
          <TData className="bold">{specification.emailHash || <span className="orange">removed</span>}</TData>
        </tr>
      )}
      {tx.MessageKey !== undefined && (
        <tr>
          <TData className="bold" tooltip="Public key for sending encrypted messages to this account.">
            Message key
          </TData>
          <TData className="bold">{messageKeyNode(specification.messageKey)}</TData>
        </tr>
      )}
      {tx.TransferRate !== undefined && (
        <tr>
          <TData className="bold" tooltip="The fee to charge when users transfer this account's tokens.">
            Transfer rate
          </TData>
          <TData className="bold">{tx.TransferRate ? subtract(tx.TransferRate / 1000000000, 1) * 100 : 0}%</TData>
        </tr>
      )}
      {tx.TickSize !== undefined && (
        <tr>
          <TData className="bold" tooltip="Tick size to use for offers involving a currency issued by this address.">
            Tick size
          </TData>
          <TData className="bold">{tx.TickSize}</TData>
        </tr>
      )}
      {tx.WalletLocator !== undefined && (
        <tr>
          <TData
            className="bold"
            tooltip="The value is stored as part of the account but has no inherent meaning or requirements."
          >
            Wallet locator
          </TData>
          <TData className="bold">{tx.WalletLocator}</TData>
        </tr>
      )}
      {tx.WalletSize !== undefined && (
        <tr>
          <TData className="bold" tooltip="This field is valid in AccountSet transactions but does nothing.">
            Wallet size
          </TData>
          <TData className="bold">{tx.WalletSize}</TData>
        </tr>
      )}
      {specification.defaultRipple !== undefined && (
        <tr>
          <TData className="bold" tooltip="Enable rippling on this account's trust lines by default.">
            Default ripple
          </TData>
          <TData className="bold orange">{specification.defaultRipple ? 'enabled' : 'disabled'}</TData>
        </tr>
      )}
      {specification.disallowXRP !== undefined && (
        <tr>
          <TData
            className="bold"
            tooltip={
              nativeCurrency + ' should not be sent to this account (it is not enforced by the Ledger protocol).'
            }
          >
            Incoming {nativeCurrency}
          </TData>
          <TData className="bold">{specification.disallowXRP ? 'disallow' : 'allow'}</TData>
        </tr>
      )}
      {specification.requireDestTag !== undefined && (
        <tr>
          <TData className="bold" tooltip="Require a destination tag to send transactions to this account.">
            Destination tag
          </TData>
          <TData className="bold orange">{specification.requireDestTag ? 'require' : "don't require"}</TData>
        </tr>
      )}
      {specification.disableMaster !== undefined && (
        <tr>
          <TData className="bold" tooltip="The use of the master key pair.">
            Master key
          </TData>
          <TData className="bold red">{specification.disableMaster ? 'disabled' : 'enabled'}</TData>
        </tr>
      )}
      {specification.noFreeze && (
        <tr>
          <TData
            className="bold"
            tooltip="Permanently give up the ability to freeze individual trust lines or disable Global Freeze. This flag can never be disabled after being enabled."
          >
            No freeze
          </TData>
          <TData className="bold">enabled</TData>
        </tr>
      )}
      {specification.depositAuth !== undefined && (
        <tr>
          <TData className="bold" tooltip="Enable Deposit Authorization on this account.">
            Deposit authorization
          </TData>
          <TData className="bold">{specification.depositAuth ? 'enabled' : 'disabled'}</TData>
        </tr>
      )}
      {specification.requireAuth !== undefined && (
        <tr>
          <TData className="bold" tooltip="Require authorization for users to hold balances issued by this address.">
            Require authorization
          </TData>
          <TData className="bold">{specification.requireAuth ? 'enabled' : 'disabled'}</TData>
        </tr>
      )}
      {specification.disallowIncomingCheck !== undefined && (
        <tr>
          <TData className="bold" tooltip="Block incoming Checks.">
            Incoming check
          </TData>
          <TData className="bold">{specification.disallowIncomingCheck ? 'disallow' : 'allow'}</TData>
        </tr>
      )}
      {specification.disallowIncomingPayChan !== undefined && (
        <tr>
          <TData className="bold" tooltip="Block incoming Payment Channels.">
            Incoming payment channel
          </TData>
          <TData className="bold">{specification.disallowIncomingPayChan ? 'disallow' : 'allow'}</TData>
        </tr>
      )}
      {specification.disallowIncomingNFTokenOffer !== undefined && (
        <tr>
          <TData className="bold" tooltip="Block incoming NFT Offers.">
            Incoming NFT offer
          </TData>
          <TData className="bold">{specification.disallowIncomingNFTokenOffer ? 'disallow' : 'allow'}</TData>
        </tr>
      )}
      {specification.disallowIncomingTrustline !== undefined && (
        <tr>
          <TData className="bold" tooltip="Block incoming trust lines.">
            Incoming trust line
          </TData>
          <TData className="bold">{specification.disallowIncomingTrustline ? 'disallow' : 'allow'}</TData>
        </tr>
      )}
      {specification.enableTransactionIDTracking !== undefined && (
        <tr>
          <TData className="bold" tooltip="Track the ID of this account's most recent transaction.">
            Transaction ID tracking
          </TData>
          <TData className="bold">{specification.enableTransactionIDTracking ? 'enabled' : 'disabled'}</TData>
        </tr>
      )}
      {specification.globalFreeze !== undefined && (
        <tr>
          <TData className="bold" tooltip="Freeze all assets issued by this account.">
            Global freeze
          </TData>
          <TData className="bold">{specification.globalFreeze ? 'enabled' : 'disabled'}</TData>
        </tr>
      )}
      {specification.authorizedMinter !== undefined && (
        <tr>
          <TData className="bold" tooltip="allow another account to mint NFTs on this account's behalf.">
            Authorized minter
          </TData>
          <TData className="bold">{specification.authorizedMinter ? 'enabled' : 'disabled'}</TData>
        </tr>
      )}
      {tx.NFTokenMinter !== undefined && (
        <tr>
          <TData className="bold" tooltip="Another account that can mint NFTs for that account.">
            NFT minter
          </TData>
          <TData className="bold">{specification.nftokenMinter || <span className="orange">removed</span>}</TData>
        </tr>
      )}
      {specification.allowTrustLineClawback !== undefined && (
        <tr>
          <TData className="bold" tooltip="allow account to claw back tokens it has issued.">
            Trust line Clawback
          </TData>
          <TData className="bold">{specification.allowTrustLineClawback ? 'allowed' : 'disallow'}</TData>
        </tr>
      )}
      {specification.disallowIncomingRemit !== undefined && (
        <tr>
          <TData className="bold" tooltip="Block incoming Remit.">
            Incoming Remit
          </TData>
          <TData className="bold">{specification.disallowIncomingRemit ? 'disallow' : 'allow'}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
