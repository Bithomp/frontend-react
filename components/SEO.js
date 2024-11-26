import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'

import { server, explorerName, xahauNetwork } from '../utils'

export default function SEO({ title, titleWithNetwork, description, image, page, images, websiteName, noindex }) {
  const router = useRouter()

  description = description || title

  const canonical = server + '/' + router.locale + (router.asPath === '/' ? '' : router.asPath)

  let openGraph = {
    type: 'website',
    url: canonical,
    title: title || page,
    description,
    locale: router.locale,
    site_name: websiteName || explorerName + ' ' + (page ? page : 'Explorer')
  }

  const imagePath = server + '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  if (image) {
    images = [image]
  } else if (!images) {
    images = [
      {
        width: 1200,
        height: 630,
        file: imagePath + 'previews/1200x630/index.png'
      },
      {
        width: 630,
        height: 630,
        file: imagePath + 'previews/630x630/index.png'
      },
      {
        file: imagePath + '512.png',
        width: 512,
        height: 512
      },
      {
        file: imagePath + '192.png',
        width: 192,
        height: 192
      }
    ]
  }

  if (images) {
    //nft previews and avatars starts wuth https
    openGraph.images = []
    for (let i = 0; i < images.length; i++) {
      const { file, width, height, allNetworks } = images[i]
      let url = file
      if (file?.indexOf('http') !== 0) {
        url = (allNetworks ? server + '/images/' : imagePath) + file
      }
      openGraph.images.push({
        url,
        width,
        height,
        alt: `Image for ${title} ${i > 0 ? i : ''}`
      })
    }
  }

  let twitter = {
    handle: '@bithomp',
    site: '@xrplexplorer',
    cardType: 'summary'
  }

  if (xahauNetwork) {
    twitter.site = '@XahauExplorer'
  }

  // don't add the slash after language, otherwise redirects and it is bad for SEO
  let path = router.asPath !== '/' ? router.asPath : ''

  let languageAlternates = [
    { hrefLang: 'x-default', href: server + '/en' + path },
    { hrefLang: 'en', href: server + '/en' + path },
    { hrefLang: 'ko', href: server + '/ko' + path },
    { hrefLang: 'ru', href: server + '/ru' + path },
    { hrefLang: 'de', href: server + '/de' + path },
    { hrefLang: 'es', href: server + '/es' + path },
    { hrefLang: 'id', href: server + '/id' + path },
    { hrefLang: 'ja', href: server + '/ja' + path },
    { hrefLang: 'fr', href: server + '/fr' + path }
  ]

  return (
    <NextSeo
      title={titleWithNetwork ? title : explorerName + ' ' + title}
      description={description + ' ' + explorerName}
      openGraph={openGraph}
      twitter={twitter}
      languageAlternates={languageAlternates}
      canonical={canonical}
      noindex={noindex ? true : false}
    />
  )
}
