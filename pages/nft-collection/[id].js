import { i18n, useTranslation } from 'next-i18next'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import {
  AddressWithIconFilled,
  amountFormat,
  convertedAmount,
  nativeCurrencyToFiat,
  fullDateAndTime,
  timeFromNow,
  AddressWithIconInline
} from '../../utils/format'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
import { nftName, NftImage, assetUrl, collectionNameText, isValidTaxon } from '../../utils/nft'

import SEO from '../../components/SEO'
import { nftClass } from '../../styles/pages/nft.module.scss'
import { nativeCurrency } from '../../utils'
import { axiosServer, passHeaders } from '../../utils/axios'
import { LinkListedNfts, LinkTx } from '../../utils/links'
import Tabs from '../../components/Tabs'
import { useRouter } from 'next/router'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id } = query
  const collectionId = id ? (Array.isArray(id) ? id[0] : id) : ''
  let dataRes = []
  let nftRes = []

  let errorMessage = ''
  try {
    ;[dataRes, nftRes] = await Promise.all([
      axiosServer({
        method: 'get',
        url: `/v2/nft-collection/${encodeURIComponent(collectionId)}?floorPrice=true&statistics=true`,
        headers: passHeaders(req)
      }),
      axiosServer({
        method: 'get',
        url: `/v2/nfts?collection=${encodeURIComponent(collectionId)}&limit=16&order=mintedNew&hasMedia=true`,
        headers: passHeaders(req)
      })
    ])
  } catch (error) {
    errorMessage = 'error.' + error.message
  }

  if (!dataRes?.data) errorMessage = 'No data found'

  return {
    props: {
      id: collectionId || null,
      data: dataRes?.data || null,
      nftList: nftRes?.data?.nfts || [],
      isSsrMobile: getIsSsrMobile(context),
      errorMessage: errorMessage || null,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function NftCollection({ id, nftList, selectedCurrency, fiatRate, errorMessage, data }) {
  const { t } = useTranslation()
  const router = useRouter()
  const collection = data?.collection
  const statistics = collection?.statistics
  const [activityData, setActivityData] = useState({
    sales: [],
    listings: [],
    mints: []
  })
  const [activityLoading, setActivityLoading] = useState(false)

  const isMobile = useIsMobile(1000)

  useEffect(() => {
    fetchActivityData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  const fetchActivityData = async () => {
    setActivityLoading(true)

    try {
      let [salesRes, listingsRes] = await Promise.all([
        axios(
          `/v2/nft-sales?collection=${encodeURIComponent(
            id
          )}&list=lastSold&limit=3&convertCurrencies=${selectedCurrency}`
        ).catch(() => null),

        axios(
          `/v2/nfts?collection=${encodeURIComponent(
            id
          )}&list=onSale&order=offerCreatedNew&limit=3&currency=${selectedCurrency}`
        ).catch(() => null)
      ])

      setActivityData({
        sales: salesRes?.data?.sales || [],
        listings: listingsRes?.data?.nfts || [],
        mints: nftList.slice(0, 3)
      })
    } catch (error) {
      console.error('Error fetching activity data:', error)
      setActivityData({ sales: [], listings: [], mints: [] })
    } finally {
      setActivityLoading(false)
    }
  }

  const collectionName = collectionNameText(data?.collection)

  const mainImagePlaceholder = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="700">
     <rect width="100%" height="100%" fill="#ffffff"/>
     <text x="50%" y="50%" font-family="sans-serif" font-size="36" text-anchor="middle" dominant-baseline="central" fill="#9aa0a6">
      No collection image
     </text>
   </svg>`
  )}`

  const imageUrl = assetUrl(collection?.image) || mainImagePlaceholder

  const renderActivityTable = (kind) => {
    let title = ''
    let headers = []
    let items = []
    if (kind === 'sales') {
      title = 'Recent Sales'
      headers = ['NFT', 'Seller / Buyer', 'Price', 'Sold']
      items = activityData.sales || []
    } else if (kind === 'listings') {
      title = 'Recent Listings'
      headers = ['NFT', 'Owner', 'Price', 'Listed']
      items = activityData.listings || []
    } else if (kind === 'mints') {
      title = 'Recent Mints'
      headers = ['NFT', 'Owner', 'Minted']
      items = activityData.mints || []
    }

    // Mobile: render blocks instead of table
    if (isMobile) {
      return (
        <table className="table-details">
          <thead>
            <tr>
              <th colSpan="100">{title}</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, i) => {
                return (
                  <React.Fragment key={i}>
                    <tr>
                      <td style={{ width: 70 }}>NFT</td>
                      <td>
                        <NftImage nft={item} style={{ width: 20, height: 20, borderRadius: 4 }} />
                        <Link href={'/nft/' + item.nftokenID}>{nftName(item?.nftoken || item)}</Link>
                      </td>
                    </tr>
                    {kind === 'sales' && (
                      <>
                        <tr>
                          <td>Seller</td>
                          <td>
                            <AddressWithIconInline data={item} name="seller" options={{ short: true }} />
                          </td>
                        </tr>
                        <tr>
                          <td>Buyer</td>
                          <td>
                            <AddressWithIconInline data={item} name="buyer" options={{ short: true }} />
                          </td>
                        </tr>
                        <tr>
                          <td>Price</td>
                          <td>
                            {amountFormat(item.amount)}≈ {convertedAmount(item, selectedCurrency, { short: true })}
                          </td>
                        </tr>
                        <tr>
                          <td>Sold</td>
                          <td>
                            {timeFromNow(item.acceptedAt, i18n)} <LinkTx tx={item.acceptedTxHash} icon={true} />
                          </td>
                        </tr>
                      </>
                    )}
                    {kind === 'listings' && (
                      <>
                        <tr>
                          <td>Owner</td>
                          <td>
                            <AddressWithIconInline data={item} name="owner" options={{ short: true }} />
                          </td>
                        </tr>
                        <tr>
                          <td>Price</td>
                          <td>
                            {amountFormat(item?.sellOffers?.[0]?.amount)}
                            {nativeCurrencyToFiat({
                              amount: item?.sellOffers?.[0]?.amount,
                              selectedCurrency,
                              fiatRate
                            })}
                          </td>
                        </tr>
                        <tr>
                          <td>Listed</td>
                          <td>
                            {timeFromNow(item.sellOffers?.[0]?.createdAt, i18n)}{' '}
                            <LinkTx tx={item.sellOffers?.[0]?.createdTxHash} icon={true} />
                          </td>
                        </tr>
                      </>
                    )}
                    {kind === 'mints' && (
                      <>
                        <tr>
                          <td>Owner</td>
                          <td>
                            <AddressWithIconInline data={item} name="owner" options={{ short: true }} />
                          </td>
                        </tr>
                        <tr>
                          <td>Minted</td>
                          <td>
                            {timeFromNow(item.issuedAt, i18n)}
                            {/* not ready on the backend <LinkTx tx={item.issuedTxHash} icon={true} /> */}
                          </td>
                        </tr>
                      </>
                    )}
                    {i !== items.length - 1 && (
                      <tr>
                        <td colSpan="100">
                          <hr />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan="100">No information found</td>
              </tr>
            )}
          </tbody>
        </table>
      )
    }

    const nftImageSize = ['sales', 'listings'].includes(kind) ? 40 : 20

    // Desktop
    return (
      <table className="table-details" style={{ marginBottom: '20px' }}>
        <thead>
          <tr>
            <th colSpan="100">{title}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {items.length > 0 &&
              headers.map((h, i) => (
                <td className={'bold' + (['Price', 'Sold', 'Listed', 'Minted'].includes(h) ? ' right' : '')} key={i}>
                  {h}
                </td>
              ))}
          </tr>
          {items.length > 0 ? (
            items.map((item, i) => (
              <tr key={i}>
                <td style={{ display: 'flex', alignItems: 'center' }}>
                  <NftImage nft={item} style={{ width: nftImageSize, height: nftImageSize, borderRadius: 4 }} />
                  <span style={{ verticalAlign: 'middle' }}>
                    <Link href={'/nft/' + item.nftokenID}>{nftName(item?.nftoken || item)}</Link>
                  </span>
                </td>
                {kind === 'sales' && (
                  <>
                    <td style={{ width: 'fit-content' }}>
                      <AddressWithIconInline data={item} name="seller" options={{ short: true }} />
                      <br />
                      <AddressWithIconInline data={item} name="buyer" options={{ short: true }} />
                    </td>
                    <td className="right">
                      {amountFormat(item.amount)}
                      <br />
                      <span className="no-brake">≈ {convertedAmount(item, selectedCurrency, { short: true })}</span>
                    </td>
                    <td className="right">
                      {timeFromNow(item.acceptedAt, i18n)} <LinkTx tx={item.acceptedTxHash} icon={true} />
                    </td>
                  </>
                )}
                {kind === 'listings' && (
                  <>
                    <td>{item.owner && <AddressWithIconInline data={item} name="owner" options={{ short: 5 }} />}</td>
                    <td className="right">
                      {amountFormat(item?.sellOffers?.[0]?.amount)}
                      <br />
                      {nativeCurrencyToFiat({ amount: item?.sellOffers?.[0]?.amount, selectedCurrency, fiatRate })}
                    </td>
                    <td className="right">
                      {timeFromNow(item.sellOffers?.[0]?.createdAt, i18n)}{' '}
                      <LinkTx tx={item.sellOffers?.[0]?.createdTxHash} icon={true} />
                    </td>
                  </>
                )}
                {kind === 'mints' && (
                  <>
                    <td>
                      {item.owner && <AddressWithIconInline data={item} name="owner" options={{ short: true }} />}
                    </td>
                    <td className="right">
                      {timeFromNow(item.issuedAt, i18n)}
                      {/* not ready on the backend <LinkTx tx={item.issuedTxHash} icon={true} /> */}
                    </td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>No information found</td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  const statsTdClass = isMobile ? 'right' : ''

  const privateFloors = collection?.floorPrices?.map((item) => item.private).filter(Boolean)
  const openFloors = collection?.floorPrices?.map((item) => item.open).filter(Boolean)

  const collectionPart =
    collection?.issuer && isValidTaxon(collection?.taxon)
      ? `issuer=${collection.issuer}&taxon=${collection.taxon}`
      : 'collection=' + collection.collection

  return (
    <div className={nftClass}>
      <SEO
        title={'NFT Collection: ' + collectionName}
        description={collection?.description || 'NFT collection information.'}
        image={{ file: imageUrl }}
      />

      <div className="content-profile">
        <h1 className="center">NFT collection: {collectionName}</h1>
        <Tabs
          style={{ marginTop: 20, marginBottom: 20 }}
          tabList={[
            { value: 'collections', label: 'NFT collections' },
            { value: 'nfts', label: 'View All NFTs' },
            { value: 'sold', label: 'Last Sold NFTs' },
            { value: 'listed', label: 'Listed NFTs' }
          ]}
          setTab={(value) => {
            let url = '/nft-volumes?period=week'
            if (value === 'nfts') url = `/nft-explorer?${collectionPart}&includeWithoutMediaData=true`
            else if (value === 'sold')
              url = `/nft-sales?${collectionPart}&sale=primaryAndSecondary&includeWithoutMediaData=true&period=all&order=soldNew`
            else if (value === 'listed')
              url = `/nft-explorer?${collectionPart}&list=onSale&includeWithoutMediaData=true&saleDestination=publicAndKnownBrokers`
            router.push(url)
          }}
        />
        {id && !data?.error ? (
          <>
            {!data && !errorMessage ? (
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
                    {data && (
                      <>
                        <div className="column-left">
                          <div>
                            {imageUrl ? (
                              <img src={imageUrl} alt={collectionName} style={{ width: '100%', height: 'auto' }} />
                            ) : (
                              'No image available'
                            )}
                          </div>
                        </div>

                        <div className="column-right">
                          {collection?.issuer && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Collection information</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Name</td>
                                  <td>{collectionName}</td>
                                </tr>
                                {collection?.description && (
                                  <tr>
                                    <td>Description</td>
                                    <td>{collection?.description}</td>
                                  </tr>
                                )}
                                <tr>
                                  <td>Issuer</td>
                                  <td>
                                    <AddressWithIconFilled
                                      data={collection}
                                      name="issuer"
                                      options={{ short: isMobile }}
                                    />
                                  </td>
                                </tr>
                                {collection?.taxon !== undefined && (
                                  <tr>
                                    <td>Taxon</td>
                                    <td>{collection?.taxon}</td>
                                  </tr>
                                )}
                                {collection?.createdAt && (
                                  <tr>
                                    <td>Created</td>
                                    <td>
                                      {timeFromNow(collection.createdAt, i18n)} ({fullDateAndTime(collection.createdAt)}
                                      )
                                    </td>
                                  </tr>
                                )}
                                {collection?.updatedAt && (
                                  <tr>
                                    <td>Updated</td>
                                    <td>
                                      {timeFromNow(collection.updatedAt, i18n)} ({fullDateAndTime(collection.updatedAt)}
                                      )
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          {statistics && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Statistics</th>
                                </tr>
                              </thead>
                              <tbody>
                                {statistics?.nfts && (
                                  <tr>
                                    <td style={isMobile ? null : { width: 200 }}>NFTs</td>
                                    <td className={statsTdClass}>
                                      <Link
                                        href={`/nft-explorer?collection=${collection.collection}&includeWithoutMediaData=true`}
                                      >
                                        {statistics.nfts}
                                      </Link>
                                    </td>
                                  </tr>
                                )}
                                {statistics?.owners && (
                                  <tr>
                                    <td>Owners</td>
                                    <td className={statsTdClass}>
                                      <Link href={`/nft-distribution?${collectionPart}&includeWithoutMediaData=true`}>
                                        {statistics.owners}
                                      </Link>
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td>Traded NFTs</td>
                                  <td className={statsTdClass}>
                                    <table className="sub-table">
                                      <thead>
                                        <tr>
                                          <th className="right">day</th>
                                          <th className="right">week</th>
                                          <th className="right">month</th>
                                          <th className="right">year</th>
                                          <th className="right">all time</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td className="right">
                                            {statistics.day.tradedNfts > 0 ? (
                                              <Link
                                                href={`/nft-sales?period=day&sale=primaryAndSecondary&issuer=${collection.issuer}&taxon=${collection.taxon}&includeWithoutMediaData=true`}
                                              >
                                                {statistics.day.tradedNfts}
                                              </Link>
                                            ) : (
                                              0
                                            )}
                                          </td>
                                          <td className="right">
                                            {statistics.week.tradedNfts > 0 ? (
                                              <Link
                                                href={`/nft-sales?period=week&sale=primaryAndSecondary&issuer=${collection.issuer}&taxon=${collection.taxon}&includeWithoutMediaData=true`}
                                              >
                                                {statistics.week.tradedNfts}
                                              </Link>
                                            ) : (
                                              0
                                            )}
                                          </td>
                                          <td className="right">
                                            {statistics.month.tradedNfts > 0 ? (
                                              <Link
                                                href={`/nft-sales?period=month&sale=primaryAndSecondary&issuer=${collection.issuer}&taxon=${collection.taxon}&includeWithoutMediaData=true`}
                                              >
                                                {statistics.month.tradedNfts}
                                              </Link>
                                            ) : (
                                              0
                                            )}
                                          </td>
                                          <td className="right">
                                            {statistics.year.tradedNfts > 0 ? (
                                              <Link
                                                href={`/nft-sales?period=year&sale=primaryAndSecondary&issuer=${collection.issuer}&taxon=${collection.taxon}&includeWithoutMediaData=true`}
                                              >
                                                {statistics.year.tradedNfts}
                                              </Link>
                                            ) : (
                                              0
                                            )}
                                          </td>
                                          <td className="right">
                                            {statistics.all.tradedNfts > 0 ? (
                                              <Link
                                                href={`/nft-sales?period=all&sale=primaryAndSecondary&issuer=${collection.issuer}&taxon=${collection.taxon}&includeWithoutMediaData=true`}
                                              >
                                                {statistics.all.tradedNfts}
                                              </Link>
                                            ) : (
                                              0
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                                <tr>
                                  <td>Buyers</td>
                                  <td className={statsTdClass}>
                                    <table className="sub-table">
                                      <thead>
                                        <tr>
                                          <th className="right">day</th>
                                          <th className="right">week</th>
                                          <th className="right">month</th>
                                          <th className="right">year</th>
                                          <th className="right">all time</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td className="right">{statistics.day.buyers}</td>
                                          <td className="right">{statistics.week.buyers}</td>
                                          <td className="right">{statistics.month.buyers}</td>
                                          <td className="right">{statistics.year.buyers}</td>
                                          <td className="right">{statistics.all.buyers}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}

                          {(openFloors?.length > 0 || privateFloors?.length > 0) && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Floor prices</th>
                                </tr>
                              </thead>
                              <tbody>
                                {openFloors?.length > 0 && (
                                  <tr>
                                    <td>
                                      On the open market:{' '}
                                      {openFloors.map((floor, i) => (
                                        <span key={i}>
                                          <LinkListedNfts
                                            issuer={collection.issuer}
                                            taxon={collection.taxon}
                                            collection={collection.collection}
                                            saleCurrency={floor.amount?.currency || nativeCurrency}
                                            saleCurrencyIssuer={floor.amount?.issuer}
                                            saleDestination="public"
                                          >
                                            {amountFormat(floor.amount, { presice: true, icon: true, noSpace: true })}
                                          </LinkListedNfts>
                                          {openFloors.length - 1 !== i && ', '}
                                        </span>
                                      ))}
                                    </td>
                                  </tr>
                                )}
                                {privateFloors?.length > 0 && (
                                  <tr>
                                    <td>
                                      On the marketplaces:{' '}
                                      {privateFloors.map((floor, i) => (
                                        <span key={i}>
                                          <LinkListedNfts
                                            issuer={collection.issuer}
                                            taxon={collection.taxon}
                                            collection={collection.collection}
                                            saleCurrency={floor.amount?.currency || nativeCurrency}
                                            saleCurrencyIssuer={floor.amount?.issuer}
                                            saleDestination="knownBrokers"
                                          >
                                            {amountFormat(floor.amount, { presice: true, icon: true })} (
                                            {floor?.destinationDetails?.service})
                                          </LinkListedNfts>
                                          {privateFloors.length - 1 !== i && ', '}
                                        </span>
                                      ))}
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
                                  NFTs in this Collection [
                                  <Link
                                    href={`/nft-explorer?collection=${collection.collection}&includeWithoutMediaData=true`}
                                  >
                                    View all
                                  </Link>
                                  ]
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan={100}>
                                  <div>
                                    {nftList.length === 0 && <span>No NFTs found</span>}
                                    {nftList?.map((nft, i) => (
                                      <Link href={`/nft/${nft.nftokenID}`} key={i}>
                                        <NftImage
                                          nft={nft}
                                          style={
                                            !isMobile
                                              ? {
                                                  width: 67.3,
                                                  height: 67.3,
                                                  borderRadius: 4,
                                                  margin: 2
                                                }
                                              : { width: 80.5, height: 80.5, borderRadius: 4, margin: 2 }
                                          }
                                        />
                                      </Link>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <div style={{ marginTop: '20px' }}>
                            {activityLoading && (
                              <div className="center" style={{ marginTop: '10px' }}>
                                <span className="waiting"></span>
                              </div>
                            )}

                            {!activityLoading && (
                              <div style={{ marginTop: '10px' }}>
                                {renderActivityTable('sales')}
                                {renderActivityTable('listings')}
                                {renderActivityTable('mints')}
                              </div>
                            )}
                          </div>
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
            <h2 className="center">NFT Collection</h2>
            <p className="center">{data?.error || t('desc', { ns: 'nft' })}</p>
          </>
        )}
      </div>
    </div>
  )
}
