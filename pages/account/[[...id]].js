import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import Image from 'next/image'
import { axiosServer, passHeaders } from '../../utils/axios'

import { server, nativeCurrency, devNet, xahauNetwork, networks, avatarSrc } from '../../utils'
import {
  fullDateAndTime,
  timeFromNow,
  txIdLink,
  niceNumber,
  AddressWithIconFilled,
  fullNiceNumber
} from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import RelatedLinks from '../../components/Account/RelatedLinks'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  const { id, ledgerTimestamp } = query
  //keep it from query instead of params, anyway it is an array sometimes
  const account = id ? (Array.isArray(id) ? id[0] : id) : ''
  if (account) {
    try {
      const res = await axiosServer({
        method: 'get',
        url:
          'v2/address/' +
          account +
          '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true' +
          (ledgerTimestamp ? '&ledgerTimestamp=' + new Date(ledgerTimestamp).toISOString() : ''),
        headers: passHeaders(req)
      })
      initialData = res?.data
    } catch (error) {
      console.error(error)
    }
  }

  return {
    props: {
      id: account,
      ledgerTimestampQuery: Date.parse(ledgerTimestamp) || '',
      isSsrMobile: getIsSsrMobile(context),
      initialData,
      ...(await serverSideTranslations(locale, ['common', 'account']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaTelegram,
  FaXTwitter,
  FaYoutube
} from 'react-icons/fa6'
import Did from '../../components/Account/Did'
import { fetchHistoricalRate } from '../../utils/common'
import AccountSummary from '../../components/Account/AccountSummary'
import HistoricalData from '../../components/Account/HistoricalData'

export default function Account({
  initialData,
  refreshPage,
  id,
  selectedCurrency,
  ledgerTimestampQuery,
  account,
  setSignRequest,
  fiatRate
}) {
  const { t, i18n } = useTranslation()

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [ledgerTimestamp, setLedgerTimestamp] = useState(ledgerTimestampQuery)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(ledgerTimestampQuery)
  const [pageFiatRate, setPageFiatRate] = useState(0)
  const [userData, setUserData] = useState({
    username: initialData?.username,
    service: initialData?.service?.name,
    address: initialData?.address || id
  })
  const [networkInfo, setNetworkInfo] = useState({})
  const [balances, setBalances] = useState({})
  const [shownOnSmall, setShownOnSmall] = useState(null)

  useEffect(() => {
    if (!initialData?.address) return
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    async function fetchData() {
      const networkInfoData = await axios('v2/server')
      setNetworkInfo(networkInfoData?.data)
    }
    fetchData()
  }, [])

  const checkApi = async (opts) => {
    if (!id) return
    setLoading(true)

    let noCache = ''

    if (opts?.noCache) {
      noCache = '&timestamp=' + Date.now()
    }

    const response = await axios(
      '/v2/address/' +
        id +
        '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true' +
        noCache +
        (ledgerTimestamp ? '&ledgerTimestamp=' + new Date(ledgerTimestamp).toISOString() : '')
    ).catch((error) => {
      setErrorMessage(t('error.' + error.message))
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.address) {
        setData(newdata)
        setUserData({
          username: newdata.username,
          service: newdata.service?.name,
          address: newdata.address
        })
      } else {
        if (newdata.error) {
          setErrorMessage(t('error-api.' + newdata.error))
        } else {
          setErrorMessage('Error')
        }
      }
    }
  }

  useEffect(() => {
    if (!selectedCurrency) return
    if (data?.address) {
      checkApi({ noCache: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshPage, ledgerTimestamp])

  useEffect(() => {
    if (!selectedCurrency) return
    if (!ledgerTimestamp) {
      setPageFiatRate(fiatRate)
    } else {
      //if there is ledgerTimestamp then we need a historical rate
      fetchHistoricalRate({ timestamp: ledgerTimestamp, selectedCurrency, setPageFiatRate })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiatRate, ledgerTimestamp])

  const accountNameTr = (data) => {
    if (!data) return ''

    let output = []

    if (data.ledgerInfo?.activated) {
      //show username registration link and usernsmes only for active accounts
      if (data.username) {
        output.push(
          <tr key="0">
            <td>{t('table.username')}</td>
            <td className="blue bold">
              {data.username} <CopyButton text={server + '/account/' + data.username}></CopyButton>
            </td>
          </tr>
        )
      } else if (!data.service?.name) {
        //if no username and no service - show register link
        output.push(
          <tr key="0">
            <td>{t('table.username')}</td>
            <td>
              <Link href={'/username?address=' + data.address}>register</Link>
            </td>
          </tr>
        )
      }
    }

    let thirdPartyService = null
    if (data.xamanMeta?.thirdPartyProfiles?.length) {
      for (let i = 0; i < data.xamanMeta.thirdPartyProfiles.length; i++) {
        const excludeList = ['xumm.app', 'xaman.app', 'xrpl', 'xrplexplorer.com', 'bithomp.com']
        if (!excludeList.includes(data.xamanMeta.thirdPartyProfiles[i].source)) {
          thirdPartyService = data.xamanMeta.thirdPartyProfiles[i].accountAlias
          break
        }
      }
    }

    if (data.service?.name || thirdPartyService) {
      output.push(
        <tr key="1">
          <td>Service name</td>
          {data.service?.name ? (
            <td className="green bold">{data.service.name}</td>
          ) : (
            <td>
              <span className="bold">{thirdPartyService}</span> (unverified)
            </td>
          )}
        </tr>
      )
    }

    if (data.nickname) {
      output.push(
        <tr key="2">
          <td>Nickname</td>
          <td className="orange bold">{data.nickname}</td>
        </tr>
      )
    }

    return output
  }

  useEffect(() => {
    if (!data?.ledgerInfo || !networkInfo) return
    let balanceList = {
      total: {
        native: data.ledgerInfo.balance
      },
      reserved: {
        native: Number(networkInfo.reserveBase) + data.ledgerInfo.ownerCount * networkInfo.reserveIncrement
      },
      available: {}
    }

    if (balanceList.reserved.native > balanceList.total.native) {
      balanceList.reserved.native = balanceList.total.native
    }

    balanceList.available.native = balanceList.total.native - balanceList.reserved.native

    if (balanceList.available.native < 0) {
      balanceList.available.native = 0
    }

    setBalances(balanceList)
  }, [data, networkInfo, pageFiatRate])

  const resetTimeMachine = () => {
    setLedgerTimestampInput(null)
    setLedgerTimestamp(null)
  }

  return (
    <>
      <SEO
        page="Account"
        title={
          t('explorer.header.account') +
          ' ' +
          (initialData?.service?.name || initialData?.username || initialData?.address || id)
        }
        description={
          'Account details, transactions, NFTs, Tokens for ' +
          (initialData?.service?.name || initialData?.username) +
          ' ' +
          (initialData?.address || id)
        }
        image={{ file: avatarSrc(initialData?.address) }}
      />
      <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" userData={userData} />
      <div className="content-profile account">
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
                    {data?.address && (
                      <>
                        <div className="show-on-small-w800">
                          <AccountSummary
                            data={data}
                            account={account}
                            balances={balances}
                            refreshPage={refreshPage}
                            selectedCurrency={selectedCurrency}
                            pageFiatRate={pageFiatRate}
                          />
                        </div>

                        <div className="center show-on-small-w800 grey" style={{ marginTop: 10 }}>
                          {((!account?.address && !data?.service) || data?.address === account?.address) &&
                            !data?.ledgerInfo?.blackholed && (
                              <>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setShownOnSmall(shownOnSmall === 'actions' ? null : 'actions')
                                  }}
                                >
                                  Actions
                                </a>{' '}
                                |{' '}
                              </>
                            )}
                          <a href={'/explorer/' + data.address}>Transactions</a> |{' '}
                          <a href={'/explorer/' + data.address}>Tokens</a> |{' '}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setShownOnSmall(shownOnSmall === 'timeMachine' ? null : 'timeMachine')
                            }}
                          >
                            Time machine
                          </a>
                        </div>

                        <div className="column-left">
                          <div className="hide-on-small-w800 avatar-div">
                            <Image
                              alt="avatar"
                              src={avatarSrc(data?.address, refreshPage)}
                              width="200"
                              height="200"
                              className="avatar"
                              priority
                            />
                          </div>

                          {((!account?.address && !data?.service) || data?.address === account?.address) &&
                            !data?.ledgerInfo?.blackholed && (
                              <table
                                className={'table-details autowidth hide-on-small-w800'}
                                style={shownOnSmall === 'actions' ? { display: 'table' } : null}
                              >
                                <thead>
                                  <tr>
                                    <th colSpan="100">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td colSpan="2" className="no-padding">
                                      <div className="flex flex-center">
                                        {!account?.address && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                redirect: 'account'
                                              })
                                            }
                                          >
                                            {t('signin.signin')}
                                          </button>
                                        )}

                                        {xahauNetwork && (
                                          <>
                                            {data.ledgerInfo.rewardLgrFirst ? (
                                              <button
                                                className="button-action button-wide thin"
                                                onClick={() =>
                                                  setSignRequest({
                                                    request: {
                                                      TransactionType: 'ClaimReward',
                                                      Account: data.address,
                                                      Flags: 1
                                                    }
                                                  })
                                                }
                                                disabled={
                                                  data.address !== account?.address || !data.ledgerInfo?.activated
                                                }
                                              >
                                                Rewards Opt-out
                                              </button>
                                            ) : (
                                              <button
                                                className="button-action button-wide thin"
                                                onClick={() =>
                                                  setSignRequest({
                                                    request: {
                                                      TransactionType: 'ClaimReward',
                                                      Issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                                                      Account: data.address
                                                    }
                                                  })
                                                }
                                                disabled={
                                                  data.address !== account?.address || !data.ledgerInfo?.activated
                                                }
                                              >
                                                Rewards Opt-in
                                              </button>
                                            )}
                                          </>
                                        )}

                                        {!devNet && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setAvatar',
                                                request: {
                                                  TransactionType: 'AccountSet',
                                                  Account: data.address
                                                },
                                                data: {
                                                  signOnly: true,
                                                  action: 'set-avatar'
                                                }
                                              })
                                            }
                                            disabled={data.address !== account?.address}
                                          >
                                            Set an Avatar
                                          </button>
                                        )}

                                        {!data.ledgerInfo.domain && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setDomain',
                                                request: {
                                                  TransactionType: 'AccountSet',
                                                  Account: data?.address
                                                }
                                              })
                                            }
                                            disabled={data.address !== account?.address || !data?.ledgerInfo?.activated}
                                          >
                                            {t('button.set-domain')}
                                          </button>
                                        )}

                                        {!xahauNetwork && !data?.ledgerInfo?.did && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setDid',
                                                request: {
                                                  TransactionType: 'DIDSet',
                                                  Account: data?.address
                                                }
                                              })
                                            }
                                            disabled={data.address !== account?.address || !data?.ledgerInfo?.activated}
                                          >
                                            {t('button.set-did', { ns: 'account' })}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}

                          <table
                            className={'table-details autowidth hide-on-small-w800'}
                            style={shownOnSmall === 'timeMachine' ? { display: 'table' } : null}
                          >
                            <thead>
                              <tr>
                                <th colSpan="100">Time machine</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan="2" className="no-padding">
                                  {/*  (info) Check account balance and settings in any Time in the past. */}
                                  <div className="time-machine">
                                    <DatePicker
                                      selected={ledgerTimestampInput || new Date()}
                                      onChange={setLedgerTimestampInput}
                                      selectsStart
                                      showTimeInput
                                      timeInputLabel={t('table.time')}
                                      minDate={new Date(data.inception * 1000)}
                                      maxDate={new Date()}
                                      dateFormat="yyyy/MM/dd HH:mm:ss"
                                      className="dateAndTimeRange"
                                      showMonthDropdown
                                      showYearDropdown
                                    />
                                  </div>
                                  <div className="flex flex-center">
                                    <button
                                      onClick={() => setLedgerTimestamp(ledgerTimestampInput)}
                                      className="button-action thin button-wide"
                                    >
                                      Update
                                    </button>{' '}
                                    <button onClick={resetTimeMachine} className="button-action thin button-wide">
                                      Reset
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="column-right">
                          <div className="hide-on-small-w800">
                            <AccountSummary
                              data={data}
                              account={account}
                              balances={balances}
                              refreshPage={refreshPage}
                              selectedCurrency={selectedCurrency}
                              pageFiatRate={pageFiatRate}
                            />
                            <br />
                          </div>

                          <HistoricalData
                            data={data}
                            account={account}
                            balances={balances}
                            selectedCurrency={selectedCurrency}
                            pageFiatRate={pageFiatRate}
                            networkInfo={networkInfo}
                            setSignRequest={setSignRequest}
                          />

                          {data?.inception && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Public data</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.service?.socialAccounts && (
                                  <tr>
                                    <td>Social accounts</td>
                                    <td className="social-icons">
                                      {data.service.socialAccounts.twitter && (
                                        <a
                                          href={'https://x.com/' + data.service.socialAccounts.twitter}
                                          aria-label="X"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaXTwitter />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.youtube && (
                                        <a
                                          href={'https://youtube.com/' + data.service.socialAccounts.youtube}
                                          aria-label="Youtube"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaYoutube />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.linkedin && (
                                        <a
                                          href={
                                            'https://linkedin.com/company/' + data.service.socialAccounts.linkedin + '/'
                                          }
                                          aria-label="Linkedin"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaLinkedin />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.instagram && (
                                        <a
                                          href={
                                            'https://www.instagram.com/' + data.service.socialAccounts.instagram + '/'
                                          }
                                          aria-label="Instagram"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaInstagram />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.telegram && (
                                        <a
                                          href={'https://t.me/' + data.service.socialAccounts.telegram}
                                          aria-label="Telegram"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaTelegram />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.facebook && (
                                        <a
                                          href={
                                            'https://www.facebook.com/' + data.service.socialAccounts.facebook + '/'
                                          }
                                          aria-label="Facebook"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaFacebook />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.medium && (
                                        <a
                                          href={'https://medium.com/' + data.service.socialAccounts.medium}
                                          aria-label="Medium"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaMedium />
                                        </a>
                                      )}
                                      {data.service.socialAccounts.reddit && (
                                        <a
                                          href={'https://www.reddit.com/' + data.service.socialAccounts.reddit + '/'}
                                          aria-label="Reddit"
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          <FaReddit />
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                )}

                                {accountNameTr(data)}
                                {data.bithomp?.bithompPro && (
                                  <tr>
                                    <td>Bithomp Pro</td>
                                    <td className="bold">Activated ❤️</td>
                                  </tr>
                                )}
                                {data.payString &&
                                  !data.ledgerInfo?.requireDestTag &&
                                  !data.ledgerInfo?.blackholed &&
                                  !data.blacklist?.blacklisted &&
                                  !data.service && (
                                    <tr>
                                      <td>PayString</td>
                                      <td className="blue">
                                        {data.payString} <CopyButton text={data.payString} />
                                      </td>
                                    </tr>
                                  )}
                                <tr>
                                  <td>Activated</td>
                                  <td>
                                    {timeFromNow(data.inception, i18n)} ({fullDateAndTime(data.inception)})
                                    {data?.inceptionTxHash && <> {txIdLink(data.inceptionTxHash, 0)}</>}
                                  </td>
                                </tr>
                                {data.service?.domain && (
                                  <tr>
                                    <td>Web address</td>
                                    <td>
                                      <a
                                        href={'https://' + data.service.domain}
                                        className="bold"
                                        target="_blank"
                                        rel="noopener nofollow"
                                      >
                                        {data.service.domain}
                                      </a>
                                    </td>
                                  </tr>
                                )}
                                {data.genesis && (
                                  <tr>
                                    <td>Genesis balance</td>
                                    <td className="bold">
                                      {niceNumber(data.initialBalance)} {nativeCurrency}
                                    </td>
                                  </tr>
                                )}
                                {data.parent?.address === data.address ? (
                                  <tr>
                                    <td>
                                      Imported from <b>XRPL</b>
                                    </td>
                                    <td>
                                      <a
                                        href={
                                          (devNet ? networks.testnet.server : networks.mainnet.server) +
                                          '/account/' +
                                          data.address
                                        }
                                      >
                                        {data.address}
                                      </a>
                                    </td>
                                  </tr>
                                ) : (
                                  <>
                                    {!data.genesis && (
                                      <tr>
                                        <td>Activated by</td>
                                        <td>
                                          <AddressWithIconFilled
                                            data={{
                                              address: data.parent?.address,
                                              addressDetails: {
                                                username: data.parent?.username,
                                                service: data.parent?.service?.name || data.parent?.service?.domain
                                              }
                                            }}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                )}
                                {!data.genesis && data.initialBalance && (
                                  <tr>
                                    <td>Activated with</td>
                                    <td>
                                      {fullNiceNumber(data.initialBalance)} {nativeCurrency}
                                    </td>
                                  </tr>
                                )}
                                {data.flare?.spark && (
                                  <>
                                    <tr>
                                      <td>Flare address</td>
                                      <td>
                                        <a
                                          href={'https://flarescan.com/address/' + data.flare.address}
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          {data.flare.address}
                                        </a>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Flare claim</td>
                                      <td>{fullNiceNumber(data.flare.spark * 0.15)} FLR</td>
                                    </tr>
                                    <tr>
                                      <td>Songbird address</td>
                                      <td>
                                        <a
                                          href={'https://songbird.flarescan.com/address/' + data.flare.address}
                                          target="_blank"
                                          rel="noopener"
                                        >
                                          {data.flare.address}
                                        </a>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Songbird claim</td>
                                      <td>{fullNiceNumber(data.flare.songbird)} SGB</td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          )}

                          {(data?.xamanMeta?.xummPro ||
                            data.xamanMeta?.kycApproved ||
                            data.xamanMeta?.globalid?.profileUrl) && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Xaman data</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.xamanMeta?.xummPro && (
                                  <>
                                    <tr>
                                      <td>Pro</td>
                                      <td>
                                        {data?.xamanMeta?.xummProfile?.slug ? (
                                          <a href={data.xamanMeta.xummProfile.profileUrl} className="green">
                                            {data.xamanMeta.xummProfile.slug}
                                          </a>
                                        ) : (
                                          <span className="bold">activated</span>
                                        )}
                                        {/* need to hide the add for 2 hours after click (1hour our cache + 1 hour xppl-labs cache) */}
                                        {data.xamanMeta?.monetisation?.status === 'PAYMENT_REQUIRED' && (
                                          <span className="orange">
                                            <br />
                                            Limited 😔
                                          </span>
                                        )}
                                        {data.xamanMeta?.monetisation?.status === 'COMING_UP' && (
                                          <span className="orange">
                                            <br />
                                            Soon limited 😔
                                          </span>
                                        )}
                                        {(data.xamanMeta?.monetisation?.status === 'COMING_UP' ||
                                          data.xamanMeta?.monetisation?.status === 'PAYMENT_REQUIRED') && (
                                          <>
                                            <br />
                                            <a
                                              href="https://xrpl-labs.com/pro/get?v=BITHOMP"
                                              target="_blank"
                                              rel="noopener nofollow"
                                            >
                                              Purchase Xaman Pro
                                            </a>{' '}
                                            ❤️
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                    {data.xamanMeta?.xummProfile?.ownerAlias && (
                                      <tr>
                                        <td>Owner alias</td>
                                        <td>{data.xamanMeta?.xummProfile?.ownerAlias}</td>
                                      </tr>
                                    )}
                                    {data.xamanMeta?.xummProfile?.accountAlias && (
                                      <tr>
                                        <td>Account alias</td>
                                        <td>{data.xamanMeta?.xummProfile?.accountAlias}</td>
                                      </tr>
                                    )}
                                  </>
                                )}

                                {data.xamanMeta?.kycApproved && (
                                  <tr>
                                    <td>KYC</td>
                                    <td className="green">verified</td>
                                  </tr>
                                )}

                                {data.xamanMeta?.globalid?.profileUrl && (
                                  <tr>
                                    <td>GlobaliD</td>
                                    <td>
                                      <a href={data.xamanMeta.globalid.profileUrl}>
                                        <u className="bold green">
                                          {data.xamanMeta.globalid.profileUrl.replace('https://app.global.id/u/', '')}
                                        </u>
                                      </a>{' '}
                                      <a href={data.xamanMeta.globalid.profileUrl}>
                                        <b className="green">
                                          <i className="fa fa-globe"></i>
                                        </b>
                                      </a>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}

                          {data?.ledgerInfo?.did && (
                            <Did data={data} account={account} setSignRequest={setSignRequest} />
                          )}

                          <RelatedLinks data={data} />
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
            <h1 className="center">{t('explorer.header.account')}</h1>
            <p className="center">
              Here you will be able to see all the information about the account, including the transactions, tokens,
              NFTs, and more.
            </p>
          </>
        )}
      </div>
      <style jsx>{`
        .no-padding {
          padding: 0;
        }

        .no-padding .flex {
          gap: 10px;
          margin-top: 3px;
        }

        .hide-on-small-w800 {
          @media only screen and (max-width: 800px) {
            display: none;
          }
        }

        @media (min-width: 800px) {
          .button-wide {
            width: 100%;
          }
        }
        @media (max-width: 800px) {
          .button-wide {
            width: calc(50% - 27px);
          }
        }
      `}</style>
    </>
  )
}
