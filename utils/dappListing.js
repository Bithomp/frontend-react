import { DAPPS_META, generatedAgentNameBySourceTag } from './dapps'
import { dappBySourceTag } from './transaction'

export const DAPP_ORDER_VALUES = ['performingHigh', 'totalSentHigh', 'interactingHigh', 'txHigh', 'successRateHigh']
export const DEFAULT_DAPP_ORDER = 'performingHigh'

const excludedSourceTags = new Set([0, 222, 777, 4004, 555002, 604802567, 446588767])

const successRate = (entry) => {
  const total = Number(entry?.totalTransactions)
  const successful = Number(entry?.successTransactions)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(successful) || successful < 0) return 0
  return (successful / total) * 100
}

const hasExternalSigning = (entry) =>
  (Array.isArray(entry?.wallets) && entry.wallets.length > 0) ||
  (Array.isArray(entry?.walletconnect) && entry.walletconnect.length > 0)

const walletsForEntry = (entry) =>
  [
    ...(Array.isArray(entry?.wallets) ? entry.wallets : []),
    ...(Array.isArray(entry?.walletconnect) ? entry.walletconnect : [])
  ].map((wallet) => String(wallet).toLowerCase())

export const filterDappsForListing = (
  list,
  { includeAppsWithoutExternalSigning = false, wallet = '' } = {}
) => {
  const meta = DAPPS_META[0] || {}
  const walletFilter = String(wallet).toLowerCase()

  return (Array.isArray(list) ? list : []).filter((dapp) => {
    const sourceTag = Number(dapp?.sourceTag)
    if (sourceTag < 100 || excludedSourceTags.has(sourceTag)) return false

    const metadata = meta[String(dapp?.sourceTag)]
    const hasName =
      dappBySourceTag(dapp?.sourceTag) || metadata?.name || generatedAgentNameBySourceTag(dapp?.sourceTag)
    if (!hasName && Number(dapp?.uniqueSourceAddresses) <= 3) return false
    if (!includeAppsWithoutExternalSigning && !hasExternalSigning(metadata)) return false
    if (walletFilter && !walletsForEntry(metadata).includes(walletFilter)) return false

    return true
  })
}

export const sortDapps = (list, order) => {
  const dapps = Array.isArray(list) ? [...list] : []

  switch (order) {
    case 'performingHigh':
      return dapps.sort(
        (a, b) =>
          Number(b?.uniqueSourceAddresses ?? 0) - Number(a?.uniqueSourceAddresses ?? 0) ||
          Number(b?.uniqueInteractedAddresses ?? 0) - Number(a?.uniqueInteractedAddresses ?? 0) ||
          Number(b?.totalTransactions ?? 0) - Number(a?.totalTransactions ?? 0)
      )
    case 'totalSentHigh':
      return dapps.sort((a, b) => Number(b?.totalSent ?? 0) - Number(a?.totalSent ?? 0))
    case 'interactingHigh':
      return dapps.sort(
        (a, b) => Number(b?.uniqueInteractedAddresses ?? 0) - Number(a?.uniqueInteractedAddresses ?? 0)
      )
    case 'txHigh':
      return dapps.sort((a, b) => Number(b?.totalTransactions ?? 0) - Number(a?.totalTransactions ?? 0))
    case 'successRateHigh':
      return dapps.sort((a, b) => successRate(b) - successRate(a))
    default:
      return dapps
  }
}
