import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { axiosAdmin } from '../../utils/axios'

import { getIsSsrMobile } from '../../utils/mobile'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import { avatarServer, isAddressValid, isIdValid, isValidNftXls20, useWidth, xahauNetwork } from '../../utils'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import { MdDelete } from 'react-icons/md'
import { addressLink, amountFormat, nativeCurrencyToFiat, nftIdLink, timeFromNow, txIdLink } from '../../utils/format'
import Link from 'next/link'
import axios from 'axios'
import Image from 'next/image'
import { nftPriceData, nftThumbnail } from '../../utils/nft'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Watchlist({ selectedCurrency, account, subscriptionExpired, fiatRate }) {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [entetyToAdd, setEntityToAdd] = useState('')
  const [entetyName, setEntetyName] = useState('')
  const [nfts, setNfts] = useState([])
  const [addresses, setAddresses] = useState([])
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    getFavorites()
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
    .delete("/user/favorite/1");
  */

  const getFavorites = async () => {
    setLoading(true)
    const response = await axiosAdmin.get('user/favorites').catch((error) => {
      if (error && error.message !== 'canceled') {
        console.log(error)
        if (error.response?.data?.error === 'errors.token.required') {
          router.push('/admin')
        } else {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      }
      setLoading(false)
    })
    if (response?.data) {
      /*
        {
          "total": 1,
          "count": 1,
          "favorites": [
            {
              "id": 1,
              "createdAt": 1728737213,
              "type": "address", // address, nftoken, uritoken
              "entity": "rUHKSkZ83GQyGteyj",
              "name": "Test payments"
            }
          ]
        }
      */
      setData(response.data)
      let addressList = response.data.favorites.filter((a) => a.type === 'address')
      setAddresses(addressList)
      getAddressesInfo(addressList)
      let nftList = response.data.favorites.filter((a) => a.type === 'nftoken' || a.type === 'uritoken')
      setNfts(nftList)
      getNftsInfo(nftList)
    }
    setLoading(false)
  }

  const addEntetyClicked = async () => {
    setErrorMessage('')

    let type = null

    if (!entetyToAdd) {
      setErrorMessage('Please enter Address or NFT ID')
      return
    }

    if (!entetyName) {
      setErrorMessage('Please enter a Private name for it')
      return
    }

    if (isAddressValid(entetyToAdd)) {
      type = 'address'
    } else if (!xahauNetwork && isValidNftXls20(entetyToAdd)) {
      type = 'nftoken'
    } else if (xahauNetwork && isIdValid(entetyToAdd)) {
      type = 'uritoken'
    } else {
      setErrorMessage('Invalid Address or NFT ID')
      return
    }

    if (data?.favorites?.find((a) => a.entity === entetyToAdd)) {
      setErrorMessage('The ' + (type === 'address' ? 'Address' : 'NFT') + ' is already in the list.')
      return
    }

    setLoading(true)
    const response = await axiosAdmin
      .post('user/favorites', {
        type,
        entity: entetyToAdd,
        name: entetyName
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
        setLoading(false)
      })
    if (response?.data) {
      getFavorites()
    }
    setLoading(false)
  }

  const removeEntity = async (id) => {
    if (!id) return
    await axiosAdmin.delete('user/favorite/' + id).catch((error) => {
      setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
    })
    //find it in the addressList or nftlist and remove it
    let addressList = addresses.filter((a) => a.id !== id)
    setAddresses(addressList)
    let nftList = nfts.filter((a) => a.id !== id)
    setNfts(nftList)
  }

  const getAddressesInfo = async (list) => {
    if (list?.length > 0) {
      await Promise.all(
        list.map(async (a) => {
          const url = 'v2/address/' + a.entity + '?&ledgerInfo=true'
          const response = await axios(url).catch((error) => {
            console.log(error)
          })
          if (response?.data) {
            list = list.map((l) => {
              if (l.entity === a.entity) {
                l.info = response.data
              }
              return l
            })
          }
        })
      )
      setAddresses(list)
    }
  }

  const getNftsInfo = async (list) => {
    if (list?.length > 0) {
      let nftList = list.map((a) => a.entity)
      const url =
        'v2/' + (xahauNetwork ? 'uritokens' : 'nfts') + '?ids=' + nftList + '&uri=true&metadata=true&sellOffers=true' //&buyOffers=true&offersValidate=true
      const response = await axios(url).catch((error) => {
        console.log(error)
      })
      const nftsInfo = xahauNetwork ? response?.data?.uritokens : response?.data?.nfts

      if (nftsInfo) {
        list = list.map((l) => {
          const nft = nftsInfo.find((n) => n.nftokenID === l.entity)
          if (nft) {
            l.info = nft
          }
          return l
        })
      }
      setNfts(list)
    }
  }

  const lastTx = (ledgerInfo, type) => {
    if (!ledgerInfo) {
      return 'Loading...'
    }

    if (ledgerInfo.previousTxnID === ledgerInfo.lastSubmittedTxHash && type === 'previousTxn') {
      return 'The last signed tx'
    }

    if (ledgerInfo?.activated) {
      return (
        <>
          {ledgerInfo[type + 'At'] && <>{timeFromNow(ledgerInfo[type + 'At'], i18n)}</>}
          {ledgerInfo[type + 'TxHash'] && <> {txIdLink(ledgerInfo[type + 'TxHash'], 0)}</>}
          {ledgerInfo[type + 'ID'] && <> {txIdLink(ledgerInfo[type + 'ID'], 0)}</>}
        </>
      )
    }
    return 'Not found'
  }

  return (
    <>
      <SEO title="Watchlist" />
      <div className="page-whatchlist content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="watchlist" />

        {rendered ? (
          <p>
            You can add up to {subscriptionExpired ? 20 : 100} favorite addresses or NFTs to the watchlist.
            {subscriptionExpired && (
              <>
                {' '}
                If you want to add more, please subscribe to the <Link href="/admin/subscriptions">Bithomp Pro</Link>.
              </>
            )}
          </p>
        ) : (
          <p>Loading...</p>
        )}

        <div>
          {addresses?.length > 0 && (
            <>
              <h4 className="center">Address Watchlist</h4>
              {!width || width > 750 ? (
                <table className="table-large no-hover">
                  <thead>
                    <tr>
                      <th className="center">#</th>
                      <th className="left">Address</th>
                      <th className="right">Balance</th>
                      <th className="right">Last Signed Tx</th>
                      <th className="right">Last Affecting Tx</th>
                      <th className="center">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addresses.map((a, i) => (
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td className="left">
                          <table>
                            <tbody>
                              <tr>
                                <td style={{ padding: 0 }}>
                                  <Image alt="avatar" src={avatarServer + a.entity} width="40" height="40" />
                                </td>
                                <td style={{ padding: '0 0 0 10px' }}>
                                  <b className="orange">{a.name}</b>
                                  <br />
                                  {addressLink(a.entity, { short: true })}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                        <td className="right">
                          <b className="green">{amountFormat(a.info?.ledgerInfo?.balance, { maxFractionDigits: 2 })}</b>
                          <br />
                          {nativeCurrencyToFiat({
                            amount: a.info?.ledgerInfo?.balance,
                            selectedCurrency,
                            fiatRate
                          })}
                        </td>
                        <td className="right">{lastTx(a.info?.ledgerInfo, 'lastSubmitted')}</td>
                        <td className="right">{lastTx(a.info?.ledgerInfo, 'previousTxn')}</td>

                        <td className="center red">
                          <MdDelete
                            onClick={() => {
                              removeEntity(a.id)
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="table-mobile">
                  <tbody>
                    {addresses.map((a, i) => (
                      <tr key={i}>
                        <td style={{ padding: '20px 5px', verticalAlign: 'top' }} className="center">
                          <Image alt="avatar" src={avatarServer + a.entity} width="30" height="30" />
                          <br />
                          <br />
                          {i + 1}
                        </td>
                        <td>
                          <p>
                            Address: <b className="orange">{a.name}</b> - {addressLink(a.entity, { short: true })}
                          </p>
                          <p>
                            Balance:{' '}
                            <b className="green">
                              {amountFormat(a.info?.ledgerInfo?.balance, { maxFractionDigits: 2 })}
                            </b>
                            {nativeCurrencyToFiat({
                              amount: a.info?.ledgerInfo?.balance,
                              selectedCurrency,
                              fiatRate
                            })}
                          </p>
                          <p>Last signed Tx: {lastTx(a.info?.ledgerInfo, 'lastSubmitted')}</p>
                          <p>
                            <a
                              onClick={() => {
                                removeEntity(a.id)
                              }}
                              className="red"
                            >
                              Remove
                            </a>
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {nfts?.length > 0 && (
            <>
              <h4 className="center">NFT Watchlist</h4>
              {!width || width > 750 ? (
                <table className="table-large no-hover">
                  <thead>
                    <tr>
                      <th className="center">#</th>
                      <th className="left">NFT</th>
                      <th className="right">Price</th>
                      <th className="center">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nfts.map((a, i) => (
                      <tr key={i}>
                        <td className="center">{i + 1}</td>
                        <td className="left">
                          <table>
                            <tbody>
                              <tr>
                                <td style={{ padding: 0 }}>{nftThumbnail(a.info)}</td>
                                <td style={{ padding: '0 0 0 10px' }}>
                                  <b className="orange">{a.name}</b>
                                  <br />
                                  {nftIdLink(a.entity)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                        <td className="right">{nftPriceData(t, a.info?.sellOffers, account?.address)}</td>
                        <td className="center red">
                          <MdDelete
                            onClick={() => {
                              removeEntity(a.id)
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="table-mobile">
                  <tbody>
                    {nfts.map((a, i) => (
                      <tr key={i}>
                        <td style={{ padding: '20px 5px', verticalAlign: 'top' }} className="center">
                          {nftThumbnail(a.info)}
                          <br />
                          <br />
                          {i + 1}
                        </td>
                        <td>
                          <p>
                            Name: <b className="orange">{a.name}</b>
                          </p>
                          <p>NFT: {nftIdLink(a.entity)}</p>
                          <p>Price: {nftPriceData(t, a.info?.sellOffers, account?.address)}</p>
                          <p>
                            <a
                              onClick={() => {
                                removeEntity(a.id)
                              }}
                              className="red"
                            >
                              Remove
                            </a>
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          <div>
            {/* Allow only 20 for non-subscribers and 100 for those with subscription */}
            {((data?.favorites?.length < 100 && !subscriptionExpired) || data?.favorites?.length < 20) && (
              <>
                {width > 851 && <br />}
                <br />
                <div className="flex flex-center">
                  <span style={width > 851 ? { width: 'calc(70% - 20px)' } : { width: '100%', marginBottom: '-20px' }}>
                    <AddressInput
                      title="Address or NFT"
                      placeholder="Enter Username, Address or NFT ID"
                      setInnerValue={setEntityToAdd}
                      hideButton={true}
                      rawData={data}
                      type="address"
                    />
                  </span>
                  <span style={{ width: width > 851 ? '30%' : '100%' }}>
                    <FormInput
                      title="Private name"
                      placeholder="Name"
                      setInnerValue={setEntetyName}
                      hideButton={true}
                    />
                  </span>
                </div>
                <br />
                <br />
                <center>
                  <button className="button-action" onClick={addEntetyClicked} disabled={!entetyToAdd || !entetyName}>
                    Add {loading && <span className="waiting inline"></span>}
                  </button>
                </center>
                <br />
              </>
            )}
          </div>
          <br />
          {!loading && errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
        </div>
      </div>
    </>
  )
}
