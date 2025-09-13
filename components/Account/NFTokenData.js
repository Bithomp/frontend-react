import Link from 'next/link'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { xahauNetwork, useWidth } from '../../utils'
import { nftName, nftNameLink, nftThumbnail } from '../../utils/nft'
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
import Tiles from '../Tiles'

export default function NFTokenData({ data, objects, ledgerTimestamp, selectedCurrency }) {

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

  useEffect(() => {
    if (!data?.address) return

    // Fetch owned NFTs (last bought)
    fetchOwnedNfts()
    
    // Fetch sold NFTs
    fetchSoldNfts()
    
    // Fetch created offers
    fetchCreatedOffers()
    
    // Fetch received offers
    fetchReceivedOffers()
  }, [data?.address])

  if (
    !data?.ledgerInfo?.nftokenMinter &&
    !data.ledgerInfo?.burnedNFTokens &&
    !data.ledgerInfo?.mintedNFTokens &&
    !(objects?.nftOfferList?.length > 0) &&
    !(objects?.nftList?.length > 0)
  )
    return ''

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
        <Link href={'/nfts/' + data?.address + '?includeWithoutMediaData=true'} className="bold">
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
        <Link href={'/nft-offers/' + data?.address} className="bold">
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
        <Link href={'/nft-explorer?includeWithoutMediaData=true&issuer=' + data?.address + '&includeBurned=true'}>
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
          href={
            '/nft-explorer?includeWithoutMediaData=true&issuer=' +
            data?.address +
            '&includeBurned=true&burnedPeriod=all'
          }
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
        const response = await axios(
        `v2/nfts?owner=${data?.address}&limit=3&order=mintedNew&includeWithoutMediaData=true`
      )
      if (response?.data?.nfts) {
        setOwnedNfts(response.data.nfts)
      } else {
        setOwnedNfts([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setOwnedNfts([])
    } finally {
      setLoading(prev => ({ ...prev, owned: false }))
    }
  }

  const fetchSoldNfts = async () => {
    try {
      const response = await axios(
        `v2/nft-sales?seller=${data?.address}&limit=3&list=lastSold&convertCurrencies=${selectedCurrency?.toLowerCase()}&sortCurrency=${selectedCurrency?.toLowerCase()}`
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
      setLoading(prev => ({ ...prev, sold: false }))
    }
  }

  const fetchCreatedOffers = async () => {
    try {
      const response = await axios(
        `v2/nft-offers/${data?.address}?list=counterOffers&nftoken=true&offersValidate=true`
      )
      if (response?.data?.nftOffers) {
        setCreatedOffers(response.data.nftOffers
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .filter(function (offer) { return offer.valid; })
          .slice(0, 5))
      } else {
        setCreatedOffers([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setCreatedOffers([])
    } finally {
      setLoading(prev => ({ ...prev, createdOffers: false }))
    }
  }

  const fetchReceivedOffers = async () => {
    try {
      const response = await axios(
        `v2/nft-offers/${data?.address}?list=privatelyOfferedToAddress&nftoken=true&offersValidate=true`
      )
      if (response?.data?.nftOffers) {
        setReceivedOffers(response.data.nftOffers
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .filter(function (offer) { return offer.valid; })
          .slice(0, 5))
      } else {
        setReceivedOffers([])
      }
    } catch (error) {
      setErrorMessage(t('error.' + error.message))
      setReceivedOffers([])
    } finally {
      setLoading(prev => ({ ...prev, receivedOffers: false }))
    }
  }

  const renderNFTSection = (title, nfts, loading, type) => {

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

    if (!nfts || nfts.length === 0) {
      return (
        <div className="nft-section">
          <p>{title}</p>
          <p className="center grey">{t('nfts.no-nfts')}</p>
        </div>
      )
    }
    
    return (
      <div className="nft-section">
        <div className="flex-container flex-space-between">
          <p>{title}</p>
        </div>
        <Tiles nftList={nfts} type={type} convertCurrency={selectedCurrency} />
      </div>
    )
  }

  const renderOffersSection = (title, offers, loading) => {

    if (!offers || offers.length === 0) {
      return (
        <div className="nft-section">
          <p>{title}</p>
          <p className="center grey">{t('nft-offers.no-nft-offers')}</p>
        </div>
      )
    }

    if(windowWidth > 800) {
      return (
        <table className="table-details">
          <thead>
            <tr>
              <td colSpan="100">{ title }</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              {!xahauNetwork && <th className="center" style={{ width: "10px" }}>{t('table.offer')}</th>}
              <th>NFT</th>
              <th>{t('table.type')}</th>
              <th>{t('table.amount')}</th>
              <th>{t('table.placed')}</th>
              {title === 'NFT Offers Created' && <th>{t('table.destination')}</th>}
            </tr>
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
                  offers.map((offer, i) => (
                    <tr key={i}>
                      {!xahauNetwork && (
                        <td className="center" style={{ width: "10px" }}>
                          <Link href={'/nft-offer/' + offer.offerIndex}>
                            <LinkIcon />
                          </Link>
                        </td>
                      )}
                      <td>
                        {nftThumbnail(offer?.nftoken)}
                      </td>
                      <td>
                      {offer?.flags?.sellToken === true || xahauNetwork
                        ? t('table.text.sell')
                        : t('table.text.buy')}
                      </td>
                      <td>{amountFormat(offer?.amount, { tooltip: true, maxFractionDigits: 2 })}</td>
                      <td>
                        {dateFormat(offer?.createdAt)} <LinkTx tx={offer?.createdTxHash} icon={true} />
                      </td>
                      {title === 'NFT Offers Created' && <td>{nftLink(offer, 'destination')}</td>}
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
        <table className="table-mobile" style={{ width: '80%' }}>
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
                  <td colSpan="100">{ title }</td>
                </tr>
                {!errorMessage ? (
                  offers?.map((offer, i) => (
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
                          NFT:{' '}
                          {nftName(offer.nftoken) ? nftNameLink(offer.nftoken) : nftOfferLink(offer.offerIndex)}
                        </p>
                        <p>
                          {t('table.type')}:{' '}
                          {offer.flags?.sellToken === true || xahauNetwork
                            ? t('table.text.sell')
                            : t('table.text.buy')}
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
                            {t('table.destination')}:
                            {addressUsernameOrServiceLink(offer, 'destination')}
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
                    <td colSpan="100" className="center orange bold">
                      {errorMessage}
                    </td>
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
    return <>
      {renderNFTSection(
        'Owned NFTs (Recently Acquired)',
        ownedNfts,
        loading.owned,
        'name'
      )}
      
      {renderNFTSection(
        'Last Sold NFTs',
        soldNfts,
        loading.sold,
        'soldNew'
      )}
      <br />
      
      {renderOffersSection(
        'NFT Offers Created',
        createdOffers,
        loading.createdOffers,
      )}
      <br />
      
      {renderOffersSection(
        'Received NFT Offers',
        receivedOffers,
        loading.receivedOffers,
      )}
    </>
  }

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">{historicalTitle || title}</th>
          </tr>
        </thead>
        <tbody>
          {data?.ledgerInfo?.activated && (
            <tr>
              <td>Owned NFTs</td>
              <td>{ownedNftsNode}</td>
            </tr>
          )}
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
          {data?.ledgerInfo?.activated && (
            <tr>
              <td>NFT Offers</td>
              <td>{nftOffersNode}</td>
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

          <tr>
            <td colSpan="100">
              {getMetaData()}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="show-on-small-w800">
        <center>{historicalTitle || title.toUpperCase()}</center>

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
      </div>    
    </>
  )
}
