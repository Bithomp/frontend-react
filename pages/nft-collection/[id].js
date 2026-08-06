import { i18n } from 'next-i18next'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  IoCartOutline,
  IoGridOutline,
  IoImagesOutline,
  IoPeopleOutline,
  IoPulseOutline,
  IoRefreshOutline,
  IoSwapHorizontalOutline,
  IoTimeOutline,
  IoWarningOutline
} from 'react-icons/io5'

import {
  AddressWithIconInline,
  AddressWithIconFilled,
  amountFormatNode,
  amountParced,
  convertedAmount,
  fullDateAndTime,
  niceNumber,
  shortNiceNumber,
  timeFromNow,
  tokenToFiat
} from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { assetUrl, bestNftOffer, collectionNameText, nftName, NftImage } from '../../utils/nft'
import { nativeCurrency } from '../../utils'
import { currencyServer, axiosServer, passHeaders } from '../../utils/axios'

import SEO from '../../components/SEO'
import CopyButton from '../../components/UI/CopyButton'
import { useTheme } from '../../components/Layout/ThemeContext'
import { apexChartTheme, apexDonutSliceColors, apexDonutStates } from '../../utils/apexCharts'
import { nftClass } from '../../styles/pages/nft.module.scss'
import { collectionClass } from '../../styles/pages/nft-collection.module.scss'

const collectionRequest = (url, req) =>
  axiosServer({
    method: 'get',
    url,
    headers: passHeaders(req)
  })

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const compactMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return metadata || null

  const {
    name,
    title,
    image,
    image_url,
    thumbnail,
    thumbnail_url,
    animation,
    animation_url,
    video,
    content,
    files,
    file_extension
  } = metadata

  return {
    name: name || null,
    title: title || null,
    image: image || null,
    image_url: image_url || null,
    thumbnail: thumbnail || null,
    thumbnail_url: thumbnail_url || null,
    animation: animation || null,
    animation_url: animation_url || null,
    video: video || null,
    content: content || null,
    files: files || null,
    file_extension: file_extension || null
  }
}

const compactOffer = (offer) =>
  offer
    ? {
        offerIndex: offer.offerIndex || null,
        amount: offer.amount,
        createdAt: offer.createdAt || null,
        destination: offer.destination || null,
        destinationDetails: offer.destinationDetails
          ? { service: offer.destinationDetails.service || null, username: offer.destinationDetails.username || null }
          : null,
        valid: offer.valid ?? null,
        flags: offer.flags || null
      }
    : null

const compactNft = (nft) =>
  nft
    ? {
        type: nft.type || null,
        flags: nft.flags || null,
        issuer: nft.issuer || null,
        issuerDetails: nft.issuerDetails || null,
        nftokenID: nft.nftokenID,
        nftSerial: nft.nftSerial ?? null,
        sequence: nft.sequence ?? null,
        issuedAt: nft.issuedAt || null,
        transferFee: nft.transferFee || 0,
        deletedAt: nft.deletedAt || null,
        uri: nft.uri || null,
        url: nft.url || null,
        metadata: compactMetadata(nft.metadata),
        sellOffers: (nft.sellOffers || []).map(compactOffer).filter(Boolean),
        buyOffers: (nft.buyOffers || []).map(compactOffer).filter(Boolean)
      }
    : null

const compactSale = (sale) =>
  sale
    ? {
        nftokenID: sale.nftokenID,
        acceptedAt: sale.acceptedAt || null,
        acceptedTxHash: sale.acceptedTxHash || null,
        amount: sale.amount,
        amountInConvertCurrencies: sale.amountInConvertCurrencies || null,
        marketplace: sale.marketplace || null,
        acceptedAccountDetails: sale.acceptedAccountDetails
          ? { service: sale.acceptedAccountDetails.service || null }
          : null,
        nftoken: compactNft(sale.nftoken)
      }
    : null

const compactHolder = (holder) =>
  holder
    ? {
        address: holder.address,
        addressDetails: holder.addressDetails
          ? { service: holder.addressDetails.service || null, username: holder.addressDetails.username || null }
          : null,
        total: holder.total || 0
      }
    : null

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const routeId = query.id ? (Array.isArray(query.id) ? query.id[0] : query.id) : ''
  const collectionId = routeId.replace(/%3A/gi, ':')
  const initialCurrency = currencyServer(req)

  let data = null
  let nftList = []
  let listedNfts = []
  let bidNfts = []
  let recentSales = []
  let listedTotal = 0
  let bidsTotal = 0
  let salesTotal = null
  let dayVolume = null
  let holders = []
  let holdersSummary = null
  let errorStatus = null
  let errorMessage = ''

  try {
    const collectionResponse = await collectionRequest(
      `/v2/nft-collection/${encodeURIComponent(collectionId)}?floorPrice=true&statistics=true`,
      req
    )
    data = collectionResponse?.data || null
    const collection = data?.collection
    const volumeUrl =
      collection?.issuer && collection?.taxon != null
        ? `/v2/nft-volumes-extended?issuer=${encodeURIComponent(
            collection.issuer
          )}&list=taxons&convertCurrencies=${initialCurrency}&sortCurrency=${initialCurrency}&statistics=true&period=day&saleType=all`
        : ''

    const [
      nftsResponse,
      listingsResponse,
      bidsResponse,
      salesResponse,
      volumeResponse,
      holdersResponse
    ] = await Promise.all([
      collectionRequest(
        `/v2/nfts?collection=${encodeURIComponent(collectionId)}&limit=12&order=mintedNew&hasMedia=true`,
        req
      ).catch(() => null),
      collectionRequest(
        `/v2/nfts?collection=${encodeURIComponent(
          collectionId
        )}&list=onSale&destination=publicAndKnownBrokers&order=priceLow&limit=12&currency=${nativeCurrency.toLowerCase()}&hasMedia=true`,
        req
      ).catch(() => null),
      collectionRequest(
        `/v2/nfts?collection=${encodeURIComponent(
          collectionId
        )}&list=bids&order=priceHigh&currency=${nativeCurrency}&offersValidate=true&includeWithoutMediaData=true&limit=12`,
        req
      ).catch(() => null),
      collectionRequest(
        `/v2/nft-sales?collection=${encodeURIComponent(
          collectionId
        )}&list=lastSold&limit=10&convertCurrencies=${initialCurrency}`,
        req
      ).catch(() => null),
      volumeUrl ? collectionRequest(volumeUrl, req).catch(() => null) : Promise.resolve(null),
      collectionRequest(
        `/v2/nft-owners?order=total&collection=${encodeURIComponent(collectionId)}&limit=100`,
        req
      ).catch(() => null)
    ])

    nftList = (nftsResponse?.data?.nfts || []).map(compactNft).filter(Boolean)
    listedNfts = (listingsResponse?.data?.nfts || []).map(compactNft).filter(Boolean)
    bidNfts = (bidsResponse?.data?.nfts || []).map(compactNft).filter(Boolean)
    recentSales = (salesResponse?.data?.sales || []).map(compactSale).filter(Boolean)
    listedTotal = listingsResponse?.data?.summary?.total || 0
    bidsTotal = bidsResponse?.data?.summary?.total || 0
    salesTotal = salesResponse?.data?.total || null
    dayVolume = volumeResponse?.data?.taxons?.find(
      (item) => Number(item.taxon) === Number(collection?.taxon)
    ) || null
    holders = (holdersResponse?.data?.owners || []).map(compactHolder).filter(Boolean)
    holdersSummary = holdersResponse?.data?.summary
      ? {
          totalNfts: holdersResponse.data.summary.totalNfts || 0,
          totalOwners: holdersResponse.data.summary.totalOwners || 0
        }
      : null
  } catch (error) {
    errorStatus = error?.response?.status || null
    errorMessage =
      errorStatus === 429
        ? 'The collection could not be loaded because the server is receiving too many requests.'
        : errorStatus === 404
          ? 'This NFT collection could not be found.'
          : 'The NFT collection could not be loaded.'
  }

  if (!data) errorMessage = errorMessage || 'The NFT collection could not be found.'

  return {
    props: {
      id: collectionId || null,
      data,
      nftList,
      listedNfts,
      bidNfts,
      recentSales,
      listedTotal,
      bidsTotal,
      salesTotal,
      dayVolume,
      holders,
      holdersSummary,
      initialCurrency,
      isSsrMobile: getIsSsrMobile(context),
      errorStatus,
      errorMessage: errorMessage || null,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const FormattedNumber = ({ value, suffix = '' }) => (
  <span suppressHydrationWarning>{value == null ? '—' : `${niceNumber(value)}${suffix}`}</span>
)

const MarketCard = ({ item, type, selectedCurrency, fiatRate }) => {
  const nft = type === 'sale' ? item?.nftoken : item
  if (!nft?.nftokenID) return null

  const listing = type === 'listing' ? bestNftOffer(item?.sellOffers, null, 'sell') : null
  const bid = type === 'bid' ? bestNftOffer(item?.buyOffers, null, 'buy') : null
  const offer = listing || bid
  const amount = type === 'sale' ? item.amount : offer?.amount
  const marketplace =
    type === 'sale'
      ? item.marketplace || item.acceptedAccountDetails?.service
      : offer?.destinationDetails?.service || (offer?.destination ? 'Private market' : 'Open market')
  const timestamp = type === 'sale' ? item.acceptedAt : ['listing', 'bid'].includes(type) ? offer?.createdAt : nft.issuedAt
  const badge = type === 'sale' ? 'Sold' : type === 'listing' ? 'For sale' : type === 'bid' ? 'Top bid' : 'New'
  const serial = nft.nftSerial ?? nft.sequence
  const name = nftName(nft)

  return (
    <Link href={`/nft/${nft.nftokenID}`} className="nft-collection-item-card">
      <div className="nft-collection-item-media">
        <NftImage nft={nft} sourceSize={360} style={{ width: '100%', height: '100%', marginRight: 0 }} />
        <span className={`nft-collection-item-badge is-${type}`}>{badge}</span>
      </div>
      <div className="nft-collection-item-body">
        <div className="nft-collection-item-name">
          <strong>{name || `NFT #${serial}`}</strong>
        </div>
        {amount ? (
          <div className="nft-collection-item-price">
            <span>{type === 'sale' ? 'Last sale' : type === 'bid' ? 'Highest offer' : 'Price'}</span>
            <strong>{amountFormatNode(amount, { short: true })}</strong>
            <small>
              {type === 'sale'
                ? convertedAmount(item, selectedCurrency, { short: true })
                : tokenToFiat({ amount, selectedCurrency, fiatRate })}
            </small>
          </div>
        ) : (
          <div className="nft-collection-item-price is-empty">
            <span>Not listed</span>
          </div>
        )}
        <div className="nft-collection-item-meta">
          <span>{marketplace || (type === 'new' ? 'Recently minted' : 'XRPL')}</span>
          {timestamp && <span>{timeFromNow(timestamp, i18n)}</span>}
        </div>
      </div>
    </Link>
  )
}

export default function NftCollection({
  id,
  nftList,
  listedNfts,
  bidNfts,
  recentSales,
  listedTotal,
  bidsTotal,
  salesTotal,
  dayVolume,
  holders,
  holdersSummary,
  initialCurrency,
  selectedCurrency,
  fiatRate,
  errorStatus,
  errorMessage,
  data
}) {
  const router = useRouter()
  const { theme } = useTheme()
  const aboutDetailsRef = useRef(null)
  const collection = data?.collection
  const statistics = collection?.statistics
  const [marketTab, setMarketTab] = useState(listedNfts.length > 0 ? 'listing' : 'new')
  const [marketData, setMarketData] = useState({
    listings: listedNfts,
    bids: bidNfts,
    sales: recentSales,
    listedTotal,
    bidsTotal,
    dayVolume
  })
  const [marketLoading, setMarketLoading] = useState(false)
  const [showAllHolders, setShowAllHolders] = useState(false)

  useEffect(() => {
    const openAboutFromHash = () => {
      if (window.location.hash === '#about' && aboutDetailsRef.current) {
        aboutDetailsRef.current.open = true
      }
    }

    openAboutFromHash()
    window.addEventListener('hashchange', openAboutFromHash)
    return () => window.removeEventListener('hashchange', openAboutFromHash)
  }, [])

  useEffect(() => {
    if (!id || !selectedCurrency || selectedCurrency === initialCurrency) return

    let canceled = false
    const refreshMarketData = async () => {
      setMarketLoading(true)
      const volumeUrl =
        collection?.issuer && collection?.taxon != null
          ? `/v2/nft-volumes-extended?issuer=${encodeURIComponent(
              collection.issuer
            )}&list=taxons&convertCurrencies=${selectedCurrency}&sortCurrency=${selectedCurrency}&statistics=true&period=day&saleType=all`
          : ''
      const [listingsResponse, salesResponse, volumeResponse] = await Promise.all([
        axios(
          `/v2/nfts?collection=${encodeURIComponent(
            id
          )}&list=onSale&destination=publicAndKnownBrokers&order=priceLow&limit=12&currency=${nativeCurrency.toLowerCase()}&hasMedia=true`
        ).catch(() => null),
        axios(
          `/v2/nft-sales?collection=${encodeURIComponent(
            id
          )}&list=lastSold&limit=10&convertCurrencies=${selectedCurrency}`
        ).catch(() => null),
        volumeUrl ? axios(volumeUrl).catch(() => null) : Promise.resolve(null)
      ])

      if (!canceled) {
        setMarketData({
          listings: (listingsResponse?.data?.nfts || []).map(compactNft).filter(Boolean),
          bids: bidNfts,
          sales: (salesResponse?.data?.sales || []).map(compactSale).filter(Boolean),
          listedTotal: listingsResponse?.data?.summary?.total || 0,
          bidsTotal,
          dayVolume:
            volumeResponse?.data?.taxons?.find((item) => Number(item.taxon) === Number(collection?.taxon)) || null
        })
        setMarketLoading(false)
      }
    }

    refreshMarketData()
    return () => {
      canceled = true
    }
  }, [bidNfts, bidsTotal, collection?.issuer, collection?.taxon, id, initialCurrency, selectedCurrency])

  const collectionName = collectionNameText(collection)
  const imageUrl = assetUrl(collection?.image)
  const collectionPart =
    collection?.issuer && collection?.taxon != null
      ? `issuer=${collection.issuer}&taxon=${collection.taxon}`
      : `collection=${id}`
  const allNftsHref = `/nft-explorer?${collectionPart}&includeWithoutMediaData=true`
  const listedHref = `${allNftsHref}&list=onSale&saleDestination=publicAndKnownBrokers`
  const salesHref = `/nft-sales?${collectionPart}&sale=primaryAndSecondary&includeWithoutMediaData=true&period=all&order=soldNew`
  const daySalesHref = `/nft-sales?${collectionPart}&sale=primaryAndSecondary&includeWithoutMediaData=true&period=day&order=soldNew`
  const bidsHref = `${allNftsHref}&list=bids&order=priceHigh&currency=${nativeCurrency}&offersValidate=true`
  const holdersHref = `/nft-distribution?${collectionPart}`

  const floorEntries = useMemo(
    () =>
      (collection?.floorPrices || []).flatMap((prices) =>
        [
          prices.open && { ...prices.open, source: 'Open market', type: 'open' },
          prices.private && {
            ...prices.private,
            source: prices.private.destinationDetails?.service || 'Marketplace',
            type: 'private'
          }
        ].filter(Boolean)
      ),
    [collection?.floorPrices]
  )

  const primaryFloor = useMemo(() => {
    const nativeFloors = floorEntries.filter((entry) => amountParced(entry.amount)?.type === nativeCurrency)
    return (nativeFloors.length > 0 ? nativeFloors : floorEntries).reduce((lowest, entry) => {
      if (!lowest) return entry
      return Number(amountParced(entry.amount)?.value) < Number(amountParced(lowest.amount)?.value) ? entry : lowest
    }, null)
  }, [floorEntries])

  const ownerRatio = statistics?.owners && statistics?.nfts ? (statistics.owners / statistics.nfts) * 100 : null
  const listedRatio = marketData.listedTotal && statistics?.nfts ? (marketData.listedTotal / statistics.nfts) * 100 : null
  const royalty = nftList?.[0]?.transferFee ? nftList[0].transferFee / 1000 : 0
  const marketItems =
    marketTab === 'listing'
      ? marketData.listings
      : marketTab === 'bid'
        ? marketData.bids
        : marketTab === 'sale'
          ? marketData.sales
          : nftList
  const marketType = ['listing', 'bid', 'sale'].includes(marketTab) ? marketTab : 'new'
  const effectiveCurrency = selectedCurrency || initialCurrency
  const dayVolumeValue = marketData.dayVolume?.volumesInConvertCurrencies?.[effectiveCurrency]
  const totalNfts = holdersSummary?.totalNfts || statistics?.nfts || 0
  const totalHolders = holdersSummary?.totalOwners || statistics?.owners || 0
  const topHoldersTotal = holders.reduce((total, holder) => total + Number(holder.total || 0), 0)
  const topHoldersShare = totalNfts ? (topHoldersTotal / totalNfts) * 100 : null
  const holderChartItems = useMemo(() => {
    if (!totalNfts) return []

    const items = holders
      .filter((holder) => Number(holder.total) > 0)
      .map((holder) => ({
        label: holder.addressDetails?.service || holder.addressDetails?.username || holder.address,
        value: Number(holder.total)
      }))
    const otherTotal = Math.max(Number(totalNfts) - topHoldersTotal, 0)
    if (otherTotal > 0) items.push({ label: 'Other holders', value: otherTotal })
    return items
  }, [holders, topHoldersTotal, totalNfts])
  const holderChartOptions = useMemo(() => {
    const chartTheme = apexChartTheme(theme)
    const hasOtherHolders = holderChartItems.at(-1)?.label === 'Other holders'
    return {
      chart: { type: 'donut', animations: { enabled: false }, foreColor: chartTheme.textColor, toolbar: { show: false } },
      labels: holderChartItems.map((item) => item.label),
      colors: apexDonutSliceColors(holderChartItems.length + (hasOtherHolders ? 0 : 1)).slice(
        0,
        holderChartItems.length
      ),
      states: apexDonutStates,
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 1, colors: ['var(--card-bg)'] },
      tooltip: {
        theme: chartTheme.tooltipTheme,
        y: { formatter: (value) => `${niceNumber(value)} NFTs` }
      },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: '68%',
            labels: {
              show: true,
              name: { show: true, fontSize: '12px', color: chartTheme.labelColor },
              value: {
                show: true,
                fontSize: '16px',
                fontWeight: 700,
                color: chartTheme.textColor,
                formatter: (value) => `${niceNumber(value)} NFTs`
              },
              total: {
                show: true,
                showAlways: true,
                label: `Top ${holders.length}`,
                color: chartTheme.labelColor,
                formatter: () => (topHoldersShare == null ? '—' : `${niceNumber(topHoldersShare, 1)}%`)
              }
            }
          }
        }
      }
    }
  }, [holderChartItems, holders.length, theme, topHoldersShare])
  const periodStats = [
    { label: '24 hours', period: 'day', value: statistics?.day },
    { label: '7 days', period: 'week', value: statistics?.week },
    { label: '30 days', period: 'month', value: statistics?.month },
    { label: 'All time', period: 'all', value: statistics?.all }
  ]

  if (!id || data?.error || errorMessage) {
    const notFound = !id || errorStatus === 404
    const errorTitle = notFound
      ? 'NFT collection not found'
      : errorStatus === 429
        ? 'Collection temporarily unavailable'
        : 'Could not load this collection'

    return (
      <div className={`${nftClass} ${collectionClass}`}>
        <main className="nft-detail-page nft-collection-detail-page">
          <section className="nft-page-state nft-collection-error-state">
            <IoWarningOutline aria-hidden="true" />
            <h1>{errorTitle}</h1>
            <p>
              {errorMessage ||
                (notFound
                  ? 'Check the collection link or browse the NFT collections directory.'
                  : 'Please wait a moment and try again.')}
              {errorStatus === 429 && ' Please wait a moment and try again.'}
            </p>
            <div className="nft-collection-error-actions">
              {!notFound && (
                <button type="button" className="button-action" onClick={() => router.reload()}>
                  <IoRefreshOutline aria-hidden="true" />
                  Try again
                </button>
              )}
              <Link href="/nft-volumes?period=week" className="button-action secondary">
                Browse collections
              </Link>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className={`${nftClass} ${collectionClass}`}>
      <SEO
        title={`NFT Collection: ${collectionName}`}
        description={collection?.description || `Explore ${collectionName} NFTs, listings and recent sales on XRPL.`}
        image={{ file: imageUrl }}
      />

      <main className="nft-detail-page nft-collection-detail-page">
        <section className="nft-collection-hero">
          <div className="nft-collection-hero-image">
            {imageUrl ? <img src={imageUrl} alt={collectionName} /> : <IoImagesOutline aria-hidden="true" />}
          </div>
          <div className="nft-collection-hero-content">
            <span className="nft-page-eyebrow">NFT collection</span>
            <h1>{collectionName}</h1>
            {collection?.description && <p>{collection.description}</p>}
            <div className="nft-collection-creator">
              <span>Issued by</span>
              <AddressWithIconFilled data={collection} name="issuer" />
            </div>
          </div>
          <div className="nft-collection-hero-actions">
            <a href={listedHref} className="button-action wide center">
              <IoCartOutline aria-hidden="true" />
              Browse listings
            </a>
            <a href={allNftsHref} className="button-action secondary wide center">
              <IoGridOutline aria-hidden="true" />
              View all NFTs
            </a>
          </div>
        </section>

        <nav className="nft-collection-nav" aria-label="Collection views">
          <a href="#items">NFTs</a>
          <a href="#holders">Holders</a>
          <a href="#activity">Activity</a>
          <a
            href="#about"
            onClick={() => {
              if (aboutDetailsRef.current) aboutDetailsRef.current.open = true
            }}
          >
            On-chain details
          </a>
        </nav>

        <section className="nft-collection-kpis" aria-label="Collection market overview">
          <Link href={listedHref} className="nft-collection-kpi is-primary">
            <span>Best floor</span>
            <strong>{primaryFloor ? amountFormatNode(primaryFloor.amount, { short: true }) : '—'}</strong>
            <small>{primaryFloor?.source || 'No listed NFTs'}</small>
          </Link>
          <Link href={allNftsHref} className="nft-collection-kpi">
            <span>Items</span>
            <strong><FormattedNumber value={statistics?.nfts} /></strong>
            <small>Total supply</small>
          </Link>
          <a href="#holders" className="nft-collection-kpi">
            <span>Owners</span>
            <strong><FormattedNumber value={statistics?.owners} /></strong>
            <small suppressHydrationWarning>
              {ownerRatio == null ? '—' : `${niceNumber(ownerRatio, 1)}% owner ratio`}
            </small>
          </a>
          <Link href={listedHref} className="nft-collection-kpi">
            <span>Listed</span>
            <strong><FormattedNumber value={marketData.listedTotal} /></strong>
            <small suppressHydrationWarning>
              {listedRatio == null ? '—' : `${niceNumber(listedRatio, 1)}% of supply`}
            </small>
          </Link>
          <Link href={daySalesHref} className="nft-collection-kpi">
            <span>24h NFTs traded</span>
            <strong><FormattedNumber value={statistics?.day?.tradedNfts} /></strong>
            <small>{statistics?.day?.buyers ?? 0} buyers</small>
          </Link>
          <Link href={daySalesHref} className="nft-collection-kpi">
            <span>24h volume</span>
            <strong suppressHydrationWarning>
              {dayVolumeValue == null ? '—' : shortNiceNumber(dayVolumeValue, 2, 1, effectiveCurrency)}
            </strong>
            <small>{marketData.dayVolume?.sales ?? 0} sales</small>
          </Link>
        </section>

        <section className="nft-collection-market" id="items">
          <div className="nft-collection-section-heading">
            <div>
              <span>Explore the collection</span>
              <h2>
                {marketTab === 'listing'
                  ? 'NFTs for sale'
                  : marketTab === 'bid'
                    ? 'NFTs with top bids'
                    : marketTab === 'sale'
                      ? 'Recent sales'
                      : 'Newest NFTs'}
              </h2>
            </div>
            <Link
              className="button-action secondary thin narrow nft-collection-section-action"
              href={
                marketTab === 'sale'
                  ? salesHref
                  : marketTab === 'listing'
                    ? listedHref
                    : marketTab === 'bid'
                      ? bidsHref
                      : allNftsHref
              }
            >
              {marketTab === 'listing' ? 'View all listed NFTs' : 'View all'}
            </Link>
          </div>
          <div className="nft-collection-market-toolbar" role="tablist" aria-label="Collection inventory">
            <button
              type="button"
              role="tab"
              aria-selected={marketTab === 'listing'}
              className={marketTab === 'listing' ? 'active' : ''}
              onClick={() => setMarketTab('listing')}
            >
              For sale <span>{marketData.listedTotal || 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={marketTab === 'bid'}
              className={marketTab === 'bid' ? 'active' : ''}
              onClick={() => setMarketTab('bid')}
            >
              Top bids <span>{marketData.bidsTotal || 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={marketTab === 'sale'}
              className={marketTab === 'sale' ? 'active' : ''}
              onClick={() => setMarketTab('sale')}
            >
              Recent sales
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={marketTab === 'new'}
              className={marketTab === 'new' ? 'active' : ''}
              onClick={() => setMarketTab('new')}
            >
              Newest
            </button>
          </div>
          {marketLoading ? (
            <div className="nft-collection-market-loading">
              <span className="waiting" />
            </div>
          ) : marketItems.length > 0 ? (
            <div className="nft-collection-items-grid">
              {marketItems.slice(0, 10).map((item) => (
                <MarketCard
                  key={item.nftokenID || item.nftoken?.nftokenID}
                  item={item}
                  type={marketType}
                  selectedCurrency={selectedCurrency || initialCurrency}
                  fiatRate={fiatRate}
                />
              ))}
            </div>
          ) : (
            <div className="nft-collection-empty-state">
              <IoImagesOutline aria-hidden="true" />
              <strong>No NFTs found</strong>
              <span>Try another collection view.</span>
            </div>
          )}
        </section>

        <section className="nft-collection-holders" id="holders">
          <div className="nft-collection-section-heading">
            <div>
              <span>Ownership</span>
              <h2>
                Top holders
                {totalHolders > 0 ? <small>{niceNumber(totalHolders)} holders</small> : null}
              </h2>
              <p>How the collection is distributed across its largest holders.</p>
            </div>
            <Link
              href={holdersHref}
              className="button-action secondary thin narrow nft-collection-section-action"
            >
              View all holders
            </Link>
          </div>
          {holders.length > 0 ? (
            <div className="nft-collection-holders-layout">
              <div className="nft-collection-holder-chart">
                {holderChartItems.length > 0 ? (
                  <Chart
                    type="donut"
                    series={holderChartItems.map((item) => item.value)}
                    options={holderChartOptions}
                    height={250}
                  />
                ) : null}
                <div className="nft-collection-holder-chart-summary">
                  <strong>{niceNumber(topHoldersTotal)} NFTs</strong>
                  <span>
                    held by the top {holders.length} of {niceNumber(totalHolders)} holders
                  </span>
                </div>
              </div>
              <div
                className={`nft-collection-holder-list${showAllHolders ? ' is-expanded' : ' is-collapsed'}`}
              >
                <div className="nft-collection-holder-list-heading">
                  <span>#</span>
                  <span>Holder</span>
                  <span>Share</span>
                  <span>NFTs</span>
                </div>
                {holders.map((holder, index) => (
                  <div className="nft-collection-holder-row" key={holder.address}>
                    <span className="nft-collection-holder-rank">{index + 1}</span>
                    <div className="nft-collection-holder-account">
                      <Link href={`/account/${holder.address}`} prefetch={false}>
                        <AddressWithIconInline data={holder} options={{ noLink: true }} />
                      </Link>
                    </div>
                    <strong className="nft-collection-holder-share">
                      {totalNfts ? `${niceNumber((holder.total / totalNfts) * 100, 2)}%` : '—'}
                    </strong>
                    <Link
                      href={`${allNftsHref}&owner=${encodeURIComponent(holder.address)}`}
                      className="nft-collection-holder-balance"
                      prefetch={false}
                      title={`View ${niceNumber(holder.total)} NFTs from this collection`}
                    >
                      {niceNumber(holder.total)}
                    </Link>
                  </div>
                ))}
                {holders.length > 10 ? (
                  <button
                    type="button"
                    className="button-action thin narrow nft-collection-holder-toggle"
                    onClick={() => setShowAllHolders((current) => !current)}
                  >
                    {showAllHolders ? 'Show top 10' : `Show all ${holders.length}`}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="nft-collection-holders-empty">
              <span>Holder preview is unavailable.</span>
              <Link href={holdersHref}>Open holder distribution</Link>
            </div>
          )}
        </section>

        <section className="nft-collection-activity" id="activity">
          <div className="nft-collection-section-heading">
            <div>
              <span>Market activity</span>
              <h2>Collection momentum</h2>
            </div>
            <Link href={salesHref}>Full sales history</Link>
          </div>
          <div className="nft-collection-period-grid">
            {periodStats.map((period) => (
              <Link
                href={`/nft-sales?${collectionPart}&sale=primaryAndSecondary&includeWithoutMediaData=true&period=${period.period}&order=soldNew`}
                key={period.label}
              >
                <span>{period.label}</span>
                <strong><FormattedNumber value={period.value?.tradedNfts} /></strong>
                <small>traded NFTs</small>
                <em><FormattedNumber value={period.value?.buyers} /> buyers</em>
              </Link>
            ))}
          </div>
          <div className="nft-collection-market-summary">
            <Link href={salesHref}>
              <IoSwapHorizontalOutline aria-hidden="true" />
              <span>Recorded sales</span>
              <strong><FormattedNumber value={(salesTotal?.primary || 0) + (salesTotal?.secondary || 0)} /></strong>
            </Link>
            <div>
              <IoPeopleOutline aria-hidden="true" />
              <span>All-time buyers</span>
              <strong><FormattedNumber value={statistics?.all?.buyers} /></strong>
            </div>
            <div>
              <IoPulseOutline aria-hidden="true" />
              <span>Royalty</span>
              <strong>{royalty}%</strong>
            </div>
          </div>
        </section>

        <section className="nft-collection-about" id="about">
          <details ref={aboutDetailsRef}>
            <summary>
              <span>
                <IoTimeOutline aria-hidden="true" />
                About and on-chain details
              </span>
              <small>Issuer, taxon, floors and dates</small>
            </summary>
            <div className="nft-collection-about-grid">
              <div>
                <span>Collection ID</span>
                <strong className="nft-collection-copy-value">
                  <span>{id}</span>
                  <CopyButton text={id} size={16} />
                </strong>
              </div>
              <div>
                <span>Issuer</span>
                <strong><AddressWithIconFilled data={collection} name="issuer" /></strong>
              </div>
              <div>
                <span>Taxon</span>
                <strong>{collection?.taxon ?? '—'}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{collection?.createdAt ? fullDateAndTime(collection.createdAt) : '—'}</strong>
              </div>
              <div>
                <span>Updated</span>
                <strong>{collection?.updatedAt ? fullDateAndTime(collection.updatedAt) : '—'}</strong>
              </div>
              <div>
                <span>Royalty</span>
                <strong>{royalty}%</strong>
              </div>
            </div>
            {floorEntries.length > 0 && (
              <div className="nft-collection-floor-sources">
                <span>Floor sources</span>
                <div>
                  {floorEntries.map((floor) => (
                    <Link href={listedHref} key={`${floor.type}-${floor.source}`}>
                      <span>{floor.source}</span>
                      <strong>{amountFormatNode(floor.amount, { short: true })}</strong>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </details>
        </section>
      </main>
    </div>
  )
}
