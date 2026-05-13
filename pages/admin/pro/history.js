import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import { avatarSrc, nativeCurrency, useWidth, xahauNetwork } from '../../../utils'
import {
  addressLink,
  amountFormat,
  amountParced,
  fullDateAndTime,
  niceNumber,
  shortNiceNumber
} from '../../../utils/format'
import ProTabs from '../../../components/Tabs/ProTabs'
import { crawlerStatus } from '../../../utils/pro'
import CheckBox from '../../../components/UI/CheckBox'
import Link from 'next/link'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import { CSVLink } from 'react-csv'
import DownloadIcon from '../../../public/images/download.svg'
import { koinly } from '../../../utils/koinly'
import { LinkTx } from '../../../utils/links'
import RadioOptions from '../../../components/UI/RadioOptions'
import Avatar from '../../../components/UI/Avatar'
import { getAccountTransactionTypeIcon, getTransactionTypeLabel } from '../../../utils/transaction'

const sampleHistoryAddresses = [
  'r3sQYvXxc82iSNs5DnUUvXtcQQQqigCdW',
  'rhWTXC2m2gGGA9WozUaoMm6kLAVPb1tcS3',
  'raWYT6DD2XFAvjCqRPsCCzr1CMBzJydf9E',
  'r3LAichpcBeZWk7LLSZcfSQcqYsvQ6beBc'
]

const sampleVerifiedAddresses = sampleHistoryAddresses.map((address, index) => ({
  id: `sample-${index + 1}`,
  address,
  name: `Sample wallet ${index + 1}`,
  crawler: { status: 'synced' },
  sample: true
}))

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { address } = query
  return {
    props: {
      queryAddress: address || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

const showAmount = (amount) => {
  if (!amount) return ''
  return amountFormat(amount, { short: true, maxFractionDigits: 6 })
}

const getSelectedFiatValue = (fiats, selectedCurrency) => {
  if (!fiats || !selectedCurrency) return null

  const keys = [selectedCurrency, selectedCurrency.toLowerCase(), selectedCurrency.toUpperCase()]
  for (const key of keys) {
    if (fiats[key] === undefined || fiats[key] === null) continue

    const value = typeof fiats[key] === 'object' ? fiats[key].value : fiats[key]
    const numberValue = Number(value)
    if (Number.isFinite(numberValue)) return numberValue
  }

  return null
}

const showFiat = (fiats, selectedCurrency) => {
  const fiat = getSelectedFiatValue(fiats, selectedCurrency)
  if (fiat === null) return ''
  return (
    <span className={'no-brake ' + (fiat > 0 ? 'green' : fiat < 0 ? 'red' : '')}>
      {shortNiceNumber(fiat, 2, 3, selectedCurrency)}
    </span>
  )
}

const timePieces = (timestamp) => {
  const date = new Date(timestamp * 1000) // Convert to milliseconds
  const pad = (n) => n.toString().padStart(2, '0')
  const dd = pad(date.getUTCDate())
  const mm = pad(date.getUTCMonth() + 1)
  const yyyy = date.getUTCFullYear()
  const hh = pad(date.getUTCHours())
  const min = pad(date.getUTCMinutes())
  const ss = pad(date.getUTCSeconds())
  return { dd, mm, yyyy, hh, min, ss }
}

const dateFormatters = {
  Koinly: (timestamp) => {
    // ISO format: YYYY-MM-DDTHH:MM:SS.000Z
    return new Date(timestamp * 1000).toISOString()
  },
  CoinLedger: (timestamp) => {
    // Format: MM/DD/YYYY HH:MM:SS in UTC
    const { mm, dd, yyyy, hh, min, ss } = timePieces(timestamp)
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`
  },
  CoinTracking: (timestamp) => {
    // Format: dd.mm.yyyy HH:MM:SS in UTC
    const { dd, mm, yyyy, hh, min, ss } = timePieces(timestamp)
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`
  },
  TaxBit: (timestamp) => {
    // ISO format: YYYY-MM-DDTHH:MM:SS.000Z (same as Koinly)
    return new Date(timestamp * 1000).toISOString()
  },
  TokenTax: (timestamp) => {
    // Format: MM/DD/YY HH:MM
    const { mm, dd, yyyy, hh, min } = timePieces(timestamp)
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`
  },
  SUMM: (timestamp) => {
    // Format: YYYY-MM-DD HH:mm:ss
    const { yyyy, mm, dd, hh, min, ss } = timePieces(timestamp)
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
  },
  BlockPit: (timestamp) => {
    // Format: DD.MM.YYYY HH:MM:SS in UTC
    const { dd, mm, yyyy, hh, min, ss } = timePieces(timestamp)
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`
  }
}

const isSending = (a) => {
  if (a.amount?.value) {
    return a.amount.value[0] === '-'
  }
  return a.amount[0] === '-'
}

const EPS = 1e-12

const isFiniteNum = (v) => Number.isFinite(Number(v))

const normAmount = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Use the SAME decoded currency format as sending/receiving rows.
// Priority:
// 1) sentCurrency/receivedCurrency already computed via amountParced()
// 2) fallback: parse on the fly
// 3) fallback: currencyCode/nativeCurrency
const getDecodedCurrency = (a) => {
  if (!a) return ''
  const sending = isSending(a)
  const ready = sending ? a.sentCurrency : a.receivedCurrency
  if (ready) return ready

  try {
    const { currency } = amountParced(a.amount)
    if (currency) return currency
  } catch (e) {
    // ignore
  }

  return a.currencyCode || nativeCurrency
}

const signedLedgerDelta = (a) => {
  const n = normAmount(a.amountNumber)
  if (n === null) return null
  // amountNumber is absolute; direction is expressed via isSending()
  return isSending(a) ? -Math.abs(n) : Math.abs(n)
}

const looksLikeNetworkFeeLeg = (a) => {
  // A ledger delta in native currency equal to txFeeNumber
  const cur = getDecodedCurrency(a)
  if (cur !== nativeCurrency) return false

  const amt = normAmount(a.amountNumber)
  const fee = normAmount(a.txFeeNumber)
  if (amt === null || fee === null) return false

  return Math.abs(Math.abs(amt) - fee) <= EPS
}

/**
 * Merge by hash only.
 * Trade if (after removing network-fee legs) exactly 2 assets remain with opposite signs.
 *
 * NOTE: This computes NET deltas per asset within the tx, so it works for:
 * - native<->IOU
 * - IOU<->IOU
 * - Payment path where it still results in exactly 2 assets net
 */
const mergeTwoAssetTradesByHash = (activities = [], { tradeType }) => {
  const byHash = new Map()
  for (const a of activities) {
    const h = a.hash || ''
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push(a)
  }

  const out = []

  for (const list of byHash.values()) {
    const deltas = new Map()

    let hasFeeLeg = false

    for (const a of list) {
      if (!a?.hash) continue
      if (looksLikeNetworkFeeLeg(a)) {
        hasFeeLeg = true
        continue
      }

      const key = getDecodedCurrency(a)
      if (!key) continue

      const d = signedLedgerDelta(a)
      if (d === null) continue

      deltas.set(key, (deltas.get(key) || 0) + d)
    }

    const assets = [...deltas.entries()].filter(([, v]) => Math.abs(v) > EPS)

    if (assets.length === 2) {
      const [[k1, v1], [k2, v2]] = assets

      // require one in, one out, and different assets
      if (k1 !== k2 && ((v1 > 0 && v2 < 0) || (v2 > 0 && v1 < 0))) {
        const inKey = v1 > 0 ? k1 : k2
        const inAmt = Math.abs(v1 > 0 ? v1 : v2)
        const outKey = v1 < 0 ? k1 : k2
        const outAmt = Math.abs(v1 < 0 ? v1 : v2)

        // representative row (prefer memo)
        const base = list.find((x) => x.memo) || list[0]

        // pick the first row that actually has a fee number
        const feeRow = list.find((x) => isFiniteNum(x?.txFeeNumber) && Number(x.txFeeNumber) > 0) || null

        const fee = normAmount(feeRow?.txFeeNumber ?? base.txFeeNumber) ?? 0
        // If there was no standalone fee leg, native out may include the fee.
        // Subtract fee so "trade sent amount" doesn't double-count it in CSV.
        const outAmtNet = outKey === nativeCurrency && !hasFeeLeg && fee > 0 ? Math.max(0, outAmt - fee) : outAmt

        const merged = { ...base }
        merged.type = tradeType // 'Trade' for CoinLedger, 'trade' for SUMM mapping stage

        merged.sentCurrency = outKey
        merged.sentAmount = outAmtNet
        merged.receivedCurrency = inKey
        merged.receivedAmount = inAmt

        // Network fee EXACTLY as present in data (no guessing)
        merged.txFeeNumber = feeRow?.txFeeNumber ?? base.txFeeNumber
        merged.txFeeCurrencyCode = feeRow?.txFeeCurrencyCode ?? base.txFeeCurrencyCode ?? nativeCurrency

        // Keep memo if any
        merged.memo = (list.find((x) => x.memo)?.memo || base.memo || '').toString()

        out.push(merged)
        continue
      }
    }

    // Not a 2-asset trade => passthrough
    for (const a of list) out.push({ ...a })
  }

  return out
}

const buildSummTransferFeeRow = (base) => {
  const feeN = normAmount(base?.transferFeeNumber)
  const feeC = base?.transferFeeCurrencyCode
  if (!feeC || feeN === null || feeN === 0) return null

  const r = { ...base }
  r.type = 'fee'

  // IMPORTANT: no issuer:currency, keep decoded-style currency codes like others
  r.baseCurrency = feeC
  r.baseAmount = base.transferFeeNumber

  // SUMM: fee-row keeps fee in base; fee columns empty
  r.summFeeCurrencyCode = ''
  r.summFeeNumber = ''

  r.quoteCurrency = ''
  r.quoteAmount = ''

  return r
}

const processDataForExport = (activities, platform) => {
  // merge "trade-like" txs into one row first ---
  // NOTE:
  // - Group by hash ONLY (not hash+address). All addresses belong to the same user in export context.
  // - Merge ONLY when exactly 2 assets are exchanged (net deltas). AMM / multi-asset txs are NOT merged.
  // - Works for native<->IOU and IOU<->IOU.
  const baseList =
    platform === 'CoinLedger'
      ? mergeTwoAssetTradesByHash(activities || [], { tradeType: 'Trade' })
      : platform === 'SUMM'
        ? mergeTwoAssetTradesByHash(activities || [], { tradeType: 'trade' })
        : activities || []

  // IMPORTANT: SUMM may need additional fee rows for transfer fees (IOU transfer fees).
  // SUMM supports only one fee currency per row, so we never merge fee currencies:
  // - Network fee stays in Fee columns on main row.
  // - Transfer fee is emitted as a separate "fee" row (base holds fee amount/currency).
  const out = []

  for (const activity of baseList) {
    const sending = isSending(activity)
    const processedActivity = { ...activity }
    processedActivity.timestampExport = dateFormatters[platform](activity.timestamp)

    if (platform === 'Koinly') {
      if (activity.amount?.issuer) {
        let koinlyId =
          koinly[xahauNetwork ? 'xahau' : 'xrpl'][activity.amount?.issuer + ':' + activity.amount?.currency]
        if (koinlyId) {
          processedActivity.sentCurrency = sending ? koinlyId : ''
          processedActivity.receivedCurrency = !sending ? koinlyId : ''
        }
      }
    } else if (platform === 'CoinLedger') {
      // https://help.coinledger.io/en/articles/6028758-universal-manual-import-template-guide
      // If merged as Trade, keep it.
      // Otherwise fallback to Deposit/Withdrawal.
      if (processedActivity.type !== 'Trade') {
        processedActivity.type = sending ? 'Withdrawal' : 'Deposit'
      }
    } else if (platform === 'CoinTracking') {
      processedActivity.type = sending
        ? 'Withdrawal'
        : Math.abs(activity.amountNumber) <= activity.txFeeNumber
          ? 'Other Fee'
          : 'Deposit'
    } else if (platform === 'TaxBit') {
      processedActivity.type = sending ? 'Sell' : 'Buy'
    } else if (platform === 'TokenTax') {
      processedActivity.type = sending ? 'Withdrawal' : 'Deposit'
    } else if (platform === 'SUMM') {
      const isFeeOnly = Math.abs(activity.amountNumber) <= activity.txFeeNumber

      // If merged as trade, output buy/sell (and fill base/quote)
      if (processedActivity.type === 'trade') {
        // BUY = you receive Base, pay Quote
        processedActivity.type = 'buy'

        processedActivity.baseCurrency = processedActivity.receivedCurrency
        processedActivity.baseAmount = processedActivity.receivedAmount

        processedActivity.quoteCurrency = processedActivity.sentCurrency
        processedActivity.quoteAmount = processedActivity.sentAmount

        // Network fee EXACTLY (no guessing), in nativeCurrency (XRP/XAH)
        processedActivity.summFeeCurrencyCode = processedActivity.txFeeCurrencyCode
        processedActivity.summFeeNumber = processedActivity.txFeeNumber

        out.push(processedActivity)

        // Transfer fee as separate fee row (EXACT)
        const transferFeeRow = buildSummTransferFeeRow(processedActivity)
        if (transferFeeRow) out.push(transferFeeRow)

        continue
      }

      // Otherwise: plain transfer rows
      processedActivity.type = isFeeOnly ? 'fee' : sending ? 'send' : 'receive'

      // Network fee EXACTLY (no guessing)
      processedActivity.summFeeCurrencyCode = processedActivity.txFeeCurrencyCode
      processedActivity.summFeeNumber = processedActivity.txFeeNumber

      processedActivity.baseCurrency = sending ? processedActivity.sentCurrency : processedActivity.receivedCurrency
      processedActivity.baseAmount = sending ? processedActivity.sentAmount : processedActivity.receivedAmount

      // For fee rows: don't duplicate fee
      if (processedActivity.type === 'fee') {
        processedActivity.summFeeCurrencyCode = ''
        processedActivity.summFeeNumber = ''
        processedActivity.baseCurrency = processedActivity.txFeeCurrencyCode
        processedActivity.baseAmount = processedActivity.txFeeNumber
      }

      out.push(processedActivity)

      // Transfer fee as separate fee row (EXACT)
      const transferFeeRow = buildSummTransferFeeRow(processedActivity)
      if (transferFeeRow) out.push(transferFeeRow)

      continue
    } else if (platform === 'BlockPit') {
      processedActivity.type = sending
        ? 'Withdrawal'
        : Math.abs(activity.amountNumber) <= activity.txFeeNumber
          ? 'Fee'
          : 'Deposit'
      // don't include this fee amount in the fee column for type 'fee'
      if (processedActivity.type === 'Fee') {
        processedActivity.sentAmount = processedActivity.txFeeNumber
        processedActivity.sentCurrency = processedActivity.txFeeCurrencyCode
        processedActivity.txFeeCurrencyCode = ''
        processedActivity.txFeeNumber = ''
        processedActivity.receivedAmount = ''
        processedActivity.receivedCurrency = ''
      }
    }

    out.push(processedActivity)
  }

  return out
}

const platformList = [
  { value: 'Koinly', label: 'Koinly' },
  { value: 'CoinLedger', label: 'CoinLedger' },
  { value: 'CoinTracking', label: 'CoinTracking' },
  { value: 'TaxBit', label: 'TaxBit' },
  { value: 'TokenTax', label: 'TokenTax' },
  { value: 'BlockPit', label: 'BlockPit' },
  { value: 'SUMM', label: 'SUMM' }
]

const shouldKeepAfterDustFilter = (activity, selectedCurrency) => {
  const fiatValue = getSelectedFiatValue(activity?.amountInFiats, selectedCurrency)
  if (fiatValue === null) return true

  return Math.abs(fiatValue) >= 0.004
}

const HistoryTransaction = ({ activity }) => {
  const txType = activity?.txType
  const isSource = isSending(activity)
  const icon = getAccountTransactionTypeIcon({
    txType,
    isSource,
    isAmmTx: txType?.startsWith('AMM')
  })

  return (
    <div className="pro-history-tx-cell">
      <span className="pro-history-tx-icon" title={getTransactionTypeLabel(txType)}>
        {icon || <span>Tx</span>}
      </span>
      <span className="pro-history-tx-text">
        <span className="pro-history-tx-type">{getTransactionTypeLabel(txType)}</span>
        <span className="pro-history-tx-link">
          Tx <LinkTx tx={activity?.hash} short={8} copy={true} />
        </span>
      </span>
    </div>
  )
}

export default function History({
  queryAddress,
  selectedCurrency,
  setSelectedCurrency,
  sessionToken,
  openEmailLogin
}) {
  const router = useRouter()
  const width = useWidth()
  const sampleMode = !sessionToken

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingVerifiedAddresses, setLoadingVerifiedAddresses] = useState(false)
  const [verifiedAddresses, setVerifiedAddresses] = useState([])
  const [addressesToCheck, setAddressesToCheck] = useState(queryAddress ? [queryAddress] : [])
  const [period, setPeriod] = useState('all')
  const [order, setOrder] = useState('DESC')
  const [filtersHide, setFiltersHide] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rendered, setRendered] = useState(false)
  const [removeDust, setRemoveDust] = useState(false)
  const [platformCSVExport, setPlatformCSVExport] = useState('Koinly')
  const selectedAddressesKey = addressesToCheck.join(',')

  const platformCSVHeaders = useMemo(
    () => [
      {
        platform: 'Koinly',
        headers: [
          { label: 'Date', key: 'timestampExport' },
          { label: 'Sent Amount', key: 'sentAmount' },
          { label: 'Sent Currency', key: 'sentCurrency' },
          { label: 'Received Amount', key: 'receivedAmount' },
          { label: 'Received Currency', key: 'receivedCurrency' },
          { label: 'Fee Amount', key: 'txFeeNumber' },
          { label: 'Fee Currency', key: 'txFeeCurrencyCode' },
          { label: 'Net Worth Amount', key: 'amountInFiats.' + selectedCurrency },
          { label: 'Net Worth Currency', key: 'netWorthCurrency' },
          { label: 'Label', key: '' },
          { label: 'Description', key: 'memo' },
          { label: 'TxHash', key: 'hash' }
        ]
      },
      {
        platform: 'CoinLedger',
        headers: [
          { label: 'Date (UTC)', key: 'timestampExport' },
          { label: 'Platform (Optional)', key: 'platform' },
          { label: 'Asset Sent', key: 'sentCurrency' },
          { label: 'Amount Sent', key: 'sentAmount' },
          { label: 'Asset Received', key: 'receivedCurrency' },
          { label: 'Amount Received', key: 'receivedAmount' },
          { label: 'Fee Currency (Optional)', key: 'txFeeCurrencyCode' },
          { label: 'Fee Amount (Optional)', key: 'txFeeNumber' },
          { label: 'Type', key: 'type' },
          { label: 'Description (Optional)', key: 'memo' },
          { label: 'TxHash (Optional)', key: 'hash' }
        ]
      },
      {
        platform: 'CoinTracking',
        headers: [
          { label: 'Type', key: 'type' },
          { label: 'Buy Amount', key: 'receivedAmount' },
          { label: 'Buy Currency', key: 'receivedCurrency' },
          { label: 'Sell Amount', key: 'sentAmount' },
          { label: 'Sell Currency', key: 'sentCurrency' },
          { label: 'Fee', key: 'txFeeNumber' },
          { label: 'Fee Currency', key: 'txFeeCurrencyCode' },
          { label: 'Exchange', key: 'platform' },
          { label: 'Trade-Group', key: '' },
          { label: 'Comment', key: 'memo' },
          { label: 'Date', key: 'timestampExport' },
          // Optional
          { label: 'Tx-ID', key: 'hash' },
          { label: 'Buy Value in Account Currency', key: 'amountInFiats.' + selectedCurrency },
          { label: 'Sell Value in Account Currency', key: '' },
          { label: 'Liquidity pool', key: '' }
        ]
      },
      {
        platform: 'TaxBit',
        headers: [
          { label: 'timestamp', key: 'timestampExport' },
          { label: 'txid', key: 'hash' },
          { label: 'source_name', key: '' },
          { label: 'from_wallet_address', key: 'counterparty' },
          { label: 'to_wallet_address', key: 'address' },
          { label: 'category', key: 'type' },
          { label: 'in_currency', key: 'receivedCurrency' },
          { label: 'in_amount', key: 'receivedAmount' },
          { label: 'in_currency_fiat', key: 'netWorthCurrency' },
          { label: 'in_amount_fiat', key: 'amountInFiats.' + selectedCurrency },
          { label: 'out_currency', key: 'sentCurrency' },
          { label: 'out_amount', key: 'sentAmount' },
          { label: 'out_currency_fiat', key: 'netWorthCurrency' },
          { label: 'out_amount_fiat', key: 'amountInFiats.' + selectedCurrency },
          { label: 'fee_currency', key: 'txFeeCurrencyCode' },
          { label: 'fee', key: 'txFeeNumber' },
          { label: 'fee_currency_fiat', key: selectedCurrency },
          { label: 'fee_fiat', key: 'txFeeInFiats.' + selectedCurrency },
          { label: 'memo', key: 'memo' },
          { label: 'status', key: '' }
        ]
      },
      {
        platform: 'TokenTax',
        headers: [
          { label: 'Type', key: 'type' },
          { label: 'BuyAmount', key: 'receivedAmount' },
          { label: 'BuyCurrency', key: 'receivedCurrency' },
          { label: 'SellAmount', key: 'sentAmount' },
          { label: 'SellCurrency', key: 'sentCurrency' },
          { label: 'FeeAmount', key: 'txFeeNumber' },
          { label: 'FeeCurrency', key: 'txFeeCurrencyCode' },
          { label: 'Exchange', key: 'platform' },
          { label: 'Group', key: '' },
          { label: 'Comment', key: 'memo' },
          { label: 'Date', key: 'timestampExport' }
        ]
      },
      {
        platform: 'SUMM',
        headers: [
          { label: 'Timestamp (UTC)', key: 'timestampExport' },
          { label: 'Type', key: 'type' },
          { label: 'Base Currency', key: 'baseCurrency' },
          { label: 'Base Amount', key: 'baseAmount' },
          { label: 'Quote Currency (Optional)', key: 'quoteCurrency' },
          { label: 'Quote Amount (Optional)', key: 'quoteAmount' },
          { label: 'Fee Currency (Optional)', key: 'summFeeCurrencyCode' },
          { label: 'Fee Amount (Optional)', key: 'summFeeNumber' },
          { label: 'From (Optional)', key: '' },
          { label: 'To (Optional)', key: '' },
          { label: 'Blockchain (Optional)', key: '' },
          { label: 'ID (Optional)', key: 'hash' },
          { label: 'Description (Optional)', key: 'memo' },
          { label: 'Reference Price Per Unit (Optional)', key: '' },
          { label: 'Reference Price Currency (Optional)', key: '' }
        ]
      },
      {
        platform: 'BlockPit',
        headers: [
          { label: 'Date (UTC)', key: 'timestampExport' },
          { label: 'Integration Name', key: 'platform' },
          { label: 'Label', key: 'type' },
          { label: 'Outgoing Asset', key: 'sentCurrency' },
          { label: 'Outgoing Amount', key: 'sentAmount' },
          { label: 'Incoming Asset', key: 'receivedCurrency' },
          { label: 'Incoming Amount', key: 'receivedAmount' },
          { label: 'Fee Asset (optional)', key: 'txFeeCurrencyCode' },
          { label: 'Fee Amount (optional)', key: 'txFeeNumber' },
          { label: 'Comment (optional)', key: 'memo' },
          { label: 'Trx. ID (optional)', key: 'hash' }
        ]
      }
    ],
    [selectedCurrency]
  )

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredActivities = useMemo(() => {
    if (!activities) return []
    if (!removeDust) return activities

    // Hide tiny fiat-only movements without changing backend order.
    return activities.filter((activity) => shouldKeepAfterDustFilter(activity, selectedCurrency))
  }, [activities, removeDust, selectedCurrency])

  const currentList = useMemo(() => {
    if (filteredActivities.length === 0) return []
    if (rowsPerPage === -1) return filteredActivities
    const lastPage = Math.max(0, Math.ceil(filteredActivities.length / rowsPerPage) - 1)
    const visiblePage = Math.min(page, lastPage)
    return filteredActivities.slice(visiblePage * rowsPerPage, (visiblePage + 1) * rowsPerPage)
  }, [filteredActivities, page, rowsPerPage])

  useEffect(() => {
    if (rowsPerPage === -1) {
      if (page !== 0) setPage(0)
      return
    }

    const lastPage = Math.max(0, Math.ceil(filteredActivities.length / rowsPerPage) - 1)
    if (page > lastPage) setPage(lastPage)
  }, [filteredActivities.length, page, rowsPerPage])

  useEffect(() => {
    if (rowsPerPage !== -1 && (page + 2) * rowsPerPage > filteredActivities.length && data?.marker) {
      getProAddressHistory({ marker: data.marker })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredActivities.length, page, rowsPerPage, data?.marker])

  let csvHeaders = [
    { label: '#', key: 'index' },
    { label: 'Timestamp Unix', key: 'timestamp' },
    { label: 'Timestamp ISO', key: 'timestampExport' },
    { label: 'Address', key: 'address' },
    { label: 'Type', key: 'txType' },
    { label: 'Amount as Text', key: 'amountExport' },
    { label: 'Amount', key: 'amountNumber' },
    { label: 'Currency', key: 'currencyCode' },
    { label: 'Currency issuer', key: 'currencyIssuer' },
    { label: selectedCurrency.toUpperCase() + ' Amount equavalent', key: 'amountInFiats.' + selectedCurrency },
    { label: 'Transfer fee as Text', key: 'transferFeeExport' },
    { label: 'Transfer fee', key: 'transferFeeNumber' },
    { label: 'Transfer fee currency', key: 'transferFeeCurrencyCode' },
    { label: 'Transfer fee currency issuer', key: 'transferFeeCurrencyIssuer' },
    {
      label: selectedCurrency.toUpperCase() + ' Transfer Fee equavalent',
      key: 'transferFeeInFiats.' + selectedCurrency
    },
    { label: 'Tx fee as Text', key: 'txFeeExport' },
    { label: 'Tx fee', key: 'txFeeNumber' },
    { label: 'Tx fee currency', key: 'txFeeCurrencyCode' },
    {
      label: selectedCurrency.toUpperCase() + ' Tx Fee equavalent',
      key: 'txFeeInFiats.' + selectedCurrency
    },
    { label: 'Memo', key: 'memo' },
    { label: 'Tx', key: 'hash' }
  ]

  const getProAddressHistory = async (options) => {
    if (addressesToCheck.length === 0) return
    setLoading(true)
    setErrorMessage('')

    let orderPart = order
    let sortCurrency = null

    //amountLow, amountHigh
    if (order === 'nativeCurrencyAmountLow') {
      orderPart = 'amountAbsoluteLow'
      sortCurrency = nativeCurrency
    } else if (order === 'nativeCurrencyAmountHigh') {
      orderPart = 'amountAbsoluteHigh'
      sortCurrency = nativeCurrency
    } else if (order === 'fiatAmountLow') {
      orderPart = 'amountAbsoluteLow'
      sortCurrency = selectedCurrency
    } else if (order === 'fiatAmountHigh') {
      orderPart = 'amountAbsoluteHigh'
      sortCurrency = selectedCurrency
    }

    const response = await axiosAdmin
      .get(
        'user/addresses/activities?convertCurrency=' +
          selectedCurrency +
          '&addresses=' +
          selectedAddressesKey +
          '&period=' +
          period +
          '&order=' +
          orderPart +
          '&limit=1000' +
          (options?.marker ? '&marker=' + options.marker : '') +
          (sortCurrency ? '&sortCurrency=' + sortCurrency : '')
      )
      .catch((error) => {
        setLoading(false)
        if (error.response?.data?.error === 'errors.token.required') {
          if (sampleMode) {
            setErrorMessage(t('pro.history.sample-unavailable', { ns: 'admin' }))
          } else {
            openEmailLogin()
          }
          return
        }
        if (error && error.message !== 'canceled') {
          setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
        }
      })
    setLoading(false)
    let res = response?.data
    /*
      {
        "total": 414,
        "count": 200,
        "marker": "200",
        "activities": [
          {
            "address": "raNf8ibQZECTaiFqkDXKRmM2GfdWK76cSu",
            "timestamp": 1677327372,
            "ledgerIndex": 78035481,
            "txIndex": 5,
            "hash": "1C463FA4DC1D14C2A5890F39A3120946EB1F44EECC0C752C1E0194B8677B6F12",
            "direction": "sent",
            "txType": "TrustSet",
            "counterparty": null,
            "st": null,
            "dt": null,
            "currency": "XRP",
            "amount": "-0.000012",
            "amountNative": "-0.000012",
            "amountInFiats": {
              "aed": "-0.0000167092330343814396",
    */
    if (res) {
      const preparedActivities = []
      for (let i = 0; i < res.activities.length; i++) {
        const sending = isSending(res.activities[i])
        res.activities[i].index = i + 1
        res.activities[i].amountExport = amountFormat(res.activities[i].amount, { noSpace: true })
        res.activities[i].amountNumber = res.activities[i].amount?.value || res.activities[i].amount / 1000000
        res.activities[i].currencyCode = res.activities[i].amount?.currency || nativeCurrency
        const { currency } = amountParced(res.activities[i].amount)

        res.activities[i].currencyIssuer = res.activities[i].amount?.issuer

        res.activities[i].transferFeeExport = amountFormat(res.activities[i].transferFee)
        res.activities[i].transferFeeNumber = res.activities[i].transferFee?.value
        res.activities[i].transferFeeCurrencyCode = res.activities[i].transferFee?.currency
        res.activities[i].transferFeeCurrencyIssuer = res.activities[i].transferFee?.issuer

        res.activities[i].txFeeExport = amountFormat(res.activities[i].txFee)
        res.activities[i].txFeeNumber = res.activities[i].txFee / 1000000
        res.activities[i].txFeeCurrencyCode = nativeCurrency

        res.activities[i].timestampExport = new Date(res.activities[i].timestamp * 1000).toISOString()

        res.activities[i].sentAmount = sending ? res.activities[i].amountNumber : ''
        res.activities[i].sentCurrency = sending ? currency.toString().trim() : ''

        res.activities[i].receivedAmount = !sending ? res.activities[i].amountNumber : ''
        res.activities[i].receivedCurrency = !sending ? currency.toString().trim() : ''

        res.activities[i].netWorthCurrency = selectedCurrency.toUpperCase()

        //sanitize memos for CSV
        res.activities[i].memo = res.activities[i].memo?.replace(/"/g, "'") || ''
        preparedActivities.push(res.activities[i])
      }
      setData(res) // last request data
      if (options?.marker) {
        setActivities((prev) =>
          prev.concat(
            preparedActivities.map((activity, index) => ({
              ...activity,
              index: prev.length + index + 1
            }))
          )
        )
      } else {
        setActivities(preparedActivities) // rewrite old data
      }
    }
  }

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch((error) => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === 'errors.token.required') {
        router.push('/admin')
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })
    setLoadingVerifiedAddresses(false)
    const data = response?.data
    /*
      {
        "total": 1,
        "count": 1,
        "addresses": [
          {
            "id": 28,
            "createdAt": 1721741550,
            "address": "raN6cSu",
            "name": "vasia",
            "crawler": {
              "status": "queued",
              "createdAt": 1728212999,
              "updatedAt": 1728212999,
              "lastCrawledAt": null,
              "firstLedgerIndex": null,
              "currentLedgerIndex": null,
              "lastLedgerIndex": null
            }
          }
        ]
      }
    */
    setVerifiedAddresses(data?.addresses)
    if (addressesToCheck?.length === 0 && data?.addresses?.[0]?.address) {
      setAddressesToCheck([data.addresses[0].address])
    }
  }

  useEffect(() => {
    if (sessionToken) {
      getVerifiedAddresses()
    } else {
      setVerifiedAddresses(sampleVerifiedAddresses)
      setAddressesToCheck(sampleHistoryAddresses)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  useEffect(() => {
    if (addressesToCheck.length > 0) {
      setPage(0)
      getProAddressHistory()
    } else {
      setPage(0)
      setData(null)
      setActivities([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressesKey, selectedCurrency, period, order, sessionToken])

  const addressName = (address) => {
    for (let a of verifiedAddresses) {
      if (a.address === address) {
        return <span className="orange">{a.name}</span>
      }
    }
  }

  return (
    <>
      <SEO title={t('pro.history.seo', { ns: 'admin' })} />
      <div className="page-pro-history">
        <h1 className="center">{t('pro.history.title', { ns: 'admin' })}</h1>

        <AdminTabs name="mainTabs" tab="pro" />

        <div className="tabs-inline tabs-with-action">
          <ProTabs tab="balance-changes" />

          <Link
            href="/learn/xrp-xah-taxes"
            className="button-action thin narrow secondary tabs-inline-action"
            target="_blank"
            rel="noreferrer"
          >
            {t('button.view-guide', { ns: 'admin' })}
          </Link>
        </div>

        {sampleMode && (
          <div className="pro-history-demo-note">
            <b>{t('pro.history.sample-title', { ns: 'admin' })}</b>
            <span>
              {t('pro.history.sample-text', { ns: 'admin' })}{' '}
              <Link href="/admin/pro">{t('pro.history.sign-in-pro', { ns: 'admin' })}</Link>.
            </span>
          </div>
        )}

        {
          <>
            <FiltersFrame
              order={order}
              setOrder={setOrder}
              orderList={[
                { value: 'DESC', label: t('pro.history.order.latest', { ns: 'admin' }) },
                { value: 'ASC', label: t('pro.history.order.earliest', { ns: 'admin' }) },
                {
                  value: 'nativeCurrencyAmountLow',
                  label: t('pro.history.order.native-low', { ns: 'admin', currency: nativeCurrency.toUpperCase() })
                },
                {
                  value: 'nativeCurrencyAmountHigh',
                  label: t('pro.history.order.native-high', { ns: 'admin', currency: nativeCurrency.toUpperCase() })
                },
                { value: 'fiatAmountLow', label: t('pro.history.order.fiat-low', { ns: 'admin' }) },
                { value: 'fiatAmountHigh', label: t('pro.history.order.fiat-high', { ns: 'admin' }) }
              ]}
              count={filteredActivities?.length || 0}
              total={removeDust ? filteredActivities?.length || 0 : data?.total || 0}
              hasMore={data?.marker}
              data={filteredActivities || []}
              csvHeaders={csvHeaders}
              setSelectedCurrency={setSelectedCurrency}
              selectedCurrency={selectedCurrency}
              setFiltersHide={setFiltersHide}
              filtersHide={filtersHide}
              page={page}
              setPage={setPage}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
            >
              <>
                {verifiedAddresses?.length > 0 && data && activities && data.total > activities.length && (
                  <div className="center" style={{ margin: 'auto' }}>
                    <button
                      className="button-action narrow thin"
                      onClick={() => getProAddressHistory({ marker: data.marker })}
                    >
                      {t('button.load-more-data', { ns: 'admin' })}
                    </button>
                    <br />
                    <br />
                  </div>
                )}
                <div className="pro-history-address-title">{t('table.addresses', { ns: 'admin' })}</div>
                {verifiedAddresses?.length > 0 ? (
                  <>
                    {verifiedAddresses.map((address, i) => (
                      <div className="filters-check-box pro-history-address-filter" key={i}>
                        <CheckBox
                          checked={addressesToCheck.includes(address.address)}
                          setChecked={() => {
                            setAddressesToCheck(
                              addressesToCheck.includes(address.address)
                                ? addressesToCheck.filter((a) => a !== address.address)
                                : [...addressesToCheck, address.address]
                            )
                          }}
                          outline
                        >
                          <div className="pro-history-address-option">
                            <Avatar src={avatarSrc(address.address)} size={32} />
                            <div className="pro-history-address-text">
                              <div>
                                <b className="orange">{address.name}</b>{' '}
                                <small>{crawlerStatus(address.crawler, { inline: true })}</small>
                              </div>
                              {addressLink(address.address, { short: 8 })}
                            </div>
                          </div>
                        </CheckBox>
                      </div>
                    ))}
                    {sampleMode && (
                      <div className="pro-history-add-wallet">
                        <Link href="/admin/pro" className="button-action narrow thin secondary">
                          {t('pro.history.add-wallet', { ns: 'admin' })}
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {loadingVerifiedAddresses ? (
                      t('common.loading-data', { ns: 'admin' })
                    ) : (
                      <div>
                        <br />
                        <Link href="/admin/pro" className="button-action narrow thin">
                          {t('button.add', { ns: 'admin' })}
                        </Link>
                      </div>
                    )}
                  </>
                )}
                <div>
                  {t('pro.history.period', { ns: 'admin' })}
                  <DateAndTimeRange setPeriod={setPeriod} defaultPeriod="all" radio={true} />
                </div>
                <div>
                  <CheckBox
                    checked={removeDust}
                    outline
                    setChecked={(checked) => {
                      setRemoveDust(checked)
                      setPage(0)
                    }}
                  >
                    {t('pro.history.remove-dust', { ns: 'admin' })}
                  </CheckBox>
                </div>
                <div>
                  {t('pro.history.tax-platform', { ns: 'admin' })}
                  <RadioOptions
                    tabList={platformList}
                    tab={platformCSVExport}
                    setTab={setPlatformCSVExport}
                    name="platformSelect"
                    getLogo={(value) => `/images/tax-logos/${value.toLowerCase()}.png`}
                  />
                  {rendered && (
                    <CSVLink
                      data={processDataForExport(filteredActivities || [], platformCSVExport)}
                      headers={
                        platformCSVHeaders.find(
                          (header) => header.platform.toLowerCase() === platformCSVExport.toLowerCase()
                        )?.headers || []
                      }
                      filename={'export ' + platformCSVExport + ' ' + new Date().toISOString() + '.csv'}
                      className={'button-action' + (!(activities?.length > 0) ? ' disabled' : '')}
                      uFEFF={platformCSVExport === 'BlockPit' ? false : undefined}
                    >
                      <DownloadIcon /> {t('pro.history.csv-for', { ns: 'admin', platform: platformCSVExport })}
                    </CSVLink>
                  )}
                  {platformCSVExport === 'Koinly' && (
                    <>
                      <br />
                      <br />
                      {t('pro.history.koinly-note', { ns: 'admin' })}
                    </>
                  )}
                </div>
              </>
              <>
                {addressesToCheck.length > 0 && (
                  <>
                    {!width || width > 800 ? (
                      <table className="table-large no-hover pro-history-table" style={width > 800 ? { minWidth: 940 } : {}}>
                        <thead>
                          <tr>
                            <th className="center">#</th>
                            <th>{t('table.timestamp', { ns: 'admin' })}</th>
                            {addressesToCheck.length > 1 && <th>{t('table.address', { ns: 'admin' })}</th>}
                            <th>{t('table.transaction', { ns: 'admin' })}</th>
                            <th>{t('table.memo', { ns: 'admin' })}</th>
                            <th className="right">{t('table.transfer-fee', { ns: 'admin' })}</th>
                            <th className="right">{t('table.network-fee', { ns: 'admin' })}</th>
                            <th className="right">{t('table.balance-change', { ns: 'admin' })}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentList?.length > 0 ? (
                            <>
                              {currentList.map((a, i) => (
                                <tr key={i}>
                                  <td className="center">{a.index}</td>
                                  <td>{fullDateAndTime(a.timestamp)}</td>
                                  {addressesToCheck.length > 1 && <td>{addressName(a.address)}</td>}
                                  <td>
                                    <HistoryTransaction activity={a} />
                                  </td>
                                  <td>
                                    <div className="pro-history-memo">
                                      <span className={a.memo?.length > 20 ? 'tooltip' : ''}>
                                        {a.memo && a.memo?.slice(0, 20) + (a.memo?.length > 20 ? '...' : '')}
                                        {a.memo?.length > 20 && <span className="tooltiptext right">{a.memo}</span>}
                                      </span>
                                      {!a.memo && <span className="grey">-</span>}
                                    </div>
                                  </td>
                                  <td className="right" style={{ width: 110 }}>
                                    {/* showAmount(a.transferFee) */}
                                    <br />
                                    {a.transferFee ? (
                                      niceNumber(a.transferFeeInFiats?.[selectedCurrency], 0, selectedCurrency, 6)
                                    ) : (
                                      <br />
                                    )}
                                  </td>
                                  <td className="right" style={{ width: 110 }}>
                                    {showAmount(a.txFee)}
                                    <br />
                                    {a.txFee ? (
                                      niceNumber(a.txFeeInFiats?.[selectedCurrency], 0, selectedCurrency, 6)
                                    ) : (
                                      <br />
                                    )}
                                  </td>
                                  <td className="right" style={{ width: 110 }}>
                                    {showAmount(a.amount)}
                                    <br />
                                    {showFiat(a.amountInFiats, selectedCurrency) || <br />}
                                  </td>
                                </tr>
                              ))}
                            </>
                          ) : (
                            <tr>
                              <td colSpan="100" className="center">
                                {loading
                                  ? t('common.loading-data', { ns: 'admin' })
                                  : t('common.no-data-to-show', { ns: 'admin' })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <table className="table-mobile">
                        <tbody>
                          {currentList?.length > 0 ? (
                            <>
                              {currentList.map((a, i) => (
                                <tr key={i}>
                                  <td style={{ padding: '5px' }}>#{a.index}</td>
                                  <td>
                                    <p>
                                      {t('table.timestamp', { ns: 'admin' })}: <b>{fullDateAndTime(a.timestamp)}</b>
                                    </p>
                                    {addressesToCheck.length > 1 && (
                                      <p>
                                        {t('table.address', { ns: 'admin' })}: <b>{addressName(a.address)}</b>
                                      </p>
                                    )}
                                    <div className="pro-history-mobile-tx">
                                      {t('table.transaction', { ns: 'admin' })}: <HistoryTransaction activity={a} />
                                    </div>
                                    {a.memo && (
                                      <p>
                                        {t('table.memo', { ns: 'admin' })}:{' '}
                                        {a.memo?.slice(0, 197) + (a.memo?.length > 197 ? '...' : '')}
                                      </p>
                                    )}
                                    <p>
                                      {t('table.ledger-amount', { ns: 'admin' })}: <b>{showAmount(a.amount)}</b>
                                    </p>
                                    <p>
                                      {t('table.fiat-equivalent-currency', {
                                        ns: 'admin',
                                        currency: selectedCurrency.toUpperCase()
                                      })}:{' '}
                                      {showFiat(a.amountInFiats, selectedCurrency)}
                                    </p>
                                  </td>
                                </tr>
                              ))}
                            </>
                          ) : (
                            <tr>
                              <td colSpan="100" className="center">
                                {loading
                                  ? t('common.loading-data', { ns: 'admin' })
                                  : t('common.no-data-to-show', { ns: 'admin' })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
                {errorMessage && <div className="center orange bold pro-history-error">{errorMessage}</div>}
              </>
            </FiltersFrame>
          </>
        }
      </div>
    </>
  )
}
