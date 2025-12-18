export const bidTypeToName = (type) => {
  switch (type) {
    case 'bithomp_pro':
      return 'Bithomp Pro'
    case 'token':
      return 'API'
    case 'bot':
      return 'Bot'
    default:
      return type
  }
}

export const bidFullServiceName = (bid) => {
  if (!bid) return ''
  return (
    bidTypeToName(bid.type) +
    (bid.tier ? ' ' + bid.tier.toUpperCase() : '') +
    ' (' +
    bid.periodCount +
    ' ' +
    bid.period +
    (bid.periodCount > 1 ? 's' : '') +
    ')'
  )
}
