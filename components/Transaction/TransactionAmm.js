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
  if (!flags || typeof flags !== 'object') return <span className="grey">None</span>

  const flagDefinitions = txType === 'AMMWithdraw' ? AMMWithdrawFlags : AMMDepositFlags
  const activeFlags = []

  // Check each flag in the specification.flags object
  Object.entries(flags).forEach(([flagName, isActive]) => {
    if (isActive === true && flagDefinitions[flagName]) {
      activeFlags.push({
        name: flagName,
        description: flagDefinitions[flagName]
      })
    }
  })

  if (activeFlags.length === 0) {
    return <span className="grey">None</span>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {activeFlags.map((flag) => (
        <span key={flag.name} className="tooltip no-brake">
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
          <span className="tooltiptext right no-brake">{flag.description}</span>
        </span>
      ))}
    </div>
  )
}

export const TransactionAMM = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data
  const txType = tx.TransactionType
  const tradingFee = outcome?.ammChanges?.tradingFee
  // Only show flags for AMM deposit and withdraw transactions
  const showFlags = txType === 'AMMDeposit' || txType === 'AMMWithdraw'
  
  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {showFlags && (
        <tr>
          <TData>Flags</TData>
          <TData>
            <AMMFlags flags={specification.flags} txType={txType} />
          </TData>
        </tr>
      )}
      {tradingFee && (
        <tr>
          <TData>Trading Fee</TData>
          <TData>{divide(tradingFee, 100000)}%</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
