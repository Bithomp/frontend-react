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
      orderQuery: order || 'currencyHigh',
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

// add to the list new parameters for CSV
const updateListForCsv = (list) => {
  return list.map((a, i) => {
    return {
      ...a,
      index: i + 1,
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
        <tr>
          <td style={{ padding: 0 }}>
            <Image alt="avatar" src={imageUrl} width="35" height="35" style={{ verticalAlign: 'middle' }} />
          </td>
          <td style={{ padding: '0 0 0 5px' }}>{children}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default function Amms({ initialData, initialErrorMessage, orderQuery, selectedCurrency }) {
  const { t, i18n } = useTranslation()

  const windowWidth = useWidth()

  const [data, setData] = useState(initialData?.amms || [])
  const [rawData, setRawData] = useState(initialData || {})
  const [order, setOrder] = useState(orderQuery)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [fiatRate, setFiatRate] = useState(0)

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
    let apiUrl = 'v2/amms?order=' + order + '&sortCurrency=XRP'

    setLoading(true)
    setRawData({})
    setData([])

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
          setData(updateListForCsv(list))
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
    if (rawData?.order !== order) {
      checkApi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  const csvHeaders = [
    { label: 'Index', key: 'index' },
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
            { value: 'updatedOld', label: 'Updated: Old' }
          ]}
          count={data?.length}
          hasMore={false}
          data={data || []}
          csvHeaders={csvHeaders}
          onlyCsv={true}
        >
          <></>
          <>
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
                                  <AddressWithIcon address={a.amount?.issuer}>
                                    {amountFormatNode(a.amount, { short: true, maxFractionDigits: 6 })}
                                    <br />
                                    {a.amount?.issuer
                                      ? addressUsernameOrServiceLink(a.amount, 'issuer', { short: true })
                                      : fiatRate > 0 &&
                                        nativeCurrencyToFiat({ amount: a.amount, selectedCurrency, fiatRate })}
                                  </AddressWithIcon>
                                </td>
                                <td>
                                  <AddressWithIcon address={a.amount2?.issuer}>
                                    {amountFormatNode(a.amount2, { short: true, maxFractionDigits: 6 })}
                                    <br />
                                    {a.amount2?.issuer
                                      ? addressUsernameOrServiceLink(a.amount2, 'issuer', { short: true })
                                      : fiatRate > 0 &&
                                        nativeCurrencyToFiat({ amount: a.amount2, selectedCurrency, fiatRate })}
                                  </AddressWithIcon>
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
                              <p>
                                Asset 1: {amountFormatNode(a.amount, { short: true, maxFractionDigits: 6 })}
                                {a.amount?.issuer && addressUsernameOrServiceLink(a.amount, 'issuer', { short: true })}
                              </p>
                              <p>
                                Asset 2: {amountFormatNode(a.amount2, { short: true, maxFractionDigits: 6 })}
                                {a.amount2?.issuer &&
                                  addressUsernameOrServiceLink(a.amount2, 'issuer', { short: true })}
                              </p>
                              <p suppressHydrationWarning>
                                LP balance: {shortNiceNumber(a.lpTokenBalance?.value)} {lpTokenName(a)}
                              </p>
                              <p>
                                AMM ID: <LinkAmm ammId={a.ammID} hash={6} copy={true} />
                              </p>
                              <p>AMM address: {addressUsernameOrServiceLink(a, 'account', { short: true })}</p>
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
                              <p>Trading fee: {showAmmPercents(a.tradingFee)}</p>
                              <p>Vote slots: {a.voteSlots?.length}</p>
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
          </>
        </FiltersFrame>
      </div>
    </>
  )
}
