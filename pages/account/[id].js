import { useTranslation } from 'next-i18next'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import { isValidXAddress } from 'ripple-address-codec'

import { devNet, xahauNetwork, avatarSrc, nativeCurrency, errorT, isValidPayString } from '../../utils'
import { shortNiceNumber } from '../../utils/format'
import { getIsSsrMobile } from '../../utils/mobile'

const RelatedLinks = dynamic(() => import('../../components/Account/RelatedLinks'), { ssr: false })

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const setBalancesFunction = (networkInfo, data) => {
  if (!data?.ledgerInfo || !networkInfo || data.ledgerInfo.balance === undefined) return null
  let balanceList = {
    total: {
      native: data.ledgerInfo.balance || 0
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

  return balanceList
}

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  let networkInfo = {}
  let initialErrorMessage = null
  const { id, ledgerTimestamp } = query
  //keep it from query instead of params, anyway it is an array sometimes
  const account = id ? (Array.isArray(id) ? id[0] : id) : ''

  // Check if input is an xAddress or payString
  const isPayString = isValidPayString(account)
  const isXAddress = isValidXAddress(account)
  if (!isXAddress && !isPayString && account) {
    try {
      const res = await axiosServer({
        method: 'get',
        url:
          'v2/address/' +
          account +
          '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true&obligations=true' +
          (ledgerTimestamp ? '&ledgerTimestamp=' + new Date(ledgerTimestamp).toISOString() : ''),
        headers: passHeaders(req)
      })
      initialData = res?.data

      if (initialData?.error) {
        initialErrorMessage = initialData.error
        initialData = null
      } else {
        const networkData = await axiosServer({
          method: 'get',
          url: 'v2/server',
          headers: passHeaders(req)
        })
        networkInfo = networkData?.data
      }
    } catch (e) {
      initialErrorMessage = e?.message || 'Failed to load transactions'
    }
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  const balanceList = setBalancesFunction(networkInfo, initialData)

  return {
    props: {
      id: account,
      fiatRateServer,
      selectedCurrencyServer,
      ledgerTimestampQuery: Date.parse(ledgerTimestamp) || '',
      networkInfo,
      balanceListServer: balanceList || {},
      isSsrMobile: getIsSsrMobile(context),
      initialData: initialData || {},
      initialErrorMessage: initialErrorMessage || null,
      xAddressInput: isXAddress || isPayString,
      ...(await serverSideTranslations(locale, ['common', 'account']))
    }
  }
}

import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'
import Did from '../../components/Account/Did'
import { fetchHistoricalRate } from '../../utils/common'
import AccountSummary from '../../components/Account/AccountSummary'
import LedgerData from '../../components/Account/LedgerData'
import PublicData from '../../components/Account/PublicData'
import Airdrops from '../../components/Account/Airdrops'
import XamanData from '../../components/Account/XamanData'
import ObjectsData from '../../components/Account/ObjectsData'
import NFTokenData from '../../components/Account/NFTokenData'
import URITokenData from '../../components/Account/URITokenData'
import IOUData from '../../components/Account/IOUData'
import IssuedTokensData from '../../components/Account/IssuedTokensData'
import EscrowData from '../../components/Account/EscrowData'
import DexOrdersData from '../../components/Account/DexOrdersData'
import RecentTransactions from '../../components/Account/RecentTransactions'
import MPTData from '../../components/Account/MPTData'
import XAddressDetails from '../../components/Account/XAddressDetails'

export default function Account({
  initialData,
  initialErrorMessage,
  refreshPage,
  id,
  selectedCurrency: selectedCurrencyApp,
  ledgerTimestampQuery,
  account,
  setSignRequest,
  fiatRate: fiatRateApp,
  fiatRateServer,
  selectedCurrencyServer,
  networkInfo,
  balanceListServer,
  xAddressInput
}) {
  const { t } = useTranslation()
  const isFirstRender = useRef(true)

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  /*
  obligations: {
    "trustlines": 44799,
    "holders": 12131,
    "tokens": 7
  }
  */

  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage)
  const [ledgerTimestamp, setLedgerTimestamp] = useState(ledgerTimestampQuery)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(ledgerTimestampQuery)
  const [pageFiatRate, setPageFiatRate] = useState(!ledgerTimestampQuery ? fiatRate : 0)
  const [userData, setUserData] = useState({
    username: initialData?.username,
    service: initialData?.service?.name,
    address: initialData?.address || id
  })
  const [balances, setBalances] = useState(balanceListServer || {})
  const [shownOnSmall, setShownOnSmall] = useState(null)
  const [objects, setObjects] = useState({})
  const [gateway, setGateway] = useState(false)

  useEffect(() => {
    if (!initialData?.address) return
    setUserData({
      username: initialData.username,
      service: initialData.service?.name,
      address: initialData.address
    })

    if (initialData?.obligations) {
      if (initialData.obligations?.trustlines > 200) {
        setGateway(true)
      } else {
        //keep it here for cases when address changes without refreshing the page
        setGateway(false)
      }
    } else {
      //keep it here for cases when address changes without refreshing the page
      setGateway(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

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
        '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true&obligations=true' +
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
    if (!selectedCurrency || !id) return
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setObjects({})
    setErrorMessage(initialErrorMessage)
    checkApi({ noCache: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshPage, ledgerTimestamp, selectedCurrency])

  useEffect(() => {
    if (!selectedCurrency) return
    if (!ledgerTimestamp) {
      setPageFiatRate(fiatRate)
    } else {
      //if there is ledgerTimestamp then we need a historical rate
      fetchHistoricalRate({ timestamp: ledgerTimestamp, selectedCurrency, setPageFiatRate })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiatRate, ledgerTimestamp, selectedCurrency])

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

  // If we have xAddressInput with a destination tag, render XAddressDetails
  if (xAddressInput) {
    return <XAddressDetails xAddressInput={id} />
  }

  return (
    <>
      <SEO
        page="Account"
        title={
          t('explorer.header.account') +
          ' ' +
          (initialData?.service?.name || initialData?.username || initialData?.address || id) +
          (data?.ledgerInfo?.balance > 1000000
            ? ' - ' + shortNiceNumber(data.ledgerInfo.balance / 1000000, 2, 0) + ' ' + nativeCurrency
            : '')
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
                  <div className="center orange bold">{errorT(t, errorMessage)}</div>
                ) : (
                  <>
                    {data?.address && (
                      <>
                        {!ledgerTimestamp && (
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
                        )}

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
                                      <div className="flex-container flex-center">
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
                                  <div className="flex-container flex-center">
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
                          {!ledgerTimestamp && (
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
                          )}

                          <LedgerData
                            data={data}
                            account={account}
                            balances={balances}
                            selectedCurrency={selectedCurrency}
                            pageFiatRate={pageFiatRate}
                            networkInfo={networkInfo}
                            setSignRequest={setSignRequest}
                            fiatRate={fiatRate}
                            objects={objects}
                            gateway={gateway}
                          />
                          <PublicData data={data} />
                          {data?.ledgerInfo?.activated && (
                            <IOUData
                              rippleStateList={objects?.rippleStateList}
                              ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                              address={data?.address}
                              pageFiatRate={pageFiatRate}
                              selectedCurrency={selectedCurrency}
                              account={account}
                              setSignRequest={setSignRequest}
                            />
                          )}
                          {/* don't show yet obligations historically */}
                          {data?.obligations?.trustlines > 0 && !data?.ledgerInfo?.ledgerTimestamp && (
                            <IssuedTokensData
                              data={data}
                              selectedCurrency={selectedCurrency}
                              pageFiatRate={pageFiatRate}
                            />
                          )}

                          <MPTData
                            ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                            mptIssuanceList={objects?.mptIssuanceList}
                            mptList={objects?.mptList}
                          />

                          <DexOrdersData
                            account={account}
                            ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                            offerList={objects?.offerList}
                            setSignRequest={setSignRequest}
                            address={data?.address}
                          />

                          {xahauNetwork ? (
                            <URITokenData data={data} uriTokenList={objects?.uriTokenList} />
                          ) : (
                            <NFTokenData
                              data={data}
                              address={data?.address}
                              objects={objects}
                              ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                              selectedCurrency={selectedCurrency}
                            />
                          )}

                          <EscrowData
                            setSignRequest={setSignRequest}
                            address={data?.address}
                            ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                            escrowList={objects?.escrowList}
                          />

                          <RecentTransactions userData={userData} ledgerTimestamp={ledgerTimestamp} />
                          {data?.ledgerInfo?.activated && !gateway && (
                            <ObjectsData
                              account={account}
                              setSignRequest={setSignRequest}
                              address={data?.address}
                              setObjects={setObjects}
                              ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                              ledgerIndex={data?.ledgerInfo?.ledgerIndex}
                              selectedCurrency={selectedCurrency}
                              pageFiatRate={pageFiatRate}
                            />
                          )}
                          <XamanData data={data} />
                          <Did
                            data={data}
                            account={account}
                            setSignRequest={setSignRequest}
                            ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                          />
                          <Airdrops data={data} />
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

        @media (min-width: 800px) {
          .button-wide {
            width: 100%;
          }
        }
        @media (max-width: 800px) {
          .button-wide {
            width: calc(50% - 27px);
          }
          .flex-container {
            gap: 10px 10px;
          }
        }
      `}</style>
    </>
  )
}
