import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'

import { server, network } from '../utils'

export default function SEO({ title, description, image, page, images, websiteName, noindex }) {
  const router = useRouter()

  const networkText = network !== 'mainnet' ? (" (" + network + ")") : ""
  description = description || title

  const canonical = server + (router.locale !== 'en' ? ("/" + router.locale) : "") + (router.asPath === "/" ? "" : router.asPath)

  let openGraph = {
    type: 'website',
    url: canonical,
    title: title || page,
    description,
    locale: router.locale,
    site_name: websiteName || "XRPL " + (page ? page : "") + networkText,
  }

  if (image) {
    images = [image]
  } else if (!images) {
    images = [{
      file: server + '/logo512.png',
      width: 512,
      height: 512
    },
    {
      file: server + '/logo192.png',
      width: 192,
      height: 192
    }]
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
    { hrefLang: 'x-default', href: server + path },
    { hrefLang: 'en', href: server + path },
    { hrefLang: 'ru', href: server + '/ru' + path },
    { hrefLang: 'es', href: server + '/es' + path },
    { hrefLang: 'ja', href: server + '/ja' + path },
    { hrefLang: 'ca', href: server + '/ca' + path },
    { hrefLang: 'hr', href: server + '/hr' + path },
    { hrefLang: 'da', href: server + '/da' + path },
    { hrefLang: 'nn', href: server + '/nn' + path }
  ]

  return (
    <NextSeo
      title={title + networkText}
      description={description + networkText}
      openGraph={openGraph}
      twitter={twitter}
      languageAlternates={languageAlternates}
      canonical={canonical}
      noindex={noindex ? true : false}
    />
  )
}
