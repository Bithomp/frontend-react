import axios from 'axios'

import { buildPrevMapBySourceTag, DAPPS_META } from './dapps'
import { nativeCurrency, devNet, xahauNetwork, showXahauNewAmendment } from './index'
import { dappBySourceTag } from './transaction'

export const emptyHomeTeasers = {
  dapps: [],
  tokens: [],
  nftCollections: [],
  amms: [],
  validators: [],
  amendments: []
}

function extractArray(response, fallback = []) {
  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
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

    for (const key in response.data) {
      if (Array.isArray(response.data[key])) {
        return response.data[key]
      }
    }
  }

  return fallback
}

export const fetchTeaserDappsClient = async (selectedCurrency = 'usd') => {
  try {
    const response = await axios(
      'v2/dapps?convertCurrencies=' + selectedCurrency + '&previousPeriod=true',
      { timeout: 5000 }
    )

    const list = extractArray(response)
    const prevMap = buildPrevMapBySourceTag(response?.data?.previousPeriod?.dapps)
    const excludeSourceTags = [0, 222, 777, 4004, 555002, 604802567, 446588767]
    const metaObj = DAPPS_META[0] || {}

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
      const hasWallets = Array.isArray(entry?.wallets) && entry.wallets.length > 0
      const hasWalletConnect = Array.isArray(entry?.walletconnect) && entry.walletconnect.length > 0
      return hasWallets || hasWalletConnect
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
    return []
  }
}

export const fetchTeaserTokensClient = async (selectedCurrency = 'usd') => {
  try {
    const response = await axios(
      'v2/trustlines/tokens?limit=5&order=rating&statistics=true&convertCurrencies=' + selectedCurrency,
      { timeout: 5000 }
    )
    return extractArray(response)
  } catch (error) {
    return []
  }
}

export const fetchTeaserNftCollectionsClient = async (selectedCurrency = 'usd') => {
  try {
    const response = await axios(
      'v2/nft-volumes-extended?list=collections&period=week&limit=5&order=rating&convertCurrencies=' +
        selectedCurrency,
      { timeout: 5000 }
    )
    return extractArray(response)
  } catch (error) {
    return []
  }
}

export const fetchTeaserAmmsClient = async () => {
  try {
    const response = await axios(
      'v2/amms?limit=5&order=currencyHigh&voteSlots=false&auctionSlot=false&holders=true&currency=' + nativeCurrency,
      { timeout: 5000 }
    )
    return extractArray(response).slice(0, 5)
  } catch (error) {
    return []
  }
}

export const fetchTeaserValidatorsClient = async () => {
  try {
    const [unlRes, validatorsRes] = await Promise.all([
      axios('v2/unl', { timeout: 5000 }),
      axios('v2/validators', { timeout: 5000 })
    ])

    let list = (unlRes?.data?.validators || []).map((validator) => ({ ...validator, unl: true }))
    const validatorsRaw = validatorsRes?.data
    const validatorsData = Array.isArray(validatorsRaw)
      ? validatorsRaw
      : Array.isArray(validatorsRaw?.validators)
        ? validatorsRaw.validators
        : []

    for (const validator of validatorsData) {
      const idx = list.findIndex((item) => item.publicKey === validator.publicKey)
      if (idx !== -1) {
        list[idx] = {
          ...validator,
          unl: true,
          domainLegacy: list[idx].domainLegacy ?? null,
          sequence: list[idx].sequence ?? null
        }
      }
    }

    return list
      .filter((validator) => !validator.nUnl && (devNet || validator.principals?.some((p) => p.twitter || p.x)))
      .sort((a, b) => {
        const nameA = a.principals?.[0]?.name || ''
        const nameB = b.principals?.[0]?.name || ''
        if (nameA && !nameB) return -1
        if (!nameA && nameB) return 1
        return nameA.toLowerCase() > nameB.toLowerCase() ? 1 : nameA.toLowerCase() < nameB.toLowerCase() ? -1 : 0
      })
      .slice(0, 5)
  } catch (error) {
    return []
  }
}

export const fetchTeaserAmendmentsClient = async () => {
  try {
    const [amendRes, featuresRes] = await Promise.all([
      axios('v2/amendment', { timeout: 5000 }),
      axios('v2/features', { timeout: 5000 })
    ])

    const data = Array.isArray(amendRes?.data) ? amendRes.data : []
    const features = featuresRes?.data?.result?.features || {}
    const voting = new Set(
      Object.keys(features).filter((key) => !features[key].enabled && features[key].vetoed !== 'Obsolete')
    )

    const parseVersion = (version) => {
      const parts = String(version || '').match(/\d+/g)
      return parts ? parts.map((x) => Number(x) || 0) : [0]
    }

    const compareVersionDesc = (a, b) => {
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

    const newAmendments = data
      .filter((amendment) => !amendment.enabled && !amendment.majority)
      .map((amendment) => ({
        ...amendment,
        teaserStatus: 'voting',
        name: features[amendment.amendment]?.name ?? amendment.name ?? null,
        vetoed: features[amendment.amendment]?.vetoed ?? amendment.vetoed ?? null,
        count: features[amendment.amendment]?.count ?? null,
        threshold: features[amendment.amendment]?.threshold ?? null
      }))
      .filter((amendment) => voting.has(amendment.amendment))
      .filter((amendment) => showXahauNewAmendment(amendment, xahauNetwork))
      .sort((a, b) => compareVersionDesc(a, b) || (b.count ?? 0) - (a.count ?? 0))

    const maxRows = 8
    if (newAmendments.length >= maxRows) {
      return newAmendments.slice(0, maxRows)
    }

    const enabledAmendments = data
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

    return [...newAmendments, ...enabledAmendments.slice(0, maxRows - newAmendments.length)]
  } catch (error) {
    return []
  }
}

export const fetchHomeTeasersClient = async (selectedCurrency = 'usd') => {
  const [dapps, tokens, nftCollections, amms, validators, amendments] = await Promise.all([
    xahauNetwork ? [] : fetchTeaserDappsClient(selectedCurrency),
    fetchTeaserTokensClient(selectedCurrency),
    xahauNetwork ? [] : fetchTeaserNftCollectionsClient(selectedCurrency),
    xahauNetwork ? [] : fetchTeaserAmmsClient(),
    fetchTeaserValidatorsClient(),
    fetchTeaserAmendmentsClient()
  ])

  return {
    dapps,
    tokens,
    nftCollections,
    amms,
    validators,
    amendments
  }
}
