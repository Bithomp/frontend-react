const DAY_MS = 24 * 60 * 60 * 1000

const timestampToMilliseconds = (timestamp) => {
  if (timestamp === null || timestamp === undefined || timestamp === '') return null

  if (typeof timestamp === 'number' || /^\d+(\.\d+)?$/.test(String(timestamp))) {
    const numericTimestamp = Number(timestamp)
    if (!Number.isFinite(numericTimestamp)) return null
    return numericTimestamp < 1e12 ? numericTimestamp * 1000 : numericTimestamp
  }

  const parsedTimestamp = new Date(timestamp).getTime()
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null
}

export const isRecentTimestamp = (timestamp, days, now = Date.now()) => {
  const timestampMs = timestampToMilliseconds(timestamp)
  const periodMs = Number(days) * DAY_MS

  if (timestampMs === null || !Number.isFinite(periodMs) || periodMs < 0) return false

  const ageMs = now - timestampMs
  return ageMs >= 0 && ageMs <= periodMs
}
