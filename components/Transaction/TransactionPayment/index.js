import { TData } from '../TData'
import {
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  AmountWithIcon,
  tokenToFiat,
  shortHash
} from '../../../utils/format'

import { TransactionCard } from '../TransactionCard'
import { isNativeCurrency, isXls14NftAmount, nativeCurrency } from '../../../utils'
import CopyButton from '../../UI/CopyButton'
import { addressBalanceChanges, dappBySourceTag, isConvertionTx } from '../../../utils/transaction'
import DestinationTagProblemSolving from './DestinationTagProblemSolving'
import PaymentInstructions from './PaymentInstructions'
import { LinkToken, LinkTx } from '../../../utils/links'
import { isIOUpayment, optionalAbsPaymentAmount, paymentTypeName } from '../../../utils/transaction/payment'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'

const DESTINATION_TAG_PROBLEM_AMOUNT_LIMIT = 100000
const RLUSD_CURRENCY_CODE = '524C555344000000000000000000000000000000'
const PAYMENT_DELIVERED_AMOUNT_ICON_SIZE = 35
const PAYMENT_CHANGE_AMOUNT_ICON_SIZE = 35

const isRlusdAmount = (amount) =>
  amount?.issuer && amount.currency === RLUSD_CURRENCY_CODE

const paymentTokenData = (amount) =>
  typeof amount === 'string' || typeof amount === 'number' ? { currency: nativeCurrency } : amount

const shouldShowDestinationTagProblem = (deliveredAmount) => {
  if (!deliveredAmount) return true

  if (isNativeCurrency(deliveredAmount) || isRlusdAmount(deliveredAmount)) {
    return Number(deliveredAmount.value) < DESTINATION_TAG_PROBLEM_AMOUNT_LIMIT
  }

  return !!deliveredAmount.issuer
}

const PaymentTokenAmount = ({
  amount,
  pageFiatRate,
  selectedCurrency,
  showFiat = false,
  showIcon,
  iconSize = PAYMENT_CHANGE_AMOUNT_ICON_SIZE,
  color,
  bold = false,
  precise
}) => (
  <span className="payment-token-amount" suppressHydrationWarning>
    <span className="payment-token-amount-main">
      <AmountWithIcon
        amount={amount}
        options={{
          precise,
          withIssuer: false,
          noCurrency: true,
          icon: showIcon,
          iconSize: showIcon ? iconSize : undefined,
          bold,
          color
        }}
      />
      <LinkToken token={paymentTokenData(amount)} className="payment-token-link" />
    </span>
    {showFiat && (
      <span className="payment-fiat" suppressHydrationWarning>
        {tokenToFiat({
          amount,
          selectedCurrency,
          fiatRate: pageFiatRate,
          asText: true
        })}
      </span>
    )}
  </span>
)

const PaymentAmountValue = ({ amount, pageFiatRate, selectedCurrency, showFiat, showIcon }) => (
  <span className="payment-amount-line" suppressHydrationWarning>
    <PaymentTokenAmount
      amount={amount}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      showFiat={showFiat}
      showIcon={showIcon}
      iconSize={PAYMENT_DELIVERED_AMOUNT_ICON_SIZE}
      precise="nice"
      bold
      color="green"
    />
  </span>
)

const PaymentAccountCell = ({ data, tag, tagLabel }) => (
  <div className="payment-account-cell">
    <AddressWithIconFilled data={data} name="address" />
    {tag !== undefined && (
      <div className="payment-account-tag">
        <span className="payment-account-tag-label">{tagLabel}</span>
        <span className="payment-account-tag-value">{tag}</span>
      </div>
    )}
  </div>
)

export const TransactionPayment = ({ data, pageFiatRate, selectedCurrency }) => {
  const { t: txT } = useTranslation('transaction')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!data) return null

  const { outcome, specification, tx } = data

  //for payments executor is always the sender, so we can check executor's balance changes.
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address)
  const txTypeSpecial = paymentTypeName(data)
  const isConvertion = isConvertionTx(specification)
  const isSuccessful = outcome?.result == 'tesSUCCESS'
  const iouPayment = isIOUpayment(data)
  const isInsufFee = outcome?.result === 'tecINSUFF_FEE'
  const showExchangeRate = !sourceBalanceChangesList?.some(isXls14NftAmount)
  //don't show sourcetag if it's the tag of a known dapp
  const dapp = dappBySourceTag(specification.source.tag)

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
    <>
      <TransactionCard
        data={data}
        pageFiatRate={pageFiatRate}
        selectedCurrency={selectedCurrency}
        txTypeSpecial={txTypeSpecial}
      >
        {!isConvertion && outcome?.deliveredAmount && (
          <tr className="payment-delivered-row" suppressHydrationWarning>
            <TData>Delivered amount</TData>
            <TData>
              <PaymentAmountValue
                amount={outcome.deliveredAmount}
                pageFiatRate={pageFiatRate}
                selectedCurrency={selectedCurrency}
                showFiat={isHydrated}
                showIcon={isHydrated}
              />
            </TData>
          </tr>
        )}
        <tr className="payment-account-row" suppressHydrationWarning>
          <TData>{isConvertion ? 'Address' : 'Source'}</TData>
          <TData>
            <PaymentAccountCell
              data={specification.source}
              tag={!dapp ? specification.source?.tag : undefined}
              tagLabel={txT('labels.Source tag', { defaultValue: 'Source tag' })}
            />
          </TData>
        </tr>
        {!isConvertion && (
          <tr className="payment-account-row" suppressHydrationWarning>
            <TData>Destination</TData>
            <TData>
              <PaymentAccountCell
                data={specification.destination}
                tag={specification.destination?.tag}
                tagLabel={txT('labels.Destination tag', { defaultValue: 'Destination tag' })}
              />
            </TData>
          </tr>
        )}
        {!isSuccessful && specification?.source?.addressDetails?.service && (
          <tr className="tx-problem-row">
            <TData className="bold orange">Problem solving</TData>
            <TData className="bold">
              The transaction <span className="red">FAILED</span>, if your balance changed, contact{' '}
              {addressUsernameOrServiceLink(specification.source, 'address')} support.
            </TData>
          </tr>
        )}
        {isSuccessful &&
          !isConvertion &&
          shouldShowDestinationTagProblem(outcome?.deliveredAmount) && (
            <DestinationTagProblemSolving specification={specification} pageFiatRate={pageFiatRate} />
          )}
        {tx?.InvoiceID && (
          <>
            {tx.Destination === 'ryouhapPYV5KNHmFUKrjNqsjxhnxvQiVt' ? (
              <tr className="tx-invoice-row">
                <TData>Invoiced TX</TData>
                <TData>
                  <LinkTx tx={tx.InvoiceID} /> <CopyButton text={tx.InvoiceID} />
                </TData>
              </tr>
            ) : (
              <tr className="tx-invoice-row">
                <TData>Invoice ID</TData>
                <TData>
                  {shortHash(tx.InvoiceID, 10)} <CopyButton text={tx.InvoiceID} />
                </TData>
              </tr>
            )}
          </>
        )}
        {(isConvertion || iouPayment) && !isInsufFee && sourceBalanceChangesList?.length > 0 && (
          <>
            <tr className="tx-payment-extra-row" suppressHydrationWarning>
              <TData>{isConvertion ? 'Exchanged' : 'Sender spent'}</TData>
              <TData>
                <div className="payment-amount-stack">
                  {sourceBalanceChangesList.map((change, index) => (
                    <PaymentTokenAmount
                      key={index}
                      amount={optionalAbsPaymentAmount(change, isConvertion)}
                      pageFiatRate={pageFiatRate}
                      selectedCurrency={selectedCurrency}
                      showFiat={isHydrated}
                      showIcon={isHydrated}
                      bold
                      color="direction"
                    />
                  ))}
                </div>
              </TData>
            </tr>
            {sourceBalanceChangesList?.length === 2 && showExchangeRate && (
              <tr className="tx-payment-extra-row" suppressHydrationWarning>
                <TData>Exchange rate</TData>
                <TData>
                  <span className="payment-exchange-rate">
                    <PaymentTokenAmount
                      amount={{
                        ...sourceBalanceChangesList[0],
                        value: 1
                      }}
                      showIcon={isHydrated}
                      precise="nice"
                    />
                    <span className="payment-exchange-rate-equals">=</span>
                    <PaymentTokenAmount
                      amount={{
                        ...sourceBalanceChangesList[1],
                        value: Math.abs(sourceBalanceChangesList[1].value / sourceBalanceChangesList[0].value)
                      }}
                      showIcon={isHydrated}
                      precise="nice"
                      bold
                    />
                  </span>
                </TData>
              </tr>
            )}
          </>
        )}
        <PaymentInstructions data={data} sourceBalanceChanges={sourceBalanceChangesList} />
      </TransactionCard>
        <style jsx>{`
        :global(.payment-amount-line) {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2px 9px;
          min-width: 0;
        }
        :global(.payment-amount-stack) {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          min-width: 0;
        }
        :global(.payment-token-amount) {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px 4px;
          min-width: 0;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }
        :global(.payment-token-amount-main) {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        :global(.payment-amount-line .payment-token-amount-main) {
          font-size: 20px;
        }
        :global(.payment-exchange-rate) {
          display: inline-flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px 8px;
          min-width: 0;
        }
        :global(.payment-exchange-rate-equals) {
          color: var(--text-main);
        }
        :global(.payment-account-cell) {
          min-width: 0;
        }
        :global(.payment-account-cell table) {
          min-width: 0 !important;
          width: 100%;
        }
        :global(.payment-account-cell table td) {
          vertical-align: middle;
        }
        :global(.payment-account-cell table td:last-child) {
          letter-spacing: -0.04em;
          overflow-wrap: anywhere;
          word-break: break-all;
        }
        :global(.payment-delivered-row td),
        :global(.payment-account-row td),
        :global(.tx-payment-extra-row td),
        :global(.tx-detail-table > tbody > tr.payment-delivered-row > td.tx-td),
        :global(.tx-detail-table > tbody > tr.payment-account-row > td.tx-td),
        :global(.tx-detail-table > tbody > tr.tx-payment-extra-row > td.tx-td) {
          vertical-align: middle;
        }
        :global(.tx-detail-table > tbody > tr.payment-delivered-row > td.tx-td:first-child),
        :global(.tx-detail-table > tbody > tr.payment-account-row > td.tx-td:first-child),
        :global(.tx-detail-table > tbody > tr.tx-payment-extra-row > td.tx-td:first-child) {
          padding-top: 4px;
        }
        :global(.payment-account-tag) {
          margin-top: 5px;
          padding-left: 40px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.25;
        }
        :global(.payment-account-tag-label) {
          margin-right: 6px;
        }
        :global(.payment-account-tag-value) {
          color: var(--text-main);
          font-weight: 700;
        }
        :global(.payment-fiat) {
          color: var(--text-main);
          font-size: 18px;
          line-height: 1.25;
        }
        :global(.payment-token-link) {
          color: var(--text-secondary);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        :global(.payment-token-link:visited) {
          color: var(--text-secondary);
        }
        :global(.payment-token-link:hover) {
          color: var(--text-secondary);
          text-decoration-thickness: 2px;
        }
      `}</style>
    </>
  )
}
