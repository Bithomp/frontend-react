import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { axiosServer, passHeaders } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import {
  addAndRemoveQueryParams,
  addQueryParams,
  nativeCurrency,
  removeQueryParams,
  useWidth,
  xahauNetwork
} from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import axios from 'axios'
import { useRouter } from 'next/router'

import {
  lpTokenName,
  showAmmPercents,
  addressUsernameOrServiceLink,
  shortNiceNumber,
  fullDateAndTime,
  timeFromNow,
  amountFormatNode,
  amountFormat,
  nativeCurrencyToFiat,
  AddressWithIcon,
  niceCurrency
} from '../utils/format'

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
      url: 'v2/amms?order=currencyHigh&limit=50&voteSlots=false&auctionSlot=false' + currencyPart,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      initialData: initialData || null,
      orderQuery: order || initialData?.order || 'currencyHigh',
      currencyQuery: currency || initialData?.currency || nativeCurrency,
      currencyIssuerQuery: currencyIssuer || initialData?.currencyIssuer || '',
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'
import { LinkAmm } from '../utils/links'
import FiltersFrame from '../components/Layout/FiltersFrame'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'
import FormInput from '../components/UI/FormInput'

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

const currenciesList = [
  { currency: '', label: 'All' },
  { currency: nativeCurrency, label: nativeCurrency },
  {
    currency: '524C555344000000000000000000000000000000',
    currencyIssuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
    label: 'RLUSD'
  }
  /*
  {
    currency: 'USD',
    currencyIssuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
    label: 'USD Gatehub'
  },
  {
    currency: 'USD',
    currencyIssuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
    label: 'USD Bitstamp'
  },
  {
    currency: 'EUR',
    currencyIssuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
    label: 'EUR Gatehub'
  }
  */
]

export default function Amms({
  initialData,
  initialErrorMessage,
  orderQuery,
  selectedCurrency,
  sessionToken,
  subscriptionExpired,
  fiatRate,
  currencyQuery,
  currencyIssuerQuery
}) {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const windowWidth = useWidth()

  const [data, setData] = useState(initialData?.amms || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [order, setOrder] = useState(orderQuery)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [marker, setMarker] = useState(initialData?.marker)
  const [currency, setCurrency] = useState(currencyQuery || nativeCurrency)
  const [currencyIssuer, setCurrencyIssuer] = useState(currencyIssuerQuery || '')
  const [filtersHide, setFiltersHide] = useState(false)

  const controller = new AbortController()

  useEffect(() => {
    if (currency && order === 'currencyHigh') {
      if (currency === nativeCurrency) {
        addAndRemoveQueryParams(router, [{ name: 'currency', value: nativeCurrency }], ['currencyIssuer'])
      } else if (currencyIssuer) {
        addQueryParams(router, [
          { name: 'currency', value: currency },
          { name: 'currencyIssuer', value: currencyIssuer }
        ])
      } else {
        removeQueryParams(router, ['currencyIssuer', 'currency'])
      }
    } else {
      removeQueryParams(router, ['currencyIssuer', 'currency'])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, currencyIssuer, order])

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
      (currency ? oldCurrency === currency : !oldCurrency) &&
      (currencyIssuer ? oldCurrencyIssuer === currencyIssuer : !oldCurrencyIssuer)

    // do not load more if thereis no session token or if Bithomp Pro is expired
    if (loadMoreRequest && (!sessionToken || (sessionToken && subscriptionExpired))) {
      return
    }

    let markerPart = ''
    if (loadMoreRequest) {
      markerPart = '&marker=' + rawData?.marker
    }

    let currencyPart = ''
    if (currency) {
      currencyPart = '&currency=' + currency
      if (currencyIssuer) {
        currencyPart += '&currencyIssuer=' + currencyIssuer
      }
    } else {
      //default
      currencyPart = '&sortCurrency=' + nativeCurrency
    }

    let apiUrl = 'v2/amms?order=' + order + '&limit=50&voteSlots=false&auctionSlot=false' + markerPart + currencyPart

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
          console.log(newdata)
        }
      }
    }
  }

  useEffect(() => {
    if (
      order &&
      (rawData.order !== order || rawData.currency !== currency || rawData.currencyIssuer !== currencyIssuer)
    ) {
      checkApi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, currency, currencyIssuer])

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

  return (
    <>
      <SEO
        title={t('menu.amm.pools')}
        images={
          xahauNetwork
            ? []
            : [
                {
                  width: 1200,
                  height: 630,
                  file: 'previews/1200x630/amms.png'
                },
                {
                  width: 630,
                  height: 630,
                  file: 'previews/630x630/amms.png'
                }
              ]
        }
      />
      <h1 className="center">{t('menu.amm.pools')}</h1>
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
      >
        <>
          <div>
            {t('table.currency')}
            <div className={`radio-options${currenciesList.length > 3 ? ' radio-options--large' : ''}`}>
              {currenciesList.map((cur, i) => (
                <div className="radio-input" key={i}>
                  <input
                    type="radio"
                    name="selectCurrency"
                    checked={
                      cur.currency === currency && (!cur.currencyIssuer || cur.currencyIssuer === currencyIssuer)
                    }
                    onChange={() => {
                      setCurrency(cur.currency)
                      setCurrencyIssuer(cur.currencyIssuer)
                    }}
                    id={'selectCurrency' + i}
                  />
                  <label htmlFor={'selectCurrency' + i}>{cur.label}</label>
                </div>
              ))}
            </div>
          </div>
          {!currenciesList.some(
            (item) => item.currency === currency && (!item.currencyIssuer || item.currencyIssuer === currencyIssuer)
          ) && (
            <>
              <FormInput
                title={t('table.currency') + ' ' + niceCurrency(currency)}
                defaultValue={currency}
                disabled={true}
                hideButton={true}
              />
              <FormInput title={t('table.issuer')} defaultValue={currencyIssuer} disabled={true} hideButton={true} />
            </>
          )}
        </>
        <InfiniteScrolling
          dataLength={data.length}
          loadMore={checkApi}
          hasMore={marker}
          errorMessage={errorMessage}
          subscriptionExpired={subscriptionExpired}
          sessionToken={sessionToken}
        >
          {!windowWidth || windowWidth > 860 ? (
            <table className="table-large">
              <thead>
                <tr>
                  <th className="center">{t('table.index')}</th>
                  <th>Asset 1</th>
                  <th>Asset 2</th>
                  <th>LP balance</th>
                  <th>Created</th>
                  <th>{t('table.updated')}</th>
                  <th className="right">Trading fee</th>
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
                            <tr key={i} onClick={() => router.push('/amm/' + a.ammID)} style={{ cursor: 'pointer' }}>
                              <td className="center">{i + 1}</td>
                              <td>
                                <AmountWithIcon amount={a.amount} />
                              </td>
                              <td>
                                <AmountWithIcon amount={a.amount2} />
                              </td>
                              <td suppressHydrationWarning>
                                {shortNiceNumber(a.lpTokenBalance?.value)}
                                <br />
                                {lpTokenName(a)}
                              </td>
                              <td>{timeFromNow(a.createdAt, i18n)}</td>
                              <td>{timeFromNow(a.updatedAt, i18n)}</td>
                              <td className="right">{showAmmPercents(a.tradingFee)}</td>
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
                            <p>
                              AMM ID: <LinkAmm ammId={a.ammID} hash={12} />
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
                            <p suppressHydrationWarning>
                              LP balance: {shortNiceNumber(a.lpTokenBalance?.value)} {lpTokenName(a)}
                            </p>
                            <p>Trading fee: {showAmmPercents(a.tradingFee)}</p>
                            <p>Created: {timeFromNow(a.createdAt, i18n)}</p>
                            <p>Updated: {timeFromNow(a.updatedAt, i18n)}</p>
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
