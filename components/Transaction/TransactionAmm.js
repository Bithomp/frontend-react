import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import {
  AddressWithIconFilled,
  AddressWithIconInline,
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

function statusBadgeClasses(status) {
  switch (status) {
    case 'added':
      return 'bg-green-100 text-green-800'
    case 'removed':
      return 'bg-red-100 text-red-800'
    case 'modified':
    default:
      return 'bg-amber-100 text-amber-800'
  }
}

function VoteSlotsChangesTable({ voteSlotsChanges = [] }) {
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 hide-on-small-w800">
        <table className="min-w-full text-sm text-center mx-auto">
          <thead className="text-left">
            <tr>
              <th className="px-3 py-2 font-semibold text-gray-600">#</th>
              <th className="px-3 py-2 font-semibold text-gray-600 left">Account</th>
              <th className="px-3 py-2 font-semibold text-gray-600 center">Status</th>
              <th className="px-3 py-2 font-semibold text-gray-600 right">Trading Fee</th>
              <th className="px-3 py-2 font-semibold text-gray-600 right">Vote Weight</th>
              <th className="px-3 py-2 font-semibold text-gray-600 right">Δ Weight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {voteSlotsChanges
              .sort((a, b) => b.voteWeight - a.voteWeight)
              .map((v, i) => {
                const delta = v.voteWeightChange ? v.voteWeightChange / 1000 : 0
                const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'
                return (
                  <tr key={`${v.account}-${i}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 left">
                      <AddressWithIconInline data={v} name="account" options={{ short: 6 }} />
                    </td>
                    <td className="px-3 py-2 center">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(
                          v.status
                        )}`}
                      >
                        {v.status || 'modified'}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums right">{v.tradingFee ? v.tradingFee / 1000 + '%' : '—'}</td>
                    <td className="px-3 py-2 tabular-nums right">
                      {v.voteWeight !== undefined ? v.voteWeight / 1000 + '%' : '—'}
                    </td>
                    <td className={`right px-3 py-2 tabular-nums ${deltaColor}`}>{delta > 0 ? `+${delta}` : delta}%</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      <div className="show-on-small-w800 space-y-3">
        {voteSlotsChanges
          .slice()
          .sort((a, b) => b.voteWeight - a.voteWeight)
          .map((v, i) => {
            const delta = v.voteWeightChange ? v.voteWeightChange / 1000 : 0
            const deltaColor = delta > 0 ? 'green' : delta < 0 ? 'red' : 'gray'

            return (
              <div key={`${v.account}-${i}`} className="border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="flex justify-between text-sm mb-1">
                  <span>#{i + 1}</span>
                  <span className={deltaColor}>{delta > 0 ? `+${delta}` : delta}%</span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex-shrink-0 text-left">
                    <AddressWithIconInline data={v} name="account" options={{ short: true }} />
                  </div>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(v.status)}`}>
                    {v.status || 'modified'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">Trading Fee:</span> {v.tradingFee ? v.tradingFee / 1000 + '%' : '—'}
                  </div>
                  <div>
                    <span className="font-medium">Vote:</span>{' '}
                    {v.voteWeight !== undefined ? v.voteWeight / 1000 + '%' : '—'}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
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
      {amountFormat(amountData, { withIssuer: true, bold: true, precise: 'nice' })}
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
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
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
                      { withIssuer: true, bold: true, precise: 'nice' }
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
                    <div key={idx}>{amountFormat(change, { withIssuer: true, bold: true, precise: 'nice' })}</div>
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
      {specification?.flags && Object.values(specification.flags).some((v) => v === true) && (
        <tr>
          <TData>Flags</TData>
          <TData>
            <AMMFlags flags={specification.flags} txType={txType} />
          </TData>
        </tr>
      )}
      {txType === 'AMMDeposit' || txType === 'AMMCreate' || txType === 'AMMWithdraw' ? (
        <tr>
          <TData>Specification</TData>
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
      {outcome?.ammChanges?.voteSlotsChanges?.length > 0 && (
        <tr>
          <TData colSpan={2}>
            <br />
            <center className="bold">Vote Slots Changes</center>
            <br />
            <VoteSlotsChangesTable voteSlotsChanges={outcome.ammChanges.voteSlotsChanges} />
            <br />
            <br />
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}
