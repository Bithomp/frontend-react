import { TransactionRowCard } from './TransactionRowCard'
import { nativeCurrency } from '../../../utils'

export const TransactionRowAccountSet = ({ tx, address, index, selectedCurrency }) => {
  const { specification } = tx

  return (
    <TransactionRowCard data={tx} address={address} index={index} selectedCurrency={selectedCurrency}>
      {specification.defaultRipple !== undefined && (
        <div>
          <span>Default ripple: </span>
          <span className="bold orange">{specification.defaultRipple ? 'enabled' : 'disabled'}</span>
        </div>
      )}
      {specification.disallowXRP !== undefined && (
        <div>
          <span>Incoming {nativeCurrency}: </span>
          <span className="bold">{specification.disallowXRP ? 'disallow' : 'allow'}</span>
        </div>
      )}
      {specification.requireDestTag !== undefined && (
        <div>
          <span>Destination tag: </span>
          <span className="bold orange">{specification.requireDestTag ? 'require' : "don't require"}</span>
        </div>
      )}
      {specification.disableMaster !== undefined && (
        <div>
          <span>Master key: </span>
          <span className="bold red">{specification.disableMaster ? 'disabled' : 'enabled'}</span>
        </div>
      )}
      {specification.noFreeze && (
        <div>
          <span>No freeze: </span>
          <span className="bold">enabled</span>
        </div>
      )}
      {specification.depositAuth !== undefined && (
        <div>
          <span>Deposit authorization: </span>
          <span className="bold">{specification.depositAuth ? 'enabled' : 'disabled'}</span>
        </div>
      )}
      {specification.requireAuth !== undefined && (
        <div>
          <span>Require authorization: </span>
          <span className="bold">{specification.requireAuth ? 'enabled' : 'disabled'}</span>
        </div>
      )}
      {specification.disallowIncomingCheck !== undefined && (
        <div>
          <span>Incoming check: </span>
          <span className="bold">{specification.disallowIncomingCheck ? 'disallow' : 'allow'}</span>
        </div>
      )}
      {specification.disallowIncomingPayChan !== undefined && (
        <div>
          <span>Incoming payment channel: </span>
          <span className="bold">{specification.disallowIncomingPayChan ? 'disallow' : 'allow'}</span>
        </div>
      )}
      {specification.disallowIncomingNFTokenOffer !== undefined && (
        <div>
          <span>Incoming NFT offer: </span>
          <span className="bold">{specification.disallowIncomingNFTokenOffer ? 'disallow' : 'allow'}</span>
        </div>
      )}
      {specification.disallowIncomingTrustline !== undefined && (
        <div>
          <span>Incoming trust line: </span>
          <span className="bold">{specification.disallowIncomingTrustline ? 'disallow' : 'allow'}</span>
        </div>
      )}
      {specification.enableTransactionIDTracking !== undefined && (
        <div>
          <span>Transaction ID tracking: </span>
          <span className="bold">{specification.enableTransactionIDTracking ? 'enabled' : 'disabled'}</span>
        </div>
      )}
      {specification.globalFreeze !== undefined && (
        <div>
          <span>Global freeze: </span>
          <span className="bold">{specification.globalFreeze ? 'enabled' : 'disabled'}</span>
        </div>
      )}
      {specification.authorizedMinter !== undefined && (
        <div>
          <span>Authorized minter: </span>
          <span className="bold">{specification.authorizedMinter ? 'enabled' : 'disabled'}</span>
        </div>
      )}
      {tx.NFTokenMinter !== undefined && (
        <div>
          <span>NFT minter: </span>
          <span className="bold">{specification.nftokenMinter || <span className="orange">removed</span>}</span>
        </div>
      )}
      {specification.allowTrustLineClawback !== undefined && (
        <div>
          <span>Trust line Clawback: </span>
          <span className="bold">{specification.allowTrustLineClawback ? 'allowed' : 'disallow'}</span>
        </div>
      )}
      {specification.disallowIncomingRemit !== undefined && (
        <div>
          <span>Incoming Remit: </span>
          <span className="bold">{specification.disallowIncomingRemit ? 'disallow' : 'allow'}</span>
        </div>
      )}
    </TransactionRowCard>
  )
}
