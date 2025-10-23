import Link from 'next/link'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { xahauNetwork, useWidth } from '../../utils'
import { nftName, nftNameLink, nftThumbnail, nftUrl } from '../../utils/nft'
import LinkIcon from '../../public/images/link.svg'
import { LinkTx } from '../../utils/links'
import {
  amountFormat,
  fullDateAndTime,
  nftLink,
  nftOfferLink,
  addressUsernameOrServiceLink,
  AddressWithIconFilled,
  dateFormat
} from '../../utils/format'

const size = 60
const placeholder = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
     <rect width="100%" height="100%" fill="#ffffff"/>
     <text x="50%" y="50%" font-family="sans-serif" font-size="10"
           text-anchor="middle" dominant-baseline="central" fill="#9aa0a6">
       No image
     </text>
   </svg>`
)}`

export default function NFTokenData({ data, address, objects, ledgerTimestamp, selectedCurrency }) {
  const windowWidth = useWidth()
  const { t } = useTranslation()
  const [ownedNfts, setOwnedNfts] = useState([])
  const [soldNfts, setSoldNfts] = useState([])
  const [createdOffers, setCreatedOffers] = useState([])
  const [receivedOffers, setReceivedOffers] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState({
    owned: false,
    sold: false,
    createdOffers: false,
    receivedOffers: false
  })

  const title = 'NFT Data'

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold">Historical NFT data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const nftOffersNode = !objects?.nftOfferList ? (
    'Loading...'
  ) : objects?.nftOfferList?.length > 0 ? (
    <>
      {!ledgerTimestamp ? (
        <Link href={'/nft-offers/' + address}>View NFT Offers ({objects.nftOfferList.length})</Link>
      ) : (
        objects.nftOfferList.length
      )}
    </>
  ) : (
    "This account doesn't have any NFT Offers."
  )

  const mintedNftsNode = (
    <>
      {!ledgerTimestamp ? (
        <Link href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + address + '&includeBurned=true'}>
          View minted NFTs ({data.ledgerInfo.mintedNFTokens})
        </Link>
      ) : (
        data.ledgerInfo.mintedNFTokens
      )}
    </>
  )

  const burnedNftsNode = (
    <>
      {!ledgerTimestamp ? (
        <Link
          href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + address + '&includeBurned=true&burnedPeriod=all'}
        >
          View burned NFTs ({data.ledgerInfo.burnedNFTokens})
        </Link>
      ) : (
        data.ledgerInfo.burnedNFTokens
      )}
    </>
  )

  const nftMinterNode = <AddressWithIconFilled data={data.ledgerInfo} name="nftokenMinter" />

  const fetchOwnedNfts = async () => {
    try {
      setLoading((prev) => ({ ...prev, owned: true }))
      const response = await axios(`v2/nfts?owner=${address}&order=mintedNew&includeWithoutMediaData=true&limit=40`)
      if (response?.data?.nfts) {
        setOwnedNfts(response.data.nfts)
      } else {
        setOwnedNfts([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setOwnedNfts([])
    } finally {
      setLoading((prev) => ({ ...prev, owned: false }))
    }
  }

  const fetchSoldNfts = async () => {
    try {
      setLoading((prev) => ({ ...prev, sold: true }))
      const response = await axios(
        `v2/nft-sales?seller=${address}&list=lastSold&convertCurrencies=${selectedCurrency?.toLowerCase()}&sortCurrency=${selectedCurrency?.toLowerCase()}&limit=40`
      )
      if (response?.data?.sales) {
        setSoldNfts(response.data.sales)
      } else {
        setSoldNfts([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setSoldNfts([])
    } finally {
      setLoading((prev) => ({ ...prev, sold: false }))
    }
  }

  const fetchCreatedOffers = async () => {
    try {
      setLoading((prev) => ({ ...prev, createdOffers: true }))
      const response = await axios(`v2/nft-offers/${address}?list=counterOffers&nftoken=true&offersValidate=true`)
      if (response?.data?.nftOffers) {
        setCreatedOffers(
          response.data.nftOffers
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .filter(function (offer) {
              return offer.valid
            })
            .slice(0, 5)
        )
      } else {
        setCreatedOffers([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setCreatedOffers([])
    } finally {
      setLoading((prev) => ({ ...prev, createdOffers: false }))
    }
  }

  const fetchReceivedOffers = async () => {
    try {
      setLoading((prev) => ({ ...prev, receivedOffers: true }))
      const response = await axios(
        `v2/nft-offers/${address}?list=privatelyOfferedToAddress&nftoken=true&offersValidate=true`
      )
      if (response?.data?.nftOffers) {
        setReceivedOffers(
          response.data.nftOffers
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .filter(function (offer) {
              return offer.valid
            })
            .slice(0, 5)
        )
      } else {
        setReceivedOffers([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setReceivedOffers([])
    } finally {
      setLoading((prev) => ({ ...prev, receivedOffers: false }))
    }
  }

  useEffect(() => {
    if (!objects?.nftList) return

    // Fetch owned NFTs (last bought)
    if (objects?.nftList?.length > 0) {
      fetchOwnedNfts()
    }

    // Fetch sold NFTs
    fetchSoldNfts()

    // Fetch created offers
    if (objects?.nftOfferList?.length > 0) {
      fetchCreatedOffers()
    }

    // Fetch received offers
    if (objects?.nftList?.length > 0) {
      fetchReceivedOffers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects])

  //'owned', 'Owned NFTs', ownedNfts, loading.owned, 'name', objects?.nftList?.length)

  const renderNFTSection = (type, title, nfts, loading, total) => {
    const countNfts = total || nfts?.length

    return (
      <table
        className={windowWidth > 800 ? 'table-details' : 'table-mobile'}
        style={{ width: '100%', marginTop: '15px' }}
        id={type === 'owned' ? 'nft-section' : undefined}
      >
        <thead>
          <tr>
            <th colSpan="100" className="left">
              {countNfts > 1 ? countNfts : ''} {title}
              {nfts?.length > 0 && (
                <>
                  {' '}
                  [
                  <Link
                    href={
                      type === 'owned'
                        ? `/nfts/${address}?includeWithoutMediaData=true`
                        : `/nft-sales?seller=${address}&period=all`
                    }
                  >
                    View All
                  </Link>
                  ]
                </>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {loading ? (
              <td colSpan={100} className="center">
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
              </td>
            ) : (
              <>
                {nfts?.length > 0 ? (
                  <td style={{ paddingLeft: 8 }}>
                    {nfts?.map((nft, i) => (
                      <Link href={'/nft/' + nft.nftokenID} key={i}>
                        <img
                          src={nftUrl(nft?.nftoken || nft, 'image') || placeholder}
                          alt={'NFT ' + (i + 1)}
                          style={
                            windowWidth > 800
                              ? { width: '61px', height: '61px', borderRadius: '4px', margin: '2px' }
                              : { width: '51px', height: '51px', borderRadius: '4px', margin: '2px' }
                          }
                          onError={(e) => {
                            e.target.onerror = null
                            console.log('Error loading NFT image:', e.target.src)
                            e.target.src = placeholder
                          }}
                        />
                      </Link>
                    ))}
                  </td>
                ) : (
                  <td>We couldn't find any NFTs.</td>
                )}
              </>
            )}
          </tr>
        </tbody>
      </table>
    )
  }

  const renderOffersSection = (type, title, offers, loading) => {
    const titleNode = (
      <>
        {offers?.length > 1 ? offers.length : ''} {title}{' '}
        {offers?.length ? (
          <>
            [
            <Link
              href={
                '/nft-offers/' +
                address +
                '?offerList=' +
                (type === 'created' ? 'for-owned-nfts' : 'privately-offered-to-address')
              }
            >
              View All
            </Link>
            ]
          </>
        ) : (
          ''
        )}
      </>
    )
    if (windowWidth > 800) {
      return (
        <table className="table-details">
          <thead>
            <tr>
              <th colSpan="100">{titleNode}</th>
            </tr>
          </thead>
          <tbody>
            {offers?.length > 0 && (
              <tr>
                {!xahauNetwork && (
                  <th className="center" style={{ width: '10px' }}>
                    {t('table.offer')}
                  </th>
                )}
                <th className="center">NFT</th>
                <th className="center">{t('table.type')}</th>
                <th className="right">{t('table.amount')}</th>
                <th className="right">{t('table.placed')}</th>
                {type === 'created' && <th className="center">{t('table.destination')}</th>}
              </tr>
            )}
            {loading ? (
              <tr className="center">
                <td colSpan="100">
                  <span className="waiting"></span>
                  <br />
                  {t('general.loading')}
                  <br />
                </td>
              </tr>
            ) : (
              <>
                {!errorMessage ? (
                  <>
                    {offers?.length > 0 ? (
                      <>
                        {offers.slice(0, 5).map((offer, i) => (
                          <tr key={i}>
                            {!xahauNetwork && (
                              <td className="center" style={{ width: '10px' }}>
                                <Link href={'/nft-offer/' + offer.offerIndex}>
                                  <LinkIcon />
                                </Link>
                              </td>
                            )}
                            <td className="center">{nftThumbnail(offer?.nftoken)}</td>
                            <td className="center">
                              {offer?.flags?.sellToken === true || xahauNetwork
                                ? t('table.text.sell')
                                : t('table.text.buy')}
                            </td>
                            <td className="right">
                              {amountFormat(offer?.amount, { tooltip: true, maxFractionDigits: 2 })}
                            </td>
                            <td className="right">
                              {dateFormat(offer?.createdAt)} <LinkTx tx={offer?.createdTxHash} icon={true} />
                            </td>
                            {type === 'created' && <td className="center">{nftLink(offer, 'destination')}</td>}
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td>{t('nft-offers.no-nft-offers')}</td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan="9" className="center orange bold">
                      {errorMessage}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      )
    } else {
      return (
        <table className="table-mobile" style={{ width: '100%', marginTop: '15px' }}>
          <thead></thead>
          <tbody>
            {loading ? (
              <tr className="center">
                <td colSpan="100">
                  <br />
                  <span className="waiting"></span>
                  <br />
                  {t('general.loading')}
                  <br />
                  <br />
                </td>
              </tr>
            ) : (
              <>
                <tr>
                  <td colSpan="100">{titleNode}</td>
                </tr>
                {!errorMessage && offers?.length ? (
                  offers.slice(0, 5).map((offer, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px' }} className="center">
                        <p>{nftThumbnail(offer.nftoken)}</p>
                      </td>
                      <td>
                        {!xahauNetwork && (
                          <p>
                            {t('table.offer')}: {nftOfferLink(offer.offerIndex)}
                          </p>
                        )}
                        <p>
                          NFT: {nftName(offer.nftoken) ? nftNameLink(offer.nftoken) : nftOfferLink(offer.offerIndex)}
                        </p>
                        <p>
                          {t('table.type')}:{' '}
                          {offer.flags?.sellToken === true || xahauNetwork ? t('table.text.sell') : t('table.text.buy')}
                        </p>
                        <p>
                          {t('table.amount')}: {amountFormat(offer.amount)}
                        </p>
                        <p>
                          {t('table.placed')}: {dateFormat(offer.createdAt)}{' '}
                          <LinkTx tx={offer.createdTxHash} icon={true} />
                        </p>
                        {offer.destination && (
                          <p>
                            {t('table.destination')}: {addressUsernameOrServiceLink(offer, 'destination')}
                          </p>
                        )}
                        {!offer.valid && (
                          <p>
                            {t('table.status')}: <span className="orange">{t('table.text.invalid')}</span>
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    {errorMessage && (
                      <td colSpan="100" className="center orange bold">
                        {errorMessage}
                      </td>
                    )}
                    {!offers?.length && <td colSpan="100">{t('nft-offers.no-nft-offers')}</td>}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      )
    }
  }

  const noNftLedgerInfo =
    !data?.ledgerInfo?.nftokenMinter && !data.ledgerInfo?.burnedNFTokens && !data.ledgerInfo?.mintedNFTokens

  const isEmpty = noNftLedgerInfo && !(objects?.nftOfferList?.length > 0) && !(objects?.nftList?.length > 0)

  const getMetaData = () => {
    if (isEmpty) return ''
    return (
      <>
        {renderNFTSection('owned', 'Owned NFTs', ownedNfts, loading.owned, objects?.nftList?.length)}
        {renderNFTSection('sold', 'Sold NFTs', soldNfts, loading.sold)}
        {renderOffersSection('created', 'NFT Offers Created', createdOffers, loading.createdOffers)}
        {renderOffersSection('received', 'Received NFT Offers', receivedOffers, loading.receivedOffers)}
      </>
    )
  }

  return (
    <>
      {!noNftLedgerInfo && (
        <>
          <table className="table-details hide-on-small-w800">
            <thead>
              <tr>
                <th colSpan="100">{historicalTitle || title}</th>
              </tr>
            </thead>
            <tbody>
              {data.ledgerInfo?.mintedNFTokens && (
                <tr>
                  <td>Minted NFTs</td>
                  <td>{mintedNftsNode}</td>
                </tr>
              )}
              {data.ledgerInfo?.burnedNFTokens && (
                <tr>
                  <td>Burned NFTs</td>
                  <td>{burnedNftsNode}</td>
                </tr>
              )}
              {data.ledgerInfo?.firstNFTokenSequence && (
                <tr>
                  <td>First NFT sequence</td>
                  <td>{data.ledgerInfo.firstNFTokenSequence}</td>
                </tr>
              )}
              {data.ledgerInfo?.nftokenMinter && (
                <tr>
                  <td>NFT minter</td>
                  <td>{nftMinterNode}</td>
                </tr>
              )}
              {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
                <tr>
                  <td>Incoming NFT offers</td>
                  <td className="bold">disallowed</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="show-on-small-w800">
            <center>{historicalTitle || title.toUpperCase()}</center>
            {!isEmpty && (
              <>
                {data.ledgerInfo?.mintedNFTokens && <p>{mintedNftsNode}</p>}
                {data.ledgerInfo?.burnedNFTokens && <p>{burnedNftsNode}</p>}
                {data?.ledgerInfo?.activated && <p>{nftOffersNode}</p>}
                {data.ledgerInfo?.firstNFTokenSequence && (
                  <p>
                    <span className="grey">First NFT sequence</span> {data.ledgerInfo.firstNFTokenSequence}
                  </p>
                )}
                {data.ledgerInfo?.nftokenMinter && (
                  <>
                    <p>
                      <span className="grey">NFT minter</span>
                    </p>
                    {nftMinterNode}
                  </>
                )}
                {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
                  <p>
                    <span className="grey">Incoming NFT offers</span> <span className="bold">disallowed</span>
                  </p>
                )}
                {data.ledgerInfo?.flags?.uriTokenIssuer && (
                  <p>
                    <span className="grey">URI token issuer</span> <span className="bold">true</span>
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
      {getMetaData()}
    </>
  )
}
