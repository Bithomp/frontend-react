import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import {
  IoCartOutline,
  IoCloseCircleOutline,
  IoEyeOutline,
  IoImagesOutline,
  IoOpenOutline,
  IoStorefrontOutline
} from 'react-icons/io5'

import { axiosServer, passHeaders } from '../../utils/axios'

import {
  fullDateAndTime,
  amountFormat,
  expirationExpired,
  shortHash,
  cancelNftOfferButton,
  acceptNftBuyOfferButton,
  acceptNftSellOfferButton,
  AddressWithIconInline,
  timeFromNow,
  tokenToFiat
} from '../../utils/format'

import { getIsSsrMobile } from '../../utils/mobile'
import { nftClass } from '../../styles/pages/nft.module.scss'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  // keep params instead of query, anyway it is an array sometimes
  const id = query?.id ? (Array.isArray(query.id) ? query.id[0] : query.id) : ''
  let initialData = null

  if (id) {
    try {
      const res = await axiosServer({
        method: 'get',
        url: 'v2/nft/offer/' + id + '?offersValidate=true',
        headers: passHeaders(req)
      })
      const responseData = res?.data

      if (responseData?.error === 'Token information is not found') {
        return { notFound: true }
      }

      if (responseData?.offerIndex) {
        initialData = responseData
      }
    } catch (_) {
      // Let the client retry temporary API failures instead of returning a false 404.
    }
  }

  return {
    props: {
      id,
      initialData,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'

import { mpUrl, nftName, NftImage } from '../../utils/nft'
import { LinkTx } from '../../utils/links'

export default function NftOffer({
  setSignRequest,
  refreshPage,
  account,
  id,
  initialData,
  selectedCurrency,
  fiatRate
}) {
  const { t, i18n } = useTranslation()

  const [data, setData] = useState(initialData || {})
  const [loading, setLoading] = useState(!initialData?.nftokenID)
  const [errorMessage, setErrorMessage] = useState('')
  const [relatedNftOffers, setRelatedNftOffers] = useState({ buy: [], sell: [] })
  const [relatedNftOffersLoading, setRelatedNftOffersLoading] = useState(false)
  const [relatedCollectionNfts, setRelatedCollectionNfts] = useState([])
  const [relatedCollectionLoading, setRelatedCollectionLoading] = useState(false)
  const [relatedCollectionMode, setRelatedCollectionMode] = useState('listings')

  const checkApi = async (opts) => {
    if (!id) return
    if (!data?.nftokenID) setLoading(true)
    let noCache = ''
    if (opts?.noCache) {
      noCache = '&timestamp=' + Date.now()
    }
    const response = await axios('v2/nft/offer/' + id + '?offersValidate=true' + noCache).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    setLoading(false)
    const newdata = response?.data
    if (newdata) {
      if (newdata.offerIndex) {
        setData(newdata)
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

  /*
    {
      "nftokenID": "00081068F3D76A09647C813D0363E6F820BB7C797D2EB704E0422464000001C9",
      "offerIndex": "0CD12DD4975654BF1022241D92D63BA7297B579DF685A9BF0777A0D1BAB738BB",
      "createdAt": 1671836850,
      "createdLedgerIndex": 76632990,
      "createdTxHash": "13FDE6CC174F4FDC4D61673064E552D8B370A91DEF4DD9D510089105B7F8ED7B",
      "account": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
      "owner": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
      "destination": null,
      "expiration": null,
      "amount": "50750000",
      "flags": {
        "sellToken": false
      },
      "acceptedAt": 1671836851,
      "acceptedLedgerIndex": 76632991,
      "acceptedTxHash": "FA9A48CCA34EFA25C94D6DD0F7B2B70D00AE0BE6446CF08D044D246BFB0DBB0B",
      "acceptedAccount": "rsQmGXm3G4FA6n5L5QqTELBqTph9xEP5nK",
      "nftoken": {
        "flags": {
          "burnable": false,
          "onlyXRP": false,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "rPNKEiCGzPd53MhqjkQJrtJKLLVWi6bav1",
        "nftokenID": "00081068F3D76A09647C813D0363E6F820BB7C797D2EB704E0422464000001C9",
        "nftokenTaxon": 0,
        "transferFee": 4200,
        "sequence": 457,
        "owner": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
        "uri": "68747470733A2F2F7468657368696C6C76657273652E636F6D2F6E66742F6A736F6E2F70756E6B2F3431382E6A736F6E",
        "issuedAt": 1670143680,
        "ownerChangedAt": 1671836851,
        "deletedAt": null,
        "url": "https://theshillverse.com/nft/json/punk/418.json",
        "metadata": {
          "name": "Shill Punk #418",
          "description": "Assassin Doge (Shill Punk #418) reporting for Duty!\nA collection of Punks on the XRPL.",
          "image": "https://theshillverse.com/nft/img/punk/418.png",
          "edition": 418,
          "date": 1670134831294,
          "actions": [],
          "attributes": [
            {
              "trait_type": "Base",
              "value": "Doge"
            }
          ]
        },
        "issuerDetails": {
          "username": null,
          "service": null
        },
        "ownerDetails": {
          "username": null,
          "service": null
        }
      },
      "accountDetails": {
        "username": null,
        "service": null
      },
      "ownerDetails": {
        "username": null,
        "service": null
      },
      "acceptedAccountDetails": {
        "username": null,
        "service": null
      },
      "issuerDetails": {
        "username": null,
        "service": null
      }
    }
  */

  useEffect(() => {
    if (!data?.nftokenID) {
      // no token - first time fetching - allow right away
      checkApi()
    } else if (data?.canceledAt || data?.acceptedAt) {
      //do not send request if it is Canceled or Accepted
      return
    } else {
      setLoading(true)
      checkApi({ noCache: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshPage])

  const sellerOrBuyer = data?.flags?.sellToken === true ? t('table.seller') : t('table.buyer')
  const isSellOffer = data?.flags?.sellToken === true
  const isOfferOpen = Boolean(
    data?.valid === true &&
    !data?.canceledAt &&
    !data?.acceptedAt &&
    !data?.validationErrors?.length
  )
  const destinationAllowsAccount = !data?.destination || account?.address === data.destination
  const canAcceptSellOffer =
    isSellOffer &&
    isOfferOpen &&
    account?.address &&
    account.address !== data.account &&
    destinationAllowsAccount
  const canAcceptBuyOffer =
    !isSellOffer &&
    isOfferOpen &&
    account?.address &&
    account.address === data?.nftoken?.owner &&
    destinationAllowsAccount
  const canCancel =
    !data?.canceledAt &&
    !data?.acceptedAt &&
    ((data?.owner && account?.address === data.owner) ||
      data?.validationErrors?.includes('Offer is expired') ||
      (account?.address && data?.destination === account.address))
  const marketplaceName = data?.destinationDetails?.service
  const marketplaceUrl = marketplaceName ? mpUrl(data) : ''
  const offerVisibility = marketplaceName || (data?.destination ? t('table.text.private-offer') : t('tabs.public'))
  const collectionHref = data?.nftoken?.collection
    ? `/nft-collection/${data.nftoken.collection}`
    : data?.nftoken?.issuer
      ? `/nft-explorer?issuer=${data.nftoken.issuer}&taxon=${data.nftoken.nftokenTaxon}`
      : ''
  const collectionLabel =
    data?.nftoken?.collectionDetails?.name ||
    data?.nftoken?.issuerDetails?.username ||
    data?.nftoken?.issuerDetails?.service ||
    t('table.collection')
  const relatedCollectionId =
    data?.nftoken?.collection ||
    (data?.nftoken?.issuer && data?.nftoken?.nftokenTaxon != null
      ? `${data.nftoken.issuer}:${data.nftoken.nftokenTaxon}`
      : '')
  const validationStatus = data?.validationErrors
    ?.map((error) => t('table.text-status.' + error))
    .join(', ')
  const offerStatus =
    data?.acceptedAt
      ? t('table.accepted')
      : data?.canceledAt
        ? t('table.canceled')
        : validationStatus ||
          (data?.valid === false
            ? t('table.filter.invalid')
            : data?.valid === true
              ? t('table.filter.valid')
              : t('table.text.unspecified'))
  const offerStatusIsSuccess = Boolean(data?.acceptedAt)
  const offerStatusIsDanger =
    !offerStatusIsSuccess && Boolean(validationStatus || data?.canceledAt || data?.valid === false)
  const marketplaceActionUrl =
    isOfferOpen && marketplaceUrl && !canAcceptSellOffer && !canAcceptBuyOffer ? marketplaceUrl : ''
  const hasOfferActions = Boolean(canAcceptSellOffer || canAcceptBuyOffer || canCancel || marketplaceActionUrl)
  const lifecycleTimestamp = data?.acceptedAt || data?.canceledAt || data?.expiration
  const lifecycleLabel = data?.acceptedAt
    ? t('table.accepted')
    : data?.canceledAt
      ? t('table.canceled')
      : data?.expiration
        ? expirationExpired(t, data.expiration)
        : ''

  useEffect(() => {
    if (!data?.nftokenID) {
      setRelatedNftOffers({ buy: [], sell: [] })
      return
    }

    let canceled = false
    const loadRelatedNftOffers = async () => {
      setRelatedNftOffers({ buy: [], sell: [] })
      setRelatedNftOffersLoading(true)

      const response = await axios(
        `/v2/nft/${data.nftokenID}?buyOffers=true&sellOffers=true&offersValidate=true`
      ).catch(() => null)
      const activeOffers = (offers) =>
        (Array.isArray(offers) ? offers : [])
          .filter(
            (offer) =>
              offer?.offerIndex !== data.offerIndex &&
              offer?.valid === true &&
              !offer?.acceptedAt &&
              !offer?.canceledAt
          )
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, 4)

      if (!canceled) {
        setRelatedNftOffers({
          buy: activeOffers(response?.data?.buyOffers),
          sell: activeOffers(response?.data?.sellOffers)
        })
        setRelatedNftOffersLoading(false)
      }
    }

    loadRelatedNftOffers()
    return () => {
      canceled = true
    }
  }, [data?.nftokenID, data?.offerIndex])

  useEffect(() => {
    if (!relatedCollectionId) {
      setRelatedCollectionNfts([])
      return
    }

    let canceled = false
    const loadRelatedCollectionNfts = async () => {
      setRelatedCollectionNfts([])
      setRelatedCollectionLoading(true)
      setRelatedCollectionMode('listings')

      const params = new URLSearchParams({
        collection: relatedCollectionId,
        list: 'onSale',
        order: 'offerCreatedNew',
        limit: '9'
      })
      if (selectedCurrency) params.set('currency', selectedCurrency)

      const listingsResponse = await axios(`/v2/nfts?${params.toString()}`).catch(() => null)
      let collectionNfts = Array.isArray(listingsResponse?.data?.nfts)
        ? listingsResponse.data.nfts.filter((nft) => nft?.sellOffers?.[0]?.amount)
        : []
      let collectionMode = 'listings'

      if (collectionNfts.length === 0) {
        params.delete('list')
        params.delete('currency')
        params.set('order', 'mintedNew')
        params.set('hasMedia', 'true')
        const collectionResponse = await axios(`/v2/nfts?${params.toString()}`).catch(() => null)
        collectionNfts = Array.isArray(collectionResponse?.data?.nfts) ? collectionResponse.data.nfts : []
        collectionMode = 'items'
      }

      if (!canceled) {
        setRelatedCollectionNfts(
          collectionNfts.filter((nft) => nft?.nftokenID !== data?.nftokenID).slice(0, 8)
        )
        setRelatedCollectionMode(collectionMode)
        setRelatedCollectionLoading(false)
      }
    }

    loadRelatedCollectionNfts()
    return () => {
      canceled = true
    }
  }, [data?.nftokenID, relatedCollectionId, selectedCurrency])

  const relatedOfferGroups = [
    { type: 'buy', label: t('table.buy-offers'), offers: relatedNftOffers.buy },
    { type: 'sell', label: t('table.sell-offers'), offers: relatedNftOffers.sell }
  ].filter((group) => group.offers.length > 0)

  return (
    <div className={nftClass}>
      <SEO
        title={t('nft-offer.header') + (data.offerIndex ? ' ' + data.offerIndex : '')}
        noindex={!!errorMessage}
      />
      <main className="nft-detail-page nft-offer-detail-page">
        {id ? (
          <>
            {loading ? (
              <div className="nft-page-state center">
                <span className="waiting"></span>
                <strong>{t('general.loading')}</strong>
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div className="nft-page-state center orange bold">{errorMessage}</div>
                ) : (
                  <>
                    {data.flags && (
                      <>
                        <section className="nft-overview">
                          <aside className="nft-media-card nft-offer-media-card is-measured">
                            <div className="nft-media-poster">
                              <NftImage
                                nft={data.nftoken}
                                sourceSize={960}
                                style={{ width: '100%', height: 'auto', marginRight: 0 }}
                              />
                            </div>
                          </aside>

                          <section className="nft-product-card">
                            <div className="nft-product-heading">
                              <div className="nft-offer-page-context">
                                <strong>{t('nft-offer.header')}</strong>
                                <div className="nft-offer-inline-id">
                                  <span>{t('nft-offer.header')} ID</span>
                                  <b title={data.offerIndex}>{shortHash(data.offerIndex, 12)}</b>
                                  <CopyButton text={data.offerIndex} size={15} />
                                </div>
                              </div>
                              <div className="nft-offer-heading-links">
                                {collectionHref && (
                                  <Link href={collectionHref} className="nft-product-collection">
                                    <IoImagesOutline aria-hidden="true" />
                                    <span>{collectionLabel}</span>
                                  </Link>
                                )}
                              </div>
                              <h1>{nftName(data.nftoken)}</h1>
                              {data.nftoken?.owner && (
                                <div className="nft-product-owner">
                                  <div className="nft-product-owner-identity">
                                    <span>{t('table.owner')}</span>
                                    <AddressWithIconInline data={data.nftoken} name="owner" />
                                  </div>
                                </div>
                              )}
                              <div className="nft-badges">
                                <span>
                                  {isSellOffer ? t('table.text.sell') : t('table.text.buy')} {t('table.offer')}
                                </span>
                                {marketplaceName && <span>{marketplaceName}</span>}
                                {!marketplaceName && <span>{offerVisibility}</span>}
                                <span
                                  className={
                                    offerStatusIsDanger ? 'danger' : offerStatusIsSuccess ? 'success' : undefined
                                  }
                                >
                                  {offerStatus}
                                </span>
                              </div>
                            </div>

                            <div className="nft-purchase-panel nft-offer-purchase-panel">
                              <div className="nft-listing-price">
                                <span>{t('table.amount')}</span>
                                <strong>{amountFormat(data.amount, { tooltip: 'right' })}</strong>
                                <small className="nft-offer-price-meta">
                                  {fiatRate > 0 && (
                                    <span>{tokenToFiat({ amount: data.amount, selectedCurrency, fiatRate })}</span>
                                  )}
                                  {lifecycleTimestamp && (
                                    <span>
                                      {lifecycleLabel} {timeFromNow(lifecycleTimestamp, i18n)}
                                    </span>
                                  )}
                                </small>
                              </div>
                              {(hasOfferActions || !isOfferOpen) && (
                                <div className="nft-primary-actions">
                                  {!isOfferOpen && (
                                    <Link
                                      href={`/nft/${data.nftokenID}`}
                                      className="button-action wide center"
                                    >
                                      <IoEyeOutline aria-hidden="true" />
                                      <span>{t('table.view')} NFT</span>
                                    </Link>
                                  )}
                                  {canAcceptSellOffer &&
                                    acceptNftSellOfferButton(t, setSignRequest, data, 'xls20', {
                                      icon: <IoCartOutline />
                                    })}
                                  {canAcceptBuyOffer &&
                                    acceptNftBuyOfferButton(t, setSignRequest, data, {
                                      icon: <IoStorefrontOutline />
                                    })}
                                  {canCancel &&
                                    cancelNftOfferButton(
                                      t,
                                      setSignRequest,
                                      account?.address,
                                      data,
                                      isSellOffer ? 'sell' : 'buy',
                                      data.type,
                                      data.nftokenID,
                                      { icon: <IoCloseCircleOutline /> }
                                    )}
                                  {marketplaceActionUrl && (
                                    <a
                                      className="button-action wide center nft-marketplace-action"
                                      href={marketplaceActionUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <IoOpenOutline aria-hidden="true" />
                                      <span>{marketplaceName}</span>
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="nft-offer-info-layout">
                              <section className="nft-offer-info-card">
                                <h2>Offer details</h2>
                                <div className="nft-offer-info-fields">
                                  <div>
                                    <span>{sellerOrBuyer}</span>
                                    <strong>
                                      <AddressWithIconInline data={data} name="account" options={{ short: 10 }} />
                                    </strong>
                                  </div>
                                  {data.destination && (
                                    <div>
                                      <span>{marketplaceName ? t('table.marketplace') : t('table.destination')}</span>
                                      <strong>
                                        <AddressWithIconInline data={data} name="destination" options={{ short: 10 }} />
                                      </strong>
                                    </div>
                                  )}
                                  <div>
                                    <span>{t('table.transfer-fee')}</span>
                                    <strong>
                                      {data.nftoken?.transferFee ? `${data.nftoken.transferFee / 1000}%` : '0%'}
                                    </strong>
                                  </div>
                                </div>
                              </section>
                              <section className="nft-offer-info-card">
                                <h2>Timeline</h2>
                                <div className="nft-offer-info-fields">
                                  <div>
                                    <span>{t('table.placed')}</span>
                                    <strong>{timeFromNow(data.createdAt, i18n)}</strong>
                                    <small>{fullDateAndTime(data.createdAt)} <LinkTx tx={data.createdTxHash} icon /></small>
                                  </div>
                                  {data.expiration && (
                                    <div>
                                      <span>{expirationExpired(t, data.expiration)}</span>
                                      <strong>{timeFromNow(data.expiration, i18n)}</strong>
                                      <small>{fullDateAndTime(data.expiration, 'expiration')}</small>
                                    </div>
                                  )}
                                  {(data.acceptedAt || data.canceledAt) && (
                                    <div>
                                      <span>{lifecycleLabel}</span>
                                      <strong>{timeFromNow(lifecycleTimestamp, i18n)}</strong>
                                      <small>
                                        {fullDateAndTime(lifecycleTimestamp)}{' '}
                                        <LinkTx tx={data.acceptedTxHash || data.canceledTxHash} icon />
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </section>
                            </div>
                          </section>
                        </section>

                        <section className="nft-context-card nft-offer-details-card">
                          <details className="nft-offer-technical-details">
                            <summary>{t('table.ledger-data')}</summary>
                            <div className="nft-offer-technical-grid">
                              <div>
                                <span>NFT ID</span>
                                <strong className="nft-context-id nft-offer-full-id">
                                  <Link href={`/nft/${data.nftokenID}`}>{data.nftokenID}</Link>
                                  <CopyButton text={data.nftokenID} size={16} />
                                </strong>
                              </div>
                              <div>
                                <span>{t('table.offer')}</span>
                                <strong className="nft-context-id">
                                  <span>{data.offerIndex}</span>
                                  <CopyButton text={data.offerIndex} size={16} />
                                </strong>
                              </div>
                              {data.acceptedAt && (
                                <div>
                                  <span>{t('table.accepted')}</span>
                                  <strong>{fullDateAndTime(data.acceptedAt)} <LinkTx tx={data.acceptedTxHash} icon /></strong>
                                </div>
                              )}
                              {data.acceptedAccount && (
                                <div>
                                  <span>{t('table.accepted-by')}</span>
                                  <strong>
                                    <AddressWithIconInline data={data} name="acceptedAccount" options={{ short: 10 }} />
                                  </strong>
                                </div>
                              )}
                              {data.canceledAt && (
                                <div>
                                  <span>
                                    {t('table.offer')}: {t('table.canceled')}
                                  </span>
                                  <strong>{fullDateAndTime(data.canceledAt)} <LinkTx tx={data.canceledTxHash} icon /></strong>
                                </div>
                              )}
                            </div>
                          </details>
                        </section>

                        {data.nftokenID && (
                          <section className="nft-related-section nft-offer-related-offers">
                            <div className="nft-related-header">
                              <div>
                                <h2>{t('nft-offers.header')}</h2>
                                <span>{nftName(data.nftoken)}</span>
                              </div>
                            </div>
                            {relatedNftOffersLoading ? (
                              <div className="nft-related-loading">
                                <span className="waiting" />
                              </div>
                            ) : relatedOfferGroups.length > 0 ? (
                              <div className="nft-offer-type-groups">
                                {relatedOfferGroups.map((group) => (
                                  <section className="nft-offer-type-group" key={group.type}>
                                    <div className="nft-offer-type-heading">
                                      <h3>{group.label}</h3>
                                      <span>{group.offers.length}</span>
                                    </div>
                                    <div className="nft-offer-list">
                                      {group.offers.map((offer) => (
                                        <article className="nft-offer-card" key={offer.offerIndex}>
                                          <div className="nft-offer-card-top">
                                            <div className="nft-offer-card-price">
                                              <span>{t('table.amount')}</span>
                                              <div>
                                                <strong>{amountFormat(offer.amount, { withIssuer: true })}</strong>
                                                {fiatRate > 0 && (
                                                  <small>
                                                    {tokenToFiat({ amount: offer.amount, selectedCurrency, fiatRate })}
                                                  </small>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="nft-offer-card-id">
                                            <span>{t('table.offer')}</span>
                                            <strong>
                                              <Link href={`/nft-offer/${offer.offerIndex}`}>
                                                {shortHash(offer.offerIndex, 12)}
                                              </Link>
                                            </strong>
                                          </div>
                                          <div className="nft-offer-card-details">
                                            <div>
                                              <span>{group.type === 'buy' ? t('table.buyer') : t('table.seller')}</span>
                                              <strong>
                                                <AddressWithIconInline
                                                  data={offer}
                                                  name="owner"
                                                  options={{ short: 8 }}
                                                />
                                              </strong>
                                            </div>
                                            {offer.createdAt && (
                                              <div>
                                                <span>{t('table.placed')}</span>
                                                <strong className="nft-offer-date">
                                                  <span>{timeFromNow(offer.createdAt, i18n)}</span>
                                                  <small>{fullDateAndTime(offer.createdAt)}</small>
                                                </strong>
                                              </div>
                                            )}
                                            {offer.expiration && (
                                              <div>
                                                <span>{expirationExpired(t, offer.expiration)}</span>
                                                <strong>{fullDateAndTime(offer.expiration, 'expiration')}</strong>
                                              </div>
                                            )}
                                          </div>
                                        </article>
                                      ))}
                                    </div>
                                  </section>
                                ))}
                              </div>
                            ) : (
                              <div className="nft-offers-empty">{t('table.text.no-offers')}</div>
                            )}
                          </section>
                        )}

                        {(relatedCollectionLoading || relatedCollectionNfts.length > 0) && (
                          <section className="nft-related-section nft-offer-related-section">
                            <div className="nft-related-header">
                              <div>
                                <h2>
                                  {relatedCollectionMode === 'listings'
                                    ? t('nft-statistics.for-sale')
                                    : t('table.collection')}
                                </h2>
                                <span>{collectionLabel}</span>
                              </div>
                              {collectionHref && (
                                <Link href={collectionHref} className="nft-related-link">
                                  <IoImagesOutline aria-hidden="true" />
                                  <span>{t('table.collection')}</span>
                                </Link>
                              )}
                            </div>
                            {relatedCollectionLoading ? (
                              <div className="nft-related-loading">
                                <span className="waiting" />
                              </div>
                            ) : (
                              <div className="nft-related-grid">
                                {relatedCollectionNfts.map((nft) => {
                                  const listing = nft.sellOffers?.[0]
                                  return (
                                    <Link
                                      href={`/nft/${nft.nftokenID}`}
                                      key={nft.nftokenID}
                                      className="nft-related-card"
                                    >
                                      <NftImage nft={nft} sourceSize={240} style={{ width: '100%', marginRight: 0 }} />
                                      <span>{nftName(nft) || shortHash(nft.nftokenID)}</span>
                                      {listing?.amount ? (
                                        <small className="nft-related-price">
                                          <strong>{amountFormat(listing.amount)}</strong>
                                          {fiatRate > 0 && (
                                            <span>
                                              {tokenToFiat({ amount: listing.amount, selectedCurrency, fiatRate })}
                                            </span>
                                          )}
                                        </small>
                                      ) : (
                                        <small>#{nft.nftSerial ?? nft.sequence}</small>
                                      )}
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </section>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <section className="nft-page-state">
            <h1>{t('nft-offer.header')}</h1>
            <p className="center">{t('nft-offer.desc')}</p>
            <SearchBlock searchPlaceholderText={t('nft-offer.enter-offer-id')} tab="nft-offer" type="explorer" />
          </section>
        )}
      </main>
    </div>
  )
}
