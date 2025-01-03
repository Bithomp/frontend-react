import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import Image from 'next/image'
import { axiosServer, passHeaders } from '../../utils/axios'

import {
  server,
  getCoinsUrl,
  nativeCurrency,
  devNet,
  xahauNetwork,
  avatarServer,
  stripDomain,
  isDomainValid
} from '../../utils'
import {
  amountFormat,
  fullDateAndTime,
  timeFromNow,
  txIdLink,
  nativeCurrencyToFiat,
  shortNiceNumber,
  shortHash,
  codeHighlight,
  niceNumber
} from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { fetchCurrentFiatRate } from '../../utils/common'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import { MdVerified } from 'react-icons/md'

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
          '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true' +
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
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import CopyButton from '../../components/UI/CopyButton'
import { LinkAccount, LinkAmm } from '../../utils/links'
import dynamic from 'next/dynamic'

const XahauRewardTr = dynamic(() => import('../../components/Account/XahauRewardTr'), { ssr: false })

export default function Account({
  initialData,
  refreshPage,
  id,
  selectedCurrency,
  ledgerTimestampQuery,
  account,
  setSignRequest
}) {
  const { t, i18n } = useTranslation()

  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [ledgerTimestamp, setLedgerTimestamp] = useState(ledgerTimestampQuery)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(ledgerTimestampQuery)
  const [fiatRate, setFiatRate] = useState('')
  const [userData, setUserData] = useState({
    username: initialData?.username,
    service: initialData?.service?.name,
    address: initialData?.address || id
  })
  const [networkInfo, setNetworkInfo] = useState({})
  const [balances, setBalances] = useState({})
  const [showTimeMachine, setShowTimeMachine] = useState(false)

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
        '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true' +
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
          console.log(newdata)
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
  }, [id, refreshPage, selectedCurrency, ledgerTimestamp])

  useEffect(() => {
    if (!ledgerTimestamp) return
    getHistoricalRate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerTimestamp])

  useEffect(() => {
    if (!ledgerTimestamp) {
      //if there is ledgerTimestamp then we need a historical rate
      fetchCurrentFiatRate(selectedCurrency, setFiatRate)
    } else {
      getHistoricalRate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency])

  const getHistoricalRate = () => {
    if (ledgerTimestamp && selectedCurrency) {
      async function fetchHistoricalRate() {
        const response = await axios(
          'v2/rates/history/nearest/' + selectedCurrency + '?date=' + new Date(ledgerTimestamp).valueOf()
        ).catch((error) => {
          console.log(error)
        })
        if (response?.data?.[selectedCurrency]) {
          setFiatRate(response.data[selectedCurrency])
        }
      }
      fetchHistoricalRate()
    }
  }

  const avatarSrc = (data, options) => {
    /*
      1) if in blacklist - alert image
      2) if bithomp image, show it 
      3) if valid twitter - image from twitter
      4) if gravatar - image from gravatar 
      5) if xamanPro or xamanCurratedAssets - from xaman 
      6) otherwise show hashicon
    */
    if (!data) return ''
    return avatarServer + data.address + (options?.noCache && refreshPage ? '?' + refreshPage : '')
  }

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
          <td>Service</td>
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
  }, [data, networkInfo, fiatRate])

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
        image={{ file: avatarSrc(initialData) }}
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
                        <div className="mobile-summary showOnSmall-w800">
                          <Image
                            alt="avatar"
                            src={avatarSrc(data, { noCache: true })}
                            width="60"
                            height="60"
                            priority
                          />
                          <div style={{ display: 'inline-block', position: 'absolute', top: 7, left: 75 }}>
                            {data.username ? (
                              <h1 style={{ fontSize: '1em', margin: 0 }} className="blue">
                                {data.username}
                              </h1>
                            ) : (
                              <b>
                                {data.service?.name ? (
                                  <span className="green">{data.service?.name}</span>
                                ) : data?.address === account?.address && data?.ledgerInfo?.activated ? (
                                  <>
                                    Username <Link href={'/username?address=' + data.address}>register</Link>
                                  </>
                                ) : (
                                  'No username'
                                )}
                                <br />
                              </b>
                            )}
                            {data?.ledgerInfo?.blackholed ? (
                              <>
                                <b className="orange">Blackholed </b> {console.log(data.ledgerInfo)}
                                <br />
                                {/* need to test taht backend returns lastSubmittedAt for blackholed accounts */}
                                {data?.ledgerInfo?.lastSubmittedAt && (
                                  <>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</>
                                )}
                              </>
                            ) : data?.ledgerInfo?.activated ? (
                              <>
                                {data.ledgerInfo.lastSubmittedAt ? (
                                  <>
                                    <span className="green">Active </span>
                                    <br />
                                    {data?.ledgerInfo?.lastSubmittedAt && (
                                      <>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    Activated
                                    <br />
                                    {timeFromNow(data.inception, i18n)}
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                {data?.ledgerInfo?.deleted ? (
                                  <span className="red bold">Account deleted</span>
                                ) : (
                                  <>
                                    <span className="orange">Not activated</span>
                                    <br />
                                    <a
                                      href={getCoinsUrl + (devNet ? '?address=' + data?.address : '')}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Get your first {nativeCurrency}
                                    </a>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'inline-block',
                              position: 'absolute',
                              top: 7,
                              right: 5,
                              textAlign: 'right'
                            }}
                          >
                            <b>{data?.ledgerInfo?.activated ? 'Available ' : 'Balance'}</b>
                            <br />
                            <span className={balances?.available?.native ? 'green bold' : ''}>
                              {shortNiceNumber(balances?.available?.native / 1000000, 2, 0) || '0'} {nativeCurrency}
                            </span>
                            <br />
                            <span className="grey">
                              {nativeCurrencyToFiat({
                                amount: balances.available?.native,
                                selectedCurrency,
                                fiatRate
                              }) || '0 ' + selectedCurrency.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="center showOnSmall-w800 grey" style={{ marginTop: 10 }}>
                          <a href={'/explorer/' + data.address}>Transactions</a> |{' '}
                          <a href={'/explorer/' + data.address}>Tokens</a> |{' '}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setShowTimeMachine(!showTimeMachine)
                            }}
                          >
                            Time machine
                          </a>
                        </div>

                        <div className="column-left">
                          <div className="hide-on-small-w800 avatar-div">
                            <Image
                              alt="avatar"
                              src={avatarSrc(data, { noCache: true })}
                              width="200"
                              height="200"
                              className="avatar"
                              priority
                            />
                          </div>

                          <table
                            className={'table-details autowidth hide-on-small-w800'}
                            style={showTimeMachine ? { display: 'table' } : null}
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

                          {(data.xamanMeta?.kycApproved ||
                            data.xamanMeta?.xummPro ||
                            data.xamanMeta?.globalid?.profileUrl) && (
                            <div>
                              <table className="table-details autowidth">
                                <thead>
                                  <tr>
                                    <th colSpan="100">Statuses</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.xamanMeta?.kycApproved && (
                                    <tr>
                                      <td>KYC</td>
                                      <td>Xaman verified</td>
                                    </tr>
                                  )}
                                  {data.xamanMeta?.xummPro && (
                                    <tr>
                                      <td>Xaman Pro</td>
                                      <td>
                                        {data?.xamanMeta?.xummProfile?.slug ? (
                                          <a href={data.xamanMeta.xummProfile.profileUrl}>
                                            <b className="orange">{data.xamanMeta.xummProfile.slug}</b>
                                          </a>
                                        ) : (
                                          <b className="orange">activated ❤️</b>
                                        )}
                                        {/* Need to be done on the backend and tested, also need to hide the add for 1 hour after click, or longer if we also cache */}
                                        {data.xamanMeta?.monetisation?.status === 'PAYMENT_REQUIRED' && (
                                          <span className="red">
                                            <br />
                                            Limited 😔
                                          </span>
                                        )}
                                        {data.xamanMeta?.monetisation?.status === 'COMING_UP' && (
                                          <span className="red">
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
                                              <b>Purchase Xaman Pro ❤️</b>
                                            </a>
                                          </>
                                        )}
                                      </td>
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
                            </div>
                          )}

                          {((!account?.address && !data?.service?.name) || data?.address === account?.address) && (
                            <table className="table-details autowidth">
                              <thead>
                                <tr>
                                  <th colSpan="100">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td colSpan="2" className="no-padding">
                                    <div className="flex flex-center">
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
                                      >
                                        Set Avatar
                                      </button>

                                      <button
                                        className="button-action button-wide thin"
                                        onClick={() =>
                                          setSignRequest({
                                            action: 'setDomain',
                                            redirect: 'account',
                                            request: {
                                              TransactionType: 'AccountSet'
                                            }
                                          })
                                        }
                                      >
                                        {t('button.set-domain')}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                        <div className="column-right">
                          <table className="table-details">
                            <thead>
                              <tr>
                                <th colSpan="100">
                                  {data?.ledgerInfo?.ledgerTimestamp ? (
                                    <span className="red bold">
                                      Historical data ({fullDateAndTime(data.ledgerInfo.ledgerTimestamp)})
                                    </span>
                                  ) : (
                                    t('table.ledger-data')
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {data?.ledgerInfo?.accountIndex && (
                                <>
                                  <tr>
                                    <td>Account index:</td>
                                    <td>
                                      {data.ledgerInfo.accountIndex}{' '}
                                      <CopyButton text={data.ledgerInfo.accountIndex}></CopyButton> (
                                      {parseInt(data.ledgerInfo.accountIndex, 16)})
                                    </td>
                                  </tr>
                                </>
                              )}
                              <tr>
                                <td>{t('table.address')}</td>
                                <td>
                                  {data.address} <CopyButton text={data.address}></CopyButton>
                                </td>
                              </tr>
                              {data?.ledgerInfo?.blackholed ? (
                                <tr>
                                  <td className="orange">Blackholed</td>
                                  <td>This account is BLACKHOLED. It can not issue more tokens.</td>
                                </tr>
                              ) : (
                                <tr>
                                  <td>{t('table.status')}</td>
                                  <td>
                                    {data?.ledgerInfo?.activated ? (
                                      <>
                                        {data.ledgerInfo.lastSubmittedAt ? (
                                          <>
                                            <span className="green">Active </span>
                                            {data?.ledgerInfo?.lastSubmittedAt && (
                                              <>
                                                {timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)} (
                                                {fullDateAndTime(data.ledgerInfo.lastSubmittedAt)})
                                              </>
                                            )}
                                            {data?.ledgerInfo?.lastSubmittedTxHash && (
                                              <> {txIdLink(data.ledgerInfo.lastSubmittedTxHash, 0)}</>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            Activated {timeFromNow(data.inception, i18n)} (
                                            {fullDateAndTime(data.inception)})
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {data?.ledgerInfo?.deleted ? (
                                          <>
                                            <span className="red bold">Account deleted.</span>
                                            <br />
                                            <span className="orange">
                                              This account has been deactivated and is no longer active. It can be
                                              restored by sending at least {amountFormat(networkInfo?.reserveBase)} to
                                              the address.
                                            </span>
                                          </>
                                        ) : (
                                          <span className="orange">
                                            Not activated yet. The owner with full access to the account can activate it
                                            by sending at least {amountFormat(networkInfo?.reserveBase)} to the address.
                                          </span>
                                        )}
                                        {getCoinsUrl && (
                                          <>
                                            {' '}
                                            <a
                                              href={getCoinsUrl + (devNet ? '?address=' + data?.address : '')}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              Get your first {nativeCurrency}.
                                            </a>
                                          </>
                                        )}
                                        <br />
                                        <a href="https://xrpl.org/reserves.html" target="_blank" rel="noreferrer">
                                          Learn more about reserves.
                                        </a>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              )}
                              {data?.ledgerInfo?.balance && (
                                <>
                                  <tr>
                                    <td>Total balance</td>
                                    <td>
                                      {amountFormat(balances?.total?.native)}
                                      {nativeCurrencyToFiat({
                                        amount: balances.total?.native,
                                        selectedCurrency,
                                        fiatRate
                                      })}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Reserved</td>
                                    <td>
                                      {amountFormat(balances?.reserved?.native, { minFractionDigits: 6 })}
                                      {nativeCurrencyToFiat({
                                        amount: balances.reserved?.native,
                                        selectedCurrency,
                                        fiatRate
                                      })}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Available</td>
                                    <td>
                                      <b className="green">{amountFormat(balances?.available?.native)}</b>
                                      {nativeCurrencyToFiat({
                                        amount: balances.available?.native,
                                        selectedCurrency,
                                        fiatRate
                                      })}
                                    </td>
                                  </tr>
                                </>
                              )}
                              {data.ledgerInfo?.importSequence && (
                                <tr>
                                  <td>Import sequence</td>
                                  <td>#{data.ledgerInfo.importSequence}</td>
                                </tr>
                              )}
                              {xahauNetwork ? (
                                <>
                                  <XahauRewardTr data={data.ledgerInfo} />
                                  {data.ledgerInfo?.hookStateCount && (
                                    <tr>
                                      <td>Hook state count</td>
                                      <td>#{data.ledgerInfo?.hookStateCount}</td>
                                    </tr>
                                  )}
                                  {data.ledgerInfo?.hookNamespaces && (
                                    <tr>
                                      <td>Hook Namespaces</td>
                                      <td>#{data.ledgerInfo?.hookNamespaces.length}</td>
                                    </tr>
                                  )}
                                </>
                              ) : (
                                <>
                                  {data.ledgerInfo?.ammID && (
                                    <tr>
                                      <td>AMM ID</td>
                                      <td>
                                        <Link href={'/amm/' + data.ledgerInfo.ammID}>
                                          {shortHash(data.ledgerInfo.ammID, 4)}
                                        </Link>
                                      </td>
                                    </tr>
                                  )}
                                  {data.ledgerInfo?.mintedNFTokens && (
                                    <tr>
                                      <td>Minted NFTs</td>
                                      <td>{data.ledgerInfo.mintedNFTokens}</td>
                                    </tr>
                                  )}
                                  {data.ledgerInfo?.burnedNFTokens && (
                                    <tr>
                                      <td>Burned NFTs</td>
                                      <td>{data.ledgerInfo.burnedNFTokens}</td>
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
                                      <td>
                                        <LinkAccount account={data.ledgerInfo.nftokenMinter} />
                                      </td>
                                    </tr>
                                  )}
                                </>
                              )}

                              {data.ledgerInfo?.ammID && (
                                <tr>
                                  <td>AMM ID</td>
                                  <td>
                                    <LinkAmm ammId={data.ledgerInfo.ammID} hash={true} icon={true} copy={true} />
                                  </td>
                                </tr>
                              )}
                              {data.ledgerInfo?.domain && (
                                <tr>
                                  <td>Domain</td>
                                  <td>
                                    {isDomainValid(stripDomain(data.ledgerInfo.domain)) ? (
                                      <>
                                        <a
                                          href={'https://' + stripDomain(data.ledgerInfo.domain)}
                                          className={data.verifiedDomain ? 'green bold' : ''}
                                          target="_blank"
                                          rel="noopener nofollow"
                                        >
                                          {stripDomain(data.ledgerInfo.domain)}
                                        </a>{' '}
                                        {data.verifiedDomain && (
                                          <span className="green">
                                            <MdVerified />
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      codeHighlight(data.ledgerInfo.domain)
                                    )}
                                  </td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.disallowXRP && (
                                <tr>
                                  <td>Receiving {nativeCurrency}</td>
                                  <td className="bold">disabled</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.requireDestTag && (
                                <tr>
                                  <td>Destination tag</td>
                                  <td className="bold">required</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.ticketCount && (
                                <tr>
                                  <td>Tickets</td>
                                  <td className="bold">{data.ledgerInfo.ticketCount}</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.ticketSize && (
                                <tr>
                                  <td>Ticket size</td>
                                  <td className="bold">{data.ledgerInfo.ticketSize}</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.transferRate && (
                                <tr>
                                  <td>Transfer rate</td>
                                  <td className="bold">
                                    {Math.ceil((data.ledgerInfo.transferRate - 1) * 10000) / 100}
                                  </td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.globalFreeze && (
                                <tr>
                                  <td>Global freeze</td>
                                  <td className="bold">true</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.noFreeze && (
                                <tr>
                                  <td>Freeze</td>
                                  <td className="bold">disabled</td>
                                </tr>
                              )}
                              {/* If set, this account must individually approve other users in order for those users to hold this account’s issuances. */}
                              {data.ledgerInfo?.flags?.requireAuth && (
                                <tr>
                                  <td>Token authorization</td>
                                  <td className="bold">required</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.depositAuth && (
                                <tr>
                                  <td>Deposit authorization</td>
                                  <td className="bold">required</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.defaultRipple && (
                                <tr>
                                  <td>Rippling</td>
                                  <td className="bold">enabled</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.disallowIncomingNFTokenOffers && (
                                <tr>
                                  <td>Incoming NFT offers</td>
                                  <td className="bold">disallowed</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.disallowIncomingCheck && (
                                <tr>
                                  <td>Incoming checks</td>
                                  <td className="bold">disallowed</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.disallowIncomingPayChan && (
                                <tr>
                                  <td>Incoming payment channels</td>
                                  <td className="bold">disallowed</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.disallowIncomingTrustline && (
                                <tr>
                                  <td>Incoming trustlines</td>
                                  <td className="bold">disallowed</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.amm && (
                                <tr>
                                  <td>AMM</td>
                                  <td className="bold">true</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.allowTrustlineClawback && (
                                <tr>
                                  <td>Trustline clawback</td>
                                  <td className="bold">enabled</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.uriTokenIssuer && (
                                <tr>
                                  <td>URI token issuer</td>
                                  <td className="bold">true</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.dissallowIncomingRemit && (
                                <tr>
                                  <td>Incoming Remit</td>
                                  <td className="bold">disallowed</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.disableMaster && (
                                <tr>
                                  <td>Master key</td>
                                  <td className="bold">disabled</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.regularKey && (
                                <tr>
                                  <td>Regular key</td>
                                  <td>
                                    <LinkAccount account={data.ledgerInfo.regularKey} />
                                  </td>
                                </tr>
                              )}
                              {data.ledgerInfo?.flags?.passwordSpend && (
                                <tr>
                                  <td>Free re-key</td>
                                  <td className="bold">spent</td>
                                </tr>
                              )}
                              {data.ledgerInfo?.signerList && (
                                <>
                                  <tr>
                                    <td>Multi-signing</td>
                                    <td className="bold">Enabled</td>
                                  </tr>
                                  {data.ledgerInfo.signerList.signerQuorum && (
                                    <tr>
                                      <td>Multi signing threshold</td>
                                      <td className="bold">{data.ledgerInfo.signerList.signerQuorum}</td>
                                    </tr>
                                  )}
                                  {data.ledgerInfo.signerList.signerEntries.map((signer, index) => (
                                    <tr key={index}>
                                      <td>
                                        Signer {index + 1}, weight <b>{signer.signerWeight}</b>
                                      </td>
                                      <td>
                                        <LinkAccount account={signer.account} />
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              )}
                            </tbody>
                          </table>

                          {data?.inception && (
                            <table className="table-details">
                              <thead>
                                <tr>
                                  <th colSpan="100">Public data</th>
                                </tr>
                              </thead>
                              <tbody>
                                {accountNameTr(data)}

                                <tr>
                                  <td>Activated</td>
                                  <td>
                                    {timeFromNow(data.inception, i18n)} ({fullDateAndTime(data.inception)})
                                  </td>
                                </tr>
                                {data.service?.domain && (
                                  <tr>
                                    <td>Web address</td>
                                    <td>
                                      <a
                                        href={'https://' + data.service.domain}
                                        className="green bold"
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
                                    <td>
                                      {niceNumber(data.initialBalance)} {nativeCurrency}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}
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
