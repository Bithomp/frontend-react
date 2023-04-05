import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'

import { server, network } from '../utils'

export default function SEO({ title, description, image, page }) {
  const router = useRouter()

  const networkText = network !== 'mainnet' ? ("(" + network + ")") : ""
  description = description || title

  let openGraph = {
    type: 'website',
    url: server,
    title: title || page,
    description,
    locale: router.locale,
    site_name: "XRPL " + (page ? (page + " ") : "") + networkText,
  }

  if (image) {
    const { file, width, height } = image
    let url = file
    if (file?.indexOf("http") !== 0) {
      url = server + '/images/' + file
    }
    openGraph.images = [
      {
        url,
        width,
        height,
        alt: `image for ${title}`,
      },
    ]
  }

  let twitter = {
    handle: '@bithomp',
    site: server,
    cardType: 'summary'
  }

  let languageAlternates = []

  if (router.locale === 'en') {
    languageAlternates.push(
      { hrefLang: 'ru', href: server + '/ru' + router.asPath }
    )
  } else if (router.locale === 'ru') {
    languageAlternates.push(
      { hrefLang: 'en', href: server + router.asPath }
    )
  }

  return (
    <NextSeo
      title={title}
      description={description}
      openGraph={openGraph}
      twitter={twitter}
      languageAlternates={languageAlternates}
    />
  )
}
