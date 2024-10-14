import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { axiosAdmin } from '../../utils/axios'

import { getIsSsrMobile } from '../../utils/mobile'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import { isAddressValid, isIdValid, isValidNftXls20, subscriptionExpired, useWidth, xahauNetwork } from '../../utils'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import { MdDelete } from 'react-icons/md'
import { addressLink, amountFormat, nativeCurrencyToFiat, nftIdLink, timeFromNow, txIdLink } from '../../utils/format'
import Link from 'next/link'
import axios from 'axios'
import Image from 'next/image'
import { fetchCurrentFiatRate } from '../../utils/common'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Watchlist({ selectedCurrency }) {
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
  const [fiatRate, setFiatRate] = useState(0)

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
      getFavorites()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedCurrency) {
      fetchCurrentFiatRate(selectedCurrency, setFiatRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

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
      getEntityInfo(addressList, 'address')
      let nftList = response.data.favorites.filter((a) => a.type === 'nftoken' || a.type === 'uritoken')
      setNfts(nftList)
      getEntityInfo(nftList, 'nft')
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
    const response = await axiosAdmin.delete('user/favorite/' + id).catch((error) => {
      setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
    })
    if (response?.data) {
      getFavorites()
    }
  }

  const getEntityInfo = async (list, type) => {
    if (list?.length > 0) {
      await Promise.all(
        list.map(async (a) => {
          const url = type === 'address' ? '/v2/address/' + a.entity + '?&ledgerInfo=true' : '/v2/nft/' + a.entity
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
      if (type === 'address') {
        setAddresses(list)
      } else if (type === 'nft') {
        setNfts(list)
      }
    }
  }

  return (
    <>
      <SEO title={t('header', { ns: 'admin' })} />
      <div className="page-whatchlist content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="watchlist" />

        <p>
          You can add up to 20 favorite addresses or NFTs to the watchlist. If you want to add more, please subscribe to
          the <Link href="/admin/subscriptions">Bithomp Pro</Link>.
        </p>

        <div className="center">
          {data?.favorites?.length > 0 && (
            <>
              <h4 className="center">Address Watchlist</h4>
              <table className="table-large no-hover">
                <thead>
                  <tr>
                    <th className="center">#</th>
                    <th className="left">Address</th>
                    <th className="right">Balance</th>
                    <th className="right">Last active</th>
                    <th className="center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {addresses?.length > 0 ? (
                    <>
                      {addresses.map((a, i) => (
                        <tr key={i}>
                          <td className="center">{i + 1}</td>
                          <td className="left">
                            <table>
                              <tbody>
                                <tr>
                                  <td style={{ padding: 0 }}>
                                    <Image
                                      alt="avatar"
                                      src={'https://cdn.bithomp.com/avatar/' + a.entity}
                                      width={width < 440 ? 30 : 40}
                                      height={width < 440 ? 30 : 40}
                                    />
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
                            {amountFormat(a.info?.ledgerInfo?.balance)}
                            <br />≈{' '}
                            {nativeCurrencyToFiat({
                              amount: a.info?.ledgerInfo?.balance,
                              selectedCurrency,
                              fiatRate
                            })}
                          </td>
                          <td className="right">
                            {a.info?.ledgerInfo?.activated ? (
                              <>
                                {a.info.ledgerInfo?.lastSubmittedAt && (
                                  <>{timeFromNow(a.info.ledgerInfo.lastSubmittedAt, i18n)}</>
                                )}
                                {a.info.ledgerInfo?.lastSubmittedTxHash && (
                                  <> {txIdLink(a.info.ledgerInfo.lastSubmittedTxHash, 0)}</>
                                )}
                              </>
                            ) : (
                              'Not activated'
                            )}
                          </td>
                          <td className="center red">
                            <MdDelete
                              onClick={() => {
                                removeEntity(a.id)
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="100" className="center">
                        {loading ? 'Loading data...' : 'You have not added addresses yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h4 className="center">NFT Watchlist</h4>
              <table className="table-large no-hover">
                <thead>
                  <tr>
                    <th className="center">#</th>
                    <th className="left">Name</th>
                    <th className="left">NFT</th>
                    <th className="center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {nfts?.length > 0 ? (
                    <>
                      {nfts.map((a, i) => (
                        <tr key={i}>
                          <td className="center">{i + 1}</td>
                          <td className="left">
                            <b className="orange">{a.name}</b>
                          </td>
                          <td className="left">{nftIdLink(a.entity)}</td>
                          <td className="center red">
                            <MdDelete
                              onClick={() => {
                                removeEntity(a.id)
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="100" className="center">
                        {loading ? 'Loading data...' : 'You have not added NFTs yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                <center>
                  <button className="button-action" onClick={addEntetyClicked} disabled={!entetyToAdd || !entetyName}>
                    Add
                  </button>
                </center>
                <br />
              </>
            )}
          </div>

          {loading ? (
            <div className="center">{t('general.loading')}</div>
          ) : (
            <>
              {errorMessage && (
                <div className="center orange bold">
                  <br />
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
