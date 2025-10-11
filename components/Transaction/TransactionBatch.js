import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { addressUsernameOrServiceLink, AddressWithIconFilled } from '../../utils/format'
import { xahauNetwork } from '../../utils'

// Global flags definitions for XRP and XAH networks
const GLOBAL_FLAGS_XRP = {
  tfFullyCanonicalSig: 'Require fully canonical signatures',
  tfNoDirectRipple: 'Pathfinding is not used to find this path',
  tfPartialPayment: 'Partial payment is allowed',
  tfLimitQuality: 'Limit quality is used for this offer',
  tfFillOrKill: 'Fill or kill order',
  tfImmediateOrCancel: 'Immediate or cancel order',
  tfSell: 'Sell order',
  tfPassive: 'Passive order',
  tfRequireDestTag: 'Require destination tag',
  tfOptionalDestTag: 'Optional destination tag',
  tfRequireAuth: 'Require authorization',
  tfOptionalAuth: 'Optional authorization',
  tfDisallowXRP: 'Disallow XRP',
  tfAllowXRP: 'Allow XRP'
}

const GLOBAL_FLAGS_XAH = {
  tfFullyCanonicalSig: 'Require fully canonical signatures',
  tfNoDirectRipple: 'Pathfinding is not used to find this path',
  tfPartialPayment: 'Partial payment is allowed',
  tfLimitQuality: 'Limit quality is used for this offer',
  tfFillOrKill: 'Fill or kill order',
  tfImmediateOrCancel: 'Immediate or cancel order',
  tfSell: 'Sell order',
  tfPassive: 'Passive order',
  tfRequireDestTag: 'Require destination tag',
  tfOptionalDestTag: 'Optional destination tag',
  tfRequireAuth: 'Require authorization',
  tfOptionalAuth: 'Optional authorization',
  tfDisallowXAH: 'Disallow XAH',
  tfAllowXAH: 'Allow XAH'
}

// Component to display transaction flags with tooltips
const TransactionFlags = ({ flags }) => {
  if (!flags || typeof flags !== 'object') return <span className="grey">None</span>

  const globalFlags = xahauNetwork ? GLOBAL_FLAGS_XAH : GLOBAL_FLAGS_XRP
  const activeFlags = []

  // Check each flag in the specification.flags object
  Object.entries(flags).forEach(([flagName, isActive]) => {
    if (isActive === true) {
      activeFlags.push({
        name: flagName,
        description: globalFlags[flagName] || ''
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
              <span className="flag">{flag.name} </span>
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

export const TransactionBatch = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification } = data

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
      {specification?.transactions?.map((transaction, index) => (
        <React.Fragment key={transaction.id || index}>
          <tr>
            <TData className="bold">
                Transaction {index + 1}
            </TData>
          </tr>
          
          <tr>
            <TData style={{ paddingLeft: '30px' }}>ID</TData>
            <TData>
              {addressUsernameOrServiceLink(transaction, 'id', { short: true })}
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>Type</TData>
            <TData>
              <span className="bold">{transaction?.type}</span>
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>Subject</TData>
            <TData>
              <AddressWithIconFilled data={transaction.specification} name="subject" />
            </TData>
          </tr>
          <tr>
            <TData style={{ paddingLeft: '30px' }}>Sequence</TData>
            <TData>
              #{transaction?.sequence}
            </TData>
          </tr>
          {transaction.specification?.flags && (
            <tr>
              <TData style={{ paddingLeft: '30px' }}>Flags</TData>
              <TData>
                <TransactionFlags flags={transaction.specification.flags} txType={transaction.type} />
              </TData>
            </tr>
          )}
        </React.Fragment>
      ))}
    </TransactionCard>
  )
}

