import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import {
  usernameOrAddress,
  AddressWithIconFilled,
  shortHash,
  addressUsernameOrServiceLink,
  amountFormat,
  convertedAmount,
  nativeCurrencyToFiat
} from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { nftUrl, nftName, ipfsUrl } from '../../utils/nft'

import SEO from '../../components/SEO'
import { nftClass } from '../../styles/pages/nft.module.scss'
import { useWidth } from '../../utils'

export async function getServerSideProps(context) {
  const { locale, query } = context
  const { id } = query
  const collectionId = id ? (Array.isArray(id) ? id[0] : id) : ''

  let errorMessage = ''

  const [dataRes, nftRes] = await Promise.all([
    axios(
      `/v2/nft-collection/${encodeURIComponent(collectionId)}?floorPrice=true&statistics=true`
    ).catch((error) => {
      errorMessage = 'error.' + error.message
    }),
    axios(
      `/v2/nfts?collection=${encodeURIComponent(collectionId)}&limit=16&order=mintedNew&hasMedia=true`
    ).catch(() => null)
  ])

  if (!dataRes?.data) errorMessage = 'No data found'

  return {
    props: {
      id: collectionId,
      data: dataRes?.data,
      nftList: nftRes?.data?.nfts || [],
      isSsrMobile: getIsSsrMobile(context),
      errorMessage: errorMessage,
      ...(await serverSideTranslations(locale, ['common', 'nft']))
    }
  }
}

export default function NftCollection({ id, nftList, selectedCurrency, isSsrMobile, fiatRate, errorMessage, data }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [mounted, setMounted] = useState(false)
  const statistics = data?.collection?.statistics
  const issuerDetails = data?.collection?.issuerDetails
  const collection = data?.collection
  const [activityData, setActivityData] = useState({
    sales: [],
    listings: [],
    mints: []
  })
  const [activityLoading, setActivityLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(isSsrMobile)

  useEffect(() => {
    setMounted(true)
    // Client-side viewport fallback for mobile detection
    const updateIsMobile = () => {
      try {
        setIsMobile(isSsrMobile || width <= 768)
      } catch (_) {}
    }
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  useEffect(() => {
    fetchActivityData()
  }, [selectedCurrency])

  const fetchActivityData = async () => {
    setActivityLoading(true)

    try {
      const [salesRes, listingsRes] = await Promise.all([
        axios(
          `/v2/nft-sales?collection=${encodeURIComponent(id)}&list=lastSold&limit=3&convertCurrencies=${selectedCurrency}`
        ).catch(() => null),
    
        axios(
          `/v2/nfts?collection=${encodeURIComponent(id)}&list=onSale&order=offerCreatedNew&limit=3&currency=${selectedCurrency}`
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

  const collectionName = (data) => {
    return (
      data?.collection?.name || (
        <>
          {addressUsernameOrServiceLink(data?.collection, 'issuer', { short: isMobile })} ({data?.collection?.taxon})
        </>
      )
    )
  }

  const collectionDescription = data?.collection?.description

  const imageUrl = ipfsUrl(data?.collection?.image)

  const renderActivityTable = (kind) => {
    let title = ''
    let headers = []
    let items = []
    if (kind === 'sales') {
      title = 'Recent Sales'
      headers = ['NFT', 'Seller / Buyer', 'Price', 'Date']
      items = activityData.sales || []
    } else if (kind === 'listings') {
      title = 'Recent Listings'
      headers = ['NFT', 'Owner', 'Price', 'Date']
      items = activityData.listings || []
    } else if (kind === 'mints') {
      title = 'Recent Mints'
      headers = ['NFT', 'Owner', 'Date']
      items = activityData.mints || []
    }

    // Mobile: render blocks instead of table
    if (isMobile) {
      return (
        <div style={{ marginBottom: '20px' }}>
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
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>NFT: </span>
                          {nftUrl(item?.nftoken || item, 'thumbnail') ? (
                            <img
                              src={nftUrl(item?.nftoken || item, 'thumbnail')}
                              alt={nftName(item?.nftoken || item) || 'NFT thumbnail'}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            ''
                          )}
                          <div className="code" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span>{nftName(item?.nftoken || item)}</span>
                            <Link href={'/nft/' + item.nftokenID}>{shortHash(item.nftokenID, 6)}</Link>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          {kind === 'sales' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Seller: </span>
                                {item.seller ? (
                                  <AddressWithIconFilled data={item} name="seller" options={{ short: true }} />
                                ) : (
                                  ''
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Buyer: </span>
                                {item.buyer ? (
                                  <AddressWithIconFilled data={item} name="buyer" options={{ short: true }} />
                                ) : (
                                  ''
                                )}
                              </div>
                              <div>
                                <span>Price: </span>
                                {amountFormat(item.amount)}≈ {convertedAmount(item, selectedCurrency, { short: true })}
                              </div>
                              <div>
                                <span>Date: </span>
                                {item.acceptedAt ? new Date(item.acceptedAt * 1000).toLocaleDateString() : ''}
                              </div>
                            </>
                          )}
                          {kind === 'listings' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Owner: </span>
                                {item.owner && addressUsernameOrServiceLink(item, 'owner', { short: 12 })}
                              </div>
                              <div>
                                <span>Price: </span>
                                {amountFormat(item?.sellOffers?.[0]?.amount)}
                                {nativeCurrencyToFiat({
                                  amount: item?.sellOffers?.[0]?.amount,
                                  selectedCurrency,
                                  fiatRate
                                })}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Date: </span>
                                {new Date(item.ownerChangedAt * 1000).toLocaleDateString()}
                              </div>
                            </>
                          )}
                          {kind === 'mints' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Owner: </span>
                                {item.owner && addressUsernameOrServiceLink(item, 'owner', { short: 12 })}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Date: </span>
                                {new Date(item.issuedAt * 1000).toLocaleDateString()}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="100" className="center">
                    {'No data'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }

    // Desktop: render table
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
                <td className="bold center" key={i}>
                  {h}
                </td>
              ))}
          </tr>
          {items.length > 0 ? (
            items.map((item, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    {nftUrl(item?.nftoken || item, 'thumbnail') ? (
                      <img
                        src={nftUrl(item?.nftoken || item, 'thumbnail')}
                        alt={nftName(item?.nftoken || item) || 'NFT thumbnail'}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      ''
                    )}
                    <span className="code" style={{ display: 'flex', flexDirection: 'column' }}>
                      {nftName(item?.nftoken || item)}
                      <Link href={'/nft/' + item.nftokenID}>{shortHash(item.nftokenID, 6)}</Link>
                    </span>
                  </div>
                </td>
                {kind === 'sales' && (
                  <>
                    <td style={{ width: 'fit-content' }}>
                      {item.seller ? (
                        <AddressWithIconFilled data={item} name="seller" options={{ short: true }} />
                      ) : (
                        '—'
                      )}
                      {item.buyer ? <AddressWithIconFilled data={item} name="buyer" options={{ short: true }} /> : '—'}
                    </td>
                    <td>
                      {amountFormat(item.amount)}≈ {convertedAmount(item, selectedCurrency, { short: true })}
                    </td>
                    <td>{item.acceptedAt ? new Date(item.acceptedAt * 1000).toLocaleDateString() : 'N/A'}</td>
                  </>
                )}
                {kind === 'listings' && (
                  <>
                    <td>
                      {item.owner && <AddressWithIconFilled data={item} name="owner" options={{ short: true }} />}
                    </td>
                    <td>
                      {amountFormat(item?.sellOffers?.[0]?.amount)}
                      {nativeCurrencyToFiat({ amount: item?.sellOffers?.[0]?.amount, selectedCurrency, fiatRate })}
                    </td>
                    <td>{new Date(item.ownerChangedAt * 1000).toLocaleDateString()}</td>
                  </>
                )}
                {kind === 'mints' && (
                  <>
                    <td>
                      {item.owner && <AddressWithIconFilled data={item} name="owner" options={{ short: true }} />}
                    </td>
                    <td>{new Date(item.issuedAt * 1000).toLocaleDateString()}</td>
                  </>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="center">
                {'No data'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  return (
    <div className={nftClass}>
      <SEO
        page="NFT Collection"
        title={'NFT Collection'}
        description={
          collectionDescription ||
          t('desc', { ns: 'nft' }) +
            (data?.collection?.issuer
              ? ' - ' + t('table.issuer') + ': ' + usernameOrAddress(data?.collection, 'issuer')
              : '')
        }
        image={{ file: imageUrl }}
      />
      <div className="content-profile">
        {id && !data?.error ? (
          <>
            {(!data && !errorMessage) ? (
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
                          <div className="collection-image">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={collectionName(data)}
                                style={{ width: '100%', height: 'auto' }}
                              />
                            ) : (
                              <div className="no-image-placeholder">No Image Available</div>
                            )}
                          </div>
                        </div>

                        <div className="column-right">
                          <div className="collection-info">
                            <h2 className="collection-name">{collectionName(data)}</h2>
                            {collectionDescription && (
                              <p className="collection-description">{collectionDescription}</p>
                            )}
                          </div>

                          {mounted && data?.collection?.issuerDetails && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Issuer Information</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>Address</td>
                                  <td>
                                    <AddressWithIconFilled data={issuerDetails} name="address" />
                                  </td>
                                </tr>
                                {issuerDetails?.username && (
                                  <tr>
                                    <td>Username</td>
                                    <td>{issuerDetails.username}</td>
                                  </tr>
                                )}
                                {data?.collection?.issuerDetails?.service && (
                                  <tr>
                                    <td>Service</td>
                                    <td>{issuerDetails.service}</td>
                                  </tr>
                                )}
                                {collection?.taxon ? (
                                  <tr>
                                    <td>Taxon</td>
                                    <td>{collection?.taxon}</td>
                                  </tr>
                                ) : null}
                                {collection?.createdAt && (
                                  <tr>
                                    <td>Created At</td>
                                    <td>{new Date(collection?.createdAt * 1000).toLocaleString()}</td>
                                  </tr>
                                )}
                                {collection?.updatedAt && (
                                  <tr>
                                    <td>Updated At</td>
                                    <td>{new Date(collection?.updatedAt * 1000).toLocaleString()}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          {mounted && statistics && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Collection Statistics</th>
                                </tr>
                              </thead>
                              <tbody>
                                {statistics?.nfts && (
                                  <tr>
                                    <td>Total Supply</td>
                                    <td>{statistics.nfts}</td>
                                  </tr>
                                )}
                                {statistics?.owners && (
                                  <tr>
                                    <td>Unique Owners</td>
                                    <td>{statistics.owners}</td>
                                  </tr>
                                )}
                                {statistics?.all?.tradedNfts && (
                                  <tr>
                                    <td>Total Traded NFTs</td>
                                    <td>{statistics.all.tradedNfts}</td>
                                  </tr>
                                )}
                                {statistics?.all?.buyers && (
                                  <tr>
                                    <td>Total Buyers</td>
                                    <td>{statistics.all.buyers}</td>
                                  </tr>
                                )}
                                {statistics?.month?.tradedNfts && (
                                  <tr>
                                    <td>Monthly Traded NFTs</td>
                                    <td>{statistics.month.tradedNfts}</td>
                                  </tr>
                                )}
                                {statistics?.week?.tradedNfts ? (
                                  <tr>
                                    <td>Weekly Traded NFTs</td>
                                    <td>{statistics.week.tradedNfts}</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          )}

                          {mounted && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">
                                    NFTs in this Collection
                                    {collection?.issuer && (collection?.taxon || collection?.taxon === 0) ? (
                                      <>
                                        {' '}
                                        [
                                        <Link
                                          href={`/nft-explorer?issuer=${collection?.issuer}&taxon=${collection?.taxon}&includeWithoutMediaData=true`}
                                        >
                                          View all
                                        </Link>
                                        ]
                                      </>
                                    ) : (
                                      collection?.collection && (
                                        <>
                                          {' '}
                                          [
                                          <Link
                                            href={`/nft-explorer?collection=${encodeURIComponent(
                                              data
                                            )}&includeWithoutMediaData=true`}
                                          >
                                            View all
                                          </Link>
                                          ]
                                        </>
                                      )
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td colSpan={100}>
                                    <div
                                      style={{
                                        marginTop: '10px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center', // centers images horizontally
                                        alignItems: 'start'
                                      }}
                                    >
                                      {nftList.length === 0 && (
                                        <span>
                                          No NFTs found
                                        </span>
                                      )}
                                      {nftList?.map((nft, i) => (
                                        <Link href={`/nft/${nft.nftokenID}`} key={i}>
                                          <img
                                            src={nftUrl(nft, 'image')}
                                            alt={nftName(nft)}
                                            style={{
                                              width: '64px',
                                              height: '64px',
                                              objectFit: 'cover',
                                              borderRadius: '4px',
                                              margin: '2px'
                                            }}
                                          />
                                        </Link>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}

                          {mounted && (
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
            <h2 className="center">NFT Collection</h2>
            <p className="center">{data?.error || t('desc', { ns: 'nft' })}</p>
          </>
        )}
      </div>
    </div>
  )
}
