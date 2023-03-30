import { NextSeo } from 'next-seo'

import { server, network } from '../utils'

const Title = (title) => {
  if (network === 'mainnet') {
    return 'XRPL ' + title
  } else {
    return 'XRPL ' + network.toUpperCase() + ": " + title
  }
}

export default function SEO({ title, description, image }) {
  title = Title(title)
  description = description || title
  const descriptionShow = Title(description)

  let openGraph = {
    type: 'website',
    url: server,
    title,
    description: descriptionShow,
    //locale: 'en_EN',
    site_name: "XRPL " + network.toUpperCase() + ' explorer',
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
      description={descriptionShow}
      openGraph={openGraph}
      twitter={twitter}
    />
  )
}
