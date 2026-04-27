import { NextSeo } from 'next-seo'
import Head from 'next/head'
import { useRouter } from 'next/router'

import { server, explorerName, xahauNetwork, network } from '../utils'

export default function SEO({
  title,
  titleWithNetwork,
  description,
  descriptionWithNetwork,
  image,
  twitterImage,
  page,
  websiteName,
  noindex
}) {
  const router = useRouter()

  description = description || title

  const normalizedPath = router.asPath === '/' ? '' : router.asPath
  const isEnglishLikeLocale = !router.locale || router.locale === 'default' || router.locale === 'en'
  const canonical = isEnglishLikeLocale ? server + normalizedPath : `${server}/${router.locale}${normalizedPath}`

  let openGraph = {
    type: 'website',
    url: canonical,
    title: title || page,
    description,
    locale: isEnglishLikeLocale ? 'en' : router.locale,
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
    cardType: 'summary'
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

  // don't add the slash after language, otherwise redirects and it is bad for SEO
  let path = router.asPath !== '/' ? router.asPath : ''

  let languageAlternates = [
    { hrefLang: 'x-default', href: server + path },
    { hrefLang: 'en', href: server + path },
    { hrefLang: 'ko', href: server + '/ko' + path },
    { hrefLang: 'ru', href: server + '/ru' + path },
    { hrefLang: 'de', href: server + '/de' + path },
    { hrefLang: 'es', href: server + '/es' + path },
    { hrefLang: 'id', href: server + '/id' + path },
    { hrefLang: 'ja', href: server + '/ja' + path },
    { hrefLang: 'fr', href: server + '/fr' + path }
  ]

  const isPrimaryIndexableNetwork = ['mainnet', 'xahau'].includes(network)
  const isNonMainnetLandingPage = ['', '/', '/faucet', '/explorer'].includes(normalizedPath || '/')
  const shouldNoindex = noindex || (!isPrimaryIndexableNetwork && !isNonMainnetLandingPage)

  return (
    <>
      <NextSeo
        title={titleWithNetwork ? title : explorerName + ' ' + title}
        description={descriptionWithNetwork ? description : description + ' ' + explorerName}
        openGraph={openGraph}
        twitter={twitter}
        languageAlternates={languageAlternates}
        canonical={canonical}
        noindex={shouldNoindex}
      />
      {twitterImageUrl && (
        <Head>
          <meta name="twitter:image" content={twitterImageUrl} />
        </Head>
      )}
    </>
  )
}
