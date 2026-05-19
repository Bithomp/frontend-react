import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Trans, useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { axiosAdmin } from '../../utils/axios'

import { getIsSsrMobile } from '../../utils/mobile'

import SEO from '../../components/SEO'
import AdminTabs from '../../components/Tabs/AdminTabs'
import { avatarSrc, isAddressValid, isIdValid, isValidNftXls20, useWidth, xahauNetwork } from '../../utils'
import AddressInput from '../../components/UI/AddressInput'
import FormInput from '../../components/UI/FormInput'
import { MdDelete } from 'react-icons/md'
import { AddressWithIcon, addressLink, amountFormat, tokenToFiat, nftIdLink, timeFromNow } from '../../utils/format'
import Link from 'next/link'
import axios from 'axios'
import { nftPriceData, nftThumbnail } from '../../utils/nft'
import { LinkTx } from '../../utils/links'
import Avatar from '../../components/UI/Avatar'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Watchlist({
  selectedCurrency,
  account,
  subscriptionExpired,
  fiatRate,
  sessionToken,
  openEmailLogin
}) {
  const { t, i18n } = useTranslation(['common', 'admin'])
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
    if (sessionToken) {
      getFavorites()
    }
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  /*
    .delete("/user/favorite/1");
  */

  const getFavorites = async () => {
    setLoading(true)
    const response = await axiosAdmin.get('user/favorites').catch((error) => {
      if (error && error.message !== 'canceled') {
        console.log("ERROR: can't get favorites")
        if (error.response?.data?.error === 'errors.token.required') {
          openEmailLogin()
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
      setErrorMessage(t('watchlist.errors.entity-required', { ns: 'admin' }))
      return
    }

    if (!entetyName) {
      setErrorMessage(t('watchlist.errors.name-required', { ns: 'admin' }))
      return
    }

    if (isAddressValid(entetyToAdd)) {
      type = 'address'
    } else if (!xahauNetwork && isValidNftXls20(entetyToAdd)) {
      type = 'nftoken'
    } else if (xahauNetwork && isIdValid(entetyToAdd)) {
      type = 'uritoken'
    } else {
      setErrorMessage(t('watchlist.errors.entity-invalid', { ns: 'admin' }))
      return
    }

    if (data?.favorites?.find((a) => a.entity === entetyToAdd)) {
      setErrorMessage(
        t('watchlist.errors.already-exists', {
          ns: 'admin',
          type: type === 'address' ? t('table.address', { ns: 'admin' }) : 'NFT'
        })
      )
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
          const response = await axios(url).catch(() => {
            console.log("ERROR: can't get address info")
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
      const response = await axios(url).catch(() => {
        console.log("ERROR: can't get nft info")
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
      return t('common.loading', { ns: 'admin' })
    }

    if (ledgerInfo.previousTxnID === ledgerInfo.lastSubmittedTxHash && type === 'previousTxn') {
      return t('watchlist.last-signed-tx', { ns: 'admin' })
    }

    if (ledgerInfo?.activated) {
      return (
        <>
          {ledgerInfo[type + 'At'] && <>{timeFromNow(ledgerInfo[type + 'At'], i18n)}</>}
          {ledgerInfo[type + 'TxHash'] && (
            <>
              {' '}
              <LinkTx tx={ledgerInfo[type + 'TxHash']} icon={true} />
            </>
          )}
          {ledgerInfo[type + 'ID'] && (
            <>
              {' '}
              <LinkTx tx={ledgerInfo[type + 'ID']} icon={true} />
            </>
          )}
        </>
      )
    }
    return t('common.not-found', { ns: 'admin' })
  }

  return (
    <>
      <SEO title={t('tabs.watchlist', { ns: 'admin' })} />
      <div className="page-whatchlist content-center">
        <h1 className="center">{t('header', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="watchlist" />

        {sessionToken ? (
          <>
            {rendered ? (
              <p>
                {subscriptionExpired ? (
                  <>
                    {t('watchlist.limit-free', { ns: 'admin', count: 20 })}
                    {' '}
                    <Trans
                      i18nKey="watchlist.limit-upgrade"
                      ns="admin"
                      values={{ count: 100 }}
                      components={[<Link key="pro" href="/admin#bithomp-pro-subscription" />]}
                    />
                  </>
                ) : (
                  t('watchlist.limit-pro', { ns: 'admin', count: 100 })
                )}
              </p>
            ) : (
              <p>{t('common.loading', { ns: 'admin' })}</p>
            )}

            <div>
              {addresses?.length > 0 && (
                <>
                  <h4 className="center">{t('watchlist.address-title', { ns: 'admin' })}</h4>
                  {!width || width > 750 ? (
                    <table className="table-large no-hover">
                      <thead>
                        <tr>
                          <th className="center">#</th>
                          <th className="left">{t('table.address', { ns: 'admin' })}</th>
                          <th className="right">{t('table.balance', { ns: 'admin' })}</th>
                          <th className="right">{t('watchlist.last-signed', { ns: 'admin' })}</th>
                          <th className="right">{t('watchlist.last-affecting', { ns: 'admin' })}</th>
                          <th className="center">{t('button.remove', { ns: 'admin' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addresses.map((a, i) => (
                          <tr key={i}>
                            <td className="center">{i + 1}</td>
                            <td className="left">
                              <AddressWithIcon address={a.entity}>
                                <b className="orange">{a.name}</b>
                                <br />
                                {addressLink(a.entity, { short: true })}
                              </AddressWithIcon>
                            </td>
                            <td className="right">
                              <b className="green">
                                {amountFormat(a.info?.ledgerInfo?.balance, { maxFractionDigits: 2 })}
                              </b>
                              <br />
                              {tokenToFiat({
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
                              <Avatar src={avatarSrc(a.entity)} size={30} />
                              <br />
                              <br />
                              {i + 1}
                            </td>
                            <td>
                              <p>
                                {t('table.address', { ns: 'admin' })}: <b className="orange">{a.name}</b> -{' '}
                                {addressLink(a.entity, { short: true })}
                              </p>
                              <p>
                                {t('table.balance', { ns: 'admin' })}:{' '}
                                <b className="green">
                                  {amountFormat(a.info?.ledgerInfo?.balance, { maxFractionDigits: 2 })}
                                </b>
                                {tokenToFiat({
                                  amount: a.info?.ledgerInfo?.balance,
                                  selectedCurrency,
                                  fiatRate
                                })}
                              </p>
                              <p>
                                {t('watchlist.last-signed', { ns: 'admin' })}: {lastTx(a.info?.ledgerInfo, 'lastSubmitted')}
                              </p>
                              <p>
                                <a
                                  onClick={() => {
                                    removeEntity(a.id)
                                  }}
                                  className="red"
                                >
                                  {t('button.remove', { ns: 'admin' })}
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
                  <h4 className="center">{t('watchlist.nft-title', { ns: 'admin' })}</h4>
                  {!width || width > 750 ? (
                    <table className="table-large no-hover">
                      <thead>
                        <tr>
                          <th className="center">#</th>
                          <th className="left">NFT</th>
                          <th className="right">{t('table.price', { ns: 'admin' })}</th>
                          <th className="center">{t('button.remove', { ns: 'admin' })}</th>
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
                                {t('table.name', { ns: 'admin' })}: <b className="orange">{a.name}</b>
                              </p>
                              <p>NFT: {nftIdLink(a.entity)}</p>
                              <p>
                                {t('table.price', { ns: 'admin' })}: {nftPriceData(t, a.info?.sellOffers, account?.address)}
                              </p>
                              <p>
                                <a
                                  onClick={() => {
                                    removeEntity(a.id)
                                  }}
                                  className="red"
                                >
                                  {t('button.remove', { ns: 'admin' })}
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
                    <div className="flex-container flex-center">
                      <span
                        style={width > 851 ? { width: 'calc(70% - 20px)' } : { width: '100%', marginBottom: '-20px' }}
                      >
                        <AddressInput
                          title={t('watchlist.entity-title', { ns: 'admin' })}
                          placeholder={t('watchlist.entity-placeholder', { ns: 'admin' })}
                          setInnerValue={setEntityToAdd}
                          hideButton={true}
                          rawData={data}
                          type="address"
                        />
                      </span>
                      <span style={{ width: width > 851 ? '30%' : '100%' }}>
                        <FormInput
                          title={t('watchlist.private-name', { ns: 'admin' })}
                          placeholder={t('table.name', { ns: 'admin' })}
                          setInnerValue={setEntetyName}
                          hideButton={true}
                        />
                      </span>
                    </div>
                    <br />
                    <br />
                    <center>
                      <button
                        className="button-action"
                        onClick={addEntetyClicked}
                        disabled={!entetyToAdd || !entetyName}
                      >
                        {t('button.add', { ns: 'admin' })} {loading && <span className="waiting inline"></span>}
                      </button>
                    </center>
                    <br />
                  </>
                )}
              </div>
              <br />
              {!loading && errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
            </div>
          </>
        ) : (
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- {t('watchlist.guest.manage', { ns: 'admin' })}</p>
              <p>- {t('watchlist.guest.track', { ns: 'admin' })}</p>
            </div>
            <br />
            <center>
              <button className="button-action" onClick={() => openEmailLogin()}>
                {t('button.register-sign-in', { ns: 'admin' })}
              </button>
            </center>
          </div>
        )}
      </div>
    </>
  )
}
