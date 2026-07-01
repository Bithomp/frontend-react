import { showXahauNewAmendment, xahauNetwork } from './index'

export const amendmentDetailsUrl = (amendmentName, isXahauNetwork = xahauNetwork) => {
  const anchor = String(amendmentName || '').trim().toLowerCase()
  const baseUrl = isXahauNetwork
    ? 'https://xahau.network/docs/features/amendments/'
    : 'https://xrpl.org/resources/known-amendments'

  return `${baseUrl}#${encodeURIComponent(anchor)}`
}

export const votingFeatureKeys = (features = {}) =>
  Object.keys(features).filter((key) => !features[key]?.enabled && features[key]?.vetoed !== 'Obsolete')

export const mergeVotingAmendments = (disabled = [], features = {}, isXahauNetwork = false, knownAmendments = disabled) => {
  const voting = new Set(votingFeatureKeys(features))

  const newAmendments = disabled
    .map((amendment) => ({
      ...amendment,
      name: features[amendment.amendment]?.name ?? amendment.name ?? null,
      vetoed: features[amendment.amendment]?.vetoed ?? amendment.vetoed ?? null,
      count: features[amendment.amendment]?.count ?? amendment.count ?? null,
      threshold: features[amendment.amendment]?.threshold ?? amendment.threshold ?? null,
      validations: features[amendment.amendment]?.validations ?? amendment.validations ?? null
    }))
    .filter((amendment) => voting.has(amendment.amendment))

  if (isXahauNetwork) {
    const knownAmendmentHashes = new Set(knownAmendments.map((amendment) => amendment.amendment))

    voting.forEach((amendmentHash) => {
      if (knownAmendmentHashes.has(amendmentHash)) return

      const feature = features[amendmentHash]
      newAmendments.push({
        amendment: amendmentHash,
        name: feature?.name ?? null,
        enabled: false,
        vetoed: feature?.vetoed ?? null,
        count: feature?.count ?? 0,
        threshold: feature?.threshold ?? null,
        validations: feature?.validations ?? null,
        supported: feature?.supported ?? null,
        featureOnly: true
      })
    })
  }

  return newAmendments.filter((amendment) => showXahauNewAmendment(amendment, isXahauNetwork))
}

const withFeatureDetails = (amendment, features = {}) => ({
  ...amendment,
  name: features[amendment.amendment]?.name ?? amendment.name ?? null,
  vetoed: features[amendment.amendment]?.vetoed ?? amendment.vetoed ?? null,
  count: features[amendment.amendment]?.count ?? amendment.count ?? null,
  threshold: features[amendment.amendment]?.threshold ?? amendment.threshold ?? null,
  validations: features[amendment.amendment]?.validations ?? amendment.validations ?? null
})

export const compareAmendmentVersionDesc = (a, b) => {
  const parseVersion = (version) => {
    const parts = String(version || '').match(/\d+/g)
    return parts ? parts.map((x) => Number(x) || 0) : [0]
  }

  const va = parseVersion(a?.introduced)
  const vb = parseVersion(b?.introduced)
  const maxLen = Math.max(va.length, vb.length)
  for (let i = 0; i < maxLen; i++) {
    const da = va[i] || 0
    const db = vb[i] || 0
    if (da !== db) return db - da
  }
  return 0
}

export const buildTeaserAmendments = (data = [], features = {}, isXahauNetwork = false, maxRows = 8) => {
  const amendments = Array.isArray(data) ? data : []
  const disabled = amendments.filter((amendment) => !amendment.enabled && !amendment.majority)

  const majorityAmendments = amendments
    .filter((amendment) => !amendment.enabled && amendment.majority)
    .map((amendment) => ({
      ...withFeatureDetails(amendment, features),
      teaserStatus: 'majority'
    }))
    .filter((amendment) => showXahauNewAmendment(amendment, isXahauNetwork))
    .sort((a, b) => {
      const aMajority = Number(a.majority || 0)
      const bMajority = Number(b.majority || 0)
      if (aMajority !== bMajority) return aMajority - bMajority
      return compareAmendmentVersionDesc(a, b) || (b.count ?? 0) - (a.count ?? 0)
    })

  const newAmendments = mergeVotingAmendments(disabled, features, isXahauNetwork, amendments)
    .map((amendment) => ({
      ...amendment,
      teaserStatus: 'voting'
    }))
    .sort((a, b) => compareAmendmentVersionDesc(a, b) || (b.count ?? 0) - (a.count ?? 0))

  const activeAmendments = [...majorityAmendments, ...newAmendments]
  if (activeAmendments.length >= maxRows) {
    return activeAmendments.slice(0, maxRows)
  }

  const enabledAmendments = amendments
    .filter((amendment) => !!amendment.enabled)
    .map((amendment) => ({ ...amendment, teaserStatus: 'enabled' }))
    .sort((a, b) => {
      const aTime = Number(a.enabledAt || 0)
      const bTime = Number(b.enabledAt || 0)
      if (bTime !== aTime) return bTime - aTime
      const aLedger = Number(a.enabledLedgerIndex || 0)
      const bLedger = Number(b.enabledLedgerIndex || 0)
      return bLedger - aLedger
    })

  return [...activeAmendments, ...enabledAmendments.slice(0, maxRows - activeAmendments.length)]
}
