import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import AddressInput from '../../../components/UI/AddressInput'
import { avatarSrc, devNet, encode, useWidth, xahauNetwork } from '../../../utils'
import { removeProAddress, activateAddressCrawler, crawlerStatus, updateProAddress } from '../../../utils/pro'
import FormInput from '../../../components/UI/FormInput'
import { addressLink } from '../../../utils/format'
import Avatar from '../../../components/UI/Avatar'

import { MdDelete } from 'react-icons/md'
import Link from 'next/link'
import ProTabs from '../../../components/Tabs/ProTabs'
import CheckBox from '../../../components/UI/CheckBox'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const SettingsCheckBoxes = ({ a, mobile, subscriptionExpired, t }) => {
  let styles = {}
  if (mobile) {
    styles = { ...styles, lineHeight: '1.8em', fontSize: '1.1em' }
  }

  const [escrowsExecution, setEscrowsExecution] = useState(a.settings?.escrowsExecution)
  const [nftokensOffersCancellation, setNftokensOffersCancellation] = useState(a.settings?.nftokensOffersCancellation)

  return (
    <>
      <CheckBox
        checked={subscriptionExpired ? false : escrowsExecution}
        setChecked={() => {
          updateProAddress(a.id, {
            settings: { escrowsExecution: !escrowsExecution }
          })
          setEscrowsExecution(!escrowsExecution)
        }}
        style={{ ...styles, marginTop: 0 }}
        disabled={subscriptionExpired}
      >
        {mobile ? t('pro.settings.auto-escrow', { ns: 'admin' }) : t('pro.settings.execute-escrows', { ns: 'admin' })}
      </CheckBox>
      {!xahauNetwork && (
        <CheckBox
          checked={subscriptionExpired ? false : nftokensOffersCancellation}
          setChecked={() => {
            updateProAddress(a.id, {
              settings: { nftokensOffersCancellation: !nftokensOffersCancellation }
            })
            setNftokensOffersCancellation(!nftokensOffersCancellation)
          }}
          style={{ ...styles, marginTop: 10 }}
          disabled={subscriptionExpired}
        >
          {mobile
            ? t('pro.settings.auto-cancel-nft', { ns: 'admin' })
            : t('pro.settings.cancel-nft', { ns: 'admin' })}
        </CheckBox>
      )}
    </>
  )
}

export default function Pro({
  account,
  setSignRequest,
  refreshPage,
  subscriptionExpired,
  sessionToken,
  openEmailLogin
}) {
  const width = useWidth()

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [verifiedAddresses, setVerifiedAddresses] = useState([])
  const [addressToVerify, setAddressToVerify] = useState('')
  const [addressName, setAddressName] = useState('')
  const [loadingVerifiedAddresses, setLoadingVerifiedAddresses] = useState(false)
  const [rawData, setRawData] = useState({})
  const [rendered, setRendered] = useState(false)

  const suggestAddress = (account, verAddresses) => {
    setRawData({})
    if (!verAddresses || !account) return
    let loggedInAddressAlreadyVerified = false
    for (let i = 0; i < verAddresses.length; i++) {
      if (verAddresses[i].address === account.address) {
        loggedInAddressAlreadyVerified = true
        break
      }
    }
    //suggest the loggedin address to get verified
    if (!loggedInAddressAlreadyVerified) {
      setRawData({
        address: account?.address,
        addressDetails: {
          username: account?.username
        }
      })
    }
  }

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch((error) => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === 'errors.token.required') {
        openEmailLogin()
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })
    setLoadingVerifiedAddresses(false)
    const data = response?.data
    /*
      {
        "total": 1,
        "count": 1,
        "addresses": [
          {
            "id": 28,
            "createdAt": 1721741550,
            "address": "raN6cSu",
            "name": "vasia",
            "crawler": {
              "status": "queued",
              "createdAt": 1728212999,
              "updatedAt": 1728212999,
              "lastCrawledAt": null,
              "firstLedgerIndex": null,
              "currentLedgerIndex": null,
              "lastLedgerIndex": null
            }
          }
        ]
      }
    */
    setVerifiedAddresses(data?.addresses)
    suggestAddress(account, data?.addresses)
  }

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setAddressName('')
    setAddressToVerify('')
    suggestAddress(account, verifiedAddresses)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  useEffect(() => {
    if (sessionToken) {
      getVerifiedAddresses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPage, sessionToken])

  const addAddressClicked = () => {
    if (!account?.pro) {
      setErrorMessage(t('pro.errors.no-email', { ns: 'admin' }))
      return
    }

    const command = {
      action: 'addAddress',
      email: account?.pro
    }

    const tx = {
      Account: addressToVerify,
      TransactionType: 'AccountSet',
      Memos: [
        {
          Memo: {
            MemoType: encode('json'),
            MemoData: encode(JSON.stringify(command))
          }
        }
      ]
    }

    setSignRequest({
      request: tx,
      data: {
        signOnly: true,
        action: 'pro-add-address',
        address: addressToVerify,
        name: addressName
      }
    })
  }

  const afterVerifiedAddressesUpdate = (data) => {
    if (data?.error) {
      setErrorMessage(t(data.error))
    }
    getVerifiedAddresses()
  }

  const addressButtons = (address, options) => {
    return (
      <div className={`pro-address-actions${options?.mobile ? ' mobile' : ''}`}>
        {address.crawler && (
          <Link className="button-action narrow thin" href={'/admin/pro/history?address=' + address.address}>
            {options?.mobile ? t('button.view-history', { ns: 'admin' }) : t('button.view', { ns: 'admin' })}
          </Link>
        )}
        {!(address.crawler && address.crawler.status !== 'paused') && (
          <button
            className="button-action narrow thin"
            onClick={() => {
              activateAddressCrawler(address.address, afterVerifiedAddressesUpdate)
            }}
            disabled={subscriptionExpired}
          >
            {t('button.enable', { ns: 'admin' })}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <SEO title={t('tabs.my-addresses', { ns: 'admin' })} />
      <div className="page-admin content-center">
        <h1 className="center">{t('tabs.my-addresses', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="pro" />

        <div className="tabs-inline tabs-with-action">
          <ProTabs tab="addresses" />

          <Link
            href="/learn/xrp-xah-taxes"
            className="button-action thin narrow secondary tabs-inline-action"
            target="_blank"
            rel="noreferrer"
          >
            {t('button.view-guide', { ns: 'admin' })}
          </Link>
        </div>

        {sessionToken ? (
          <>
            <h4 className="center">{t('pro.verified-addresses', { ns: 'admin' })}</h4>
            <div>
              {t('pro.features-intro', { ns: 'admin' })}
              <ul>
                <li>{t('pro.features.history', { ns: 'admin' })}</li>
                <li>
                  {t('pro.features.escrows', { ns: 'admin' })}
                  <br />
                  ({t('pro.features.escrows-note', { ns: 'admin' })})
                </li>
                {!xahauNetwork && (
                  <li>
                    {t('pro.features.nft-offers', { ns: 'admin' })}
                    <br />
                    ({t('pro.features.nft-offers-note', { ns: 'admin' })})
                  </li>
                )}
              </ul>
            </div>
            <br />

            {rendered && (
              <>
                {!width || width > 750 ? (
                  <table className="table-large no-hover">
                    <thead>
                      <tr>
                        <th className="center">#</th>
                        <th className="left">{t('table.address', { ns: 'admin' })}</th>
                        <th className="right">{t('pro.balance-history', { ns: 'admin' })}</th>
                        <th className="left">{t('pro.bot-settings', { ns: 'admin' })}</th>
                        <th className="center">{t('button.remove', { ns: 'admin' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedAddresses?.length > 0 ? (
                        <>
                          {verifiedAddresses.map((a, i) => (
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              <td className="left">
                                <table>
                                  <tbody>
                                    <tr>
                                      <td style={{ padding: 0 }}>
                                        <Avatar src={avatarSrc(a.address, { refreshPage })} size={40} />
                                      </td>
                                      <td style={{ padding: '0 0 0 10px' }}>
                                        <b className="orange">{a.name}</b> - {addressLink(a.address, { short: true })}
                                        <br />
                                        {!devNet && (
                                          <a
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setAvatar',
                                                request: {
                                                  TransactionType: 'AccountSet',
                                                  Account: a.address
                                                },
                                                data: {
                                                  signOnly: true,
                                                  action: 'set-avatar'
                                                }
                                              })
                                            }
                                          >
                                            {t('button.set-avatar', { ns: 'admin' })}
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                              <td className="center pro-balance-history-cell">
                                <div className="pro-crawler-status">{crawlerStatus(a.crawler)}</div>
                                {addressButtons(a)}
                              </td>
                              <td className="left">
                                <SettingsCheckBoxes a={a} subscriptionExpired={subscriptionExpired} t={t} />
                              </td>
                              <td className="center red">
                                <MdDelete
                                  onClick={() => {
                                    removeProAddress(a.id, afterVerifiedAddressesUpdate)
                                  }}
                                  style={{ fontSize: '1.4em' }}
                                />
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center">
                            {loadingVerifiedAddresses
                              ? t('common.loading-data', { ns: 'admin' })
                              : t('pro.no-verified-addresses', { ns: 'admin' })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="table-mobile">
                    <tbody>
                      {verifiedAddresses?.length > 0 ? (
                        <>
                          {verifiedAddresses.map((a, i) => (
                            <tr key={i}>
                              <td style={{ padding: '20px 5px', verticalAlign: 'top' }} className="center">
                                <Avatar src={avatarSrc(a.address)} size={30} />
                                <br />
                                <br />
                                {i + 1}
                              </td>
                              <td>
                                <p>
                                  {t('table.address', { ns: 'admin' })}: <b className="orange">{a.name}</b> -{' '}
                                  {addressLink(a.address, { short: true })}
                                </p>
                                <p>
                                  {t('table.status', { ns: 'admin' })}: {crawlerStatus(a.crawler, { inline: true })}
                                </p>
                                <p>
                                  <SettingsCheckBoxes a={a} mobile={true} subscriptionExpired={subscriptionExpired} t={t} />
                                </p>
                                <p>
                                  {addressButtons(a, { mobile: true })}
                                  <br />
                                  <br />
                                  {!devNet && (
                                    <>
                                      <a
                                        onClick={() =>
                                          setSignRequest({
                                            action: 'setAvatar',
                                            request: {
                                              TransactionType: 'AccountSet',
                                              Account: a.address
                                            },
                                            data: {
                                              signOnly: true,
                                              action: 'set-avatar'
                                            }
                                          })
                                        }
                                      >
                                        {t('button.set-avatar', { ns: 'admin' })}
                                      </a>
                                      ,{' '}
                                    </>
                                  )}
                                  <a
                                    className="red"
                                    onClick={() => {
                                      removeProAddress(a.id, afterVerifiedAddressesUpdate)
                                    }}
                                  >
                                    {t('button.remove', { ns: 'admin' })}
                                  </a>
                                </p>
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center">
                            {loadingVerifiedAddresses
                              ? t('common.loading-data', { ns: 'admin' })
                              : t('pro.no-verified-addresses', { ns: 'admin' })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                <br />
                <br />
                <div style={{ textAlign: 'left' }}>
                  {verifiedAddresses?.length > 0 ? (
                    <>
                      {subscriptionExpired ? (
                        <>
                          {t('pro.activate-analysis-before', { ns: 'admin' })}{' '}
                          <Link href="/admin/subscriptions?tab=pro">
                            {t('pro.purchase-pro-link', { ns: 'admin' })}
                          </Link>.
                        </>
                      ) : (
                        t('pro.add-limit', { ns: 'admin' })
                      )}
                    </>
                  ) : (
                    <>{t('pro.verify-first', { ns: 'admin' })}</>
                  )}
                  {/* Allow only 1 for non-subscribers and 5 for those with subscription */}
                  {((verifiedAddresses?.length < 5 && !subscriptionExpired) ||
                    !verifiedAddresses ||
                    verifiedAddresses?.length === 0) && (
                    <>
                      <br />
                      <br />
                      <div className="flex-container flex-center">
                        <span
                          style={width > 851 ? { width: 'calc(70% - 20px)' } : { width: '100%', marginBottom: '-20px' }}
                        >
                          <AddressInput
                            title={t('table.address', { ns: 'admin' })}
                            placeholder={t('pro.address-placeholder', { ns: 'admin' })}
                            setInnerValue={setAddressToVerify}
                            hideButton={true}
                            rawData={rawData}
                            type="address"
                          />
                        </span>
                        <span style={{ width: width > 851 ? '30%' : '100%' }}>
                          <FormInput
                            title={t('watchlist.private-name', { ns: 'admin' })}
                            placeholder={t('pro.address-name-placeholder', { ns: 'admin' })}
                            setInnerValue={setAddressName}
                            defaultValue={rawData?.addressDetails?.username}
                            hideButton={true}
                          />
                        </span>
                      </div>
                      <br />
                      <center>
                        <button
                          className="button-action"
                          onClick={addAddressClicked}
                          disabled={!addressToVerify || !addressName}
                        >
                          {t('button.verify', { ns: 'admin' })}
                        </button>
                      </center>
                    </>
                  )}
                </div>
              </>
            )}
            <br />
            {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
          </>
        ) : (
          <div className="center">
            <div style={{ maxWidth: '440px', margin: 'auto', textAlign: 'left' }}>
              <p>- {t('pro.guest.verify', { ns: 'admin' })}</p>
              <p>- {t('pro.guest.history', { ns: 'admin' })}</p>
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
