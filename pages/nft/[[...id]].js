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
import { AddressWithIconFilled, convertedAmount, tokenToFiat, timeFromNow, usernameOrAddress } from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import {
  nftName,
  mpUrl,
  bestNftOffer,
  nftUrl,
  partnerMarketplaces,
  ipfsUrl,
  isNftExplicit,
  collectionNameText,
  isValidTaxon
} from '../../utils/nft'
import {
  shortHash,
  trWithFlags,
  fullDateAndTime,
  amountFormat,
  expirationExpired,
  nftOfferLink,
  codeHighlight,
  trStatus,
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
  const [expanded, setExpanded] = useState(false)
  if (!text || text.length <= maxLength) return <span>{text}</span>
  return (
    <>
      <span>{expanded ? text : text.slice(0, maxLength) + '... '}</span>
      <span className="link" onClick={() => setExpanded(!expanded)}>
        {' '}
        {expanded ? 'show less' : 'show more'}
      </span>
    </>
  )
}

export default function Nft({ setSignRequest, account, pageMeta, id, selectedCurrency, refreshPage, fiatRate }) {
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

  const externalUrl = (meta) => {
    let url =
      meta.external_url ||
      meta.external_link ||
      meta.externalUrl ||
      meta.externalURL ||
      (meta.minter?.includes('https://') && meta.minter) ||
      meta.External_Link
    if (url) {
      url = stripText(url)
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
      if (event.uri) {
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
      return history.map((nftEvent, i) => (
        <tbody key={i}>
          <tr>
            <td className="bold">{eventType(nftEvent)}</td>
            <td>
              {timeFromNow(nftEvent.changedAt, i18n)} ({fullDateAndTime(nftEvent.changedAt)}){' '}
              <LinkTx tx={nftEvent.txHash} icon={true} />
            </td>
          </tr>
          {nftEvent.uri && (
            <tr>
              <td>{t('table.uri')}</td>
              <td className="brake">
                {nftEvent.url ? nftEvent.url : decode(nftEvent.uri)}{' '}
                <CopyButton text={nftEvent.url ? nftEvent.url : decode(nftEvent.uri)} />
              </td>
            </tr>
          )}
          {nftEvent.amount && nftEvent.amount !== '0' && (
            <tr>
              <td>{t('table.price')}</td>
              <td>
                {amountFormat(nftEvent.amount, { tooltip: 'right' })}
                {nftEvent.amountInConvertCurrencies?.[selectedCurrency] && (
                  <> (≈ {convertedAmount(nftEvent, selectedCurrency)})</>
                )}
              </td>
            </tr>
          )}
          {nftEvent.owner && (
            <tr>
              <td>{ownerName(nftEvent)}</td>
              <td>
                <AddressWithIconFilled data={nftEvent} name={nftEvent.minter ? 'minter' : 'owner'} />
              </td>
            </tr>
          )}
          {nftEvent.marketplace && (
            <tr>
              <td>{marketPlaceUsage(nftEvent)}</td>
              <td>{nftEvent.marketplace}</td>
            </tr>
          )}
          {i !== history.length - 1 && (
            <tr>
              <td colSpan="100">
                <hr />
              </td>
            </tr>
          )}
        </tbody>
      ))
    }
  }

  const nftOffers = (offers, type) => {
    if (type !== 'sell' && type !== 'buy') {
      return (
        <tbody>
          <tr>
            <td colSpan="100">Error, no offer type</td>
          </tr>
        </tbody>
      )
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
      return offers.map((offer, i) => (
        <tbody key={i}>
          {offer.offerIndex && (
            <tr>
              <td>{t('table.offer')}</td>
              <td>{nftOfferLink(offer.offerIndex)}</td>
            </tr>
          )}
          {trStatus(t, offer)}
          <tr>
            <td>{buyerOrSeller}</td>
            <td>
              <AddressWithIconFilled data={offer} name="owner" />
            </td>
          </tr>
          <tr>
            <td>{t('table.amount')}</td>
            <td>
              {amountFormat(offer.amount, { withIssuer: true })}
              {/* only show the current prices, add to show historical for accepted/canceled*/}
              {!offer.canceledAt && !offer.acceptedAt && fiatRate > 0 && (
                <span className="grey">
                  {tokenToFiat({
                    amount: offer.amount,
                    selectedCurrency,
                    fiatRate
                  })}
                </span>
              )}
            </td>
          </tr>
          {offer.createdAt && (
            <tr>
              <td>{t('table.placed')}</td>
              <td>
                {fullDateAndTime(offer.createdAt)} <LinkTx tx={offer.createdTxHash} icon={true} />
              </td>
            </tr>
          )}
          {offer.acceptedAt && (
            <tr>
              <td>{t('table.accepted')}</td>
              <td>
                {fullDateAndTime(offer.acceptedAt)} <LinkTx tx={offer.acceptedTxHash} icon={true} />
              </td>
            </tr>
          )}
          {offer.canceledAt && (
            <tr>
              <td>{t('table.canceled')}</td>
              <td>
                {fullDateAndTime(offer.canceledAt)} <LinkTx tx={offer.canceledTxHash} icon={true} />
              </td>
            </tr>
          )}
          {offer.expiration && (
            <tr>
              <td>{expirationExpired(t, offer.expiration)}</td>
              <td>{fullDateAndTime(offer.expiration, 'expiration')}</td>
            </tr>
          )}
          {offer.destination && (
            <tr>
              <td>{t('table.destination')}</td>
              <td>
                <AddressWithIconFilled data={offer} name="destination" />
              </td>
            </tr>
          )}
          {offer.valid && (
            <>
              {type === 'sell' && (
                <tr>
                  <td colSpan="2">{buyButton([offer])}</td>
                </tr>
              )}
              {type === 'buy' && (
                <tr>
                  <td colSpan="2">{sellButton([offer])}</td>
                </tr>
              )}
            </>
          )}
          {!offer.canceledAt &&
            !offer.acceptedAt &&
            ((accountAddress && offer.owner && accountAddress === offer.owner) ||
              offer.validationErrors?.includes('Offer is expired') ||
              (accountAddress && offer.destination === accountAddress)) && (
              <tr>
                <td colSpan="2">
                  {cancelNftOfferButton(t, setSignRequest, accountAddress, offer, type, data.type, id)}
                </td>
              </tr>
            )}
          {i !== offers.length - 1 && (
            <tr>
              <td colSpan="100">
                <hr />
              </td>
            </tr>
          )}
        </tbody>
      ))
    } else {
      return (
        <tbody>
          <tr>
            <td colSpan="100">{t('table.text.no-offers')}</td>
          </tr>
        </tbody>
      )
    }
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

    if (mpUrl(best)) {
      //Partner marketplaces - place counteroffers
      if (partnerMarketplaces[best.destination]) {
        const { multiplier, fee, name, feeText } = partnerMarketplaces[best.destination]
        let request = {
          TransactionType: 'NFTokenCreateOffer',
          NFTokenID: id,
          Destination: best.destination,
          Owner: data.owner,
          Amount: Math.ceil(best.amount * multiplier).toString()
        }

        if (best.amount.value) {
          request.Amount = {
            value: Math.ceil(best.amount.value * multiplier).toString(),
            currency: best.amount.currency,
            issuer: best.amount.issuer
          }
        } else {
          request.Amount = Math.ceil(best.amount * multiplier).toString()
        }

        if (name === 'bidds') {
          if (data.issuer === data.owner) {
            return ''
          }
          if (request.Amount === '0') {
            return '' // 0 amount is won't be accepted by bidds
          }
        }

        return (
          <>
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
              {t('button.nft.buy-for-amount', {
                amount: amountFormat(Math.ceil(best.amount > 0 ? best.amount * multiplier : 1))
              })}
            </button>
            <br />
            <br />
          </>
        )
      }

      return (
        <>
          <a className="button-action wide center" href={mpUrl(best)} target="_blank" rel="noreferrer">
            {t('button.nft.buy-for-amount-on', {
              amount: amountFormat(best.amount),
              service: best.destinationDetails.service
            })}
          </a>
          <br />
          <br />
        </>
      )
    }

    //1. check if owner is above - will show Cancel,
    //2. if known destination, we have checked it above mpURL (xls20 brokers)
    //3. check there is no destination, or destination is me (xls20 private offers, xls35)
    if (!best.destination || (best.destination && accountAddress && accountAddress === best.destination)) {
      return (
        <>
          {acceptNftSellOfferButton(t, setSignRequest, best, data.type)}
          <br />
          <br />
        </>
      )
    }

    return ''
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
          <>
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
              {t('button.nft.sell-for-amount', {
                amount: amountFormat(best.amount?.value ? sellAmount : parseInt(sellAmount))
              })}
            </button>
            <br />
            <br />
          </>
        )
      }

      return (
        <>
          {acceptNftBuyOfferButton(t, setSignRequest, best, data.type)}
          <br />
          <br />
        </>
      )
    }

    return ''
  }

  const makeOfferButton = (sellOffers) => {
    // if removed do not offer to add an offer
    // if not transferable, do not show button to create offers unless the issuer is logged in.
    if (!id || data.deletedAt || (!data.flags.transferable && (!accountAddress || accountAddress !== data.issuer)))
      return ''
    //if signed in and user is the nft's owner -> make a sell offer or a transfer, otherwise make a buy offer (no flag)
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
      <>
        <button
          className="button-action wide center"
          onClick={() =>
            setSignRequest({
              request
            })
          }
        >
          {sell
            ? hasAValidSellOffer
              ? t('button.nft.add-another-sell-offer')
              : t('button.nft.list-for-sale')
            : t('button.nft.make-offer')}
        </button>
        <br />
        <br />
        {sell && (
          <>
            <button
              className="button-action wide center"
              onClick={() =>
                setSignRequest({
                  request,
                  action: 'nftTransfer'
                })
              }
            >
              {t('button.nft.transfer')}
            </button>
            <br />
            <br />
          </>
        )}
      </>
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
      <>
        <button
          className="button-action wide center"
          onClick={() =>
            setSignRequest({
              request
            })
          }
        >
          {countSellOffers?.['active-valid'] > 0 ? t('button.nft.update-sell-offer') : t('button.nft.list-for-sale')}
        </button>
        <br />
        <br />

        <button
          className="button-action wide center"
          onClick={() =>
            setSignRequest({
              request,
              action: 'nftTransfer'
            })
          }
        >
          {t('button.nft.transfer')}
        </button>
        <br />
        <br />
      </>
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
      <>
        <button
          className="button-action wide center"
          onClick={() =>
            setSignRequest({
              request
            })
          }
        >
          {t('button.nft.burn')} ️‍🔥
        </button>
        <br />
        <br />
      </>
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
      <>
        <button
          className="button-action wide center"
          onClick={() =>
            setSignRequest({
              request
            })
          }
        >
          Modify URI 📝
        </button>
        <br />
        <br />
      </>
    )
  }

  const setAsAvatarButton = (data) => {
    if (!id || data.deletedAt) return '' //if it is already burned do not offer to burn

    if (isNftExplicit(data)) return '' //if it is explicit, do not offer to set as avatar

    if (!imageUrl) return '' //if there is no image, do not offer to set as avatar

    //if devnet, or signed, but not an owner or issuer - do not show set as avatar button
    if (devNet || !accountAddress || (accountAddress !== data.owner && accountAddress !== data.issuer)) return ''

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
      <>
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
          disabled={data.owner !== accountAddress}
        >
          Set as Avatar 😎
        </button>
        {data.owner !== accountAddress && (
          <>
            <br />
            <span className="grey">{t('set-avatar-description', { ns: 'nft' })}</span>
          </>
        )}
        <br />
        <br />
      </>
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
      <h1 className="center" style={{ marginTop: '20px', marginBottom: '20px' }}>
        NFT information {shortHash(id)}
      </h1>
      <div className="content-profile">
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
                        <div className="column-left">
                          {!notFoundInTheNetwork ? (
                            <>
                              {rendered && <NftPreview nft={data} />}
                              {setAsAvatarButton(data)}
                              {sellButton(data.buyOffers)}
                              {buyButton(data.sellOffers)}
                              {cancelNftOfferButtons(t, setSignRequest, accountAddress, data)}
                              {data.type === 'xls20' && makeOfferButton(data.sellOffers)}
                              {data.type === 'xls35' && xls35SellOfferButton()}
                              {updateUriButton()}
                              {burnButton()}
                            </>
                          ) : (
                            <div className="orange">
                              <Trans i18nKey="nft-not-found-on-that-network" ns="nft">
                                This NFT wasn't found on the <b>{{ network }}</b> network.
                              </Trans>
                              <br />
                              <br />
                            </div>
                          )}
                          <div>
                            {data.projectMetadata && (
                              <ProjectMetadata data={data.projectMetadata} updatedAt={data.projectMetadataUpdatedAt} />
                            )}
                            {data.metadata?.attributes &&
                              data.metadata?.attributes[0] &&
                              (data.metadata?.attributes[0].trait_type ||
                                data.metadata?.attributes[0].name ||
                                data.metadata?.attributes[0].traitType) && (
                                <table className="table-details autowidth">
                                  <thead>
                                    <tr>
                                      <th colSpan="100">{t('table.attributes')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.metadata.attributes.map((attr, i) => (
                                      <tr key={i}>
                                        <td>{stripText(attr.trait_type || attr.name || attr.traitType)}</td>
                                        <td>{stripText(attr.value || attr.traitValue)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            {data.metadata?.evernodeLease && <EvernodeLease data={data.metadata.evernodeLease} />}
                            {data.metadata?.evernodeRegistration && (
                              <EvernodeRegistartion data={data.metadata.evernodeRegistration} />
                            )}
                          </div>
                        </div>

                        <div className="column-right">
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

                          {data.metadata && !evernodeNft(data) && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">{t('table.metadata')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nftName(data) && (
                                  <tr>
                                    <td>{t('table.name')}</td>
                                    <td className="bold">{nftName(data)}</td>
                                  </tr>
                                )}
                                {nftDescription(data.metadata) && (
                                  <tr>
                                    <td>{t('table.description')}</td>
                                    <td>
                                      <DescriptionWithShowMore text={nftDescription(data.metadata)} />
                                    </td>
                                  </tr>
                                )}
                                {externalUrl(data.metadata) && (
                                  <tr>
                                    <td>{t('table.external-url')}</td>
                                    <td className="brake">{externalUrl(data.metadata)}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td>{t('table.raw-data')}</td>
                                  <td>
                                    <span className="link" onClick={() => setShowRawMetadata(!showRawMetadata)}>
                                      {showRawMetadata ? t('table.text.hide') : t('table.text.show')}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}

                          <div className={'slide ' + (showRawMetadata ? 'opened' : 'closed')}>
                            {showRawMetadata && codeHighlight(data.metadata)}
                          </div>
                          {xahauNetwork && data.remarks?.length > 0 && <RemarksTable remarks={data.remarks} />}
                          {data.collectionDetails && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">{t('table.collection')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>{t('table.name')}</td>
                                  <td>
                                    <span className="bold">{collectionNameText(data.collectionDetails)}</span>
                                    {data.collection && (
                                      <>
                                        {' '}
                                        (
                                        <Link href={'/nft-collection/' + data.collection} className="bold">
                                          View collection
                                        </Link>
                                        )
                                      </>
                                    )}
                                  </td>
                                </tr>
                                {data.collectionDetails?.description && (
                                  <tr>
                                    <td>{t('table.description')}</td>
                                    <td>{stripText(data.collectionDetails.description)}</td>
                                  </tr>
                                )}
                                {data.collectionDetails?.family &&
                                  data.collectionDetails?.family !== collectionNameText(data.collectionDetails) && (
                                    <tr>
                                      <td>Family</td>
                                      <td>{stripText(data.collectionDetails?.family)}</td>
                                    </tr>
                                  )}

                                {data.type === 'xls20' && isValidTaxon(data?.collectionDetails?.taxon) && (
                                  <tr>
                                    <td>View more</td>
                                    <td>
                                      <Link
                                        href={'/nft-distribution?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon}
                                      >
                                        {t('holders', { ns: 'nft' })}
                                      </Link>
                                      ,{' '}
                                      <Link
                                        href={'/nft-explorer?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon}
                                      >
                                        {t('table.all-nfts')}
                                      </Link>
                                      ,{' '}
                                      <Link href={'/nft-sales?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon}>
                                        {t('table.sold_few')}
                                      </Link>
                                      ,{' '}
                                      <Link
                                        href={
                                          '/nft-explorer?issuer=' +
                                          data.issuer +
                                          '&taxon=' +
                                          data.nftokenTaxon +
                                          '&list=onSale&&saleDestination=publicAndKnownBrokers'
                                        }
                                      >
                                        {t('table.listed')}
                                      </Link>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          <table className="table-details">
                            <thead>
                              <tr>
                                <th colSpan="100">
                                  {notFoundInTheNetwork
                                    ? t('nft-id-decoded-data', { ns: 'nft' })
                                    : t('table.ledger-data')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>NFT ID</td>
                                <td>
                                  {shortHash(data.nftokenID, 10)} <CopyButton text={data.nftokenID} />
                                </td>
                              </tr>
                              {data.type !== 'xls20' && (
                                <tr>
                                  <td>{t('table.type')}</td>
                                  <td>{typeName(data.type)}</td>
                                </tr>
                              )}
                              {data.issuer === data.owner ? (
                                <tr>
                                  <td>{t('table.issuer-owner')}</td>
                                  <td>
                                    <AddressWithIconFilled data={data} name="owner" />
                                  </td>
                                </tr>
                              ) : (
                                <>
                                  {data?.owner && (
                                    <tr>
                                      <td>{t('table.owner')}</td>
                                      <td>
                                        <AddressWithIconFilled data={data} name="owner" />
                                      </td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td>{t('table.issuer')}</td>
                                    <td>
                                      <AddressWithIconFilled data={data} name="issuer" />
                                    </td>
                                  </tr>
                                </>
                              )}
                              {data.type === 'xls20' && (
                                <>
                                  <tr>
                                    <td>{t('table.taxon')}</td>
                                    <td>{data.nftokenTaxon}</td>
                                  </tr>
                                  <tr>
                                    <td>{t('table.serial')}</td>
                                    <td>{data.sequence}</td>
                                  </tr>
                                </>
                              )}
                              {!!data.transferFee && (
                                <tr>
                                  <td>{t('table.transfer-fee')}</td>
                                  <td>{data.transferFee / 1000}%</td>
                                </tr>
                              )}
                              {trWithFlags(t, data.flags)}
                              {!notFoundInTheNetwork && (
                                <tr>
                                  <td>{t('table.uri')}</td>
                                  <td className="brake">
                                    {data.uri ? (
                                      <>
                                        {isValidJson(decodedUri) ? (
                                          <>
                                            <span className="orange">JSON </span>
                                            <span className="link" onClick={() => setShowRawMetadata(!showRawMetadata)}>
                                              {showRawMetadata ? t('table.text.hide') : t('table.text.show')}
                                            </span>
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

                          {!notFoundInTheNetwork && (
                            <>
                              <table className="table-details">
                                <thead>
                                  <tr>
                                    <th colSpan="100">{t('table.related-lists')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.type === 'xls20' && (
                                    <tr>
                                      <td>{t('table.by-taxon')}</td>
                                      <td>
                                        <Link
                                          href={
                                            '/nft-distribution?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon
                                          }
                                        >
                                          {t('holders', { ns: 'nft' })}
                                        </Link>
                                        ,{' '}
                                        <Link
                                          href={'/nft-explorer?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon}
                                        >
                                          {t('table.all-nfts')}
                                        </Link>
                                        ,{' '}
                                        <Link href={'/nft-sales?issuer=' + data.issuer + '&taxon=' + data.nftokenTaxon}>
                                          {t('table.sold_few')}
                                        </Link>
                                        ,{' '}
                                        <Link
                                          href={
                                            '/nft-explorer?issuer=' +
                                            data.issuer +
                                            '&taxon=' +
                                            data.nftokenTaxon +
                                            '&list=onSale&saleDestination=publicAndKnownBrokers'
                                          }
                                        >
                                          {t('table.listed')}
                                        </Link>
                                      </td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td>{t('table.by-issuer')}</td>
                                    <td>
                                      <Link href={'/nft-distribution?issuer=' + data.issuer}>
                                        {t('holders', { ns: 'nft' })}
                                      </Link>
                                      , <Link href={'/nft-explorer?issuer=' + data.issuer}>{t('table.all-nfts')}</Link>,{' '}
                                      <Link href={'/nft-sales?issuer=' + data.issuer}>{t('table.sold_few')}</Link>
                                      {data.type === 'xls20' && (
                                        <>
                                          ,{' '}
                                          <Link href={'/nft-explorer?issuer=' + data.issuer + '&list=onSale'}>
                                            {t('table.listed')}
                                          </Link>
                                          ,{' '}
                                          <Link href={'/nft-volumes/' + data.issuer + '?period=year'}>
                                            {t('table.volume')}
                                          </Link>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                  {data.owner && (
                                    <tr>
                                      <td>{t('table.by-owner')}</td>
                                      <td>
                                        <Link href={'/nft-explorer?owner=' + data.owner}>{t('table.all-nfts')}</Link>
                                        {data.type === 'xls20' && (
                                          <>
                                            ,{' '}
                                            <Link
                                              href={
                                                '/nft-explorer?owner=' +
                                                data.owner +
                                                '&list=onSale&saleDestination=publicAndKnownBrokers'
                                              }
                                            >
                                              {t('table.listed')}
                                            </Link>
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>

                              {data.history?.length > 0 && (
                                <table className="table-details">
                                  <thead>
                                    <tr>
                                      <th colSpan="100">{t('table.history')}</th>
                                    </tr>
                                  </thead>
                                  {nftHistory(data.history)}
                                </table>
                              )}

                              <table className="table-details">
                                <thead>
                                  <tr>
                                    <th colSpan="100">
                                      {t('table.sell-offers')}
                                      {countSellOffers && offersFilter('sell')}
                                    </th>
                                  </tr>
                                </thead>
                                {nftOffers(filteredSellOffers, 'sell')}
                              </table>

                              {data.type === 'xls20' && (
                                <table className="table-details">
                                  <thead>
                                    <tr>
                                      <th colSpan="100">
                                        {t('table.buy-offers')}
                                        {countBuyOffers && offersFilter('buy')}
                                      </th>
                                    </tr>
                                  </thead>
                                  {nftOffers(filteredBuyOffers, 'buy')}
                                </table>
                              )}
                            </>
                          )}
                        </div>
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
