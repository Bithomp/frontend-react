import { NextSeo } from 'next-seo'
import Head from 'next/head'
import { useRouter } from 'next/router'

import { normalizeLocale, stripLeadingLocale, server, explorerName, siteName, xahauNetwork, network } from '../utils'
import { getArticleDates } from '../utils/articleDates'

const OPEN_GRAPH_LOCALES = {
  de: 'de_DE',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  id: 'id_ID',
  ja: 'ja_JP',
  ko: 'ko_KR',
  ru: 'ru_RU',
  zh: 'zh_CN'
}

const absolutePath = (path) => {
  let cleanPath = stripLeadingLocale(path || '/')

  if (cleanPath === '/address' || cleanPath.startsWith('/address/')) {
    cleanPath = cleanPath.replace(/^\/address/, '/account')
  } else if (cleanPath === '/transaction' || cleanPath.startsWith('/transaction/')) {
    cleanPath = cleanPath.replace(/^\/transaction/, '/tx')
  }

  return cleanPath === '/' ? '' : cleanPath
}

const imageUrl = (file, allNetworks, networkImagePath) => {
  if (!file) return null
  if (/^(?:https?:|data:)/i.test(file)) return file
  if (file.startsWith('/public/images/')) return server + file.replace('/public', '')
  if (file.startsWith('/')) return server + file
  if (file.startsWith('images/')) return `${server}/${file}`
  return (allNetworks ? `${server}/images/` : networkImagePath) + file
}

const imageMimeType = (url) => {
  const path = url?.split('?')[0].toLowerCase() || ''
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.gif')) return 'image/gif'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png') || path.includes('/nextapi/')) return 'image/png'
  return undefined
}

const imageDimension = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

export default function SEO({
  title,
  titleWithNetwork,
  description,
  descriptionWithNetwork,
  image,
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
  const isLearnArticle = normalizedPath.startsWith('/learn/')
  const articleDateDetails = getArticleDates(normalizedPath)

  let openGraph = {
    type: isLearnArticle ? 'article' : 'website',
    url: canonical,
    title: seoTitle,
    description: seoDescription,
    locale: OPEN_GRAPH_LOCALES[currentLocale] || currentLocale,
    siteName: websiteName || siteName
  }

  if (isLearnArticle && articleDateDetails) {
    openGraph.article = {
      publishedTime: articleDateDetails.datePublished,
      modifiedTime: articleDateDetails.dateModified,
      authors: [server],
      section: 'Learn'
    }
  }

  const networkImagePath = server + '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  if (!image?.file) {
    image = {
      width: 1200,
      height: 630,
      file: networkImagePath + 'previews/1200x630/index.png'
    }
  }

  const url = imageUrl(image.file, image.allNetworks, networkImagePath)
  const width = imageDimension(image.width)
  const height = imageDimension(image.height)
  const alt = image.alt || `${seoTitle} preview`
  const type = image.type || imageMimeType(url)

  openGraph.images = [
    {
      url,
      secureUrl: url?.startsWith('https://') ? url : undefined,
      width,
      height,
      alt,
      type
    }
  ]

  let twitter = {
    handle: '@bithomp',
    site: '@xrplexplorer',
    cardType: twitterCardType || 'summary_large_image'
  }

  if (xahauNetwork) {
    twitter.site = '@XahauExplorer'
  }

  const isPrimaryIndexableNetwork = ['mainnet', 'xahau'].includes(network)
  const isNonMainnetLandingPage = ['', '/', '/faucet', '/explorer'].includes(normalizedPath || '/')
  const shouldNoindex = noindex || (!isPrimaryIndexableNetwork && !isNonMainnetLandingPage)
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
        robotsProps={{ maxImagePreview: 'large' }}
      />
      <Head>
        <meta key="twitter-url" name="twitter:url" content={canonical} />
        <meta key="twitter-title" name="twitter:title" content={seoTitle} />
        <meta key="twitter-description" name="twitter:description" content={seoDescription} />
        <meta key="twitter-image" name="twitter:image" content={url} />
        <meta key="twitter-image-alt" name="twitter:image:alt" content={alt} />
      </Head>
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
