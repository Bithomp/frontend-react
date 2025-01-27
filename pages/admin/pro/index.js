import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import AddressInput from '../../../components/UI/AddressInput'
import { avatarServer, devNet, encode, useWidth, xahauNetwork } from '../../../utils'
import { removeProAddress, activateAddressCrawler, crawlerStatus, updateProAddress } from '../../../utils/pro'
import FormInput from '../../../components/UI/FormInput'
import { addressLink } from '../../../utils/format'
import Image from 'next/image'

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

const SettingsCheckBoxes = ({ a, mobile, subscriptionExpired }) => {
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
        {mobile ? 'Auto Escrow Execution' : 'Execute Escrows'}
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
          {mobile ? 'Auto Cancelation of Expired NFT offers' : 'Cancel Expired NFT Offers'}
        </CheckBox>
      )}
    </>
  )
}

export default function Pro({ account, setSignRequest, refreshPage, subscriptionExpired }) {
  const router = useRouter()
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
        router.push('/admin')
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
    getVerifiedAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPage])

  const addAddressClicked = () => {
    if (!account?.pro) {
      setErrorMessage('There is no pro email')
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
      <>
        {address.crawler && (
          <Link className="button-action narrow thin" href={'/admin/pro/history?address=' + address.address}>
            {options?.mobile ? 'View history' : 'View'}
          </Link>
        )}{' '}
        {!(address.crawler && address.crawler.status !== 'paused') && (
          <button
            className="button-action narrow thin"
            onClick={() => {
              activateAddressCrawler(address.address, afterVerifiedAddressesUpdate)
            }}
            disabled={subscriptionExpired}
          >
            Enable
          </button>
        )}
      </>
    )
  }

  return (
    <>
      <SEO title="My addresses" />
      <div className="page-admin content-center">
        <h1 className="center">My addresses</h1>

        <AdminTabs name="mainTabs" tab="pro" />

        <ProTabs tab="addresses" />

        <h4 className="center">Verified addresses</h4>
        <div>
          Pro accounts can use the following features:
          <ul>
            <li>View and Export your personal historical balance changes</li>
            <li>
              Auto execution of time based escrows
              <br />
              (that you created or that have your address as a destination)
            </li>
            {!xahauNetwork && (
              <li>
                Auto cancelation of expired NFT offers
                <br />
                (offers that you created and offers from others for NFTs you own)
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
                    <th className="left">Address</th>
                    <th className="right">Balance history</th>
                    <th className="left">Bot settings</th>
                    <th className="center">Remove</th>
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
                                    <Image
                                      alt="avatar"
                                      src={avatarServer + a.address + (refreshPage ? '?' + refreshPage : '')}
                                      width="40"
                                      height="40"
                                    />
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
                                        Set Avatar
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td className="right">
                            {crawlerStatus(a.crawler)}
                            <div style={{ height: 5, width: '100%' }}></div>
                            {addressButtons(a)}
                          </td>
                          <td className="left">
                            <SettingsCheckBoxes a={a} subscriptionExpired={subscriptionExpired} />
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
                        {loadingVerifiedAddresses ? 'Loading data...' : 'You do not have verified addresses yet.'}
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
                            <Image alt="avatar" src={avatarServer + a.address} width="30" height="30" />
                            <br />
                            <br />
                            {i + 1}
                          </td>
                          <td>
                            <p>
                              Address: <b className="orange">{a.name}</b> - {addressLink(a.address, { short: true })}
                            </p>
                            <p>Status: {crawlerStatus(a.crawler, { inline: true })}</p>
                            <p>
                              <SettingsCheckBoxes a={a} mobile={true} subscriptionExpired={subscriptionExpired} />
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
                                    Set Avatar
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
                                Remove
                              </a>
                            </p>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan="100" className="center">
                        {loadingVerifiedAddresses ? 'Loading data...' : 'You do not have verified addresses yet.'}
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
                      In order to activate Data Analyses, please{' '}
                      <Link href="/admin/subscriptions?tab=pro">purchase the Bithomp Pro subscription</Link>.
                    </>
                  ) : (
                    'You can add up to 5 addresses for data analyses. If you need more, please contact us.'
                  )}
                </>
              ) : (
                <>In order to use PRO functionality for your accounts, you would need to verify them first.</>
              )}
              {/* Allow only 1 for non-subscribers and 5 for those with subscription */}
              {((verifiedAddresses?.length < 5 && !subscriptionExpired) ||
                !verifiedAddresses ||
                verifiedAddresses?.length === 0) && (
                <>
                  <br />
                  <br />
                  <div className="flex flex-center">
                    <span
                      style={width > 851 ? { width: 'calc(70% - 20px)' } : { width: '100%', marginBottom: '-20px' }}
                    >
                      <AddressInput
                        title="Address"
                        placeholder="Enter address"
                        setInnerValue={setAddressToVerify}
                        hideButton={true}
                        rawData={rawData}
                        type="address"
                      />
                    </span>
                    <span style={{ width: width > 851 ? '30%' : '100%' }}>
                      <FormInput
                        title="Private name"
                        placeholder="Enter address name"
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
                      Verify
                    </button>
                  </center>
                </>
              )}
            </div>
          </>
        )}
        <br />
        {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
      </div>
    </>
  )
}
