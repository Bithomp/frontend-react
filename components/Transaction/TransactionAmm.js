import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import {
  AddressWithIconFilled,
  addressUsernameOrServiceLink,
  amountFormat,
  nativeCurrencyToFiat,
  niceCurrency
} from '../../utils/format'
import { divide } from '../../utils/calc'
import { addressBalanceChanges } from '../../utils/transaction'

// AMM Flag definitions based on XRPL documentation
const AMMWithdrawFlags = {
  lpToken: 'Perform a double-asset withdrawal and receive the specified amount of LP Tokens',
  withdrawAll: 'Perform a double-asset withdrawal returning all your LP Tokens',
  oneAssetWithdrawAll: 'Perform a single-asset withdrawal returning all of your LP Tokens',
  singleAsset: 'Perform a single-asset withdrawal with a specified amount of the asset to withdraw',
  twoAsset: 'Perform a double-asset withdrawal with specified amounts of both assets',
  oneAssetLPToken: 'Perform a single-asset withdrawal and receive the specified amount of LP Tokens',
  limitLPToken: 'Perform a single-asset withdrawal with a specified effective price'
}

const AMMDepositFlags = {
  lpToken: 'Perform a double-asset deposit and receive the specified amount of LP Tokens',
  singleAsset: 'Perform a single-asset deposit with a specified amount of the asset to deposit',
  twoAsset: 'Perform a double-asset deposit with specified amounts of both assets',
  oneAssetLPToken: 'Perform a single-asset deposit and receive the specified amount of LP Tokens',
  limitLPToken: 'Perform a single-asset deposit with a specified effective price',
  twoAssetIfEmpty: 'Perform a special double-asset deposit to an AMM with an empty pool'
}

const AMMClawbackFlags = {
  tfClawTwoAssets:
    "Claw back the specified amount of Asset, and a corresponding amount of Asset2 based on the AMM pool's asset proportion"
}

// Helper function to create amount object with issuer details
const createAmountWithIssuer = (specification, outcome, sourceAddress, amountKey) => {
  const amountData = specification?.[amountKey]
  if (!amountData) return null

  return {
    currency: amountData.currency,
    issuer: amountData.issuer,
    counterparty: amountData.counterparty,
    issuerDetails: outcome?.balanceChanges
      ?.find((change) => change.address === sourceAddress)
      ?.balanceChanges?.find((change) => change.currency === amountData.currency)?.issuerDetails,
    value: amountData.value
  }
}

// Helper function to render asset with issuer
const renderAssetWithIssuer = (assetData) => (
  <>
    {niceCurrency(assetData.currency)}
    {assetData.issuer && (
      <>
        {' ('}
        {addressUsernameOrServiceLink(assetData, 'issuer', { short: true })}
        {')'}
      </>
    )}
  </>
)

// Component to display AMM flags with tooltips
const AMMFlags = ({ flags, txType }) => {
  if (!flags || typeof flags !== 'object') return ''

  const flagDefinitions = {}
  if (txType === 'AMMWithdraw') {
    Object.assign(flagDefinitions, AMMWithdrawFlags)
  } else if (txType === 'AMMDeposit') {
    Object.assign(flagDefinitions, AMMDepositFlags)
  } else if (txType === 'AMMClawback') {
    Object.assign(flagDefinitions, AMMClawbackFlags)
  }

  const activeFlags = []

  // Check each flag in the specification.flags object
  Object.entries(flags).forEach(([flagName, isActive]) => {
    if (isActive === true) {
      activeFlags.push({
        name: flagName,
        description: flagDefinitions[flagName] || ''
      })
    }
  })

  if (activeFlags.length === 0) {
    return <span className="grey">None</span>
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeFlags.map((flag) => (
          <div key={flag.name}>
            {/* Desktop version with tooltip */}
            <span className="tooltip no-brake desktop-only">
              <span className="flag">{flag.name}</span>
              {flag.description && <span className="tooltiptext right no-brake">{flag.description}</span>}
            </span>

            {/* Mobile version with inline description */}
            <div className="mobile-only">
              <span className="bold">{flag.name} </span>
              {flag.description && <span className="grey">({flag.description})</span>}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .mobile-only {
          display: none;
        }
        @media only screen and (max-width: 800px) {
          .mobile-only {
            display: block;
          }
          .desktop-only {
            display: none;
          }
        }
      `}</style>
    </>
  )
}

export const TransactionAMM = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data

  const txType = tx.TransactionType
  const tradingFee = tx?.TradingFee
  const amount = createAmountWithIssuer(specification, outcome, specification.source.address, 'amount')
  const amount2 = createAmountWithIssuer(specification, outcome, specification.source.address, 'amount2')
  const asset = specification?.asset
  const asset2 = specification?.asset2
  const ePrice = specification?.EPrice
  const lpTokenOut = specification?.LPTokenOut
  const lpTokenIn = specification?.LPTokenIn
  const bidMax = createAmountWithIssuer(specification, outcome, specification.source.address, 'bidMax')
  const bidMin = createAmountWithIssuer(specification, outcome, specification.source.address, 'bidMin')
  const holder = {
    address: specification?.holder,
    addressDetails: outcome?.balanceChanges?.find((change) => change.address === specification.holder)?.addressDetails
  }
  // Executor balance changes adjusted for fee
  const sourceBalanceChangesList = addressBalanceChanges(data, specification.source.address) || []
  const depositedList = sourceBalanceChangesList.filter((c) => Number(c?.value) < 0)
  const receivedList = sourceBalanceChangesList.filter((c) => Number(c?.value) > 0)

  // Helper function to render amount with issuer
  const renderAmountWithIssuer = (amountData, options) => (
    <>
      {amountFormat(amountData)}
      {amountData.issuer && (
        <>
          {'('}
          {addressUsernameOrServiceLink(amountData, 'issuer', { short: true })}
          {')'}
        </>
      )}
      {options?.includeFiat &&
        selectedCurrency &&
        amountData?.value &&
        amountData?.currency &&
        amountData?.value !== '0' && (
          <span style={{ fontWeight: 'normal' }}>
            {nativeCurrencyToFiat({
              amount: amountData,
              selectedCurrency,
              fiatRate: pageFiatRate
            })}{' '}
          </span>
        )}
    </>
  )

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      notFullySupported={true}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {(txType === 'AMMVote' || txType === 'AMMBid' || txType === 'AMMDelete') && asset && asset2 && (
        <tr>
          <TData>Liquidity pool</TData>
          <TData className="bold">
            {renderAssetWithIssuer(asset)} / {renderAssetWithIssuer(asset2)}
          </TData>
        </tr>
      )}
      {(txType === 'AMMCreate' || txType === 'AMMDeposit') && (
        <>
          {depositedList.length > 0 && (
            <tr>
              <TData>Deposited</TData>
              <TData className="bold">
                {depositedList.map((change, idx) => (
                  <div key={idx}>
                    {renderAmountWithIssuer(
                      { ...change, value: Math.abs(Number(change.value)).toString() },
                      {
                        includeFiat: true
                      }
                    )}
                  </div>
                ))}
              </TData>
            </tr>
          )}
          {receivedList.length > 0 && (
            <tr>
              <TData>Received</TData>
              <TData className="bold">
                {receivedList.map((change, idx) => (
                  <div key={idx}>{renderAmountWithIssuer(change, { includeFiat: true })}</div>
                ))}
              </TData>
            </tr>
          )}
        </>
      )}
      {txType === 'AMMWithdraw' && (
        <>
          {depositedList.length > 0 && (
            <tr>
              <TData>Deposited</TData>
              <TData>
                {depositedList.map((change, idx) => (
                  <div key={idx}>
                    {amountFormat(
                      { ...change, value: Math.abs(Number(change.value)).toString() },
                      { withIssuer: true, bold: true }
                    )}
                  </div>
                ))}
              </TData>
            </tr>
          )}
          {(() => {
            const targetReceivedList = (
              holder?.address ? addressBalanceChanges(data, holder.address) || [] : sourceBalanceChangesList
            ).filter((c) => Number(c?.value) > 0)
            return targetReceivedList.length > 0 ? (
              <tr>
                <TData>Withdrawn</TData>
                <TData>
                  {targetReceivedList.map((change, idx) => (
                    <div key={idx}>{amountFormat(change, { withIssuer: true, bold: true })}</div>
                  ))}
                </TData>
              </tr>
            ) : (
              ''
            )
          })()}
        </>
      )}
      {ePrice && (
        <tr>
          <TData>EPrice</TData>
          <TData className="bold">{ePrice}</TData>
        </tr>
      )}
      {lpTokenIn && (
        <tr>
          <TData>LP Token In</TData>
          <TData className="bold">{lpTokenIn}</TData>
        </tr>
      )}
      {lpTokenOut && (
        <tr>
          <TData>LP Token Out</TData>
          <TData className="bold">{lpTokenOut}</TData>
        </tr>
      )}
      {bidMax?.currency && bidMax?.value && bidMin?.currency && bidMin?.value && bidMax.value === bidMin.value ? (
        <tr>
          <TData>Bid</TData>
          <TData className="bold">{renderAmountWithIssuer(bidMax)}</TData>
        </tr>
      ) : (
        <>
          {bidMax?.currency && bidMax?.value && (
            <tr>
              <TData>Bid Max</TData>
              <TData className="bold">{renderAmountWithIssuer(bidMax)}</TData>
            </tr>
          )}
          {bidMin?.currency && bidMin?.value && (
            <tr>
              <TData>Bid Min</TData>
              <TData className="bold">{renderAmountWithIssuer(bidMin)}</TData>
            </tr>
          )}
        </>
      )}
      {holder?.address && (
        <tr>
          <TData>Holder</TData>
          <TData className="bold">
            <AddressWithIconFilled data={holder} name="address" />
          </TData>
        </tr>
      )}
      {tradingFee ? (
        <tr>
          <TData>Trading fee</TData>
          <TData className="bold">{divide(tradingFee, 100000)}%</TData>
        </tr>
      ) : (
        ''
      )}
      {specification?.flags && Object.entries(specification?.flags).length > 0 && (
        <tr>
          <TData>Flags</TData>
          <TData>
            <AMMFlags flags={specification.flags} txType={txType} />
          </TData>
        </tr>
      )}

      {txType === 'AMMDeposit' || txType === 'AMMCreate' || txType === 'AMMWithdraw' ? (
        <tr>
          <TData>Specification </TData>
          <TData>
            It was instructed to {txType === 'AMMDeposit' || txType === 'AMMCreate' ? 'deposit' : 'withdraw'} maximum{' '}
            {amount?.currency && amount?.value && (
              <>
                {renderAmountWithIssuer(amount)}
                {amount2?.currency && amount2?.value && ' and '}
              </>
            )}
            {amount2?.currency && amount2?.value && renderAmountWithIssuer(amount2)}
          </TData>
        </tr>
      ) : (
        <>
          {amount?.currency && amount?.value && (
            <tr>
              <TData>Asset 1</TData>
              <TData className="bold">{renderAmountWithIssuer(amount)}</TData>
            </tr>
          )}
          {amount2?.currency && amount2?.value && (
            <tr>
              <TData>Asset 2</TData>
              <TData className="bold">{renderAmountWithIssuer(amount2)}</TData>
            </tr>
          )}
        </>
      )}
    </TransactionCard>
  )
}
