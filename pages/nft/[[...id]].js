import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { sha512 } from 'crypto-hash'
import Select from 'react-select'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Buffer } from 'buffer'
import {
  IoCartOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoCloseCircleOutline,
  IoCreateOutline,
  IoFlameOutline,
  IoGlobeOutline,
  IoImagesOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoPricetagOutline,
  IoSendOutline,
  IoStorefrontOutline,
  IoTrendingUpOutline
} from 'react-icons/io5'

import {
  stripText,
  decode,
  network,
  isHexString,
  isValidJson,
  isUrlValid,
  xahauNetwork,
  devNet,
  encode
} from '../../utils'
import { AddressWithIconInline, convertedAmount, tokenToFiat, timeFromNow, usernameOrAddress } from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import {
  nftName,
  bestNftOffer,
  nftSellOfferPurchase,
  mpUrl,
  nftUrl,
  partnerMarketplaces,
  ipfsUrl,
  isNftExplicit,
  isValidTaxon,
  NftImage
} from '../../utils/nft'
import {
  shortHash,
  fullDateAndTime,
  amountFormat,
  expirationExpired,
  nftOfferLink,
  codeHighlight,
  cancelNftOfferButton,
  cancelNftOfferButtons,
  acceptNftSellOfferButton,
  acceptNftBuyOfferButton
} from '../../utils/format'
import { axiosServer, logServerSideError, passHeaders } from '../../utils/axios'

import { nftClass } from '../../styles/pages/nft.module.scss'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let pageMeta = null
  const { id } = query
  //keep it from query instead of params, anyway it is an array sometimes in params too.
  const nftId = id ? (Array.isArray(id) ? id[0] : id) : ''
  if (nftId) {
    try {
      //const selectedCurrency = req.cookies['selectedCurrency']
      const res = await axiosServer({
        method: 'get',
        url:
          'v2/nft/' +
          nftId +
          '?uri=true&metadata=true&collectionDetails=true' +
          (xahauNetwork ? '&remarks=true' : ''), //&history=true&sellOffers=true&buyOffers=true&offersValidate=true&offersHistory=true&convertCurrencies=' +
        //selectedCurrency?.toLowerCase(),
        headers: passHeaders(req)
      })
      pageMeta = res?.data
    } catch (error) {
      logServerSideError(error, req, 'nft')
    }
  }

  return {
    props: {
      id: nftId,
      pageMeta: pageMeta || {},
      isOver18: req.cookies?.isOver18 === 'true',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft', 'popups']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import NftPreview from '../../components/NftPreview'

import { LinkTx } from '../../utils/links'

const ProjectMetadata = dynamic(() => import('../../components/Nft/ProjectMetadata'), { ssr: false })
const EvernodeLease = dynamic(() => import('../../components/Nft/EvernodeLease'), { ssr: false })
const EvernodeRegistartion = dynamic(() => import('../../components/Nft/EvernodeRegistartion'), { ssr: false })

const hasJsonMeta = (nft) => {
  return nft.metadata && nft.metadata.attributes?.metaSource?.toLowerCase() !== 'bithomp'
}

const nftAttributeName = (attribute) => attribute?.trait_type ?? attribute?.name ?? attribute?.traitType
const nftAttributeValue = (attribute) => attribute?.value ?? attribute?.traitValue
const nftAttributeText = (value) => (typeof value === 'object' ? JSON.stringify(value) : stripText(value))

const nftFloorAssetKey = (floor) => {
  const amount = floor?.amount
  return typeof amount === 'object' && amount !== null ? `${amount.currency}:${amount.issuer}` : 'XRP'
}

const lowestComparableNftFloor = (floorPrices) => {
  for (const floor of floorPrices || []) {
    const knownMarketplaceFloor = floor?.private?.destinationDetails?.service ? floor.private : null
    const candidates = [floor?.open, knownMarketplaceFloor].filter(Boolean)
    if (!candidates.length) continue

    const assetKey = nftFloorAssetKey(candidates[0])
    return candidates
      .filter((candidate) => nftFloorAssetKey(candidate) === assetKey)
      .reduce((lowest, candidate) => {
        const amount = typeof candidate.amount === 'object' ? candidate.amount.value : candidate.amount
        const lowestAmount = typeof lowest.amount === 'object' ? lowest.amount.value : lowest.amount
        return Number(amount) < Number(lowestAmount) ? candidate : lowest
      })
  }

  return null
}

const remarkLink = (value) => {
  if (typeof value !== 'string') return ''
  if (/^ipfs:\/\//i.test(value)) return ipfsUrl(value, 'viewer', 'cl') || ''
  return isUrlValid(value) ? value : ''
}

const combineRemarkParts = (remarks = []) => {
  const groups = new Map()

  remarks.forEach((remark) => {
    const match = typeof remark?.name === 'string' && remark.name.match(/^(.*)\.(\d+)$/)
    if (!match) return

    const [, name, part] = match
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push({ remark, part: Number(part) })
  })

  const combinedGroups = new Map()
  groups.forEach((parts, name) => {
    parts.sort((a, b) => a.part - b.part)
    if (parts.length < 2 || !parts.every(({ part }, index) => part === index)) return

    combinedGroups.set(name, {
      name,
      value: parts.map(({ remark }) => String(remark.value ?? '')).join(''),
      flags: { immutable: parts.every(({ remark }) => remark.flags?.immutable) }
    })
  })

  const renderedGroups = new Set()
  return remarks.reduce((result, remark) => {
    const match = typeof remark?.name === 'string' && remark.name.match(/^(.*)\.(\d+)$/)
    const name = match?.[1]
    const combined = name && combinedGroups.get(name)

    if (!combined) result.push(remark)
    else if (!renderedGroups.has(name)) {
      result.push(combined)
      renderedGroups.add(name)
    }

    return result
  }, [])
}

const remarkValue = (value) => {
  if (typeof value !== 'string' || !value || value.length % 2 || !isHexString(value)) {
    return { display: value, copy: value }
  }

  const decoded = decode(value)
  if (decoded !== value) return { display: decoded, copy: decoded }

  const bytes = Buffer.from(value, 'hex')
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  if (isWebp) {
    return {
      display: `${bytes.length} byte WebP image`,
      copy: value,
      image: `data:image/webp;base64,${bytes.toString('base64')}`
    }
  }

  return {
    display: `${value.length / 2} bytes of binary data`,
    copy: value,
    binary: true
  }
}

function JsonRemarkValue({ value }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const bytes = Buffer.byteLength(value, 'utf8')
  const size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`

  return (
    <div className="remark-json">
      <div className="remark-json-summary">
        <span className="grey">JSON · {size}</span>
        <button type="button" className="link remark-json-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? t('table.text.hide') : t('table.text.show')}
        </button>
        <CopyButton text={value} />
      </div>
      {expanded && <div className="remark-json-code">{codeHighlight(value)}</div>}
    </div>
  )
}

function RemarksTable({ remarks }) {
  const { t } = useTranslation(['common', 'nft'])
  const [expanded, setExpanded] = useState(false)
  const combinedRemarks = combineRemarkParts(remarks)
  const collapsible = combinedRemarks.length > 3
  const visibleRemarks = collapsible && !expanded ? combinedRemarks.slice(0, 2) : combinedRemarks

  return (
    <table className="table-details remarks-table">
      <colgroup>
        <col className="remarks-name-column" />
        <col className="remarks-value-column" />
      </colgroup>
      <thead>
        <tr>
          <th colSpan="2">{t('table.remarks', { ns: 'nft' })}</th>
        </tr>
      </thead>
      <tbody>
        {visibleRemarks.map((remark, index) => {
          const value = remarkValue(remark.value)
          const href = remarkLink(value.display)
          const json = typeof value.display === 'string' && isValidJson(value.display)
          return (
            <tr key={`${remark.name || 'remark'}-${index}`}>
              <td className="brake">
                {remark.name || t('table.text.unspecified')}
                {remark.flags?.immutable && (
                  <>
                    <br />
                    <span className="grey">{t('table.immutable', { ns: 'nft' })}</span>
                  </>
                )}
              </td>
              <td className="brake">
                {value.image ? (
                  <div className="remark-image-preview">
                    <img src={value.image} alt={remark.name || 'Remark'} />
                    <div className="remark-image-caption">
                      <span className="grey">{value.display}</span>
                      <CopyButton text={String(value.copy)} />
                    </div>
                  </div>
                ) : json ? (
                  <JsonRemarkValue value={value.display} />
                ) : href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {value.display}
                  </a>
                ) : (
                  <span className={value.binary ? 'grey' : ''}>{String(value.display ?? '')}</span>
                )}{' '}
                {!json && !value.image && value.copy != null && <CopyButton text={String(value.copy)} />}
              </td>
            </tr>
          )
        })}
        {collapsible && (
          <tr className="remarks-toggle-row">
            <td colSpan="2">
              <button type="button" className="link remarks-toggle" onClick={() => setExpanded(!expanded)}>
                {expanded
                  ? t('table.hide-remarks', { ns: 'nft' })
                  : t('table.show-more-remarks', { ns: 'nft', count: combinedRemarks.length - 2 })}
              </button>
            </td>
          </tr>
        )}
        <tr>
          <td>{t('table.raw-data')}</td>
          <td>
            <JsonRemarkValue value={JSON.stringify(remarks)} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// Show more/less for long descriptions
function DescriptionWithShowMore({ text, maxLength = 400 }) {
  const { t } = useTranslation(['common', 'nft'])
  const [expanded, setExpanded] = useState(false)
  if (!text || text.length <= maxLength) return <span>{text}</span>
  return (
    <>
      <span>{expanded ? text : text.slice(0, maxLength) + '... '}</span>
      <span className="link" onClick={() => setExpanded(!expanded)}>
        {' '}
        {expanded ? t('show-less', { ns: 'nft' }) : t('show-more', { ns: 'nft' })}
      </span>
    </>
  )
}

export default function Nft({
  setSignRequest,
  account,
  pageMeta,
  id,
  selectedCurrency,
  refreshPage,
  fiatRate,
  isOver18
}) {
  const { t, i18n } = useTranslation()
  const isFirstRender = useRef(true)
  const accountAddress = account?.address

  const [data, setData] = useState(pageMeta)
  const [decodedUri, setDecodedUri] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showRawMetadata, setShowRawMetadata] = useState(false)
  const [notFoundInTheNetwork, setNotFoundInTheNetwork] = useState(false)

  const [sellOffersFilter, setSellOffersFilter] = useState('active-valid')
  const [buyOffersFilter, setBuyOffersFilter] = useState('active-valid')
  const [filteredSellOffers, setFilteredSellOffers] = useState([])
  const [filteredBuyOffers, setFilteredBuyOffers] = useState([])
  const [countBuyOffers, setCountBuyOffers] = useState(null)
  const [countSellOffers, setCountSellOffers] = useState(null)
  const [isValidDigest, setIsValidDigest] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [rendered, setRendered] = useState(false)
  const [sameCollectionNfts, setSameCollectionNfts] = useState([])
  const [sameCollectionLoading, setSameCollectionLoading] = useState(false)
  const [collectionMarketData, setCollectionMarketData] = useState(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [productCardHeight, setProductCardHeight] = useState(null)
  const productCardRef = useRef(null)

  useEffect(() => {
    setShowAllHistory(false)
  }, [id])

  useEffect(() => {
    if (!data || !hasJsonMeta(data) || !data.digest) return
    const checkDigest = async (metadata, digest) => {
      if (typeof metadata === 'string') {
        metadata = JSON.parse(metadata)
      }
      let ourDigest = await sha512(JSON.stringify(metadata)?.trim())
      ourDigest = ourDigest.toString().slice(0, 64)
      setIsValidDigest(digest?.toUpperCase() === ourDigest?.toUpperCase())
    }
    checkDigest(data.metadata, data.digest)
  }, [data])

  const checkApi = async (opts) => {
    if (!id) return

    if (!isFirstRender.current) {
      setLoading(true)
    }

    setSellOffersFilter('active-valid')
    setBuyOffersFilter('active-valid')

    let noCache = ''
    if (opts?.noCache) {
      noCache = '&timestamp=' + Date.now()
    }

    const response = await axios(
      '/v2/nft/' +
        id +
        '?uri=true&metadata=true&collectionDetails=true&history=true&sellOffers=true&buyOffers=true&offersValidate=true&offersHistory=true' +
        (xahauNetwork ? '&remarks=true' : '') +
        noCache +
        '&convertCurrencies=' +
        selectedCurrency?.toLowerCase() +
        '&projectMetadata=true'
    ).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.flags) {
        if (newdata.history) {
          newdata.history = newdata.history.sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1))
        }
        if (newdata.sellOffers) {
          newdata.sellOffers = newdata.sellOffers.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        }
        if (newdata.buyOffers) {
          newdata.buyOffers = newdata.buyOffers.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        }

        const sellOffersCount = countOffersByFilters(newdata.sellOffers)
        const buyOffersCount = countOffersByFilters(newdata.buyOffers)

        setData(newdata)
        setCountSellOffers(sellOffersCount)
        setCountBuyOffers(buyOffersCount)
        setSellOffersFilter('active-valid')
        setBuyOffersFilter('active-valid')
        if (newdata.warnings?.length > 0) {
          updateWarningMessages(newdata.warnings)
        }
        if (newdata.uri) {
          setDecodedUri(decode(newdata.uri))
        }
        //notFoundInTheNetwork
        if (!newdata.owner && !newdata.deletedAt && !newdata.url && !newdata.metadata) {
          setNotFoundInTheNetwork(true)
        }
      } else {
        if (newdata.error) {
          setErrorMessage(t('error-api.' + newdata.error))
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }
    }
  }

  const isHistoricalOffer = (offer) => !!offer?.canceledAt || !!offer?.acceptedAt

  const countOffersByFilters = (offers) => {
    let count = {
      all: 0,
      active: 0,
      'active-valid': 0,
      'active-invalid': 0,
      historical: 0
    }
    if (offers && offers.length > 0) {
      for (let i = 0; i < offers.length; i++) {
        count.all++
        if (isHistoricalOffer(offers[i])) {
          count.historical++
        } else if (offers[i].valid || offers[i].valid === false) {
          count.active++
          if (offers[i].valid) {
            count['active-valid']++
          } else {
            count['active-invalid']++
          }
        }
      }
    }
    return count
  }

  /*
    {
      "type": "xls20", //"xls35"
      "flags": {
        "burnable":false,
        "onlyXRP":false,
        "trustLine":false,
        "transferable":true
      },
      "issuer":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "nftokenID":"000800005822D634B22590727E3CB2431F03C3B8B041528316E72FD300000001",
      "nftokenTaxon":193871,
      "transferFee":0,
      "sequence":1,
      "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
      "uri":"68747470733A2F2F697066732E696F2F697066732F6261667962656964727274376C6C796A6232717167337533376F61676E77726D707779756F686C74373637676B6E7635707966796A3668706F68342F6D657461646174612E6A736F6E",
      "issuedAt":1667328041,
      "ownerChangedAt":1667328041,
      "deletedAt":null,
      "url":"https://ipfs.io/ipfs/bafybeidrrt7llyjb2qqg3u37oagnwrmpwyuohlt767gknv5pyfyj6hpoh4/metadata.json",
      "metadata":{
        "name":"Pirate Edition",
        "description":"-Sanctum NFTs 007-\n\n&quot;The discovery of treasure in the land of Atlantis.&quot;",
        "external_url":"https://www.xsanctumchain.com/nfts",
        "attributes":[
          {
            "trait_type":"skin",
            "value":"PIRATES SKIN"
          }
        ],
        "category":"collectibles",
        "md5hash":"3c18d8be15e2fa09879dfcf9ab7050d5",
        "is_explicit":false,
        "content_type":"image/jpeg",
        "image_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/image.jpeg",
        "animation_url":"ipfs://ipfs/bafybeievxhvot3tikwz4vupfkzmlybh6rzpwsz4gkscc7obc6dkbyhrvqe/animation.jpeg"
      },
      "history":[
        {
          "owner":"r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG",
          "changedAt":1667328041,
          "ledgerIndex":75463709,
          "txHash":"5F0162B9FB19F2D88F5EC38AEA9984B0BAD11E1CD960B135F4BA128BF980AA4D"
        }
      ],
      "sellOffers":[],
      "buyOffers":null
    }
  */

  useEffect(() => {
    setRendered(true)
    if (!selectedCurrency || !id) return

    if (isFirstRender.current) {
      // check the cahced version
      checkApi()
      isFirstRender.current = false
      return
    }

    checkApi({ noCache: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshPage, selectedCurrency])

  useEffect(() => {
    if (data?.type !== 'xls20' || !data?.issuer || !isValidTaxon(data?.nftokenTaxon)) {
      setSameCollectionNfts([])
      setCollectionMarketData(null)
      return
    }

    let canceled = false
    const loadSameCollectionNfts = async () => {
      setSameCollectionLoading(true)
      setCollectionMarketData(null)
      try {
        const params = new URLSearchParams({
          issuer: data.issuer,
          taxon: String(data.nftokenTaxon),
          limit: '9',
          order: 'mintedNew',
          hasMedia: 'true'
        })
        const collectionId = data.collection || `${data.issuer}:${data.nftokenTaxon}`
        const [nftsResponse, collectionResponse] = await Promise.all([
          axios(`/v2/nfts?${params.toString()}`).catch(() => null),
          axios(`/v2/nft-collection/${encodeURIComponent(collectionId)}?floorPrice=true&statistics=true`).catch(
            () => null
          )
        ])
        const nfts = Array.isArray(nftsResponse?.data?.nfts) ? nftsResponse.data.nfts : []
        if (!canceled) {
          setSameCollectionNfts(nfts.filter((nft) => nft?.nftokenID !== id).slice(0, 8))
          setCollectionMarketData(collectionResponse?.data?.collection || null)
        }
      } catch {
        if (!canceled) {
          setSameCollectionNfts([])
          setCollectionMarketData(null)
        }
      } finally {
        if (!canceled) setSameCollectionLoading(false)
      }
    }

    loadSameCollectionNfts()
    return () => {
      canceled = true
    }
  }, [data?.collection, data?.issuer, data?.nftokenTaxon, data?.type, id])

  const externalUrl = (meta) => {
    let url =
      meta.external_url ||
      meta.external_link ||
      meta.externalUrl ||
      meta.externalURL ||
      (typeof meta.minter === 'string' && meta.minter.includes('https://') && meta.minter) ||
      meta.External_Link
    if (typeof url === 'string' && url.trim()) {
      url = stripText(url).trim()
      let urlText = url
      if (url.toLowerCase().slice(0, 7) === 'ipfs://') {
        urlText = url.slice(7)
        url = ipfsUrl(url, 'viewer', 'cl')
      } else if (url.toLowerCase().slice(0, 8) !== 'https://' && url.slice(0, 7).toLowerCase() !== 'http://') {
        url = 'https://' + url
      }
      return (
        <a href={url} target="_blank" rel="noreferrer nofollow">
          {urlText}
        </a>
      )
    }
    return null
  }

  const nftDescription = (meta) => {
    if (meta.description || meta.desc) {
      return stripText(meta.description || meta.desc)
    } else if (meta.Description) {
      return stripText(meta.Description)
    }
    return null
  }

  const eventType = (event) => {
    if (event.owner) {
      if (event.amount === '0') {
        return t('table.transferred')
      } else if (event.amount) {
        return t('table.sold')
      } else {
        return t('table.minted')
      }
    } else {
      //if there is URI then it's URI modified, otherwise burned
      if (event.uri || event.url) {
        return t('table.updated')
      }
      return <span className="red">{t('table.burned')}</span>
    }
  }

  const marketPlaceUsage = (event) => {
    if (event.amount) {
      return t('table.sold-on')
    } else {
      return t('table.minted-on')
    }
  }

  const ownerName = (nftEvent) => {
    if (nftEvent.owner) {
      if (nftEvent.amount === '0') {
        return t('table.receiver')
      } else if (nftEvent.amount) {
        return t('table.buyer')
      } else {
        return t('table.minter')
      }
    }
  }

  const nftHistory = (history) => {
    /*
      "history": [
        {
          "owner": "rJcEbVWJ7xFjL8J9LsbxBMVSRY2C7DU7rz",
          "changedAt": 1653941441,
          "ledgerIndex": 2577883,
          "txHash": "28261C06ECF7B0E8F5843213122DB62A4B8064C22AD5D947A97AF0F1E604123D"
        }
      ],
    */
    if (history) {
      const visibleHistory = showAllHistory ? history : history.slice(0, 5)
      return visibleHistory.map((nftEvent, i) => {
        const marketplaceUrl = nftEvent.marketplace
          ? mpUrl({
              destination: 'marketplace',
              destinationDetails: { service: nftEvent.marketplace },
              nftokenID: dataId,
              issuer: data?.issuer,
              nftokenTaxon: data?.nftokenTaxon,
              owner: nftEvent.owner
            })
          : ''
        const eventUri = nftEvent.url || (nftEvent.uri ? decode(nftEvent.uri) : '')
        const hasAmount = nftEvent.amount !== undefined && nftEvent.amount !== null && nftEvent.amount !== ''
        const isSale = hasAmount && String(nftEvent.amount) !== '0'

        return (
          <article className="nft-history-event" key={nftEvent.txHash || `${nftEvent.changedAt}-${i}`}>
            <div className="nft-history-event-type">
              <strong>{eventType(nftEvent)}</strong>
            </div>
            <div className="nft-history-participant">
              {nftEvent.owner && (
                <>
                  <small>{ownerName(nftEvent)}</small>
                  <AddressWithIconInline
                    data={nftEvent}
                    name={!nftEvent.amount && nftEvent.minter ? 'minter' : 'owner'}
                    options={{ short: 8 }}
                  />
                </>
              )}
            </div>
            <div className="nft-history-value">
              {isSale && (
                <div className="nft-history-price">
                  <strong>{amountFormat(nftEvent.amount, { tooltip: 'right' })}</strong>
                  {nftEvent.amountInConvertCurrencies?.[selectedCurrency] && (
                    <small>≈ {convertedAmount(nftEvent, selectedCurrency)}</small>
                  )}
                </div>
              )}
              {nftEvent.marketplace && (
                <small>
                  {marketPlaceUsage(nftEvent)}{' '}
                  {marketplaceUrl ? (
                    <a href={marketplaceUrl} target="_blank" rel="noreferrer">
                      {nftEvent.marketplace}
                    </a>
                  ) : (
                    nftEvent.marketplace
                  )}
                </small>
              )}
            </div>
            <div className="nft-history-date">
              <span>
                {timeFromNow(nftEvent.changedAt, i18n)}
                {nftEvent.txHash && <LinkTx tx={nftEvent.txHash} icon={true} />}
              </span>
              <small>{fullDateAndTime(nftEvent.changedAt)}</small>
            </div>
            {eventUri && (
              <div className="nft-history-uri">
                <small>{t('table.uri')}</small>
                <span title={eventUri}>{eventUri}</span>
                <CopyButton text={eventUri} />
              </div>
            )}
          </article>
        )
      })
    }
  }

  const nftOfferStatus = (offer) => {
    if (offer.validationErrors?.length) {
      return {
        text: offer.validationErrors.map((error) => t('table.text-status.' + error)).join(', '),
        tone: 'danger'
      }
    }
    if (offer.canceledAt) return { text: t('table.canceled'), tone: 'danger' }
    if (offer.acceptedAt) return { text: t('table.accepted'), tone: 'success' }
    if (offer.valid === true) return { text: t('table.filter.valid'), tone: 'success' }
    if (offer.valid === false) return { text: t('table.filter.invalid'), tone: 'danger' }
    return null
  }

  const nftOffers = (offers, type) => {
    if (type !== 'sell' && type !== 'buy') {
      return <div className="nft-offers-empty">Error, no offer type</div>
    }
    /*
      {
        "amount": "1000000000",
        "offerIndex": "D9C7F16C02CEBFF5D4D17F891503253AE6485F6863DEC25D2B095B919D478E06",
        "owner": "rsr1kvnWTNNxaX24Ny2ccE3onPMukiEHY3",
        "expiration": null,
        "destination": null,
        "createdLedgerIndex": 75640602,
        "createdTxHash": "AF8A46B6C49DAF95B44BC34B8961D19B19B5D5C52071BEA3CF0DEE038BFCDEC1",
        "createdAt": 1667249811,
        "valid": true
      }
    */

    const buyerOrSeller = type === 'sell' ? t('table.seller') : t('table.buyer')

    if (offers.length > 0) {
      return offers.map((offer, i) => {
        const tradeButton = offer.valid
          ? type === 'sell'
            ? buyButton([offer])
            : sellButton([offer])
          : null
        const canCancelOffer =
          !offer.canceledAt &&
          !offer.acceptedAt &&
          ((accountAddress && offer.owner && accountAddress === offer.owner) ||
            offer.validationErrors?.includes('Offer is expired') ||
            (accountAddress && offer.destination === accountAddress))
        const status = nftOfferStatus(offer)

        return (
          <article className="nft-offer-card" key={offer.offerIndex || i}>
            <div className="nft-offer-card-top">
              <div className="nft-offer-card-price">
                <span>{t('table.amount')}</span>
                <div>
                  <strong>{amountFormat(offer.amount, { withIssuer: true })}</strong>
                  {!offer.canceledAt && !offer.acceptedAt && fiatRate > 0 && (
                    <small>
                      {tokenToFiat({
                        amount: offer.amount,
                        selectedCurrency,
                        fiatRate
                      })}
                    </small>
                  )}
                </div>
              </div>
              {canCancelOffer ? (
                <div className="nft-offer-card-cancel">
                  {cancelNftOfferButton(t, setSignRequest, accountAddress, offer, type, data.type, id, {
                    hideAmount: true
                  })}
                </div>
              ) : tradeButton ? (
                <div className="nft-offer-card-trade">{tradeButton}</div>
              ) : (
                status && <span className={`nft-offer-status is-${status.tone}`}>{status.text}</span>
              )}
            </div>

            {offer.offerIndex && (
              <div className="nft-offer-card-id">
                <span>{t('table.offer')}</span>
                <strong>{nftOfferLink(offer.offerIndex, 12)}</strong>
              </div>
            )}

            <div className="nft-offer-card-details">
              <div>
                <span>{buyerOrSeller}</span>
                <strong>
                  <AddressWithIconInline data={offer} name="owner" options={{ short: 8 }} />
                </strong>
              </div>
              {offer.createdAt && (
                <div>
                  <span>{t('table.placed')}</span>
                  <strong className="nft-offer-date">
                    <span>{timeFromNow(offer.createdAt, i18n)}</span>
                    <small>
                      {fullDateAndTime(offer.createdAt)} <LinkTx tx={offer.createdTxHash} icon={true} />
                    </small>
                  </strong>
                </div>
              )}
              {offer.acceptedAt && (
                <div>
                  <span>{t('table.accepted')}</span>
                  <strong>
                    {fullDateAndTime(offer.acceptedAt)} <LinkTx tx={offer.acceptedTxHash} icon={true} />
                  </strong>
                </div>
              )}
              {offer.canceledAt && (
                <div>
                  <span>{t('table.canceled')}</span>
                  <strong>
                    {fullDateAndTime(offer.canceledAt)} <LinkTx tx={offer.canceledTxHash} icon={true} />
                  </strong>
                </div>
              )}
              {offer.expiration && (
                <div>
                  <span>{expirationExpired(t, offer.expiration)}</span>
                  <strong>{fullDateAndTime(offer.expiration, 'expiration')}</strong>
                </div>
              )}
              {offer.destination && (
                <div>
                  <span>{t('table.destination')}</span>
                  <strong>
                    <AddressWithIconInline data={offer} name="destination" options={{ short: 8 }} />
                  </strong>
                </div>
              )}
            </div>

          </article>
        )
      })
    }

    return <div className="nft-offers-empty">{t('table.text.no-offers')}</div>
  }

  const offerHistoryFilters = (type, defaultOption = false) => {
    let countOffers = {
      buy: countBuyOffers,
      sell: countSellOffers
    }
    if (defaultOption) {
      return { value: 'active-valid', label: t('table.filter.valid') + ' (' + countOffers[type]['active-valid'] + ')' }
    }

    let options = [
      { value: 'active-valid', label: t('table.filter.valid') + ' (' + countOffers[type]['active-valid'] + ')' }
    ]

    if (countOffers[type]['active-invalid'] > 0) {
      options.push({
        value: 'active-invalid',
        label: t('table.filter.invalid') + ' (' + countOffers[type]['active-invalid'] + ')'
      })
    }

    if (
      countOffers[type].active > 0 &&
      countOffers[type].active !== countOffers[type]['active-valid'] &&
      countOffers[type].active !== countOffers[type]['active-invalid']
    ) {
      options.push({ value: 'active', label: t('table.filter.active') + ' (' + countOffers[type].active + ')' })
    }

    if (countOffers[type].historical > 0) {
      options.push({
        value: 'historical',
        label: t('table.filter.historical') + ' (' + countOffers[type].historical + ')'
      })
    }

    if (
      countOffers[type].all !== countOffers[type]['active-valid'] &&
      countOffers[type].all !== countOffers[type]['active-invalid'] &&
      countOffers[type].all !== countOffers[type].active &&
      countOffers[type].all !== countOffers[type].historical
    ) {
      options.push({ value: 'all', label: t('table.filter.all') + ' (' + countOffers[type].all + ')' })
    }

    return options
  }

  const filterOffers = (unfilteredOffers, filter, setFilteredOffers) => {
    if (!unfilteredOffers) {
      setFilteredOffers([])
      return
    }
    if (filter === 'all') {
      setFilteredOffers(unfilteredOffers)
    } else if (filter === 'historical') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return isHistoricalOffer(offer)
        })
      )
    } else if (filter === 'active') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return !isHistoricalOffer(offer) && (offer.valid || offer.valid === false)
        })
      )
    } else if (filter === 'active-valid') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return !isHistoricalOffer(offer) && offer.valid
        })
      )
    } else if (filter === 'active-invalid') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return !isHistoricalOffer(offer) && offer.valid === false
        })
      )
    }
  }

  useEffect(() => {
    if (!data || !buyOffersFilter) return
    filterOffers(data.buyOffers, buyOffersFilter, setFilteredBuyOffers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, buyOffersFilter])

  useEffect(() => {
    if (!data || !sellOffersFilter) return
    filterOffers(data.sellOffers, sellOffersFilter, setFilteredSellOffers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sellOffersFilter])

  const offersFilter = (type) => {
    let offersCount = countSellOffers
    let setFilter = setSellOffersFilter
    let filter = sellOffersFilter
    if (type === 'buy') {
      setFilter = setBuyOffersFilter
      offersCount = countBuyOffers
      filter = buyOffersFilter
    }
    //dont show if there is no offers, or when all offers are valid
    if (offersCount.all === 0 || offersCount['active-valid'] === offersCount.all) {
      return <></>
    }
    const options = offerHistoryFilters(type)
    return (
      <Select
        options={options}
        value={options.find((option) => option.value === filter) || null}
        onChange={(value) => setFilter(value.value)}
        isSearchable={false}
        className="offer-history-filter-select"
        classNamePrefix="react-select"
        instanceId={'offer-history-filter-select-' + type}
        menuPortalTarget={rendered ? document.body : null}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 })
        }}
      />
    )
  }

  const buyButton = (sellOffers) => {
    let best = null
    if (data.type === 'xls35') {
      if (!data.amount && !data.destination) return ''
      best = {
        amount: data.amount || '0',
        owner: data.owner,
        destination: data.destination,
        nftokenID: data.nftokenID
      }
    } else {
      //'xls20'
      if (!sellOffers) return ''
      // here we discard xls20 expired offers and all the invalid ones for different reasons
      sellOffers = sellOffers.filter(function (offer) {
        return offer.valid
      })
      //best xrp offer available or an IOU offer
      //we should get the best IOU offer too... and show both XRP and IOU
      best = bestNftOffer(sellOffers, accountAddress, 'sell')
    }

    if (!best) return ''

    //do not show buy button, if's my own offer (Cancel button will be shown)
    if (best.owner && accountAddress && accountAddress === best.owner) {
      return ''
    }

    if (data.type === 'xls35') {
      if (!best.destination || (accountAddress && accountAddress === best.destination)) {
        return acceptNftSellOfferButton(t, setSignRequest, best, data.type, { icon: <IoCartOutline /> })
      }
      return ''
    }

    const purchase = nftSellOfferPurchase({
      offer: best,
      nftId: id,
      owner: data.owner || best.owner,
      issuer: data.issuer,
      buyer: accountAddress
    })
    if (!purchase) return ''

    if (purchase.type === 'external') {
      return (
        <a className="button-action wide center" href={purchase.url} target="_blank" rel="noreferrer">
          <IoCartOutline aria-hidden="true" />
          <span>
            {t('button.nft.buy-for-amount-on', {
              amount: amountFormat(purchase.displayAmount),
              service: purchase.service
            })}
          </span>
        </a>
      )
    }

    return (
      <button className="button-action wide center" onClick={() => setSignRequest(purchase.signRequest)}>
        <IoCartOutline aria-hidden="true" />
        <span>{t('button.nft.buy-for-amount', { amount: amountFormat(purchase.displayAmount) })}</span>
      </button>
    )
  }

  const sellButton = (buyOffers) => {
    let best = null

    if (data.type === 'xls35') {
      // there is no sell button, but there list for sale button "create sell offer"
      return ''
    } else {
      //'xls20'
      if (!buyOffers) return ''
      // here we discard xls20 expired offers and all the invalid ones for different reasons
      buyOffers = buyOffers.filter(function (offer) {
        return offer.valid
      })
      //best xrp offer available or an IOU offer
      //we should get the best IOU offer too... and show both XRP and IOU
      best = bestNftOffer(buyOffers, accountAddress, 'buy')
    }

    if (!best) return ''

    //don't show sell button, if's my own offer (Cancel button will be shown)
    if (best.owner && accountAddress && accountAddress === best.owner) {
      return ''
    }

    //show sell button only for the NFT owner
    if (data.owner && accountAddress && accountAddress === data.owner) {
      // if the buy offer destination is a partner marketplace (e.g. bidds),
      // we can't accept it directly — create a counter sell offer via the broker instead
      if (best.destination && partnerMarketplaces[best.destination]) {
        const { fee, name, feeText } = partnerMarketplaces[best.destination]

        // seller receives best.amount * (1 - fee) — floor ensures bidds gets at least fee%
        let sellAmount
        if (best.amount?.value) {
          sellAmount = {
            value: (parseFloat(best.amount.value) * (1 - fee)).toString(),
            currency: best.amount.currency,
            issuer: best.amount.issuer
          }
        } else {
          sellAmount = Math.floor(parseInt(best.amount) * (1 - fee)).toString()
        }

        const request = {
          TransactionType: 'NFTokenCreateOffer',
          Account: data.owner,
          NFTokenID: id,
          Flags: 1, // sell offer
          Destination: best.destination,
          Amount: sellAmount
        }

        return (
          <button
            className="button-action wide center"
            onClick={() =>
              setSignRequest({
                request,
                broker: {
                  name,
                  fee: Math.ceil(best.amount > 0 ? best.amount * fee : 1),
                  nftPrice: best.amount,
                  feeText
                }
              })
            }
          >
            <IoStorefrontOutline aria-hidden="true" />
            <span>
              {t('button.nft.sell-for-amount', {
                amount: amountFormat(best.amount?.value ? sellAmount : parseInt(sellAmount))
              })}
            </span>
          </button>
        )
      }

      return acceptNftBuyOfferButton(t, setSignRequest, best, { icon: <IoStorefrontOutline /> })
    }

    return ''
  }

  const makeOfferButton = (sellOffers) => {
    // if removed do not offer to add an offer
    // if not transferable, do not show button to create offers unless the issuer is logged in.
    if (!id || data.deletedAt || (!data.flags.transferable && (!accountAddress || accountAddress !== data.issuer)))
      return ''
    //if signed in and user is the nft's owner -> make a sell offer, otherwise make a buy offer (no flag)
    const sell = data?.owner && accountAddress && accountAddress === data.owner

    let request = {
      TransactionType: 'NFTokenCreateOffer',
      Account: sell ? data.owner : null,
      NFTokenID: id
    }

    let hasAValidSellOffer = false

    if (sell) {
      if (sellOffers) {
        sellOffers = sellOffers.filter(function (offer) {
          return offer.valid
        })
        if (sellOffers.length) {
          hasAValidSellOffer = true
        }
      }
      request.Flags = 1
    } else {
      request.Owner = data.owner
    }

    return (
      <button
        className={`button-action wide center${hasAValidSellOffer ? ' nft-secondary-action' : ''}`}
        onClick={() =>
          setSignRequest({
            request
          })
        }
      >
        <IoPricetagOutline aria-hidden="true" />
        <span>
          {sell
            ? hasAValidSellOffer
              ? t('button.nft.add-another-sell-offer')
              : t('button.nft.list-for-sale')
            : t('button.nft.make-offer')}
        </span>
      </button>
    )
  }

  const xls35SellOfferButton = () => {
    //signed in and user is the nft's owner, and it is xls35
    if (!id || !data?.owner || !accountAddress || accountAddress !== data.owner || data.type !== 'xls35') return ''

    //"Destination" - optional
    let request = {
      Account: data.owner,
      TransactionType: 'URITokenCreateSellOffer',
      URITokenID: id
    }

    return (
      <button
        className="button-action wide center"
        onClick={() =>
          setSignRequest({
            request
          })
        }
      >
        <IoPricetagOutline aria-hidden="true" />
        <span>
          {countSellOffers?.['active-valid'] > 0 ? t('button.nft.update-sell-offer') : t('button.nft.list-for-sale')}
        </span>
      </button>
    )
  }

  const transferButton = () => {
    if (!id || data.deletedAt || !data?.owner || !accountAddress || accountAddress !== data.owner) return ''
    if (data.type === 'xls20' && !data.flags?.transferable && accountAddress !== data.issuer) return ''

    const request =
      data.type === 'xls35'
        ? {
            Account: data.owner,
            TransactionType: 'URITokenCreateSellOffer',
            URITokenID: id
          }
        : {
            TransactionType: 'NFTokenCreateOffer',
            Account: data.owner,
            NFTokenID: id,
            Flags: 1
          }

    return (
      <button
        className="button-action wide center"
        onClick={() =>
          setSignRequest({
            request,
            action: 'nftTransfer'
          })
        }
      >
        <IoSendOutline aria-hidden="true" />
        <span>{t('button.nft.transfer')}</span>
      </button>
    )
  }

  const burnButton = () => {
    if (!id || data.deletedAt) return '' //if it is already burned do not offer to burn

    // if not signed, or signed but not an owner - do not show burn button
    // may be we should show it for burnable nfts (with a flag) for the minters also?
    if (
      !(data?.owner && accountAddress && accountAddress === data.owner) &&
      !(data?.issuer && accountAddress && accountAddress === data.issuer)
    )
      return ''

    let request = null

    if (data.type === 'xls35') {
      if (accountAddress !== data.owner) return ''
      request = {
        Account: data.owner,
        TransactionType: 'URITokenBurn',
        URITokenID: id
      }
    } else {
      if (accountAddress === data.owner) {
        request = {
          TransactionType: 'NFTokenBurn',
          Account: data.owner,
          NFTokenID: id
        }
      }
      if (accountAddress === data.issuer) {
        request = {
          TransactionType: 'NFTokenBurn',
          Account: data.issuer,
          Owner: data.owner,
          NFTokenID: id
        }
      }
    }

    return (
      <button
        className="button-action wide center nft-danger-action"
        onClick={() =>
          setSignRequest({
            request
          })
        }
      >
        <IoFlameOutline aria-hidden="true" />
        <span>{t('button.nft.burn')}</span>
      </button>
    )
  }

  const updateUriButton = () => {
    if (!id || !data.flags?.mutable || data.type === 'xls35' || data.deletedAt) return '' //if it is not mutable or deleted

    // if not signed, or signed but not an issuer - do not show the button
    if (!(data?.issuer && accountAddress && accountAddress === data.issuer)) return ''

    let request = {
      TransactionType: 'NFTokenModify',
      Account: accountAddress,
      NFTokenID: id
    }

    if (data.owner !== accountAddress) {
      request.Owner = data.owner
    }

    return (
      <button
        className="button-action wide center"
        onClick={() =>
          setSignRequest({
            request
          })
        }
      >
        <IoCreateOutline aria-hidden="true" />
        <span>{t('modify-uri', { ns: 'nft' })}</span>
      </button>
    )
  }

  const setAsAvatarButton = (data) => {
    if (!id || data.deletedAt) return '' //if it is already burned do not offer to burn

    if (isNftExplicit(data)) return '' //if it is explicit, do not offer to set as avatar

    if (!imageUrl) return '' //if there is no image, do not offer to set as avatar

    //Only the current owner can set this NFT as their avatar.
    if (devNet || !accountAddress || accountAddress !== data.owner) return ''

    const command = {
      action: 'setAvatar',
      url: imageUrl,
      timestamp: new Date().toISOString()
    }

    const request = {
      Account: data.owner,
      TransactionType: 'AccountSet',
      Memos: [
        {
          Memo: {
            MemoType: encode('json'),
            MemoData: encode(JSON.stringify(command))
          }
        }
      ]
    }

    return (
      <button
        className="button-action wide center"
        onClick={() =>
          setSignRequest({
            request,
            data: {
              signOnly: true,
              action: 'set-avatar',
              redirect: 'account'
            }
          })
        }
      >
        <IoPersonOutline aria-hidden="true" />
        <span>{t('set-as-avatar', { ns: 'nft' })}</span>
      </button>
    )
  }

  const imageUrl = nftUrl(pageMeta, 'image')

  const typeName = (type) => {
    if (typeof type !== 'string') return ''
    if (type.substring(0, 3).toLowerCase() === 'xls' && type.charAt(4) !== '-') {
      return 'XLS-' + type.substring(3)
    }
    return type
  }

  const updateWarningMessages = async (warnings) => {
    for (let i = 0; i < warnings.length; i++) {
      if (warnings[i].message?.indexOf('crawler is not up to date') > -1) {
        const response = await axios('v2/statistics/' + (xahauNetwork ? 'uritokens' : 'nftokens') + '/crawler')
        let lastUpdate = ''
        if (response?.data?.ledgerTime) {
          lastUpdate = fullDateAndTime(response.data.ledgerTime, null, { asText: true })
        }
        warnings[i].message = t('table.warnings.nft-crawler-delay', { ns: 'nft', lastUpdate })
      }
    }
    setWarnings(warnings)
  }

  const evernodeNft = (data) => {
    return data.metadata?.evernodeRegistration || data.metadata?.evernodeLease
  }

  const dataId = data?.nftokenID || data?.uritokenID
  const hasCurrentData = dataId === id
  const showPageLoading = loading && !hasCurrentData
  const pageNft = hasCurrentData ? data : pageMeta
  const pageTitle = nftName(pageNft) || `NFT ${shortHash(id)}`
  const pageDescription = pageNft?.metadata ? nftDescription(pageNft.metadata) : null
  const collectionDescription = stripText(pageNft?.collectionDetails?.description).trim()
  const descriptionsMatch = collectionDescription && collectionDescription === stripText(pageDescription).trim()
  const heroDescription = descriptionsMatch ? null : pageDescription
  const collectionLabel =
    pageNft?.metadata?.collection?.name ||
    pageNft?.collectionDetails?.name ||
    pageNft?.collectionDetails?.family ||
    null
  const collectionHref = pageNft?.collection
    ? `/nft-collection/${pageNft.collection}`
    : pageNft?.issuer && isValidTaxon(pageNft?.nftokenTaxon)
      ? `/nft-explorer?issuer=${pageNft.issuer}&taxon=${pageNft.nftokenTaxon}`
      : null
  const validSellOffers = (pageNft?.sellOffers || []).filter((offer) => offer?.valid)
  const validBuyOffers = (pageNft?.buyOffers || []).filter((offer) => offer?.valid)
  const bestListing = bestNftOffer(validSellOffers, accountAddress, 'sell')
  const bestBid = bestNftOffer(validBuyOffers, accountAddress, 'buy')
  const currentOwnerEvent = pageNft?.history?.find(
    (event) => event?.owner === pageNft?.owner && event?.changedAt === pageNft?.ownerChangedAt
  )
  const mintEvent = pageNft?.history?.find((event) => event?.owner && !event?.amount)
  const mintMarketplaceUrl = mintEvent?.marketplace
    ? mpUrl({
        destination: 'marketplace',
        destinationDetails: { service: mintEvent.marketplace },
        nftokenID: dataId,
        issuer: pageNft?.issuer,
        nftokenTaxon: pageNft?.nftokenTaxon,
        owner: mintEvent.owner
      })
    : ''
  const lastSale = pageNft?.history?.find((event) => event?.amount && event.amount !== '0')
  const lastSaleFiat = lastSale ? convertedAmount(lastSale, selectedCurrency, { short: true }) : null
  const lastSaleMarketplaceUrl = lastSale?.marketplace
    ? mpUrl({
        destination: 'marketplace',
        destinationDetails: { service: lastSale.marketplace },
        nftokenID: dataId,
        issuer: pageNft?.issuer,
        nftokenTaxon: pageNft?.nftokenTaxon,
        owner: pageNft?.owner
      })
    : ''
  const metadataAttributes = Array.isArray(pageNft?.metadata?.attributes)
    ? pageNft.metadata.attributes.filter(
        (attribute) => nftAttributeName(attribute) != null && nftAttributeValue(attribute) != null
      )
    : []
  const nftExternalLink = pageNft?.metadata ? externalUrl(pageNft.metadata) : null
  const collectionFloor = lowestComparableNftFloor(collectionMarketData?.floorPrices)
  const collectionFloorHref =
    pageNft?.issuer && isValidTaxon(pageNft?.nftokenTaxon)
      ? `/nft-explorer?issuer=${pageNft.issuer}&taxon=${pageNft.nftokenTaxon}&list=onSale&saleDestination=publicAndKnownBrokers`
      : collectionHref
  const hasCancelableOffers = Boolean(accountAddress) &&
    [...(pageNft?.sellOffers || []), ...(pageNft?.buyOffers || [])].some(
      (offer) => !offer.acceptedAt && !offer.canceledAt && offer.owner === accountAddress
    )
  const canManageNft =
    accountAddress &&
    !pageNft?.deletedAt &&
    (accountAddress === pageNft?.owner || (pageNft?.type === 'xls20' && accountAddress === pageNft?.issuer))
  const hasSecondaryNftActions = Boolean(hasCancelableOffers || canManageNft)
  const hasNftOffers = Boolean(countSellOffers?.all || countBuyOffers?.all)

  useEffect(() => {
    const productCard = productCardRef.current
    if (!productCard || typeof ResizeObserver === 'undefined') return

    setProductCardHeight(null)
    let updateTimer = null
    const updateHeight = () => {
      const nextHeight = Math.ceil(productCard.getBoundingClientRect().height)
      clearTimeout(updateTimer)
      updateTimer = setTimeout(() => {
        setProductCardHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight))
      }, 120)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(productCard)

    return () => {
      clearTimeout(updateTimer)
      observer.disconnect()
    }
  }, [dataId])

  return (
    <div className={nftClass}>
      <SEO
        page="NFT"
        title={
          (nftName(pageMeta) || pageMeta?.nftokenID || 'NFT') + (pageMeta?.nftSerial ? ' #' + pageMeta?.nftSerial : '')
        }
        description={
          (pageMeta?.metadata?.collection?.name ||
            pageMeta?.metadata?.description ||
            pageMeta?.metadata?.desc ||
            (!pageMeta?.nftokenID ? t('desc', { ns: 'nft' }) : '')) +
          (pageMeta?.issuer ? ' - ' + t('table.issuer') + ': ' + usernameOrAddress(pageMeta, 'issuer') : '')
        }
        image={{ file: imageUrl }}
      />
      <div className="content-profile nft-detail-page">
        {id ? (
          <>
            {showPageLoading ? (
              <div className="center" style={{ marginTop: '80px' }}>
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div className="center orange bold">{errorMessage}</div>
                ) : (
                  <>
                    {hasCurrentData && data.flags && (
                      <>
                        <section
                          className="nft-overview"
                          style={productCardHeight ? { '--nft-product-height': `${productCardHeight}px` } : undefined}
                        >
                          <aside className={`nft-media-card${productCardHeight ? ' is-measured' : ''}`}>
                            {!notFoundInTheNetwork ? (
                              rendered ? (
                                <NftPreview
                                  nft={data}
                                  compact
                                  maxHeight="var(--nft-preview-max-height, min(68vh, 720px))"
                                  initialIsOver18={isOver18}
                                />
                              ) : (
                                <div className="nft-media-poster">
                                  <NftImage
                                    nft={data}
                                    sourceSize={960}
                                    style={{ width: '100%', height: 'auto', marginRight: 0 }}
                                  />
                                </div>
                              )
                            ) : (
                              <div className="orange">
                                <Trans i18nKey="nft-not-found-on-that-network" ns="nft">
                                  This NFT wasn't found on the <b>{{ network }}</b> network.
                                </Trans>
                              </div>
                            )}
                          </aside>

                          <section ref={productCardRef} className="nft-product-card">
                              <div className="nft-product-heading">
                                {collectionHref && (
                                  <Link href={collectionHref} className="nft-product-collection">
                                    <IoImagesOutline aria-hidden="true" />
                                    <span>{collectionLabel || t('view-all-collection', { ns: 'nft' })}</span>
                                  </Link>
                                )}
                                <h1>{pageTitle}</h1>
                                {heroDescription && (
                                  <p>
                                    <DescriptionWithShowMore text={heroDescription} maxLength={220} />
                                  </p>
                                )}
                                {data.owner && (
                                  <div className="nft-product-owner">
                                    <div className="nft-product-owner-identity">
                                      <span>{t('table.owner')}</span>
                                      <AddressWithIconInline data={data} name="owner" />
                                    </div>
                                    {data.ownerChangedAt && (
                                      <div className="nft-product-owner-since">
                                        <span>{t('since', { ns: 'nft' })}</span>
                                        <strong>{timeFromNow(data.ownerChangedAt, i18n)}</strong>
                                        <small>
                                          {fullDateAndTime(data.ownerChangedAt)}
                                          {currentOwnerEvent?.txHash && <LinkTx tx={currentOwnerEvent.txHash} icon={true} />}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={`nft-purchase-panel${bestListing ? '' : ' is-empty'}`}>
                                <div className="nft-listing-price">
                                  <span>
                                    {t('table.price')}
                                    {bestListing && (
                                      <span className="nft-listing-visibility">
                                        {' ('}
                                        {bestListing.destinationDetails?.service ||
                                          (bestListing.destination ? t('table.text.private-offer') : t('tabs.public'))}
                                        {')'}
                                      </span>
                                    )}
                                  </span>
                                  <strong>
                                    {bestListing?.offerIndex ? (
                                      <Link href={`/nft-offer/${bestListing.offerIndex}`}>
                                        {amountFormat(bestListing.amount, { short: true })}
                                      </Link>
                                    ) : bestListing ? (
                                      amountFormat(bestListing.amount, { short: true })
                                    ) : (
                                      t('table.text.no-offers')
                                    )}
                                  </strong>
                                  {bestListing && validSellOffers.length > 1 && (
                                    <small>
                                      <a className="nft-offer-count-link" href="#nft-sell-offers">
                                        {t('sell-offers-count', {
                                          ns: 'nft',
                                          count: validSellOffers.length
                                        })}
                                      </a>
                                    </small>
                                  )}
                                </div>
                                <div className="nft-primary-actions">
                                  {buyButton(data.sellOffers)}
                                  {sellButton(data.buyOffers)}
                                  {data.type === 'xls20' && makeOfferButton(data.sellOffers)}
                                  {data.type === 'xls35' && xls35SellOfferButton()}
                                </div>
                              </div>

                              {hasSecondaryNftActions && (
                                <div className="nft-secondary-actions">
                                  {transferButton()}
                                  {cancelNftOfferButtons(t, setSignRequest, accountAddress, data, {
                                    icon: <IoCloseCircleOutline aria-hidden="true" />
                                  })}
                                  {updateUriButton()}
                                  {setAsAvatarButton(data)}
                                  {burnButton()}
                                </div>
                              )}

                              <div className="nft-facts-grid">
                                <div>
                                  <span>{t('table.buy-offers')}</span>
                                  <strong>
                                    {bestBid?.offerIndex ? (
                                      <Link href={`/nft-offer/${bestBid.offerIndex}`}>
                                        {amountFormat(bestBid.amount, { short: true })}
                                      </Link>
                                    ) : bestBid ? (
                                      amountFormat(bestBid.amount, { short: true })
                                    ) : (
                                      t('table.text.no-offers')
                                    )}
                                  </strong>
                                  {validBuyOffers.length > 1 && <small>{validBuyOffers.length}</small>}
                                </div>
                                <div>
                                  <span>{t('last-sale', { ns: 'nft' })}</span>
                                  <div className="nft-last-sale-value">
                                    <strong>
                                      {lastSale?.txHash ? (
                                        <LinkTx tx={lastSale.txHash}>
                                          {amountFormat(lastSale.amount, { short: true })}
                                        </LinkTx>
                                      ) : lastSale ? (
                                        amountFormat(lastSale.amount, { short: true })
                                      ) : (
                                        '—'
                                      )}
                                    </strong>
                                    {lastSale && (
                                      <small>
                                        {lastSaleFiat && <span>≈ {lastSaleFiat}</span>}
                                        {lastSale.marketplace && (
                                          <span className="nft-marketplace-link">
                                            <IoStorefrontOutline aria-hidden="true" />
                                          {lastSaleMarketplaceUrl ? (
                                            <a href={lastSaleMarketplaceUrl} target="_blank" rel="noreferrer">
                                              {lastSale.marketplace}
                                            </a>
                                          ) : (
                                            lastSale.marketplace
                                          )}
                                          </span>
                                        )}
                                      </small>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span>{t('table.transfer-fee')}</span>
                                  <strong>{data.transferFee ? `${data.transferFee / 1000}%` : '0%'}</strong>
                                </div>
                                <div>
                                  <span>NFT ID</span>
                                  <strong className="nft-context-id" title={dataId}>
                                    <span>{dataId}</span>
                                    <CopyButton text={dataId} size={16} />
                                  </strong>
                                </div>
                                <div>
                                  <span>{t('table.serial')}</span>
                                  <strong>{data.nftSerial ?? data.sequence ?? '—'}</strong>
                                </div>
                                <div className="nft-minted-metric">
                                  <span>
                                    {mintEvent?.marketplace ? (
                                      <>
                                        {t('table.minted-on')}{' '}
                                        <span className="nft-marketplace-link">
                                          <IoStorefrontOutline aria-hidden="true" />
                                          {mintMarketplaceUrl ? (
                                            <a href={mintMarketplaceUrl} target="_blank" rel="noreferrer">
                                              {mintEvent.marketplace}
                                            </a>
                                          ) : (
                                            mintEvent.marketplace
                                          )}
                                        </span>
                                      </>
                                    ) : (
                                      t('table.minted')
                                    )}
                                  </span>
                                  <strong className="nft-minted-date">
                                    <span>{data.issuedAt ? timeFromNow(data.issuedAt, i18n) : '—'}</span>
                                    {data.issuedAt && (
                                      <small>
                                        {fullDateAndTime(data.issuedAt)}{' '}
                                        {mintEvent?.txHash && <LinkTx tx={mintEvent.txHash} icon={true} />}
                                      </small>
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <div className="nft-badges">
                                {data.deletedAt && <span className="danger">{t('table.burned')}</span>}
                                {data.flags.burnable && <span>{t('nft-statistics.burnable')}</span>}
                                {data.flags.onlyXRP && <span>{t('nft-statistics.only-xrp')}</span>}
                                {data.flags.transferable && <span>{t('nft-statistics.transferable')}</span>}
                                {!data.flags.mutable && <span>{t('table.immutable', { ns: 'nft' })}</span>}
                              </div>
                          </section>
                        </section>

                        <div className="nft-context-grid">
                              {(data.type === 'xls20' || data.collectionDetails) && (
                                <section className="nft-context-card collection-card">
                                  <div className="nft-context-heading">
                                    <span>{t('table.collection')}</span>
                                    <div className="nft-collection-title-row">
                                      <h2>
                                        {collectionHref ? (
                                          <Link href={collectionHref}>
                                            {collectionLabel || `${t('table.taxon')} ${data.nftokenTaxon}`}
                                          </Link>
                                        ) : (
                                          collectionLabel || t('table.collection')
                                        )}
                                      </h2>
                                      {nftExternalLink && (
                                        <div className="nft-collection-website">
                                          <IoGlobeOutline aria-hidden="true" />
                                          {nftExternalLink}
                                        </div>
                                      )}
                                    </div>
                                    {collectionDescription && (
                                      <p>
                                        <DescriptionWithShowMore text={collectionDescription} maxLength={120} />
                                      </p>
                                    )}
                                  </div>
                                  <div className="nft-collection-identity">
                                    <div>
                                      <span>{t('table.issuer')}</span>
                                      <strong>
                                        <AddressWithIconInline data={data} name="issuer" />
                                      </strong>
                                    </div>
                                    {data.type === 'xls20' && isValidTaxon(data.nftokenTaxon) && (
                                      <div>
                                        <span>{t('table.taxon')}</span>
                                        <strong>{data.nftokenTaxon}</strong>
                                      </div>
                                    )}
                                  </div>
                                  <div className="nft-context-metrics">
                                    <div className={collectionFloor ? 'nft-floor-metric-with-fiat' : undefined}>
                                      <span>{t('collection-floor', { ns: 'nft' })}</span>
                                      <strong>
                                        {collectionFloor ? (
                                          amountFormat(collectionFloor.amount, { short: true })
                                        ) : (
                                          t('no-nfts-for-sale', { ns: 'nft' })
                                        )}
                                      </strong>
                                      {collectionFloor && (
                                        <small>
                                          {tokenToFiat({
                                            amount: collectionFloor.amount,
                                            selectedCurrency,
                                            fiatRate,
                                            short: true
                                          })}
                                        </small>
                                      )}
                                      {collectionFloor &&
                                        data.type === 'xls20' &&
                                        isValidTaxon(data.nftokenTaxon) &&
                                        collectionFloorHref && (
                                        <Link className="nft-context-metric-action" href={collectionFloorHref}>
                                          <IoPricetagOutline aria-hidden="true" />
                                          <span>{t('view-listed-nfts', { ns: 'nft' })}</span>
                                        </Link>
                                        )}
                                    </div>
                                    <div>
                                      <span>{t('table.nfts')}</span>
                                      <strong>{collectionMarketData?.statistics?.nfts ?? '—'}</strong>
                                      {collectionHref && (
                                        <Link className="nft-context-metric-action" href={collectionHref}>
                                          <IoImagesOutline aria-hidden="true" />
                                          <span>{t('view-all-collection', { ns: 'nft' })}</span>
                                        </Link>
                                      )}
                                    </div>
                                    <div>
                                      <span>{t('table.owners-now')}</span>
                                      <strong>{collectionMarketData?.statistics?.owners ?? '—'}</strong>
                                      {data.type === 'xls20' && isValidTaxon(data.nftokenTaxon) && (
                                        <Link
                                          className="nft-context-metric-action"
                                          href={
                                            '/nft-distribution?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon
                                          }
                                        >
                                          <IoPeopleOutline aria-hidden="true" />
                                          <span>{t('view-nft-holders', { ns: 'nft' })}</span>
                                        </Link>
                                      )}
                                    </div>
                                    <div>
                                      <span>{t('table.traded-nfts')}</span>
                                      <strong>{collectionMarketData?.statistics?.all?.tradedNfts ?? '—'}</strong>
                                      {data.type === 'xls20' && isValidTaxon(data.nftokenTaxon) && (
                                        <Link
                                          className="nft-context-metric-action"
                                          href={'/nft-sales?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon}
                                        >
                                          <IoTrendingUpOutline aria-hidden="true" />
                                          <span>{t('view-sold-nfts', { ns: 'nft' })}</span>
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                </section>
                              )}

                            </div>

                        {metadataAttributes.length > 0 && (
                          <div className="column-left">
                            <section className="nft-attributes-section">
                              <h2>{t('table.attributes')}</h2>
                              <div className="nft-attributes-grid">
                                {metadataAttributes.map((attribute, i) => (
                                  <div key={`${nftAttributeName(attribute)}-${i}`}>
                                    <span>{nftAttributeText(nftAttributeName(attribute))}</span>
                                    <strong>{nftAttributeText(nftAttributeValue(attribute))}</strong>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>
                        )}

                        {!notFoundInTheNetwork && (hasNftOffers || data.history?.length > 0) && (
                          <div className="nft-activity-grid">
                            {hasNftOffers && (
                              <section className="nft-offers-section">
                                {countSellOffers?.all > 0 && (
                                  <section id="nft-sell-offers" className="nft-offers-panel">
                                    <div className="nft-activity-panel-heading">
                                      <h2>{t('table.sell-offers')}</h2>
                                      {offersFilter('sell')}
                                    </div>
                                    <div className="nft-offer-list">{nftOffers(filteredSellOffers, 'sell')}</div>
                                  </section>
                                )}

                                {data.type === 'xls20' && countBuyOffers?.all > 0 && (
                                  <section className="nft-offers-panel">
                                    <div className="nft-activity-panel-heading">
                                      <h2>{t('table.buy-offers')}</h2>
                                      {offersFilter('buy')}
                                    </div>
                                    <div className="nft-offer-list">{nftOffers(filteredBuyOffers, 'buy')}</div>
                                  </section>
                                )}
                              </section>
                            )}

                            {data.history?.length > 0 && (
                              <section className="nft-history-panel">
                                <div className="nft-activity-panel-heading">
                                  <h2>{t('table.history')}</h2>
                                </div>
                                <div className="nft-history-list">{nftHistory(data.history)}</div>
                                {data.history.length > 5 && (
                                  <button
                                    type="button"
                                    className="nft-history-toggle"
                                    onClick={() => setShowAllHistory(!showAllHistory)}
                                  >
                                    {showAllHistory ? (
                                      <IoChevronUpOutline aria-hidden="true" />
                                    ) : (
                                      <IoChevronDownOutline aria-hidden="true" />
                                    )}
                                    <span>
                                      {showAllHistory
                                        ? t('show-recent-history', { ns: 'nft' })
                                        : t('show-all-history', { ns: 'nft', count: data.history.length })}
                                    </span>
                                  </button>
                                )}
                              </section>
                            )}
                          </div>
                        )}

                        {(sameCollectionLoading || sameCollectionNfts.length > 0) && (
                          <section className="nft-related-section">
                            <div className="nft-related-header">
                              <div>
                                <h2>{t('same-collection', { ns: 'nft' })}</h2>
                                {collectionHref && <span>{collectionLabel || t('table.collection')}</span>}
                              </div>
                              {collectionHref && (
                                <Link href={collectionHref} className="nft-related-link">
                                  <IoImagesOutline aria-hidden="true" />
                                  <span>{t('view-all-collection', { ns: 'nft' })}</span>
                                </Link>
                              )}
                            </div>
                            {sameCollectionLoading ? (
                              <div className="nft-related-loading">
                                <span className="waiting" />
                              </div>
                            ) : (
                              <div className="nft-related-grid">
                                {sameCollectionNfts.map((nft) => (
                                  <Link href={`/nft/${nft.nftokenID}`} key={nft.nftokenID} className="nft-related-card">
                                    <NftImage nft={nft} sourceSize={240} style={{ width: '100%', marginRight: 0 }} />
                                    <span>{nftName(nft) || shortHash(nft.nftokenID)}</span>
                                    <small>#{nft.nftSerial ?? nft.sequence}</small>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </section>
                        )}

                        <section className="column-right nft-technical-card">
                          <div className="nft-advanced-heading">
                            <h2>{t('technical-details', { ns: 'nft' })}</h2>
                          </div>
                          {data.projectMetadata && (
                            <ProjectMetadata data={data.projectMetadata} updatedAt={data.projectMetadataUpdatedAt} />
                          )}
                          {data.metadata?.evernodeLease && <EvernodeLease data={data.metadata.evernodeLease} />}
                          {data.metadata?.evernodeRegistration && (
                            <EvernodeRegistartion data={data.metadata.evernodeRegistration} />
                          )}
                          {warnings?.length > 0 && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">{t('table.warning')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {warnings.map((warning, i) => (
                                  <tr key={i}>
                                    <td colSpan="100" className="orange">
                                      {warning.message}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          <table className="table-details nft-technical-table">
                            {!notFoundInTheNetwork && (
                              <tbody>
                                <tr>
                                  <td>{t('table.uri')}</td>
                                  <td className="brake">
                                    {data.uri ? (
                                      <>
                                        {isValidJson(decodedUri) ? (
                                          <>
                                            <span>JSON </span>
                                            <CopyButton text={decodedUri} />
                                          </>
                                        ) : (
                                          <>
                                            {decodedUri} <CopyButton text={decodedUri} />
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      t('table.text.unspecified')
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            )}
                            {data.metadata && !evernodeNft(data) && (
                              <tbody>
                                <tr>
                                  <td>{t('nft-metadata', { ns: 'nft' })}</td>
                                  <td>
                                    <span className="link" onClick={() => setShowRawMetadata(!showRawMetadata)}>
                                      {showRawMetadata ? t('table.text.hide') : t('table.text.show')}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            )}
                            <tbody>
                              {data.type !== 'xls20' && (
                                <tr>
                                  <td>{t('table.type')}</td>
                                  <td>{typeName(data.type)}</td>
                                </tr>
                              )}
                              {data.digest && (
                                <tr>
                                  <td>{t('table.digest', { ns: 'nft' })}</td>
                                  <td className="brake">
                                    {isValidDigest ? (
                                      <span className="green">{t('table.text.valid')}</span>
                                    ) : (
                                      data.digest
                                    )}{' '}
                                    <CopyButton text={data.digest} />
                                  </td>
                                </tr>
                              )}
                              {/* isValidJson(decodedUri) - if valid Json in URI, no need to check digest */}
                              {!notFoundInTheNetwork &&
                                !evernodeNft(data) &&
                                (!hasJsonMeta(data) ||
                                  (data.type === 'xls20' && !data.flags.transferable) ||
                                  data.flags.burnable ||
                                  (data.type === 'xls35' &&
                                    data.uri &&
                                    hasJsonMeta(data) &&
                                    !isValidJson(decodedUri) &&
                                    (!data.digest || !isValidDigest))) && (
                                  <tr>
                                    <td>
                                      <b>{t('table.attention', { ns: 'nft' })}</b>
                                    </td>
                                    <td>
                                      {!data.uri && (
                                        <p className="orange">{t('table.attention-texts.no-uri', { ns: 'nft' })}</p>
                                      )}
                                      {data.uri && !hasJsonMeta(data) && (
                                        <p className="orange">
                                          {t('table.attention-texts.no-metadata', { ns: 'nft' })}
                                        </p>
                                      )}
                                      {data.type === 'xls20' && (
                                        <>
                                          {!data.flags.transferable && (
                                            <p className="orange">
                                              {t('table.attention-texts.not-transferable', { ns: 'nft' })}
                                            </p>
                                          )}
                                        </>
                                      )}
                                      {data.flags.burnable && (
                                        <p className="orange">{t('table.attention-texts.burnable', { ns: 'nft' })}</p>
                                      )}
                                      {data.type === 'xls35' && data.uri && hasJsonMeta(data) && (
                                        <>
                                          {!data.digest && (
                                            <p className="orange">
                                              {t('table.attention-texts.no-digest', { ns: 'nft' })}
                                            </p>
                                          )}
                                          {data.digest && !isValidDigest && (
                                            <p className="orange">
                                              {t('table.attention-texts.invalid-digest', { ns: 'nft' })}
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                          </table>

                          <div className={'slide ' + (showRawMetadata ? 'opened' : 'closed')}>
                            {showRawMetadata && codeHighlight(data.metadata)}
                          </div>
                          {xahauNetwork && data.remarks?.length > 0 && <RemarksTable remarks={data.remarks} />}

                        </section>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <p className="center">{t('desc', { ns: 'nft' })}</p>
            <SearchBlock searchPlaceholderText={t('enter-nft-id', { ns: 'nft' })} tab="nft" type="explorer" />
          </>
        )}
      </div>
    </div>
  )
}
