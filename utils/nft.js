import { Buffer } from 'buffer'
import { stripText, shortName, webSiteName } from '.'

import Link from 'next/link'
import LinkIcon from '../public/images/link.svg'
import { amountFormat, shortHash } from './format'

//partner market places (destinations)
export const partnerMarketplaces = {
  rpZqTPC8GvrSvEfFsUuHkmPCg29GdQuXhC: { name: 'bidds', feeText: '1,5%', fee: 0.015, multiplier: 1.015 }, //bidds mainnet
  rhb5g4EHLHCiTAc8fJU5wk2jmsef2wNCxM: { name: 'bidds', feeText: '1,5%', fee: 0.015, multiplier: 1.015 } //bidds testnet new
}

//identified NFT Market Places
export const mpUrl = (offer) => {
  if (!offer || !offer.destination || !offer.destinationDetails) return ''
  let service = offer.destinationDetails.service
  if (!service) return ''
  service = service.trim()
  let url = ''
  if (service === 'bidds') {
    url = 'https://nft.bidds.com/nft/'
  } else if (service === 'xrp.cafe' || service === 'xrp.cafe (auction)') {
    url = 'https://xrp.cafe/nft/'
  } else if (service === 'xMart') {
    url = 'https://api.xmart.art/nft/'
  } else if (service === 'nftmaster') {
    url = 'https://nftmaster.com/nft/'
  } else if (service === 'XPmarket') {
    url = 'https://xpmarket.com/nfts/item/'
  } else if (service === 'Equilibrium Games') {
    url = 'https://equilibrium-games.com/marketplace/nft/'
  } else if (service === 'CollaterArt') {
    url = 'https://collaterart.com/Mainnet/' + offer.owner + '/'
  } else if (service === 'RandX') {
    url = 'https://www.randx.xyz/nft/'
  } else if (service === 'OpulenceX') {
    url = 'https://nftmarketplace.opulencex.io/nft/'
  } else if (service === 'Art Dept') {
    url = 'https://artdept.fun/nft/'
  } else if (service === 'DeXfi') {
    url = 'https://dexfi.pro' // so far there no nft specific url :(
  }
  if (url) {
    return url + offer.nftokenID
  } else {
    return ''
  }
}

export const bestNftOffer = (nftOffers, loggedInAddress, type = 'sell') => {
  if (!nftOffers) return null

  //nftOffers = nftOffers.filter(function (offer) { return offer.valid; });
  //best xrp offer available or an IOU offer, if it's only one IOU offer available
  let bestNftOffer = null
  if (nftOffers.length) {
    let iouOffers = []
    let xrpOffers = []

    for (let i = 0; i < nftOffers.length; i++) {
      if (nftOffers[i].amount.value) {
        iouOffers.push(nftOffers[i])
      } else {
        xrpOffers.push(nftOffers[i])
      }
    }

    if (xrpOffers.length > 0) {
      //sorting marketplaces, partner marketplaces first otherwise created latest first
      xrpOffers.sort((a, b) => {
        if (partnerMarketplaces?.[a.destination] && !partnerMarketplaces?.[b.destination]) return 1
        if (!partnerMarketplaces?.[a.destination] && partnerMarketplaces?.[b.destination]) return -1
        return a.createdAt - b.createdAt
      })

      //without destination firsts (without a marketplace)
      xrpOffers = xrpOffers.sort((a, b) => {
        if (!a.destination && b.destination) return 1
        if (a.destination && !b.destination) return -1
        return 0
      })

      if (type === 'buy') {
        //sort most expansive on top
        xrpOffers.sort((a, b) => (parseFloat(a.amount) < parseFloat(b.amount) ? 1 : -1))
      } else {
        //sell orders
        //sort cheapest on top
        xrpOffers.sort((a, b) => (parseFloat(a.amount) > parseFloat(b.amount) ? 1 : -1))
      }

      for (let i = 0; i < xrpOffers.length; i++) {
        if (
          mpUrl(xrpOffers[i]) ||
          !xrpOffers[i].destination ||
          (loggedInAddress && xrpOffers[i].destination === loggedInAddress)
        ) {
          //if known destination - (not a private offer) or on Open Market, or destination is loggedinUser
          bestNftOffer = xrpOffers[i]
          break
        }
      }
    }

    if (!bestNftOffer && iouOffers.length > 0) {
      // if no XRP offers fits creterias above choose IOU if it's only one fits.
      let iouFitOffers = []
      //check that if it's not a private offer (only MP and public), or destination is the loggedInUser
      for (let i = 0; i < iouOffers.length; i++) {
        if (
          mpUrl(iouOffers[i]) ||
          !iouOffers[i].destination ||
          (loggedInAddress && iouOffers[i].destination === loggedInAddress)
        ) {
          iouFitOffers.push(iouOffers[i])
        }
      }
      if (iouFitOffers.length > 1) {
        //public offers firsts
        iouFitOffers = iouFitOffers.sort((a, b) => {
          if (!a.destination && b.destination) return 1
          if (a.destination && !b.destination) return -1
          return a.createdAt - b.createdAt
        })
        //latest on top, need to test
        //iouFitOffers = iouFitOffers.sort((a, b) => (parseFloat(a.createdAt) < parseFloat(b.createdAt)) ? 1 : -1)
      }
      if (iouFitOffers.length > 0) {
        bestNftOffer = iouFitOffers[0]
      }
    }
    return bestNftOffer
  } else {
    return null
  }
}

export const nftThumbnail = (nft) => {
  if (!nft) return ''
  const nftId = nft.nftokenID || nft.uritokenID
  if (!nftId) return ''
  const imageSrc = nftUrl(nft, 'thumbnail')
  if (!imageSrc) return ''
  return (
    <Link href={'/nft/' + nftId}>
      <img
        src={imageSrc}
        width="32px"
        height="32px"
        style={{ borderRadius: '50% 20% / 10% 40%', verticalAlign: 'middle' }}
        alt={nftName(nft)}
      />
    </Link>
  )
}

export const collectionThumbnail = (data) => {
  if (!data) return ''
  const { image, video } = data
  const uri = image || video
  if (!uri) return ''
  let imageSrc = ''
  const ipfs = ipfsUrl(uri, 'thumbnail', 'our')
  if (ipfs) {
    imageSrc = ipfs
  } else if (typeof uri === 'string' && uri.slice(0, 8) === 'https://') {
    imageSrc = `https://cdn.${webSiteName}/thumbnail?url=${encodeURIComponent(stripText(uri))}`
  } else if (typeof uri === 'string' && uri.slice(0, 10) === 'data:image') {
    imageSrc = stripText(uri)
  } else {
    return ''
  }
  return (
    <img
      src={imageSrc}
      width="32px"
      height="32px"
      style={{ borderRadius: '50% 20% / 10% 40%', verticalAlign: 'middle' }}
      alt=""
    />
  )
}

export const nftNameLink = (nft) => {
  if (!nft || !nft.nftokenID) return ''
  return <Link href={'/nft/' + nft.nftokenID}>{nftName(nft) ? nftName(nft) : <LinkIcon />}</Link>
}

export const nftName = (nft, options = {}) => {
  //xls-35
  let name = ''
  if (nft?.metadata?.details?.title) {
    name = nft.metadata.details.title
    //xls-20
  } else if (nft?.metadata?.name) {
    name = nft.metadata.name
  } else if (nft?.metadata?.Name) {
    name = nft.metadata.Name
  } else if (nft?.uri) {
    const decodedUri = Buffer.from(nft.uri, 'hex')
    if (decodedUri.includes('filename=')) {
      name = decodedUri.toString().split('filename=')[1]
    }
  }
  if (options.maxLength) {
    return shortName(name, options)
  }
  return stripText(name)
}

export const isValidTaxon = (taxon) => {
  if (taxon !== 0 && !taxon) return false
  taxon = Number(taxon)
  return Number.isInteger(taxon) && taxon > -1 && taxon < 2147483648
}

const isValidCid = (hash) => {
  return /^Qm[a-zA-Z0-9]{44}$|^baf[a-zA-Z0-9]{56}$/.test(hash)
}

export const ipfsUrl = (uri, type = 'image', gateway = 'our') => {
  if (!uri) return null
  let url = uri.toString()
  let filename = ''
  if (url.includes('.ipfs.w3s.link') || url.includes('.ipfs.nftstorage.link')) {
    url = url.replace('https://', '')
    url = url.replace('.ipfs.w3s.link', '')
    url = url.replace('.ipfs.nftstorage.link', '')
  } else if (url.slice(0, 4) === 'cid:') {
    return 'https://wallet.xrplnft.art/ipfs/' + url.slice(4) //centralised option
    //url = url.slice(4); //decentralised option is too slow
  } else if (url.includes('?filename=')) {
    filename = '?filename=' + url.split('?filename=')[1]
    url = url.split('?filename=')[0]
  } else if (url.slice(0, 5) === 'hash:') {
    url = url.slice(5)
  }

  //3d model
  if (url.includes('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4/?object=')) {
    url = url.split('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4/?object=')[1]
    if (url.includes('&filename=')) {
      url = url.split('&filename=')[0]
    }
  }

  const urlParts = url.split('/')

  let cid = null

  for (let i = 0; i < urlParts.length; i++) {
    if (isValidCid(urlParts[i])) {
      cid = urlParts[i]
      break
    }
  }

  if (cid) {
    if (type === 'cid') {
      return cid
    }
    url = stripText(cid + url.split(cid).pop())
    url = url.replace('#', '%23')
    if (gateway === 'our' && (type === 'image' || type === 'video' || type === 'thumbnail' || type === 'preview')) {
      return 'https://cdn.' + webSiteName + '/' + type + '/' + url + filename
    } else if (
      gateway === 'cl' &&
      type === 'model' &&
      url.includes('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4/?object=')
    ) {
      return stripText(uri)
    } else if (gateway === 'cl' || type === 'audio' || type === 'model' || type === 'viewer') {
      return 'https://ipfs.io/ipfs/' + url + filename
    }
  } else {
    return null
  }
}

export const assetUrl = (uri, type = 'image', gateway = 'our', flags = null) => {
  if (!uri) return null
  uri = uri.toString()
  if (
    type === 'image' &&
    (isCorrectFileType(uri, 'video') || isCorrectFileType(uri, 'audio') || isCorrectFileType(uri, 'model'))
  ) {
    return null
  }
  if (
    type === 'video' &&
    (isCorrectFileType(uri, 'image') || isCorrectFileType(uri, 'audio') || isCorrectFileType(uri, 'model'))
  ) {
    return null
  }
  if (
    type === 'model' &&
    (isCorrectFileType(uri, 'image') || isCorrectFileType(uri, 'audio') || isCorrectFileType(uri, 'video'))
  ) {
    return null
  }
  if (
    type === 'audio' &&
    (isCorrectFileType(uri, 'image') || isCorrectFileType(uri, 'model') || isCorrectFileType(uri, 'video'))
  ) {
    return null
  }

  const ipfs = ipfsUrl(uri, type, gateway)
  if (ipfs) {
    return ipfs
  } else if (uri.slice(0, 8) === 'https://') {
    if (type === 'video' && uri.toLowerCase().includes('youtube.com')) {
      return null
    }
    if (flags?.mutable && type === 'image') {
      //mutable NFTs can have changing images, so we do not cache them
      return stripText(uri)
    }
    return `https://cdn.${webSiteName}/${type}?url=${encodeURIComponent(stripText(uri))}`
  } else if ((type === 'image' || type === 'thumbnail') && uri.slice(0, 10) === 'data:image') {
    return stripText(uri)
  } else {
    return null
  }
}

const metaUrl = (nft, type = 'image', gateway = 'our') => {
  if (!nft.metadata) return null
  let meta = nft.metadata
  let flags = nft.flags
  if (type === 'image' || type === 'thumbnail' || type === 'preview') {
    //Evernode
    if ((meta.evernodeRegistration || meta.evernodeLease) && gateway === 'our') {
      return '/images/nft/evernode.png'
    }
    //XLS-35
    if (meta.content?.url) return assetUrl(meta.content.url, type, gateway, flags)
    //XLS-20
    if (meta.image) return assetUrl(meta.image, type, gateway, flags)
    if (meta.image_url) return assetUrl(meta.image_url, type, gateway, flags)
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway, flags)
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway, flags)
    //sologenic
    if (meta.content_type && meta.content_type.includes('image') && meta.file_extension && nft.uri) {
      let decodedUri = Buffer.from(nft.uri, 'hex').toString()
      if (decodedUri.toLowerCase().includes('metadata.json')) {
        return assetUrl(decodedUri.replace('metadata.json', 'data.' + meta.file_extension), type, gateway, flags)
      }
    }
    //image from animation
    if (meta.animation) return assetUrl(meta.animation, type, gateway, flags)
    if (meta.animation_url) return assetUrl(meta.animation_url, type, gateway, flags)
  }
  if (type === 'video' || type === 'thumbnail' || type === 'preview') {
    if (meta.video) return assetUrl(meta.video, type, gateway, flags)
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway, flags)
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway, flags)
    // a hack for xSPECTAR avatars
    if (nft.issuer === 'ra59pDJcuqKJcQws7Xpuu1S8UYKmKnpUkW' && nft.nftokenTaxon === 10) {
      return assetUrl(meta.animation_url, type, gateway, flags)
    }
    if (meta.movie) return assetUrl(meta.movie, type, gateway, flags)
    if (meta.content) return assetUrl(meta.content, type, gateway, flags)
  }
  if (type === 'audio') {
    if (meta.audio) return assetUrl(meta.audio, type, gateway, flags)
  }
  if (type === 'model') {
    if (meta['3D_model']) return assetUrl(meta['3D_model'], type, gateway, flags)
    if (meta['3d_model']) return assetUrl(meta['3d_model'], type, gateway, flags)
  }
  if (type === 'viewer') {
    if (isCorrectFileType(meta.animation, type)) return assetUrl(meta.animation, type, gateway, flags)
    if (isCorrectFileType(meta.animation_url, type)) return assetUrl(meta.animation_url, type, gateway, flags)
  }
  return null
}

const isCorrectFileType = (url, nftType = 'image') => {
  if (!url) return false
  url = url.toString().trim()
  let type = url.slice(-4).toUpperCase()
  let type4 = url.slice(-5).toUpperCase()
  if (nftType === 'thumbnail') {
    return true
  } else if (nftType === 'image') {
    if (type === '.JPG' || type === '.PNG' || type === '.GIF' || type === '.PDF') {
      return true
    }
    if (url.slice(0, 10) === 'data:image') {
      return true
    }
  } else if (nftType === 'video') {
    if (type === '.MP4') {
      return true
    }
  } else if (nftType === 'audio') {
    if (type === '.MP3') {
      return true
    }
  } else if (nftType === 'model') {
    if (url.includes('QmUR2XyUZvGvsNMmLBA5joPduT4f95jSMGzzzmCkckKSF4')) {
      return true
    }
    if (
      type4 === '.GLTF' ||
      type === '.GLB' ||
      type === '.OBJ' ||
      type === '.3DS' ||
      type === '.STL' ||
      type === '.PLY' ||
      type === '.3DM' ||
      type === '.OFF'
    ) {
      return true
    }
  } else if (nftType === 'viewer') {
    if (type4 === '.HTML' || type === '.HTM' || type === '.PHP') {
      return true
    }
  }
  return false
}

export const nftUrl = (nft, type = 'image', gateway = 'our') => {
  if (!nft) return null
  const url = metaUrl(nft, type, gateway)
  const flags = nft.flags
  if (url) {
    // do not return IPFS CL links as base64 images
    if (gateway === 'cl' && url.slice(0, 10) === 'data:image') {
      return null
    }
    return url
  } else {
    if (nft.uri) {
      const decodedUri = Buffer.from(nft.uri, 'hex')
      if (isCorrectFileType(decodedUri, type)) {
        return assetUrl(decodedUri, type, gateway, flags)
      }
    }
    return null
  }
}

export const isNftExplicit = (nft) => {
  const name = nft.metadata?.name && typeof nft.metadata?.name === 'string' ? nft.metadata.name.toLowerCase() : ''
  const title = nft.metadata?.title && typeof nft.metadata?.title === 'string' ? nft.metadata.title.toLowerCase() : ''
  const collection =
    nft.metadata?.collection?.name && typeof nft.metadata?.collection?.name === 'string'
      ? nft.metadata.collection.name.toLowerCase()
      : ''
  if (
    name.includes('nude') ||
    title.includes('nude') ||
    name.includes('sexy') ||
    name.includes('naked') ||
    name.includes('ladies') ||
    collection.includes('18+') ||
    nft.metadata?.is_explicit
  ) {
    return true
  }
  return false
}

export const needNftAgeCheck = (nft) => {
  const isOver18 = localStorage.getItem('isOver18')
  return !isOver18 && isNftExplicit(nft)
}

export const nftImageStyle = (nft, style = {}) => {
  if (!nft) {
    return {}
  }

  if (needNftAgeCheck(nft)) {
    return { backgroundImage: "url('/images/nft/18plus.jpg')" }
  }

  const imageUrl = nftUrl(nft, 'image')
  if (imageUrl) {
    style.backgroundImage = "url('" + imageUrl.replace(/'/g, "\\'") + "')"
    if (imageUrl.slice(0, 10) === 'data:image') {
      style.imageRendering = 'pixelated'
    }
    if (imageUrl.slice(0, 18) === 'data:image/svg+xml') {
      style.width = '100%'
      style.height = '100%'
    }
    if (nft.deletedAt) {
      style.filter = 'grayscale(1)'
    }
  } else if (!nft.uri) {
    style.imageRendering = 'pixelated'
    style.backgroundSize = '80%'
    style.backgroundRepeat = 'no-repeat'
    style.backgroundColor = 'white'
    style.backgroundImage =
      "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAMAgMAAABO9kYLAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACVBMVEUAAAAAscH///9gi2cVAAAAAXRSTlMAQObYZgAAAAFiS0dEAmYLfGQAAAAJb0ZGcwAAAAQAAAAMAO0Ou9QAAAAJdnBBZwAAAE0AAAAaABY5XmAAAABCSURBVAjXdc6xEYAwDATBI1AHcj9fwhOo/1ZsEQIKd+aCw3iVCLJKYerjW2Tb5CXsyadvx2QHbUbjXz8/lEycn5c3880aCfVVMdcAAAAASUVORK5CYII=')"
  }
  return style
}

export const nftPriceData = (t, sellOffers, loggedInAddress) => {
  if (!sellOffers) return ''
  const best = bestNftOffer(sellOffers, loggedInAddress, 'sell')
  if (best) {
    if (mpUrl(best) && !partnerMarketplaces[best?.destination]) {
      return (
        <>
          {amountFormat(best.amount, { tooltip: 'right' })} ({best.destinationDetails.service})
        </>
      )
    } else {
      return amountFormat(best.amount, { tooltip: 'right' })
    }
  }
  return t('table.text.private-offer') //shouldn't be the case
}

export const NftImage = ({ nft, style }) => {
  const size = style?.width && typeof style.width !== 'string' && style.width > 0 ? style.width : 70
  let text = size < 50 ? ';(' : 'No image'
  const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
     <rect width="100%" height="100%" fill="#ffffff"/>
     <text x="50%" y="50%" font-family="sans-serif" font-size="10" text-anchor="middle" dominant-baseline="central" fill="#9aa0a6">
      ${text}
     </text>
   </svg>`
  )}`
  if (style?.width === 20) {
    style.marginBottom = '-5px'
  }
  return (
    <img
      src={nftUrl(nft?.nftoken || nft, size < 32 ? 'thumbnail' : 'preview') || placeholder}
      alt={nftName(nft?.nftoken || nft) || 'NFT thumbnail'}
      style={{ marginRight: '5px', ...style }}
      onError={(e) => {
        e.target.onerror = null
        e.target.src = placeholder
      }}
    />
  )
}

export const nonSologenic = (data) => {
  return data?.issuer && (data?.taxon || data?.taxon === 0)
}

export const collectionNameText = (data) => {
  if (!data) return ''
  if (data?.name) return data.name.replace(/"/g, '""')
  const issuerDetails = data.issuerDetails
  if (!issuerDetails) return data.collection
  const { service, username } = issuerDetails
  if (service || username) {
    return service || username // + ' (' + data.collectionDetails.taxon + ')'
  }
  if (nonSologenic(data)) {
    const { issuer, taxon } = data
    return shortHash(issuer) + (taxon ? ' (' + taxon + ')' : '')
  }
  return data.collection
}

// Check if NFT metadata indicates a panorama/360 image
export const isPanorama = (metadata) => {
  if (!metadata) return false

  // Check name and description for panorama keywords
  const panoramaKeywords = ['360', 'panorama', 'panoramic', 'equirectangular']
  const name = metadata.name?.toString().toLowerCase() || ''
  const description = metadata.description?.toString().toLowerCase() || ''

  // Check if name or description contains panorama keywords
  const hasPanoramaKeyword = panoramaKeywords.some((keyword) => name.includes(keyword) || description.includes(keyword))

  // Check for specific camera types known for panoramas
  const panoramaCameras = ['gopro fusion', 'insta360', 'ricoh theta']
  const hasPanoramaCamera = panoramaCameras.some((camera) => description.includes(camera.toLowerCase()))

  return hasPanoramaKeyword || hasPanoramaCamera
}

// Extract and process 3D model attributes from NFT metadata
export const processModelAttributes = (nft) => {
  if (!nft.metadata || (!nft.metadata['3D_attributes'] && !nft.metadata['3d_attributes'])) {
    return []
  }

  let modelAttr = nft.metadata['3D_attributes'] || nft.metadata['3d_attributes']
  const supportedAttr = [
    'environment-image',
    'exposure',
    'shadow-intensity',
    'shadow-softness',
    'camera-orbit',
    'camera-target',
    'skybox-image',
    'auto-rotate-delay',
    'rotation-per-second',
    'field-of-view',
    'max-camera-orbit',
    'min-camera-orbit',
    'max-field-of-view',
    'min-field-of-view',
    'disable-zoom',
    'orbit-sensitivity',
    'animation-name',
    'animation-crossfade-duration',
    'variant-name',
    'orientation',
    'scale'
  ]

  if (Array.isArray(modelAttr)) {
    const filtered = []
    for (let i = 0; i < modelAttr.length; i++) {
      if (modelAttr[i] && supportedAttr.includes(modelAttr[i].attribute)) {
        filtered.push({
          attribute: modelAttr[i].attribute,
          value: stripText(modelAttr[i].value)
        })
      }
    }
    return filtered
  } else if (typeof modelAttr === 'object') {
    const filtered = []
    Object.keys(modelAttr).forEach((e) => {
      if (supportedAttr.includes(e)) {
        filtered.push({
          attribute: e,
          value: stripText(modelAttr[e])
        })
      }
    })
    return filtered
  }

  return []
}

// Build content tab list based on available media types
export const buildContentTabList = (imageUrl, videoUrl, modelUrl, t) => {
  const contentTabList = []
  if (imageUrl) {
    contentTabList.push({ value: 'image', label: t('tabs.image') })
  }
  if (videoUrl) {
    contentTabList.push({ value: 'video', label: t('tabs.video') })
  }
  if (modelUrl) {
    contentTabList.push({ value: 'model', label: t('tabs.model') })
  }
  return contentTabList
}

// Extract all media URLs from NFT
export const extractNftUrls = (nft) => {
  return {
    image: nftUrl(nft, 'image'),
    video: nftUrl(nft, 'video'),
    audio: nftUrl(nft, 'audio'),
    model: nftUrl(nft, 'model'),
    viewer: nftUrl(nft, 'viewer'),
    cl: {
      image: nftUrl(nft, 'image', 'cl'),
      video: nftUrl(nft, 'video', 'cl'),
      audio: nftUrl(nft, 'audio', 'cl'),
      model: nftUrl(nft, 'model', 'cl')
    }
  }
}

// Determine default tab and URL when image is not available
export const getDefaultTabAndUrl = (contentTab, imageUrl, clUrl) => {
  let defaultTab = contentTab
  let defaultUrl = clUrl[contentTab]
  
  if (!imageUrl && contentTab === 'image') {
    if (clUrl.video) {
      defaultTab = 'video'
      defaultUrl = clUrl.video
    } else if (clUrl.model) {
      defaultTab = 'model'
      defaultUrl = clUrl.model
    }
  }
  
  return { defaultTab, defaultUrl }
}

// Build image style object with dynamic properties
export const buildImageStyle = (imageUrl, nft, options = {}) => {
  const style = options.baseStyle || {}
  
  if (imageUrl) {
    if (imageUrl.slice(0, 10) === 'data:image') {
      style.imageRendering = 'pixelated'
    }
    if (nft.deletedAt) {
      style.filter = 'grayscale(1)'
    }
  }
  
  return style
}