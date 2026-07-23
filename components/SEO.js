import { NextSeo } from 'next-seo'
import Head from 'next/head'
import { useRouter } from 'next/router'

import { normalizeLocale, stripLeadingLocale, server, explorerName, siteName, xahauNetwork, network } from '../utils'
import { getArticleDates } from '../utils/articleDates'

const absolutePath = (path) => {
  let cleanPath = stripLeadingLocale(path || '/')

  if (cleanPath === '/address' || cleanPath.startsWith('/address/')) {
    cleanPath = cleanPath.replace(/^\/address/, '/account')
  } else if (cleanPath === '/transaction' || cleanPath.startsWith('/transaction/')) {
    cleanPath = cleanPath.replace(/^\/transaction/, '/tx')
  }

  return cleanPath === '/' ? '' : cleanPath
}

export default function SEO({
  title,
  titleWithNetwork,
  description,
  descriptionWithNetwork,
  image,
  twitterImage,
  twitterCardType,
  page,
  websiteName,
  noindex,
  canonicalPath
}) {
  const router = useRouter()

  description = description || title

  const hasExplorerName = (value) =>
    value && String(value).toLowerCase().includes(explorerName.toLowerCase())
  const pageTitle = title || page
  const seoTitle =
    titleWithNetwork || hasExplorerName(pageTitle) || !pageTitle
      ? pageTitle
      : `${pageTitle} | ${explorerName}`
  const seoDescription =
    descriptionWithNetwork || hasExplorerName(description) || !description
      ? description
      : `${description} ${explorerName}`

  const cleanPath = (router.asPath || '/').split('#')[0].split('?')[0]
  const cleanCanonicalPath = canonicalPath ? canonicalPath.split('#')[0] : cleanPath
  const normalizedPath = stripLeadingLocale(cleanPath)
  const currentLocale = normalizeLocale(router.locale)
  const canonical = server + absolutePath(cleanCanonicalPath)

  let openGraph = {
    type: 'website',
    url: canonical,
    title: seoTitle,
    description: seoDescription,
    locale: currentLocale,
    site_name: websiteName || explorerName + ' ' + (page ? page : 'Explorer')
  }

  const imagePath = server + '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  let noImagePage = false

  if (!image) {
    image = {
      width: 1200,
      height: 630,
      file: imagePath + 'previews/1200x630/index.png'
    }
    noImagePage = true
  }

  const { file, width, height, allNetworks } = image
  let url = file
  if (file?.indexOf('http') !== 0) {
    url = (allNetworks ? server + '/images/' : imagePath) + file
  }

  openGraph.images = [
    {
      url,
      width,
      height,
      alt: `Image for ${title}`
    }
  ]

  let twitter = {
    handle: '@bithomp',
    site: '@xrplexplorer',
    cardType: twitterCardType || 'summary'
  }

  let twitterImageUrl = null

  if (twitterImage) {
    twitterImageUrl = twitterImage.file
    if (twitterImage.file?.indexOf('http') !== 0) {
      twitterImageUrl = (allNetworks ? server + '/images/' : imagePath) + twitterImage.file
    }
  } else if (noImagePage) {
    twitterImageUrl = imagePath + 'previews/630x630/index.png'
  }

  if (xahauNetwork) {
    twitter.site = '@XahauExplorer'
  }

  const isPrimaryIndexableNetwork = ['mainnet', 'xahau'].includes(network)
  const isNonMainnetLandingPage = ['', '/', '/faucet', '/explorer'].includes(normalizedPath || '/')
  const shouldNoindex = noindex || (!isPrimaryIndexableNetwork && !isNonMainnetLandingPage)
  const isLearnArticle = normalizedPath.startsWith('/learn/')
  const articleDateDetails = getArticleDates(normalizedPath)
  const articleStructuredData = isLearnArticle
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: pageTitle,
        description,
        url: canonical,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical
        },
        image: url ? [url] : undefined,
        author: {
          '@id': `${server}/#organization`
        },
        publisher: {
          '@type': 'Organization',
          '@id': `${server}/#organization`,
          name: siteName,
          url: server,
          logo: {
            '@type': 'ImageObject',
            url: `${server}/images/${xahauNetwork ? 'xahauexplorer' : 'xrplexplorer'}/192.png`
          }
        },
        inLanguage: currentLocale,
        isAccessibleForFree: true,
        ...(articleDateDetails || {})
      }
    : null

  return (
    <>
      <NextSeo
        title={seoTitle}
        description={seoDescription}
        openGraph={openGraph}
        twitter={twitter}
        canonical={canonical}
        noindex={shouldNoindex}
      />
      {twitterImageUrl && (
        <Head>
          <meta name="twitter:image" content={twitterImageUrl} />
        </Head>
      )}
      {articleStructuredData && (
        <Head>
          <script
            key="article-jsonld"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(articleStructuredData).replace(/</g, '\\u003c')
            }}
          />
        </Head>
      )}
    </>
  )
}
