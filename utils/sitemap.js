import { nativeCurrency, network, server, xahauNetwork } from '.'
import { axiosServer, logServerSideError, passHeaders } from './axios'
import { dappsApiUrl } from './dapps'
import { DEFAULT_DAPP_ORDER, filterDappsForListing, sortDapps } from './dappListing'

const isPublicMainnet = network === 'mainnet' || network === 'xahau'

const pageEntries = [
  { loc: 'dapps', changefreq: 'daily', priority: '1' },
  { loc: 'explorer', changefreq: 'weekly', priority: '1' },
  { loc: '', changefreq: 'always', priority: '1' },
  { loc: 'faucet', changefreq: 'monthly', priority: '1' },
  { loc: 'username', changefreq: 'monthly', priority: '1' },
  { loc: 'nft-explorer', changefreq: 'daily', priority: '1' },
  { loc: 'amendments', changefreq: 'always', priority: '1' },
  { loc: 'validators', changefreq: 'always', priority: '1' },
  { loc: 'amms', changefreq: 'always', priority: '1' },
  { loc: 'whales', changefreq: 'always', priority: '1' },

  { loc: 'services', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/send', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/nft-mint', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/trustline', changefreq: 'monthly', priority: '1' },
  { loc: 'services/check', changefreq: 'monthly', priority: '0.8' },
  { loc: 'services/escrow', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/account-settings', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/account-control', changefreq: 'monthly', priority: '0.8' },
  { loc: 'services/token-issuer-settings', changefreq: 'monthly', priority: '0.8' },
  { loc: 'services/account-delete', changefreq: 'monthly', priority: '0.5' },
  { loc: 'services/toml-checker', changefreq: 'monthly', priority: '0.8' },
  { loc: 'services/toml-generator', changefreq: 'monthly', priority: '0.8' },

  { loc: 'whales/receivers', changefreq: 'always', priority: '0.9' },
  { loc: 'whales/senders', changefreq: 'always', priority: '0.9' },
  { loc: 'whales/submitters', changefreq: 'always', priority: '0.9' },
  { loc: 'nft-sales', changefreq: 'daily', priority: '0.9' },
  { loc: 'nft-statistics', changefreq: 'always', priority: '0.9' },
  { loc: 'nft-volumes', changefreq: 'always', priority: '0.9' },
  { loc: 'nft-minters', changefreq: 'always', priority: '0.9' },

  { loc: 'amm', changefreq: 'daily', priority: '0.7' },
  { loc: 'nfts', changefreq: 'daily', priority: '0.7' },
  { loc: 'nft', changefreq: 'daily', priority: '0.7' },
  { loc: 'nft-distribution', changefreq: 'daily', priority: '0.7' },
  { loc: 'nft-offer', changefreq: 'daily', priority: '0.7' },
  { loc: 'nft-offers', changefreq: 'daily', priority: '0.7' },
  { loc: 'ledger', changefreq: 'always', priority: '0.7' },
  { loc: 'donate', changefreq: 'daily', priority: '0.7' },
  { loc: 'alerts', changefreq: 'daily', priority: '0.7' },
  { loc: 'last-ledger-information', changefreq: 'always', priority: '0.7' },
  { loc: 'nodes', changefreq: 'always', priority: '0.7' },
  { loc: 'activations', changefreq: 'always', priority: '0.7' },
  { loc: 'domains', changefreq: 'always', priority: '0.7' },
  { loc: 'allocation', changefreq: 'always', priority: '0.8' },
  { loc: 'distribution', changefreq: 'always', priority: '0.7' },

  { loc: 'genesis', changefreq: 'weekly', priority: '0.6' },
  { loc: 'activation-tree', changefreq: 'weekly', priority: '0.6' },
  { loc: 'build-unl', changefreq: 'yearly', priority: '0.6' },
  { loc: 'advertise', changefreq: 'yearly', priority: '0.6' },
  { loc: 'eaas', changefreq: 'yearly', priority: '0.6' },

  { loc: 'submit-account-information', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/watchlist', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/referrals', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/pro', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/pro/history', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/api', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/api/requests', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/api/statistics', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/api/charts', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/notifications', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/notifications/slack-guide', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin/notifications/x-guide', changefreq: 'yearly', priority: '0.5' },

  { loc: 'object', changefreq: 'yearly', priority: '0.4' },
  { loc: 'about-us', changefreq: 'yearly', priority: '0.4' },
  { loc: 'customer-support', changefreq: 'yearly', priority: '0.4' },
  { loc: 'developer', changefreq: 'yearly', priority: '0.4' },
  { loc: 'explorer-advantages', changefreq: 'monthly', priority: '0.5' }
]

const learnEntries = []

if (xahauNetwork) {
  pageEntries.push(
    { loc: 'governance', changefreq: 'hourly', priority: '0.9' },
    { loc: 'unl-report', changefreq: 'always', priority: '0.5' },
    { loc: 'services/reward-auto-claim', changefreq: 'monthly', priority: '0.8' },
    { loc: 'xahau-wallets', changefreq: 'monthly', priority: '0.8' }
  )
  learnEntries.push({ loc: 'learn/claim-reward', changefreq: 'always', priority: '0.9' })
} else {
  pageEntries.push(
    { loc: 'services/issue-mpt', changefreq: 'monthly', priority: '0.9' },
    { loc: 'services/amm/deposit', changefreq: 'monthly', priority: '0.9' },
    { loc: 'services/amm/create', changefreq: 'monthly', priority: '0.8' },
    { loc: 'services/amm/withdraw', changefreq: 'monthly', priority: '0.9' },
    { loc: 'services/amm/vote', changefreq: 'monthly', priority: '0.7' },
    { loc: 'xrp-wallets', changefreq: 'monthly', priority: '0.8' }
  )
}

if (network === 'mainnet') {
  pageEntries.push(
    { loc: 'the-chain-of-blocks-summit', changefreq: 'monthly', priority: '1' },
    { loc: 'press', changefreq: 'yearly', priority: '0.4' }
  )

  if (!xahauNetwork) {
    learnEntries.push(
      { loc: 'learn/xrpl-article', changefreq: 'monthly', priority: '0.6' },
      { loc: 'learn/ripple-usd', changefreq: 'monthly', priority: '0.7' },
      { loc: 'learn/amm', changefreq: 'monthly', priority: '0.8' },
      { loc: 'learn/run-a-validator', changefreq: 'monthly', priority: '0.8' },
      { loc: 'learn/account-page', changefreq: 'monthly', priority: '0.5' }
    )
  }

  learnEntries.push(
    { loc: 'learn', changefreq: 'weekly', priority: '0.7' },
    { loc: 'learn/understanding-the-bithomp-explorer', changefreq: 'monthly', priority: '0.8' },
    { loc: 'learn/verified-domain', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/blackholed-address', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/blacklisted-address', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/the-bithomp-explorer-advantages', changefreq: 'monthly', priority: '0.8' },
    { loc: 'learn/nft-minting', changefreq: 'monthly', priority: '0.9' },
    { loc: 'learn/the-bithomp-api', changefreq: 'monthly', priority: '0.9' },
    { loc: 'learn/xrp-xah-taxes', changefreq: 'monthly', priority: '0.9' },
    { loc: 'learn/issue-a-token', changefreq: 'monthly', priority: '0.9' },
    { loc: 'learn/guide-for-token-issuers', changefreq: 'monthly', priority: '0.9' },
    { loc: 'learn/create-escrow', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/image-services', changefreq: 'monthly', priority: '0.6' },
    { loc: 'learn/trustlines', changefreq: 'monthly', priority: '0.6' },
    { loc: 'learn/nft-explorer', changefreq: 'monthly', priority: '0.7' },
    { loc: 'learn/paystrings', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/send-payments', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/types-of-assets', changefreq: 'monthly', priority: '0.5' },
    { loc: 'learn/checks', changefreq: 'monthly', priority: '0.5' }
  )
}

const absoluteUrl = (loc) => `${server}${loc ? `/${loc}` : ''}`

const sitemapEntry = (loc, changefreq = 'daily', priority = '0.8') => ({
  loc,
  changefreq,
  priority
})

const uniqueEntries = (entries) => {
  const seen = new Set()
  return entries.filter((entry) => {
    if (!entry?.loc || seen.has(entry.loc)) return false
    seen.add(entry.loc)
    return true
  })
}

const fetchSitemapData = async (url, req, label) => {
  try {
    const response = await axiosServer({
      method: 'get',
      url,
      headers: passHeaders(req)
    })
    return response?.data || null
  } catch (error) {
    logServerSideError(error, req, `sitemap-${label}`)
    throw error
  }
}

const getTokenEntries = async ({ req } = {}) => {
  const tokensUrl =
    'v2/trustlines/tokens?limit=100&order=rating&currencyDetails=true&statistics=true&convertCurrencies=usd'
  const nativeTokenUrl = `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=usd`
  const [tokensResult, nativeTokenResult] = await Promise.allSettled([
    fetchSitemapData(tokensUrl, req, 'tokens'),
    fetchSitemapData(nativeTokenUrl, req, 'native-token')
  ])
  if (tokensResult.status === 'rejected') throw tokensResult.reason

  const tokensData = tokensResult.value
  const nativeToken = nativeTokenResult.status === 'fulfilled' ? nativeTokenResult.value : null
  const tokens = Array.isArray(tokensData?.tokens) ? tokensData.tokens : []
  const rankedTokens = [
    ...(nativeToken && !nativeToken?.error ? [nativeToken] : []),
    ...tokens.filter((token) => token?.issuer || token?.currency !== nativeCurrency)
  ].slice(0, 100)

  return uniqueEntries(
    rankedTokens.map((token) => {
      if (!token?.currency) return null
      const path = token?.issuer
        ? `token/${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}`
        : `token/${encodeURIComponent(token.currency)}`
      return sitemapEntry(path)
    })
  )
}

const getMptEntries = async ({ req } = {}) => {
  const data = await fetchSitemapData('v2/mptokens?limit=100&order=holdersHigh', req, 'mpts')
  const issuances = Array.isArray(data?.issuances) ? data.issuances : []

  return uniqueEntries(
    issuances.slice(0, 100).map((issuance) => {
      const issuanceId =
        issuance?.mptokenIssuanceID ||
        issuance?.MPTokenIssuanceID ||
        issuance?.mptId ||
        issuance?.mpt_issuance_id
      return issuanceId ? sitemapEntry(`token/${encodeURIComponent(issuanceId)}`) : null
    })
  )
}

const getDappEntries = async ({ req } = {}) => {
  const data = await fetchSitemapData(dappsApiUrl('usd', 'day'), req, 'dapps')
  const dapps = filterDappsForListing(data?.dapps, {
    includeAppsWithoutExternalSigning: true
  })
  const rankedDapps = sortDapps(dapps, DEFAULT_DAPP_ORDER).slice(0, 100)

  return uniqueEntries(
    rankedDapps.map((dapp) =>
      dapp?.sourceTag === null || dapp?.sourceTag === undefined
        ? null
        : sitemapEntry(`dapp/${encodeURIComponent(dapp.sourceTag)}`)
    )
  )
}

const getAmmEntries = async ({ req } = {}) => {
  const url =
    'v2/amms?order=currencyHigh&limit=100&voteSlots=false&auctionSlot=false&holders=true' +
    `&priceNativeCurrencySpot=true&currency=${encodeURIComponent(nativeCurrency)}`
  const data = await fetchSitemapData(url, req, 'amms')
  const amms = Array.isArray(data?.amms) ? data.amms : []

  return uniqueEntries(
    amms
      .slice(0, 100)
      .map((amm) => (amm?.ammID ? sitemapEntry(`amm/${encodeURIComponent(amm.ammID)}`) : null))
  )
}

const getValidatorEntries = async ({ req } = {}) => {
  const data = await fetchSitemapData('v2/unl', req, 'validators')
  const validators = Array.isArray(data?.validators) ? data.validators : []

  return uniqueEntries(
    validators.map((validator) =>
      validator?.publicKey ? sitemapEntry(`validator/${encodeURIComponent(validator.publicKey)}`, 'weekly', '0.7') : null
    )
  )
}

const getNftCollectionEntries = async ({ req } = {}) => {
  if (xahauNetwork) {
    const url =
      'v2/uritoken-volumes-extended?list=issuers&convertCurrencies=usd&sortCurrency=usd' +
      '&floorPrice=true&statistics=true&period=month&saleType=all&limit=50'
    const data = await fetchSitemapData(url, req, 'uritoken-collections')
    const issuers = Array.isArray(data?.issuers) ? data.issuers : []

    return uniqueEntries(
      issuers
        .slice(0, 50)
        .map((issuer) =>
          issuer?.issuer ? sitemapEntry(`account/${encodeURIComponent(issuer.issuer)}`) : null
        )
    )
  }

  const url =
    'v2/nft-volumes-extended?list=collections&convertCurrencies=usd&order=rating' +
    '&floorPrice=true&statistics=true&period=month&saleType=all&limit=100'
  const data = await fetchSitemapData(url, req, 'nft-collections')
  const collections = Array.isArray(data?.collections) ? data.collections : []

  return uniqueEntries(
    collections
      .slice(0, 100)
      .map((collection) =>
        collection?.collection
          ? sitemapEntry(`nft-collection/${encodeURIComponent(collection.collection)}`)
          : null
      )
  )
}

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export const generateUrlSet = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${escapeXml(absoluteUrl(loc))}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

export const generateSitemapIndex = (sections) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sections
  .map(
    (section) => `  <sitemap>
    <loc>${escapeXml(absoluteUrl(`sitemaps/${section}.xml`))}</loc>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>
`

export const sitemapSections = {
  pages: {
    enabled: true,
    getEntries: () => pageEntries
  },
  learn: {
    enabled: learnEntries.length > 0,
    getEntries: () => learnEntries
  },
  tokens: {
    enabled: isPublicMainnet,
    getEntries: getTokenEntries
  },
  mpts: {
    enabled: network === 'mainnet' && !xahauNetwork,
    getEntries: getMptEntries
  },
  dapps: {
    enabled: isPublicMainnet,
    getEntries: getDappEntries
  },
  amms: {
    enabled: isPublicMainnet,
    getEntries: getAmmEntries
  },
  validators: {
    enabled: isPublicMainnet,
    getEntries: getValidatorEntries
  },
  'nft-collections': {
    enabled: isPublicMainnet,
    getEntries: getNftCollectionEntries
  }
}

export const sitemapSectionNames = Object.entries(sitemapSections)
  .filter(([, section]) => section.enabled)
  .map(([section]) => section)
