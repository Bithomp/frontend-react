export const collectMptIssuanceIds = (data) => {
  const ids = new Set()
  const addId = (value) => {
    if (typeof value === 'string' && value) ids.add(value)
  }

  addId(data?.specification?.mptIssuanceID)
  addId(data?.tx?.MPTokenIssuanceID)
  addId(data?.meta?.mpt_issuance_id)
  addId(data?.meta?.MPTokenIssuanceID)
  addId(data?.outcome?.mpt_issuance_id)
  addId(data?.outcome?.mptIssuanceID)
  Object.keys(data?.outcome?.mptokenChanges || {}).forEach(addId)

  return Array.from(ids)
}
