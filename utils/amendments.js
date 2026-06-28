import { showXahauNewAmendment } from './index'

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
