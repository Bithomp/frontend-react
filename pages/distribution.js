import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { axiosServer, currencyServer, passHeaders } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { getIsSsrMobile } from '../utils/mobile'

export async function getServerSideProps(context) {
  const { query, locale, req } = context
  const { escrow, currency, currencyIssuer } = query

  let data = null

  const serverCurrency = currencyServer(req) || 'usd'

  let url = ''
  if (currency && currencyIssuer) {
    url = `v2/trustlines/token/richlist/${currencyIssuer}/${currency}?summary=true&convertCurrencies=${serverCurrency}&currencyDetails=true`
  } else {
    url = 'v2/addresses/richlist' + (escrow ? `?escrow=${escrow}` : '')
  }

  try {
    const res = await axiosServer({
      method: 'get',
      url,
      headers: passHeaders(req)
    })
    data = res?.data
  } catch (r) {
    data = r?.response?.data
  }

  const token = {
    currency: currency || nativeCurrency,
    issuer: currencyIssuer || null,
    currencyDetails: data?.currencyDetails || null
  }

  return {
    props: {
      queryToken: token || null,
      initialRawData: data || null,
      initialData: data?.addresses || data?.trustlines || [],
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'distribution']))
    }
  }
}

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'

import { nativeCurrency, devNet } from '../utils'
import {
  amountFormat,
  niceNumber,
  percentFormat,
  amountToFiat,
  nativeCurrencyToFiat,
  AddressWithIconFilled,
  niceCurrency,
  capitalize
} from '../utils/format'
import TokenSelector from '../components/UI/TokenSelector'
import { useSearchParams } from 'next/navigation'

export default function Distribution({ selectedCurrency, fiatRate, initialRawData, initialData, queryToken }) {
  const { t } = useTranslation()
  const isFirstRender = useRef(true)
  const searchParams = useSearchParams()

  const currencyQuery = searchParams.get('currency') || ''
  const currencyIssuerQuery = searchParams.get('currencyIssuer') || ''

  useEffect(() => {
    if (token?.currency === currencyQuery && token?.issuer === currencyIssuerQuery) {
      return
    }
    setToken({
      currency: currencyQuery || nativeCurrency,
      issuer: currencyIssuerQuery || null,
      currencyDetails: null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyQuery, currencyIssuerQuery])

  const [data, setData] = useState(initialData || [])
  const [rawData, setRawData] = useState(initialRawData || {})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [escrowMode, setEscrowMode] = useState('none') // 'none', 'short', 'locked'
  const [filtersHide, setFiltersHide] = useState(false)
  const [token, setToken] = useState(queryToken)

  const controller = new AbortController()

  const escrowModeList = [
    {
      value: 'none',
      label: 'Available balance',
      description: `${nativeCurrency} excluding escrows. Only currently spendable funds`
    },
    {
      value: 'short',
      label: 'Balance + expected escrows',
      description: `Includes ${nativeCurrency} that will likely be received from escrows by this account (this account = destination)`
    },
    {
      value: 'locked',
      label: 'Balance + locked escrows',
      description: `Includes ${nativeCurrency} currently locked in escrows created by this account (this account = current owner)`
    }
  ]

  // calculate total balance including escrow
  const calculateTotalBalance = (record, mode = escrowMode) => {
    const baseBalance = parseInt(record.balance)
    if (mode === 'short' && record.escrowShortBalance) {
      return baseBalance + parseInt(record.escrowShortBalance)
    }
    if (mode === 'locked' && record.escrowLockedBalance) {
      return baseBalance + parseInt(record.escrowLockedBalance)
    }
    return baseBalance
  }

  const getEscrowAmount = (record, mode) => {
    if (mode === 'short' && record.escrowShortBalance) {
      return parseInt(record.escrowShortBalance)
    }
    if (mode === 'locked' && record.escrowLockedBalance) {
      return parseInt(record.escrowLockedBalance)
    }
    return 0
  }

  const renderBalance = (amount, totalCoins) => (
    <>
      {amountFormat(amount)} {percentFormat(amount, totalCoins)}
      <br />
      {devNet ? t('table.no-value') : fiatRate > 0 && nativeCurrencyToFiat({ amount, selectedCurrency, fiatRate })}
    </>
  )

  const renderLoadingState = () => (
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
  )

  const renderErrorState = () => (
    <tr>
      <td colSpan="100" className="center orange bold">
        {errorMessage}
      </td>
    </tr>
  )

  const checkApi = async () => {
    let apiUrl = 'v2/addresses/richlist'

    // Add escrow parameter if mode is selected
    if (escrowMode !== 'none') {
      apiUrl += `?escrow=${escrowMode}`
    }

    if (token.currency !== nativeCurrency && token.issuer) {
      apiUrl =
        'v2/trustlines/token/richlist/' +
        token.issuer +
        '/' +
        token.currency +
        '?summary=true&currencyDetails=true&convertCurrencies=' +
        selectedCurrency
    }

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
      if (newdata.addresses || newdata.trustlines) {
        let list = newdata.addresses || newdata.trustlines
        if (list.length > 0) {
          setErrorMessage('')
          setData(list)
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

  /*
    {
      "summary": {
        "maxCoins": "100000000000000000",
        "totalCoins": "99988432439120264",
        "activeAccounts": 4771977
      },
      "addresses": [
        {
          "address": "rMQ98K56yXJbDGv49ZSmW51sLn94Xe1mu1",
          "balance": "1960027032479644",
          "addressDetails": {
            "username": null,
            "service": "Ripple"
          }
        },

    {
      "issuer": "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
      "issuerDetails": {
        "address": "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
        "username": null,
        "service": "Ripple"
      },
      "currency": "524C555344000000000000000000000000000000",
      "trustlines": [
        {
          "trustlineID": "2778EE6C134B42B896A0DB3E48C69FF6B3519E8D179BF9BFBBDA4F3221D32A6C",
          "counterparty": "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
          "currency": "524C555344000000000000000000000000000000",
          "address": "rLWQgSxFdo4SSsH2hLqVyQ1VqdEX2rPXHX",
          "addressDetails": {
            "address": "rLWQgSxFdo4SSsH2hLqVyQ1VqdEX2rPXHX",
            "username": null,
            "service": null
          },
          "balance": "30000000.001",
          "limit": "9999999999999999",
          "reserve": true,
          "amm": false,
          "ripplingDisabled": true,
          "authorized": false,
          "freeze": false
        },
  */

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    checkApi()
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escrowMode, token, selectedCurrency])

  const currency = niceCurrency(token.currency)

  const priceFiat = rawData?.summary?.convertCurrencies?.[selectedCurrency]

  return (
    <>
      <SEO
        title={t('menu.network.distribution', { currency })}
        image={{
          width: 1200,
          height: 630,
          file: 'previews/1200x630/distribution.png'
        }}
        twitterImage={{
          file: 'previews/630x630/distribution.png'
        }}
      />
      <div className="content-center">
        <h1 className="center">{t('menu.network.distribution', { currency })}</h1>
        <div className="flex-container">
          <div className="grey-box">
            {t('desc', { ns: 'distribution', currency })}
            {token?.issuer && !loading && (
              <>
                <br />
                <br />
                <br />1 {currency} = {niceNumber(priceFiat, null, null, 18)} {selectedCurrency.toUpperCase()}
                <br />1 {currency} = {rawData?.summary?.priceNativeCurrencySpot} {nativeCurrency}
              </>
            )}
          </div>
          <div className="grey-box">
            {loading ? (
              t('general.loading')
            ) : token?.issuer ? (
              <>
                <AddressWithIconFilled
                  data={rawData}
                  name="issuer"
                  currency={rawData.currency}
                  options={{ short: 12, currencyDetails: rawData.currencyDetails }}
                />
                <br />
                Total supply: {niceNumber(rawData?.summary?.totalCoins || 0)} {currency}
                <br />
                Holders: {niceNumber(rawData?.summary?.holders || 0)}
                <br />
                Trustlines: {niceNumber(rawData?.summary?.trustlines || 0)}
              </>
            ) : (
              <Trans i18nKey="summary" ns="distribution">
                There are <b>{{ activeAccounts: niceNumber(rawData?.summary?.activeAccounts) }}</b> active accounts,
                total available: <b>{{ totalCoins: amountFormat(rawData?.summary?.totalCoins) }}</b>
              </Trans>
            )}
          </div>
        </div>
      </div>
      <FiltersFrame filtersHide={filtersHide} setFiltersHide={setFiltersHide} data={data || []}>
        <>
          <TokenSelector value={token} onChange={setToken} currencyQueryName="currency" />
          {token.currency === nativeCurrency && (
            <div
              className="radio-options radio-options--large"
              style={{ flexDirection: 'column', alignItems: 'flex-start' }}
            >
              {escrowModeList.map((tabItem) => (
                <div className="radio-input" key={tabItem.value}>
                  <input
                    type="radio"
                    name="escrowMode"
                    value={tabItem.value}
                    checked={tabItem.value === escrowMode}
                    onChange={() => setEscrowMode(tabItem.value)}
                    id={tabItem.value}
                  />
                  <label htmlFor={tabItem.value}>
                    {tabItem.label}
                    <br />
                    <span className="grey">{tabItem.description}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </>
        <>
          <table className="table-large hide-on-small-w800">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th>{t('table.address')}</th>
                <th className="right">{t('table.balance')}</th>
                {!token?.issuer && (escrowMode === 'short' || escrowMode === 'locked') && (
                  <>
                    <th className="right">Escrow {capitalize(escrowMode)}</th>
                    <th className="right">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                renderLoadingState()
              ) : (
                <>
                  {!errorMessage && data ? (
                    <>
                      {data.length > 0 &&
                        data.map((r, i) => (
                          <tr key={i}>
                            <td className="center">{i + 1}</td>
                            <td>
                              <AddressWithIconFilled data={r} />
                            </td>
                            <td className="right">
                              {token?.issuer ? (
                                <>
                                  {amountFormat({ value: r.balance, currency: r.currency, issuer: r.counterparty })}{' '}
                                  {percentFormat(r.balance, rawData.summary?.totalCoins)}
                                  <br />
                                  {amountToFiat({
                                    amount: { value: r.balance, currency: r.currency, issuer: r.counterparty },
                                    selectedCurrency,
                                    fiatRate: priceFiat
                                  })}
                                </>
                              ) : (
                                renderBalance(r.balance, rawData.summary?.totalCoins)
                              )}
                            </td>
                            {!token?.issuer && (escrowMode === 'short' || escrowMode === 'locked') && (
                              <>
                                <td className="right">
                                  {escrowMode === 'short' &&
                                    r.escrowShortBalance &&
                                    renderBalance(getEscrowAmount(r, 'short'), rawData.summary?.totalCoins, true)}
                                  {escrowMode === 'locked' &&
                                    r.escrowLockedBalance &&
                                    renderBalance(getEscrowAmount(r, 'locked'), rawData.summary?.totalCoins, true)}
                                </td>
                                <td className="right">
                                  {renderBalance(calculateTotalBalance(r), rawData.summary?.totalCoins, true)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                    </>
                  ) : (
                    renderErrorState()
                  )}
                </>
              )}
            </tbody>
          </table>
          <div className="show-on-small-w800">
            <table className="table-mobile">
              <thead></thead>
              <tbody>
                {loading ? (
                  renderLoadingState()
                ) : (
                  <>
                    {!errorMessage
                      ? data.map((r, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px' }} className="center">
                              <b>{i + 1}</b>
                            </td>
                            <td>
                              <br />
                              <AddressWithIconFilled data={r} />
                              <p>
                                {t('table.balance')}:{' '}
                                {token?.issuer
                                  ? amountFormat({ value: r.balance, currency: r.currency, issuer: r.counterparty })
                                  : amountFormat(r.balance)}{' '}
                                {percentFormat(r.balance, rawData.summary?.totalCoins)}{' '}
                                {token?.issuer ? (
                                  <>
                                    {amountToFiat({
                                      amount: { value: r.balance, currency: r.currency, issuer: r.counterparty },
                                      selectedCurrency,
                                      fiatRate: priceFiat
                                    })}
                                  </>
                                ) : (
                                  <>
                                    {devNet
                                      ? t('table.no-value')
                                      : fiatRate > 0 &&
                                        token?.currency === nativeCurrency &&
                                        nativeCurrencyToFiat({
                                          amount: r.balance,
                                          selectedCurrency,
                                          fiatRate
                                        })}
                                  </>
                                )}
                              </p>
                              {!token?.issuer && (escrowMode === 'short' || escrowMode === 'locked') && (
                                <>
                                  {escrowMode === 'short' && r.escrowShortBalance && (
                                    <p>
                                      Escrow Short: {amountFormat(getEscrowAmount(r, 'short'))}{' '}
                                      {percentFormat(getEscrowAmount(r, 'short'), rawData.summary?.totalCoins)}{' '}
                                      {devNet
                                        ? t('table.no-value')
                                        : fiatRate > 0 &&
                                          nativeCurrencyToFiat({
                                            amount: getEscrowAmount(r, 'short'),
                                            selectedCurrency,
                                            fiatRate
                                          })}
                                    </p>
                                  )}
                                  {escrowMode === 'locked' && r.escrowLockedBalance && (
                                    <p>
                                      Escrow Locked: {amountFormat(getEscrowAmount(r, 'locked'))}{' '}
                                      {percentFormat(getEscrowAmount(r, 'locked'), rawData.summary?.totalCoins)}
                                      <br />
                                      {devNet
                                        ? t('table.no-value')
                                        : fiatRate > 0 &&
                                          nativeCurrencyToFiat({
                                            amount: getEscrowAmount(r, 'locked'),
                                            selectedCurrency,
                                            fiatRate
                                          })}
                                    </p>
                                  )}
                                  <p>
                                    Total: {amountFormat(calculateTotalBalance(r))}{' '}
                                    {percentFormat(calculateTotalBalance(r), rawData.summary?.totalCoins)}
                                  </p>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      : renderErrorState()}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </>
      </FiltersFrame>
    </>
  )
}
