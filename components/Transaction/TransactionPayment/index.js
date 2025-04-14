import { TData } from '../../Table'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  amountFormat,
  nativeCurrencyToFiat,
  niceCurrency,
  shortHash
} from '../../../utils/format'

import { TransactionCard } from '../TransactionCard'
import { xls14NftValue } from '../../../utils'
import CopyButton from '../../UI/CopyButton'
import { addressBalanceChanges } from '../../../utils/transaction'
import DestinationTagProblemSolving from './DestinationTagProblemSolving'
import PaymentInstructions from './PaymentInstructions'

export const TransactionPayment = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null

  const { outcome, specification, tx } = data

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address)

  let txTypeSpecial = 'Payment'

  // sourse address and destination address is the same
  // sometimes source tag is added to show the dapp
  // so if there is no destintaion tag, no need the source tag to be the same
  const isConvertion =
    specification?.source?.address === specification?.destination?.address &&
    (specification?.source?.tag === specification?.destination?.tag || !specification?.destination?.tag)

  const isSuccessful = outcome?.result == 'tesSUCCESS'

  let iouPayment = false

  if (isConvertion) {
    txTypeSpecial = 'Conversion payment'
  } else {
    //check if iou involved (pathfinding or iou with fee)
    if (sourceBalanceChangesList[0]?.value !== '-' + outcome.deliveredAmount?.value) {
      iouPayment = true
    }
  }

  if (xls14NftValue(outcome.deliveredAmount?.value)) {
    txTypeSpecial = 'NFT transfer (XLS-14)'
  }

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

  const optionalAbsAmount = (change) => {
    return !isConvertion && (change?.value ? change.value.toString()[0] === '-' : change?.toString()[0] === '-')
      ? {
          ...change,
          value: change?.value ? change?.value.toString().slice(1) : change?.toString().slice(1)
        }
      : change
  }

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {!isSuccessful && specification?.source?.addressDetails?.service && (
        <tr>
          <TData className="bold orange">Problem solving</TData>
          <TData className="bold">
            The transaction <span class="red">FAILED</span>, if your balance changed, contact{' '}
            {addressUsernameOrServiceLink(specification.source, 'address')} support.
          </TData>
        </tr>
      )}
      {isSuccessful && !isConvertion && (
        <DestinationTagProblemSolving specification={specification} pageFiatRate={pageFiatRate} />
      )}
      <tr>
        <TData>{isConvertion ? 'Address' : 'Source'}</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {specification.source?.tag !== undefined && (
        <tr>
          <TData>Source tag</TData>
          <TData className="bold">{specification.source.tag}</TData>
        </tr>
      )}
      {!isConvertion && (
        <tr>
          <TData>Destination</TData>
          <TData>
            <AddressWithIconFilled data={specification.destination} name="address" />
          </TData>
        </tr>
      )}
      {specification.destination?.tag !== undefined && (
        <tr>
          <TData>Destination tag</TData>
          <TData className="bold">{specification.destination.tag}</TData>
        </tr>
      )}
      {tx?.InvoiceID && (
        <tr>
          <TData>Invoice ID</TData>
          <TData>
            {shortHash(tx.InvoiceID, 10)} <CopyButton text={tx.InvoiceID} />
          </TData>
        </tr>
      )}
      {(isConvertion || iouPayment) && (
        <>
          <tr>
            <TData>
              {isConvertion ? 'Exchanged' : 'Sender spent'}
              {sourceBalanceChangesList.map((change, index) => {
                return <br key={index} />
              })}
            </TData>
            <TData>
              {sourceBalanceChangesList.map((change, index) => (
                <div key={index}>
                  <span className={'bold ' + (Number(change?.value) > 0 ? 'green' : 'red')}>
                    {amountFormat(optionalAbsAmount(change))}
                  </span>
                  {change?.issuer && <>({addressUsernameOrServiceLink(change, 'issuer', { short: true })})</>}
                  {nativeCurrencyToFiat({
                    amount: optionalAbsAmount(change),
                    selectedCurrency,
                    fiatRate: pageFiatRate
                  })}
                </div>
              ))}
            </TData>
          </tr>
          {sourceBalanceChangesList.length === 2 && (
            <tr>
              <TData>Exchange rate</TData>
              <TData>
                1 {niceCurrency(sourceBalanceChangesList[0].currency)} ={' '}
                <span className="bold">
                  {amountFormat(
                    {
                      ...sourceBalanceChangesList[1],
                      value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                    },
                    { precise: 'nice' }
                  )}
                </span>
                {sourceBalanceChangesList[1].issuer && (
                  <>({addressUsernameOrServiceLink(sourceBalanceChangesList[1], 'issuer', { short: true })})</>
                )}
              </TData>
            </tr>
          )}
        </>
      )}
      {!isConvertion && outcome.deliveredAmount && (
        <tr>
          <TData>Delivered amount</TData>
          <TData>
            <span className="bold green">{amountFormat(outcome.deliveredAmount)}</span>
            {outcome.deliveredAmount?.issuer && (
              <>({addressUsernameOrServiceLink(outcome.deliveredAmount, 'issuer', { short: true })})</>
            )}
            {nativeCurrencyToFiat({
              amount: outcome.deliveredAmount,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}
          </TData>
        </tr>
      )}
      <PaymentInstructions data={data} sourceBalanceChanges={sourceBalanceChangesList} />
    </TransactionCard>
  )
}
