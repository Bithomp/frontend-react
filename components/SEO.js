import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'

import { server, network } from '../utils'

export default function SEO({ title, description, image, page, images, websiteName }) {
  const router = useRouter()

  const networkText = network !== 'mainnet' ? (" (" + network + ")") : ""
  description = description || title

  let openGraph = {
    type: 'website',
    url: server + (router.locale !== 'en' ? ("/" + router.locale) : "") + router.asPath,
    title: title || page,
    description,
    locale: router.locale,
    site_name: websiteName || "XRPL " + (page ? page : "") + networkText,
  }

  if (image) {
    images = [image]
  }
  
  if (images) {
    openGraph.images = []
    for (let i = 0; i < images.length; i++) {
      const { file, width, height } = images[i]
      let url = file
      if (file?.indexOf("http") !== 0) {
        url = server + '/images/' + file
      }
      openGraph.images.push(
        {
          url,
          width,
          height,
          alt: `Image for ${title} ${i > 0 ? i : ""}`,
        }
      )
    }
  }

  let twitter = {
    handle: '@bithomp',
    site: server,
    cardType: 'summary'
  }

  // don't add the slash after language, otherwise redirects and it is bad for SEO
  let path = router.asPath !== "/" ? router.asPath : ""

  let languageAlternates = [
    { hrefLang: 'en', href: server + path },
    { hrefLang: 'ru', href: server + '/ru' + path }
  ]

  return (
    <NextSeo
      title={title + networkText}
      description={description}
      openGraph={openGraph}
      twitter={twitter}
      languageAlternates={languageAlternates}
    />
  )
}
