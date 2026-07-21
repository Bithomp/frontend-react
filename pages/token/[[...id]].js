import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FaHandshake } from 'react-icons/fa'
import axios from 'axios'

import SEO from '../../components/SEO'
import TokenSelector from '../../components/UI/TokenSelector'
import { tokenPage } from '../../styles/pages/token.module.scss'
import {
  niceNumber,
  shortNiceNumber,
  fullNiceNumber,
  AddressWithIconInline,
  AmountWithIcon,
  CurrencyWithIcon,
  CurrencyWithIconInline,
  addressUsernameOrServiceLink,
  shortHash,
  niceCurrency,
  dateFormat,
  showAmmPercents,
  tokenToFiat,
  timeFormat,
  amountParced
} from '../../utils/format'
import { axiosServer, getFiatRateServer, logServerSideError, passHeaders } from '../../utils/axios'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
import { isAddressOrUsername, nativeCurrency, server, tokenImageSrc, validateCurrencyCode, xahauNetwork } from '../../utils'
import { ipfsUrl } from '../../utils/nft'
import CopyButton from '../../components/UI/CopyButton'
import TokenTabs from '../../components/Tabs/TokenTabs'
import HomeTeaser, { HomeTeaseRow } from '../../components/Home/HomeTeaser'
import homeTeaserStyles from '@/styles/components/home-teaser.module.scss'
import TokenCharts from '../../components/Token/TokenCharts'
import AmmDetailsPage, { fetchAmmPageData } from '../../components/Amm/AmmDetailsPage'
import { useTheme } from '../../components/Layout/ThemeContext'
import {
  apexChartTheme,
  apexDonutSliceColor,
  apexDonutSliceColors,
  apexSafeChartId,
  syncApexDonutSelection
} from '../../utils/apexCharts'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const tokenSwapsUrl = (token, type, limit = 5) => {
  if (!token) return ''
  const mptId = token?.mptokenIssuanceID
  const tokenPath = mptId
    ? encodeURIComponent(mptId)
    : token?.issuer
      ? `${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}`
      : encodeURIComponent(nativeCurrency)

  return `v2/token/${tokenPath}/swaps?limit=${limit}&type=${type}&ignoreRounding=true`
}

const TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH = 'amountHigh'
const TOKEN_ACTIVITY_ORDER_LATEST = 'latest'
const DEX_SWAPS_LIMIT = 7
const REFRESH_COOLDOWN_MS = 30000
const TOKEN_HOLDERS_PREVIEW_LIMIT = 100
const TOKEN_AMMS_PREVIEW_LIMIT = 20

const tokenSupportsAmmsPreview = (token) =>
  !!token?.issuer && !!token?.currency && !token?.mptokenIssuanceID && token?.currencyDetails?.type !== 'lp_token'

const tokenSupportsHoldersPreview = (token) =>
  !!token?.mptokenIssuanceID || tokenSupportsAmmsPreview(token)

const tokenSupportsPreviews = tokenSupportsHoldersPreview

const tokenHoldersPreviewUrl = (token, selectedCurrency) => {
  if (!tokenSupportsHoldersPreview(token)) return ''
  if (token.mptokenIssuanceID) {
    return `v2/mptokens/richlist/${encodeURIComponent(
      token.mptokenIssuanceID
    )}?summary=true&limit=${TOKEN_HOLDERS_PREVIEW_LIMIT}`
  }
  return `v2/trustlines/token/richlist/${encodeURIComponent(token.issuer)}/${encodeURIComponent(
    token.currency
  )}?summary=true&limit=${TOKEN_HOLDERS_PREVIEW_LIMIT}&convertCurrencies=${encodeURIComponent(
    selectedCurrency || 'usd'
  )}`
}

const tokenAmmsPreviewUrl = (token) => {
  if (!tokenSupportsAmmsPreview(token)) return ''
  return `v2/amms?order=currencyHigh&limit=${TOKEN_AMMS_PREVIEW_LIMIT}&voteSlots=false&auctionSlot=false&holders=true&priceNativeCurrencySpot=true&currency=${encodeURIComponent(
    token.currency
  )}&currencyIssuer=${encodeURIComponent(token.issuer)}`
}

const tokenPreviewDataKey = (token, selectedCurrency) =>
  tokenSupportsPreviews(token)
    ? `${token.mptokenIssuanceID || `${token.issuer}:${token.currency}`}:${selectedCurrency || 'usd'}`
    : ''

const holderShare = (balance, total) => {
  const amount = Number(balance)
  const totalAmount = Number(total)
  if (!Number.isFinite(amount) || !Number.isFinite(totalAmount) || totalAmount <= 0) return null
  return (amount / totalAmount) * 100
}

const holderLabel = (record) => {
  const details = record?.addressDetails || record?.accountDetails || {}
  return details.service || details.username || shortHash(record?.address || record?.account || '')
}

const holderBaseColor = apexDonutSliceColor
const holderChartColors = apexDonutSliceColors

const tokenPreviewAmountFiatValue = (amount, selectedCurrency, fiatRate) => {
  if (!amount || !selectedCurrency) return null

  const nativeFiatRate = Number(fiatRate)
  let value = null

  if (!amount?.currency) {
    value = (Number(amount) / 1000000) * nativeFiatRate
  } else if (!amount.issuer && !amount.mpt_issuance_id) {
    value = Number(amount.value) * nativeFiatRate
  } else {
    const tokenValue = Number(amount.value)
    const priceInNative = Number(amount.priceNativeCurrencySpot)
    const embedded = amount.valueInConvertCurrencies?.[selectedCurrency.toLowerCase()]
    if (embedded !== undefined) {
      value = Number(embedded)
    } else if (Number.isFinite(tokenValue) && Number.isFinite(priceInNative)) {
      value = tokenValue * priceInNative * nativeFiatRate
    }
  }

  return Number.isFinite(value) ? Math.abs(value) : null
}
const displayCurrencyCode = (currencyCode) => {
  if (!currencyCode) return ''
  const code = String(currencyCode)
  return code.replace(/0+$/, '') || code
}

const metadataHasValue = (value) => {
  if (value === undefined || value === null || value === '') return false
  if (typeof value === 'string') return !!value.trim()
  if (Array.isArray(value)) return value.some(metadataHasValue)
  if (typeof value === 'object') return Object.values(value).some(metadataHasValue)
  return true
}

const mptMetadataValue = (metadata, ...keys) => {
  if (!metadata || typeof metadata !== 'object') return null

  for (const key of keys) {
    const value = metadata[key]
    if (!metadataHasValue(value)) continue
    if (typeof value === 'string') {
      const text = value.trim()
      if (text) return text
      continue
    }
    return value
  }

  return null
}

const metadataHttpHref = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^(?:ipfs|cid|hash):/i.test(text)) return ipfsUrl(text, 'viewer', 'cl') || ''
  if (/^https?:\/\//i.test(text)) return text
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return ''
  if (/^[^\s/]+\.[^\s]+/i.test(text)) return `https://${text}`
  return ''
}

const metadataDisplayValue = (value) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const normalizedTomlCurrency = (value) => String(value || '').trim().toUpperCase()

const tokenTomlEntry = (token) => {
  const tomlTokens = token?.toml?.TOKENS
  if (!Array.isArray(tomlTokens) || !tomlTokens.length) return null

  const currencies = new Set(
    [token?.currency, token?.currencyDetails?.currency, token?.currencyDetails?.currencyCode]
      .map(normalizedTomlCurrency)
      .filter(Boolean)
  )

  return (
    tomlTokens.find(
      (item) =>
        item?.issuer === token?.issuer &&
        (!currencies.size || currencies.has(normalizedTomlCurrency(item?.currency)))
    ) || null
  )
}

const MPT_ASSET_CLASS_LABELS = {
  rwa: 'Real world asset',
  memes: 'Meme token',
  wrapped: 'Wrapped asset',
  gaming: 'Gaming token',
  defi: 'DeFi token',
  other: 'Other'
}

const MPT_ASSET_SUBCLASS_LABELS = {
  stablecoin: 'Stablecoin',
  commodity: 'Commodity',
  real_estate: 'Real estate',
  private_credit: 'Private credit',
  equity: 'Equity',
  treasury: 'Treasury',
  other: 'Other'
}

// Server side initial data fetch
export async function getServerSideProps(context) {
  const { locale, req, params } = context
  const { id } = params || {}

  let initialData = null
  let initialErrorMessage = null
  let issuer = null
  let currency = null
  let isNativeTokenRoute = false
  let tokenId = null
  let initialAmmData = null
  let initialAmmSwapsData = null
  let initialAmmChartData = null
  let initialAmmLpTokenData = null
  let initialAmmLpChartData = null
  let initialAmmContributorsData = null
  let initialAmmErrorMessage = null
  let initialHoldersPreviewData = null
  let initialAmmsPreviewData = null

  // Parse the dynamic route parameters
  if (id && Array.isArray(id) && id.length >= 2) {
    issuer = id[0]
    currency = id[1]
  } else if (id && Array.isArray(id) && id.length === 1 && id[0] === nativeCurrency) {
    currency = nativeCurrency
    isNativeTokenRoute = true
  } else if (id && Array.isArray(id) && id.length === 1) {
    tokenId = id[0]
  } else {
    initialErrorMessage =
      'Invalid token URL. Expected format: /token/{issuer}/{currencyCode} or /token/' + nativeCurrency
  }

  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

  if (currency || tokenId) {
    if (isNativeTokenRoute) {
      try {
        const url = `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${selectedCurrencyServer}`
        const res = await axiosServer({
          method: 'get',
          url,
          headers: passHeaders(req)
        }).catch((error) => {
          initialErrorMessage = error.message
        })
        if (res?.data) {
          if (res.data?.error) {
            initialErrorMessage = res.data.error
          } else {
            initialData = res.data
          }
        } else {
          initialErrorMessage = 'Token not found'
        }
      } catch (e) {
        logServerSideError(e, req, 'token')
        initialErrorMessage = 'Failed to fetch token data'
      }
    } else if (tokenId) {
      try {
        const url = `v2/token/${encodeURIComponent(tokenId)}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}`
        const res = await axiosServer({
          method: 'get',
          url,
          headers: passHeaders(req)
        }).catch((error) => {
          initialErrorMessage = error.message
        })
        if (res?.data) {
          if (res.data?.error) {
            initialErrorMessage = res.data.error
          } else {
            initialData = res.data
          }
        } else {
          initialErrorMessage = 'Token not found'
        }
      } catch (e) {
        logServerSideError(e, req, 'token')
        initialErrorMessage = 'Failed to fetch token data'
      }
    } else if (issuer) {
      // Validate issuer
      if (!isAddressOrUsername(issuer)) {
        initialErrorMessage = 'Invalid issuer address or username'
      }

      // Validate currency code
      const { valid, currencyCode } = validateCurrencyCode(currency)
      if (!valid) {
        initialErrorMessage = 'Invalid currency code'
      }

      if (!initialErrorMessage) {
        try {
          // Fetch token data
          const url = `v2/token/${encodeURIComponent(issuer)}/${encodeURIComponent(currencyCode)}?statistics=true&currencyDetails=true&convertCurrencies=${selectedCurrencyServer}&toml=true`
          const res = await axiosServer({
            method: 'get',
            url,
            headers: passHeaders(req)
          }).catch((error) => {
            initialErrorMessage = error.message
          })
          if (res?.data) {
            if (res.data?.error) {
              initialErrorMessage = res.data.error
            } else {
              initialData = res.data
            }
          } else {
            initialErrorMessage = 'Token not found'
          }
        } catch (e) {
          logServerSideError(e, req, 'token')
          initialErrorMessage = 'Failed to fetch token data'
        }
      }
    } else {
      initialErrorMessage =
        'Invalid token URL. Expected format: /token/{issuer}/{currencyCode} or /token/' + nativeCurrency
    }
  }

  if (initialData?.currencyDetails?.type === 'lp_token' && initialData.currencyDetails?.ammID) {
    const ammPageData = await fetchAmmPageData({
      id: initialData.currencyDetails.ammID,
      req,
      selectedCurrencyServer
    })
    initialAmmData = ammPageData.initialData
    initialAmmSwapsData = ammPageData.initialSwapsData
    initialAmmChartData = ammPageData.initialChartData
    initialAmmLpTokenData = ammPageData.initialLpTokenData
    initialAmmLpChartData = ammPageData.initialLpChartData
    initialAmmContributorsData = ammPageData.initialContributorsData
    initialAmmErrorMessage = ammPageData.initialErrorMessage
  }

  if (tokenSupportsPreviews(initialData)) {
    const [holdersPreviewResult, ammsPreviewResult] = await Promise.allSettled([
      axiosServer({
        method: 'get',
        url: tokenHoldersPreviewUrl(initialData, selectedCurrencyServer),
        headers: passHeaders(req)
      }),
      tokenSupportsAmmsPreview(initialData)
        ? axiosServer({
            method: 'get',
            url: tokenAmmsPreviewUrl(initialData),
            headers: passHeaders(req)
          })
        : Promise.resolve(null)
    ])

    if (holdersPreviewResult.status === 'fulfilled') {
      initialHoldersPreviewData = holdersPreviewResult.value?.data || null
    }

    if (ammsPreviewResult.status === 'fulfilled') {
      initialAmmsPreviewData = ammsPreviewResult.value?.data || null
    }
  }

  return {
    props: {
      initialData: initialData || null,
      initialErrorMessage: initialErrorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      fiatRateServer,
      selectedCurrencyServer,
      initialAmmData,
      initialAmmSwapsData,
      initialAmmChartData,
      initialAmmLpTokenData,
      initialAmmLpChartData,
      initialAmmContributorsData,
      initialAmmErrorMessage,
      initialHoldersPreviewData,
      initialAmmsPreviewData,
      issuer,
      currency,
      tokenId,
      ...(await serverSideTranslations(locale, ['common', 'token', 'services', 'amm']))
    }
  }
}

function TokenHoldersPreview({ token, data, loading, selectedCurrency }) {
  const { t } = useTranslation('token')
  const { t: tAmm } = useTranslation('amm')
  const { theme } = useTheme()
  const isMobile = useIsMobile(600)
  const chartTheme = useMemo(() => apexChartTheme(theme), [theme])
  const [activeHolderIndex, setActiveHolderIndex] = useState(null)
  const [showAllHolders, setShowAllHolders] = useState(false)
  const activeHolderIndexRef = useRef(null)
  const holderChartIdRef = useRef(
    apexSafeChartId(
      `token-holders-${token?.mptokenIssuanceID || token?.issuer || 'token'}-${token?.currency || 'current'}`
    )
  )
  const updateActiveHolderIndex = useCallback((nextIndex, syncChart = false) => {
    const normalizedIndex = nextIndex ?? null
    if (syncChart) {
      syncApexDonutSelection(holderChartIdRef.current, activeHolderIndexRef.current, normalizedIndex)
    }
    activeHolderIndexRef.current = normalizedIndex
    setActiveHolderIndex(normalizedIndex)
  }, [])
  const mptScale = Number(data?.summary?.scale ?? token?.scale)
  const mptDivisor = token?.mptokenIssuanceID && Number.isFinite(mptScale) ? 10 ** mptScale : 1
  const totalCoins = data?.summary?.totalCoins
    ? Number(data.summary.totalCoins) / mptDivisor
    : token?.supply
  const tokenFiatRate = data?.summary?.convertCurrencies?.[selectedCurrency?.toLowerCase?.() || selectedCurrency]
  const rows = useMemo(
    () => {
      const holderRows = Array.isArray(data?.trustlines)
        ? data.trustlines
        : Array.isArray(data?.mptokens)
          ? data.mptokens.map((record) => ({
              ...record,
              balance: Number(record.amount || 0) / mptDivisor
            }))
          : []

      return holderRows
        .filter((record) => Number(record.balance) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance))
    },
    [data, mptDivisor]
  )
  const chartRows = rows.slice(0, TOKEN_HOLDERS_PREVIEW_LIMIT)
  const listRows = rows.slice(0, TOKEN_HOLDERS_PREVIEW_LIMIT)
  const topBalance = chartRows.reduce((sum, record) => sum + Number(record.balance || 0), 0)
  const totalBalance = Number(totalCoins || 0)
  const chartItems = chartRows
    .map((record) => ({
      label: holderLabel(record),
      balance: Number(record.balance || 0),
      share: holderShare(record.balance, totalCoins),
      record
    }))
    .filter((item) => item.share !== null && item.share > 0)
  const otherBalance = Number.isFinite(totalBalance) ? Math.max(totalBalance - topBalance, 0) : 0

  if (otherBalance > 0) {
    chartItems.push({
      label: t('previews.others'),
      balance: otherBalance,
      share: holderShare(otherBalance, totalCoins),
      record: null
    })
  }

  const chartSeries = chartItems.map((item) => item.share)
  const topShare = holderShare(topBalance, totalCoins)
  const activeHolder =
    activeHolderIndex !== null && activeHolderIndex !== undefined ? chartItems[activeHolderIndex] : null
  const distributionUrl = token?.mptokenIssuanceID
    ? `/distribution?mptokenIssuanceID=${encodeURIComponent(token.mptokenIssuanceID)}`
    : `/distribution?currency=${encodeURIComponent(token.currency)}&currencyIssuer=${encodeURIComponent(token.issuer)}`
  const chartOptions = useMemo(
    () => ({
      chart: {
        id: holderChartIdRef.current,
        type: 'donut',
        animations: { enabled: false },
        foreColor: chartTheme.textColor,
        toolbar: { show: false },
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            const index = config?.dataPointIndex
            if (index === undefined || index === null || index < 0) return
            updateActiveHolderIndex(activeHolderIndexRef.current === index ? null : index)
          },
          dataPointMouseEnter: (_event, _chartContext, config) => {
            if (isMobile) return
            const index = config?.dataPointIndex
            if (index === undefined || index === null || index < 0) return
            updateActiveHolderIndex(index)
          },
          dataPointMouseLeave: () => {
            if (!isMobile) updateActiveHolderIndex(null)
          }
        }
      },
      labels: chartItems.map((item) => item.label),
      colors: holderChartColors(chartItems.length),
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 1, colors: ['var(--card-bg)'] },
      tooltip: { enabled: false },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: '68%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '12px',
                color: chartTheme.labelColor
              },
              value: {
                show: true,
                fontSize: '16px',
                fontWeight: 700,
                color: chartTheme.textColor,
                formatter: (value) => {
                  const number = Number(value)
                  return Number.isFinite(number) ? `${number.toFixed(2)}%` : '-'
                }
              },
              total: {
                show: true,
                showAlways: true,
                label: t('previews.top100'),
                color: chartTheme.labelColor,
                formatter: () => (topShare !== null ? `${topShare.toFixed(1)}%` : '-')
              }
            }
          }
        }
      }
    }),
    [chartItems, chartTheme, isMobile, t, topShare, updateActiveHolderIndex]
  )

  return (
    <section className="ammContributorsCard tokenActivityCard tokenHoldersPreview" id="token-holders">
      <div className="ammContributorsHeader">
        <div>
          <h2>
            {t('previews.holdersTitle')}
            {data?.summary?.holders !== undefined && data?.summary?.holders !== null ? (
              <span className="ammContributorsCount">{niceNumber(data.summary.holders)}</span>
            ) : null}
          </h2>
          <span>{t('previews.holdersSubtitle')}</span>
        </div>
        {distributionUrl ? (
          <Link href={distributionUrl} prefetch={false}>
            {t('previews.viewAllHolders')}
          </Link>
        ) : null}
      </div>
      {loading ? (
        <div className="tokenChartEmpty">
          <span className="waiting"></span>
        </div>
      ) : rows.length ? (
        <div className="ammContributorsBody">
          <div className="ammContributorsChart">
            {chartSeries.length ? (
              <>
                <Chart type="donut" series={chartSeries} options={chartOptions} height={210} />
                {activeHolder ? (
                  <div
                    className="ammContributorSelected"
                    style={{ '--amm-contributor-color': holderBaseColor(activeHolderIndex, chartItems.length) }}
                  >
                    <div className="ammContributorSelectedAddress">
                      <span className="ammContributorSelectedMarker"></span>
                      {activeHolder.record?.address ? (
                        <Link href={`/account/${activeHolder.record.address}`} prefetch={false}>
                          <AddressWithIconInline
                            data={activeHolder.record}
                            options={{
                              noLink: true,
                              className: 'ammContributorAddressInline',
                              labelClassName: 'ammContributorAddressText'
                            }}
                          />
                        </Link>
                      ) : (
                        <span>{activeHolder.label}</span>
                      )}
                    </div>
                    <div className="ammContributorSelectedStats">
                      <span>
                        <span>{t('previews.share')}</span>
                        <strong>
                          {activeHolder.share !== null && activeHolder.share !== undefined
                            ? `${activeHolder.share.toFixed(2)}%`
                            : '-'}
                        </strong>
                      </span>
                      <span>
                        <span>{t('previews.balance')}</span>
                        <strong>{shortNiceNumber(activeHolder.balance, 2, 1)}</strong>
                      </span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="tokenChartEmpty">{t('previews.unavailable')}</div>
            )}
          </div>
          <div
            className={`ammContributorsList ${
              showAllHolders ? 'ammContributorsList-expanded' : 'ammContributorsList-collapsed'
            }`.trim()}
          >
            <div className="ammContributorListHeader">
              <span></span>
              <span>{t('previews.wallet')}</span>
              <span>{t('previews.share')}</span>
              <span>{t('previews.balance')}</span>
            </div>
            {listRows.map((record, index) => {
              const share = holderShare(record.balance, totalCoins)
              return (
                <Link
                  href={`/account/${record.address}`}
                  className={`ammContributorRow${activeHolderIndex === index ? ' ammContributorRow-active' : ''}`}
                  key={record.trustlineID || record.address || index}
                  prefetch={false}
                  onBlur={() => {
                    if (!isMobile) updateActiveHolderIndex(null, true)
                  }}
                  onClick={(event) => {
                    if (!isMobile) return
                    if (activeHolderIndex !== index) {
                      event.preventDefault()
                      updateActiveHolderIndex(index, true)
                    }
                  }}
                  onFocus={() => updateActiveHolderIndex(index, true)}
                  onMouseEnter={() => {
                    if (!isMobile) updateActiveHolderIndex(index, true)
                  }}
                  onMouseLeave={() => {
                    if (!isMobile) updateActiveHolderIndex(null, true)
                  }}
                  style={{ '--amm-contributor-color': holderBaseColor(index, chartItems.length) }}
                >
                  <span className="ammVoteRank">{index + 1}</span>
                  <span className="ammContributorAddress">
                    <AddressWithIconInline
                      data={record}
                      options={{
                        noLink: true,
                        className: 'ammContributorAddressInline',
                        labelClassName: 'ammContributorAddressText'
                      }}
                    />
                  </span>
                  <strong className="ammContributorShare">{share !== null ? `${share.toFixed(2)}%` : '-'}</strong>
                  <span className="ammContributorLp" title={fullNiceNumber(record.balance)}>
                    <span>{shortNiceNumber(record.balance, 2, 1)}</span>
                    {tokenFiatRate ? (
                      <span className="ammContributorFiat">
                        {tokenToFiat({
                          amount: { value: record.balance, currency: record.currency, issuer: record.counterparty },
                          selectedCurrency,
                          tokenFiatRate
                        })}
                      </span>
                    ) : null}
                  </span>
                </Link>
              )
            })}
            {listRows.length > 10 ? (
              <button
                type="button"
                className="button-action thin narrow ammContributorsToggle"
                onClick={() => {
                  updateActiveHolderIndex(null, true)
                  setShowAllHolders((current) => !current)
                }}
              >
                {showAllHolders ? tAmm('contributors.showTop10') : tAmm('contributors.showTopCount', { count: listRows.length })}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="tokenChartEmpty">{t('previews.unavailable')}</div>
      )}
    </section>
  )
}

function TokenAmmsPreview({ token, data, loading, selectedCurrency, fiatRate }) {
  const { t } = useTranslation('token')
  const rows = Array.isArray(data?.amms) ? data.amms.slice(0, TOKEN_AMMS_PREVIEW_LIMIT) : []
  const totalPools = token?.statistics?.ammPools ?? data?.summary?.ammPools ?? data?.summary?.total ?? data?.total
  const ammsUrl = `/amms?currency=${encodeURIComponent(token.currency)}&currencyIssuer=${encodeURIComponent(token.issuer)}`
  const renderAssets = (amm) => (
    <span className="tokenTopAmmAssets">
      <AmountWithIcon amount={amm.amount} options={{ short: true, maxFractionDigits: 6 }} />
      <AmountWithIcon amount={amm.amount2} options={{ short: true, maxFractionDigits: 6 }} />
    </span>
  )
  const renderTvl = (amm) => {
    const values = [
      tokenPreviewAmountFiatValue(amm.amount, selectedCurrency, fiatRate),
      tokenPreviewAmountFiatValue(amm.amount2, selectedCurrency, fiatRate)
    ]
    if (values.some((value) => value === null)) return '-'
    const tvl = values[0] + values[1]
    return (
      <span className="tokenTopAmmTvl tooltip" suppressHydrationWarning>
        ≈ {shortNiceNumber(tvl, 2, 1, selectedCurrency)}
        <span className="tooltiptext no-brake">{fullNiceNumber(tvl, selectedCurrency)}</span>
      </span>
    )
  }

  return (
    <section className="tokenTopAmmsCard tokenActivityCard" id="token-amms">
      <div className="ammContributorsHeader">
        <div>
          <h2>
            {t('previews.ammsTitle')}
            {totalPools !== undefined && totalPools !== null ? (
              <span className="ammContributorsCount">{niceNumber(totalPools)}</span>
            ) : null}
          </h2>
          <span>{t('previews.ammsSubtitle')}</span>
        </div>
        <Link href={ammsUrl} prefetch={false}>
          {t('previews.viewAllAmms')}
        </Link>
      </div>
      {loading ? (
        <div className="tokenChartEmpty">
          <span className="waiting"></span>
        </div>
      ) : rows.length ? (
        <div className="tokenTopAmmList">
          <div className="tokenTopAmmHeader">
            <span></span>
            <span>{t('previews.pool')}</span>
            <span>{t('previews.assets')}</span>
            <span>{t('previews.tvl')}</span>
            <span>{t('previews.holders')}</span>
            <span>{t('previews.tradingFee')}</span>
          </div>
          {rows.map((amm, index) => (
            <Link href={`/amm/${amm.ammID}`} className="tokenTopAmmRow" key={amm.ammID || index} prefetch={false}>
              <span className="ammVoteRank">{index + 1}</span>
              <span className="tokenTopAmmPool">
                <CurrencyWithIcon
                  options={{ disableTokenLink: true }}
                  token={{
                    ...amm.lpTokenBalance,
                    currencyDetails: {
                      type: 'lp_token',
                      ammID: amm.ammID,
                      asset: amm.amount,
                      asset2: amm.amount2,
                      currency:
                        niceCurrency(amm.amount?.currency || nativeCurrency) +
                        '/' +
                        niceCurrency(amm.amount2?.currency || nativeCurrency)
                    }
                  }}
                />
              </span>
              {renderAssets(amm)}
              <span className="tokenTopAmmTvlCell">{renderTvl(amm)}</span>
              <span className="tokenTopAmmHolders">
                <span className="tokenTopAmmMobileLabel">{t('previews.holders')}</span>
                {niceNumber(amm.holders || 0)}
              </span>
              <span className="tokenTopAmmFee">
                <span className="tokenTopAmmMobileLabel">{t('previews.tradingFee')}</span>
                {showAmmPercents(amm.tradingFee)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="tokenChartEmpty">{t('previews.unavailable')}</div>
      )}
    </section>
  )
}

export default function TokenPage({
  initialData,
  initialErrorMessage,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  fiatRate: fiatRateApp,
  fiatRateServer,
  setSignRequest,
  account,
  isSsrMobile,
  initialAmmData,
  initialAmmSwapsData,
  initialAmmChartData,
  initialAmmLpTokenData,
  initialAmmLpChartData,
  initialAmmContributorsData,
  initialAmmErrorMessage,
  initialHoldersPreviewData,
  initialAmmsPreviewData
}) {
  const router = useRouter()
  const { t: tt } = useTranslation('token')
  const [token, setToken] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState(initialData)
  const [dexSwaps, setDexSwaps] = useState([])
  const [transfers, setTransfers] = useState([])
  const [mints, setMints] = useState([])
  const [burns, setBurns] = useState([])
  const [dexSwapsLoading, setDexSwapsLoading] = useState(!!initialData)
  const [transfersLoading, setTransfersLoading] = useState(!!initialData)
  const [mintsLoading, setMintsLoading] = useState(!!initialData)
  const [burnsLoading, setBurnsLoading] = useState(!!initialData)
  const [dexSwapsRefreshHidden, setDexSwapsRefreshHidden] = useState(false)
  const [transfersRefreshHidden, setTransfersRefreshHidden] = useState(false)
  const [mintsRefreshHidden, setMintsRefreshHidden] = useState(false)
  const [burnsRefreshHidden, setBurnsRefreshHidden] = useState(false)
  const [dexSwapsRefreshSeconds, setDexSwapsRefreshSeconds] = useState(0)
  const [transfersRefreshSeconds, setTransfersRefreshSeconds] = useState(0)
  const [mintsRefreshSeconds, setMintsRefreshSeconds] = useState(0)
  const [burnsRefreshSeconds, setBurnsRefreshSeconds] = useState(0)
  const [dexSwapsOrder, setDexSwapsOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [transfersOrder, setTransfersOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [mintsOrder, setMintsOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [burnsOrder, setBurnsOrder] = useState(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)
  const [showMptMetadata, setShowMptMetadata] = useState(false)
  const [showToml, setShowToml] = useState(false)
  const [tokenChartRows, setTokenChartRows] = useState([])
  const [holdersPreviewData, setHoldersPreviewData] = useState(initialHoldersPreviewData || null)
  const [ammsPreviewData, setAmmsPreviewData] = useState(initialAmmsPreviewData || null)
  const [tokenPreviewsLoading, setTokenPreviewsLoading] = useState(false)
  const [tokenPreviewsDataKey, setTokenPreviewsDataKey] = useState(
    tokenPreviewDataKey(initialData, selectedCurrencyServer)
  )
  const errorMessage = initialErrorMessage || ''
  const tokenErrorTranslations = {
    'Token not found': tt('errors.notFound'),
    'Failed to fetch token data': tt('errors.failedFetch'),
    'Invalid issuer address or username': tt('errors.invalidIssuer'),
    'Invalid currency code': tt('errors.invalidCurrency')
  }
  const tokenErrorText = errorMessage?.startsWith('Invalid token URL.')
    ? tt('errors.invalidUrl', { nativeCurrency })
    : tokenErrorTranslations[errorMessage] || errorMessage
  const firstRenderRef = useRef(true)
  const dexSwapsRequestRef = useRef(0)
  const transfersRequestRef = useRef(0)
  const mintsRequestRef = useRef(0)
  const burnsRequestRef = useRef(0)
  const dexSwapsRefreshTimeoutRef = useRef(null)
  const transfersRefreshTimeoutRef = useRef(null)
  const mintsRefreshTimeoutRef = useRef(null)
  const burnsRefreshTimeoutRef = useRef(null)
  const dexSwapsRefreshIntervalRef = useRef(null)
  const transfersRefreshIntervalRef = useRef(null)
  const mintsRefreshIntervalRef = useRef(null)
  const burnsRefreshIntervalRef = useRef(null)
  const tokenPreviewsRequestRef = useRef(0)
  const handleTokenChartRows = useCallback((rows) => {
    setTokenChartRows(Array.isArray(rows) ? rows : [])
  }, [])

  let selectedCurrency = selectedCurrencyServer
  let fiatRate = fiatRateServer

  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }
  const isNativeToken = !!token && !token.issuer && token.currency === nativeCurrency
  const showTokenPreviews = tokenSupportsPreviews(token)
  const showHoldersPreview = tokenSupportsHoldersPreview(token)
  const showAmmsPreview = tokenSupportsAmmsPreview(token)
  const showMintActivity = !isNativeToken || xahauNetwork

  // Redirect if no token data
  useEffect(() => {
    if (!initialData && !initialErrorMessage) {
      router.push('/tokens')
    }
  }, [initialData, initialErrorMessage, router])

  const getData = async () => {
    setLoading(true)
    const cur = selectedCurrency?.toLowerCase()
    if (!cur) return
    const selectedMptId = selectedToken?.mptokenIssuanceID
    const url = selectedMptId
      ? `v2/token/${encodeURIComponent(selectedMptId)}?statistics=true&currencyDetails=true&convertCurrencies=${cur}`
      : selectedToken?.issuer
        ? `v2/token/${encodeURIComponent(selectedToken.issuer)}/${encodeURIComponent(selectedToken.currency)}?statistics=true&currencyDetails=true&convertCurrencies=${cur}&toml=true`
        : `v2/token/${nativeCurrency}?statistics=true&convertCurrencies=${cur}`
    const res = await axiosServer({
      method: 'get',
      url
    }).catch((error) => {
      initialErrorMessage = error.message
    })
    setToken(res.data)
    setLoading(false)
  }

  useEffect(() => {
    // Skip fetch on first render for pages that get on the server side
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, selectedToken])

  const fetchTokenPreviews = useCallback(
    async (currentToken, currentCurrency) => {
      const key = tokenPreviewDataKey(currentToken, currentCurrency)
      if (!key) {
        setHoldersPreviewData(null)
        setAmmsPreviewData(null)
        setTokenPreviewsDataKey('')
        setTokenPreviewsLoading(false)
        return
      }
      if (key === tokenPreviewsDataKey) return

      const requestId = tokenPreviewsRequestRef.current + 1
      tokenPreviewsRequestRef.current = requestId
      setTokenPreviewsLoading(true)

      const [holdersResult, ammsResult] = await Promise.allSettled([
        axios(tokenHoldersPreviewUrl(currentToken, currentCurrency)),
        tokenSupportsAmmsPreview(currentToken) ? axios(tokenAmmsPreviewUrl(currentToken)) : Promise.resolve(null)
      ])

      if (tokenPreviewsRequestRef.current !== requestId) return

      setHoldersPreviewData(holdersResult.status === 'fulfilled' ? holdersResult.value?.data || null : null)
      setAmmsPreviewData(ammsResult.status === 'fulfilled' ? ammsResult.value?.data || null : null)
      setTokenPreviewsDataKey(key)
      setTokenPreviewsLoading(false)
    },
    [tokenPreviewsDataKey]
  )

  useEffect(() => {
    fetchTokenPreviews(token, selectedCurrency)
  }, [fetchTokenPreviews, selectedCurrency, token])

  const fetchDexSwaps = useCallback(
    async ({ clear = false } = {}) => {
      if (!token) {
        setDexSwapsLoading(false)
        return
      }
      const requestId = dexSwapsRequestRef.current + 1
      dexSwapsRequestRef.current = requestId
      if (clear) {
        setDexSwaps([])
      }
      setDexSwapsLoading(true)

      const orderQuery = dexSwapsOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'dex', DEX_SWAPS_LIMIT) + orderQuery).catch(() => null)

      if (dexSwapsRequestRef.current !== requestId) return

      setDexSwaps(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, DEX_SWAPS_LIMIT) : [])
      setDexSwapsLoading(false)
    },
    [dexSwapsOrder, token]
  )

  const fetchTransfers = useCallback(
    async ({ clear = false } = {}) => {
      if (!token) {
        setTransfersLoading(false)
        return
      }
      const requestId = transfersRequestRef.current + 1
      transfersRequestRef.current = requestId
      if (clear) {
        setTransfers([])
      }
      setTransfersLoading(true)

      const orderQuery = transfersOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'transfer', 10) + orderQuery).catch(() => null)

      if (transfersRequestRef.current !== requestId) return

      setTransfers(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 10) : [])
      setTransfersLoading(false)
    },
    [token, transfersOrder]
  )

  const fetchMints = useCallback(
    async ({ clear = false } = {}) => {
      if (!token || !showMintActivity) {
        setMints([])
        setMintsLoading(false)
        return
      }
      const requestId = mintsRequestRef.current + 1
      mintsRequestRef.current = requestId
      if (clear) {
        setMints([])
      }
      setMintsLoading(true)

      const orderQuery = mintsOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'mint', 10) + orderQuery).catch(() => null)

      if (mintsRequestRef.current !== requestId) return

      setMints(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 10) : [])
      setMintsLoading(false)
    },
    [mintsOrder, showMintActivity, token]
  )

  const fetchBurns = useCallback(
    async ({ clear = false } = {}) => {
      if (!token) {
        setBurnsLoading(false)
        return
      }
      const requestId = burnsRequestRef.current + 1
      burnsRequestRef.current = requestId
      if (clear) {
        setBurns([])
      }
      setBurnsLoading(true)

      const orderQuery = burnsOrder === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? '&order=amountHigh' : ''
      const response = await axios(tokenSwapsUrl(token, 'burn', 10) + orderQuery).catch(() => null)

      if (burnsRequestRef.current !== requestId) return

      setBurns(Array.isArray(response?.data?.swaps) ? response.data.swaps.slice(0, 10) : [])
      setBurnsLoading(false)
    },
    [burnsOrder, token]
  )

  const clearRefreshCooldown = useCallback((timeoutRef, intervalRef, setHidden, setSeconds) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setHidden(false)
    setSeconds(0)
  }, [])

  const startRefreshCooldown = useCallback((timeoutRef, intervalRef, setHidden, setSeconds) => {
    setHidden(true)
    setSeconds(Math.ceil(REFRESH_COOLDOWN_MS / 1000))
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setSeconds((seconds) => Math.max(seconds - 1, 0))
    }, 1000)
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setHidden(false)
      setSeconds(0)
      timeoutRef.current = null
    }, REFRESH_COOLDOWN_MS)
  }, [])

  const refreshDexSwaps = useCallback(() => {
    startRefreshCooldown(
      dexSwapsRefreshTimeoutRef,
      dexSwapsRefreshIntervalRef,
      setDexSwapsRefreshHidden,
      setDexSwapsRefreshSeconds
    )
    fetchDexSwaps()
  }, [fetchDexSwaps, startRefreshCooldown])

  const refreshTransfers = useCallback(() => {
    startRefreshCooldown(
      transfersRefreshTimeoutRef,
      transfersRefreshIntervalRef,
      setTransfersRefreshHidden,
      setTransfersRefreshSeconds
    )
    fetchTransfers()
  }, [fetchTransfers, startRefreshCooldown])

  const refreshMints = useCallback(() => {
    startRefreshCooldown(
      mintsRefreshTimeoutRef,
      mintsRefreshIntervalRef,
      setMintsRefreshHidden,
      setMintsRefreshSeconds
    )
    fetchMints()
  }, [fetchMints, startRefreshCooldown])

  const refreshBurns = useCallback(() => {
    startRefreshCooldown(
      burnsRefreshTimeoutRef,
      burnsRefreshIntervalRef,
      setBurnsRefreshHidden,
      setBurnsRefreshSeconds
    )
    fetchBurns()
  }, [fetchBurns, startRefreshCooldown])

  useEffect(() => {
    clearRefreshCooldown(
      dexSwapsRefreshTimeoutRef,
      dexSwapsRefreshIntervalRef,
      setDexSwapsRefreshHidden,
      setDexSwapsRefreshSeconds
    )
    fetchDexSwaps()
  }, [clearRefreshCooldown, fetchDexSwaps])

  useEffect(() => {
    clearRefreshCooldown(
      transfersRefreshTimeoutRef,
      transfersRefreshIntervalRef,
      setTransfersRefreshHidden,
      setTransfersRefreshSeconds
    )
    fetchTransfers()
  }, [clearRefreshCooldown, fetchTransfers])

  useEffect(() => {
    clearRefreshCooldown(
      mintsRefreshTimeoutRef,
      mintsRefreshIntervalRef,
      setMintsRefreshHidden,
      setMintsRefreshSeconds
    )
    fetchMints()
  }, [clearRefreshCooldown, fetchMints])

  useEffect(() => {
    clearRefreshCooldown(
      burnsRefreshTimeoutRef,
      burnsRefreshIntervalRef,
      setBurnsRefreshHidden,
      setBurnsRefreshSeconds
    )
    fetchBurns()
  }, [clearRefreshCooldown, fetchBurns])

  useEffect(
    () => () => {
      clearRefreshCooldown(
        dexSwapsRefreshTimeoutRef,
        dexSwapsRefreshIntervalRef,
        setDexSwapsRefreshHidden,
        setDexSwapsRefreshSeconds
      )
      clearRefreshCooldown(
        transfersRefreshTimeoutRef,
        transfersRefreshIntervalRef,
        setTransfersRefreshHidden,
        setTransfersRefreshSeconds
      )
      clearRefreshCooldown(
        mintsRefreshTimeoutRef,
        mintsRefreshIntervalRef,
        setMintsRefreshHidden,
        setMintsRefreshSeconds
      )
      clearRefreshCooldown(
        burnsRefreshTimeoutRef,
        burnsRefreshIntervalRef,
        setBurnsRefreshHidden,
        setBurnsRefreshSeconds
      )
    },
    [clearRefreshCooldown]
  )

  useEffect(() => {
    if (!selectedToken?.currency) return
    const { pathname, query } = router
    const selectedMptId = selectedToken?.mptokenIssuanceID
    query.id = selectedMptId
      ? [selectedMptId]
      : selectedToken?.issuer
        ? [selectedToken.issuer, selectedToken.currency]
        : [selectedToken.currency]
    router.replace({ pathname, query }, null, { shallow: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken])

  const renderValueStack = ({ primary, secondaryLines = [] }) => (
    <span className="tokenValueStack">
      <span className="tokenValuePrimary" suppressHydrationWarning>
        {primary}
      </span>
      {secondaryLines.filter(Boolean).map((line, index) => (
        <span key={index} className="tokenValueSecondary" suppressHydrationWarning>
          {line}
        </span>
      ))}
    </span>
  )

  // Helper: price value with fiat primary and ledger rates as secondary lines.
  const priceLine = ({ priceNative, priceFiat }) => {
    const price = priceNative
    const currencyText = token?.currencyDetails?.currency || displayCurrencyCode(token?.currency) || nativeCurrency
    const isNativeFromToken = !token?.issuer && token?.currency === nativeCurrency
    const nativePrice =
      price < 0.0001 ? (
        <>
          1M {currencyText} = {niceNumber(price * 1000000, 6)} {nativeCurrency}
        </>
      ) : (
        <>
          {niceNumber(price, 6)} {nativeCurrency}
        </>
      )

    return renderValueStack({
      primary: niceNumber(priceFiat || 0, 4, selectedCurrency),
      secondaryLines: isNativeFromToken
        ? []
        : [
            nativePrice,
            <span key="rate">
              1 {nativeCurrency} = {niceNumber(1 / price, 6)} {currencyText}
            </span>
          ]
    })
  }

  const marketcapLine = ({ marketcap }) => {
    if (!fiatRate || !marketcap) return null
    const marketcapFiat = marketcap * fiatRate
    return renderValueStack({
      primary: niceNumber(marketcapFiat, 2, selectedCurrency),
      secondaryLines: [
        <span key="native">
          {niceNumber(marketcap, 2)} {nativeCurrency}
        </span>
      ]
    })
  }

  const volumeLine = ({ token, type }) => {
    const { statistics, currencyDetails } = token
    if (!fiatRate) return null
    let volume
    if (!type || type === 'total') {
      volume = Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    } else {
      volume = statistics?.[type + 'Volume'] || 0
    }
    const priceInNative = statistics?.priceNativeCurrency ?? (token?.issuer ? 0 : 1)
    const volumeFiat = volume * priceInNative * fiatRate || 0
    return renderValueStack({
      primary: niceNumber(volumeFiat, 2, selectedCurrency),
      secondaryLines: [
        <span key="token">
          {niceNumber(volume, 2)} {currencyDetails?.currency || displayCurrencyCode(token?.currency) || nativeCurrency}
        </span>
      ]
    })
  }

  const renderPercentCell = ({ currentPrice, pastPrice }) => {
    const current = Number(currentPrice || 0)
    const past = Number(pastPrice || 0)
    if (!current || !past) return <span className="ammMetricDelta ammMetricDelta-flat">--%</span>
    const change = current / past - 1
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    const percentText = niceNumber(Math.abs(change * 100), 2) + '%'

    return (
      <span className={`ammMetricDelta ammMetricDelta-${direction} tooltip`} suppressHydrationWarning>
        {change >= 0 ? '+' : '-'}
        {percentText}
        <span className="tooltiptext right no-brake" suppressHydrationWarning>
          {tt('tooltips.now')}: {fullNiceNumber(currentPrice, selectedCurrency)}
          <br />
          {tt('tooltips.before')}: {fullNiceNumber(pastPrice, selectedCurrency)}
        </span>
      </span>
    )
  }

  const chartNumber = (value) => {
    if (value === undefined || value === null || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  const chartIntegerValue = (value) => {
    const number = chartNumber(value)
    return number === null ? null : fullNiceNumber(number)
  }

  const latestTokenChartRow = tokenChartRows[tokenChartRows.length - 1] || {}
  const previousTokenChartRow = tokenChartRows[tokenChartRows.length - 2] || {}
  const hasNativeAccountChartStats =
    isNativeToken && ['holders', 'total', 'activations', 'deleted'].some((field) => chartNumber(latestTokenChartRow[field]) !== null)
  const hasIssuedTokenHolderChartStats =
    !isNativeToken && ['holders', 'trustlines'].some((field) => chartNumber(latestTokenChartRow[field]) !== null)
  const chartFiatValue = (row, field = 'priceFiats') => chartNumber(row?.[field]?.[selectedCurrency?.toLowerCase()])
  const chartSplitOrTotal = (row, totalField, splitFields = []) => {
    const splitValues = splitFields.map((field) => chartNumber(row?.[field])).filter((value) => value !== null)
    if (splitValues.length) return splitValues.reduce((sum, value) => sum + value, 0)
    return chartNumber(row?.[totalField])
  }
  const chartDexes = (row) => chartSplitOrTotal(row, 'dexes', ['ammDexes', 'offerDexes'])
  const chartDexTxs = (row) => chartSplitOrTotal(row, 'dexTxs', ['ammTxs', 'offerTxs'])
  const chartBuyVolume = (row) => chartSplitOrTotal(row, 'buyVolume', ['ammBuyVolume', 'offerBuyVolume'])
  const chartSellVolume = (row) => chartSplitOrTotal(row, 'sellVolume', ['ammSellVolume', 'offerSellVolume'])
  const chartTotalVolume = (row) => {
    const buy = chartBuyVolume(row)
    const sell = chartSellVolume(row)
    if (buy === null && sell === null) return null
    return (buy || 0) + (sell || 0)
  }
  const chartVolumeFiatValue = (row, amount) => {
    const volume = chartNumber(amount)
    if (volume === null) return null
    const price = chartFiatValue(row)
    return price === null ? null : volume * price
  }
  const currentVolumeAmount = (type) => {
    if (!type || type === 'total') return Number(statistics?.buyVolume || 0) + Number(statistics?.sellVolume || 0)
    return chartNumber(statistics?.[type + 'Volume']) || 0
  }
  const currentVolumeFiatValue = (type) => {
    if (!fiatRate) return null
    const priceInNative = statistics?.priceNativeCurrency ?? (token?.issuer ? 0 : 1)
    return currentVolumeAmount(type) * priceInNative * fiatRate || null
  }

  const metricDeltaPct = (cur, prev) => {
    const current = chartNumber(cur)
    const previous = chartNumber(prev)
    if (current === null || previous === null) return null
    if (previous === 0) return current === 0 ? 0 : null
    if (previous < 0) return null
    return ((current - previous) / previous) * 100
  }

  const formatMetricDelta = (pct) => {
    if (!Number.isFinite(pct)) return null
    if (pct === 0) return '0%'

    const abs = Math.abs(pct)
    const sign = pct > 0 ? '+' : '-'
    const displayAbs =
      abs < 0.001
        ? '0.001'
        : abs < 0.01
          ? abs.toFixed(3)
          : abs < 1
            ? abs.toFixed(2)
            : abs < 100
              ? abs.toFixed(1)
              : shortNiceNumber(abs, 1, 0)

    return `${sign}${displayAbs.replace(/\.?0+$/, '')}%`
  }

  const renderMetricDelta = (cur, prev, options = {}) => {
    const pct = metricDeltaPct(cur, prev)
    const text = formatMetricDelta(pct)
    if (!text) return null

    const colorPct = options.invertColor ? -pct : pct
    const direction = colorPct > 0 ? 'up' : colorPct < 0 ? 'down' : 'flat'
    return <span className={`ammMetricDelta ammMetricDelta-${direction}`}>{text}</span>
  }

  if (errorMessage) {
    return (
      <>
        <SEO title={tt('errors.notFound')} />
        <div className="center">
          <h1>{tt('errors.notFound')}</h1>
          <p>{tokenErrorText}</p>
          <Link href="/tokens" className="button-action">
            {tt('errors.viewAllTokens')}
          </Link>
          <br />
          <br />
        </div>
      </>
    )
  }

  if (!token) {
    return (
      <>
        <SEO title={tt('errors.loadingTitle')} />
        <div className="center">
          <h1>{tt('errors.loading')}</h1>
        </div>
      </>
    )
  }

  const { statistics } = token
  const mptId = token?.mptokenIssuanceID
  const isMptToken = !!mptId
  const mptMetadata = token?.metadata && typeof token.metadata === 'object' && !Array.isArray(token.metadata) ? token.metadata : {}
  const mptMetadataTicker = mptMetadataValue(mptMetadata, 'ticker', 't')
  const mptMetadataName = mptMetadataValue(mptMetadata, 'name', 'n')
  const mptMetadataDescription = mptMetadataValue(mptMetadata, 'description', 'desc', 'd')
  const mptMetadataAssetClass = mptMetadataValue(mptMetadata, 'asset_class', 'ac')
  const mptMetadataAssetSubclass = mptMetadataValue(mptMetadata, 'asset_subclass', 'as')
  const mptMetadataIssuerName = mptMetadataValue(mptMetadata, 'issuer_name', 'in')
  const mptMetadataUris = mptMetadataValue(mptMetadata, 'uris', 'us')
  const hasTomlData = !!token?.rawtoml
  const tomlToken = tokenTomlEntry(token)
  const tomlTokenAssetClass = mptMetadataValue(tomlToken, 'asset_class')
  const tomlTokenAssetSubclass = mptMetadataValue(tomlToken, 'asset_subclass')
  const tomlTokenLinks = [
    ...(Array.isArray(tomlToken?.URLS) ? tomlToken.URLS : []),
    ...(Array.isArray(tomlToken?.WEBLINKS) ? tomlToken.WEBLINKS : [])
  ]
  const isRoundTokenImage = !!token?.issuer || isMptToken || isNativeToken
  const tokenDisplayCurrency = isMptToken
    ? mptMetadataName || mptMetadataTicker || token?.currency || 'MPT'
    : token?.currencyDetails?.currency || token?.currency || nativeCurrency
  const tokenPreviewName = isMptToken
    ? mptMetadataName || mptMetadataTicker || tokenDisplayCurrency
    : token?.name || tomlToken?.name || tokenDisplayCurrency
  const tokenPreviewTicker = isMptToken
    ? mptMetadataTicker || token?.currency || ''
    : token?.currencyDetails?.currency || displayCurrencyCode(token?.currency) || tokenDisplayCurrency
  const tokenPreviewPrice =
    statistics?.priceFiatsSpot?.[selectedCurrency] ??
    statistics?.priceFiatsSpot?.[selectedCurrency?.toLowerCase?.()] ??
    statistics?.priceFiats?.[selectedCurrency] ??
    statistics?.priceFiats?.[selectedCurrency?.toLowerCase?.()] ??
    (isNativeToken ? fiatRate : null)
  const rawTokenPreviewImage = tokenImageSrc(token, 400)
  const tokenPreviewIcon = rawTokenPreviewImage?.startsWith('/') ? `${server}${rawTokenPreviewImage}` : rawTokenPreviewImage
  const tokenPreviewParams = {
    name: tokenPreviewName,
    ticker: tokenPreviewTicker,
    image: tokenPreviewIcon,
    fiat: selectedCurrency || 'usd',
    v: '1',
    ...(tokenPreviewPrice ? { price: String(tokenPreviewPrice) } : {})
  }
  const tokenPreviewImage = {
    width: 1200,
    height: 630,
    file: `${server}/nextapi/token-preview?${new URLSearchParams(tokenPreviewParams).toString()}`
  }
  const tokenTwitterImage = {
    file: `${server}/nextapi/token-preview?${new URLSearchParams({ ...tokenPreviewParams, shape: 'square' }).toString()}`
  }
  const tokenSupplyTitle = isMptToken
    ? tokenDisplayCurrency
    : token?.currencyDetails?.currency || niceCurrency(token?.currency) || tokenDisplayCurrency
  const tokenIssuerLink = addressUsernameOrServiceLink(token, 'issuer')
  const currencyCodeText = token.currencyDetails?.currencyCode || token.currency
  const currencyCodeDisplay = displayCurrencyCode(currencyCodeText)
  const effectiveNativePrice = statistics?.priceNativeCurrency ?? (isNativeToken ? 1 : null)
  const escrowStatus =
    token?.canLock === true ? (
      <span className="bold">{tt('escrow.can')}</span>
    ) : token?.canLock === false ? (
      tt('escrow.cannot')
    ) : (
      tt('escrow.unknown')
    )
  const changeItems = [
    {
      key: '5m',
      label: '5m',
      pastPrice: statistics?.priceFiats5m?.[selectedCurrency],
      hasData: statistics?.priceFiats5m?.[selectedCurrency] !== undefined
    },
    {
      key: '1h',
      label: '1h',
      pastPrice: statistics?.priceFiats1h?.[selectedCurrency],
      hasData: statistics?.priceFiats1h?.[selectedCurrency] !== undefined
    },
    {
      key: '24h',
      label: '24h',
      pastPrice: statistics?.priceFiats24h?.[selectedCurrency],
      hasData: statistics?.priceFiats24h?.[selectedCurrency] !== undefined
    },
    {
      key: '7d',
      label: '7d',
      pastPrice: statistics?.priceFiats7d?.[selectedCurrency],
      hasData: statistics?.priceFiats7d?.[selectedCurrency] !== undefined
    }
  ].filter((item) => item.hasData)
  const showPriceInformation =
    loading ||
    effectiveNativePrice ||
    changeItems.length > 0 ||
    statistics?.priceNativeCurrencySpot ||
    statistics?.marketcap
  const overviewTopCardCount = 1 + (showPriceInformation ? 1 : 0) + 1 + (statistics ? 1 : 0)

  // Helper function to format supply for trustline
  const formatSupply = (supply) => {
    if (!supply) return '1000000000'
    const num = parseFloat(supply)
    if (isNaN(num)) return '1000000000'
    return num.toFixed(6)
  }

  // Handle set trustline
  const handleSetTrustline = () => {
    if (!setSignRequest) return

    setSignRequest({
      request: {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: token.currency,
          issuer: token.issuer,
          value: formatSupply(token.supply)
        },
        Flags: 131072
      }
    })
  }

  const handleAuthorizeMpt = () => {
    if (!setSignRequest || !mptId) return
    setSignRequest({
      request: {
        TransactionType: 'MPTokenAuthorize',
        MPTokenIssuanceID: mptId
      }
    })
  }

  const isLpToken = token?.currencyDetails?.type === 'lp_token'
  const lpAmmId = token?.currencyDetails?.ammID
  const lpAsset = token?.currencyDetails?.asset
  const lpAsset2 = token?.currencyDetails?.asset2
  const renderLpAsset = (asset) => {
    if (!asset) return ''
    if (asset?.currency === nativeCurrency) {
      return <span className="bold">{nativeCurrency}</span>
    }
    return <CurrencyWithIconInline token={asset} link={true} showIssuer={true} />
  }
  const getActivityAmountParts = (amount) => {
    const parsed = amountParced(amount)
    if (!parsed) return null

    return {
      value: [shortNiceNumber(parsed.value, 2, 1), parsed.valuePrefix].filter(Boolean).join(' '),
      currency: parsed.currency
    }
  }

  const renderActivityAmount = (amount) => {
    const parts = getActivityAmountParts(amount)
    if (!parts) return ''
    const title = [parts.value, parts.currency].filter(Boolean).join(' ')

    return (
      <span className="tokenActivityAmountLine" title={title}>
        <span className="tokenActivityAmountValue">{parts.value}</span>
        {parts.currency ? <span className="tokenActivityAmountCurrency">{parts.currency}</span> : null}
      </span>
    )
  }
  const hasActivityValue = (value) => value !== undefined && value !== null && value !== ''
  const activityAddressShort = isSsrMobile ? 3 : 8
  const activityAddressOptions = { short: activityAddressShort, noLink: true }

  const isPageTokenAmount = (amount) => {
    const parsed = amountParced(amount)
    if (!parsed) return false

    if (mptId) {
      return parsed.originalCurrency === mptId || amount?.mpt_issuance_id === mptId
    }

    if (isNativeToken) {
      return parsed.originalCurrency === nativeCurrency && !amount?.issuer
    }

    return parsed.originalCurrency === token?.currency && amount?.issuer === token?.issuer
  }

  const getSwapPrice = (row) => {
    const parsedAmount1 = amountParced(row.amount1)
    const parsedAmount2 = amountParced(row.amount2)
    if (!parsedAmount1 || !parsedAmount2) return null

    const amount1IsPageToken = isPageTokenAmount(row.amount1)
    const amount2IsPageToken = isPageTokenAmount(row.amount2)
    const base = amount1IsPageToken ? parsedAmount1 : amount2IsPageToken ? parsedAmount2 : parsedAmount1
    const quote = amount1IsPageToken ? parsedAmount2 : amount2IsPageToken ? parsedAmount1 : parsedAmount2
    const baseValue = Number(base.value)
    const quoteValue = Number(quote.value)

    if (!Number.isFinite(baseValue) || !Number.isFinite(quoteValue) || baseValue === 0) return null

    return {
      value: quoteValue / baseValue,
      currency: quote.currency
    }
  }

  const renderSwapSource = (row) => {
    if (row.ammID) return 'AMM'
    return 'DEX'
  }

  const renderDexSwapRow = (row, index) => {
    const swapPrice = getSwapPrice(row)

    return (
      <HomeTeaseRow
        key={`dex-${row.txHash || row.timestamp}-${row.ammID || row.offerID || 'swap'}-${index}`}
        href={`/tx/${row.txHash}`}
        className="tokenSwapRow"
      >
        <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
        <div className="tokenSwapFlow">
          <span className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell} tokenSwapFlowAddress`}>
            <AddressWithIconInline data={row} name="address1" options={activityAddressOptions} />
          </span>
          <span className={homeTeaserStyles.whaleArrow}>→</span>
          <span className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell} tokenSwapFlowAddress`}>
            <AddressWithIconInline data={row} name="address2" options={activityAddressOptions} />
          </span>
        </div>
        <div className="tokenSwapAmount">
          {renderActivityAmount(row.amount1)}
          {hasActivityValue(row.amount2) ? <span className="grey">{renderActivityAmount(row.amount2)}</span> : null}
        </div>
        <div className="tokenSwapPrice">
          <span className="tokenSwapPriceLabel">{tt('activity.rate')}</span>
          <span className="tokenSwapPriceValue">
            {swapPrice ? (
              <span className="tooltip">
                {shortNiceNumber(swapPrice.value, 6, 1)}
                <span className="tokenSwapPriceAsset" title={swapPrice.currency}>
                  {swapPrice.currency}
                </span>
                <span className="tooltiptext no-brake">
                  {fullNiceNumber(swapPrice.value)} {swapPrice.currency}
                </span>
              </span>
            ) : (
              '-'
            )}
          </span>
        </div>
        <div className="tokenSwapSource">
          <span className="tokenSwapSourcePill">{renderSwapSource(row)}</span>
        </div>
      </HomeTeaseRow>
    )
  }

  const renderTokenMovementRow = (row, index, type) => {
    const hasAddress1 = !!row.address1
    const hasAddress2 = !!row.address2
    const fallbackLabel = type === 'mint' ? tt('activity.mint') : type === 'burn' ? tt('activity.burn') : '-'
    const displayAmount = type === 'mint' && hasActivityValue(row.amount2) ? row.amount2 : row.amount1

    return (
      <HomeTeaseRow
        key={`${type}-${row.txHash || row.timestamp}-${row.address1 || ''}-${row.address2 || ''}-${index}`}
        href={`/tx/${row.txHash}`}
        className={`${homeTeaserStyles.whaleRow} tokenTransferRow`}
      >
        <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
        <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell}`}>
          {hasAddress1 ? (
            <AddressWithIconInline data={row} name="address1" options={activityAddressOptions} />
          ) : (
            <span className="grey">{fallbackLabel}</span>
          )}
        </div>
        <div className={homeTeaserStyles.whaleArrow}>→</div>
        <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell}`}>
          {hasAddress2 ? (
            <AddressWithIconInline data={row} name="address2" options={activityAddressOptions} />
          ) : (
            <span className="grey">{fallbackLabel}</span>
          )}
        </div>
        <div
          className={`${homeTeaserStyles.metric} ${homeTeaserStyles.metricWithDelta} ${homeTeaserStyles.whaleFiat} tokenTransferMetric`}
        >
          {renderActivityAmount(displayAmount)}
        </div>
      </HomeTeaseRow>
    )
  }

  const renderTransferRow = (row, index) => renderTokenMovementRow(row, index, 'transfer')
  const renderMintRow = (row, index) => renderTokenMovementRow(row, index, 'mint')
  const renderBurnRow = (row, index) => renderTokenMovementRow(row, index, 'burn')

  const renderActivityOrderToggle = (value, setValue) => (
    <>
      <button
        type="button"
        className={`${homeTeaserStyles.cardHeaderActionButton} ${
          value === TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH ? homeTeaserStyles.cardHeaderActionButtonActive : ''
        }`.trim()}
        onClick={() => setValue(TOKEN_ACTIVITY_ORDER_AMOUNT_HIGH)}
      >
        {tt('activity.largest24h')}
      </button>
      <button
        type="button"
        className={`${homeTeaserStyles.cardHeaderActionButton} ${
          value === TOKEN_ACTIVITY_ORDER_LATEST ? homeTeaserStyles.cardHeaderActionButtonActive : ''
        }`.trim()}
        onClick={() => setValue(TOKEN_ACTIVITY_ORDER_LATEST)}
      >
        {tt('activity.latest')}
      </button>
    </>
  )

  if (isLpToken && lpAmmId) {
    return (
      <AmmDetailsPage
        id={lpAmmId}
        initialData={initialAmmData}
        initialSwapsData={initialAmmSwapsData}
        initialChartData={initialAmmChartData}
        initialLpTokenData={initialAmmLpTokenData}
        initialLpChartData={initialAmmLpChartData}
        initialContributorsData={initialAmmContributorsData}
        initialErrorMessage={initialAmmErrorMessage}
        ledgerTimestampQuery=""
        isSsrMobile={isSsrMobile}
        fiatRate={fiatRateApp}
        selectedCurrency={selectedCurrencyApp}
        fiatRateServer={fiatRateServer}
        selectedCurrencyServer={selectedCurrencyServer}
        canonicalPath={`/amm/${lpAmmId}`}
        lpTokenData={token}
        showTopTabs={false}
        setSignRequest={setSignRequest}
        account={account}
      />
    )
  }

  const renderTokenActivityWidget = ({
    title,
    titleText,
    rows,
    rowRenderer,
    loading,
    onRefresh,
    isRefreshHidden = false,
    refreshCooldownSeconds = 0,
    headerActions = null,
    emptyText,
    limit = 5
  }) => {
    const visibleRows = Array.isArray(rows) ? rows.slice(0, limit) : []

    return (
      <HomeTeaser
        title={title}
        titleText={titleText}
        isLoading={loading && !visibleRows.length}
        isRefreshing={loading}
        onRefresh={onRefresh}
        isRefreshHidden={isRefreshHidden}
        refreshCooldownSeconds={refreshCooldownSeconds}
        headerActions={headerActions}
        isEmpty={!visibleRows.length}
        emptyText={emptyText}
        className={`${homeTeaserStyles.whaleCard} tokenActivityCard`}
      >
        {visibleRows.map(rowRenderer)}
      </HomeTeaser>
    )
  }

  const renderMetricTiles = (items) =>
    items
      .filter((item) => item.show !== false)
      .map(({ key, label, value, details = [], wide = false, delta = null, compactHeader = false }) => {
        const valueNode = value === undefined || value === null || value === '' ? '-' : value
        const visibleDetails = details.filter((detail) => detail.show !== false)

        return (
          <div key={key} className={wide ? 'tokenMetricWide' : undefined}>
            <span className={compactHeader ? 'tokenMetricDetail tokenMetricPrimaryDetail' : 'tokenMetricHeader'}>
              <span>{label}</span>
              {compactHeader ? (
                <span className="tokenMetricDetailValue">
                  <span>{valueNode}</span>
                  {delta}
                </span>
              ) : (
                delta
              )}
            </span>
            {!compactHeader ? <span className="tokenMetricValue">{valueNode}</span> : null}
            {visibleDetails.length ? (
              <span className="tokenMetricDetails">
                {visibleDetails.map((detail) => {
                  const detailValueNode =
                    detail.value === undefined || detail.value === null || detail.value === '' ? '-' : detail.value
                  return (
                    <span key={detail.key} className="tokenMetricDetail">
                      <span>{detail.label}</span>
                      <span className="tokenMetricDetailValue">
                        <span>{detailValueNode}</span>
                        {detail.delta}
                      </span>
                    </span>
                  )
                })}
              </span>
            ) : null}
          </div>
        )
      })

  const renderProfileRows = (items) =>
    items
      .filter((item) => item.show !== false)
      .map(({ key, label, value }) => {
        const valueNode = value === undefined || value === null || value === '' ? '-' : value

        return (
          <div key={key} className="tokenProfileInfoRow">
            <span>{label}</span>
            <span>{valueNode}</span>
          </div>
        )
      })

  const copiedProfileValue = (value, copyValue, copyText) => (
    <span className="tokenProfileCopiedValue">
      {value} <CopyButton text={copyValue} copyText={copyText} size={16} />
    </span>
  )

  const renderMetadataLinks = (uris, { uriKeys = ['uri', 'u'], titleKeys = ['title', 't'] } = {}) => {
    const uriItems = Array.isArray(uris) ? uris : [uris]
    const links = uriItems
      .map((item, index) => {
        const uri = typeof item === 'object' ? mptMetadataValue(item, ...uriKeys) : item
        if (!uri) return null

        const title = typeof item === 'object' ? mptMetadataValue(item, ...titleKeys) : ''
        const text = metadataDisplayValue(uri)

        return {
          key: `${text}-${index}`,
          href: metadataHttpHref(text),
          label: metadataDisplayValue(title || uri)
        }
      })
      .filter(Boolean)

    if (!links.length) return ''

    return (
      <span className="tokenProfileInlineValue">
        {links.map((item) => (
          <span key={item.key}>
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ) : (
              item.label
            )}
          </span>
        ))}
      </span>
    )
  }

  const mptMetadataLinks = renderMetadataLinks(mptMetadataUris)
  const tomlLinks = renderMetadataLinks(tomlTokenLinks, {
    uriKeys: ['url', 'uri', 'link'],
    titleKeys: ['title', 'type']
  })
  const mptMetadataCodeLabel = (group, fallbackMap, value) => {
    const code = metadataDisplayValue(value).trim().toLowerCase()
    if (!code) return ''
    return tt(`metadataValues.${group}.${code}`, { defaultValue: fallbackMap[code] || metadataDisplayValue(value) })
  }
  const mptMetadataAssetClassLabel = mptMetadataCodeLabel('assetClasses', MPT_ASSET_CLASS_LABELS, mptMetadataAssetClass)
  const mptMetadataAssetSubclassLabel = mptMetadataCodeLabel(
    'assetSubclasses',
    MPT_ASSET_SUBCLASS_LABELS,
    mptMetadataAssetSubclass
  )
  const tomlTokenAssetClassLabel = mptMetadataCodeLabel('assetClasses', MPT_ASSET_CLASS_LABELS, tomlTokenAssetClass)
  const tomlTokenAssetSubclassLabel = mptMetadataCodeLabel(
    'assetSubclasses',
    MPT_ASSET_SUBCLASS_LABELS,
    tomlTokenAssetSubclass
  )
  const renderPanel = ({ title, className = '', children }) => (
    <section className={`tokenPanel ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </section>
  )

  const renderChangeStrip = () => (
    <div className="tokenChangeBlock" aria-label={tt('fields.change')}>
      <div className="tokenChangeList">
        {changeItems.map((item) => (
          <span key={item.key} className="tokenChangeItem">
            <span className="tokenChangePeriod">{item.label}</span>
            <span className="tokenChangeValue">
              {renderPercentCell({ currentPrice: statistics?.priceFiats?.[selectedCurrency], pastPrice: item.pastPrice })}
            </span>
          </span>
        ))}
      </div>
    </div>
  )

  const holdersLink = isNativeToken ? (
    <Link href="/distribution">{fullNiceNumber(token.holders)}</Link>
  ) : showHoldersPreview ? (
    <a href="#token-holders" className="ammMetricQuietLink">
      {fullNiceNumber(token.holders)}
    </a>
  ) : (
    <Link
      href={
        '/distribution?currencyIssuer=' + token.issuer + '&currency=' + token.currencyDetails?.currencyCode
      }
    >
      {fullNiceNumber(token.holders)}
    </Link>
  )
  const ammPoolsLink = (
    showAmmsPreview ? (
      <a href="#token-amms" className="ammMetricQuietLink">
        {fullNiceNumber(statistics?.ammPools || 0)}
      </a>
    ) : (
      <Link
        href={
          isNativeToken
            ? '/amms'
            : token?.issuer
              ? `/amms?currency=${token.currency}&currencyIssuer=${token.issuer}`
              : `/amms?currency=${token.currency}`
        }
      >
        {fullNiceNumber(statistics?.ammPools || 0)}
      </Link>
    )
  )

  const tokenInfoItems = [
    {
      key: 'ammPool',
      label: tt('fields.ammPool'),
      value: lpAmmId ? <Link href={`/amm/${lpAmmId}`}>{tt('actions.viewPool')}</Link> : '-',
      show: isLpToken
    },
    { key: 'asset1', label: tt('fields.asset1'), value: renderLpAsset(lpAsset), show: isLpToken },
    { key: 'asset2', label: tt('fields.asset2'), value: renderLpAsset(lpAsset2), show: isLpToken },
    {
      key: 'name',
      label: tt('fields.name'),
      value: token.name || tomlToken?.name,
      show: !!(token?.name || tomlToken?.name) && (token.name || tomlToken?.name) !== tokenDisplayCurrency
    },
    {
      key: 'description',
      label: tt('fields.description'),
      value: token.description || tomlToken?.desc || tomlToken?.description || (isMptToken ? mptMetadataDescription : ''),
      show: !!(token?.description || tomlToken?.desc || tomlToken?.description || (isMptToken && mptMetadataDescription))
    },
    {
      key: 'issuerName',
      label: tt('fields.issuerName', { defaultValue: 'Issuer name' }),
      value: mptMetadataIssuerName,
      show: isMptToken && !!mptMetadataIssuerName
    },
    {
      key: 'assetClass',
      label: tt('fields.assetClass', { defaultValue: 'Asset class' }),
      value: isMptToken ? mptMetadataAssetClassLabel : tomlTokenAssetClassLabel,
      show: isMptToken ? !!mptMetadataAssetClass : !!tomlTokenAssetClass
    },
    {
      key: 'assetSubclass',
      label: tt('fields.assetSubclass', { defaultValue: 'Asset subclass' }),
      value: isMptToken ? mptMetadataAssetSubclassLabel : tomlTokenAssetSubclassLabel,
      show: isMptToken ? !!mptMetadataAssetSubclass : !!tomlTokenAssetSubclass
    },
    {
      key: 'relatedLinks',
      label: tt('fields.relatedLinks', { defaultValue: 'Related links' }),
      value: isMptToken ? mptMetadataLinks : tomlLinks,
      show: isMptToken ? !!mptMetadataLinks : !!tomlLinks
    },
    {
      key: 'mptId',
      label: tt('fields.mptId'),
      value: copiedProfileValue(mptId, mptId),
      show: isMptToken
    },
    {
      key: 'issuer',
      label: tt('fields.issuer'),
      value: copiedProfileValue(tokenIssuerLink, token.issuer),
      show: !isNativeToken
    },
    {
      key: 'currencyCode',
      label: tt('fields.currencyCode'),
      value: copiedProfileValue(currencyCodeDisplay, currencyCodeText, tt('tooltips.copyCurrencyCode')),
      show: !isMptToken
    },
    {
      key: 'tokenSequence',
      label: tt('fields.tokenSequence'),
      value: fullNiceNumber(token.sequence || 0),
      show: isMptToken
    },
    {
      key: 'created',
      label: tt('fields.created'),
      value: token.createdAt ? (
        <>
          {dateFormat(token.createdAt)} {timeFormat(token.createdAt)}
        </>
      ) : (
        '-'
      ),
      show: isMptToken
    },
    {
      key: 'lastUpdated',
      label: tt('fields.lastUpdated'),
      value: token.updatedAt ? (
        <>
          {dateFormat(token.updatedAt)} {timeFormat(token.updatedAt)}
        </>
      ) : (
        '-'
      ),
      show: isMptToken
    },
    {
      key: 'lastUsed',
      label: tt('fields.lastUsed'),
      value: token.lastUsedAt ? (
        <>
          {dateFormat(token.lastUsedAt)} {timeFormat(token.lastUsedAt)}
        </>
      ) : (
        '-'
      ),
      show: isMptToken
    },
    {
      key: 'flags',
      label: tt('fields.flags'),
      value: token.flags
        ? Object.keys(token.flags)
            .filter((flag) => token.flags[flag])
            .join(', ') || tt('values.noneSet')
        : tt('values.none'),
      show: isMptToken
    }
  ]

  const tokenSupplyItems = isMptToken
    ? [
        {
          key: 'outstanding',
          label: tt('fields.outstanding'),
          value: fullNiceNumber(Number(token.outstandingAmount || 0) / 10 ** (token.scale || 0) || 0)
        },
        {
          key: 'maxSupply',
          label: tt('fields.maxSupply'),
          value: fullNiceNumber(Number(token.maximumAmount || 0) / 10 ** (token.scale || 0) || 0)
        },
        {
          key: 'lockedAmount',
          label: tt('fields.lockedAmount'),
          value: fullNiceNumber(Number(token.lockedAmount || 0) / 10 ** (token.scale || 0) || 0)
        },
        { key: 'holders', label: tt('fields.holders'), value: fullNiceNumber(token.holders || 0) },
        {
          key: 'authorizedAddresses',
          label: tt('fields.authorizedAddresses'),
          value: fullNiceNumber(token.mptokens || 0)
        },
        {
          key: 'transferFee',
          label: tt('fields.transferFee'),
          value: token.transferFee ? token.transferFee / 1000 + '%' : tt('values.none')
        },
        { key: 'decimalPlaces', label: tt('fields.decimalPlaces'), value: token.scale || 0 }
      ]
    : [
        {
          key: 'supply',
          label: tt('fields.supply'),
          value: (
            <>
              {fullNiceNumber(token.supply)} {tokenDisplayCurrency}
            </>
          ),
          wide: true
        },
        {
          key: 'holders',
          label: tt('fields.holders'),
          value: holdersLink
        },
        {
          key: 'trustlines',
          label: tt('fields.trustlines'),
          value: fullNiceNumber(token.trustlines),
          show: !isNativeToken
        },
        {
          key: 'ammPools',
          label: tt('fields.ammPools'),
          value: ammPoolsLink,
          show: statistics && !xahauNetwork && !isMptToken
        },
        { key: 'escrow', label: tt('fields.escrow'), value: escrowStatus }
      ]

  const priceMetricItems = [
    {
      key: 'spotPrice',
      label: tt('fields.spotPrice'),
      value: priceLine({
        priceNative: statistics?.priceNativeCurrencySpot,
        priceFiat: statistics?.priceFiatsSpot?.[selectedCurrency]
      }),
      delta: renderMetricDelta(statistics?.priceFiatsSpot?.[selectedCurrency], chartFiatValue(latestTokenChartRow)),
      show: !!statistics?.priceNativeCurrencySpot
    },
    {
      key: 'marketCap',
      label: tt('fields.marketCap'),
      value: marketcapLine({ marketcap: statistics?.marketcap }),
      show: !!statistics?.marketcap
    }
  ]

  const stats24hItems = statistics
    ? [
        {
          key: 'activityCounts',
          label: tt('fields.trades'),
          value: fullNiceNumber(statistics?.dexes || 0),
          delta: renderMetricDelta(statistics?.dexes, chartDexes(latestTokenChartRow)),
          compactHeader: true,
          details: [
            {
              key: 'uniqueAccounts',
              label: tt('fields.uniqueAccounts'),
              value: fullNiceNumber(statistics?.uniqueAccounts || 0),
              delta: renderMetricDelta(statistics?.uniqueAccounts, latestTokenChartRow.uniqueAccounts)
            },
            {
              key: 'dexTxs',
              label: tt('fields.dexTxs'),
              value: fullNiceNumber(statistics?.dexTxs || 0),
              delta: renderMetricDelta(statistics?.dexTxs, chartDexTxs(latestTokenChartRow))
            },
            {
              key: 'ripplingTxs',
              label: tt('fields.ripplingTxs'),
              value: fullNiceNumber(statistics?.ripplingTxs || 0),
              delta: renderMetricDelta(statistics?.ripplingTxs, latestTokenChartRow.ripplingTxs),
              show: !isNativeToken
            }
          ]
        },
        {
          key: 'volumeTotal',
          label: tt('fields.volumeTotal'),
          value: volumeLine({ token, type: 'total' }),
          delta: renderMetricDelta(
            currentVolumeFiatValue('total'),
            chartVolumeFiatValue(latestTokenChartRow, chartTotalVolume(latestTokenChartRow))
          ),
          details: [
            {
              key: 'traders',
              label: tt('fields.traders'),
              value: fullNiceNumber(statistics?.uniqueDexAccounts || 0),
              delta: renderMetricDelta(statistics?.uniqueDexAccounts, latestTokenChartRow.uniqueDexAccounts)
            }
          ]
        },
        {
          key: 'volumeBuy',
          label: tt('fields.volumeBuy'),
          value: volumeLine({ token, type: 'buy' }),
          delta: renderMetricDelta(
            currentVolumeFiatValue('buy'),
            chartVolumeFiatValue(latestTokenChartRow, chartBuyVolume(latestTokenChartRow))
          ),
          details: [
            {
              key: 'buyers',
              label: tt('fields.buyers'),
              value: fullNiceNumber(statistics?.uniqueBuyers || 0),
              delta: renderMetricDelta(statistics?.uniqueBuyers, latestTokenChartRow.uniqueBuyers)
            }
          ]
        },
        {
          key: 'volumeSell',
          label: tt('fields.volumeSell'),
          value: volumeLine({ token, type: 'sell' }),
          delta: renderMetricDelta(
            currentVolumeFiatValue('sell'),
            chartVolumeFiatValue(latestTokenChartRow, chartSellVolume(latestTokenChartRow))
          ),
          details: [
            {
              key: 'sellers',
              label: tt('fields.sellers'),
              value: fullNiceNumber(statistics?.uniqueSellers || 0),
              delta: renderMetricDelta(statistics?.uniqueSellers, latestTokenChartRow.uniqueSellers)
            }
          ]
        },
        {
          key: 'transferVolume',
          label: tt('fields.transferVolume'),
          value: volumeLine({ token, type: 'transfer' }),
          delta: renderMetricDelta(
            currentVolumeFiatValue('transfer'),
            chartVolumeFiatValue(latestTokenChartRow, latestTokenChartRow.transferVolume)
          ),
          details: [
            {
              key: 'transferTransactions',
              label: tt('fields.transferTransactions'),
              value: niceNumber(statistics?.transferTxs || 0),
              delta: renderMetricDelta(statistics?.transferTxs, latestTokenChartRow.transferTxs)
            }
          ]
        },
        {
          key: 'mintVolume',
          label: tt('fields.mintVolume'),
          value: volumeLine({ token, type: 'mint' }),
          delta: renderMetricDelta(
            currentVolumeFiatValue('mint'),
            chartVolumeFiatValue(latestTokenChartRow, latestTokenChartRow.mintVolume)
          ),
          show: showMintActivity,
          details: [
            {
              key: 'mintTransactions',
              label: tt('fields.mintTransactions'),
              value: shortNiceNumber(statistics?.mintTxs || 0, 0, 1),
              delta: renderMetricDelta(statistics?.mintTxs, latestTokenChartRow.mintTxs)
            }
          ]
        },
        {
          key: 'burnVolume',
          label: tt('fields.burnVolume'),
          value: volumeLine({ token, type: 'burn' }),
          delta: renderMetricDelta(
            currentVolumeFiatValue('burn'),
            chartVolumeFiatValue(latestTokenChartRow, latestTokenChartRow.burnVolume)
          ),
          details: [
            {
              key: 'burnTransactions',
              label: tt('fields.burnTransactions'),
              value: shortNiceNumber(statistics?.burnTxs || 0, 0, 1),
              delta: renderMetricDelta(statistics?.burnTxs, latestTokenChartRow.burnTxs)
            }
          ]
        },
        {
          key: 'nativeAccounts',
          label: tt('fields.holders'),
          value: chartIntegerValue(latestTokenChartRow.holders),
          delta: renderMetricDelta(latestTokenChartRow.holders, previousTokenChartRow.holders),
          show: hasNativeAccountChartStats,
          compactHeader: true,
          details: [
            {
              key: 'totalAccounts',
              label: tt('charts.series.totalAccounts'),
              value: chartIntegerValue(latestTokenChartRow.total),
              delta: renderMetricDelta(latestTokenChartRow.total, previousTokenChartRow.total)
            },
            {
              key: 'activations',
              label: tt('charts.nativeAccountStats.activated'),
              value: chartIntegerValue(latestTokenChartRow.activations),
              delta: renderMetricDelta(latestTokenChartRow.activations, previousTokenChartRow.activations)
            },
            {
              key: 'deletedAccounts',
              label: tt('charts.nativeAccountStats.deleted'),
              value: chartIntegerValue(latestTokenChartRow.deleted),
              delta: renderMetricDelta(latestTokenChartRow.deleted, previousTokenChartRow.deleted, { invertColor: true })
            }
          ]
        },
        {
          key: 'issuedTokenHolders',
          label: tt('fields.holders'),
          value: chartIntegerValue(latestTokenChartRow.holders),
          delta: renderMetricDelta(latestTokenChartRow.holders, previousTokenChartRow.holders),
          show: hasIssuedTokenHolderChartStats,
          compactHeader: true,
          details: [
            {
              key: 'trustlines',
              label: tt('fields.trustlines'),
              value: chartIntegerValue(latestTokenChartRow.trustlines),
              delta: renderMetricDelta(latestTokenChartRow.trustlines, previousTokenChartRow.trustlines)
            }
          ]
        },
        {
          key: 'nativeSupply',
          label: tt('fields.supply'),
          value:
            chartNumber(latestTokenChartRow.supply) === null ? null : (
              <>
                {fullNiceNumber(latestTokenChartRow.supply)} {tokenDisplayCurrency}
              </>
            ),
          delta: renderMetricDelta(latestTokenChartRow.supply, previousTokenChartRow.supply),
          show: isNativeToken && chartNumber(latestTokenChartRow.supply) !== null
        }
      ]
    : []

  const closedDayItems = statistics
    ? [
        {
          key: 'tradingPairs',
          label: tt('fields.tradingPairs'),
          value: fullNiceNumber(statistics?.activeCounters || 0)
        },
        {
          key: 'activeHolders',
          label: tt('fields.activeHolders'),
          value: fullNiceNumber(statistics?.activeHolders || 0)
        },
        {
          key: 'activeOffers',
          label: tt('fields.activeOffers'),
          value: fullNiceNumber(statistics?.activeOffers || 0)
        },
        {
          key: 'activeAmmPools',
          label: tt('fields.activeAmmPools'),
          value: niceNumber(statistics?.activeAmmPools || 0),
          show: !xahauNetwork && !isMptToken
        }
      ]
    : []

  return (
    <>
      <SEO
        title={
          isNativeToken
            ? tokenDisplayCurrency + ' (' + tt('title.nativeCurrency') + ')'
            : tokenDisplayCurrency +
              ' ' +
              tt('title.issuedBy') +
              ' ' +
              (token?.issuerDetails?.service || token?.issuerDetails?.username || token?.issuer)
        }
        image={tokenPreviewImage}
        twitterImage={tokenTwitterImage}
      />
      <div className={tokenPage}>
        {!xahauNetwork && <TokenTabs />}

        <div className="tokenLayout">
          <div className="tokenSelectorSection">
            <TokenSelector
              value={selectedToken}
              onChange={setSelectedToken}
              excludeNative={false}
              excludeLPtokens={true}
              onlyMPTokens={isMptToken}
            />
          </div>

          <div className={`tokenOverview tokenOverviewTop${overviewTopCardCount}`}>
            <aside className="tokenProfileCard">
              <div className="tokenProfileImageWrap">
                <img
                  alt="token"
                  src={tokenImageSrc(token)}
                  className="token-image"
                  style={{
                    width: 'calc(100% - 2px)',
                    height: 'auto',
                    borderRadius: isRoundTokenImage ? '50%' : undefined,
                    aspectRatio: isRoundTokenImage ? '1 / 1' : undefined,
                    objectFit: isRoundTokenImage ? 'cover' : undefined
                  }}
                />
              </div>
              <h1 className="tokenProfileTitle">{tokenDisplayCurrency}</h1>
              <div className="tokenProfileMeta">
                {isMptToken && mptMetadataTicker && mptMetadataTicker !== tokenDisplayCurrency ? (
                  <span>{mptMetadataTicker}</span>
                ) : null}
                {token?.name && token.name !== tokenDisplayCurrency ? <span>{token.name}</span> : null}
                <span>
                  {isNativeToken ? (
                    tt('title.nativeCurrency')
                  ) : (
                    <span className="tokenProfileIssuerLine">
                      <span>{tt('title.issuedBy')}</span>
                      <span className="tokenProfileIssuerValue">
                        {tokenIssuerLink}
                      </span>
                    </span>
                  )}
                </span>
              </div>

              {(!isNativeToken || isMptToken) && (
                <div className="tokenProfileActions">
                  {!isNativeToken && !isMptToken && (
                    <button className="button-action wide center" onClick={handleSetTrustline}>
                      {tt('actions.setTrustline')}
                    </button>
                  )}
                  {isMptToken && (
                    <button className="button-action wide center" onClick={handleAuthorizeMpt}>
                      <FaHandshake style={{ fontSize: 18, marginBottom: -4 }} /> {tt('actions.authorize')}
                    </button>
                  )}
                </div>
              )}

              <div className="tokenProfileInfo">
                {renderProfileRows(tokenInfoItems)}
                {isMptToken && token.metadata && (
                  <div className="tokenProfileInfoRow tokenProfileMetadataRow">
                    <span>{tt('tables.mptMetadata')}</span>
                    <span>
                      <button
                        type="button"
                        className="tokenProfileLinkButton"
                        onClick={() => setShowMptMetadata((value) => !value)}
                        aria-expanded={showMptMetadata}
                      >
                        {showMptMetadata ? tt('actions.hideMetadata') : tt('actions.showMetadata')}
                      </button>
                    </span>
                  </div>
                )}
                {hasTomlData && (
                  <div className="tokenProfileInfoRow">
                    <span>TOML</span>
                    <span>
                      <button
                        type="button"
                        className="tokenProfileLinkButton"
                        onClick={() => setShowToml((value) => !value)}
                        aria-expanded={showToml}
                      >
                        {showToml ? tt('actions.hideMetadata') : tt('actions.showMetadata')}
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </aside>

            <div className="tokenDashboardGrid">
              {showPriceInformation &&
                renderPanel({
                  title: tt('tables.priceInformation'),
                  className: 'tokenPricePanel',
                  children: loading ? (
                    <div className="center">
                      <span className="waiting"></span>
                    </div>
                  ) : (
                    <>
                      {effectiveNativePrice ? (
                        <div className="tokenPriceHero">
                          <span>{tt('fields.lastPrice')}</span>
                          <strong>
                            {priceLine({
                              priceNative: effectiveNativePrice,
                              priceFiat: statistics?.priceFiats?.[selectedCurrency]
                            })}
                          </strong>
                          {changeItems.length > 0 ? renderChangeStrip() : null}
                        </div>
                      ) : changeItems.length > 0 ? (
                        renderChangeStrip()
                      ) : null}
                      {priceMetricItems.some((item) => item.show !== false) ? (
                        <div className="tokenMetricGrid">{renderMetricTiles(priceMetricItems)}</div>
                      ) : null}
                    </>
                  )
                })}

              {renderPanel({
                title: tokenSupplyTitle,
                className: 'tokenSupplyPanel',
                children: <div className="tokenMetricGrid">{renderMetricTiles(tokenSupplyItems)}</div>
              })}

              {statistics &&
                renderPanel({
                  title: tt('tables.statsClosedDay'),
                  className: 'tokenClosedPanel',
                  children: <div className="tokenMetricGrid">{renderMetricTiles(closedDayItems)}</div>
                })}

              {isMptToken && token.metadata && showMptMetadata && (
                <section className="tokenPanel tokenExpandedDataPanel">
                  <pre className="tokenProfileMetadataPre tokenExpandedDataPre">
                    <code>{JSON.stringify(token.metadata, null, 2)}</code>
                  </pre>
                </section>
              )}

              {hasTomlData && showToml && (
                <section className="tokenPanel tokenExpandedDataPanel">
                  <pre className="tokenProfileMetadataPre tokenExpandedDataPre">
                    <code>{token.rawtoml}</code>
                  </pre>
                </section>
              )}

              {statistics &&
                renderPanel({
                  title: tt('tables.stats24h'),
                  className: 'tokenStatsPanel',
                  children: (
                    <div className="tokenMetricGrid tokenMetricGridStats">
                      {renderMetricTiles(stats24hItems)}
                    </div>
                  )
                })}

            </div>
          </div>

          <TokenCharts token={token} selectedCurrency={selectedCurrency} onChartRowsChange={handleTokenChartRows} />

          {showTokenPreviews && (
            <section className={`tokenPreviewGrid${showAmmsPreview ? '' : ' tokenPreviewGrid-single'}`}>
              {showHoldersPreview && (
                <TokenHoldersPreview
                  token={token}
                  data={holdersPreviewData}
                  loading={tokenPreviewsLoading}
                  selectedCurrency={selectedCurrency}
                />
              )}
              {showAmmsPreview && (
                <TokenAmmsPreview
                  token={token}
                  data={ammsPreviewData}
                  loading={tokenPreviewsLoading}
                  selectedCurrency={selectedCurrency}
                  fiatRate={fiatRate}
                />
              )}
            </section>
          )}

          <section className="tokenActivitySection">
            <div className="tokenActivityGrid">
              {renderTokenActivityWidget({
                titleText: tt('activity.dexSwaps'),
                rows: dexSwaps,
                rowRenderer: renderDexSwapRow,
                loading: dexSwapsLoading,
                onRefresh: refreshDexSwaps,
                isRefreshHidden: dexSwapsRefreshHidden,
                refreshCooldownSeconds: dexSwapsRefreshSeconds,
                headerActions: renderActivityOrderToggle(dexSwapsOrder, setDexSwapsOrder),
                emptyText: tt('activity.noData24h'),
                limit: DEX_SWAPS_LIMIT
              })}

              {renderTokenActivityWidget({
                titleText: tt('activity.transfers'),
                rows: transfers,
                rowRenderer: renderTransferRow,
                loading: transfersLoading,
                onRefresh: refreshTransfers,
                isRefreshHidden: transfersRefreshHidden,
                refreshCooldownSeconds: transfersRefreshSeconds,
                headerActions: renderActivityOrderToggle(transfersOrder, setTransfersOrder),
                emptyText: tt('activity.noData24h'),
                limit: 10
              })}

              {showMintActivity &&
                renderTokenActivityWidget({
                  titleText: tt('activity.mints'),
                  rows: mints,
                  rowRenderer: renderMintRow,
                  loading: mintsLoading,
                  onRefresh: refreshMints,
                  isRefreshHidden: mintsRefreshHidden,
                  refreshCooldownSeconds: mintsRefreshSeconds,
                  headerActions: renderActivityOrderToggle(mintsOrder, setMintsOrder),
                  emptyText: tt('activity.noData24h'),
                  limit: 10
                })}

              {renderTokenActivityWidget({
                titleText: tt('activity.burns'),
                rows: burns,
                rowRenderer: renderBurnRow,
                loading: burnsLoading,
                onRefresh: refreshBurns,
                isRefreshHidden: burnsRefreshHidden,
                refreshCooldownSeconds: burnsRefreshSeconds,
                headerActions: renderActivityOrderToggle(burnsOrder, setBurnsOrder),
                emptyText: tt('activity.noData24h'),
                limit: 10
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
