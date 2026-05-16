import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import { setTabParams, useWidth, xahauNetwork } from '../../utils'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
import {
  amountFormat,
  fullDateAndTime,
  expirationExpired,
  nftLink,
  nftOfferLink,
  addressUsernameOrServiceLink
} from '../../utils/format'
import { nftNameLink, nftThumbnail, nftName } from '../../utils/nft'

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { offerList, id } = query
  //key to refresh the component when Link pressed within the same route
  return {
    props: {
      offerList: offerList || 'owned',
      id: id ? (Array.isArray(id) ? id[0] : id) : '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import Tabs from '../../components/Tabs'
import InfiniteScrolling from '../../components/Layout/InfiniteScrolling'

import LinkIcon from '../../public/images/link.svg'
import { LinkTx } from '../../utils/links'

export default function NftOffers({
  setSignRequest,
  refreshPage,
  account,
  offerList,
  id,
  subscriptionExpired,
  sessionToken,
  signOutPro,
  openEmailLogin
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const windowWidth = useWidth()
  const isMobile = useIsMobile(600)

  const [offers, setOffers] = useState([])
  const [filteredOffers, setFilteredOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [userData, setUserData] = useState({})
  const [showExpirationColumn, setShowExpirationColumn] = useState(false)
  const [showDestinationColumn, setShowDestinationColumn] = useState(false)
  const [showValidationColumn, setShowValidationColumn] = useState(false)
  const [showTypeColumn, setShowTypeColumn] = useState(true)
  const [offerListTab, setOfferListTab] = useState(offerList)
  const [offerTypeTab, setOfferTypeTab] = useState('all')
  const [offersCount, setOffersCount] = useState({})
  const [invalidOffers, setInvalidOffers] = useState([])
  const [expiredOffers, setExpiredOffers] = useState([])
  const [hasMore, setHasMore] = useState('first')

  let offerListTabList = [
    { value: 'owned', label: t('tabs.owned-offers') },
    { value: 'privately-offered-to-address', label: t('tabs.privately-offered-to-address') }
  ]

  if (!xahauNetwork) {
    // put it as the second tab
    offerListTabList = [
      ...offerListTabList.slice(0, 1),
      { value: 'for-owned-nfts', label: t('tabs.offers-for-owned-nfts') },
      ...offerListTabList.slice(1)
    ]
  }

  const offersCountLabel = (count) => (count ? ` (${count}${hasMore ? '+' : ''})` : '')

  const offerTypeTabList = [
    { value: 'all', label: t('tabs.all') + offersCountLabel(offersCount?.all) },
    { value: 'buy', label: t('tabs.buy') + offersCountLabel(offersCount?.buy) },
    { value: 'sell', label: t('tabs.sell') + offersCountLabel(offersCount?.sell) }
  ]

  const updateOfferStats = (offerListData) => {
    let sell = 0
    let buy = 0
    let invalid = 0
    let expired = 0
    let invalidList = []
    let expiredList = []

    for (let i = 0; i < offerListData.length; i++) {
      if (!offerListData[i].valid) {
        invalid++
        invalidList.push(offerListData[i].offerIndex)
        if (offerListData[i].validationErrors?.includes('Offer is expired')) {
          expired++
          expiredList.push(offerListData[i].offerIndex)
        }
      }
      if (offerListData[i].flags?.sellToken === true) {
        sell++
      } else {
        buy++
      }
    }

    setInvalidOffers(invalidList)
    setExpiredOffers(expiredList)
    setOffersCount({
      all: offerListData.length,
      buy,
      sell,
      invalid,
      expired
    })
  }

  const checkApi = async ({ reset = false } = {}) => {
    if (!id) {
      return
    }

    const loadMoreRequest = !reset && hasMore !== 'first'

    if (loadMoreRequest && (!sessionToken || (sessionToken && subscriptionExpired))) {
      return
    }

    let markerPart = ''
    if (loadMoreRequest) {
      if (!hasMore) return
      markerPart = '&marker=' + encodeURIComponent(hasMore)
    }

    let offerListUrlPart = '?nftoken=true&offersValidate=true&limit=100'
    if (offerListTab === 'for-owned-nfts') {
      offerListUrlPart += '&list=counterOffers'
    } else if (offerListTab === 'privately-offered-to-address') {
      offerListUrlPart += '&list=privatelyOfferedToAddress'
    }
    offerListUrlPart += markerPart

    if (!loadMoreRequest) {
      setLoading(true)
      setOffers([])
      setFilteredOffers([])
      setOffersCount({})
      setInvalidOffers([])
      setExpiredOffers([])
      setHasMore('first')
    }
    const response = await axios(
      'v2/' + (xahauNetwork ? 'uritoken' : 'nft') + '-offers/' + id + offerListUrlPart
    ).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.owner) {
        setUserData({
          username: newdata.ownerDetails?.username,
          service: newdata.ownerDetails?.service,
          address: newdata.owner
        })
        let nftOffers = Array.isArray(newdata.nftOffers) ? newdata.nftOffers : []
        if (offerListTab === 'for-owned-nfts') {
          nftOffers = nftOffers.filter(function (offer) {
            return offer.valid
          })
        }
        const sortedOffers = nftOffers.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        setHasMore(newdata.marker || false)
        setOffers((prevOffers) => {
          const nextOffers = loadMoreRequest
            ? [...prevOffers, ...sortedOffers].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            : sortedOffers
          if (offerListTab !== 'for-owned-nfts') {
            updateOfferStats(nextOffers)
          }
          return nextOffers
        })
      } else {
        if (newdata.error) {
          if (newdata.error === 'This endpoint/query is available only within bithomp pro subscription') {
            signOutPro?.()
          } else {
            setErrorMessage(newdata.error)
          }
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }
    }
  }

  useEffect(() => {
    let showDestination = false
    let showExpiration = false
    let showValidation = false
    if (filteredOffers && filteredOffers.length > 0) {
      for (let i = 0; i < filteredOffers.length; i++) {
        if (!filteredOffers[i].valid) {
          showValidation = true
        }
        if (filteredOffers[i].destination && filteredOffers[i].valid) {
          showDestination = true
        }
        if (filteredOffers[i].expiration) {
          showExpiration = true
        }
      }
    }
    setShowDestinationColumn(showDestination)
    setShowExpirationColumn(showExpiration)
    setShowValidationColumn(showValidation)
  }, [filteredOffers])

  useEffect(() => {
    let filtered = offers
    if (offerTypeTab === 'buy') {
      filtered = offers.filter(function (offer) {
        return offer.flags?.sellToken !== true
      })
      setShowTypeColumn(false)
    } else if (offerTypeTab === 'sell') {
      filtered = offers.filter(function (offer) {
        return offer.flags?.sellToken === true
      })
      setShowTypeColumn(false)
    } else {
      setShowTypeColumn(true)
    }
    if (filtered.length === 0) {
      setErrorMessage(t('nft-offers.no-nft-offers'))
    } else {
      setErrorMessage('')
    }
    setFilteredOffers(filtered)
  }, [offers, offerTypeTab, t])

  /*
  {
    "owner": "rDpLcKCi18ixgzJEseKbi2krRGTWZM69gX",
    "list": "offers",
    "ownerDetails": {
      "username": null,
      "service": null
    },
    "nftOffers": [
      {
        "nftokenID": "0008177072631AFCCECFF285A11CDC6159CE3E5AB34920B98AE3FE8E00000421",
        "offerIndex": "7EB78A66242F9F64BBF5117B75A9190CF173D7190AE5113CBF2C2AA3D6024038",
        "createdAt": 1667702700,
        "createdLedgerIndex": 75560558,
        "createdTxHash": "89C4725397796B0B6EB6F095E90023A1DA63FBA7F4724793D6D32148FF97274B",
        "account": "rDpLcKCi18ixgzJEseKbi2krRGTWZM69gX",
        "owner": "rDpLcKCi18ixgzJEseKbi2krRGTWZM69gX",
        "destination": "rpZqTPC8GvrSvEfFsUuHkmPCg29GdQuXhC",
        "expiration": null,
        "amount": "200000000",
        "flags": {
          "sellToken": true
        },
        "accountDetails": {
          "username": null,
          "service": null
        },
        "ownerDetails": {
          "username": null,
          "service": null
        },
        "destinationDetails": {
          "username": null,
          "service": "bidds"
        },
        "valid": false,
        "validationErrors": [
          "NFT is not owned by the seller account"
        ]
      },
  */

  useEffect(() => {
    checkApi({ reset: true })
    setTabParams(router, [
      {
        tabList: offerListTabList,
        tab: offerListTab,
        defaultTab: 'owned',
        setTab: setOfferListTab,
        paramName: 'offerList'
      }
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, offerListTab, refreshPage])

  return (
    <>
      <SEO title={t('nft-offers.header') + (id ? ' ' + id : '')} />
      <div style={{ position: 'relative', marginTop: '10px', marginBottom: '20px' }}>
        <h1 className="center">
          {id ? (
            <>
              {t('nft-offers.header')}{' '}
              {id &&
                addressUsernameOrServiceLink({ address: id, addressDetails: userData }, 'address', { short: isMobile })}
            </>
          ) : (
            'NFT offers by account'
          )}
        </h1>
      </div>
      <div className="content-text">
        {id ? (
          <>
            <div
              className="tabs-inline"
              style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 18 }}
            >
              <Tabs tabList={offerListTabList} tab={offerListTab} setTab={setOfferListTab} name="offerList" />
              {!xahauNetwork && offerListTab === 'owned' && offersCount.all > 1 && (
                <Tabs tabList={offerTypeTabList} tab={offerTypeTab} setTab={setOfferTypeTab} name="offerType" />
              )}
              {!!offersCount.expired && userData?.address && (
                <button
                  className="button-action thin narrow"
                  style={{ margin: '10px 10px 20px' }}
                  onClick={() =>
                    setSignRequest({
                      request: {
                        TransactionType: 'NFTokenCancelOffer',
                        Account: userData?.address,
                        NFTokenOffers:
                          account?.address && account.address === userData.address ? invalidOffers : expiredOffers
                      }
                    })
                  }
                >
                  {account?.address && account.address === userData.address
                    ? t('nft-offers.cancel-invalid-offer', { count: offersCount.invalid })
                    : t('nft-offers.cancel-expired-offer', { count: offersCount.expired })}
                </button>
              )}
            </div>
            <InfiniteScrolling
              dataLength={offers.length}
              loadMore={checkApi}
              hasMore={hasMore}
              errorMessage={errorMessage}
              subscriptionExpired={subscriptionExpired}
              sessionToken={sessionToken}
              openEmailLogin={openEmailLogin}
            >
              {windowWidth > 960 ? (
                <table className="table-large">
                  <thead>
                    <tr>
                      <th className="center">{t('table.index')}</th>
                      {!xahauNetwork && <th className="center">{t('table.offer')}</th>}
                      <th>NFT</th>
                      {showTypeColumn && <th>{t('table.type')}</th>}
                      <th>{t('table.amount')}</th>
                      <th>{t('table.placed')}</th>
                      {showExpirationColumn && <th>{t('table.expiration')}</th>}
                      {showDestinationColumn && offerListTab !== 'privately-offered-to-address' && (
                        <th>{t('table.destination')}</th>
                      )}
                      {showValidationColumn && <th className="center">{t('table.status')}</th>}
                    </tr>
                  </thead>
                  <tbody>
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
                          filteredOffers.map((offer, i) => (
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              {!xahauNetwork && (
                                <td className="center">
                                  <Link href={'/nft-offer/' + offer.offerIndex}>
                                    <LinkIcon />
                                  </Link>
                                </td>
                              )}
                              <td>
                                {nftThumbnail(offer.nftoken)} {nftNameLink(offer.nftoken)}
                              </td>
                              {showTypeColumn && (
                                <td>
                                  {offer.flags?.sellToken === true || xahauNetwork
                                    ? t('table.text.sell')
                                    : t('table.text.buy')}
                                </td>
                              )}
                              <td>{amountFormat(offer.amount, { tooltip: true, maxFractionDigits: 2 })}</td>
                              <td>
                                {fullDateAndTime(offer.createdAt)} <LinkTx tx={offer.createdTxHash} icon={true} />
                              </td>
                              {showExpirationColumn && (
                                <td>
                                  {offer.expiration
                                    ? fullDateAndTime(offer.expiration, 'expiration')
                                    : t('table.text.no-expiration')}
                                </td>
                              )}
                              {showDestinationColumn && offerListTab !== 'privately-offered-to-address' && (
                                <td>{nftLink(offer, 'destination')}</td>
                              )}
                              {showValidationColumn && (
                                <td className="center">
                                  {offer.valid ? (
                                    t('table.text.valid')
                                  ) : (
                                    <span className="orange">{t('table.text.invalid')}</span>
                                  )}
                                </td>
                              )}
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
              ) : (
                <table className="table-mobile">
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
                        {!errorMessage ? (
                          filteredOffers?.map((offer, i) => (
                            <tr key={i}>
                              <td style={{ padding: '5px' }} className="center">
                                <p>{i + 1}</p>
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
                                  {t('table.placed')}: {fullDateAndTime(offer.createdAt)}{' '}
                                  <LinkTx tx={offer.createdTxHash} icon={true} />
                                </p>
                                {offer.expiration && (
                                  <p>
                                    {expirationExpired(t, offer.expiration)}:{' '}
                                    {fullDateAndTime(offer.expiration, 'expiration')}
                                  </p>
                                )}
                                {offer.destination && (
                                  <p>
                                    {t('table.destination')}:
                                    <br />
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
              )}
            </InfiniteScrolling>
          </>
        ) : (
          <>
            <p className="center">{t('nft-offers.' + offerListTab + '-desc')}</p>
            <br />
            <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="nft-offers" type="explorer" />
          </>
        )}
      </div>
    </>
  )
}
