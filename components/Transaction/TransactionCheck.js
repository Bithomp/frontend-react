import { TRow, TData } from '../TableDetails'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  nativeCurrencyToFiat,
  shortHash
} from '../../utils/format'

import { TransactionCard } from './TransactionCard'
import CopyButton from '../UI/CopyButton'

export const TransactionCheck = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null

  const { outcome, specification, tx } = data

  /*
  {
    tx: {
      Account: 'rMJXDzU1N9ZSDzPF7s1i2GGKyjM2wB3iom',
      Amount: '30000000000000',
      Destination: 'rLD5k36bJkNk1HkYSSCJwM4jBXChHjRViQ',
      DestinationTag: 3681967221,
      Fee: '24',
      Flags: 2147483648,
      LastLedgerSequence: 93908709,
      Sequence: 92082425,
      SigningPubKey: '022F5F5DDD08A08B1535EE5A7CD75485FDFDFD19AE676796B9F09D95AB505C34F4',
      TransactionType: 'Payment',
      TxnSignature: '30440220581609CA59B4FC7BFA61D4D7775D340F8A95916217E2E7C9578CFB3E235C1046022007F9CF3363A5A90C384FB935EEFFD0CB497DAA9B46539AD08E664D9417C0674A',
      hash: '2617C08D8D62E90083EC8EE5B573673B96C16CF3D64CF374F3C73A6A653C769E',
      DeliverMax: '30000000000000',
      ctid: 'C598E2E300530000',
      date: 791937440,
      ledger_index: 93905635,
      inLedger: 93905635
    },
    meta: {
      AffectedNodes: [ [Object], [Object] ],
      TransactionIndex: 83,
      TransactionResult: 'tesSUCCESS',
      delivered_amount: '30000000000000'
    },
    specification: {
      source: {
        address: 'rMJXDzU1N9ZSDzPF7s1i2GGKyjM2wB3iom',
        maxAmount: [Object]
      },
      destination: { address: 'rLD5k36bJkNk1HkYSSCJwM4jBXChHjRViQ', tag: 3681967221 }
    },
    outcome: {
      result: 'tesSUCCESS',
      timestamp: '2025-02-03T22:37:20.000Z',
      fee: '0.000024',
      balanceChanges: {
        rMJXDzU1N9ZSDzPF7s1i2GGKyjM2wB3iom: [
          {
            "currency": "XRP",
            "value": "-0.00001"
          },
        ],
        rLD5k36bJkNk1HkYSSCJwM4jBXChHjRViQ: [Array]
      },
      ledgerVersion: 93905635,
      indexInLedger: 83,
      deliveredAmount: { currency: 'XRP', value: '30000000' }
    },
    validated: true
  }
  */

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <TRow>
        <TData>Source</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </TRow>
      {specification.source?.tag !== undefined && (
        <TRow>
          <TData>Source tag</TData>
          <TData className="bold">{specification.source.tag}</TData>
        </TRow>
      )}
      <TRow>
        <TData>Destination</TData>
        <TData>
          <AddressWithIconFilled data={specification.destination} name="address" />
        </TData>
      </TRow>
      {specification.destination?.tag !== undefined && (
        <TRow>
          <TData>Destination tag</TData>
          <TData className="bold">{specification.destination.tag}</TData>
        </TRow>
      )}
      {tx?.InvoiceID && (
        <TRow>
          <TData>Invoice ID</TData>
          <TData>
            {shortHash(tx.InvoiceID, 10)} <CopyButton text={tx.InvoiceID} />
          </TData>
        </TRow>
      )}

      {outcome?.checkChanges?.checkID && (
        <TRow>
          <TData>Check ID</TData>
          <TData>
            {shortHash(outcome?.checkChanges?.checkID, 10)} <CopyButton text={outcome?.checkChanges?.checkID} />
          </TData>
        </TRow>
      )}

      {tx.SendMax && (
        <TRow>
          <TData>Max amount</TData>
          <TData>
            <span className="bold orange">{amountFormat(tx.SendMax)}</span>
            {tx.SendMax?.issuer && <>({addressUsernameOrServiceLink(tx.SendMax, 'issuer', { short: true })})</>}
            {nativeCurrencyToFiat({
              amount: tx.SendMax,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
          </TData>
        </TRow>
      )}
    </TransactionCard>
  )
}
