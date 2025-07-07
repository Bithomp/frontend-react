import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled } from '../../utils/format'

const formatAMMFlags = (flags) => {
  if (!flags || typeof flags !== 'object') return 'None'
  
  const flagDescriptions = {
    lpToken: 'LP Token',
    singleAsset: 'Single Asset',
    twoAsset: 'Two Asset',
    oneAssetLPToken: 'One Asset LP Token',
    limitLPToken: 'Limit LP Token',
    twoAssetIfEmpty: 'Two Asset If Empty',
    withdrawAll: 'Withdraw All',
    oneAssetWithdrawAll: 'One Asset Withdraw All'
  }  

  const activeFlag = Object.entries(flags).find(([, value]) => value === true)
  
  if (activeFlag) {
    const [key] = activeFlag
    return flagDescriptions[key] || key
  }
  
  return 'None'
}

export const TransactionAMM = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx } = data
  const txType = tx.TransactionType
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
          <TData>{formatAMMFlags(specification.flags)}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
