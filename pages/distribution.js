import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { FaHandshake } from 'react-icons/fa'
import { MdOpenInNew } from 'react-icons/md'
import { axiosServer, currencyServer, passHeaders } from '../utils/axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { getIsSsrMobile } from '../utils/mobile'

const mptIssuanceId = (token) => token?.mptokenIssuanceID || token?.MPTokenIssuanceID || token?.mpt_issuance_id

const normalizeMptRichlist = (richlist, token) => {
  const scale = Number(richlist?.summary?.scale ?? token?.scale)
  const divisor = Number.isFinite(scale) ? 10 ** scale : 1
  const totalCoins = Number(richlist?.summary?.totalCoins || 0) / divisor
  const mptokens = Array.isArray(richlist?.mptokens)
    ? richlist.mptokens.map((record) => ({
        ...record,
        balance: Number(record.amount || 0) / divisor
      }))
    : []

  return {
    ...richlist,
    summary: { ...richlist?.summary, totalCoins },
    mptokens
  }
}

export async function getServerSideProps(context) {
  const { query, locale, req } = context
  const { escrow, currency, currencyIssuer, mptokenIssuanceID } = query
  const isMptMode = !!mptokenIssuanceID
  const initialEscrowMode = ['short', 'locked'].includes(escrow) ? escrow : 'none'

  let data = null

  const serverCurrency = currencyServer(req) || 'usd'

  let token = isMptMode ? {} : null

  if (isMptMode) {
    try {
      const selectedMpt = { mptokenIssuanceID }

      const selectedMptId = mptIssuanceId(selectedMpt)
      if (selectedMptId) {
        token = selectedMpt
        const [tokenResponse, richlistResponse] = await Promise.all([
          axiosServer({
            method: 'get',
            url: `v2/token/${encodeURIComponent(selectedMptId)}?currencyDetails=true`,
            headers: passHeaders(req)
          }),
          axiosServer({
            method: 'get',
            url: `v2/mptokens/richlist/${encodeURIComponent(selectedMptId)}?summary=true`,
            headers: passHeaders(req)
          })
        ])
        token = tokenResponse?.data || selectedMpt
        data = normalizeMptRichlist(richlistResponse?.data, token)
      }
    } catch (error) {
      data = error?.response?.data || null
    }
  } else {
    let url = ''
    if (currency && currencyIssuer) {
      url = `v2/trustlines/token/richlist/${currencyIssuer}/${currency}?summary=true&convertCurrencies=${serverCurrency}&currencyDetails=true`
    } else {
      url = 'v2/addresses/richlist' + (initialEscrowMode !== 'none' ? `?escrow=${initialEscrowMode}` : '')
    }

    try {
      const res = await axiosServer({
        method: 'get',
        url,
        headers: passHeaders(req)
      })
      data = res?.data
    } catch (error) {
      data = error?.response?.data
    }

    token = {
      currency: currency || nativeCurrency,
      issuer: currencyIssuer || null,
      currencyDetails: data?.currencyDetails || null
    }
  }

  return {
    props: {
      queryToken: token || null,
      initialEscrowMode,
      initialRawData: data || null,
      initialData: data?.addresses || data?.trustlines || data?.mptokens || [],
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'distribution']))
    }
  }
}

import SEO from '../components/SEO'
import FiltersFrame from '../components/Layout/FiltersFrame'

import { nativeCurrency, devNet, server, tokenImageSrc } from '../utils'
import {
  amountFormat,
  niceNumber,
  percentFormat,
  tokenToFiat,
  AddressWithIconFilled,
  niceCurrency,
  capitalize,
  CurrencyWithIcon
} from '../utils/format'
import TokenSelector from '../components/UI/TokenSelector'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'
import SimpleSelect from '../components/UI/SimpleSelect'
import { distributionClass } from '../styles/pages/distribution.module.scss'
import { useTheme } from '../components/Layout/ThemeContext'
import { apexChartTheme, apexDonutSliceColors } from '../utils/apexCharts'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

function DistributionDonut({ rows, totalCoins, actions }) {
  const { t } = useTranslation('distribution')
  const { theme } = useTheme()
  const chartTheme = useMemo(() => apexChartTheme(theme), [theme])
  const total = Number(totalCoins || 0)
  const topRows = (Array.isArray(rows) ? rows : [])
    .filter((record) => Number(record.balance) > 0)
    .slice(0, 100)
  const topTotal = topRows.reduce((sum, record) => sum + Number(record.balance || 0), 0)
  const other = Number.isFinite(total) ? Math.max(total - topTotal, 0) : 0
  const otherLabel = t('chart.other')
  const chartRows = other > 0 ? [...topRows, { address: otherLabel, balance: other }] : topRows
  const series = chartRows.map((record) => (Number(record.balance) / total) * 100).filter(Number.isFinite)
  const labels = chartRows.map(
    (record) => record?.addressDetails?.service || record?.addressDetails?.username || record.address || otherLabel
  )
  const options = useMemo(
    () => ({
      chart: { type: 'donut', animations: { enabled: false }, foreColor: chartTheme.textColor },
      labels,
      colors: apexDonutSliceColors(series.length),
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 1, colors: ['var(--card-bg)'] },
      tooltip: { y: { formatter: (value) => `${Number(value).toFixed(2)}%` } },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                showAlways: true,
                label: t('chart.top100'),
                color: chartTheme.labelColor,
                formatter: () => (total > 0 ? `${((topTotal / total) * 100).toFixed(1)}%` : '-')
              }
            }
          }
        }
      }
    }),
    [chartTheme, labels, series.length, t, topTotal, total]
  )

  if (!series.length || !(total > 0)) return null

  return (
    <section className="distribution-chart-card">
      <div className="distribution-chart-copy">
        <h2>{t('chart.holders')}</h2>
        {actions}
      </div>
      <Chart type="donut" series={series} options={options} height={170} />
    </section>
  )
}

export default function Distribution({
  selectedCurrency,
  fiatRate,
  initialRawData,
  initialData,
  queryToken,
  initialEscrowMode,
  setSignRequest
}) {
  const { t } = useTranslation()
  const isFirstRender = useRef(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const mptokenIssuanceIDQuery = searchParams.get('mptokenIssuanceID') || ''
  const isMptMode = !!mptokenIssuanceIDQuery

  const currencyQuery = searchParams.get('currency') || ''
  const currencyIssuerQuery = searchParams.get('currencyIssuer') || ''
  const normalizedCurrencyQuery = currencyQuery || nativeCurrency
  const normalizedIssuerQuery = currencyIssuerQuery || null

  const [data, setData] = useState(initialData || [])
  const [rawData, setRawData] = useState(initialRawData || {})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [escrowMode, setEscrowMode] = useState(initialEscrowMode || 'none') // 'none', 'short', 'locked'
  const [token, setToken] = useState(queryToken)

  useEffect(() => {
    if (isMptMode) return
    if (token?.currency === normalizedCurrencyQuery && (token?.issuer || null) === normalizedIssuerQuery) {
      return
    }
    setToken({
      currency: normalizedCurrencyQuery,
      issuer: normalizedIssuerQuery,
      currencyDetails: null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMptMode, normalizedCurrencyQuery, normalizedIssuerQuery])

  const changeToken = (nextToken) => {
    setToken(nextToken)
    const nextMptId = mptIssuanceId(nextToken)
    const query = nextMptId
      ? { mptokenIssuanceID: nextMptId }
      : nextToken?.issuer && nextToken?.currency
        ? { currency: nextToken.currency, currencyIssuer: nextToken.issuer }
        : {}
    if (escrowMode !== 'none' && !nextMptId && !nextToken?.issuer) query.escrow = escrowMode
    router.replace(
      {
        pathname: '/distribution',
        query
      },
      undefined,
      { shallow: true }
    )
  }

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

  const HydrationValue = ({ children }) => <span suppressHydrationWarning>{children}</span>

  const renderBalance = (amount, totalCoins) => (
    <HydrationValue>
      {amountFormat(amount)} {percentFormat(amount, totalCoins)}
      <br />
      {devNet ? t('table.no-value') : fiatRate > 0 && tokenToFiat({ amount, selectedCurrency, fiatRate })}
    </HydrationValue>
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

  const renderAddressCell = (record) => (
    <div className="distribution-address-cell">
      <AddressWithIconFilled data={record} />
      {record?.amm && <span className="distribution-amm-badge">AMM</span>}
    </div>
  )

  const checkApi = async () => {
    let apiUrl = 'v2/addresses/richlist'

    // Add escrow parameter if mode is selected
    if (escrowMode !== 'none') {
      apiUrl += `?escrow=${escrowMode}`
    }

    const selectedMptId = mptIssuanceId(token)
    if (selectedMptId) {
      apiUrl = `v2/mptokens/richlist/${encodeURIComponent(selectedMptId)}?summary=true`
    } else if (token.currency !== nativeCurrency && token.issuer) {
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
    const newdata = selectedMptId ? normalizeMptRichlist(response?.data, token) : response?.data
    if (newdata) {
      setRawData(newdata)
      setLoading(false) //keep here for fast tab clickers
      if (newdata.addresses || newdata.trustlines || newdata.mptokens) {
        let list = newdata.addresses || newdata.trustlines || newdata.mptokens
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

  const selectedMptId = mptIssuanceId(token)
  const isMptToken = !!selectedMptId
  const isIssuedToken = !!token?.issuer && !isMptToken
  const isAssetToken = isIssuedToken || isMptToken
  const currency = isMptToken
    ? token?.metadata?.name || token?.metadata?.n || token?.metadata?.ticker || token?.metadata?.t || 'MPT'
    : niceCurrency(token?.currency || nativeCurrency)

  const priceFiat = rawData?.summary?.convertCurrencies?.[selectedCurrency]
  const distributionTotalCoins = rawData?.summary?.totalCoins || rawData?.summary?.maxCoins
  const tokenPageUrl = isMptToken
    ? `/token/${encodeURIComponent(mptIssuanceId(token))}`
    : token?.issuer
      ? `/token/${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}`
      : `/token/${encodeURIComponent(nativeCurrency)}`
  const canonicalPath = isMptToken
    ? `/distribution?mptokenIssuanceID=${encodeURIComponent(selectedMptId)}`
    : isIssuedToken
      ? `/distribution?currencyIssuer=${encodeURIComponent(token.issuer)}&currency=${encodeURIComponent(token.currency)}`
      : '/distribution'

  const addToken = () => {
    if (!setSignRequest || !token?.issuer || isMptToken) return
    const supply = Number(distributionTotalCoins)
    setSignRequest({
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: token.currency,
          issuer: token.issuer,
          value: Number.isFinite(supply) && supply > 0 ? supply.toFixed(6) : '1000000000'
        },
        Flags: 131072
      }
    })
  }

  const authorizeMpt = () => {
    const issuanceId = mptIssuanceId(token)
    if (!setSignRequest || !issuanceId) return
    setSignRequest({ request: { TransactionType: 'MPTokenAuthorize', MPTokenIssuanceID: issuanceId } })
  }
  const renderAssetBalance = (record) =>
    isMptToken
      ? niceNumber(record.balance, null, null, 18)
      : amountFormat({ value: record.balance, currency: record.currency, issuer: record.counterparty })

  const setEscrowFilter = (nextMode) => {
    setEscrowMode(nextMode)
    router.replace(
      {
        pathname: '/distribution',
        query: nextMode === 'none' ? {} : { escrow: nextMode }
      },
      undefined,
      { shallow: true }
    )
  }

  const toolbarControls = (
    <>
      <TokenSelector value={token} onChange={changeToken} includeMPTokens excludeLPtokens />
      {!isAssetToken && (
        <SimpleSelect
          value={escrowMode}
          setValue={setEscrowFilter}
          optionsList={escrowModeList}
          className="distribution-escrow-select"
          instanceId="distribution-escrow"
          formatOptionLabel={(option, { context }) =>
            context === 'menu' ? (
              <div>
                <div>{option.label}</div>
                <small className="grey">{option.description}</small>
              </div>
            ) : (
              option.label
            )
          }
        />
      )}
    </>
  )
  const distributionChartRows =
    !isAssetToken && escrowMode !== 'none'
      ? data.map((record) => ({ ...record, balance: calculateTotalBalance(record, escrowMode) }))
      : data
  const rawDistributionIcon = tokenImageSrc(token, 400)
  const distributionIcon = rawDistributionIcon?.startsWith('/') ? `${server}${rawDistributionIcon}` : rawDistributionIcon
  const distributionHolders = isAssetToken ? rawData?.summary?.holders : rawData?.summary?.activeAccounts
  const distributionPreviewParams = {
    currency,
    image: distributionIcon,
    ...(distributionHolders !== undefined && distributionHolders !== null
      ? { holders: String(distributionHolders) }
      : {}),
    v: '2'
  }
  const distributionPreviewImage = {
    width: 1200,
    height: 630,
    file: `${server}/nextapi/distribution-preview?${new URLSearchParams(distributionPreviewParams).toString()}`
  }
  const distributionActions = (
    <div className="distribution-chart-actions">
      <Link href={tokenPageUrl} className="button-action">
        <MdOpenInNew aria-hidden="true" />
        {t('actions.token-page', { ns: 'distribution' })}
      </Link>
      {isIssuedToken && (
        <button type="button" className="button-action" onClick={addToken}>
          <FaHandshake aria-hidden="true" />
          {t('actions.add-token', { ns: 'distribution' })}
        </button>
      )}
      {isMptToken && (
        <button type="button" className="button-action" onClick={authorizeMpt}>
          <FaHandshake aria-hidden="true" />
          {t('actions.authorize', { ns: 'distribution' })}
        </button>
      )}
    </div>
  )

  return (
    <div className={distributionClass}>
      <SEO
        title={t('menu.network.distribution', { currency })}
        canonicalPath={canonicalPath}
        image={distributionPreviewImage}
      />
      <div className="content-center">
        <h1 className="center">{t('menu.network.distribution', { currency })}</h1>
      </div>
      <FiltersFrame data={data || []} navExtra={toolbarControls} withoutLeftFilters>
        <div className="page">
          <section className="distribution-overview">
            {!loading && !errorMessage ? (
              <DistributionDonut
                rows={distributionChartRows}
                totalCoins={distributionTotalCoins}
                actions={distributionActions}
              />
            ) : (
              <div className="distribution-chart-card"></div>
            )}
            <div className="distribution-summary-card">
              <div className="distribution-summary-item">
                {t('desc', { ns: 'distribution', currency })}
                {isIssuedToken && !loading && (
                  <div className="distribution-summary-details">
                    <div>
                      1 {currency} = {niceNumber(priceFiat, null, null, 18)} {selectedCurrency.toUpperCase()}
                    </div>
                    <div>
                      1 {currency} = {rawData?.summary?.priceNativeCurrencySpot} {nativeCurrency}
                    </div>
                  </div>
                )}
              </div>
              <div className="distribution-summary-item">
                {loading ? (
                  t('general.loading')
                ) : isAssetToken ? (
                  <>
                    <CurrencyWithIcon token={isMptToken ? token : rawData} />
                    <div className="distribution-summary-details">
                      <div>
                        Total supply: {niceNumber(distributionTotalCoins || 0)} {currency}
                      </div>
                      <div>Holders: {niceNumber(rawData?.summary?.holders || 0)}</div>
                      <div>
                        {isMptToken ? 'MPTokens' : 'Trustlines'}:{' '}
                        {niceNumber(
                          isMptToken ? rawData?.summary?.mptokens || 0 : rawData?.summary?.trustlines || 0
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <Trans i18nKey="summary" ns="distribution">
                    There are <b>{{ activeAccounts: niceNumber(rawData?.summary?.activeAccounts) }}</b> active accounts,
                    total available: <b>{{ totalCoins: amountFormat(distributionTotalCoins) }}</b>
                  </Trans>
                )}
              </div>
            </div>
          </section>
          <table className="table-large hide-on-small-w800">
            <thead>
              <tr>
                <th className="center">{t('table.index')}</th>
                <th>{t('table.address')}</th>
                <th className="right">{t('table.balance')}</th>
                {!isAssetToken && (escrowMode === 'short' || escrowMode === 'locked') && (
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
                              {renderAddressCell(r)}
                            </td>
                            <td className="right">
                              {isAssetToken ? (
                                <HydrationValue>
                                  {renderAssetBalance(r)}{' '}
                                  {percentFormat(r.balance, distributionTotalCoins)}
                                  <br />
                                  {isIssuedToken &&
                                    tokenToFiat({
                                      amount: { value: r.balance, currency: r.currency, issuer: r.counterparty },
                                      selectedCurrency,
                                      fiatRate: priceFiat
                                    })}
                                </HydrationValue>
                              ) : (
                                renderBalance(r.balance, distributionTotalCoins)
                              )}
                            </td>
                            {!isAssetToken && (escrowMode === 'short' || escrowMode === 'locked') && (
                              <>
                                <td className="right">
                                  {escrowMode === 'short' &&
                                    r.escrowShortBalance &&
                                    renderBalance(getEscrowAmount(r, 'short'), distributionTotalCoins, true)}
                                  {escrowMode === 'locked' &&
                                    r.escrowLockedBalance &&
                                    renderBalance(getEscrowAmount(r, 'locked'), distributionTotalCoins, true)}
                                </td>
                                <td className="right">
                                  {renderBalance(calculateTotalBalance(r), distributionTotalCoins, true)}
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
                              {renderAddressCell(r)}
                              <p>
                                {t('table.balance')}:{' '}
                                <HydrationValue>
                                  {isAssetToken ? renderAssetBalance(r) : amountFormat(r.balance)}{' '}
                                  {percentFormat(r.balance, distributionTotalCoins)}{' '}
                                  {isIssuedToken ? (
                                    <>
                                      {tokenToFiat({
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
                                          tokenToFiat({
                                            amount: r.balance,
                                            selectedCurrency,
                                            fiatRate
                                          })}
                                    </>
                                  )}
                                </HydrationValue>
                              </p>
                              {!isAssetToken && (escrowMode === 'short' || escrowMode === 'locked') && (
                                <>
                                  {escrowMode === 'short' && r.escrowShortBalance && (
                                    <p>
                                      Escrow Short: {amountFormat(getEscrowAmount(r, 'short'))}{' '}
                                      {percentFormat(getEscrowAmount(r, 'short'), distributionTotalCoins)}{' '}
                                      {devNet
                                        ? t('table.no-value')
                                        : fiatRate > 0 &&
                                          tokenToFiat({
                                            amount: getEscrowAmount(r, 'short'),
                                            selectedCurrency,
                                            fiatRate
                                          })}
                                    </p>
                                  )}
                                  {escrowMode === 'locked' && r.escrowLockedBalance && (
                                    <p>
                                      Escrow Locked: {amountFormat(getEscrowAmount(r, 'locked'))}{' '}
                                      {percentFormat(getEscrowAmount(r, 'locked'), distributionTotalCoins)}
                                      <br />
                                      {devNet
                                        ? t('table.no-value')
                                        : fiatRate > 0 &&
                                          tokenToFiat({
                                            amount: getEscrowAmount(r, 'locked'),
                                            selectedCurrency,
                                            fiatRate
                                          })}
                                    </p>
                                  )}
                                  <p>
                                    Total: {amountFormat(calculateTotalBalance(r))}{' '}
                                    {percentFormat(calculateTotalBalance(r), distributionTotalCoins)}
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
        </div>
      </FiltersFrame>
      <style jsx global>{`
        .distribution-address-cell {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          vertical-align: middle;
        }

        .distribution-amm-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 18px;
          padding: 2px 6px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 55%, transparent);
          border-radius: 4px;
          color: var(--accent-link);
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
        }
      `}</style>
    </div>
  )
}
