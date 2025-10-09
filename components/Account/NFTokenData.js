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

export default function NFTokenData({ data, address, objects, ledgerTimestamp, selectedCurrency }) {
  const windowWidth = useWidth()
  const { t } = useTranslation()
  const [ownedNfts, setOwnedNfts] = useState([])
  const [soldNfts, setSoldNfts] = useState([])
  const [createdOffers, setCreatedOffers] = useState([])
  const [receivedOffers, setReceivedOffers] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState({
    owned: true,
    sold: true,
    createdOffers: true,
    receivedOffers: true
  })

  const title = 'NFT Data'

  const historicalTitle = ledgerTimestamp ? (
    <span className="red bold">Historical NFT data ({fullDateAndTime(ledgerTimestamp)})</span>
  ) : (
    ''
  )

  const ownedNftsNode = !objects?.nftList ? (
    'Loading...'
  ) : objects?.nftList?.length > 0 ? (
    <>
      {!ledgerTimestamp ? (
        <Link href={'/nfts/' + address + '?includeWithoutMediaData=true'} className="bold">
          View owned NFTs ({objects.nftList.length})
        </Link>
      ) : (
        objects.nftList.length
      )}
    </>
  ) : (
    "This account doesn't own any NFTs."
  )

  const nftOffersNode = !objects?.nftOfferList ? (
    'Loading...'
  ) : objects?.nftOfferList?.length > 0 ? (
    <>
      {!ledgerTimestamp ? (
        <Link href={'/nft-offers/' + address} className="bold">
          View NFT Offers ({objects.nftOfferList.length})
        </Link>
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
      const response = await axios(`v2/nfts?owner=${address}&order=mintedNew&includeWithoutMediaData=true`)
      console.log(response.data.nfts.length)
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
      const response = await axios(
        `v2/nft-sales?seller=${address}&list=lastSold&convertCurrencies=${selectedCurrency?.toLowerCase()}&sortCurrency=${selectedCurrency?.toLowerCase()}`
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
  }, [objects])

  const renderNFTSection = (title, nfts, loading) => {
    if (loading) {
      return (
        <div className="nft-section">
          <h3>{title}</h3>
          <div className="center">
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        </div>
      )
    }

    return (
      <table
        className={windowWidth > 800 ? 'table-details' : 'table-mobile'}
        style={{ width: '100%', marginTop: '15px' }}
      >
        <thead>
          <tr>
            <th colSpan="100" className="left">
              {title}
              {nfts?.length > 0 && (
                <>
                  {' '}
                  (
                  <Link
                    href={
                      title === 'Owned NFTs'
                        ? `/nfts/${address}?includeWithoutMediaData=true`
                        : `/nft-sales?seller=${address}&period=all`
                    }
                    className="bold"
                  >
                    View All {windowWidth > 800 ? title : ''} - {nfts?.length}
                  </Link>
                  )
                </>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {nfts?.length > 0 ? (
              <td>
                {nfts?.slice(0, 50).map((nft, i) => (
                  <Link href={'/nft/' + nft.nftokenID} key={i}>
                    <img
                      src={nftUrl(nft, 'image') || nftUrl(nft?.nftoken, 'image')}
                      alt={nftName(nft)}
                      style={{ width: '48px', height: '48px', borderRadius: '4px', margin: '2px' }}
                    />
                  </Link>
                ))}
              </td>
            ) : (
              <td className="center">
                <p className="center grey">We couldn't find any NFTs.</p>
              </td>
            )}
          </tr>
        </tbody>
      </table>
    )
  }

  const renderOffersSection = (title, offers, loading) => {
    if (windowWidth > 800) {
      return (
        <table className="table-details">
          <thead>
            <tr>
              <th colSpan="100">
                {title}{' '}
                {!offers?.length ? (
                  ''
                ) : (
                  <Link
                    href={
                      '/nft-offers/' +
                      address +
                      '?offerList=' +
                      (title === 'NFT Offers Created' ? 'for-owned-nfts' : 'privately-offered-to-address')
                    }
                    className="bold"
                  >
                    View All - {offers?.length}
                  </Link>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {!offers?.length ? (
              <p className="center grey">{t('nft-offers.no-nft-offers')}</p>
            ) : (
              <tr>
                {!xahauNetwork && (
                  <th className="center" style={{ width: '10px' }}>
                    {t('table.offer')}
                  </th>
                )}
                <th className="center">NFT</th>
                <th className="center">{t('table.type')}</th>
                <th className="center">{t('table.amount')}</th>
                <th className="center">{t('table.placed')}</th>
                {title === 'NFT Offers Created' && <th className="center">{t('table.destination')}</th>}
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
                  offers.slice(0, 5).map((offer, i) => (
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
                        {offer?.flags?.sellToken === true || xahauNetwork ? t('table.text.sell') : t('table.text.buy')}
                      </td>
                      <td className="center">{amountFormat(offer?.amount, { tooltip: true, maxFractionDigits: 2 })}</td>
                      <td className="center">
                        {dateFormat(offer?.createdAt)} <LinkTx tx={offer?.createdTxHash} icon={true} />
                      </td>
                      {title === 'NFT Offers Created' && <td className="center">{nftLink(offer, 'destination')}</td>}
                    </tr>
                  ))
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
        <table className="table-mobile" style={{ width: '100%' }}>
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
                  <td colSpan="100" className="bold">
                    {title}{' '}
                    {!offers?.length ? (
                      ''
                    ) : (
                      <Link
                        href={
                          '/nft-offers/' +
                          address +
                          '?offerList=' +
                          (title === 'NFT Offers Created' ? 'for-owned-nfts' : 'privately-offered-to-address')
                        }
                        className="bold"
                      >
                        View All - {offers?.length}
                      </Link>
                    )}
                  </td>
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
                            {t('table.destination')}:{addressUsernameOrServiceLink(offer, 'destination')}
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
                    {!offers?.length && (
                      <td colSpan="100" className="center grey">
                        {t('nft-offers.no-nft-offers')}
                      </td>
                    )}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      )
    }
  }

  const getMetaData = () => {
    return (
      <>
        {renderNFTSection('Owned NFTs', ownedNfts, loading.owned, 'name')}

        {renderNFTSection('Sold NFTs', soldNfts, loading.sold, 'soldNew')}

        {renderOffersSection('NFT Offers Created', createdOffers, loading.createdOffers)}

        {renderOffersSection('Received NFT Offers', receivedOffers, loading.receivedOffers)}
      </>
    )
  }

  let isEmpty =
    !data?.ledgerInfo?.nftokenMinter &&
    !data.ledgerInfo?.burnedNFTokens &&
    !data.ledgerInfo?.mintedNFTokens &&
    !(objects?.nftOfferList?.length > 0) &&
    !(objects?.nftList?.length > 0)

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{historicalTitle || title}</th>
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td className="center" colSpan="100">
                <p>This account doesn't have any NFTs.</p>
                <Link href={'/services/nft-mint'} className="button-action">
                  Mint an NFT
                </Link>
              </td>
            </tr>
          ) : (
            <>
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
            </>
          )}
        </tbody>
      </table>
      {getMetaData()}
      <div className="show-on-small-w800">
        <center>
          {historicalTitle || title.toUpperCase()}
          {isEmpty && (
            <>
              {' '}
              [<Link href={'/services/nft-mint'}>Mint an NFT</Link>]
            </>
          )}
        </center>
        {isEmpty ? (
          <div className="center">
            <p>This account doesn't have any NFTs.</p>
          </div>
        ) : (
          <>
            {data?.ledgerInfo?.activated && <p>{ownedNftsNode}</p>}
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
            {getMetaData()}
          </>
        )}
      </div>
    </>
  )
}
