/**
 * Server-side data fetching helpers for homepage teaser widgets.
 * These functions fetch limited top-N data for the homepage discovery grid.
 */

import { axiosServer, passHeaders } from './axios'
import { dappBySourceTag } from './transaction'
import { buildPrevMapBySourceTag, DAPPS_META } from './dapps'
import { nativeCurrency, devNet, xahauNetwork } from './index'
import { buildTeaserAmendments } from './amendments'

/**
 * Helper function to ensure we always get an array from API response
 * Handles different response structures: direct array, nested in .data, or wrapped object
 */
function extractArray(response, fallback = []) {
  // If response.data is already an array, use it
  if (Array.isArray(response?.data)) {
    return response.data
  }
  // If response.data is an object, look for array properties
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    // Check for common array property names first
    const commonNames = [
      'data',
      'results',
      'items',
      'tokens',
      'dapps',
      'validators',
      'amendments',
      'collections',
      'amms'
    ]
    for (const name of commonNames) {
      if (Array.isArray(response.data[name])) {
        return response.data[name]
      }
    }
    // If no common name found, search for any array property
    for (const key in response.data) {
      if (Array.isArray(response.data[key])) {
        return response.data[key]
      }
    }
  }
  return fallback
}

const mergeNativeTokenOnTop = (tokens, nativeToken) => {
  const list = Array.isArray(tokens) ? tokens : []
  const filtered = list.filter((token) => !(token?.currency === nativeCurrency && !token?.issuer))
  return nativeToken ? [nativeToken, ...filtered].slice(0, 5) : filtered.slice(0, 5)
}

/**
 * Fetch top dapps using /dapps filtering, but rank teaser rows by 24h volume.
 */
export const fetchTeaserDapps = async (req, selectedCurrency = 'usd') => {
  try {
    const response = await axiosServer({
      method: 'get',
      url: 'v2/dapps?convertCurrencies=' + selectedCurrency + '&previousPeriod=true',
      headers: passHeaders(req),
      timeout: 5000
    })

    const list = extractArray(response)
    const prevMap = buildPrevMapBySourceTag(response?.data?.previousPeriod?.dapps)
    const excludeSourceTags = [0, 222, 777, 4004, 555002, 604802567, 446588767]
    const metaObj = DAPPS_META[0] || {}

    const hasAnyExternalSigning = (entry) => {
      const hasWallets = Array.isArray(entry?.wallets) && entry.wallets.length > 0
      const hasWalletConnect = Array.isArray(entry?.walletconnect) && entry.walletconnect.length > 0
      return hasWallets || hasWalletConnect
    }

    const filtered = list.filter((dapp) => {
      const sourceTag = Number(dapp?.sourceTag)
      if (sourceTag < 100 || excludeSourceTags.includes(sourceTag)) {
        return false
      }

      const hasName = dappBySourceTag(dapp?.sourceTag)
      if (!hasName && Number(dapp?.uniqueSourceAddresses) <= 3) {
        return false
      }

      const entry = metaObj[String(dapp?.sourceTag)]
      return hasAnyExternalSigning(entry)
    })

    const volumeCurrency = String(selectedCurrency || 'usd').toLowerCase()

    return filtered
      .map((dapp) => ({
        ...dapp,
        prevUniqueSourceAddresses: prevMap?.get(String(dapp?.sourceTag))?.uniqueSourceAddresses || null,
        currentVolume: Number(dapp?.totalSentInFiats?.[volumeCurrency] ?? 0),
        prevVolume: Number(prevMap?.get(String(dapp?.sourceTag))?.totalSentInFiats?.[volumeCurrency] ?? 0),
        volumeCurrency
      }))
      .sort((a, b) => Number(b?.currentVolume ?? 0) - Number(a?.currentVolume ?? 0))
      .slice(0, 5)
  } catch (error) {
    console.error('Error fetching teaser dapps:', error.message)
    return []
  }
}

/**
 * Fetch top 5 tokens using the same default ranking as the tokens page.
 */
export const fetchTeaserTokens = async (req, selectedCurrency = 'usd') => {
  try {
    const headers = passHeaders(req)
    const [tokensResult, nativeResult] = await Promise.allSettled([
      axiosServer({
        method: 'get',
        url: 'v2/trustlines/tokens?limit=5&order=rating&statistics=true&convertCurrencies=' + selectedCurrency,
        headers,
        timeout: 5000
      }),
      axiosServer({
        method: 'get',
        url: `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${selectedCurrency}`,
        headers,
        timeout: 5000
      })
    ])

    if (tokensResult.status === 'rejected') {
      return []
    }

    const nativeToken =
      nativeResult.status === 'fulfilled' && nativeResult.value?.data && !nativeResult.value.data?.error
        ? nativeResult.value.data
        : null

    return mergeNativeTokenOnTop(extractArray(tokensResult.value), nativeToken)
  } catch (error) {
    console.error('Error fetching teaser tokens:', error.message)
    return []
  }
}

/**
 * Fetch top 5 NFT collections by weekly volume
 */
export const fetchTeaserNftCollections = async (req, selectedCurrency = 'usd') => {
  try {
    const response = await axiosServer({
      method: 'get',
      url:
        'v2/nft-volumes-extended?list=collections&period=week&limit=5&order=rating&convertCurrencies=' +
        selectedCurrency,
      headers: passHeaders(req),
      timeout: 5000
    })
    return extractArray(response)
  } catch (error) {
    console.error('Error fetching teaser nft collections:', error.message)
    return []
  }
}

/**
 * Fetch top 5 AMM pools using the same response shape as the /amms page.
 */
export const fetchTeaserAmms = async (req) => {
  try {
    const response = await axiosServer({
      method: 'get',
      url:
        'v2/amms?limit=5&order=currencyHigh&voteSlots=false&auctionSlot=false&holders=true&currency=' + nativeCurrency,
      headers: passHeaders(req),
      timeout: 5000
    })
    return extractArray(response).slice(0, 5)
  } catch (error) {
    console.error('Error fetching teaser amms:', error.message)
    return []
  }
}

/**
 * Fetch top 6 validators from UNL with verified domain, sorted alphabetically by name.
 */

export const fetchTeaserValidators = async (req) => {
  try {
    const [unlRes, validatorsRes] = await Promise.all([
      axiosServer({ method: 'get', url: 'v2/unl', headers: passHeaders(req), timeout: 5000 }),
      axiosServer({ method: 'get', url: 'v2/validators', headers: passHeaders(req), timeout: 5000 })
    ])

    // Start with UNL list, mark each as unl:true
    let list = (unlRes?.data?.validators || []).map((v) => ({ ...v, unl: true }))

    // Merge v2/validators data (brings in principals, domainVerified, etc.)
    const validatorsRaw = validatorsRes?.data
    const validatorsData = Array.isArray(validatorsRaw)
      ? validatorsRaw
      : Array.isArray(validatorsRaw?.validators)
        ? validatorsRaw.validators
        : []
    for (const v of validatorsData) {
      const idx = list.findIndex((x) => x.publicKey === v.publicKey)
      if (idx !== -1) {
        list[idx] = {
          ...v,
          unl: true,
          domainLegacy: list[idx].domainLegacy ?? null,
          sequence: list[idx].sequence ?? null
        }
      }
    }

    const sorted = list
      .filter((v) => !v.nUnl && (devNet || v.principals?.some((p) => p.twitter || p.x)))
      .sort((a, b) => {
        const nameA = a.principals?.[0]?.name || ''
        const nameB = b.principals?.[0]?.name || ''
        if (nameA && !nameB) return -1
        if (!nameA && nameB) return 1
        return nameA.toLowerCase() > nameB.toLowerCase() ? 1 : nameA.toLowerCase() < nameB.toLowerCase() ? -1 : 0
      })

    return sorted.slice(0, 5)
  } catch (error) {
    console.error('Error fetching teaser validators:', error.message)
    return []
  }
}

/**
 * Fetch latest amendments with voting info
 */
export const fetchTeaserAmendments = async (req) => {
  try {
    const [amendRes, featuresRes] = await Promise.all([
      axiosServer({ method: 'get', url: 'v2/amendments', headers: passHeaders(req), timeout: 5000 }),
      axiosServer({ method: 'get', url: 'v2/features', headers: passHeaders(req), timeout: 5000 })
    ])

    const data = Array.isArray(amendRes?.data) ? amendRes.data : []
    const features = featuresRes?.data?.result?.features || {}

    return buildTeaserAmendments(data, features, xahauNetwork)
  } catch (error) {
    console.error('Error fetching teaser amendments:', error.message)
    return []
  }
}
