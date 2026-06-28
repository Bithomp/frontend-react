export const shortServerVersion = (version) => {
  if (!version) return version

  const normalized = String(version).replace(/^(rippled|xahaud|xrpld)-/, '')

  if (normalized.length > 26) {
    return normalized.substring(0, 12) + '...' + normalized.substring(normalized.length - 9)
  }

  return normalized
}
