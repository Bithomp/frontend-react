import Link from 'next/link'

import { TData } from '../Table'
import { TransactionCard } from './TransactionCard'
import CopyButton from '../UI/CopyButton'
import { AddressWithIconFilled, CurrencyWithIcon, shortHash } from '../../utils/format'

const collectMptIssuanceIds = (data) => {
  const ids = new Set()

  const addId = (value) => {
    if (value && typeof value === 'string') {
      ids.add(value)
    }
  }

  addId(data?.specification?.mptIssuanceID)
  Object.keys(data?.outcome?.mptokenChanges || {}).forEach(addId)

  return Array.from(ids)
}

const getMpTokenActionLabel = (txType, flags) => {
  if (txType === 'MPTokenAuthorize') {
    return flags?.unauthorize ? 'Unauthorize MPT' : 'Authorize MPT'
  }
  if (txType === 'MPTokenIssuanceCreate') {
    return 'Create MPT issuance'
  }
  if (txType === 'MPTokenIssuanceDestroy') {
    return 'Destroy MPT issuance'
  }
  if (txType === 'MPTokenIssuanceSet') {
    return 'Update MPT issuance'
  }
  return txType || 'MPToken transaction'
}

const MptList = ({ mptIssuanceIds, mptokensDetails }) => {
  if (!mptIssuanceIds?.length) return <span className="orange">No MPT issuance ID found in transaction payload.</span>

  return (
    <div>
      {mptIssuanceIds.map((mptIssuanceId) => {
        const token = mptokensDetails?.[mptIssuanceId]

        return (
          <div key={mptIssuanceId} className="mpt-item">
            <div className="mpt-main">
              {token ? (
                <CurrencyWithIcon token={token} />
              ) : (
                <span className="bold">
                  <Link href={`/token/${mptIssuanceId}`}>{shortHash(mptIssuanceId, 10)}</Link>
                </span>
              )}
            </div>
            <div className="mpt-meta">
              <span>MPT ID: {shortHash(mptIssuanceId, 10)}</span> <CopyButton text={mptIssuanceId} />
            </div>
          </div>
        )
      })}
      <style jsx>{`
        .mpt-item + .mpt-item {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--background-muted);
        }

        .mpt-main {
          margin-bottom: 4px;
        }

        .mpt-meta {
          color: var(--text-muted);
          word-break: break-all;
        }
      `}</style>
    </div>
  )
}

export const TransactionMPToken = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null

  const { specification, tx, mptokensDetails } = data
  const mptIssuanceIds = collectMptIssuanceIds(data)
  const actionLabel = getMpTokenActionLabel(tx?.TransactionType, specification?.flags)

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification?.source} name="address" />
        </TData>
      </tr>
      <tr>
        <TData>Action</TData>
        <TData className="bold">{actionLabel}</TData>
      </tr>
      <tr>
        <TData>{mptIssuanceIds.length > 1 ? 'MPTs' : 'MPT'}</TData>
        <TData>
          <MptList mptIssuanceIds={mptIssuanceIds} mptokensDetails={mptokensDetails} />
        </TData>
      </tr>
    </TransactionCard>
  )
}
