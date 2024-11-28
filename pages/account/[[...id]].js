import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import Image from 'next/image'
import { axiosServer, passHeaders } from '../../utils/axios'

import { server, getCoinsUrl, nativeCurrency, devNet } from '../../utils'
import { amountFormat, fullDateAndTime, timeFromNow, txIdLink, nativeCurrencyToFiat } from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'
import { fetchCurrentFiatRate } from '../../utils/common'

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
import { LinkAmm } from '../../utils/links'

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
    return 'https://cdn.bithomp.com/avatar/' + data.address + (options?.noCache && refreshPage ? '?' + refreshPage : '')
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
        const excludeList = ['xumm.app', 'xaman.app', 'xrpl', 'xrplexplorer.com']
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
                        <div className="column-left">
                          <center>
                            <Image
                              alt="avatar"
                              src={avatarSrc(data, { noCache: true })}
                              width="200"
                              height="200"
                              className="avatar"
                              priority
                            />
                          </center>

                          <table className="table-details autowidth">
                            <thead>
                              <tr>
                                <th colSpan="100">Time machine</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan="2">
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
                                  <div>
                                    <button
                                      onClick={() => setLedgerTimestamp(ledgerTimestampInput)}
                                      className="button-action thin narrow"
                                      style={{
                                        width: 'calc(50% - 30px)',
                                        marginRight: '10px',
                                        display: 'inline-block'
                                      }}
                                    >
                                      Update
                                    </button>{' '}
                                    <button
                                      onClick={resetTimeMachine}
                                      className="button-action thin narrow"
                                      style={{
                                        width: 'calc(50% - 30px)',
                                        display: 'inline-block'
                                      }}
                                    >
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
                                      <td>XUMM verified</td>
                                    </tr>
                                  )}
                                  {data.xamanMeta?.xummPro && (
                                    <tr>
                                      <td>XUMM Pro</td>
                                      <td>
                                        {data?.xamanMeta?.xummProfile?.slug ? (
                                          <a href={data.xamanMeta.xummProfile.profileUrl}>
                                            <u className="bold orange">{data.xamanMeta.xummProfile.slug}</u>
                                          </a>
                                        ) : (
                                          <span className="bold orange">
                                            activated <i className="fa fa-heart"></i>
                                          </span>
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
                                  <td colSpan="2">
                                    <div className="flex flex-center">
                                      <button
                                        className="button-action wide center"
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
                                        className="button-action wide center"
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
                                <tr>
                                  <td>Account index</td>
                                  <td>
                                    <table style={{ marginLeft: '-5px' }}>
                                      <tbody>
                                        <tr>
                                          <td>Hex:</td>
                                          <td>
                                            {data.ledgerInfo.accountIndex}{' '}
                                            <CopyButton text={data.ledgerInfo.accountIndex}></CopyButton>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td>Decimal:</td>
                                          <td>
                                            {parseInt(data.ledgerInfo.accountIndex, 16)}{' '}
                                            <CopyButton text={parseInt(data.ledgerInfo.accountIndex, 16)}></CopyButton>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td>{t('table.address')}</td>
                                <td>
                                  {data.address} <CopyButton text={data.address}></CopyButton>
                                </td>
                              </tr>
                              <tr>
                                <td>{t('table.status')}</td>
                                {data?.ledgerInfo?.activated ? (
                                  <td>
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
                                  </td>
                                ) : (
                                  <td>
                                    {/* Also show blackholed status */}
                                    {data?.ledgerInfo?.deleted ? (
                                      <>
                                        <span className="red bold">Account deleted.</span>
                                        <br />
                                        <span className="orange">
                                          This account has been deactivated and is no longer active. It can be restored
                                          by sending at least {amountFormat(networkInfo?.reserveBase)} to the address.
                                        </span>
                                      </>
                                    ) : (
                                      <span className="orange">
                                        Not activated yet. The owner with full access to the account can activate it by
                                        sending at least {amountFormat(networkInfo?.reserveBase)} to the address.
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
                                  </td>
                                )}
                              </tr>
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
                              {/**
                              $ledger = $ledgerInfo['ledger'];
                              $xahauReward['accumulator'] = $ledgerInfo["rewardAccumulator"];
                              $xahauReward['lgrFirst'] = $ledgerInfo["rewardLgrFirst"];
                              $xahauReward['lgrLast'] = $ledgerInfo["rewardLgrLast"];
                              $xahauReward['time'] = $ledgerInfo["rewardTime"];

                              if ($xahauReward['lgrFirst']) {
                              $rewardDelay = 2600000; //seconds // take it from hook instead later
                              $rewardRate = 0.0033333333300000004; // get it from hook later
                              $remainingSec = $rewardDelay - (time() - ($xahauReward['time'] + 946684800));
                              //$claimable = $remainingSec <= 0;
                              $claimableDate = date('Y-m-d H:i:s', (time() + $remainingSec));

                              // calculate reward
                              $elapsed = $ledger - $xahauReward['lgrFirst'];
                              $elapsedSinceLast = $ledger - $xahauReward['lgrLast'];
                              $accumulator = hexdec($xahauReward['accumulator']);
                              if (intval($balance) > 0 && $elapsedSinceLast > 0) {
                                $accumulator += intval($balance) / 1000000 * $elapsedSinceLast;
                              }
                              $reward = $accumulator / $elapsed * $rewardRate;
                              $output .= '<div>Reward: <b>≈ ' . number_format($reward, 6) . ' XAH</b></div>';
                              $output .= '<div>Claimable: <b>' . $claimableDate . '</b></div>';
                            }
                         */}
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

                                {data.ledgerInfo?.ammID && (
                                  <tr>
                                    <td>AMM ID</td>
                                    <td>
                                      <LinkAmm ammId={data.ledgerInfo.ammID} hash={true} icon={true} copy={true} />
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
    </>
  )
}
