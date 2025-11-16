import { TransactionRowCard } from './TransactionRowCard'
import { nativeCurrency } from '../../../utils'

export const TransactionRowAccountSet = ({ data, address, index, selectedCurrency }) => {
  const { specification, tx } = data

  const txTypeSpecial = <span className="bold">Account settings update</span>

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {tx.MessageKey !== undefined && (
        <div className="bold">Message key: {specification.messageKey || <span className="orange">removed</span>}</div>
      )}

      {tx.Domain !== undefined && (
        <div className="bold">
          Domain: <span className="orange">{specification.domain || 'removed'}</span>
        </div>
      )}

      {specification.defaultRipple !== undefined && (
        <div className="bold">
          Default ripple: <span className="orange">{specification.defaultRipple ? 'enabled' : 'disabled'}</span>
        </div>
      )}

      {specification.disallowXRP !== undefined && (
        <div className="bold">
          Incoming {nativeCurrency}: <span>{specification.disallowXRP ? 'disallow' : 'allow'}</span>
        </div>
      )}

      {specification.requireDestTag !== undefined && (
        <div className="bold">
          Destination tag: <span className="orange">{specification.requireDestTag ? 'require' : "don't require"}</span>
        </div>
      )}

      {specification.depositAuth !== undefined && (
        <div className="bold">
          Deposit authorization: <span className="orange">{specification.depositAuth ? 'enabled' : 'disabled'}</span>
        </div>
      )}

      {specification.disableMaster !== undefined && (
        <div className="bold">
          Master key: <span className="red">{specification.disableMaster ? 'disabled' : 'enabled'}</span>
        </div>
      )}

      {specification.noFreeze && (
        <div className="bold">
          No freeze: <span className="orange">enabled</span>
        </div>
      )}

      {specification.requireAuth !== undefined && (
        <div className="bold">
          Require authorization: <span className="orange">{specification.requireAuth ? 'enabled' : 'disabled'}</span>
        </div>
      )}

      {specification.disallowIncomingCheck !== undefined && (
        <div className="bold">
          Incoming check: <span className="orange">{specification.disallowIncomingCheck ? 'disallow' : 'allow'}</span>
        </div>
      )}

      {specification.disallowIncomingPayChan !== undefined && (
        <div className="bold">
          Incoming payment channel:{' '}
          <span className="orange">{specification.disallowIncomingPayChan ? 'disallow' : 'allow'}</span>
        </div>
      )}

      {specification.disallowIncomingNFTokenOffer !== undefined && (
        <div className="bold">
          Incoming NFT offer:{' '}
          <span className="orange">{specification.disallowIncomingNFTokenOffer ? 'disallow' : 'allow'}</span>
        </div>
      )}

      {specification.disallowIncomingTrustline !== undefined && (
        <div className="bold">
          Incoming trust line:{' '}
          <span className="orange">{specification.disallowIncomingTrustline ? 'disallow' : 'allow'}</span>
        </div>
      )}

      {specification.enableTransactionIDTracking !== undefined && (
        <div className="bold">
          Transaction ID tracking:{' '}
          <span className="orange">{specification.enableTransactionIDTracking ? 'enabled' : 'disabled'}</span>
        </div>
      )}

      {specification.globalFreeze !== undefined && (
        <div className="bold">
          Global freeze: <span className="orange">{specification.globalFreeze ? 'enabled' : 'disabled'}</span>
        </div>
      )}

      {specification.authorizedMinter !== undefined && (
        <div className="bold">
          Authorized minter: <span className="orange">{specification.authorizedMinter ? 'enabled' : 'disabled'}</span>
        </div>
      )}

      {specification.nftokenMinter !== undefined && (
        <div className="bold">
          NFT minter:{' '}
          <span className="orange">{specification.nftokenMinter || <span className="orange">removed</span>}</span>
        </div>
      )}

      {specification.allowTrustLineClawback !== undefined && (
        <div className="bold">
          Trustline Clawback:{' '}
          <span className="orange">{specification.allowTrustLineClawback ? 'allowed' : 'disallow'}</span>
        </div>
      )}

      {specification.disallowIncomingRemit !== undefined && (
        <div className="bold">
          Incoming Remit: <span className="orange">{specification.disallowIncomingRemit ? 'disallow' : 'allow'}</span>
        </div>
      )}
    </TransactionRowCard>
  )
}
