import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import axios from 'axios'
import BigNumber from 'bignumber.js'

import SEO from '../SEO'
import TokenSelector from '../UI/TokenSelector'
import CopyButton from '../UI/CopyButton'
import AddressInput from '../UI/AddressInput'
import AmmTabs from '../Tabs/AmmTabs'
import HomeTeaser, { HomeTeaseRow } from '../Home/HomeTeaser'
import TokenCharts from '../Token/TokenCharts'
import ChartPeriodSwitch from '../UI/ChartPeriodSwitch'
import { useTheme } from '../Layout/ThemeContext'
import { useIsMobile } from '../../utils/mobile'
import { axiosServer, passHeaders } from '../../utils/axios'
import { addQueryParams, isAddressValid, nativeCurrency, normalizeLocale, removeQueryParams, tokenImageSrc } from '../../utils'
import { DEFAULT_CHART_PERIOD, chartPeriodQuery, normalizeChartPeriod } from '../../utils/chartPeriods'
import { fetchHistoricalRate, fetchHistoricalTokenFiatRate } from '../../utils/common'
import { apexAxisLabelStyle, apexChartTheme } from '../../utils/apexCharts'
import {
  AddressWithIconFilled,
  AddressWithIconInline,
  AmountWithIcon,
  amountFormatNode,
  fullDateAndTime,
  fullNiceNumber,
  lpTokenName,
  niceCurrency,
  niceNumber,
  shortHash,
  shortNiceNumber,
  showAmmPercents,
  timeFormat,
  timeFromNow,
  tokenToFiat
} from '../../utils/format'
import { LinkTx } from '../../utils/links'
import { errorCodeDescription } from '../../utils/transaction'
import { tokenPage } from '../../styles/pages/token.module.scss'
import homeTeaserStyles from '@/styles/components/home-teaser.module.scss'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const SWAP_LIMIT = 10
const REFRESH_COOLDOWN_MS = 30000
const FEE_SCALE = 100000
const AUCTION_BID_MAX_MULTIPLIER = 1.01
const AUCTION_DEPOSIT_MAX_MULTIPLIER = 1.01
const DAY_MS = 24 * 60 * 60 * 1000

const ammUrl = (id, ledgerTimestamp) =>
  `v2/amm/${id}?holders=true&statistics=true&priceNativeCurrencySpot=true${
    ledgerTimestamp ? '&ledgerTimestamp=' + encodeURIComponent(ledgerTimestamp) : ''
  }`

const amountTokenPath = (amount) => {
  if (!amount || typeof amount !== 'object' || !amount.issuer) return nativeCurrency
  return `${encodeURIComponent(amount.issuer)}/${encodeURIComponent(amount.currency)}`
}

const ammTokenSwapsUrl = (data, id, type, order = 'new') => {
  const tokenPath = amountTokenPath(data?.amount)
  return `v2/token/${tokenPath}/swaps?limit=${SWAP_LIMIT}&type=${type}&ammID=${encodeURIComponent(id)}${
    order && order !== 'new' ? '&order=' + encodeURIComponent(order) : ''
  }`
}

const ammLiquiditySwapsUrl = (id, type, order = 'new') =>
  `v2/amm/${encodeURIComponent(id)}/swaps?limit=${SWAP_LIMIT}&type=${encodeURIComponent(type)}${
    order && order !== 'new' ? '&order=' + encodeURIComponent(order) : ''
  }`

const lpTokenDetailsUrl = (data) =>
  data?.account && data?.lpTokenBalance?.currency
    ? `v2/token/${encodeURIComponent(data.account)}/${encodeURIComponent(data.lpTokenBalance.currency)}?currencyDetails=true`
    : ''

const queryString = (params) => {
  const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return pairs.length ? `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}` : ''
}

const ammChartUrl = (id, selectedCurrency, period = DEFAULT_CHART_PERIOD) =>
  id
    ? `v2/amm/${encodeURIComponent(id)}/chart${queryString({
        convertCurrencies: selectedCurrency?.toLowerCase?.(),
        period: normalizeChartPeriod(period)
      })}`
    : ''

const lpTokenChartUrl = (data, selectedCurrency, period = DEFAULT_CHART_PERIOD) =>
  data?.account && data?.lpTokenBalance?.currency && selectedCurrency
    ? `v2/token/${encodeURIComponent(data.account)}/${encodeURIComponent(
        data.lpTokenBalance.currency
      )}/chart?convertCurrencies=${encodeURIComponent(selectedCurrency.toLowerCase())}&${chartPeriodQuery(period)}`
    : ''

const lpContributorsUrl = (data, selectedCurrency) =>
  data?.account && data?.lpTokenBalance?.currency
    ? `v2/trustlines/token/richlist/${encodeURIComponent(data.account)}/${encodeURIComponent(
        data.lpTokenBalance.currency
      )}?summary=true&currencyDetails=true${
        selectedCurrency ? `&convertCurrencies=${encodeURIComponent(selectedCurrency.toLowerCase())}` : ''
      }`
    : ''

const lpContributorsKey = (data, selectedCurrency) =>
  data?.account && data?.lpTokenBalance?.currency
    ? `${data.account}:${data.lpTokenBalance.currency}:${selectedCurrency || ''}`
    : ''

const feeDecimal = (tradingFee) => new BigNumber(tradingFee || 0).dividedBy(FEE_SCALE)
const feeMult = (tradingFee) => new BigNumber(1).minus(feeDecimal(tradingFee))
const feeMultHalf = (tradingFee) => new BigNumber(1).minus(feeDecimal(tradingFee).dividedBy(2))

const solveQuadraticEq = (a, b, c) => {
  const b2minus4ac = b.multipliedBy(b).minus(a.multipliedBy(c).multipliedBy(4))
  return b.negated().plus(b2minus4ac.sqrt()).dividedBy(a.multipliedBy(2))
}

const ammAssetIn = (poolIn, lptBalance, desiredLpt, tradingFee) => {
  const lpTokens = new BigNumber(desiredLpt)
  const lptAMMBalance = new BigNumber(lptBalance)
  const asset1Balance = new BigNumber(poolIn)
  const f1 = feeMult(tradingFee)
  const f2 = feeMultHalf(tradingFee).dividedBy(f1)
  const t1 = lpTokens.dividedBy(lptAMMBalance)
  const t2 = t1.plus(1)
  const d = f2.minus(t1.dividedBy(t2))
  const a = new BigNumber(1).dividedBy(t2.multipliedBy(t2))
  const b = new BigNumber(2).multipliedBy(d).dividedBy(t2).minus(new BigNumber(1).dividedBy(f1))
  const c = d.multipliedBy(d).minus(f2.multipliedBy(f2))
  return asset1Balance.multipliedBy(solveQuadraticEq(a, b, c))
}

const auctionPrice = (oldBid, timeInterval, tradingFee, lptBalance) => {
  const minBid = new BigNumber(lptBalance).multipliedBy(feeDecimal(tradingFee)).dividedBy(25)
  const bid = new BigNumber(oldBid || 0)
  let newBid = minBid
  if (Number(timeInterval) === 0) {
    newBid = bid.multipliedBy('1.05').plus(minBid)
  } else if (Number(timeInterval) <= 19) {
    const t60 = new BigNumber(timeInterval).multipliedBy('0.05').exponentiatedBy(60)
    newBid = bid.multipliedBy('1.05').multipliedBy(new BigNumber(1).minus(t60)).plus(minBid)
  }
  const lptokens = new BigNumber(lptBalance)
  return newBid.plus(lptokens).precision(15, BigNumber.ROUND_CEIL).minus(lptokens).precision(15, BigNumber.ROUND_FLOOR)
}

const auctionDeposit = (oldBid, timeInterval, tradingFee, lptBalance) => {
  const tfeeDecimal = feeDecimal(tradingFee)
  const lptokens = new BigNumber(lptBalance)
  const bid = new BigNumber(oldBid || 0)
  let outbidAmount = new BigNumber(0)
  if (Number(timeInterval) === 0) {
    outbidAmount = bid.multipliedBy('1.05')
  } else if (Number(timeInterval) <= 19) {
    const t60 = new BigNumber(timeInterval).multipliedBy('0.05').exponentiatedBy(60)
    outbidAmount = bid.multipliedBy('1.05').multipliedBy(new BigNumber(1).minus(t60))
  }
  const newBid = lptokens
    .plus(outbidAmount)
    .dividedBy(new BigNumber(25).dividedBy(tfeeDecimal).minus(1))
    .plus(outbidAmount)
  return newBid.plus(lptokens).precision(15, BigNumber.ROUND_CEIL).minus(lptokens).precision(15, BigNumber.ROUND_FLOOR)
}

const amountObjectFromPoolUnits = (amount, value) => {
  if (!amount || typeof amount !== 'object' || (!amount.issuer && !amount.mpt_issuance_id)) {
    return value.toFixed(0, BigNumber.ROUND_CEIL)
  }
  if (amount.mpt_issuance_id) return { mpt_issuance_id: amount.mpt_issuance_id, value: value.toPrecision(15) }
  return { ...amount, value: value.toPrecision(15) }
}

const txAmountObjectFromPoolUnits = (amount, value) => {
  const displayAmount = amountObjectFromPoolUnits(amount, value)
  if (!displayAmount || typeof displayAmount !== 'object') return displayAmount
  if (displayAmount.mpt_issuance_id) {
    return {
      mpt_issuance_id: displayAmount.mpt_issuance_id,
      value: displayAmount.value
    }
  }
  return {
    currency: displayAmount.currency,
    issuer: displayAmount.issuer,
    value: displayAmount.value
  }
}

const formatAuctionButtonAmount = (amount, value) =>
  `${shortNiceNumber(getAssetValue(amountObjectFromPoolUnits(amount, value)), 4, 2)}\u00a0${assetCurrency(amount)}`

const formatAuctionEstimateAmount = (amount, value) =>
  `${shortNiceNumber(getAssetValue(amountObjectFromPoolUnits(amount, value)), 2, 1)} ${assetCurrency(amount)}`

const formatAuctionLpEstimate = (value) => `${shortNiceNumber(value, 2, 1)} LP token`

const exactLpDepositAmounts = (data, lpTokenOut) => {
  const lpTokens = new BigNumber(lpTokenOut || 0)
  const lpSupply = new BigNumber(data?.lpTokenBalance?.value || 0)
  if (!lpTokens.isFinite() || !lpTokens.gt(0) || !lpSupply.isFinite() || !lpSupply.gt(0)) return null

  return {
    amount1: new BigNumber(poolAmountUnits(data.amount)).multipliedBy(lpTokens).dividedBy(lpSupply),
    amount2: new BigNumber(poolAmountUnits(data.amount2)).multipliedBy(lpTokens).dividedBy(lpSupply)
  }
}

const poolAmountUnits = (amount) => {
  if (amount && typeof amount === 'object' && amount.value !== undefined) return amount.value
  return amount
}

const hasPositiveAmountValue = (amount) => {
  const value = amount && typeof amount === 'object' && amount.value !== undefined ? amount.value : amount
  const number = new BigNumber(value || 0)
  return number.isFinite() && number.gt(0)
}

const trustlineRows = (payload) =>
  Array.isArray(payload) ? payload : payload?.trustlines || payload?.tokens || payload?.lines || []

const trustlineCurrency = (token) => token?.currency || token?.Balance?.currency || token?.HighLimit?.currency || token?.LowLimit?.currency

const trustlineIssuer = (token, accountAddress) => {
  if (token?.issuer) return token.issuer
  if (token?.counterparty) return token.counterparty
  if (token?.HighLimit?.issuer && token.HighLimit.issuer !== accountAddress) return token.HighLimit.issuer
  if (token?.LowLimit?.issuer && token.LowLimit.issuer !== accountAddress) return token.LowLimit.issuer
  return token?.HighLimit?.issuer || token?.LowLimit?.issuer || ''
}

const trustlineUnlockedBalance = (token) => {
  const balance = token?.Balance?.value ?? token?.balance ?? token?.value ?? token?.amount
  const number = new BigNumber(balance || 0).minus(token?.LockedBalance?.value || 0).abs()
  return number.isFinite() && number.gt(0) ? number : new BigNumber(0)
}

const lpTrustlineBalance = (payload, data, accountAddress) => {
  const currency = data?.lpTokenBalance?.currency
  const issuer = data?.lpTokenBalance?.issuer || data?.account
  if (!currency || !issuer || !accountAddress) return null

  const token = trustlineRows(payload).find((item) => {
    const itemCurrency = trustlineCurrency(item)
    const itemIssuer = trustlineIssuer(item, accountAddress)
    return itemIssuer === issuer && (itemCurrency === currency || niceCurrency(itemCurrency) === niceCurrency(currency))
  })

  return trustlineUnlockedBalance(token)
}

const auctionSlotPriceNode = (slot, fallback = '-') =>
  slot?.price && hasPositiveAmountValue(slot.price) ? amountFormatNode(slot.price, { precise: 'nice' }) : fallback

const isTimestampExpired = (timestamp, compareDate = new Date()) => {
  if (!timestamp) return false
  let normalized = timestamp
  if (!normalized.toString().includes('T')) {
    normalized = Number(normalized) * 1000
  }
  return new Date(normalized) < compareDate
}

const fiatEstimateText = (value, selectedCurrency, options = {}) => {
  if (value === null || value === undefined || !selectedCurrency) return ''
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  const text = `≈ ${shortNiceNumber(number, 2, 1, selectedCurrency)}`
  return options.asText ? text : <span suppressHydrationWarning>{text}</span>
}

const auctionWinnerDiscountedFee = (tradingFee) => {
  const fee = Number(tradingFee)
  if (!Number.isFinite(fee)) return 0
  return Math.floor(fee / 10)
}

const auctionEstimates = (data, lpTokenBalanceValue = data?.lpTokenBalance?.value) => {
  if (!lpTokenBalanceValue || !data?.amount || !data?.amount2 || !data?.tradingFee) return null
  const expired = isTimestampExpired(data.auctionSlot?.expiration)
  const hasActiveSlot = data.auctionSlot && !expired
  if (hasActiveSlot && !data.auctionSlot?.price?.value) return null
  const discountedFee = hasActiveSlot ? data.auctionSlot.discountedFee : auctionWinnerDiscountedFee(data.tradingFee)
  if (discountedFee === undefined || discountedFee === null) return null

  try {
    const oldBid = hasActiveSlot ? data.auctionSlot.price.value : 0
    const timeInterval = hasActiveSlot ? data.auctionSlot.timeInterval : 20
    const bid = auctionPrice(oldBid, timeInterval, data.tradingFee, lpTokenBalanceValue)
    const depositBid = auctionDeposit(oldBid, timeInterval, data.tradingFee, lpTokenBalanceValue)
    const feeSavingsRate = feeDecimal(data.tradingFee).minus(feeDecimal(discountedFee))
    const assetEstimates = [
      { key: 'asset1', amount: data.amount },
      { key: 'asset2', amount: data.amount2 }
    ].map((asset) => {
      const cost = ammAssetIn(poolAmountUnits(asset.amount), lpTokenBalanceValue, depositBid, data.tradingFee)
      return {
        ...asset,
        cost,
        breakEvenVolume: feeSavingsRate.gt(0) ? cost.dividedBy(feeSavingsRate) : null
      }
    })

    return {
      bid,
      depositBid,
      assetEstimates,
      feeSavingsRate,
      expired
    }
  } catch (_) {
    return null
  }
}

const auctionRequiredLpForSupply = (data, lpTokenBalanceValue) => {
  const estimates = auctionEstimates(data, lpTokenBalanceValue)
  return estimates?.bid ? estimates.bid.multipliedBy(AUCTION_BID_MAX_MULTIPLIER) : null
}

const auctionMintTargetForBalance = (data, lpBalance) => {
  const lpSupply = new BigNumber(data?.lpTokenBalance?.value || 0)
  if (!lpSupply.isFinite() || !lpSupply.gt(0)) return null

  const balance = new BigNumber(lpBalance || 0)
  let target = auctionRequiredLpForSupply(data, lpSupply)?.minus(balance)
  if (!target?.isFinite()) return null
  target = BigNumber.max(target, 0)

  for (let i = 0; i < 8 && target.gt(0); i++) {
    const nextRequired = auctionRequiredLpForSupply(data, lpSupply.plus(target))
    if (!nextRequired?.isFinite()) break

    const nextTarget = BigNumber.max(nextRequired.minus(balance), 0)
    if (nextTarget.minus(target).abs().lte('0.000000000001')) {
      target = nextTarget
      break
    }
    target = nextTarget
  }

  return target.gt(0) ? target.multipliedBy('1.000001') : target
}

const initialSwapList = (initialSwapsData, key) => {
  if (Array.isArray(initialSwapsData?.[key])) return initialSwapsData[key]
  if (!Array.isArray(initialSwapsData?.swaps)) return []
  if (key === 'dexSwaps') return initialSwapsData.swaps.filter((swap) => swap.type === 'dex')
  if (key === 'liquiditySwaps') return initialSwapsData.swaps.filter((swap) => swap.type === 'deposit' || swap.type === 'withdraw')
  return initialSwapsData.swaps
}

const hasInitialSwaps = (initialSwapsData) =>
  !!initialSwapsData &&
  (Array.isArray(initialSwapsData.dexSwaps) ||
    Array.isArray(initialSwapsData.liquiditySwaps) ||
    Array.isArray(initialSwapsData.swaps))

export const fetchAmmPageData = async ({
  id,
  req,
  ledgerTimestamp,
  selectedCurrencyServer
}) => {
  let initialData = null
  let initialSwapsData = null
  let initialChartData = null
  let initialLpTokenData = null
  let initialLpChartData = null
  let initialContributorsData = null
  let initialErrorMessage = null

  if (!id) {
    return {
      initialData,
      initialSwapsData,
      initialChartData,
      initialLpTokenData,
      initialLpChartData,
      initialContributorsData,
      initialErrorMessage: 'Invalid AMM ID'
    }
  }

  const headers = passHeaders(req)
  const ammRes = await axiosServer({
    method: 'get',
    url: ammUrl(id, ledgerTimestamp),
    headers
  }).catch((error) => {
    initialErrorMessage = error.message
    return null
  })

  initialData = ammRes?.data || null

  const [dexSwapsRes, liquiditySwapsRes, chartRes, lpTokenRes, lpChartRes, contributorsRes] = await Promise.all([
    initialData?.account
      ? axiosServer({
          method: 'get',
          url: ammTokenSwapsUrl(initialData, id, 'dex'),
          headers
        }).catch(() => null)
      : null,
    initialData?.account
      ? axiosServer({
          method: 'get',
          url: ammLiquiditySwapsUrl(id, 'deposit'),
          headers
        }).catch(() => null)
      : null,
    axiosServer({
      method: 'get',
      url: ammChartUrl(id, selectedCurrencyServer),
      headers
    }).catch(() => null),
    lpTokenDetailsUrl(initialData)
      ? axiosServer({
          method: 'get',
          url: lpTokenDetailsUrl(initialData),
          headers
        }).catch(() => null)
      : null,
    lpTokenChartUrl(initialData, selectedCurrencyServer)
      ? axiosServer({
          method: 'get',
          url: lpTokenChartUrl(initialData, selectedCurrencyServer),
          headers
        }).catch(() => null)
      : null,
    lpContributorsUrl(initialData, selectedCurrencyServer)
      ? axiosServer({
          method: 'get',
          url: lpContributorsUrl(initialData, selectedCurrencyServer),
          headers
        }).catch(() => null)
      : null
  ])

  initialSwapsData = {
    dexSwaps: Array.isArray(dexSwapsRes?.data?.swaps) ? dexSwapsRes.data.swaps : [],
    liquiditySwaps: Array.isArray(liquiditySwapsRes?.data?.swaps) ? liquiditySwapsRes.data.swaps : []
  }
  initialChartData = chartRes?.data || null
  initialLpTokenData = lpTokenRes?.data || null
  initialLpChartData = lpChartRes?.data || null
  initialContributorsData = contributorsRes?.data || null

  return {
    initialData,
    initialSwapsData,
    initialChartData,
    initialLpTokenData,
    initialLpChartData,
    initialContributorsData,
    initialErrorMessage
  }
}

const getAssetValue = (amount) => {
  if (amount && typeof amount === 'object' && amount.value !== undefined) return Number(amount.value)
  if (amount === null || amount === undefined || amount === '') return 0
  return Number(amount) / 1000000
}

const amountFiatValue = (amount, selectedCurrency, fiatRate) => {
  if (!amount || !selectedCurrency) return null

  const currencyKey = selectedCurrency.toLowerCase()
  let tokenAmount
  let fiatValue = null
  let effectiveFiatRate = null

  if (!amount?.currency) {
    if (!fiatRate) return null
    tokenAmount = Number(amount) / 1000000
    effectiveFiatRate = Number(fiatRate)
  } else {
    tokenAmount = Number(amount.value)

    if (!amount.issuer && !amount.mpt_issuance_id) {
      if (!fiatRate) return null
      effectiveFiatRate = Number(fiatRate)
    } else {
      const priceInNative = Number(amount?.priceNativeCurrencySpot)
      if (Number.isFinite(tokenAmount) && Number.isFinite(priceInNative) && fiatRate) {
        fiatValue = tokenAmount * priceInNative * Number(fiatRate)
      }

      const embedded = fiatValue === null ? amount.valueInConvertCurrencies?.[currencyKey] : undefined
      if (embedded !== undefined) {
        fiatValue = Number(embedded)
      } else if (fiatValue === null) {
        return null
      }
    }
  }

  const value = fiatValue !== null ? fiatValue : tokenAmount * effectiveFiatRate
  return Number.isFinite(value) ? Math.abs(value) : null
}

const assetUnitFiatValue = (amount, selectedCurrency, fiatRate) => {
  if (!amount || !selectedCurrency) return null

  if (!amount?.currency || (!amount.issuer && !amount.mpt_issuance_id)) {
    const rate = Number(fiatRate)
    return Number.isFinite(rate) && rate > 0 ? rate : null
  }

  const priceInNative = Number(amount.priceNativeCurrencySpot)
  const nativeRate = Number(fiatRate)
  if (Number.isFinite(priceInNative) && Number.isFinite(nativeRate) && nativeRate > 0) {
    return Math.abs(priceInNative * nativeRate)
  }

  const totalFiat = amountFiatValue(amount, selectedCurrency, fiatRate)
  const tokenAmount = Number(amount.value)
  if (totalFiat !== null && Number.isFinite(tokenAmount) && tokenAmount > 0) {
    return totalFiat / tokenAmount
  }

  return null
}

const isNativeAsset = (amount) => !amount || typeof amount !== 'object' || (!amount.issuer && !amount.mpt_issuance_id)

const assetCurrency = (amount) => (isNativeAsset(amount) ? nativeCurrency : niceCurrency(amount.currency))

const assetHistoricalRateKey = (amount) => {
  if (isNativeAsset(amount)) return nativeCurrency
  if (amount?.issuer && amount?.currency) return `${amount.issuer}:${amount.currency}`
  if (amount?.mpt_issuance_id) return amount.mpt_issuance_id
  return ''
}

const amountFiatValueFromUnitRate = (amount, unitRate) => {
  const tokenAmount = getAssetValue(amount)
  const rate = Number(unitRate)
  if (!Number.isFinite(tokenAmount) || !Number.isFinite(rate) || rate <= 0) return null
  return Math.abs(tokenAmount * rate)
}

const historicalAssetUnitFiatRate = (amount, selectedCurrency, historicalFiatRates) => {
  const rates = historicalFiatRates?.rates || {}
  const directRate = Number(rates[assetHistoricalRateKey(amount)])
  if (Number.isFinite(directRate) && directRate > 0) return directRate

  if (isNativeAsset(amount)) return null

  const currencyKey = selectedCurrency?.toLowerCase?.()
  const embeddedFiatValue = currencyKey ? Number(amount?.valueInConvertCurrencies?.[currencyKey]) : null
  const tokenAmount = Number(amount?.value)
  if (Number.isFinite(embeddedFiatValue) && Number.isFinite(tokenAmount) && tokenAmount > 0) {
    return Math.abs(embeddedFiatValue / tokenAmount)
  }

  const priceInNative = Number(amount?.priceNativeCurrencySpot)
  const nativeFiatRate = Number(rates[nativeCurrency])
  if (Number.isFinite(priceInNative) && Number.isFinite(nativeFiatRate) && nativeFiatRate > 0) {
    return Math.abs(priceInNative * nativeFiatRate)
  }

  return null
}

const directHistoricalAssetUnitFiatRate = (amount, historicalFiatRates) => {
  const rate = Number(historicalFiatRates?.rates?.[assetHistoricalRateKey(amount)])
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

const assetTxIssue = (amount) => {
  if (amount?.mpt_issuance_id) return { mpt_issuance_id: amount.mpt_issuance_id }
  if (isNativeAsset(amount)) return { currency: nativeCurrency }
  return {
    currency: amount.currency,
    issuer: amount.issuer
  }
}

const lpSelectorToken = (data) =>
  data?.account && data?.lpTokenBalance
    ? {
        issuer: data.account,
        issuerDetails: data.accountDetails,
        currency: data.lpTokenBalance.currency,
        currencyDetails: {
          type: 'lp_token',
          ammID: data.ammID,
          asset: data.amount,
          asset2: data.amount2,
          currency: lpTokenName(data)
        }
      }
    : null

const tokenAmmId = (token) =>
  token?.currencyDetails?.ammID ||
  token?.currencyDetails?.ammId ||
  token?.currencyDetails?.amm_id ||
  token?.ammID ||
  token?.ammId ||
  token?.amm_id

const normalizeSwapAmount = (value, currency, options = {}) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '-'
  const displayNumber = options.unsigned ? Math.abs(number) : options.sign ? Math.abs(number) * options.sign : number
  return `${!options.unsigned && displayNumber > 0 ? '+' : ''}${shortNiceNumber(displayNumber, 6, 2)} ${currency}`
}

const unsignedAmount = (amount) => {
  if (amount === null || amount === undefined) return amount
  if (typeof amount === 'object' && amount.value !== undefined) {
    const number = Number(amount.value)
    if (!Number.isFinite(number)) return amount
    return {
      ...amount,
      value: String(Math.abs(number))
    }
  }
  const number = Number(amount)
  if (!Number.isFinite(number)) return amount
  return String(Math.abs(number))
}

const signedSwapAmount = (amount, signedValue) => {
  const signedNumber = Number(signedValue)
  if (!Number.isFinite(signedNumber) || signedNumber === 0) return amount

  const applySign = (value) => {
    const number = new BigNumber(value || 0)
    if (!number.isFinite()) return value
    const signed = signedNumber < 0 ? number.abs().negated() : number.abs()
    return signed.toFixed()
  }

  if (amount && typeof amount === 'object' && amount.value !== undefined) {
    return {
      ...amount,
      value: applySign(amount.value)
    }
  }

  return applySign(amount)
}

const dexSwapAmountSign = (row, amountIndex, displayAccount) => {
  if (row?.type !== 'dex') return null

  if (displayAccount && row.address1 === displayAccount) {
    return amountIndex === 1 ? 1 : -1
  }

  if (displayAccount && row.address2 === displayAccount) {
    return amountIndex === 1 ? -1 : 1
  }

  return row.address2 ? (amountIndex === 1 ? -1 : 1) : amountIndex === 1 ? 1 : -1
}

const assetDisplayAmount = (amount, value) => {
  if (isNativeAsset(amount)) {
    return {
      currency: nativeCurrency,
      value: value !== undefined ? String(value) : String(getAssetValue(amount))
    }
  }

  return {
    ...amount,
    value: value !== undefined ? String(value) : amount.value
  }
}

const chartPoint = (time, value) => {
  const number = Number(value)
  return [time, Number.isFinite(number) ? number : null]
}

const chartValue = (value) => {
  if (Array.isArray(value)) {
    return chartValue(value[1])
  }
  if (value && typeof value === 'object') {
    return chartValue(value.y ?? value.value)
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const chartTimestamp = (value) => {
  if (Array.isArray(value)) return chartTimestamp(value[0])
  if (value && typeof value === 'object') return chartTimestamp(value.x ?? value.time ?? value.timestamp)
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const chartDateText = (value, options = { month: 'short', day: 'numeric' }, locale = 'en') => {
  const timestamp = chartTimestamp(value)
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString(normalizeLocale(locale), options)
}

const chartRowTimestamp = (row) => Number(row?.time || row?.timestamp || 0)

const sortChartRows = (rows) =>
  Array.isArray(rows) ? [...rows].sort((a, b) => chartRowTimestamp(a) - chartRowTimestamp(b)) : []

const metricDeltaPct = (cur, prev) => {
  const current = Number(cur)
  const previous = Number(prev)
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
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

function AmmMetricDelta({ cur, prev, title, invertColor = false }) {
  const { t } = useTranslation('amm')
  const pct = metricDeltaPct(cur, prev)
  const text = formatMetricDelta(pct)
  if (!text) {
    return (
      <span className="ammMetricDelta ammMetricDelta-empty" aria-hidden="true">
        0%
      </span>
    )
  }

  const colorPct = invertColor ? -pct : pct
  const direction = colorPct > 0 ? 'up' : colorPct < 0 ? 'down' : 'flat'
  return (
    <span className={`ammMetricDelta ammMetricDelta-${direction}`} title={title || t('tooltips.comparedLastClosedDay')}>
      {text}
    </span>
  )
}

function AmmAssetPairIcons({ amount1, amount2 }) {
  return (
    <div className="ammHeroCoins" aria-hidden="true">
      <img className="ammHeroCoin ammHeroCoinBack" src={tokenImageSrc(amount1, 72)} alt="" width="72" height="72" />
      <img className="ammHeroCoin ammHeroCoinFront" src={tokenImageSrc(amount2, 72)} alt="" width="72" height="72" />
    </div>
  )
}

function AmmChartCard({ title, rows, series, type = 'line', dualYAxis = false, loading = false }) {
  const { t, i18n } = useTranslation('amm')
  const { theme } = useTheme()
  const dateLocale = normalizeLocale(i18n.language)
  const chartRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows])
  const hasData = chartRows.length > 1 && series.some((item) => item.data.some((point) => chartValue(point) !== null))
  const chartTheme = useMemo(() => apexChartTheme(theme), [theme])

  const options = useMemo(
    () => {
      const hasDualAxis = dualYAxis && series.length > 1
      const yaxisLabels = {
        minWidth: hasDualAxis ? 42 : 34,
        formatter: (value) => shortNiceNumber(value, 2, 1),
        style: apexAxisLabelStyle(theme, { fontSize: '10px' })
      }

      return {
        chart: {
          animations: { enabled: false },
          foreColor: chartTheme.textColor,
          toolbar: { show: false },
          zoom: { enabled: false },
          sparkline: { enabled: false }
        },
        dataLabels: { enabled: false },
        grid: {
          borderColor: chartTheme.gridColor,
          strokeDashArray: 3,
          padding: { top: 2, right: hasDualAxis ? 28 : 8, bottom: 0, left: 6 }
        },
        legend: {
          show: series.length > 1,
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '10px',
          labels: { colors: chartTheme.labelColor },
          markers: {
            width: 8,
            height: 8,
            radius: 8
          },
          itemMargin: {
            horizontal: 8,
            vertical: 0
          }
        },
        stroke: { curve: 'smooth', width: type === 'bar' ? 0 : 2 },
        xaxis: {
          type: 'datetime',
          crosshairs: {
            show: type !== 'bar'
          },
          tickAmount: 4,
          labels: {
            show: true,
            datetimeUTC: false,
            hideOverlappingLabels: true,
            style: apexAxisLabelStyle(theme, { fontSize: '10px' }),
            formatter: (value, timestamp) => {
              return chartDateText(timestamp ?? value, undefined, dateLocale)
            }
          },
          axisBorder: { color: chartTheme.gridColor },
          axisTicks: { show: false, color: chartTheme.gridColor },
          tooltip: { enabled: false }
        },
        yaxis:
          hasDualAxis
            ? series.map((item, index) => ({
                seriesName: item.name,
                opposite: index % 2 === 1,
                labels: yaxisLabels,
                axisBorder: { show: false },
                axisTicks: { show: false }
              }))
            : {
                labels: yaxisLabels
              },
        tooltip: {
          shared: true,
          intersect: false,
          theme: chartTheme.tooltipTheme,
          x: {
            show: true,
            formatter: (value) => chartDateText(value, { year: 'numeric', month: 'short', day: 'numeric' }, dateLocale)
          }
        }
      }
    },
    [chartTheme, dateLocale, dualYAxis, series, theme, type]
  )

  return (
    <div className="ammChartCard">
      <h3>{title}</h3>
      {hasData ? (
        <Chart type={type} series={series} options={options} height={190} />
      ) : loading ? (
        <div className="tokenChartEmpty">
          <span className="waiting"></span>
        </div>
      ) : (
        <div className="tokenChartEmpty">{t('common.chartDataUnavailable')}</div>
      )}
    </div>
  )
}

const contributorLabel = (record) => {
  const details = record?.addressDetails || record?.accountDetails || {}
  return details.service || details.username || shortHash(record?.address || record?.account || '')
}

const contributorShare = (balance, total) => {
  const amount = Number(balance)
  const totalAmount = Number(total)
  if (!Number.isFinite(amount) || !Number.isFinite(totalAmount) || totalAmount <= 0) return null
  return (amount / totalAmount) * 100
}

const contributorBaseColor = (index, count) => {
  if (index === count - 1) return '#CBD5E1'
  const maxIndex = Math.max(count - 2, 1)
  const step = index / maxIndex
  const tonalStep = Math.pow(step, 0.58)
  const saturation = 98 - tonalStep * 18
  const lightness = 84 - tonalStep * 62
  return `hsl(214 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`
}

const contributorChartColors = (count) => Array.from({ length: count }, (_, index) => contributorBaseColor(index, count))

function AmmContributorsCard({ contributors, rawData, data, loading, lpTokenUnitFiat, selectedCurrency }) {
  const { t } = useTranslation('amm')
  const { theme } = useTheme()
  const isMobile = useIsMobile(600)
  const chartTheme = useMemo(() => apexChartTheme(theme), [theme])
  const [activeContributorIndex, setActiveContributorIndex] = useState(null)
  const [showAllContributors, setShowAllContributors] = useState(false)
  const totalCoins = rawData?.summary?.totalCoins || data?.lpTokenBalance?.value
  const rows = useMemo(
    () =>
      (Array.isArray(contributors) ? contributors : [])
        .filter((record) => Number(record.balance) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance)),
    [contributors]
  )
  const chartRows = rows.slice(0, 100)
  const listRows = rows.slice(0, 100)
  const topBalance = chartRows.reduce((sum, record) => sum + Number(record.balance || 0), 0)
  const totalBalance = Number(totalCoins || 0)
  const chartItems = chartRows
    .map((record) => ({
      label: contributorLabel(record),
      balance: Number(record.balance || 0),
      share: contributorShare(record.balance, totalCoins),
      record
    }))
    .filter((item) => item.share !== null && item.share > 0)
  const otherBalance = Number.isFinite(totalBalance) ? Math.max(totalBalance - topBalance, 0) : 0
  if (otherBalance > 0) {
    chartItems.push({
      label: t('contributors.others'),
      balance: otherBalance,
      share: contributorShare(otherBalance, totalCoins),
      record: null
    })
  }

  const chartSeries = chartItems.map((item) => item.share)
  const topShare = contributorShare(topBalance, totalCoins)
  const activeContributor =
    activeContributorIndex !== null && activeContributorIndex !== undefined ? chartItems[activeContributorIndex] : null
  const chartOptions = useMemo(
    () => ({
      chart: {
        type: 'donut',
        animations: { enabled: false },
        foreColor: chartTheme.textColor,
        toolbar: { show: false },
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            const index = config?.dataPointIndex
            if (index === undefined || index === null || index < 0) return
            setActiveContributorIndex((current) => (current === index ? null : index))
          },
          dataPointMouseEnter: (_event, _chartContext, config) => {
            if (isMobile) return
            const index = config?.dataPointIndex
            if (index === undefined || index === null || index < 0) return
            setActiveContributorIndex(index)
          },
          dataPointMouseLeave: () => {
            if (!isMobile) setActiveContributorIndex(null)
          }
        }
      },
      labels: chartItems.map((item) => item.label),
      colors: contributorChartColors(chartItems.length),
      dataLabels: {
        enabled: false
      },
      legend: { show: false },
      stroke: { width: 1, colors: ['var(--card-bg)'] },
      tooltip: {
        enabled: false
      },
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
                label: t('contributors.top100'),
                color: chartTheme.labelColor,
                formatter: () =>
                  topShare !== null
                    ? `${topShare.toFixed(1)}%`
                    : '-'
              }
            }
          }
        }
      }
    }),
    [chartItems, chartTheme, isMobile, t, topShare]
  )

  return (
    <section className="ammContributorsCard tokenActivityCard" id="amm-contributors">
      <div className="ammContributorsHeader">
        <div>
          <h2>
            {t('contributors.title')}
            {data?.holders !== undefined && data?.holders !== null ? (
              <span className="ammContributorsCount">{niceNumber(data.holders)}</span>
            ) : null}
          </h2>
          <span>{t('contributors.subtitle')}</span>
        </div>
        <Link href={`/distribution?currency=${data.lpTokenBalance.currency}&currencyIssuer=${data.account}`} prefetch={false}>
          {t('contributors.viewAll')}
        </Link>
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
                {activeContributor ? (
                  <div
                    className="ammContributorSelected"
                    style={{ '--amm-contributor-color': contributorBaseColor(activeContributorIndex, chartItems.length) }}
                  >
                    <div className="ammContributorSelectedAddress">
                      <span className="ammContributorSelectedMarker"></span>
                      {activeContributor.record?.address ? (
                        <Link href={`/account/${activeContributor.record.address}`} prefetch={false}>
                          <AddressWithIconInline
                            data={activeContributor.record}
                            options={{
                              noLink: true,
                              className: 'ammContributorAddressInline',
                              labelClassName: 'ammContributorAddressText'
                            }}
                          />
                        </Link>
                      ) : (
                        <span>{activeContributor.label}</span>
                      )}
                    </div>
                    <div className="ammContributorSelectedStats">
                      <span>
                        <span>{t('contributors.share')}</span>
                        <strong>
                          {activeContributor.share !== null && activeContributor.share !== undefined
                            ? `${activeContributor.share.toFixed(2)}%`
                            : '-'}
                        </strong>
                      </span>
                      <span>
                        <span>{t('contributors.lpTokens')}</span>
                        <strong>{shortNiceNumber(activeContributor.balance, 2, 1)}</strong>
                      </span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="tokenChartEmpty">{t('common.chartDataUnavailable')}</div>
            )}
          </div>
          <div
            className={`ammContributorsList ${
              showAllContributors ? 'ammContributorsList-expanded' : 'ammContributorsList-collapsed'
            }`.trim()}
          >
            <div className="ammContributorListHeader">
              <span></span>
              <span>{t('contributors.wallet')}</span>
              <span>{t('contributors.share')}</span>
              <span>{t('contributors.lpTokens')}</span>
            </div>
            {listRows.map((record, index) => {
              const share = contributorShare(record.balance, totalCoins)
              const fiatValue =
                lpTokenUnitFiat !== null && lpTokenUnitFiat !== undefined
                  ? Number(record.balance || 0) * lpTokenUnitFiat
                  : null
              return (
                <Link
                  href={`/account/${record.address}`}
                  className={`ammContributorRow${activeContributorIndex === index ? ' ammContributorRow-active' : ''}`}
                  key={record.trustlineID || record.address || index}
                  prefetch={false}
                  onBlur={() => {
                    if (!isMobile) setActiveContributorIndex(null)
                  }}
                  onClick={(event) => {
                    if (!isMobile) return
                    if (activeContributorIndex !== index) {
                      event.preventDefault()
                      setActiveContributorIndex(index)
                    }
                  }}
                  onFocus={() => setActiveContributorIndex(index)}
                  onMouseEnter={() => {
                    if (!isMobile) setActiveContributorIndex(index)
                  }}
                  onMouseLeave={() => {
                    if (!isMobile) setActiveContributorIndex(null)
                  }}
                  style={{ '--amm-contributor-color': contributorBaseColor(index, chartItems.length) }}
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
                  <span className="ammContributorLp">
                    <span title={t('contributors.lpTokenAmount', { amount: fullNiceNumber(record.balance) })}>
                      {shortNiceNumber(record.balance, 2, 1)}
                    </span>
                    {fiatValue !== null && Number.isFinite(fiatValue) ? (
                      <span className="ammContributorFiat">{fiatEstimateText(fiatValue, selectedCurrency)}</span>
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
                  setActiveContributorIndex(null)
                  setShowAllContributors((current) => !current)
                }}
              >
                {showAllContributors ? t('contributors.showTop10') : t('contributors.showTopCount', { count: listRows.length })}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="tokenChartEmpty">{t('contributors.unavailable')}</div>
      )}
    </section>
  )
}

export default function AmmDetailsPage({
  id,
  initialData,
  initialSwapsData,
  initialChartData,
  initialLpTokenData,
  initialLpChartData,
  initialContributorsData,
  initialErrorMessage,
  ledgerTimestampQuery,
  fiatRate: fiatRateApp,
  selectedCurrency: selectedCurrencyApp,
  fiatRateServer,
  selectedCurrencyServer,
  canonicalPath,
  lpTokenData,
  showTopTabs = true,
  setSignRequest,
  account
}) {
  const { t, i18n } = useTranslation(['common', 'amm'])
  const ta = useCallback((key, options = {}) => t(key, { ns: 'amm', ...options }), [t])
  const router = useRouter()
  const isMobile = useIsMobile(600)

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(
    ledgerTimestampQuery ? new Date(ledgerTimestampQuery) : null
  )
  const [historicalData, setHistoricalData] = useState(null)
  const [historicalLoading, setHistoricalLoading] = useState(false)
  const [historicalError, setHistoricalError] = useState('')
  const [historicalFiatRates, setHistoricalFiatRates] = useState(null)
  const [historicalFiatLoading, setHistoricalFiatLoading] = useState(false)
  const [price24hRates, setPrice24hRates] = useState(null)
  const [loading, setLoading] = useState(!initialData && !!id)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage || '')
  const [data, setData] = useState(initialData)
  const [lpTokenDetails, setLpTokenDetails] = useState(initialLpTokenData || lpTokenData || null)
  const [dexSwaps, setDexSwaps] = useState(initialSwapList(initialSwapsData, 'dexSwaps'))
  const [liquiditySwaps, setLiquiditySwaps] = useState(initialSwapList(initialSwapsData, 'liquiditySwaps'))
  const [contributorsData, setContributorsData] = useState(initialContributorsData || null)
  const [contributorsDataKey, setContributorsDataKey] = useState(
    initialContributorsData ? lpContributorsKey(initialData, selectedCurrency) : ''
  )
  const [chartPeriod, setChartPeriod] = useState(DEFAULT_CHART_PERIOD)
  const [chartRows, setChartRows] = useState(sortChartRows(initialChartData?.chart))
  const [lpChartRows, setLpChartRows] = useState(Array.isArray(initialLpChartData?.chart) ? initialLpChartData.chart : [])
  const [dexSwapsLoading, setDexSwapsLoading] = useState(!hasInitialSwaps(initialSwapsData) && !!id)
  const [liquiditySwapsLoading, setLiquiditySwapsLoading] = useState(!hasInitialSwaps(initialSwapsData) && !!id)
  const [contributorsLoading, setContributorsLoading] = useState(!initialContributorsData && !!id)
  const [chartLoading, setChartLoading] = useState(!initialChartData && !!id)
  const [dexOrder, setDexOrder] = useState('new')
  const [liquidityOrder, setLiquidityOrder] = useState('new')
  const [activityType, setActivityType] = useState('dex')
  const [liquidityType, setLiquidityType] = useState('deposit')
  const [refreshHidden, setRefreshHidden] = useState(false)
  const [refreshSeconds, setRefreshSeconds] = useState(0)
  const [auctionBidError, setAuctionBidError] = useState('')
  const [auctionBidResult, setAuctionBidResult] = useState(null)
  const [auctionAuthAccounts, setAuctionAuthAccounts] = useState(['', '', '', ''])
  const [auctionAuthAccountCount, setAuctionAuthAccountCount] = useState(0)
  const [auctionLpBalance, setAuctionLpBalance] = useState(null)
  const [auctionLpBalanceLoading, setAuctionLpBalanceLoading] = useState(false)
  const [voteFeeError, setVoteFeeError] = useState('')
  const [voteFeeResult, setVoteFeeResult] = useState(null)
  const contributorsKeyRef = useRef(contributorsDataKey)
  const chartUrl = useMemo(() => ammChartUrl(id, selectedCurrency, chartPeriod), [chartPeriod, id, selectedCurrency])
  const initialChartUrl = useMemo(
    () => (initialChartData ? ammChartUrl(id, selectedCurrencyServer) : ''),
    [id, initialChartData, selectedCurrencyServer]
  )
  const loadedChartUrlRef = useRef(initialChartUrl)
  const lpChartUrl = useMemo(
    () => lpTokenChartUrl(data, selectedCurrency, chartPeriod),
    [chartPeriod, data, selectedCurrency]
  )
  const initialLpChartUrl = useMemo(
    () => (initialLpChartData ? lpTokenChartUrl(initialData, selectedCurrencyServer) : ''),
    [initialData, initialLpChartData, selectedCurrencyServer]
  )
  const loadedLpChartUrlRef = useRef(initialLpChartUrl)

  useEffect(() => {
    setData(initialData)
    setLpTokenDetails(initialLpTokenData || lpTokenData || null)
    setErrorMessage(initialErrorMessage || '')
    setLoading(!initialData && !!id)
    setLedgerTimestampInput(ledgerTimestampQuery ? new Date(ledgerTimestampQuery) : null)
    setHistoricalData(null)
    setHistoricalError('')
    setHistoricalLoading(false)
    setHistoricalFiatRates(null)
    setHistoricalFiatLoading(false)
    setPrice24hRates(null)
    setAuctionLpBalance(null)
    setAuctionLpBalanceLoading(false)
  }, [id, initialData, initialErrorMessage, initialLpTokenData, ledgerTimestampQuery, lpTokenData])

  useEffect(() => {
    setDexSwaps(initialSwapList(initialSwapsData, 'dexSwaps'))
    setLiquiditySwaps(initialSwapList(initialSwapsData, 'liquiditySwaps'))
    setDexSwapsLoading(!hasInitialSwaps(initialSwapsData) && !!id)
    setLiquiditySwapsLoading(!hasInitialSwaps(initialSwapsData) && !!id)
    setRefreshHidden(false)
    setRefreshSeconds(0)
  }, [id, initialSwapsData])

  useEffect(() => {
    setChartRows(sortChartRows(initialChartData?.chart))
    setChartLoading(!initialChartData && !!id)
    setChartPeriod(DEFAULT_CHART_PERIOD)
    loadedChartUrlRef.current = initialChartUrl
  }, [id, initialChartData, initialChartUrl])

  useEffect(() => {
    setLpChartRows(Array.isArray(initialLpChartData?.chart) ? initialLpChartData.chart : [])
    loadedLpChartUrlRef.current = initialLpChartUrl
  }, [id, initialLpChartData, initialLpChartUrl])

  useEffect(() => {
    setContributorsData(initialContributorsData || null)
    setContributorsDataKey(initialContributorsData ? lpContributorsKey(initialData, selectedCurrency) : '')
    setContributorsLoading(!initialContributorsData && !!id)
  }, [id, initialContributorsData, initialData, selectedCurrency])

  const poolName = lpTokenName(data)
  const selectedLpToken = lpSelectorToken(data)
  const lpAnalyticsToken = lpTokenDetails || lpTokenData || selectedLpToken
  const asset1Name = assetCurrency(data?.amount)
  const asset2Name = assetCurrency(data?.amount2)
  const latestChartRow = chartRows?.[chartRows.length - 1] || {}
  const previousChartRow = chartRows?.[chartRows.length - 2] || {}
  const latestLpChartRow = lpChartRows?.[lpChartRows.length - 1] || {}
  const hasStatistics = data?.statistics && typeof data.statistics === 'object'
  const statistics = hasStatistics ? data.statistics : {}
  const currentContributorsKey = lpContributorsKey(data, selectedCurrency)
  const currentContributors = data?.holders ?? null
  const currentTrustlines = data?.trustlines ?? null
  const closedDaySwaps = statistics.swapCount ?? null
  const hasAuctionSlot = !!data?.auctionSlot
  const auctionSlotExpired = hasAuctionSlot && isTimestampExpired(data.auctionSlot?.expiration)
  const auctionSlotActive = hasAuctionSlot && !auctionSlotExpired
  const auctionSlotHolderAddress =
    data?.auctionSlot?.account || data?.auctionSlot?.address || data?.auctionSlot?.accountDetails?.address || ''
  const auctionSlotAuthAccounts = Array.isArray(data?.auctionSlot?.authAccounts) ? data.auctionSlot.authAccounts : []
  const auctionUserIsSlotHolder = !!account?.address && auctionSlotActive && auctionSlotHolderAddress === account.address
  const auctionUserIsAuthorized =
    !!account?.address &&
    auctionSlotActive &&
    auctionSlotAuthAccounts.some(
      (authAccount) =>
        authAccount?.account === account.address ||
        authAccount?.address === account.address ||
        authAccount?.accountDetails?.address === account.address
    )
  const auctionUserHasDiscount = auctionUserIsSlotHolder || auctionUserIsAuthorized
  const auctionMath = auctionEstimates(data)
  const auctionBidMax = auctionMath?.bid?.multipliedBy(AUCTION_BID_MAX_MULTIPLIER)
  const auctionRequiredLp = auctionBidMax || auctionMath?.depositBid
  const auctionUserLpBalance = account?.address && auctionLpBalance !== null ? new BigNumber(auctionLpBalance) : null
  const auctionLpShortfall =
    auctionRequiredLp && auctionUserLpBalance
      ? BigNumber.max(auctionRequiredLp.minus(auctionUserLpBalance), 0)
      : null
  const auctionBalanceReady = !account?.address || (!auctionLpBalanceLoading && auctionLpShortfall !== null)
  const auctionNeedsMoreLp = !!account?.address && auctionLpShortfall !== null && auctionLpShortfall.gt(0)
  const auctionHasEnoughLp = !!account?.address && auctionLpShortfall !== null && !auctionNeedsMoreLp
  const showAuctionBidAction = !auctionUserHasDiscount && (!account?.address || (auctionBalanceReady && auctionHasEnoughLp))
  const showAuctionMintAction = !auctionUserHasDiscount && (!account?.address || (auctionBalanceReady && auctionNeedsMoreLp))
  const auctionMintLpTarget = showAuctionMintAction
    ? auctionMintTargetForBalance(data, account?.address ? auctionUserLpBalance : 0) || auctionRequiredLp
    : null
  const winningDiscountedFee = auctionWinnerDiscountedFee(data?.tradingFee)
  const tvlParts = [
    amountFiatValue(data?.amount, selectedCurrency, fiatRate),
    amountFiatValue(data?.amount2, selectedCurrency, fiatRate)
  ]
  const tvlFiat = tvlParts.every((value) => value !== null) ? tvlParts[0] + tvlParts[1] : null
  const lpTokenUnitFiat =
    tvlFiat !== null && Number(data?.lpTokenBalance?.value) > 0 ? tvlFiat / Number(data.lpTokenBalance.value) : null
  const auctionLpFiat = (value) =>
    lpTokenUnitFiat !== null && value !== null && value !== undefined ? Number(value) * lpTokenUnitFiat : null
  const auctionLpAmountNode = (value) => {
    if (!value && value !== 0) return '-'
    const fiat = auctionLpFiat(value)
    return (
      <>
        {formatAuctionLpEstimate(value)}
        {fiat !== null && fiat !== undefined ? <> {fiatEstimateText(fiat, selectedCurrency)}</> : null}
      </>
    )
  }
  const auctionEstimateFiats = auctionMath
    ? {
        bid: lpTokenUnitFiat !== null ? Number(auctionMath.bid) * lpTokenUnitFiat : null,
        bidMax:
          lpTokenUnitFiat !== null
            ? Number(auctionMath.bid.multipliedBy(AUCTION_BID_MAX_MULTIPLIER)) * lpTokenUnitFiat
            : null,
        mintLpTarget: lpTokenUnitFiat !== null && auctionMintLpTarget ? Number(auctionMintLpTarget) * lpTokenUnitFiat : null,
        assets: auctionMath.assetEstimates.map((asset) => ({
          key: asset.key,
          cost: amountFiatValue(amountObjectFromPoolUnits(asset.amount, asset.cost), selectedCurrency, fiatRate),
          breakEvenVolume: asset.breakEvenVolume
            ? amountFiatValue(amountObjectFromPoolUnits(asset.amount, asset.breakEvenVolume), selectedCurrency, fiatRate)
            : null
        }))
      }
    : null
  const previousNativeUnitFiat = directHistoricalAssetUnitFiatRate({ currency: nativeCurrency }, price24hRates)
  const previousPoolSideFiat =
    previousNativeUnitFiat !== null && latestChartRow
      ? isNativeAsset(data?.amount) && latestChartRow.value1 !== undefined
        ? amountFiatValueFromUnitRate(assetDisplayAmount(data.amount, latestChartRow.value1), previousNativeUnitFiat)
        : isNativeAsset(data?.amount2) && latestChartRow.value2 !== undefined
          ? amountFiatValueFromUnitRate(assetDisplayAmount(data.amount2, latestChartRow.value2), previousNativeUnitFiat)
          : null
      : null

  useEffect(() => {
    contributorsKeyRef.current = currentContributorsKey
  }, [currentContributorsKey])

  const refreshAmmDetails = useCallback(
    async ({ showLoading = false } = {}) => {
      if (!id) return null

      if (showLoading) {
        setLoading(true)
        setErrorMessage('')
      }

      const response = await axios(ammUrl(id, '')).catch((error) => {
        if (showLoading) {
          setErrorMessage(t('error.' + error.message, { defaultValue: error.message }))
        }
        return null
      })

      const newdata = response?.data

      if (showLoading) {
        setLoading(false)
      }

      if (!newdata) return null

      if (newdata.account) {
        setData(newdata)
        if (!ledgerTimestampQuery) {
          setLedgerTimestampInput(newdata.ledgerTimestamp ? new Date(newdata.ledgerTimestamp * 1000) : null)
        }
        return newdata
      }

      if (showLoading) {
        if (newdata.error === 'Account malformed.') {
          setErrorMessage(ta('errors.noAmmData'))
        } else {
          setErrorMessage(newdata.error ? t('error-api.' + newdata.error, { defaultValue: newdata.error }) : 'Error')
        }
      }

      return null
    },
    [id, ledgerTimestampQuery, t, ta]
  )

  const fetchAuctionLpBalance = useCallback(async () => {
    const address = account?.address

    if (!address || !data?.account || !data?.lpTokenBalance?.currency) {
      setAuctionLpBalance(null)
      setAuctionLpBalanceLoading(false)
      return null
    }

    setAuctionLpBalanceLoading(true)
    const response = await axios(`v2/trustlines/${encodeURIComponent(address)}`).catch(() => null)
    const balance = lpTrustlineBalance(response?.data, data, address) || new BigNumber(0)
    setAuctionLpBalance(balance.toString())
    setAuctionLpBalanceLoading(false)
    return balance
  }, [account?.address, data])

  useEffect(() => {
    fetchAuctionLpBalance()
  }, [fetchAuctionLpBalance])

  const onAuctionBid = useCallback(() => {
    setAuctionBidError('')
    setAuctionBidResult(null)

    if (!setSignRequest || !auctionMath?.bid || !data?.amount || !data?.amount2 || !data?.lpTokenBalance) return

    if (auctionUserHasDiscount) {
      setAuctionBidError(ta(auctionUserIsSlotHolder ? 'auction.yourActiveSlot' : 'auction.yourAuthorizedSlot'))
      return
    }

    if (auctionNeedsMoreLp && auctionLpShortfall) {
      setAuctionBidError(ta('auction.lpBalanceShortfall', { amount: formatAuctionLpEstimate(auctionLpShortfall) }))
      return
    }

    const bidMin = auctionMath.bid.toPrecision(15)
    const bidMax = auctionMath.bid.multipliedBy(AUCTION_BID_MAX_MULTIPLIER).toPrecision(15)
    const authAccounts = auctionAuthAccounts
      .map((address) => address.trim())
      .filter(Boolean)
      .filter((address, index, addresses) => addresses.indexOf(address) === index)
    const invalidAuthAccount = authAccounts.find((address) => !isAddressValid(address))

    if (invalidAuthAccount) {
      setAuctionBidError(ta('auction.invalidAuthorizedAccount', { account: invalidAuthAccount }))
      return
    }

    if (account?.address && authAccounts.includes(account.address)) {
      setAuctionBidError(ta('auction.bidderAlreadyDiscounted'))
      return
    }

    const lpToken = {
      currency: data.lpTokenBalance.currency,
      issuer: data.lpTokenBalance.issuer || data.account,
      value: bidMin
    }
    const bidRequest = {
      TransactionType: 'AMMBid',
      Asset: assetTxIssue(data.amount),
      Asset2: assetTxIssue(data.amount2),
      BidMin: lpToken,
      BidMax: {
        ...lpToken,
        value: bidMax
      }
    }

    if (authAccounts.length) {
      bidRequest.AuthAccounts = authAccounts.map((address) => ({
        AuthAccount: {
          Account: address
        }
      }))
    }

    setSignRequest({
      request: bidRequest,
      callback: (result) => {
        if (!result) return
        const status = result.meta?.TransactionResult

        if (status !== 'tesSUCCESS') {
          setAuctionBidError(errorCodeDescription(status))
          return
        }

        setAuctionBidResult({
          status,
          hash: result.hash
        })

        refreshAmmDetails()
        fetchAuctionLpBalance()
      }
    })
  }, [
    account?.address,
    auctionAuthAccounts,
    auctionLpShortfall,
    auctionMath,
    auctionNeedsMoreLp,
    auctionUserHasDiscount,
    auctionUserIsSlotHolder,
    data,
    fetchAuctionLpBalance,
    refreshAmmDetails,
    setSignRequest,
    ta
  ])

  const setAuctionAuthAccount = useCallback((index, value) => {
    setAuctionAuthAccounts((current) => current.map((address, idx) => (idx === index ? value : address)))
  }, [])

  const visibleAuctionAuthAccounts = auctionAuthAccounts.slice(0, auctionAuthAccountCount)
  const filledAuctionAuthAccountsCount = auctionAuthAccounts.filter((address) => address.trim()).length
  const canAddAuctionAuthAccount = auctionAuthAccountCount < auctionAuthAccounts.length
  const showAuctionAuthAccounts = auctionAuthAccountCount > 0

  const onAuctionDeposit = useCallback(
    (assetEstimate) => {
      setAuctionBidError('')
      setAuctionBidResult(null)

      if (
        !setSignRequest ||
        !auctionMintLpTarget ||
        !assetEstimate?.amount ||
        !data?.amount ||
        !data?.amount2 ||
        !data?.lpTokenBalance
      )
        return

      const depositMax = assetEstimate.cost.multipliedBy(AUCTION_DEPOSIT_MAX_MULTIPLIER)
      const lpTokenOut = {
        currency: data.lpTokenBalance.currency,
        issuer: data.lpTokenBalance.issuer || data.account,
        value: auctionMintLpTarget.toPrecision(15)
      }

      setSignRequest({
        request: {
          TransactionType: 'AMMDeposit',
          Asset: assetTxIssue(data.amount),
          Asset2: assetTxIssue(data.amount2),
          Amount: txAmountObjectFromPoolUnits(assetEstimate.amount, depositMax),
          LPTokenOut: lpTokenOut,
          Flags: 0x00200000
        },
        callback: (result) => {
          if (!result) return
          const status = result.meta?.TransactionResult

          if (status !== 'tesSUCCESS') {
            setAuctionBidError(errorCodeDescription(status))
            return
          }

          setAuctionBidResult({
            action: 'deposit',
            status,
            hash: result.hash
          })

          refreshAmmDetails()
          fetchAuctionLpBalance()
        }
      })
    },
    [auctionMintLpTarget, data, fetchAuctionLpBalance, refreshAmmDetails, setSignRequest]
  )

  const onAuctionDepositBoth = useCallback(() => {
    setAuctionBidError('')
    setAuctionBidResult(null)

    if (!setSignRequest || !auctionMintLpTarget || !data?.amount || !data?.amount2 || !data?.lpTokenBalance) return

    const lpTokenOut = {
      currency: data.lpTokenBalance.currency,
      issuer: data.lpTokenBalance.issuer || data.account,
      value: auctionMintLpTarget.toPrecision(15)
    }

    setSignRequest({
      request: {
        TransactionType: 'AMMDeposit',
        Asset: assetTxIssue(data.amount),
        Asset2: assetTxIssue(data.amount2),
        LPTokenOut: lpTokenOut,
        Flags: 0x00010000
      },
      callback: (result) => {
        if (!result) return
        const status = result.meta?.TransactionResult

        if (status !== 'tesSUCCESS') {
          setAuctionBidError(errorCodeDescription(status))
          return
        }

        setAuctionBidResult({
          action: 'deposit',
          status,
          hash: result.hash
        })

        refreshAmmDetails()
        fetchAuctionLpBalance()
      }
    })
  }, [auctionMintLpTarget, data, fetchAuctionLpBalance, refreshAmmDetails, setSignRequest])

  const auctionBothAssetDeposit = auctionMintLpTarget ? exactLpDepositAmounts(data, auctionMintLpTarget) : null
  const auctionDepositActions =
    auctionMintLpTarget && data?.lpTokenBalance?.value && data?.amount && data?.amount2
      ? [
          { key: 'asset1', amount: data.amount },
          { key: 'asset2', amount: data.amount2 }
        ].map((assetEstimate) => {
          const cost = ammAssetIn(
            poolAmountUnits(assetEstimate.amount),
            data.lpTokenBalance.value,
            auctionMintLpTarget,
            data.tradingFee
          )
          return {
            ...assetEstimate,
            cost,
            maxCost: cost.multipliedBy(AUCTION_DEPOSIT_MAX_MULTIPLIER)
          }
        })
      : []

  const onVoteFee = useCallback(() => {
    setVoteFeeError('')
    setVoteFeeResult(null)

    if (!setSignRequest || !data?.amount || !data?.amount2) return

    setSignRequest({
      action: 'ammVoteFee',
      request: {
        TransactionType: 'AMMVote',
        Asset: assetTxIssue(data.amount),
        Asset2: assetTxIssue(data.amount2),
        TradingFee: Number(data.tradingFee) || 0
      },
      data: {
        tradingFeePercent:
          data?.tradingFee !== undefined && data?.tradingFee !== null ? String(Number(data.tradingFee) / 1000) : ''
      },
      callback: (result) => {
        if (!result) return
        const status = result.meta?.TransactionResult

        if (status !== 'tesSUCCESS') {
          setVoteFeeError(errorCodeDescription(status))
          return
        }

        setVoteFeeResult({
          status,
          hash: result.hash
        })

        refreshAmmDetails()
      }
    })
  }, [data, refreshAmmDetails, setSignRequest])

  const ammLiquiditySignData = useMemo(
    () =>
      data?.amount && data?.amount2
        ? {
            asset1: data.amount,
            asset2: data.amount2,
            tradingFee: data.tradingFee,
            lpToken: data?.lpTokenBalance?.currency
              ? {
                  currency: data.lpTokenBalance.currency,
                  issuer: data.lpTokenBalance.issuer || data.account,
                  value: data.lpTokenBalance.value
                }
              : null
          }
        : null,
    [data]
  )

  const onAmmDeposit = useCallback(() => {
    if (!setSignRequest || !ammLiquiditySignData) return
    setSignRequest({
      action: 'ammDeposit',
      request: {
        TransactionType: 'AMMDeposit',
        Asset: assetTxIssue(ammLiquiditySignData.asset1),
        Asset2: assetTxIssue(ammLiquiditySignData.asset2)
      },
      data: ammLiquiditySignData
    })
  }, [ammLiquiditySignData, setSignRequest])

  const onAmmWithdraw = useCallback(() => {
    if (!setSignRequest || !ammLiquiditySignData) return
    setSignRequest({
      action: 'ammWithdraw',
      request: {
        TransactionType: 'AMMWithdraw',
        Asset: assetTxIssue(ammLiquiditySignData.asset1),
        Asset2: assetTxIssue(ammLiquiditySignData.asset2)
      },
      data: ammLiquiditySignData
    })
  }, [ammLiquiditySignData, setSignRequest])

  const tvlValue = tvlFiat !== null ? (
    <span className="tooltip no-brake" suppressHydrationWarning>
      ≈ {shortNiceNumber(tvlFiat, 2, 1, selectedCurrency)}
      <span className="tooltiptext no-brake" suppressHydrationWarning>
        {fullNiceNumber(tvlFiat, selectedCurrency)}
      </span>
    </span>
  ) : (
    '-'
  )
  const lookupSelectedDate = ledgerTimestampInput
    ? new Date(ledgerTimestampInput)
    : data?.ledgerTimestamp
      ? new Date(data.ledgerTimestamp * 1000)
      : data?.updatedAt
        ? new Date(data.updatedAt * 1000)
        : null
  const historicalSnapshotDate = historicalData?.ledgerTimestamp ? new Date(historicalData.ledgerTimestamp * 1000) : null
  const historicalSnapshotText = historicalData?.ledgerTimestamp
    ? fullDateAndTime(historicalData.ledgerTimestamp, null, { asText: true })
    : ''

  const getData = useCallback(async () => {
    await refreshAmmDetails({ showLoading: true })
  }, [refreshAmmDetails])

  const fetchHistoricalData = useCallback(
    async (nextLedgerTimestamp) => {
      if (!id || !nextLedgerTimestamp) return

      const lookupDate = new Date(nextLedgerTimestamp)
      if (Number.isNaN(lookupDate.getTime())) return

      setHistoricalLoading(true)
      setHistoricalError('')
      setHistoricalFiatRates(null)
      setHistoricalFiatLoading(false)

      const response = await axios(ammUrl(id, lookupDate.toISOString())).catch((error) => {
        setHistoricalError(t('error.' + error.message, { defaultValue: error.message }))
        return null
      })

      const newdata = response?.data
      setHistoricalLoading(false)
      if (!newdata) return

      if (newdata.account) {
        const actualDate = newdata.ledgerTimestamp ? new Date(newdata.ledgerTimestamp * 1000) : lookupDate
        setHistoricalData(newdata)
        setLedgerTimestampInput(actualDate)
        addQueryParams(router, [{ name: 'ledgerTimestamp', value: actualDate.toISOString() }])
      } else if (newdata.error === 'Account malformed.') {
        setHistoricalData(null)
        setHistoricalFiatRates(null)
        setHistoricalError(ta('errors.noHistoricalData'))
      } else {
        setHistoricalData(null)
        setHistoricalFiatRates(null)
        setHistoricalError(newdata.error ? t('error-api.' + newdata.error, { defaultValue: newdata.error }) : 'Error')
      }
    },
    [id, router, t, ta]
  )

  const fetchDexSwaps = useCallback(async () => {
    if (!id || !data?.account) return
    setDexSwapsLoading(true)
    const response = await axios(ammTokenSwapsUrl(data, id, 'dex', dexOrder)).catch(() => null)
    setDexSwaps(Array.isArray(response?.data?.swaps) ? response.data.swaps : [])
    setDexSwapsLoading(false)
  }, [data, dexOrder, id])

  const fetchLiquiditySwaps = useCallback(async () => {
    if (!id || !data?.account) return
    setLiquiditySwapsLoading(true)
    const response = await axios(ammLiquiditySwapsUrl(id, liquidityType, liquidityOrder)).catch(() => null)
    setLiquiditySwaps(Array.isArray(response?.data?.swaps) ? response.data.swaps : [])
    setLiquiditySwapsLoading(false)
  }, [data?.account, id, liquidityOrder, liquidityType])

  const fetchContributors = useCallback(async () => {
    const url = lpContributorsUrl(data, selectedCurrency)
    const key = lpContributorsKey(data, selectedCurrency)
    if (!url) {
      setContributorsLoading(false)
      return
    }
    setContributorsLoading(true)
    const response = await axios(url).catch(() => null)
    if (contributorsKeyRef.current !== key) {
      setContributorsLoading(false)
      return
    }
    setContributorsData(response?.data || null)
    setContributorsDataKey(key)
    setContributorsLoading(false)
  }, [data, selectedCurrency])

  const fetchChart = useCallback(async () => {
    if (!chartUrl) return
    setChartLoading(true)
    setChartRows([])
    const response = await axios(chartUrl).catch(() => null)
    setChartRows(sortChartRows(response?.data?.chart))
    loadedChartUrlRef.current = chartUrl
    setChartLoading(false)
  }, [chartUrl])

  useEffect(() => {
    if (initialData || !id) return
    getData()
  }, [getData, id, initialData])

  useEffect(() => {
    if (!ledgerTimestampQuery || !id) return
    fetchHistoricalData(new Date(ledgerTimestampQuery))
  }, [fetchHistoricalData, id, ledgerTimestampQuery])

  useEffect(() => {
    if (!historicalData?.account || !selectedCurrency) {
      setHistoricalFiatRates(null)
      setHistoricalFiatLoading(false)
      return undefined
    }

    let ignore = false

    const loadHistoricalFiatRates = async () => {
      const snapshotDate = historicalData.ledgerTimestamp
        ? new Date(historicalData.ledgerTimestamp * 1000)
        : ledgerTimestampInput
          ? new Date(ledgerTimestampInput)
          : null

      if (!snapshotDate || Number.isNaN(snapshotDate.getTime())) {
        setHistoricalFiatRates(null)
        setHistoricalFiatLoading(false)
        return
      }

      setHistoricalFiatLoading(true)

      const timestampSeconds = Math.floor(snapshotDate.getTime() / 1000)
      const nativeRate = await fetchHistoricalRate({ timestamp: snapshotDate, selectedCurrency }).catch(() => null)
      const rates = {}

      const setRate = (key, value) => {
        const number = Number(value)
        if (key && Number.isFinite(number) && number > 0) rates[key] = number
      }

      const addAssetRate = async (amount) => {
        const key = assetHistoricalRateKey(amount)
        if (!key) return

        if (isNativeAsset(amount)) {
          setRate(key, nativeRate)
          return
        }

        if (!amount?.issuer || !amount?.currency) return

        const tokenRate = await fetchHistoricalTokenFiatRate({
          issuer: amount.issuer,
          currency: amount.currency,
          date: timestampSeconds,
          selectedCurrency
        }).catch(() => null)
        setRate(key, tokenRate)
      }

      await Promise.all([historicalData.amount, historicalData.amount2].map(addAssetRate))

      if (!ignore) {
        setHistoricalFiatRates({ timestamp: timestampSeconds, rates })
        setHistoricalFiatLoading(false)
      }
    }

    loadHistoricalFiatRates().catch(() => {
      if (!ignore) {
        setHistoricalFiatRates(null)
        setHistoricalFiatLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [historicalData, ledgerTimestampInput, selectedCurrency])

  useEffect(() => {
    if (!data?.amount || !data?.amount2 || !selectedCurrency) {
      setPrice24hRates(null)
      return undefined
    }

    let ignore = false

    const loadPrice24hRates = async () => {
      const snapshotDate = new Date(Date.now() - DAY_MS)
      const timestampSeconds = Math.floor(snapshotDate.getTime() / 1000)
      const nativeRate = await fetchHistoricalRate({ timestamp: snapshotDate, selectedCurrency }).catch(() => null)
      const rates = {}

      const setRate = (key, value) => {
        const number = Number(value)
        if (key && Number.isFinite(number) && number > 0) rates[key] = number
      }

      const addAssetRate = async (amount) => {
        const key = assetHistoricalRateKey(amount)
        if (!key) return

        if (isNativeAsset(amount)) {
          setRate(key, nativeRate)
          return
        }

        if (!amount?.issuer || !amount?.currency) return

        const tokenRate = await fetchHistoricalTokenFiatRate({
          issuer: amount.issuer,
          currency: amount.currency,
          date: timestampSeconds,
          selectedCurrency
        }).catch(() => null)
        setRate(key, tokenRate)
      }

      await Promise.all([data.amount, data.amount2].map(addAssetRate))

      if (!ignore) {
        setPrice24hRates({ timestamp: timestampSeconds, rates })
      }
    }

    loadPrice24hRates().catch(() => {
      if (!ignore) setPrice24hRates(null)
    })

    return () => {
      ignore = true
    }
  }, [data?.amount, data?.amount2, selectedCurrency])

  useEffect(() => {
    fetchDexSwaps()
  }, [fetchDexSwaps])

  useEffect(() => {
    fetchLiquiditySwaps()
  }, [fetchLiquiditySwaps])

  useEffect(() => {
    if (!currentContributorsKey) return
    if (contributorsData && contributorsDataKey === currentContributorsKey) return
    fetchContributors()
  }, [contributorsData, contributorsDataKey, currentContributorsKey, fetchContributors])

  useEffect(() => {
    if (!chartUrl || loadedChartUrlRef.current === chartUrl) return
    fetchChart()
  }, [chartUrl, fetchChart])

  useEffect(() => {
    if (lpTokenDetails || !lpTokenDetailsUrl(data)) return
    let ignore = false
    axios(lpTokenDetailsUrl(data))
      .then((response) => {
        if (!ignore) setLpTokenDetails(response?.data || null)
      })
      .catch(() => null)
    return () => {
      ignore = true
    }
  }, [data, lpTokenDetails])

  useEffect(() => {
    if (!lpChartUrl || loadedLpChartUrlRef.current === lpChartUrl) return
    let ignore = false
    setLpChartRows([])
    axios(lpChartUrl)
      .then((response) => {
        if (!ignore) {
          setLpChartRows(Array.isArray(response?.data?.chart) ? response.data.chart : [])
          loadedLpChartUrlRef.current = lpChartUrl
        }
      })
      .catch(() => null)
    return () => {
      ignore = true
    }
  }, [lpChartUrl])

  useEffect(() => {
    if (!refreshHidden) return undefined
    setRefreshSeconds(Math.ceil(REFRESH_COOLDOWN_MS / 1000))
    const interval = setInterval(() => setRefreshSeconds((seconds) => Math.max(seconds - 1, 0)), 1000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setRefreshHidden(false)
      setRefreshSeconds(0)
    }, REFRESH_COOLDOWN_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [refreshHidden])

  const refreshDexSwaps = () => {
    setRefreshHidden(true)
    fetchDexSwaps()
  }

  const refreshLiquiditySwaps = () => {
    setRefreshHidden(true)
    fetchLiquiditySwaps()
  }

  const resetTimeMachine = () => {
    setLedgerTimestampInput(null)
    setHistoricalData(null)
    setHistoricalError('')
    setHistoricalLoading(false)
    setHistoricalFiatRates(null)
    setHistoricalFiatLoading(false)
    removeQueryParams(router, ['ledgerTimestamp'])
  }

  const handleLpSelect = async (token) => {
    let ammID = tokenAmmId(token)
    if (ammID) {
      router.push('/amm/' + ammID)
      return
    }

    if (token?.issuer && token?.currency) {
      setLoading(true)
      const response = await axios(
        `v2/token/${encodeURIComponent(token.issuer)}/${encodeURIComponent(token.currency)}?currencyDetails=true`
      ).catch(() => null)
      ammID = tokenAmmId(response?.data)
      if (ammID) {
        router.push('/amm/' + ammID)
      } else {
        setLoading(false)
        router.push(`/token/${token.issuer}/${token.currency}`)
      }
    }
  }

  const renderMetricAssetLine = (amount, value, previousValue = null, options = {}) => {
    const {
      invertDeltaColor = false,
      deltaTitle = ta('tooltips.comparedLastClosedDay'),
      showFiatDelta = false,
      previousFiatValue: previousFiatValueOverride = null,
      shortAmount = false,
      fiatUnitRate = null
    } = options
    const displayAmount = assetDisplayAmount(amount, value)
    const numericFiatUnitRate = Number(fiatUnitRate)
    const hasFiatUnitRate = Number.isFinite(numericFiatUnitRate) && numericFiatUnitRate > 0
    const currentFiatValue = hasFiatUnitRate
      ? amountFiatValueFromUnitRate(displayAmount, numericFiatUnitRate)
      : amountFiatValue(displayAmount, selectedCurrency, fiatRate)
    const previousFiatValue =
      showFiatDelta && previousFiatValueOverride !== null && previousFiatValueOverride !== undefined
        ? previousFiatValueOverride
        : showFiatDelta && previousValue !== null && previousValue !== undefined
        ? amountFiatValueFromUnitRate(
            assetDisplayAmount(amount, previousValue),
            directHistoricalAssetUnitFiatRate(amount, price24hRates)
          )
        : null

    return (
      <span className="ammMetricAmountLine ammMetricAmountLineWithDelta">
        <span className={`ammMetricAmountMain${shortAmount ? ' ammMetricAmountMainWithTooltip' : ''}`}>
          <span className={shortAmount ? 'tooltip ammMetricAmountTooltip' : undefined}>
            <AmountWithIcon
              amount={displayAmount}
              options={
                shortAmount
                  ? { linkCurrency: true, short: true, shortSmallFractionDigits: 2, shortLargeFractionDigits: 1 }
                  : { linkCurrency: true, precise: 'nice' }
              }
            />
            {shortAmount ? (
              <span className="tooltiptext no-brake" suppressHydrationWarning>
                {fullNiceNumber(getAssetValue(displayAmount))} {assetCurrency(displayAmount)}
              </span>
            ) : null}
          </span>
        </span>
        <span className="ammMetricAmountDeltaColumn">
          <AmmMetricDelta
            cur={getAssetValue(displayAmount)}
            prev={previousValue}
            title={deltaTitle}
            invertColor={invertDeltaColor}
          />
        </span>
        <span className="ammMetricAmountAside">
          {currentFiatValue !== null ? (
            <span className="ammMetricAmountFiat">
              {hasFiatUnitRate ? (
                <span className="tooltip no-brake" suppressHydrationWarning>
                  {' '}
                  ≈ {shortNiceNumber(currentFiatValue, 2, 1, selectedCurrency)}
                  <span className="tooltiptext no-brake" suppressHydrationWarning>
                    1 {assetCurrency(displayAmount)} = {niceNumber(numericFiatUnitRate, null, selectedCurrency, 8)}
                  </span>
                </span>
              ) : (
                tokenToFiat({ amount: displayAmount, selectedCurrency, fiatRate })
              )}
            </span>
          ) : null}
          {showFiatDelta ? (
            <AmmMetricDelta cur={currentFiatValue} prev={previousFiatValue} title={ta('tooltips.fiatReserve24h')} />
          ) : null}
        </span>
      </span>
    )
  }

  const renderMetricNumber = (value) => {
    if (value === undefined || value === null || value === '') return '-'
    return (
      <span className="tooltip" suppressHydrationWarning>
        {shortNiceNumber(value, 2, 1)}
        <span className="tooltiptext no-brake" suppressHydrationWarning>
          {fullNiceNumber(value)}
        </span>
      </span>
    )
  }

  const renderAssetPriceLine = (amount) => {
    const unitFiat = assetUnitFiatValue(amount, selectedCurrency, fiatRate)
    const unitFiat24h = directHistoricalAssetUnitFiatRate(amount, price24hRates)

    return (
      <span className="ammMetricAmountLine">
        <span className="ammMetricAmountMain">
          <AmountWithIcon amount={assetDisplayAmount(amount, 1)} options={{ linkCurrency: true, precise: 'nice' }} />
        </span>
        <span className="ammMetricAmountAside">
          {unitFiat !== null ? (
            <span className="ammMetricAmountFiat" suppressHydrationWarning>
              ≈ {shortNiceNumber(unitFiat, 2, 1, selectedCurrency)}
            </span>
          ) : (
            <span className="ammMetricAmountFiat">-</span>
          )}
          <AmmMetricDelta cur={unitFiat} prev={unitFiat24h} title={ta('tooltips.price24h')} />
        </span>
      </span>
    )
  }

  const tradingFeeControl = (
    <span className="ammHeroFee">
      <span>{ta('hero.tradingFee')}</span>
      <strong>{showAmmPercents(data?.tradingFee)}</strong>
      <span className="ammHeroFeeActions">
        {data?.voteSlots?.length > 0 ? (
          <a href="#amm-vote-slots" className="ammMetricQuietLink">
            {ta('hero.votes')}
          </a>
        ) : null}
        <button type="button" className="button-action thin narrow" disabled={!setSignRequest} onClick={onVoteFee}>
          {ta('hero.vote')}
        </button>
      </span>
      {voteFeeError ? <span className="tokenValueSecondary red">{voteFeeError}</span> : null}
      {voteFeeResult?.hash ? (
        <span className="tokenValueSecondary">
          {ta('common.transaction')}: <LinkTx tx={voteFeeResult.hash} />
        </span>
      ) : null}
    </span>
  )

  const historicalAmountFiatValue = (amount) =>
    amountFiatValueFromUnitRate(amount, historicalAssetUnitFiatRate(amount, selectedCurrency, historicalFiatRates))

  const renderPoolStateAssetValue = (amount, options = {}) => {
    const fiat = options.historical ? historicalAmountFiatValue(amount) : amountFiatValue(amount, selectedCurrency, fiatRate)

    return (
      <span className="tokenValueStack">
        <span className="tokenValuePrimary">
          <AmountWithIcon amount={assetDisplayAmount(amount)} options={{ linkCurrency: true, precise: 'nice' }} />
        </span>
        {fiat !== null && fiat !== undefined ? (
          <span className="tokenValueSecondary">{fiatEstimateText(fiat, selectedCurrency)}</span>
        ) : options.historical && !historicalFiatLoading && historicalFiatRates ? (
          <span className="tokenValueSecondary">{ta('historical.historicalFiatUnavailable')}</span>
        ) : null}
      </span>
    )
  }

  const renderPoolStateSnapshot = (snapshot) => {
    if (!snapshot?.account) return null
    const lpBalance = snapshot.lpTokenBalance
      ? {
          ...snapshot.lpTokenBalance,
          issuer: snapshot.lpTokenBalance.issuer || snapshot.account
        }
      : null
    const snapshotFiatValues = [historicalAmountFiatValue(snapshot.amount), historicalAmountFiatValue(snapshot.amount2)]
    const snapshotTvl = snapshotFiatValues.every((value) => value !== null && value !== undefined)
      ? snapshotFiatValues[0] + snapshotFiatValues[1]
      : null

    return (
      <section className="ammLedgerCard ammSnapshotCard">
        <div className="ammVoteHeader">
          <h3>{ta('historical.poolState')}</h3>
          <span>
            {historicalSnapshotText ? ta('historical.snapshotAt', { time: historicalSnapshotText }) : ta('historical.snapshotFallback')}
            {historicalFiatLoading ? ` ${ta('historical.loadingRates')}` : ` ${ta('historical.nearestRates')}`}
          </span>
        </div>
        <div className="ammLedgerRows">
          <div className="ammLedgerRow">
            <span>{ta('historical.tvlAtSnapshot')}</span>
            <strong>
              {historicalFiatLoading ? (
                <span className="tokenValueSecondary">{ta('historical.loadingHistoricalFiat')}</span>
              ) : snapshotTvl !== null ? (
                fiatEstimateText(snapshotTvl, selectedCurrency)
              ) : (
                '-'
              )}
            </strong>
          </div>
          <div className="ammLedgerRow">
            <span>{ta('hero.tradingFee')}</span>
            <strong>{showAmmPercents(snapshot.tradingFee)}</strong>
          </div>
          <div className="ammLedgerRow">
            <span>{ta('historical.asset1')}</span>
            <strong>{renderPoolStateAssetValue(snapshot.amount, { historical: true })}</strong>
          </div>
          <div className="ammLedgerRow">
            <span>{ta('historical.asset2')}</span>
            <strong>{renderPoolStateAssetValue(snapshot.amount2, { historical: true })}</strong>
          </div>
          <div className="ammLedgerRow">
            <span>{ta('historical.lpTokenBalance')}</span>
            <strong>{lpBalance ? amountFormatNode(lpBalance, { precise: 'nice' }) : '-'}</strong>
          </div>
        </div>
      </section>
    )
  }

  const renderVoteSlotRows = (voteSlots = []) => (
    <div className="ammVoteList">
      {[...voteSlots]
        .sort((a, b) => b.voteWeight - a.voteWeight)
        .map((slot, index) => (
          <div className="ammVoteRow" key={`${slot.account}-${index}`}>
            <span className="ammVoteRank">{index + 1}</span>
            <div className="ammVoteAccount">
              <AddressWithIconFilled data={slot} name="account" options={{ short: isMobile }} />
            </div>
            <div className="ammVoteStats">
              <span>
                {ta('voteSlots.fee')} <strong>{showAmmPercents(slot.tradingFee)}</strong>
              </span>
              <span>
                {ta('voteSlots.weight')} <strong>{showAmmPercents(slot.voteWeight)}</strong>
              </span>
            </div>
          </div>
        ))}
    </div>
  )

  const renderHistoricalAuctionSnapshot = (snapshot) => {
    if (!snapshot?.account) return null
    const slot = snapshot.auctionSlot
    const activeAtSnapshot = slot && historicalSnapshotDate ? !isTimestampExpired(slot.expiration, historicalSnapshotDate) : !!slot

    return (
      <section className="ammAuctionCard">
        <div className="ammVoteHeader">
          <h3>{ta('historical.auctionSlot')}</h3>
          <span>
            {historicalSnapshotText
              ? ta('historical.stateAt', { time: historicalSnapshotText })
              : ta('historical.auctionStateAtSelectedTime')}
          </span>
        </div>
        {slot ? (
          <div className="ammLedgerRows">
            <div className="ammLedgerRow">
              <span>{ta('historical.statusAtSnapshot')}</span>
              <strong>{activeAtSnapshot ? ta('common.active') : ta('common.expired')}</strong>
            </div>
            <div className="ammLedgerRow ammLedgerRowInline">
              <span>{ta('historical.slotHolder')}</span>
              <strong>
                <AddressWithIconFilled data={slot} name="account" options={{ short: isMobile }} />
              </strong>
            </div>
            <div className="ammLedgerRow">
              <span>{ta('historical.holderFee')}</span>
              <strong>{showAmmPercents(slot.discountedFee)}</strong>
            </div>
            <div className="ammLedgerRow">
              <span>{ta('historical.lpBid')}</span>
              <strong>{auctionSlotPriceNode(slot)}</strong>
            </div>
            <div className="ammLedgerRow">
              <span>{ta('historical.slotEnds')}</span>
              <strong>{fullDateAndTime(slot.expiration, 'expiration')}</strong>
            </div>
            {slot.authAccounts?.length ? (
              <div className="ammLedgerRow ammLedgerRowInline tokenMetricWide">
                <span>{ta('historical.authorizedDiscountAccounts')}</span>
                <strong>
                  {slot.authAccounts.map((account, index) => (
                    <span key={account.account}>
                      {index > 0 ? ', ' : ''}
                      <AddressWithIconInline data={account} name="account" />
                    </span>
                  ))}
                </strong>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="ammLedgerRow">
            <span>{ta('historical.auctionSlot')}</span>
            <strong>{ta('historical.noAuctionSlotSnapshot')}</strong>
          </div>
        )}
      </section>
    )
  }

  const renderHistoricalVoteSlots = (snapshot) => {
    if (!snapshot?.account) return null
    const voteSlots = Array.isArray(snapshot.voteSlots) ? snapshot.voteSlots : []

    return (
      <section className="ammVoteCard" id="amm-vote-slots">
        <div className="ammVoteHeader">
          <h3>{ta('historical.voteSlots')}</h3>
          <span className="ammVoteHeaderActions">
            <span>{historicalSnapshotText ? ta('historical.stateAt', { time: historicalSnapshotText }) : ta('historical.voteSlotsAtSelectedTime')}</span>
          </span>
        </div>
        {voteSlots.length ? renderVoteSlotRows(voteSlots) : <span className="tokenValueSecondary">{ta('historical.noVoteSlotsSnapshot')}</span>}
      </section>
    )
  }

  const renderClosedDayActivityGroup = ({
    label,
    countLabel,
    accountsLabel,
    count,
    accounts,
    volume1,
    volume2,
    previousCount,
    previousAccounts,
    previousVolume1,
    previousVolume2,
    hideAccounts = false,
    hideVolumes = false,
    emptyMeansZero = false,
    invertDeltaColor = false
  }) => {
    const displayCount = emptyMeansZero && (count === undefined || count === null || count === '') ? 0 : count
    const displayAccounts = emptyMeansZero && (accounts === undefined || accounts === null || accounts === '') ? 0 : accounts
    const displayPreviousCount =
      emptyMeansZero && (previousCount === undefined || previousCount === null || previousCount === '') ? 0 : previousCount
    const displayPreviousAccounts =
      emptyMeansZero && (previousAccounts === undefined || previousAccounts === null || previousAccounts === '') ? 0 : previousAccounts
    const hasVolume1 = volume1 !== undefined && volume1 !== null && volume1 !== ''
    const hasVolume2 = volume2 !== undefined && volume2 !== null && volume2 !== ''
    const hasPreviousVolume1 = previousVolume1 !== undefined && previousVolume1 !== null && previousVolume1 !== ''
    const hasPreviousVolume2 = previousVolume2 !== undefined && previousVolume2 !== null && previousVolume2 !== ''
    const hasZeroActivity = Number(displayCount) === 0 || Number(displayAccounts) === 0
    const displayVolume1 = hasVolume1 ? volume1 : emptyMeansZero || hasZeroActivity ? '0' : null
    const displayVolume2 = hasVolume2 ? volume2 : emptyMeansZero || hasZeroActivity ? '0' : null
    const displayPreviousVolume1 = hasPreviousVolume1 ? previousVolume1 : emptyMeansZero || hasZeroActivity ? '0' : previousVolume1
    const displayPreviousVolume2 = hasPreviousVolume2 ? previousVolume2 : emptyMeansZero || hasZeroActivity ? '0' : previousVolume2
    const showVolume1 = displayVolume1 !== null
    const showVolume2 = displayVolume2 !== null

    return (
      <span className="ammClosedDayGroup">
        <span className="ammClosedDayStats">
          <span className="ammClosedDayHeader">
            <span>{label}</span>
            <strong>
              <span>{countLabel || 'Transactions'}</span>
              <span>
                {displayCount !== undefined && displayCount !== null ? fullNiceNumber(displayCount) : '-'}
                <AmmMetricDelta
                  cur={displayCount}
                  prev={displayPreviousCount}
                  title={ta('tooltips.comparedPreviousClosedDay')}
                  invertColor={invertDeltaColor}
                />
              </span>
            </strong>
          </span>
          {!hideAccounts ? (
            <span className="ammClosedDayMeta">
              <span>{accountsLabel || 'Accounts'}</span>
              <strong>
                {displayAccounts !== undefined && displayAccounts !== null ? niceNumber(displayAccounts) : '-'}
                <AmmMetricDelta
                  cur={displayAccounts}
                  prev={displayPreviousAccounts}
                  title={ta('tooltips.comparedPreviousClosedDayAccounts')}
                  invertColor={invertDeltaColor}
                />
              </strong>
            </span>
          ) : null}
        </span>
        {!hideVolumes ? (
          <span className="ammClosedDayVolumes">
            <span className="ammClosedDayVolumeTitle">{ta('daily.volume')}</span>
            {showVolume1
              ? renderMetricAssetLine(data.amount, displayVolume1, displayPreviousVolume1, {
                  deltaTitle: ta('tooltips.comparedPreviousClosedDayVolume'),
                  invertDeltaColor,
                  shortAmount: true,
                  fiatUnitRate: directHistoricalAssetUnitFiatRate(data.amount, price24hRates)
                })
              : null}
            {showVolume2
              ? renderMetricAssetLine(data.amount2, displayVolume2, displayPreviousVolume2, {
                  deltaTitle: ta('tooltips.comparedPreviousClosedDayVolume'),
                  invertDeltaColor,
                  shortAmount: true,
                  fiatUnitRate: directHistoricalAssetUnitFiatRate(data.amount2, price24hRates)
                })
              : null}
            {!showVolume1 && !showVolume2 ? <span className="tokenValueSecondary">{ta('daily.volumeUnavailable')}</span> : null}
          </span>
        ) : null}
      </span>
    )
  }

  const renderSwapRow = (row, index) => (
    (() => {
      const accountData = row.account
        ? row
        : {
            account: row.address2 || row.address1,
            accountDetails: row.address2Details || row.address1Details
          }
      const unsignedLiquidityAmount = row.type === 'deposit' || row.type === 'withdraw'
      const value1Positive = Number(row.value1) > 0
      const value2Positive = Number(row.value2) > 0
      const amount1Sign = dexSwapAmountSign(row, 1, accountData.account)
      const amount2Sign = dexSwapAmountSign(row, 2, accountData.account)
      const firstAmount = row.amount1
        ? amountFormatNode(unsignedLiquidityAmount ? unsignedAmount(row.amount1) : signedSwapAmount(row.amount1, amount1Sign || row.value1), {
            short: true,
            maxFractionDigits: 6,
            showPlus: !unsignedLiquidityAmount && (amount1Sign ? amount1Sign > 0 : value1Positive)
          })
        : normalizeSwapAmount(row.value1, asset1Name, { unsigned: unsignedLiquidityAmount, sign: amount1Sign })
      const secondAmount = row.amount2
        ? amountFormatNode(unsignedLiquidityAmount ? unsignedAmount(row.amount2) : signedSwapAmount(row.amount2, amount2Sign || row.value2), {
            short: true,
            maxFractionDigits: 6,
            showPlus: !unsignedLiquidityAmount && (amount2Sign ? amount2Sign > 0 : value2Positive)
          })
        : normalizeSwapAmount(row.value2, asset2Name, { unsigned: unsignedLiquidityAmount, sign: amount2Sign })

      return (
        <HomeTeaseRow
          key={`${row.txHash || row.timestamp}-${row.type}-${index}`}
          href={`/transaction/${row.txHash}`}
          className="ammSwapRow"
        >
          <div className={homeTeaserStyles.timeAgo}>{timeFormat(row.timestamp)}</div>
          <div className={`${homeTeaserStyles.itemName} ${homeTeaserStyles.whaleAddressCell} ammSwapAddress`}>
            <AddressWithIconInline
              data={accountData}
              name="account"
              options={{
                noLink: true,
                className: 'ammSwapAddressInline',
                labelClassName: 'ammSwapAddressText'
              }}
            />
          </div>
          <div className="ammSwapValues">
            <span>{firstAmount}</span>
            <span>{secondAmount}</span>
          </div>
        </HomeTeaseRow>
      )
    })()
  )

  const overviewItems = [
    {
      key: 'assetPrices',
      label: ta('overview.assetPrices'),
      value: (
        <span className="tokenValueStack ammMetricRows">
          {data?.amount ? renderAssetPriceLine(data.amount) : null}
          {data?.amount2 ? renderAssetPriceLine(data.amount2) : null}
        </span>
      )
    },
    {
      key: 'reserves',
      label: ta('overview.reserves'),
      value: (
        <span className="tokenValueStack ammMetricRows ammMetricDeltaStack">
          {data?.amount
            ? renderMetricAssetLine(data.amount, undefined, latestChartRow.value1, {
                showFiatDelta: true,
                previousFiatValue: previousPoolSideFiat,
                shortAmount: true
              })
            : null}
          {data?.amount2
            ? renderMetricAssetLine(data.amount2, undefined, latestChartRow.value2, {
                showFiatDelta: true,
                previousFiatValue: previousPoolSideFiat,
                shortAmount: true
              })
            : null}
        </span>
      )
    },
    {
      key: 'poolStats',
      label: ta('overview.poolStats'),
      value: (
        <span className="ammMetricSubList">
          <span className="ammMetricSubRow">
            <span className="ammMetricSubLabel">{ta('overview.lpSupply')}</span>
            <strong className="ammMetricSubValue">{data?.lpTokenBalance?.value ? renderMetricNumber(data.lpTokenBalance.value) : '-'}</strong>
            <AmmMetricDelta cur={data?.lpTokenBalance?.value} prev={latestChartRow.lpValue} />
          </span>
          <span className="ammMetricSubRow">
            <span className="ammMetricSubLabel">{ta('overview.contributors')}</span>
            <strong className="ammMetricSubValue">
              {currentContributors !== null ? (
                <a href="#amm-contributors" className="ammMetricQuietLink">
                  {fullNiceNumber(currentContributors)}
                </a>
              ) : (
                '-'
              )}
            </strong>
            <AmmMetricDelta cur={currentContributors} prev={latestLpChartRow.holders} />
          </span>
          <span className="ammMetricSubRow">
            <span className="ammMetricSubLabel">{ta('overview.trustlines')}</span>
            <strong className="ammMetricSubValue">{currentTrustlines !== null ? fullNiceNumber(currentTrustlines) : '-'}</strong>
            <AmmMetricDelta cur={currentTrustlines} prev={latestLpChartRow.trustlines} />
          </span>
          <span className="ammMetricSubRow">
            <span className="ammMetricSubLabel">{ta('overview.dexTrades')}</span>
            <strong className="ammMetricSubValue">
              {closedDaySwaps !== undefined && closedDaySwaps !== null ? fullNiceNumber(closedDaySwaps) : '-'}
            </strong>
            <AmmMetricDelta cur={closedDaySwaps} prev={previousChartRow.swapCount} title={ta('tooltips.comparedPreviousClosedDay')} />
          </span>
        </span>
      )
    }
  ].filter(Boolean)

  const dailyActivitySection = hasStatistics ? (
    <section className="ammClosedDaySection">
      <div className="ammClosedDayTitle">{ta('daily.title')}</div>
      <div className="ammClosedDayGrid">
        {renderClosedDayActivityGroup({
          label: ta('daily.deposits'),
          countLabel: ta('daily.depositTxs'),
          accountsLabel: ta('daily.depositors'),
          count: statistics.depositCount,
          accounts: statistics.depositCountAccounts,
          volume1: statistics.depositVolume1,
          volume2: statistics.depositVolume2,
          previousCount: previousChartRow.depositCount,
          previousAccounts: previousChartRow.depositCountAccounts,
          previousVolume1: previousChartRow.depositVolume1,
          previousVolume2: previousChartRow.depositVolume2,
          emptyMeansZero: true
        })}
        {renderClosedDayActivityGroup({
          label: ta('daily.withdrawals'),
          countLabel: ta('daily.withdrawalTxs'),
          accountsLabel: ta('daily.withdrawers'),
          count: statistics.withdrawCount,
          accounts: statistics.withdrawCountAccounts,
          volume1: statistics.withdrawVolume1,
          volume2: statistics.withdrawVolume2,
          previousCount: previousChartRow.withdrawCount,
          previousAccounts: previousChartRow.withdrawCountAccounts,
          previousVolume1: previousChartRow.withdrawVolume1,
          previousVolume2: previousChartRow.withdrawVolume2,
          emptyMeansZero: true,
          invertDeltaColor: true
        })}
      </div>
    </section>
  ) : null

  const chartSeries = useMemo(() => {
    const points = chartRows.map((row) => ({ time: (row.time || row.timestamp) * 1000, row }))
    const lpPoints = lpChartRows.map((row) => ({ time: (row.time || row.timestamp) * 1000, row }))
    return {
      reserves: [
        {
          name: asset1Name,
          data: points.map(({ time, row }) => chartPoint(time, row.value1))
        },
        {
          name: asset2Name,
          data: points.map(({ time, row }) => chartPoint(time, row.value2))
        }
      ],
      activity: [
        {
          name: ta('charts.series.swaps'),
          data: points.map(({ time, row }) => chartPoint(time, row.swapCount || 0))
        }
      ],
      liquidityCounts: [
        {
          name: ta('daily.deposits'),
          data: points.map(({ time, row }) => chartPoint(time, row.depositCount || 0))
        },
        {
          name: ta('daily.withdrawals'),
          data: points.map(({ time, row }) => chartPoint(time, row.withdrawCount || 0))
        }
      ],
      liquidityVolume1: [
        {
          name: ta('daily.deposits'),
          data: points.map(({ time, row }) => chartPoint(time, row.depositVolume1 || 0))
        },
        {
          name: ta('daily.withdrawals'),
          data: points.map(({ time, row }) => chartPoint(time, row.withdrawVolume1 || 0))
        }
      ],
      liquidityVolume2: [
        {
          name: ta('daily.deposits'),
          data: points.map(({ time, row }) => chartPoint(time, row.depositVolume2 || 0))
        },
        {
          name: ta('daily.withdrawals'),
          data: points.map(({ time, row }) => chartPoint(time, row.withdrawVolume2 || 0))
        }
      ],
      lpHolders: [
        {
          name: ta('overview.trustlines'),
          data: lpPoints.map(({ time, row }) => chartPoint(time, row.trustlines))
        },
        {
          name: ta('contributors.title'),
          data: lpPoints.map(({ time, row }) => chartPoint(time, row.holders))
        }
      ]
    }
  }, [asset1Name, asset2Name, chartRows, lpChartRows, ta])

  const activitySwaps = activityType === 'dex' ? dexSwaps : liquiditySwaps
  const activityLoading = activityType === 'dex' ? dexSwapsLoading : liquiditySwapsLoading
  const activityOrder = activityType === 'dex' ? dexOrder : liquidityOrder
  const activityEmptyText =
    activityType === 'dex'
      ? ta('activity.emptyDex')
      : ta('activity.emptyLiquidity', {
          type: liquidityType === 'deposit' ? ta('activity.deposits').toLowerCase() : ta('activity.withdrawals').toLowerCase()
        })
  const refreshActivity = activityType === 'dex' ? refreshDexSwaps : refreshLiquiditySwaps

  const activityHeaderActions = (
    <div className="ammActivityFilters">
      <div className="ammActivityFilterGroup">
        {[
          ['dex', ta('activity.dex')],
          ['deposit', ta('activity.deposits')],
          ['withdraw', ta('activity.withdrawals')]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${homeTeaserStyles.cardHeaderActionButton} ${
              activityType === value || (activityType !== 'dex' && liquidityType === value)
                ? homeTeaserStyles.cardHeaderActionButtonActive
                : ''
            }`.trim()}
            onClick={() => {
              if (value === 'dex') {
                setActivityType('dex')
              } else {
                setActivityType('liquidity')
                setLiquidityType(value)
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ammActivityFilterGroup ammActivitySortGroup">
        {[
          ['new', ta('activity.latest')],
          ['amountHigh', ta('activity.largest')]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${homeTeaserStyles.cardHeaderActionButton} ${
              activityOrder === value ? homeTeaserStyles.cardHeaderActionButtonActive : ''
            }`.trim()}
            onClick={() => (activityType === 'dex' ? setDexOrder(value) : setLiquidityOrder(value))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <SEO
        page={ta('seo.page')}
        title={
          (t('explorer.header.amm') || 'AMM') +
          (poolName ? ' ' + poolName : '') +
          (data?.ledgerTimestamp ? ' ' + fullDateAndTime(data.ledgerTimestamp, null, { asText: true }) : '')
        }
        description={ta('seo.detailsDescription', {
          poolName: poolName ? ` ${poolName}` : '',
          ammID: data?.ammID ? ` ${shortHash(data.ammID)}` : ''
        })}
        canonicalPath={canonicalPath || (id ? `/amm/${id}` : undefined)}
      />

      <div className={`${tokenPage} ammPage`}>
        <div className="tokenLayout">
          {showTopTabs ? <AmmTabs tab="amm" params={{}} /> : null}

          <div className="tokenSelectorSection">
            <TokenSelector value={selectedLpToken} onChange={handleLpSelect} excludeNative={true} onlyLPtokens={true} />
          </div>

          {loading ? (
            <div className="center" style={{ marginTop: 80 }}>
              <span className="waiting"></span>
              <br />
              {t('general.loading')}
            </div>
          ) : errorMessage ? (
            <div className="orange bold center">
              <br />
              {errorMessage}
            </div>
          ) : data?.ammID ? (
            <>
              <section className="ammHero tokenPanel">
                <div className="ammHeroMain">
                  <AmmAssetPairIcons amount1={data.amount} amount2={data.amount2} />
                  <div className="ammHeroText">
                    <span className="ammEyebrow">{ta('hero.eyebrow')}</span>
                    <h1>{poolName}</h1>
                  </div>
                </div>
                <div className="ammTvlHero">
                  <span>{ta('hero.tvl')}</span>
                  <strong>{tvlValue}</strong>
                </div>
                {tradingFeeControl}
                <div className="ammHeroActions">
                  <button
                    type="button"
                    className="button-action wide center"
                    disabled={!setSignRequest || !ammLiquiditySignData}
                    onClick={onAmmDeposit}
                  >
                    {ta('hero.deposit')}
                  </button>
                  <button
                    type="button"
                    className="button-action wide center"
                    disabled={!setSignRequest || !ammLiquiditySignData}
                    onClick={onAmmWithdraw}
                  >
                    {ta('hero.withdraw')}
                  </button>
                </div>
              </section>

              <section className="ammMetricsPanel">
                <div className="tokenMetricGrid ammMetricGrid">
                  {overviewItems.map((item) => (
                    <div className={`ammMetricCard ammMetricCard-${item.key}`} key={item.key}>
                      <span>{item.label}</span>
                      <span>{item.value === undefined || item.value === null || item.value === '' ? '-' : item.value}</span>
                    </div>
                  ))}
                </div>
                {dailyActivitySection}
              </section>

              <section className="ammChartsSection">
                <div className="tokenChartsHeader">
                  <div>
                    <h2>{ta('charts.poolHistory')}</h2>
                    <span>{ta('charts.subtitle')}</span>
                  </div>
                  <div className="tokenChartsHeaderActions">
                    <ChartPeriodSwitch
                      value={chartPeriod}
                      onChange={(nextPeriod) => setChartPeriod(normalizeChartPeriod(nextPeriod))}
                    />
                  </div>
                </div>
                <div className="ammChartsGrid">
                  <AmmChartCard title={ta('charts.swaps')} rows={chartRows} series={chartSeries.activity} type="bar" loading={chartLoading} />
                  <AmmChartCard title={ta('overview.reserves')} rows={chartRows} series={chartSeries.reserves} dualYAxis loading={chartLoading} />
                  <AmmChartCard title={ta('contributors.title')} rows={lpChartRows} series={chartSeries.lpHolders} loading={chartLoading} />
                  <AmmChartCard
                    title={ta('charts.depositsWithdrawals')}
                    rows={chartRows}
                    series={chartSeries.liquidityCounts}
                    type="bar"
                    loading={chartLoading}
                  />
                  <AmmChartCard
                    title={ta('charts.assetVolume', { asset: asset1Name })}
                    rows={chartRows}
                    series={chartSeries.liquidityVolume1}
                    type="bar"
                    loading={chartLoading}
                  />
                  <AmmChartCard
                    title={ta('charts.assetVolume', { asset: asset2Name })}
                    rows={chartRows}
                    series={chartSeries.liquidityVolume2}
                    type="bar"
                    loading={chartLoading}
                  />
                </div>
              </section>

              <section className="tokenActivitySection ammActivitySection">
                <div className="tokenActivityGrid">
                  <HomeTeaser
                    titleText={ta('activity.title')}
                    titleNote={ta('activity.titleNote')}
                    isLoading={activityLoading && !activitySwaps.length}
                    isRefreshing={activityLoading}
                    onRefresh={refreshActivity}
                    isRefreshHidden={refreshHidden}
                    refreshCooldownSeconds={refreshSeconds}
                    headerActions={activityHeaderActions}
                    isEmpty={!activitySwaps.length}
                    emptyText={activityEmptyText}
                    className={`${homeTeaserStyles.whaleCard} tokenActivityCard ammActivityCard`}
                  >
                    {activitySwaps.map(renderSwapRow)}
                  </HomeTeaser>
                  <AmmContributorsCard
                    key={currentContributorsKey || id}
                    contributors={contributorsDataKey === currentContributorsKey ? contributorsData?.trustlines : null}
                    rawData={contributorsDataKey === currentContributorsKey ? contributorsData : null}
                    data={data}
                    loading={contributorsLoading || contributorsDataKey !== currentContributorsKey}
                    lpTokenUnitFiat={lpTokenUnitFiat}
                    selectedCurrency={selectedCurrency}
                  />
                </div>
              </section>

              <section className="tokenPanel">
                <div className="tokenChartsHeader">
                  <div>
                    <h2>{ta('details.title')}</h2>
                    <span>{ta('details.subtitle')}</span>
                  </div>
                </div>
                <div className="ammDetailsGrid">
                  <section className="ammLookupCard">
                    <div className="ammLookupHeader">
                      <div>
                        <h3>{ta('details.historicalLookup')}</h3>
                        <span>{ta('details.historicalHint')}</span>
                      </div>
                      {historicalSnapshotText ? (
                        <span className="ammHistoricalBadge">
                          {ta('details.snapshotBadge', { time: historicalSnapshotText })}
                        </span>
                      ) : null}
                    </div>
                    <div className="ammLookupControls">
                      <div className="ammLookupPicker">
                        <DatePicker
                          selected={lookupSelectedDate}
                          onChange={setLedgerTimestampInput}
                          selectsStart
                          showTimeInput
                          timeInputLabel={t('table.time')}
                          minDate={new Date(data?.createdAt * 1000)}
                          maxDate={new Date()}
                          dateFormat="yyyy/MM/dd HH:mm:ss"
                          className="dateAndTimeRange"
                          showMonthDropdown
                          showYearDropdown
                        />
                      </div>
                      <div className="ammLookupActions">
                        <button
                          onClick={() => fetchHistoricalData(lookupSelectedDate)}
                          className="button-action thin narrow"
                          disabled={!lookupSelectedDate || historicalLoading}
                        >
                          {historicalLoading ? ta('common.loading') : ta('common.update')}
                        </button>
                        <button onClick={resetTimeMachine} className="button-action thin narrow">
                          {ta('common.reset')}
                        </button>
                      </div>
                    </div>
                  </section>

                  {historicalError ? (
                    <section className="ammLedgerCard ammSnapshotNotice">
                      <span className="tokenValueSecondary red">{historicalError}</span>
                    </section>
                  ) : null}

                  {historicalLoading ? (
                    <section className="ammLedgerCard center">
                      <span className="waiting"></span>
                    </section>
                  ) : null}

                  {historicalData ? renderPoolStateSnapshot(historicalData) : null}

                  <section className="ammLedgerCard">
                    <h3>{ta('details.poolIdentifiers')}</h3>
                    <div className="ammLedgerRows">
                      <div className="ammLedgerRow ammLedgerRowInline">
                        <span>{ta('details.ammAddress')}</span>
                        <strong>
                          <AddressWithIconFilled
                            data={data}
                            name="account"
                            copyButton={true}
                            options={{ short: isMobile }}
                          />
                        </strong>
                      </div>
                      <div className="ammLedgerRow">
                        <span>{ta('details.ammId')}</span>
                        <strong>
                          <span className="brake">{data.ammID}</span> <CopyButton text={data.ammID} />
                        </strong>
                      </div>
                      {data?.lpTokenBalance?.currency ? (
                        <div className="ammLedgerRow">
                          <span>{ta('details.lpTokenCode')}</span>
                          <strong>
                            <span className="brake">{data.lpTokenBalance.currency}</span>{' '}
                            <CopyButton text={data.lpTokenBalance.currency} />
                          </strong>
                        </div>
                      ) : null}
                      <div className="ammLedgerRow">
                        <span>{ta('details.created')}</span>
                        <strong>
                          {timeFromNow(data.createdAt, i18n)}, {fullDateAndTime(data.createdAt)}{' '}
                          <LinkTx tx={data.createdTxHash} icon={true} />
                        </strong>
                      </div>
                      {data.createdAt !== data.updatedAt ? (
                        <div className="ammLedgerRow">
                          <span>{ta('details.lastUpdate')}</span>
                          <strong>
                            {timeFromNow(data.updatedAt, i18n)}, {fullDateAndTime(data.updatedAt)}{' '}
                            <LinkTx tx={data.updatedTxHash} icon={true} />
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  {historicalData ? (
                    renderHistoricalAuctionSnapshot(historicalData)
                  ) : auctionMath || hasAuctionSlot ? (
                    <section className="ammAuctionCard">
                      <div className="ammAuctionHeader">
                        <div>
                          <h3>{ta('auction.slot')}</h3>
                          <span>
                            {auctionUserHasDiscount
                              ? ta('auction.yourSlotDescription')
                              : auctionSlotActive
                              ? ta('auction.activeDescription')
                              : ta('auction.openDescription')}
                          </span>
                        </div>
                        <span className={`ammAuctionStatus ${auctionSlotActive ? 'ammAuctionStatusActive' : ''}`}>
                          {auctionSlotActive ? ta('auction.activeSlot') : ta('auction.openSlot')}
                        </span>
                      </div>

                      <div className="ammAuctionSummaryGrid">
                        <div className="ammAuctionSummaryItem ammAuctionSummaryItemMain">
                          <span>{auctionUserHasDiscount ? ta('auction.yourDiscountedFee') : ta('auction.feeIfWin')}</span>
                          <strong>
                            {showAmmPercents(
                              auctionUserHasDiscount && data.auctionSlot?.discountedFee !== undefined
                                ? data.auctionSlot.discountedFee
                                : winningDiscountedFee
                            )}
                          </strong>
                        </div>
                        <div className="ammAuctionSummaryItem">
                          <span>{ta('auction.poolFee')}</span>
                          <strong>{showAmmPercents(data?.tradingFee)}</strong>
                        </div>
                        <div className="ammAuctionSummaryItem">
                          <span>{auctionUserHasDiscount ? ta('auction.slotEnds') : ta('auction.discountWindow')}</span>
                          <strong>
                            {auctionUserHasDiscount && data.auctionSlot?.expiration
                              ? fullDateAndTime(data.auctionSlot.expiration, 'expiration')
                              : ta('auction.upTo24h')}
                          </strong>
                        </div>
                        {auctionMath ? (
                          <div className="ammAuctionSummaryItem">
                            <span>{auctionUserHasDiscount ? ta('auction.yourFeeSaving') : ta('auction.feeSaving')}</span>
                            <strong>{auctionMath.feeSavingsRate.multipliedBy(100).toFixed(4)}%</strong>
                          </div>
                        ) : null}
                      </div>

                      <div className="ammAuctionBody">
                        {auctionSlotActive ? (
                          <div className="ammAuctionCurrentStrip">
                            <div className="ammAuctionInfoItem ammAuctionInfoItemWide">
                              <span>{ta('auction.currentSlotHolder')}</span>
                              <strong>
                                <AddressWithIconFilled data={data.auctionSlot} name="account" options={{ short: isMobile }} />
                              </strong>
                            </div>
                            {!auctionUserHasDiscount ? (
                              <div className="ammAuctionInfoItem">
                                <span>{ta('auction.currentHolderFee')}</span>
                                <strong>{showAmmPercents(data.auctionSlot.discountedFee)}</strong>
                              </div>
                            ) : null}
                            {!auctionUserHasDiscount ? (
                              <>
                                <div className="ammAuctionInfoItem">
                                  <span>{ta('auction.currentLpBid')}</span>
                                  <strong>{auctionSlotPriceNode(data.auctionSlot)}</strong>
                                </div>
                                <div className="ammAuctionInfoItem">
                                  <span>{ta('auction.slotEnds')}</span>
                                  <strong>{fullDateAndTime(data.auctionSlot.expiration, 'expiration')}</strong>
                                </div>
                              </>
                            ) : null}
                            {data.auctionSlot.authAccounts?.length ? (
                              <div className="ammAuctionInfoItem ammAuctionInfoItemWide">
                                <span>{ta('auction.authorizedDiscountAccounts')}</span>
                                <strong>
                                  {data.auctionSlot.authAccounts.map((account, index) => (
                                    <span key={account.account}>
                                      {index > 0 ? ', ' : ''}
                                      <AddressWithIconInline data={account} name="account" />
                                    </span>
                                  ))}
                                </strong>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {auctionMath ? (
                          <>
                            <div className="ammAuctionActionsGrid">
                              {auctionUserHasDiscount ? (
                                <div className="ammAuctionActionPanel ammAuctionActionPanelFull ammAuctionOwnedPanel">
                                  <div className="ammAuctionActionHeader">
                                    <strong>{ta(auctionUserIsSlotHolder ? 'auction.yourActiveSlot' : 'auction.yourAuthorizedSlot')}</strong>
                                    <span>{ta('auction.yourDiscountHint')}</span>
                                  </div>
                                  <div className="ammAuctionAmountRows ammAuctionOwnedRows">
                                    <div>
                                      <span>{auctionUserIsSlotHolder ? ta('auction.yourPaidBid') : ta('auction.currentLpBid')}</span>
                                      <strong>
                                        {data.auctionSlot?.price?.value
                                          ? auctionLpAmountNode(data.auctionSlot.price.value)
                                          : auctionSlotPriceNode(data.auctionSlot)}
                                      </strong>
                                    </div>
                                    <div className="ammAuctionAmountCost">
                                      <span>{ta('auction.minimumOverbid')}</span>
                                      <strong>{auctionLpAmountNode(auctionMath.bid)}</strong>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {!auctionUserHasDiscount && account?.address && !auctionBalanceReady ? (
                                <div className="ammAuctionActionPanel ammAuctionBalancePanel">
                                  <div className="ammAuctionActionHeader">
                                    <strong>{ta('auction.checkingLpBalance')}</strong>
                                    <span>{ta('auction.checkingLpBalanceHint')}</span>
                                  </div>
                                  <span className="waiting"></span>
                                </div>
                              ) : null}

                              {!auctionUserHasDiscount && account?.address && auctionNeedsMoreLp ? (
                                <div className="ammAuctionActionPanel ammAuctionBalancePanel ammAuctionBalancePanelShort">
                                  <div className="ammAuctionActionHeader">
                                    <strong>{ta('auction.notEnoughLp')}</strong>
                                    <span>{ta('auction.notEnoughLpHint')}</span>
                                  </div>
                                  <div className="ammAuctionAmountRows ammAuctionBalanceRows">
                                    <div>
                                      <span>{ta('auction.yourLpBalance')}</span>
                                      <strong>{auctionLpAmountNode(auctionUserLpBalance || 0)}</strong>
                                    </div>
                                    <div>
                                      <span>{ta('auction.lpRequired')}</span>
                                      <strong>{auctionLpAmountNode(auctionRequiredLp)}</strong>
                                    </div>
                                    <div className="ammAuctionAmountCost">
                                      <span>{ta('auction.lpMissing')}</span>
                                      <strong>{auctionLpAmountNode(auctionLpShortfall)}</strong>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {!auctionUserHasDiscount && showAuctionBidAction ? (
                                <div
                                  className={`ammAuctionActionPanel ammAuctionActionPanelBid${
                                    auctionHasEnoughLp ? ' ammAuctionActionPanelFull' : ''
                                  }`}
                                >
                                  <div className="ammAuctionActionHeader">
                                    <strong>{ta('auction.bidWithLp')}</strong>
                                    <span>{account?.address ? ta('auction.enoughLpHint') : ta('auction.bidWithLpHint')}</span>
                                  </div>
                                  {account?.address ? (
                                    <div className="ammAuctionWalletStatus ammAuctionWalletStatusGood">
                                      <span>{ta('auction.yourLpBalance')}</span>
                                      <strong>{auctionLpAmountNode(auctionUserLpBalance || 0)}</strong>
                                    </div>
                                  ) : null}
                                  <div className="ammAuctionAmountRows">
                                    <div className="ammAuctionAmountCost">
                                      <span>{auctionSlotActive ? ta('auction.paidLpBidOverbid') : ta('auction.paidLpBidClaim')}</span>
                                      <strong>
                                        {formatAuctionLpEstimate(auctionMath.bid)}
                                        {auctionEstimateFiats?.bid !== null && auctionEstimateFiats?.bid !== undefined ? (
                                          <> {fiatEstimateText(auctionEstimateFiats.bid, selectedCurrency)}</>
                                        ) : (
                                          ''
                                        )}
                                      </strong>
                                    </div>
                                    <div>
                                      <span>{ta('auction.maxLpSpendCap')}</span>
                                      <strong>{auctionLpAmountNode(auctionBidMax)}</strong>
                                    </div>
                                  </div>
                                  <div className="ammAuctionCostWarning">
                                    <strong>{ta('auction.winningBidSpent')}</strong>
                                    <span>
                                      {ta('auction.winningBidSpentText')}
                                    </span>
                                  </div>
                                  <div className="ammAuctionAuthField">
                                    <div className="ammAuctionAuthHeader">
                                      <span className="tokenValueSecondary">
                                        {ta('auction.extraDiscountAccounts')}
                                        {filledAuctionAuthAccountsCount ? ` (${filledAuctionAuthAccountsCount}/4)` : ''}
                                      </span>
                                      {canAddAuctionAuthAccount ? (
                                        <button
                                          type="button"
                                          className="button-action secondary thin narrow ammAuctionAuthToggle"
                                          onClick={() => setAuctionAuthAccountCount((count) => Math.min(count + 1, 4))}
                                        >
                                          {ta('auction.addAccount')}
                                        </button>
                                      ) : null}
                                    </div>
                                    {showAuctionAuthAccounts ? (
                                      <div className="ammAuctionAuthGrid">
                                        {visibleAuctionAuthAccounts.map((address, index) => (
                                          <AddressInput
                                            key={`auction-auth-account-${index}`}
                                            placeholder={ta('auction.addressPlaceholder', { number: index + 1 })}
                                            setValue={(value) => setAuctionAuthAccount(index, value)}
                                            setInnerValue={(value) => setAuctionAuthAccount(index, value)}
                                            rawData={address ? { address } : null}
                                            type="address"
                                            hideButton={true}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="tokenValueSecondary">
                                        {ta('auction.addAccountsHint')}
                                      </span>
                                    )}
                                    <span className="tokenValueSecondary">
                                      {ta('auction.signingAccountNote')}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="button-action wide center"
                                    disabled={!setSignRequest}
                                    onClick={onAuctionBid}
                                  >
                                    <span suppressHydrationWarning>
                                      {ta('auction.bidWithLpAmount', {
                                        amount: `${formatAuctionLpEstimate(auctionMath.bid)}${
                                          auctionEstimateFiats?.bid !== null && auctionEstimateFiats?.bid !== undefined
                                            ? ` ${fiatEstimateText(auctionEstimateFiats.bid, selectedCurrency, { asText: true })}`
                                            : ''
                                        }`
                                      })}
                                    </span>
                                  </button>
                                </div>
                              ) : null}

                              {!auctionUserHasDiscount && showAuctionMintAction ? (
                                <div className="ammAuctionActionPanel">
                                  <div className="ammAuctionActionHeader">
                                    <strong>{auctionNeedsMoreLp ? ta('auction.getMissingLp') : ta('auction.mintLpThenBid')}</strong>
                                    <span>{auctionNeedsMoreLp ? ta('auction.getMissingLpHint') : ta('auction.mintLpThenBidHint')}</span>
                                  </div>
                                  <div className="ammAuctionMintTarget">
                                    <span>{auctionNeedsMoreLp ? ta('auction.lpMissing') : ta('auction.lpToMintFirst')}</span>
                                    <strong>{auctionLpAmountNode(auctionMintLpTarget)}</strong>
                                    <span className="tokenValueSecondary">
                                      {auctionNeedsMoreLp ? ta('auction.mintMissingLpNote') : ta('auction.mintLpNote')}
                                    </span>
                                  </div>
                                  {auctionNeedsMoreLp ? (
                                    <div className="ammAuctionCostWarning ammAuctionCostWarningStrong">
                                      <strong>{ta('auction.winningBidPaid')}</strong>
                                      <span>{ta('auction.discountEnds')}</span>
                                      <span>{ta('auction.singleAssetCap')}</span>
                                    </div>
                                  ) : null}
                                  <div className="ammAuctionDepositOptions">
                                    {auctionDepositActions.map((assetEstimate) => {
                                      return (
                                        <div className="ammAuctionDepositOption" key={`${assetEstimate.key}-auction-action`}>
                                          <span>{ta('auction.withAsset', { asset: assetCurrency(assetEstimate.amount) })}</span>
                                          <button
                                            type="button"
                                            className="button-action wide center"
                                            disabled={!setSignRequest}
                                            onClick={() => onAuctionDeposit(assetEstimate)}
                                          >
                                            {ta('auction.payUpTo', { amount: formatAuctionButtonAmount(assetEstimate.amount, assetEstimate.maxCost) })}
                                          </button>
                                        </div>
                                      )
                                    })}
                                    {auctionBothAssetDeposit ? (
                                      <div className="ammAuctionDepositOption">
                                        <span>{ta('auction.withBothAssets')}</span>
                                        <button
                                          type="button"
                                          className="button-action wide center"
                                          disabled={!setSignRequest}
                                          onClick={onAuctionDepositBoth}
                                        >
                                          {ta('auction.payBoth', {
                                            amount1: formatAuctionButtonAmount(data.amount, auctionBothAssetDeposit.amount1),
                                            amount2: formatAuctionButtonAmount(data.amount2, auctionBothAssetDeposit.amount2)
                                          })}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {!auctionUserHasDiscount ? (
                              <div className="ammAuctionBreakEven">
                              <div>
                                <strong>{ta('auction.breakEvenVolume')}</strong>
                                <span>{ta('auction.breakEvenHint')}</span>
                              </div>
                              <div className="ammAuctionBreakEvenRows">
                                {auctionMath.assetEstimates
                                  .filter((assetEstimate) => !!assetEstimate.breakEvenVolume)
                                  .map((assetEstimate) => {
                                    const fiat = auctionEstimateFiats?.assets?.find((asset) => asset.key === assetEstimate.key)
                                    const assetLabel = assetEstimate.key === 'asset1' ? asset1Name : asset2Name
                                    return (
                                      <div key={`${assetEstimate.key}-break-even-volume`}>
                                        <span>{assetLabel}</span>
                                        <strong>
                                          {formatAuctionEstimateAmount(assetEstimate.amount, assetEstimate.breakEvenVolume)}
                                          {fiat?.breakEvenVolume !== null && fiat?.breakEvenVolume !== undefined ? (
                                            <> {fiatEstimateText(fiat.breakEvenVolume, selectedCurrency)}</>
                                          ) : null}
                                        </strong>
                                      </div>
                                    )
                                  })}
                              </div>
                              </div>
                            ) : null}

                            {auctionBidError ? <span className="tokenValueSecondary red">{auctionBidError}</span> : null}
                            {auctionBidResult?.hash ? (
                              <span className="tokenValueSecondary">
                                {auctionBidResult.action === 'deposit' ? ta('auction.lpDepositTransaction') : ta('auction.auctionBidTransaction')}
                                <LinkTx tx={auctionBidResult.hash} />
                              </span>
                            ) : null}
                          </>
                        ) : null}

                        <div className="ammAuctionNotes">
                          <span className="ammAuctionNoteWarning">{ta('auction.winningBidPaid')}</span>
                          <span>{ta('auction.discountEnds')}</span>
                          <span>{ta('auction.singleAssetCap')}</span>
                        </div>

                        {auctionSlotExpired ? (
                          <details className="ammAuctionHistory">
                            <summary>{ta('auction.showExpiredSlotDetails')}</summary>
                            <div className="ammAuctionHistoryRows">
                              <div>
                                <span className="ammAuctionHistoryLabel">{ta('auction.lastHolder')}</span>
                                <span className="ammAuctionHistoryValue ammAuctionHistoryValueAddress">
                                  <AddressWithIconFilled data={data.auctionSlot} name="account" options={{ short: isMobile }} />
                                </span>
                              </div>
                              <div>
                                <span className="ammAuctionHistoryLabel">{ta('auction.expiredHolderFee')}</span>
                                <span className="ammAuctionHistoryValue">{showAmmPercents(data.auctionSlot.discountedFee)}</span>
                              </div>
                              <div>
                                <span className="ammAuctionHistoryLabel">{ta('auction.lastLpBid')}</span>
                                <span className="ammAuctionHistoryValue">
                                  {auctionSlotPriceNode(data.auctionSlot, ta('auction.notAvailableAfterExpiry'))}
                                </span>
                              </div>
                              <div>
                                <span className="ammAuctionHistoryLabel">{ta('auction.expiredAt')}</span>
                                <span className="ammAuctionHistoryValue">
                                  {fullDateAndTime(data.auctionSlot.expiration, 'expiration')}
                                </span>
                              </div>
                              {data.auctionSlot.authAccounts?.length ? (
                                <div className="tokenMetricWide">
                                  <span className="ammAuctionHistoryLabel">{ta('auction.previouslyAuthorizedAccounts')}</span>
                                  <span className="ammAuctionHistoryValue ammAuctionHistoryValueAddress">
                                    {data.auctionSlot.authAccounts.map((account, index) => (
                                      <span key={account.account}>
                                        {index > 0 ? ', ' : ''}
                                        <AddressWithIconInline data={account} name="account" />
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  {historicalData ? (
                    renderHistoricalVoteSlots(historicalData)
                  ) : data?.voteSlots?.length > 0 ? (
                    <section className="ammVoteCard" id="amm-vote-slots">
                      <div className="ammVoteHeader">
                        <h3>{ta('voteSlots.title')}</h3>
                        <span className="ammVoteHeaderActions">
                          <span>{ta('voteSlots.activeVoters', { count: data.voteSlots.length })}</span>
                          <button type="button" className="button-action thin narrow" disabled={!setSignRequest} onClick={onVoteFee}>
                            {ta('hero.vote')}
                          </button>
                        </span>
                      </div>
                      {renderVoteSlotRows(data.voteSlots)}
                    </section>
                  ) : null}
                </div>
              </section>

              {lpAnalyticsToken ? (
                <details className="ammLpDisclosure">
                  <summary>{ta('lpAnalytics.title')}</summary>
                  <div className="ammLpAnalyticsBody">
                    <TokenCharts token={lpAnalyticsToken} selectedCurrency={selectedCurrency} />
                  </div>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
