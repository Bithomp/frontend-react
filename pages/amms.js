import { useTranslation } from 'next-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'
import { axiosServer, getFiatRateServer, passHeaders } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { nativeCurrency, stripText, useWidth, xahauNetwork } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import axios from 'axios'
import Link from 'next/link'

import {
  showAmmPercents,
  shortNiceNumber,
  fullDateAndTime,
  timeFromNow,
  amountFormatNode,
  amountFormat,
  tokenToFiat,
  AddressWithIcon,
  niceCurrency,
  CurrencyWithIcon
} from '../utils/format'
import TokenSelector from '../components/UI/TokenSelector'
import AmmPoolsChart from '../components/Amm/AmmPoolsChart'

const ammTokenChartUrl = (token) => {
  const currency = stripText(token?.currency)
  const issuer = stripText(token?.issuer)

  if (!currency) return ''
  if (issuer) return `v2/amms/token/${encodeURIComponent(issuer)}/${encodeURIComponent(currency)}/chart`

  return `v2/amms/token/${encodeURIComponent(currency)}/chart`
}

export async function getServerSideProps(context) {
  const { locale, req, query } = context

  const { order, currency, currencyIssuer } = query

  let initialData = null
  let initialErrorMessage = null
  let initialChartData = null
  const initialChartUrl = ammTokenChartUrl({
    currency: currency || nativeCurrency,
    issuer: currencyIssuer || ''
  })

  let currencyPart = ''
  if (currency) {
    currencyPart = '&currency=' + currency
    if (currencyIssuer) {
      currencyPart += '&currencyIssuer=' + currencyIssuer
    }
  } else {
    //default
    currencyPart = '&currency=' + nativeCurrency
  }

  try {
    const res = await axiosServer({
      method: 'get',
      url:
        'v2/amms?order=currencyHigh&limit=100&voteSlots=false&auctionSlot=false&holders=true&priceNativeCurrencySpot=true' +
        currencyPart,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  try {
    const chartRes = await axiosServer({
      method: 'get',
      url: initialChartUrl,
      headers: passHeaders(req)
    }).catch(() => {})
    initialChartData = chartRes?.data?.chart || null
  } catch (error) {
    console.error(error)
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  return {
    props: {
      initialData: initialData || null,
      initialChartData: initialChartData || [],
      initialChartUrl,
      orderQuery: order || initialData?.order || 'currencyHigh',
      currencyQuery: currency || initialData?.currency || nativeCurrency,
      currencyIssuerQuery: currencyIssuer || initialData?.currencyIssuer || '',
      initialErrorMessage: initialErrorMessage || '',
      fiatRateServer,
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'amm', 'services']))
    }
  }
}

import { useRouter } from 'next/router'
import SEO from '../components/SEO'
import { LinkAmm } from '../utils/links'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import TokenTabs from '../components/Tabs/TokenTabs'
import styles from '../styles/pages/amms.module.scss'

const AmountWithIcon = ({ amount, fiatRate, selectedCurrency }) => {
  const hasIssuer = !!amount?.issuer
  return (
    <AddressWithIcon address={amount?.issuer}>
      {hasIssuer ? (
        <>
          <span suppressHydrationWarning>{shortNiceNumber(amount.value, 6, 2)}</span>{' '}
          <span>{niceCurrency(amount.currency)}</span>
        </>
      ) : (
        amountFormatNode(amount, { short: true, maxFractionDigits: 6 })
      )}
      <br />
      {fiatRate > 0 && tokenToFiat({ amount, selectedCurrency, fiatRate })}
    </AddressWithIcon>
  )
}

const LPToken = ({ a }) => {
  return (
    <CurrencyWithIcon
      options={{ disableTokenLink: true }}
      token={{
        ...a.lpTokenBalance,
        currencyDetails: {
          type: 'lp_token',
          ammID: a.ammID,
          asset: a.amount,
          asset2: a.amount2,
          currency:
            niceCurrency(a.amount?.currency || nativeCurrency) +
            '/' +
            niceCurrency(a.amount2?.currency || nativeCurrency)
        }
      }}
    />
  )
}

const isNativeAmmAsset = (amount) => !amount?.issuer && !amount?.mpt_issuance_id

const assetTxIssue = (amount) => {
  if (amount?.mpt_issuance_id) return { mpt_issuance_id: amount.mpt_issuance_id }
  if (isNativeAmmAsset(amount)) return { currency: nativeCurrency }

  return {
    currency: amount.currency,
    issuer: amount.issuer
  }
}

// add to the list new parameters for CSV
const updateListForCsv = (list) => {
  return list.map((a) => {
    return {
      ...a,
      amountFormated: amountFormat(a.amount),
      amount2Formated: amountFormat(a.amount2),
      createdAtFormated: fullDateAndTime(a.createdAt, null, { asText: true }),
      updatedAtFormated: fullDateAndTime(a.updatedAt, null, { asText: true }),
      tradingFeeFormated: showAmmPercents(a.tradingFee)
    }
  })
}

export default function Amms({
  initialData,
  initialChartData,
  initialChartUrl,
  initialErrorMessage,
  orderQuery,
  selectedCurrency: selectedCurrencyApp,
  sessionToken,
  subscriptionExpired,
  fiatRate: fiatRateApp,
  currencyQuery,
  currencyIssuerQuery,
  fiatRateServer,
  selectedCurrencyServer,
  setSelectedCurrency,
  openEmailLogin,
  signOutPro,
  setSignRequest
}) {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  const windowWidth = useWidth()

  const [data, setData] = useState(initialData?.amms || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [order, setOrder] = useState(orderQuery)
  const [loading, setLoading] = useState(false)
  const [chartRows, setChartRows] = useState(initialChartData || [])
  const loadedChartUrlRef = useRef(initialChartData?.length ? initialChartUrl : '')
  const [errorMessage, setErrorMessage] = useState(
    t(`error.${initialErrorMessage}`, { defaultValue: initialErrorMessage }) || ''
  )
  const [marker, setMarker] = useState(initialData?.marker)
  const [token, setToken] = useState({
    currency: stripText(currencyQuery),
    issuer: stripText(currencyIssuerQuery)
  })
  const tokenCurrency = token?.currency
  const tokenIssuer = token?.issuer
  const chartUrl = useMemo(
    () => ammTokenChartUrl({ currency: tokenCurrency, issuer: tokenIssuer }),
    [tokenCurrency, tokenIssuer]
  )

  const controller = new AbortController()

  useEffect(() => {
    if (initialData?.amms?.length > 0) {
      setData(updateListForCsv(initialData.amms))
    }
  }, [initialData])

  useEffect(() => {
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!chartUrl) {
      setChartRows([])
      loadedChartUrlRef.current = ''
      return
    }

    if (loadedChartUrlRef.current === chartUrl) return

    const chartController = new AbortController()

    axios
      .get(chartUrl, {
        signal: chartController.signal
      })
      .then((response) => {
        if (Array.isArray(response?.data?.chart)) {
          setChartRows(response.data.chart)
          loadedChartUrlRef.current = chartUrl
        }
      })
      .catch((error) => {
        if (error?.message !== 'canceled') {
          setChartRows([])
          loadedChartUrlRef.current = ''
        }
      })

    return () => chartController.abort()
  }, [chartUrl])

  const checkApi = async () => {
    const oldOrder = rawData?.order
    const oldCurrency = rawData?.currency
    const oldCurrencyIssuer = rawData?.currencyIssuer
    if (!oldOrder || !order) return
    let loadMoreRequest =
      (order ? oldOrder.toString() === order.toString() : !oldOrder) &&
      (token?.currency ? oldCurrency === token.currency : !oldCurrency) &&
      (token?.issuer ? oldCurrencyIssuer === token.issuer : !oldCurrencyIssuer)

    // do not load more if thereis no session token or if Bithomp Pro is expired
    if (loadMoreRequest && (!sessionToken || (sessionToken && subscriptionExpired))) {
      return
    }

    let markerPart = ''
    if (loadMoreRequest) {
      if (!rawData?.marker) return
      markerPart = '&marker=' + rawData?.marker
    }

    let currencyPart = ''
    if (token?.currency) {
      currencyPart = '&currency=' + token.currency
      if (token.issuer) {
        currencyPart += '&currencyIssuer=' + token.issuer
      }
    } else {
      //default
      currencyPart = '&sortCurrency=' + nativeCurrency
    }

    let apiUrl =
      'v2/amms?order=' +
      order +
      '&limit=100&voteSlots=false&auctionSlot=false&holders=true&priceNativeCurrencySpot=true' +
      markerPart +
      currencyPart

    if (!markerPart) {
      setLoading(true)
    }
    setRawData({})

    const response = await axios
      .get(apiUrl, {
        signal: controller.signal
      })
      .catch((error) => {
        if (error && error.message !== 'canceled') {
          setErrorMessage(t('error.' + error.message))
          setLoading(false) //keep here for fast tab clickers
        }
      })
    const newdata = response?.data

    if (newdata) {
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.amms) {
        let list = newdata.amms
        if (list.length > 0) {
          setErrorMessage('')
          setMarker(newdata.marker)
          const newList = updateListForCsv(list)
          if (!loadMoreRequest) {
            setData(newList)
          } else {
            setData([...data, ...newList])
          }
        } else {
          setErrorMessage(t('general.no-data'))
        }
      } else {
        if (newdata.error === 'This endpoint/query is available only within bithomp pro subscription') {
          // user logged out...
          signOutPro()
        } else {
          setErrorMessage(t('error-api.' + newdata.error))
        }
      }
    }
  }

  useEffect(() => {
    if (
      order &&
      (rawData.order !== order || rawData.currency !== token?.currency || rawData.currencyIssuer !== token?.issuer)
    ) {
      checkApi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, token, subscriptionExpired])

  const csvHeaders = [
    { label: 'Asset 1', key: 'amountFormated' },
    { label: 'Asset 1, issuer', key: 'amount.issuer' },
    { label: 'Asset 2', key: 'amount2Formated' },
    { label: 'Asset 2, issuer', key: 'amount2.issuer' },
    { label: 'Currency code', key: 'lpTokenBalance.currency' },
    { label: 'AMM address', key: 'account' },
    { label: 'AMM ID', key: 'ammID' },
    { label: 'Created', key: 'createdAtFormated' },
    { label: 'Updated', key: 'updatedAtFormated' }
  ]

  const openAmmDeposit = (amm) => {
    if (!setSignRequest || !amm?.amount || !amm?.amount2) return

    const signData = {
      asset1: amm.amount,
      asset2: amm.amount2,
      tradingFee: amm.tradingFee,
      lpToken: amm?.lpTokenBalance?.currency
        ? {
            currency: amm.lpTokenBalance.currency,
            issuer: amm.lpTokenBalance.issuer || amm.account,
            value: amm.lpTokenBalance.value
          }
        : null
    }

    setSignRequest({
      action: 'ammDeposit',
      request: {
        TransactionType: 'AMMDeposit',
        Asset: assetTxIssue(signData.asset1),
        Asset2: assetTxIssue(signData.asset2)
      },
      data: signData
    })
  }

  return (
    <>
      <SEO
        title={t('menu.amm.pools')}
        image={
          xahauNetwork
            ? null
            : {
                width: 1200,
                height: 630,
                file: 'previews/1200x630/amms.png'
              }
        }
        twitterImage={xahauNetwork ? null : { file: 'previews/630x630/amms.png' }}
      />
      <h1 className="center">{t('menu.amm.pools')}</h1>
      {!xahauNetwork && <TokenTabs tab="amms" />}
      <FiltersFrame
        order={order}
        setOrder={setOrder}
        orderList={[
          { value: 'currencyHigh', label: 'Currency: High to Low' },
          { value: 'createdOld', label: 'Creation: Earliest' },
          { value: 'createdNew', label: 'Creation: Latest' },
          { value: 'updatedNew', label: 'Updated: Recent' },
          { value: 'updatedOld', label: 'Updated: Old' },
          { value: 'tradingFeeLow', label: 'Trading fee: Low to High' },
          { value: 'tradingFeeHigh', label: 'Trading fee: High to Low' }
        ]}
        count={data?.length}
        hasMore={marker}
        data={data || []}
        csvHeaders={csvHeaders}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        withoutLeftFilters
        showCsvInNav
        navExtra={
          <TokenSelector
            value={token}
            onChange={setToken}
            allOrOne={order !== 'currencyHigh'}
            currencyQueryName="currency"
          />
        }
      >
        <div className={styles.page}>
          <AmmPoolsChart rows={chartRows} />
          <InfiniteScrolling
            dataLength={data.length}
            loadMore={checkApi}
            hasMore={marker}
            errorMessage={errorMessage}
            subscriptionExpired={subscriptionExpired}
            sessionToken={sessionToken}
            openEmailLogin={openEmailLogin}
          >
            {!windowWidth || windowWidth > 860 ? (
              <table className="table-large expand clickable">
                <thead>
                  <tr>
                    <th className="center">{t('table.index')}</th>
                    <th>LP Token</th>
                    <th>Asset 1</th>
                    <th>Asset 2</th>
                    <th className="right">Holders</th>
                    <th className="right">Created</th>
                    <th className="right">Trading fee</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="center">
                      <td colSpan="100">
                        <br />
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                        <br />
                        <br />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {!errorMessage && data ? (
                        <>
                          {data.length > 0 &&
                            data.map((a, i) => (
                              <tr key={i} onClick={() => router.push('/amm/' + a.ammID)}>
                                <td className="center">{i + 1}</td>
                                <td>
                                  <LPToken a={a} />
                                </td>
                                <td>
                                  <AmountWithIcon
                                    amount={a.amount}
                                    fiatRate={fiatRate}
                                    selectedCurrency={selectedCurrency}
                                  />
                                </td>
                                <td>
                                  <AmountWithIcon
                                    amount={a.amount2}
                                    fiatRate={fiatRate}
                                    selectedCurrency={selectedCurrency}
                                  />
                                </td>
                                <td className="right" onClick={(e) => e.stopPropagation()}>
                                  <Link
                                    href={
                                      '/distribution?currency=' +
                                      a.lpTokenBalance.currency +
                                      '&currencyIssuer=' +
                                      a.account
                                    }
                                  >
                                    {a.holders}
                                  </Link>
                                </td>
                                <td className="right">{timeFromNow(a.createdAt, i18n)}</td>
                                <td className="right">{showAmmPercents(a.tradingFee)}</td>
                                <td className="center" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="button-action thin narrow"
                                    disabled={!setSignRequest}
                                    onClick={() => openAmmDeposit(a)}
                                  >
                                    {t('menu.amm.deposit')}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </>
                      ) : (
                        <tr>
                          <td colSpan="100" className="center orange bold">
                            {errorMessage}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="table-mobile">
                <thead></thead>
                <tbody>
                  {loading ? (
                    <tr className="center">
                      <td colSpan="100">
                        <br />
                        <span className="waiting"></span>
                        <br />
                        {t('general.loading')}
                        <br />
                        <br />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {!errorMessage ? (
                        data?.map((a, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px' }} className="center">
                              <b>{i + 1}</b>
                            </td>
                            <td>
                              <br />
                              <LPToken a={a} />
                              <p>
                                AMM ID: <LinkAmm ammId={a.ammID} hash={12} />
                              </p>
                              <p>
                                Holders:{' '}
                                <Link
                                  href={
                                    '/distribution?currency=' +
                                    a.lpTokenBalance.currency +
                                    '&currencyIssuer=' +
                                    a.account
                                  }
                                >
                                  {a.holders}
                                </Link>
                              </p>
                              Assets:
                              <div style={{ height: 10 }} />
                              <table>
                                <thead></thead>
                                <tbody>
                                  <tr className="no-border">
                                    <td>
                                      <AmountWithIcon
                                        amount={a.amount}
                                        fiatRate={fiatRate}
                                        selectedCurrency={selectedCurrency}
                                      />
                                    </td>
                                    <td style={{ paddingLeft: 10 }}>
                                      <AmountWithIcon
                                        amount={a.amount2}
                                        fiatRate={fiatRate}
                                        selectedCurrency={selectedCurrency}
                                      />
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              <p>Trading fee: {showAmmPercents(a.tradingFee)}</p>
                              <p>Created: {timeFromNow(a.createdAt, i18n)}</p>
                              <button
                                type="button"
                                className="button-action thin narrow"
                                disabled={!setSignRequest}
                                onClick={() => openAmmDeposit(a)}
                              >
                                {t('menu.amm.deposit')}
                              </button>{' '}
                              <button
                                className="button-action thin narrow"
                                onClick={() => router.push('/amm/' + a.ammID)}
                              >
                                AMM Page
                              </button>
                              <br />
                              <br />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="100" className="center orange bold">
                            {errorMessage}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            )}
          </InfiniteScrolling>
        </div>
      </FiltersFrame>
    </>
  )
}
