import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { axiosServer, getFiatRateServer, passHeaders } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { nativeCurrency, stripText, useWidth, xahauNetwork } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import axios from 'axios'
import Link from 'next/link'

import {
  showAmmPercents,
  addressUsernameOrServiceLink,
  shortNiceNumber,
  fullDateAndTime,
  timeFromNow,
  amountFormatNode,
  amountFormat,
  nativeCurrencyToFiat,
  AddressWithIcon,
  AddressWithIconFilled,
  niceCurrency
} from '../utils/format'
import TokenSelector from '../components/UI/TokenSelector'

export async function getServerSideProps(context) {
  const { locale, req, query } = context

  const { order, currency, currencyIssuer } = query

  let initialData = null
  let initialErrorMessage = null

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
      url: 'v2/amms?order=currencyHigh&limit=100&voteSlots=false&auctionSlot=false&holders=true' + currencyPart,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  return {
    props: {
      initialData: initialData || null,
      orderQuery: order || initialData?.order || 'currencyHigh',
      currencyQuery: currency || initialData?.currency || nativeCurrency,
      currencyIssuerQuery: currencyIssuer || initialData?.currencyIssuer || '',
      initialErrorMessage: initialErrorMessage || '',
      fiatRateServer,
      selectedCurrencyServer,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'
import { LinkAmm } from '../utils/links'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import TokenTabs from '../components/Tabs/TokenTabs'

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
  openEmailLogin
}) {
  const { t, i18n } = useTranslation()

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
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [marker, setMarker] = useState(initialData?.marker)
  const [filtersHide, setFiltersHide] = useState(false)
  const [token, setToken] = useState({
    currency: stripText(currencyQuery),
    issuer: stripText(currencyIssuerQuery)
  })

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
      'v2/amms?order=' + order + '&limit=100&voteSlots=false&auctionSlot=false&holders=true' + markerPart + currencyPart

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
        if (newdata.error) {
          setErrorMessage(newdata.error)
        } else {
          setErrorMessage('Error')
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
    { label: 'LP balance', key: 'lpTokenBalance.value' },
    { label: 'Currency code', key: 'lpTokenBalance.currency' },
    { label: 'AMM address', key: 'account' },
    { label: 'AMM ID', key: 'ammID' },
    { label: 'Created', key: 'createdAtFormated' },
    { label: 'Updated', key: 'updatedAtFormated' },
    { label: 'Trading fee', key: 'tradingFeeFormated' }
  ]

  const AmountWithIcon = ({ amount }) => {
    return (
      <AddressWithIcon address={amount?.issuer}>
        {amountFormatNode(amount, { short: true, maxFractionDigits: 6 })}
        <br />
        {amount?.issuer
          ? addressUsernameOrServiceLink(amount, 'issuer', { short: true })
          : fiatRate > 0 && nativeCurrencyToFiat({ amount, selectedCurrency, fiatRate })}
      </AddressWithIcon>
    )
  }

  const LPToken = ({ a }) => {
    return (
      <AddressWithIconFilled
        data={a.lpTokenBalance}
        name="issuer"
        currency={a.lpTokenBalance.currency}
        options={{
          short: true,
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
        filtersHide={filtersHide}
        setFiltersHide={setFiltersHide}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
      >
        <>
          <TokenSelector
            value={token}
            onChange={setToken}
            allOrOne={order !== 'currencyHigh'}
            currencyQueryName="currency"
          />
        </>
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
            <table className="table-large expand">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>LP Token</th>
                  <th>Asset 1</th>
                  <th>Asset 2</th>
                  <th className="right">Holders</th>
                  <th className="right">LP balance</th>
                  <th>Created</th>
                  <th>{t('table.updated')}</th>
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
                            <tr key={i}>
                              <td className="center">{i + 1}</td>
                              <td>
                                <LPToken a={a} />
                              </td>
                              <td>
                                <AmountWithIcon amount={a.amount} />
                              </td>
                              <td>
                                <AmountWithIcon amount={a.amount2} />
                              </td>
                              <td className="right">
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
                              <td suppressHydrationWarning className="right">
                                {shortNiceNumber(a.lpTokenBalance?.value)}
                              </td>
                              <td>{timeFromNow(a.createdAt, i18n)}</td>
                              <td>{timeFromNow(a.updatedAt, i18n)}</td>
                              <td className="right">{showAmmPercents(a.tradingFee)}</td>
                              <td className="center">
                                <Link
                                  href={
                                    '/services/amm/deposit?currency=' +
                                    (a.amount?.currency || nativeCurrency) +
                                    (a.amount?.issuer ? '&currencyIssuer=' + a.amount?.issuer : '') +
                                    '&currency2=' +
                                    (a.amount2?.currency || nativeCurrency) +
                                    (a.amount2?.issuer ? '&currency2Issuer=' + a.amount2?.issuer : '')
                                  }
                                >
                                  Deposit
                                </Link>
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
                                  '/distribution?currency=' + a.lpTokenBalance.currency + '&currencyIssuer=' + a.account
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
                                    <AmountWithIcon amount={a.amount} />
                                  </td>
                                  <td style={{ paddingLeft: 10 }}>
                                    <AmountWithIcon amount={a.amount2} />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <p suppressHydrationWarning>LP balance: {shortNiceNumber(a.lpTokenBalance?.value)}</p>
                            <p>Trading fee: {showAmmPercents(a.tradingFee)}</p>
                            <p>Created: {timeFromNow(a.createdAt, i18n)}</p>
                            <p>Updated: {timeFromNow(a.updatedAt, i18n)}</p>
                            <Link
                              href={
                                '/services/amm/deposit?currency=' +
                                (a.amount?.currency || nativeCurrency) +
                                (a.amount?.issuer ? '&currencyIssuer=' + a.amount?.issuer : '') +
                                '&currency2=' +
                                (a.amount2?.currency || nativeCurrency) +
                                (a.amount2?.issuer ? '&currency2Issuer=' + a.amount2?.issuer : '')
                              }
                              className="button-action thin narrow"
                            >
                              Deposit
                            </Link>
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
      </FiltersFrame>
    </>
  )
}
