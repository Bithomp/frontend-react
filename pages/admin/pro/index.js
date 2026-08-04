import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'
import Mailto from 'react-protected-mailto'

import { getIsSsrMobile } from '../../../utils/mobile'
import { axiosAdmin } from '../../../utils/axios'

import AddressInput from '../../../components/UI/AddressInput'
import { avatarSrc, devNet, encode, useWidth, xahauNetwork } from '../../../utils'
import { removeProAddress, activateAddressCrawler, crawlerStatus, updateProAddress } from '../../../utils/pro'
import FormInput from '../../../components/UI/FormInput'
import { addressLink } from '../../../utils/format'
import Avatar from '../../../components/UI/Avatar'

import { MdDelete } from 'react-icons/md'
import Link from 'next/link'
import CheckBox from '../../../components/UI/CheckBox'
import TaxExports from './history'
import styles from '@/styles/pages/admin.module.scss'

const PRO_ADDRESS_LIMIT = 5
const FREE_ADDRESS_LIMIT = 1

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  return {
    props: {
      queryAddress: query.address || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const SettingsCheckBoxes = ({ a, mobile, subscriptionExpired, t }) => {
  let checkboxStyle = {}
  if (mobile) {
    checkboxStyle = { ...checkboxStyle, lineHeight: '1.8em', fontSize: '1.1em' }
  }

  const [escrowsExecution, setEscrowsExecution] = useState(a.settings?.escrowsExecution)
  const [nftokensOffersCancellation, setNftokensOffersCancellation] = useState(a.settings?.nftokensOffersCancellation)

  return (
    <div className={styles.botSettings}>
      <CheckBox
        checked={subscriptionExpired ? false : escrowsExecution}
        setChecked={() => {
          updateProAddress(a.id, {
            settings: { escrowsExecution: !escrowsExecution }
          })
          setEscrowsExecution(!escrowsExecution)
        }}
        style={{ ...checkboxStyle, marginTop: 0 }}
        disabled={subscriptionExpired}
      >
        {t('pro.settings.auto-escrow', { ns: 'admin' })}
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
          style={{ ...checkboxStyle, marginTop: 0 }}
          disabled={subscriptionExpired}
        >
          {t('pro.settings.auto-cancel-nft', { ns: 'admin' })}
        </CheckBox>
      )}
    </div>
  )
}

export function VerifiedAddresses({
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
    const addresses = Array.isArray(data?.addresses) ? data.addresses : []
    setVerifiedAddresses(addresses)
    suggestAddress(account, addresses)
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
    if (addressLimitReached) {
      setErrorMessage(t('pro.add-limit', { ns: 'admin', count: addressLimit }))
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

  const verifiedAddressCount = Array.isArray(verifiedAddresses) ? verifiedAddresses.length : 0
  const addressLimit = subscriptionExpired ? FREE_ADDRESS_LIMIT : PRO_ADDRESS_LIMIT
  const addressLimitReached = verifiedAddressCount >= addressLimit
  const canAddAddress = !addressLimitReached

  const addressButtons = (address, options) => {
    return (
      <div className={`pro-address-actions${options?.mobile ? ' mobile' : ''}`}>
        {address.crawler && (
          <Link className="button-action narrow thin" href={'/admin/pro?address=' + address.address}>
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
    <section className={styles.addressSection}>
        <h2 className="center">{t('pro.verified-addresses', { ns: 'admin' })}</h2>

        {sessionToken ? (
          <>
            <p className={styles.addressIntro}>{t('pro.wallets-intro', { ns: 'admin' })}</p>

            {rendered && (
              <>
                {!width || width > 750 ? (
                  <div className={styles.addressTableWrap}>
                    <table className={`table-large no-hover ${styles.addressTable}`}>
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
                                <div className={styles.addressIdentity}>
                                  <Avatar src={avatarSrc(a.address, { refreshPage })} size={40} />
                                  <div className={styles.addressIdentityText}>
                                    <div>
                                      <b className="orange">{a.name}</b> - {addressLink(a.address, { short: true })}
                                    </div>
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
                                  </div>
                                </div>
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
                  </div>
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
                  {verifiedAddressCount > 0 ? (
                    <>
                      {addressLimitReached ? (
                        <>
                          {t('pro.add-limit', { ns: 'admin', count: addressLimit })}
                          {subscriptionExpired ? (
                            <>
                              <br />
                              {t('pro.add-limit-pro', { ns: 'admin', count: PRO_ADDRESS_LIMIT })}{' '}
                              <Link href="/admin#bithomp-pro-subscription">
                                {t('pro.purchase-pro-link', { ns: 'admin' })}
                              </Link>.
                            </>
                          ) : (
                            <>
                              <br />
                              {t('pro.add-limit-support', { ns: 'admin' })}{' '}
                              <Mailto email="pro@bithomp.com" headers={{ subject: 'Bithomp Pro address limit' }} />.
                            </>
                          )}
                        </>
                      ) : subscriptionExpired ? (
                        <>
                          {t('pro.activate-analysis-before', { ns: 'admin' })}{' '}
                          <Link href="/admin#bithomp-pro-subscription">
                            {t('pro.purchase-pro-link', { ns: 'admin' })}
                          </Link>.
                        </>
                      ) : (
                        ''
                      )}
                    </>
                  ) : (
                    <>{t('pro.verify-first', { ns: 'admin' })}</>
                  )}
                  {canAddAddress && (
                    <div className={styles.addAddressForm}>
                      <div>
                        <AddressInput
                          title={t('table.address', { ns: 'admin' })}
                          placeholder={t('pro.address-placeholder', { ns: 'admin' })}
                          setInnerValue={setAddressToVerify}
                          hideButton={true}
                          rawData={rawData}
                          type="address"
                        />
                      </div>
                      <div>
                        <FormInput
                          title={t('watchlist.private-name', { ns: 'admin' })}
                          placeholder={t('pro.address-name-placeholder', { ns: 'admin' })}
                          setInnerValue={setAddressName}
                          defaultValue={rawData?.addressDetails?.username}
                          hideButton={true}
                        />
                      </div>
                      <button
                        className={`button-action ${styles.verifyAddressButton}`}
                        onClick={addAddressClicked}
                        disabled={!addressToVerify || !addressName}
                        type="button"
                      >
                        {t('button.verify', { ns: 'admin' })}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {errorMessage ? <div className={`center orange bold ${styles.addressError}`}>{errorMessage}</div> : null}
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
    </section>
  )
}

export default function TaxExportsPage(props) {
  return <TaxExports {...props} />
}
