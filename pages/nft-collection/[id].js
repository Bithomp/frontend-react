import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import { usernameOrAddress, AddressWithIconFilled, shortHash, addressUsernameOrServiceLink } from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { nftUrl, nftName } from '../../utils/nft'
import { axiosServer, passHeaders } from '../../utils/axios'

import SEO from '../../components/SEO'
import { nftClass } from '../../styles/pages/nft.module.scss'
import Tiles from '../../components/Tiles'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let pageMeta = null
  const { id } = query
  const collectionId = id ? (Array.isArray(id) ? id[0] : id) : ''

  if (collectionId) {
    try {
      // Try collection-specific endpoint first, fallback to NFT endpoint
      let res = await axiosServer({
        method: 'get',
        url: 'v2/nft-collection/' + collectionId + '?uri=true&metadata=true',
        headers: passHeaders(req)
      }).catch(async () => {
        // Fallback to individual NFT endpoint if collection endpoint doesn't exist
        return await axiosServer({
          method: 'get',
          url: 'v2/nft/' + collectionId + '?uri=true&metadata=true',
          headers: passHeaders(req)
        })
      })
      pageMeta = res?.data
    } catch (error) {
      console.error(error)
    }
  }

  return {
    props: {
      id: collectionId,
      pageMeta: pageMeta || {},
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'nft']))
    }
  }
}

export default function NftCollection({ pageMeta, id, selectedCurrency, isSsrMobile }) {
  const { t } = useTranslation()
  const [data, setData] = useState(pageMeta)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const [nftList, setNftList] = useState([])
  const [nftListLoading, setNftListLoading] = useState(false)
  const statistics = data?.collection?.statistics
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
        const width = window.innerWidth || document.documentElement.clientWidth
        setIsMobile(isSsrMobile || width <= 768)
      } catch (_) {}
    }
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedCurrency || !id) return
    checkApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedCurrency])

  useEffect(() => {
    if (!mounted) return
    if (!id) return
    fetchCollectionNfts()
    fetchActivityData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, id])

  const checkApi = async () => {
    if (!id) return

    setLoading(true)
    // Try collection-specific endpoint first, fallback to NFT endpoint
    let response = await axiosServer({
      method: 'get',
      url: 'v2/nft-collection/' + id + '?floorPrice=true&statistics=true&assets=true'
    }).catch((error) => {
      setErrorMessage(t('error.' + error.message))
      return null
    })

    setLoading(false)
    const newdata = response?.data

    if (newdata) {
      setData(newdata)
    } else {
      setErrorMessage('Error')
    }
  }

  const fetchCollectionNfts = async () => {
    setNftListLoading(true)
    const url = `/v2/nfts?collection=${encodeURIComponent(id)}&limit=14&order=mintedNew&hasMedia=true`
    const res = await axios(url).catch(() => null)
    setNftListLoading(false)
    const list = res?.data?.nfts || []
    setNftList(list)
  }

  const fetchActivityData = async () => {
    setActivityLoading(true)

    try {
      // Fetch recent sales
      const salesRes = await axios(`/v2/nft-sales?collection=${encodeURIComponent(id)}&list=lastSold&limit=3`).catch(
        () => null
      )

      // Fetch recent listings (NFTs on sale)
      const listingsRes = await axios(
        `/v2/nfts?collection=${encodeURIComponent(id)}&list=onSale&order=offerCreatedNew&limit=3`
      ).catch(() => null)

      // Fetch recent mints
      const mintsRes = await axios(`/v2/nfts?collection=${encodeURIComponent(id)}&limit=3&order=mintedNew`).catch(
        () => null
      )
      setActivityData({
        sales: salesRes?.data?.sales || [],
        listings: listingsRes?.data?.nfts || [],
        mints: mintsRes?.data?.nfts || []
      })
    } catch (error) {
      console.error('Error fetching activity data:', error)
      setActivityData({ sales: [], listings: [], mints: [] })
    } finally {
      setActivityLoading(false)
    }
  }

  const collectionName = (data) => {
    return data?.collection?.name || ''
  }

  const collectionDescription = (data) => {
    return data?.collection?.description || ''
  }

  const imageUrl = data?.collection?.assets?.image || data?.collection?.image

  const renderActivityTable = (kind) => {
    let title = ''
    let headers = []
    let items = []
    if (kind === 'sales') {
      title = 'Recent Sales'
      headers = ['NFT', 'Seller', 'Amount', 'Date']
      items = activityData.sales || []
    } else if (kind === 'listings') {
      title = 'Recent Listings'
      headers = ['NFT', 'Owner', 'Date']
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
          <div className="bold" style={{ marginBottom: '8px' }}>
            {title}
          </div>
          {items.length > 0 ? (
            items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '10px',
                  border: '1px solid var(--border-color, #eee)',
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}
              >
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
                      <div>
                        <span>Amount: </span>
                        {item.amount ? item.amount : ''}
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
              </div>
            ))
          ) : (
            <div className="center" style={{ padding: '10px' }}>
              {t('general.nodata') || 'No data'}
            </div>
          )}
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
            {headers.map((h, i) => (
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
                    <td>
                      {item.seller ? (
                        <AddressWithIconFilled data={item} name="seller" options={{ short: true }} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{item.amount ? item.amount : 'N/A'}</td>
                    <td>{item.acceptedAt ? new Date(item.acceptedAt * 1000).toLocaleDateString() : 'N/A'}</td>
                  </>
                )}
                {kind === 'listings' && (
                  <>
                    <td>
                      {item.owner && <AddressWithIconFilled data={item} name="owner" options={{ short: true }} />}
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
                {t('general.nodata') || 'No data'}
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
        title={collectionName(data)}
        description={
          collectionDescription(data) ||
          t('desc', { ns: 'nft' }) +
            (data?.collection?.issuer
              ? ' - ' + t('table.issuer') + ': ' + usernameOrAddress(data?.collection, 'issuer')
              : '')
        }
        image={{ file: imageUrl }}
      />
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
                            <h1 className="collection-name">{collectionName(data)}</h1>
                            {collectionDescription(data) && (
                              <p className="collection-description">{collectionDescription(data)}</p>
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
                                    <AddressWithIconFilled data={data.collection.issuerDetails} name="address" />
                                  </td>
                                </tr>
                                {data?.collection?.issuerDetails?.username && (
                                  <tr>
                                    <td>Username</td>
                                    <td>{data.collection.issuerDetails.username}</td>
                                  </tr>
                                )}
                                {data?.collection?.issuerDetails?.service && (
                                  <tr>
                                    <td>Service</td>
                                    <td>{data.collection.issuerDetails.service}</td>
                                  </tr>
                                )}
                                {data?.collection?.taxon ? (
                                  <tr>
                                    <td>Taxon</td>
                                    <td>{data.collection.taxon}</td>
                                  </tr>
                                ) : null}
                                {data?.collection?.createdAt && (
                                  <tr>
                                    <td>Created At</td>
                                    <td>{new Date(data.collection.createdAt * 1000).toLocaleString()}</td>
                                  </tr>
                                )}
                                {data?.collection?.updatedAt && (
                                  <tr>
                                    <td>Updated At</td>
                                    <td>{new Date(data.collection.updatedAt * 1000).toLocaleString()}</td>
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
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>NFTs in this Collection</h3>
                                {data?.collection?.issuer &&
                                (data?.collection?.taxon || data?.collection?.taxon === 0) ? (
                                  <Link
                                    href={`/nft-explorer?issuer=${data.collection.issuer}&taxon=${data.collection.taxon}&includeWithoutMediaData=true`}
                                  >
                                    View all
                                  </Link>
                                ) : (
                                  data.collection?.collection && (
                                    <Link
                                      href={`/nft-explorer?collection=${encodeURIComponent(
                                        data.collection.collection
                                      )}&includeWithoutMediaData=true`}
                                    >
                                      View all
                                    </Link>
                                  )
                                )}
                              </div>

                              {nftListLoading && (
                                <div className="center" style={{ marginTop: '10px' }}>
                                  <span className="waiting"></span>
                                </div>
                              )}

                              {!nftListLoading && nftList.length === 0 && (
                                <div style={{ marginTop: '10px' }}>No NFTs found</div>
                              )}

                              {!nftListLoading && nftList.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                  <Tiles nftList={nftList} type="name" />
                                </div>
                              )}
                            </div>
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
            <p className="center">{t('desc', { ns: 'nft' })}</p>
          </>
        )}
      </div>
    </div>
  )
}
