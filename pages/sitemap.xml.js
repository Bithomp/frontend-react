import { server } from '../utils'

const pages = [
  { loc: "explorer/", changefreq: "monthly", priority: "1" },
  { loc: "username", changefreq: "monthly", priority: "1" },
  { loc: "nft-explorer", changefreq: "daily", priority: "1" },

  { loc: "nft-sales", changefreq: "daily", priority: "0.9" },
  { loc: "", changefreq: "hourly", priority: "0.9" },
  { loc: "nft-statistics", changefreq: "always", priority: "0.9" },
  { loc: "nft-volumes", changefreq: "always", priority: "0.9" },
  { loc: "nft-minters", changefreq: "always", priority: "0.9" },

  { loc: "advertise", changefreq: "yearly", priority: "0.8" },
  { loc: "eaas", changefreq: "yearly", priority: "0.8" },

  { loc: "nfts", changefreq: "daily", priority: "0.7" },
  { loc: "nft", changefreq: "daily", priority: "0.7" },
  { loc: "nft-distribution", changefreq: "daily", priority: "0.7" },
  { loc: "nft-offer", changefreq: "daily", priority: "0.7" },
  { loc: "nft-offers", changefreq: "daily", priority: "0.7" },
  { loc: "ledger", changefreq: "always", priority: "0.7" },
  { loc: "donate", changefreq: "daily", priority: "0.7" },
  { loc: "alerts", changefreq: "daily", priority: "0.7" },
  { loc: "amendments", changefreq: "daily", priority: "0.7" },
  { loc: "validators", changefreq: "daily", priority: "0.7" },
  { loc: "last-ledger-information", changefreq: "always", priority: "0.7" },
  { loc: "paperwallet/", changefreq: "yearly", priority: "0.7" },
  { loc: "domains", changefreq: "always", priority: "0.7" },
  { loc: "rich-list", changefreq: "always", priority: "0.7" },

  { loc: "genesis", changefreq: "weekly", priority: "0.6" },
  { loc: "build-unl", changefreq: "yearly", priority: "0.6" },

  { loc: "submit/", changefreq: "yearly", priority: "0.5" },

  { loc: "customer-support", changefreq: "yearly", priority: "0.4" },
  { loc: "developer", changefreq: "yearly", priority: "0.4" },
  { loc: "press", changefreq: "yearly", priority: "0.4" },

  { loc: "explorer/submit.html", changefreq: "yearly", priority: "0.2" }
]

function generateSiteMap(posts) {
  const locales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'ca', 'hr', 'da', 'nn', 'my']
  const oldPages = ['explorer/', 'submit/', 'paperwallet/', 'explorer/submit.html', 'advertise', 'eaas', 'build-unl'] //and not translated pages
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
     ${posts
      .map(({ loc, changefreq, priority }) => {
        return `
          <url>
            <loc>${`${server}/${loc}`}</loc>
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
            ${!oldPages.includes(loc) ? locales
            .map((locale) => {
              return `<xhtml:link rel="alternate" hreflang="${locale}" href="${`${server}${locale === 'en' ? '' : '/' + locale}/${loc}`}"/>`
            })
            .join('')
            :
            ""
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
    props: {},
  }
}

export default SiteMap
