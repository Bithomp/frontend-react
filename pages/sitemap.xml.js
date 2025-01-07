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
  { loc: 'press', changefreq: 'yearly', priority: '0.4' }
]

//network specific pages

if (xahauNetwork) {
  pages.push(
    { loc: 'governance', changefreq: 'hourly', priority: '0.9' },
    { loc: 'unl-report', changefreq: 'always', priority: '0.8' }
  )
}

if (network === 'mainnet') {
  pages.push({ loc: 'xrpl-article', changefreq: 'monthly', priority: '0.6' })
  pages.push({ loc: 'xrp-xah-taxes', changefreq: 'monthly', priority: '0.9' })
}

function generateSiteMap(posts) {
  const locales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr']
  const noTranslatedPages = [
    'admin',
    'advertise',
    'eaas',
    'build-unl',
    'privacy-policy',
    'terms-and-conditions',
    'disclaimer',
    'xrpl-article',
    'xrp-xah-taxes',
    'object'
  ]
  const oldPages = [] // 'explorer/'
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
