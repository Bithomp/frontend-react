import { AddressWithIconFilled } from '../../utils/format'
import { TData } from '../Table'
import CopyButton from '../UI/CopyButton'

import { TransactionCard } from './TransactionCard'

export const TransactionSetHook = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { tx, meta } = data

  const createdHookHash = (() => {
    const nodes = meta?.AffectedNodes || []

    for (const node of nodes) {
      const created = node.CreatedNode
      const newFields = created?.NewFields

      if (newFields?.HookHash) return newFields.HookHash
    }

    return null
  })()

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={{ address: tx.Account }} />
        </TData>
      </tr>
      {createdHookHash && (
        <tr>
          <TData>Hook hash (created)</TData>
          <TData>
            {createdHookHash} <CopyButton text={createdHookHash} />
          </TData>
        </tr>
      )}
    </TransactionCard>
  )
}
