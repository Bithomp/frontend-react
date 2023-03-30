import { NextSeo } from 'next-seo'

import { server, network } from '../utils'

export default function SEO({ title, description, image, page }) {
  const networkText = network !== 'mainnet' ? ("(" + network + ")") : ""
  description = description || title

  let openGraph = {
    type: 'website',
    url: server,
    title,
    description,
    //locale: 'en_EN',
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

  return (
    <NextSeo
      title={title}
      description={description}
      openGraph={openGraph}
      twitter={twitter}
    />
  )
}
