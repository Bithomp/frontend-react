import axios from 'axios'

export const mptIssuanceId = (token) =>
  token?.mptokenIssuanceID || token?.MPTokenIssuanceID || token?.mpt_issuance_id

const tokenKey = (token) =>
  mptIssuanceId(token) || token?.token || `${token?.issuer || ''}:${token?.currency || ''}`

export const acceptedTokensForAddress = async ({
  destination,
  sender,
  canLock = false,
  stopWhen
}) => {
  const tokens = []
  const tokenKeys = new Set()
  const markers = new Set()
  let marker = ''

  do {
    const params = new URLSearchParams()
    if (sender) params.set('sender', sender)
    if (canLock) params.set('canLock', 'true')
    if (marker) params.set('marker', marker)

    const response = await axios(
      `v3/address/${encodeURIComponent(destination)}/acceptedTokens?${params.toString()}`
    )
    const pageTokens = response?.data?.tokens || []

    for (const token of pageTokens) {
      const key = tokenKey(token)
      if (!tokenKeys.has(key)) {
        tokens.push(token)
        tokenKeys.add(key)
      }
    }

    const match = stopWhen ? tokens.find(stopWhen) : null
    if (match) return { tokens, match }

    const nextMarker = response?.data?.marker
    if (!nextMarker || markers.has(nextMarker)) break
    markers.add(nextMarker)
    marker = nextMarker
  } while (marker)

  return {
    tokens,
    match: stopWhen ? tokens.find(stopWhen) || null : null
  }
}
