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
    site_name: websiteName || explorerName + ' ' + (page ? page : '')
  }

  if (image) {
    images = [image]
  } else if (!images) {
    images = [
      {
        file: server + '/logo512.png',
        width: 512,
        height: 512
      },
      {
        file: server + '/logo192.png',
        width: 192,
        height: 192
      }
    ]
  }

  if (images) {
    openGraph.images = []
    for (let i = 0; i < images.length; i++) {
      const { file, width, height } = images[i]
      let url = file
      if (file?.indexOf('http') !== 0) {
        url = server + '/images/' + file
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
    site: server,
    cardType: 'summary'
  }

  if (xahauNetwork) {
    twitter.handle = '@XahauExplorer'
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
    { hrefLang: 'ja', href: server + '/ja' + path }
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
