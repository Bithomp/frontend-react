import { network, server, xahauNetwork } from '../utils'

const pages = [
  { loc: 'explorer/', changefreq: 'monthly', priority: '1' },
  { loc: '', changefreq: 'always', priority: '1' },
  { loc: 'faucet', changefreq: 'monthly', priority: '1' },
  { loc: 'username', changefreq: 'monthly', priority: '1' },
  { loc: 'nft-explorer', changefreq: 'daily', priority: '1' },
  { loc: 'amendments', changefreq: 'always', priority: '1' },
  { loc: 'validators', changefreq: 'always', priority: '1' },
  { loc: 'amms', changefreq: 'always', priority: '1' },
  { loc: 'whales', changefreq: 'always', priority: '1' },

  { loc: 'services/send', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/nft-mint', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/trustline', changefreq: 'monthly', priority: '1' },
  { loc: 'services/check', changefreq: 'monthly', priority: '0.8' },
  { loc: 'services/escrow', changefreq: 'monthly', priority: '0.9' },
  { loc: 'services/account-settings', changefreq: 'monthly', priority: '0.9' },

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
  { loc: 'whales', changefreq: 'always', priority: '0.7' },
  { loc: 'nodes', changefreq: 'always', priority: '0.7' },
  { loc: 'activations', changefreq: 'always', priority: '0.7' },
  { loc: 'domains', changefreq: 'always', priority: '0.7' },
  { loc: 'distribution', changefreq: 'always', priority: '0.7' },

  { loc: 'genesis', changefreq: 'weekly', priority: '0.6' },
  { loc: 'build-unl', changefreq: 'yearly', priority: '0.6' },
  { loc: 'advertise', changefreq: 'yearly', priority: '0.6' },
  { loc: 'eaas', changefreq: 'yearly', priority: '0.6' },

  { loc: 'submit-account-information', changefreq: 'yearly', priority: '0.5' },
  { loc: 'admin', changefreq: 'yearly', priority: '0.5' },

  { loc: 'object', changefreq: 'yearly', priority: '0.4' },
  { loc: 'about-us', changefreq: 'yearly', priority: '0.4' },
  { loc: 'customer-support', changefreq: 'yearly', priority: '0.4' },
  { loc: 'developer', changefreq: 'yearly', priority: '0.4' },

  { loc: 'explorer-advantages', changefreq: 'monthly', priority: '0.5' }
]

//network specific pages
if (xahauNetwork) {
  //only o xahau
  pages.push(
    { loc: 'governance', changefreq: 'hourly', priority: '0.9' },
    { loc: 'unl-report', changefreq: 'always', priority: '0.8' }
  )
} else {
  // only on xrpl
  pages.push(
    { loc: 'services/amm/deposit', changefreq: 'monthly', priority: '0.9' },
    { loc: 'services/amm/create', changefreq: 'monthly', priority: '0.8' },
    { loc: 'services/amm/withdraw', changefreq: 'monthly', priority: '0.9' },
    { loc: 'services/amm/vote', changefreq: 'monthly', priority: '0.7' }
  )
}

//works only on the mainnet
if (network === 'mainnet') {
  if (!xahauNetwork) {
    pages.push(
      { loc: 'learn/xrpl-article', changefreq: 'monthly', priority: '0.6' },
      { loc: 'learn/ripple-usd', changefreq: 'monthly', priority: '0.7' },
      { loc: 'learn/amm', changefreq: 'monthly', priority: '0.8' }
    )
  }
  pages.push(
    { loc: 'the-chain-of-blocks-summit', changefreq: 'monthly', priority: '1' },
    { loc: 'press', changefreq: 'yearly', priority: '0.4' },
    { loc: 'jobs', changefreq: 'monthly', priority: '0.5' },
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
    { loc: 'learn/image-services', changefreq: 'monthly', priority: '0.6' },
    { loc: 'learn/paystrings', changefreq: 'monthly', priority: '0.5' }
  )
}

function generateSiteMap(posts) {
  const locales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr']
  const noTranslatedPages = [
    'the-chain-of-blocks-summit',
    'admin',
    'advertise',
    'eaas',
    'build-unl',
    'privacy-policy',
    'terms-and-conditions',
    'disclaimer',
    'jobs',
    'xrp-xah-taxes',
    'object',
    'about-us',
    'whales',
    'whales/receivers',
    'whales/senders',
    'whales/submitters',
    'services/nft-mint',
    'services/send',
    'services/trustline',
    'services/check',
    'services/escrow',
    'services/account-settings',
    'services/amm/deposit',
    'services/amm/create',
    'services/amm/withdraw',
    'services/amm/vote',
    'learn',
    'learn/blackholed-address',
    'learn/blacklisted-address',
    'learn/verified-domain',
    'learn/ripple-usd',
    'learn/the-bithomp-explorer-advantages',
    'learn/xrpl-article',
    'learn/amm',
    'learn/issue-a-token',
    'learn/guide-for-token-issuers',
    'learn/image-services',
    'learn/paystrings'
  ]
  const oldPages = ['explorer/']
  const pagesWithoutTranslation = [...noTranslatedPages, ...oldPages]

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
     ${posts
       .map(({ loc, changefreq, priority }) => {
         return `
          <url>
            ${
              !oldPages.includes(loc)
                ? `<loc>${`${server}/en${loc ? '/' + loc : ''}`}</loc>`
                : `<loc>${`${server}/${loc}`}</loc>`
            }
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
            ${
              !pagesWithoutTranslation.includes(loc)
                ? locales
                    .map((locale) => {
                      return `<xhtml:link rel="alternate" hreflang="${locale}" href="${`${server}${
                        '/' + locale
                      }/${loc}`}"/>`
                    })
                    .join('')
                : ''
            }
          </url>
        `
       })
       .join('')}
   </urlset>
 `
}

function SiteMap() {
  // getServerSideProps will do everything we need here
}

export async function getServerSideProps({ res }) {
  const sitemap = generateSiteMap(pages)
  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()
  return {
    props: {}
  }
}

export default SiteMap
