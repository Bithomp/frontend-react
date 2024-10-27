import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import { axiosServer } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { nativeCurrenciesImages, nativeCurrency, useWidth } from '../utils'
import { getIsSsrMobile } from '../utils/mobile'
import axios from 'axios'

import {
  lpTokenName,
  shortHash,
  showAmmPercents,
  addressUsernameOrServiceLink,
  shortNiceNumber,
  fullDateAndTime,
  timeFromNow,
  amountFormatNode,
  amountFormat,
  nativeCurrencyToFiat
} from '../utils/format'

export async function getServerSideProps(context) {
  const { locale, req, query } = context

  const { order } = query

  let initialData = null

  let headers = {}
  if (req.headers['x-real-ip']) {
    headers['x-real-ip'] = req.headers['x-real-ip']
  }
  if (req.headers['x-forwarded-for']) {
    headers['x-forwarded-for'] = req.headers['x-forwarded-for']
  }
  let initialErrorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/amms?order=currencyHigh&sortCurrency=XRP',
      headers
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
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'
import CopyButton from '../components/UI/CopyButton'
import { LinkAccount, LinkAmm } from '../utils/links'
import Image from 'next/image'
import FiltersFrame from '../components/Layout/FiltersFrame'
import { fetchCurrentFiatRate } from '../utils/common'
import InfiniteScrolling from '../components/Layout/InfiniteScrolling'

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

const AddressWithIcon = ({ children, address }) => {
  let imageUrl = 'https://cdn.bithomp.com/avatar/' + address
  if (!address) {
    imageUrl = nativeCurrenciesImages[nativeCurrency]
  }
  return (
    <table>
      <tbody>
        <tr className="no-border">
          <td style={{ padding: 0 }}>
            <Image alt="avatar" src={imageUrl} width="35" height="35" style={{ verticalAlign: 'middle' }} />
          </td>
          <td style={{ padding: '0 0 0 5px' }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default function Amms({
  initialData,
  initialErrorMessage,
  orderQuery,
  selectedCurrency,
  sessionToken,
  subscriptionExpired
}) {
  const { t, i18n } = useTranslation()

  const windowWidth = useWidth()

  const [data, setData] = useState(initialData?.amms || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [order, setOrder] = useState(orderQuery)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [fiatRate, setFiatRate] = useState(0)
  const [marker, setMarker] = useState(initialData?.marker)

  const controller = new AbortController()

  useEffect(() => {
    if (initialData?.amms.length > 0) {
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
    fetchCurrentFiatRate(selectedCurrency, setFiatRate)
  }, [selectedCurrency])

  const checkApi = async () => {
    const oldOrder = rawData?.order
    if (!oldOrder || !order) return
    const loadMoreRequest = order ? oldOrder.toString() === order.toString() : !oldOrder

    // do not load more if thereis no session token or if Bithomp Pro is expired
    if (loadMoreRequest && (!sessionToken || (sessionToken && subscriptionExpired))) {
      return
    }

    let markerPart = ''
    if (loadMoreRequest) {
      markerPart = '&marker=' + rawData?.marker
    }

    let apiUrl = 'v2/amms?order=' + order + '&sortCurrency=XRP' + markerPart

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
    if (order && rawData.order !== order) {
      checkApi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

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
      <SEO title={t('menu.amm.pools')} />
      <div className="content-text">
        <h1 className="center">{t('menu.amm.pools')}</h1>
        <FiltersFrame
          order={order}
          setOrder={setOrder}
          orderList={[
            { value: 'currencyHigh', label: 'XRP High to Low' },
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
          onlyCsv={true}
        >
          <></>
          <InfiniteScrolling
            dataLength={data.length}
            loadMore={checkApi}
            hasMore={marker}
            errorMessage={errorMessage}
            subscriptionExpired={subscriptionExpired}
            sessionToken={sessionToken}
          >
            {!windowWidth || windowWidth > 1360 ? (
              <table className="table-large expand">
                <thead>
                  <tr>
                    <th className="center">{t('table.index')}</th>
                    <th>Asset 1</th>
                    <th>Asset 2</th>
                    <th>LP balance</th>
                    <th className="right">AMM ID</th>
                    <th className="right">AMM address</th>
                    <th className="right">Currency code</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th className="right">Trading fee</th>
                    <th className="center">Vote slots</th>
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
                                <td className="center">
                                  {i + 1} <LinkAmm ammId={a.ammID} icon={true} />
                                </td>
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
                                <td className="right">
                                  <LinkAmm ammId={a.ammID} copy={true} icon={true} />
                                </td>
                                <td className="right">
                                  <LinkAccount address={a.account} icon={true} copy={true} short={0} />
                                </td>
                                <td className="right">
                                  {shortHash(a.lpTokenBalance?.currency, 5)}{' '}
                                  <CopyButton text={a.lpTokenBalance?.currency} />
                                </td>
                                <td>{timeFromNow(a.createdAt, i18n)}</td>
                                <td>{timeFromNow(a.updatedAt, i18n)}</td>
                                <td className="right">{showAmmPercents(a.tradingFee)}</td>
                                <td className="center">
                                  <LinkAmm ammId={a.ammID} text={a.voteSlots?.length} />
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
                              <p>
                                AMM ID: <LinkAmm ammId={a.ammID} hash={6} copy={true} />
                              </p>
                              <p>
                                AMM address: <LinkAccount address={a.account} copy={true} short={6} />
                              </p>
                              <p>
                                Currency code: {shortHash(a.lpTokenBalance?.currency)}{' '}
                                <CopyButton text={a.lpTokenBalance?.currency} />
                              </p>
                              <p>
                                Created: {timeFromNow(a.createdAt, i18n)}
                                {', '}
                                {fullDateAndTime(a.createdAt)}
                              </p>
                              <p>
                                Updated: {timeFromNow(a.updatedAt, i18n)}
                                {', '}
                                {fullDateAndTime(a.updatedAt)}
                              </p>
                              <p>
                                Vote slots: <LinkAmm ammId={a.ammID} text={a.voteSlots?.length} />
                              </p>
                              <p>
                                Auction slot: <LinkAmm ammId={a.ammID} icon={true} />
                              </p>
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
      </div>
    </>
  )
}
