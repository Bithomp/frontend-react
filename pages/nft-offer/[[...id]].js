import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'

import {
  fullDateAndTime,
  amountFormat,
  shortHash,
  expirationExpired,
  trStatus,
  nftIdLink,
  cancelNftOfferButton,
  acceptNftSellOfferButton,
  AddressWithIconFilled
} from '../../utils/format'

import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  const { locale, query } = context
  // keep params instead of query, anyway it is an array sometimes
  const id = query?.id ? (Array.isArray(query.id) ? query.id[0] : query.id) : ''
  /*
  let pageMeta = null
  if (id) {
    try {
      const res = await axiosServer({
        method: 'get',
        url: 'v2/nft/offer/' + id,
        headers: passHeaders(req)
      })
      pageMeta = res?.data
    } catch (error) {
      console.error(error)
    }
  }
  */
  return {
    props: {
      id,
      //pageMeta,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import NftImageAndVideo from '../../components/NftPreview'

import LinkIcon from '../../public/images/link.svg'
import { nftName } from '../../utils/nft'

export default function NftOffer({ setSignRequest, refreshPage, account, id }) {
  const { t } = useTranslation()

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const checkApi = async (opts) => {
    if (!id) return
    setLoading(true)
    let noCache = ''
    if (opts?.noCache) {
      noCache = '&timestamp=' + Date.now()
    }
    const response = await axios('v2/nft/offer/' + id + '?offersValidate=true' + noCache).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    setLoading(false)
    const newdata = response?.data
    if (newdata) {
      if (newdata.offerIndex) {
        setData(newdata)
      } else {
        if (newdata.error) {
          setErrorMessage(t('error-api.' + newdata.error))
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }
    }
  }

  /*
    {
      "nftokenID": "00081068F3D76A09647C813D0363E6F820BB7C797D2EB704E0422464000001C9",
      "offerIndex": "0CD12DD4975654BF1022241D92D63BA7297B579DF685A9BF0777A0D1BAB738BB",
      "createdAt": 1671836850,
      "createdLedgerIndex": 76632990,
      "createdTxHash": "13FDE6CC174F4FDC4D61673064E552D8B370A91DEF4DD9D510089105B7F8ED7B",
      "account": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
      "owner": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
      "destination": null,
      "expiration": null,
      "amount": "50750000",
      "flags": {
        "sellToken": false
      },
      "acceptedAt": 1671836851,
      "acceptedLedgerIndex": 76632991,
      "acceptedTxHash": "FA9A48CCA34EFA25C94D6DD0F7B2B70D00AE0BE6446CF08D044D246BFB0DBB0B",
      "acceptedAccount": "rsQmGXm3G4FA6n5L5QqTELBqTph9xEP5nK",
      "nftoken": {
        "flags": {
          "burnable": false,
          "onlyXRP": false,
          "trustLine": false,
          "transferable": true
        },
        "issuer": "rPNKEiCGzPd53MhqjkQJrtJKLLVWi6bav1",
        "nftokenID": "00081068F3D76A09647C813D0363E6F820BB7C797D2EB704E0422464000001C9",
        "nftokenTaxon": 0,
        "transferFee": 4200,
        "sequence": 457,
        "owner": "rK4UpLZAJEkwbE3qx2ZSVG5REWGHEiNdHp",
        "uri": "68747470733A2F2F7468657368696C6C76657273652E636F6D2F6E66742F6A736F6E2F70756E6B2F3431382E6A736F6E",
        "issuedAt": 1670143680,
        "ownerChangedAt": 1671836851,
        "deletedAt": null,
        "url": "https://theshillverse.com/nft/json/punk/418.json",
        "metadata": {
          "name": "Shill Punk #418",
          "description": "Assassin Doge (Shill Punk #418) reporting for Duty!\nA collection of Punks on the XRPL.",
          "image": "https://theshillverse.com/nft/img/punk/418.png",
          "edition": 418,
          "date": 1670134831294,
          "actions": [],
          "attributes": [
            {
              "trait_type": "Base",
              "value": "Doge"
            }
          ]
        },
        "issuerDetails": {
          "username": null,
          "service": null
        },
        "ownerDetails": {
          "username": null,
          "service": null
        }
      },
      "accountDetails": {
        "username": null,
        "service": null
      },
      "ownerDetails": {
        "username": null,
        "service": null
      },
      "acceptedAccountDetails": {
        "username": null,
        "service": null
      },
      "issuerDetails": {
        "username": null,
        "service": null
      }
    }
  */

  useEffect(() => {
    if (!data?.nftokenID) {
      // no token - first time fetching - allow right away
      checkApi()
    } else if (data?.canceledAt || data?.acceptedAt) {
      //do not send request if it is Canceled or Accepted
      return
    } else {
      setLoading(true)
      checkApi({ noCache: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshPage])

  const sellerOrBuyer = data?.flags?.sellToken === true ? t('table.seller') : t('table.buyer')

  return (
    <>
      {data && <SEO title={t('nft-offer.header') + (data.offerIndex ? ' ' + data.offerIndex : '')} />}
      <SearchBlock searchPlaceholderText={t('nft-offer.enter-offer-id')} tab="nft-offer" />
      <div className="content-profile nft-offer">
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
                    {data.flags && (
                      <>
                        <div className="column-left">
                          <NftImageAndVideo nft={data.nftoken} />
                          <div className="center">
                            {nftName(data.nftoken)}
                            <br />
                            <br />
                          </div>

                          {data?.destination &&
                            account?.address &&
                            account.address === data.destination &&
                            data.valid &&
                            data.flags?.sellToken && (
                              <>
                                {acceptNftSellOfferButton(t, setSignRequest, data, 'xls20')}
                                <br />
                                <br />
                              </>
                            )}

                          {!data.canceledAt &&
                            !data.acceptedAt && // if not canceled or accepted
                            ((data?.owner && account?.address && account.address === data.owner) || // if I'm the owner
                              data?.validationErrors?.includes('Offer is expired') || // if expired
                              (account?.address && data?.destination === account.address)) && ( // if the offer is for me
                              <>
                                {cancelNftOfferButton(
                                  t,
                                  setSignRequest,
                                  data.owner,
                                  data,
                                  data.flags?.sellToken === true ? 'sell' : 'buy',
                                  data.type,
                                  data.nftokenID
                                )}
                                <br />
                                <br />
                              </>
                            )}
                        </div>
                        <div className="column-right">
                          <table className="table-details">
                            <tbody>
                              {trStatus(t, data)}
                              <tr>
                                <td>{t('table.type')}</td>
                                <td>{data.flags?.sellToken === true ? t('table.text.sell') : t('table.text.buy')} </td>
                              </tr>
                              <tr>
                                <td>{t('table.offer')}</td>
                                <td>
                                  {shortHash(data.offerIndex, 10)} <CopyButton text={data.offerIndex} />
                                </td>
                              </tr>
                              <tr>
                                <td>{sellerOrBuyer}</td>
                                <td>
                                  <AddressWithIconFilled data={data} name="account" />
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  {data.flags.sellToken === true ? t('nft-offer.selling') : t('nft-offer.buying')} NFT
                                </td>
                                <td>{nftIdLink(data.nftokenID)}</td>
                              </tr>
                              {data?.destination && (
                                <tr>
                                  <td>{t('table.destination')}</td>
                                  <td>
                                    <AddressWithIconFilled data={data} name="destination" />
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td>{t('table.price')}</td>
                                <td>{amountFormat(data.amount, { tooltip: 'right' })}</td>
                              </tr>
                              <tr>
                                <td>{t('table.placed')}</td>
                                <td>
                                  {fullDateAndTime(data.createdAt)}{' '}
                                  <a href={'/explorer/' + data.createdTxHash}>
                                    <LinkIcon />
                                  </a>
                                </td>
                              </tr>
                              {data.expiration && (
                                <tr>
                                  <td>{expirationExpired(t, data.expiration)}</td>
                                  <td>{fullDateAndTime(data.expiration, 'expiration')}</td>
                                </tr>
                              )}
                              {data.acceptedAt && (
                                <>
                                  <tr>
                                    <td>{t('table.accepted')}</td>
                                    <td>
                                      {fullDateAndTime(data.acceptedAt)}{' '}
                                      <a href={'/explorer/' + data.acceptedTxHash}>
                                        <LinkIcon />
                                      </a>
                                    </td>
                                  </tr>
                                  {data.acceptedAccount && (
                                    <tr>
                                      <td>{t('table.accepted-by')}</td>
                                      <td>
                                        <AddressWithIconFilled data={data} name="acceptedAccount" />
                                      </td>
                                    </tr>
                                  )}
                                </>
                              )}
                              {data.canceledAt && (
                                <tr>
                                  <td>{t('table.canceled')}</td>
                                  <td>
                                    {fullDateAndTime(data.canceledAt)}{' '}
                                    <a href={'/explorer/' + data.canceledTxHash}>
                                      <LinkIcon />
                                    </a>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <p>
                            <Link href={'/nft-offers/' + data.account}>{t('links.active-offers-same-account')}</Link>
                          </p>
                          <p>
                            <Link href={'/nfts/' + data.account}>{t('links.owned-nfts-same-account')}</Link>
                          </p>
                          <p>
                            {t('links.nfts-same-issuer')}:{' '}
                            <Link href={'/nft-explorer?issuer=' + data.nftoken.issuer}>{t('links.all')}</Link>,{' '}
                            <Link href={'/nft-sales?issuer=' + data.nftoken.issuer}>{t('links.sold')}</Link>
                          </p>
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
            <h2 className="center">{t('nft-offer.header')}</h2>
            <p className="center">{t('nft-offer.desc')}</p>
          </>
        )}
      </div>
    </>
  )
}
