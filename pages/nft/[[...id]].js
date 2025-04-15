import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { sha512 } from 'crypto-hash'
import Select from 'react-select'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import dynamic from 'next/dynamic'

import { stripText, decode, network, isValidJson, xahauNetwork, devNet, encode } from '../../utils'
import { AddressWithIconFilled, convertedAmount, usernameOrAddress } from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { nftName, mpUrl, bestNftOffer, nftUrl, partnerMarketplaces, ipfsUrl } from '../../utils/nft'
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
import { axiosServer, passHeaders } from '../../utils/axios'

import SocialShare from '../../components/SocialShare'
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
        url: 'v2/nft/' + nftId + '?uri=true&metadata=true', //&history=true&sellOffers=true&buyOffers=true&offersValidate=true&offersHistory=true&convertCurrencies=' +
        //selectedCurrency?.toLowerCase(),
        headers: passHeaders(req)
      })
      pageMeta = res?.data
    } catch (error) {
      console.error(error)
    }
  }

  return {
    props: {
      id: nftId,
      pageMeta,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import NftPreview from '../../components/NftPreview'

import LinkIcon from '../../public/images/link.svg'

const ProjectMetadata = dynamic(() => import('../../components/Nft/ProjectMetadata'), { ssr: false })
const EvernodeLease = dynamic(() => import('../../components/Nft/EvernodeLease'), { ssr: false })
const EvernodeRegistartion = dynamic(() => import('../../components/Nft/EvernodeRegistartion'), { ssr: false })

const hasJsonMeta = (nft) => {
  return nft.metadata && nft.metadata.attributes?.metaSource?.toLowerCase() !== 'bithomp'
}

export default function Nft({ setSignRequest, account, pageMeta, id, selectedCurrency, refreshPage }) {
  const { t } = useTranslation()

  const [data, setData] = useState({})
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
    setLoading(true)

    setSellOffersFilter('active-valid')
    setBuyOffersFilter('active-valid')

    let noCache = ''
    if (opts?.noCache) {
      noCache = '&timestamp=' + Date.now()
    }

    const response = await axios(
      '/v2/nft/' +
        id +
        '?uri=true&metadata=true&history=true&sellOffers=true&buyOffers=true&offersValidate=true&offersHistory=true' +
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

        setData(newdata)
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
        countOffersByFilters(newdata.sellOffers, setCountSellOffers)
        countOffersByFilters(newdata.buyOffers, setCountBuyOffers)
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

  const countOffersByFilters = (offers, setCount) => {
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
        if (offers[i].valid || offers[i].valid === false) {
          count.active++
          if (offers[i].valid) {
            count['active-valid']++
          } else {
            count['active-invalid']++
          }
        } else {
          count.historical++
        }
      }
    }
    setCount(count)
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
    if (!selectedCurrency) return
    if (!data?.nftokenID) {
      // no token - first time fetching - allow right away
      checkApi()
    } else {
      checkApi({ noCache: true })
    }
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
    if (meta.description) {
      return stripText(meta.description)
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
              {fullDateAndTime(nftEvent.changedAt)}{' '}
              <a href={'/explorer/' + nftEvent.txHash}>
                <LinkIcon />
              </a>
            </td>
          </tr>
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
            <td>{amountFormat(offer.amount, { tooltip: 'right' })}</td>
          </tr>
          {offer.createdAt && (
            <tr>
              <td>{t('table.placed')}</td>
              <td>
                {fullDateAndTime(offer.createdAt)}{' '}
                <a href={'/explorer/' + offer.createdTxHash}>
                  <LinkIcon />
                </a>
              </td>
            </tr>
          )}
          {offer.acceptedAt && (
            <tr>
              <td>{t('table.accepted')}</td>
              <td>
                {fullDateAndTime(offer.acceptedAt)}{' '}
                <a href={'/explorer/' + offer.acceptedTxHash}>
                  <LinkIcon />
                </a>
              </td>
            </tr>
          )}
          {offer.canceledAt && (
            <tr>
              <td>{t('table.canceled')}</td>
              <td>
                {fullDateAndTime(offer.canceledAt)}{' '}
                <a href={'/explorer/' + offer.canceledTxHash}>
                  <LinkIcon />
                </a>
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
            ((account?.address && offer.owner && account.address === offer.owner) ||
              offer.validationErrors?.includes('Offer is expired') ||
              (account?.address && offer.destination === account.address)) && (
              <tr>
                <td colSpan="2">
                  {cancelNftOfferButton(t, setSignRequest, account.address, offer, type, data.type, id)}
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
          return offer.canceledAt || offer.acceptedAt
        })
      )
    } else if (filter === 'active') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return offer.valid || offer.valid === false
        })
      )
    } else if (filter === 'active-valid') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return offer.valid
        })
      )
    } else if (filter === 'active-invalid') {
      setFilteredOffers(
        unfilteredOffers.filter(function (offer) {
          return offer.valid === false
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
    if (type === 'buy') {
      setFilter = setBuyOffersFilter
      offersCount = countBuyOffers
    }
    //dont show if there is no offers, or when all offers are valid
    if (offersCount.all === 0 || offersCount['active-valid'] === offersCount.all) {
      return <></>
    }
    return (
      <Select
        options={offerHistoryFilters(type)}
        defaultValue={offerHistoryFilters(type, true)}
        onChange={(value) => setFilter(value.value)}
        isSearchable={false}
        className="offer-history-filter-select"
        classNamePrefix="react-select"
        instanceId={'offer-history-filter-select-' + type}
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
      best = bestNftOffer(sellOffers, account?.address, 'sell')
    }

    if (!best) return ''

    //do not show buy button, if's my own offer (Cancel button will be shown)
    if (best.owner && account?.address && account.address === best.owner) {
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
    if (!best.destination || (best.destination && account?.address && account.address === best.destination)) {
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
      best = bestNftOffer(buyOffers, account?.address, 'buy')
    }

    if (!best) return ''

    //don't show sell button, if's my own offer (Cancel button will be shown)
    if (best.owner && account?.address && account.address === best.owner) {
      return ''
    }

    //show sell button only for the NFT owner
    if (data.owner && account?.address && account.address === data.owner) {
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
    if (!id || data.deletedAt || (!data.flags.transferable && (!account?.address || account.address !== data.issuer)))
      return ''
    //if signed in and user is the nft's owner -> make a sell offer or a transfer, otherwise make a buy offer (no flag)
    const sell = data?.owner && account?.address && account.address === data.owner

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
    if (!id || !data?.owner || !account?.address || account.address !== data.owner || data.type !== 'xls35') return ''

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
      !(data?.owner && account?.address && account.address === data.owner) &&
      !(data?.issuer && account?.address && account.address === data.issuer)
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
      request = {
        TransactionType: 'NFTokenBurn',
        Account: data.owner,
        NFTokenID: id
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

  const setAsAvatarButton = () => {
    if (!id || data.deletedAt) return '' //if it is already burned do not offer to burn

    //if devnet, or signed, but not an owner or issuer - do not show set as avatar button
    if (devNet || (account?.address && account.address !== data.owner && account.address !== data.issuer)) return ''

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
          disabled={data.owner !== account?.address}
        >
          Set as Avatar 😎
        </button>
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
            (!pageMeta?.nftokenID ? t('desc', { ns: 'nft' }) : '')) +
          (pageMeta?.issuer ? ' - ' + t('table.issuer') + ': ' + usernameOrAddress(pageMeta, 'issuer') : '')
        }
        image={{ file: imageUrl }}
      />
      <SearchBlock searchPlaceholderText={t('enter-nft-id', { ns: 'nft' })} tab="nft" />
      <div className="content-profile">
        {id ? (
          <>
            {loading ? (
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
                    {data.flags && (
                      <>
                        <div className="column-left">
                          {!notFoundInTheNetwork ? (
                            <>
                              <NftPreview nft={data} />
                              {setAsAvatarButton()}
                              {sellButton(data.buyOffers)}
                              {buyButton(data.sellOffers)}
                              {cancelNftOfferButtons(t, setSignRequest, account?.address, data)}
                              {data.type === 'xls20' && makeOfferButton(data.sellOffers)}
                              {data.type === 'xls35' && xls35SellOfferButton()}
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
                              data.metadata?.attributes[0].trait_type && (
                                <table className="table-details autowidth">
                                  <thead>
                                    <tr>
                                      <th colSpan="100">{t('table.attributes')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.metadata.attributes.map((attr, i) => (
                                      <tr key={i}>
                                        <td>{stripText(attr.trait_type)}</td>
                                        <td>{stripText(attr.value)}</td>
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
                          {!notFoundInTheNetwork && (
                            <SocialShare
                              title={nftName(data) || 'XRPL NFT'}
                              description={pageMeta?.metadata?.description || ''}
                              hashtag="NFT"
                              image={imageUrl}
                              t={t}
                            />
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
                                    <td>{nftName(data)}</td>
                                  </tr>
                                )}
                                {nftDescription(data.metadata) && (
                                  <tr>
                                    <td>{t('table.description')}</td>
                                    <td>{nftDescription(data.metadata)}</td>
                                  </tr>
                                )}
                                {!!data.metadata.collection && (
                                  <>
                                    {!!data.metadata.collection.name && (
                                      <tr>
                                        <td>{t('table.collection')}</td>
                                        <td>{stripText(data.metadata.collection.name)}</td>
                                      </tr>
                                    )}
                                    {!!data.metadata.collection.description &&
                                      data.metadata.collection.description !== data.metadata.description && (
                                        <tr>
                                          <td>{t('table.description')}</td>
                                          <td>{stripText(data.metadata.collection.description)}</td>
                                        </tr>
                                      )}
                                  </>
                                )}
                                {externalUrl(data.metadata) && (
                                  <tr>
                                    <td>{t('table.external-url')}</td>
                                    <td>{externalUrl(data.metadata)}</td>
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
                            {codeHighlight(data.metadata)}
                          </div>

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
                                  <td>
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
                                  <td>
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
                                            '&list=onSale'
                                          }
                                        >
                                          {t('table.on-sale')}
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
                                            {t('table.on-sale')}
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
                                            <Link href={'/nft-explorer?owner=' + data.owner + '&list=onSale'}>
                                              {t('table.on-sale')}
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
            <h2 className="center">NFT</h2>
            <p className="center">{t('desc', { ns: 'nft' })}</p>
          </>
        )}
      </div>
    </div>
  )
}
