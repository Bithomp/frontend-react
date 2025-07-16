import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'
import { divide } from '../../utils/calc'

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

// Component to display AMM flags with tooltips
const AMMFlags = ({ flags, txType }) => {
  if (!flags || typeof flags !== 'object') return ''

  const flagDefinitions = {}
  if (txType === 'AMMWithdraw') {
    Object.assign(flagDefinitions, AMMWithdrawFlags)
  } else if (txType === 'AMMDeposit') {
    Object.assign(flagDefinitions, AMMDepositFlags)
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
              <span
                style={{
                  backgroundColor: '#e6f4ea',
                  color: '#008000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: '1px solid #008000'
                }}
              >
                {flag.name}
              </span>
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
  const { specification, tx } = data
  const txType = tx.TransactionType
  const tradingFee = tx?.TradingFee

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
      {tradingFee && (
        <tr>
          <TData>Trading fee</TData>
          <TData className="bold">{divide(tradingFee, 100000)}%</TData>
        </tr>
      )}
      {Object.entries(specification?.flags).length > 0 && (
        <tr>
          <TData>Flags</TData>
          <TData>
            <AMMFlags flags={specification.flags} txType={txType} />
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}
