// utils/txTypeBuckets.js

// Map XRPL tx types to base buckets
const BUCKET_RULES = {
  payments: ['Payment'],
  trustlines: ['TrustSet'],
  dex: ['OfferCreate', 'OfferCancel'],
  amm: ['AMMCreate', 'AMMDeposit', 'AMMWithdraw', 'AMMBid', 'AMMVote'],
  nft: [
    'NFTokenMint',
    'NFTokenBurn',
    'NFTokenCreateOffer',
    'NFTokenAcceptOffer',
    'NFTokenCancelOffer',
    'NFTokenModify'
  ],
  mptoken: ['MPTokenAuthorize', 'MPTokenIssuanceCreate', 'MPTokenIssuanceDestroy', 'MPTokenIssuanceSet'],
  checks: ['CheckCreate', 'CheckCash', 'CheckCancel'],
  escrow: ['EscrowCreate', 'EscrowFinish', 'EscrowCancel'],
  account: ['AccountSet', 'AccountDelete']
}

const startsWithAny = (value, prefixes) => prefixes.some((p) => value.startsWith(p))

const pickBaseBucket = (type) => {
  for (const [bucket, list] of Object.entries(BUCKET_RULES)) {
    if (list.includes(type)) return bucket
  }

  // Heuristics for unknown/new types
  if (type.startsWith('NFToken')) return 'nft'
  if (type.startsWith('AMM')) return 'amm'
  if (type.startsWith('MPToken')) return 'mptoken'
  if (startsWithAny(type, ['Check'])) return 'checks'
  if (startsWithAny(type, ['Escrow'])) return 'escrow'

  return 'other'
}

// UI groups (summary categories)
// Requirement: "Payments" includes payments + checks + escrow
export const GROUPS = [
  { key: 'payments', label: 'Payments', baseBuckets: ['payments', 'checks', 'escrow'] },
  { key: 'trustlines', label: 'Trustlines', baseBuckets: ['trustlines'] },
  { key: 'nft', label: 'NFT', baseBuckets: ['nft'] },
  { key: 'amm', label: 'AMM', baseBuckets: ['amm'] },
  { key: 'dex', label: 'DEX', baseBuckets: ['dex'] },
  { key: 'account', label: 'Account', baseBuckets: ['account'] },
  { key: 'mptoken', label: 'MPToken', baseBuckets: ['mptoken'] },
  { key: 'other', label: 'Other', baseBuckets: ['other'] }
]

/**
 * Build model for:
 * - Collapsed: one 100% stacked bar split by GROUPS.
 * - Expanded: each GROUP gets its own 100% bar split by tx types.
 *
 * @param {Record<string, number>} transactionTypes
 * @returns {{
 *   total: number,
 *   groups: Array<{
 *     key: string,
 *     label: string,
 *     total: number,
 *     pctOfAll: number,
 *     // list of tx types within group, sorted by count desc:
 *     types: Array<{ type: string, count: number }>
 *   }>,
 *   topGroups: Array<{ key: string, label: string, total: number, pctOfAll: number }>
 * }}
 */
export function buildTxGroupsModel(transactionTypes) {
  const typesObj = transactionTypes && typeof transactionTypes === 'object' ? transactionTypes : {}

  // Prepare base bucket -> list of types
  const baseBucketTypes = {}
  let total = 0

  const entries = Object.entries(typesObj)
    .map(([type, count]) => ({ type: String(type), count: Number(count) || 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)

  for (const { type, count } of entries) {
    const b = pickBaseBucket(type)
    if (!baseBucketTypes[b]) baseBucketTypes[b] = []
    baseBucketTypes[b].push({ type, count })
    total += count
  }

  // Build groups
  const groups = GROUPS.map((g) => {
    const mergedTypes = []
    let groupTotal = 0

    for (const b of g.baseBuckets) {
      const list = baseBucketTypes[b] || []
      for (const item of list) {
        mergedTypes.push(item)
        groupTotal += item.count
      }
    }

    // Sort by count desc
    mergedTypes.sort((a, b) => b.count - a.count)

    return {
      key: g.key,
      label: g.label,
      total: groupTotal,
      pctOfAll: total > 0 ? (groupTotal / total) * 100 : 0,
      types: mergedTypes
    }
  }).filter((x) => x.total > 0)

  const topGroups = [...groups]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(({ key, label, total, pctOfAll }) => ({ key, label, total, pctOfAll }))

  return { total, groups, topGroups }
}
