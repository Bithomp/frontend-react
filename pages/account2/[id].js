import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { useRouter } from 'next/router'
import LinkIcon from '../../public/images/link.svg'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import {
  avatarSrc,
  devNet,
  nativeCurrency,
  networks,
  isValidPayString,
  isValidXAddress,
  isTagValid,
  isDomainValid,
  stripDomain
} from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { xAddressToClassicAddress } from 'ripple-address-codec'

const setBalancesFunction = (networkInfo, data) => {
  if (!data?.ledgerInfo || !networkInfo || data.ledgerInfo.balance === undefined) return null
  let balanceList = {
    total: {
      native: data.ledgerInfo.balance || 0
    },
    reserved: {
      native: Number(networkInfo.reserveBase) + data.ledgerInfo.ownerCount * networkInfo.reserveIncrement
    },
    available: {}
  }

  if (balanceList.reserved.native > balanceList.total.native) {
    balanceList.reserved.native = balanceList.total.native
  }

  balanceList.available.native = balanceList.total.native - balanceList.reserved.native

  if (balanceList.available.native < 0) {
    balanceList.available.native = 0
  }

  return balanceList
}

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  let networkInfo = {}
  let initialErrorMessage = null
  const { id, ledgerIndex, ledgerTimestamp } = query
  const ledgerTimestampValue = Array.isArray(ledgerTimestamp) ? ledgerTimestamp[0] : ledgerTimestamp
  const isHistoricalLedger = !!ledgerIndex || !!ledgerTimestamp
  let account = id ? (Array.isArray(id) ? id[0] : id) : ''
  let accountWithTag = null

  if (isValidXAddress(account)) {
    try {
      const decoded = xAddressToClassicAddress(account)
      if (!isTagValid(decoded.tag)) {
        account = decoded.classicAddress
      } else {
        accountWithTag = {
          address: decoded.classicAddress,
          xAddress: account,
          tag: decoded.tag
        }
      }
    } catch {
      initialErrorMessage = 'Invalid xAddress format'
    }
  } else if (isValidPayString(account)) {
    const payStringData = await axiosServer({
      method: 'get',
      url: 'v2/payId/' + account,
      headers: passHeaders(req)
    }).catch((error) => {
      initialErrorMessage = error.message
    })

    if (payStringData?.data) {
      if (!isTagValid(payStringData.data.tag) && payStringData.data.address) {
        account = payStringData.data.address
      } else if (payStringData.data.address) {
        accountWithTag = payStringData.data
      } else {
        initialErrorMessage = 'We could not resolve your payString ' + account
      }
    } else {
      initialErrorMessage = 'Invalid payString response'
    }
  }

  if (!accountWithTag && !initialErrorMessage) {
    try {
      const res = await axiosServer({
        method: 'get',
        url:
          'v2/address/' +
          account +
          '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true&obligations=true' +
          (ledgerTimestampValue ? '&ledgerTimestamp=' + new Date(ledgerTimestampValue).toISOString() : ''),
        headers: passHeaders(req)
      })
      initialData = res?.data

      if (initialData?.error) {
        initialErrorMessage = initialData.error
        initialData = null
      } else {
        const networkData = await axiosServer({
          method: 'get',
          url: 'v2/server',
          headers: passHeaders(req)
        })
        networkInfo = networkData?.data
      }
    } catch (e) {
      initialErrorMessage = e?.message || 'Failed to load account data'
    }

    const balanceListServer = setBalancesFunction(networkInfo, initialData)
    const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)

    return {
      props: {
        id: account || null,
        isHistoricalLedger,
        ledgerTimestampQuery: ledgerTimestampValue || '',
        fiatRateServer,
        selectedCurrencyServer,
        networkInfo,
        balanceListServer: balanceListServer || {},
        isSsrMobile: getIsSsrMobile(context),
        initialData: initialData || {},
        initialErrorMessage: initialErrorMessage || null,
        ...(await serverSideTranslations(locale, ['common', 'account']))
      }
    }
  } else {
    return {
      props: {
        id: account || null,
        isHistoricalLedger,
        accountWithTag: accountWithTag || null,
        isSsrMobile: getIsSsrMobile(context),
        initialErrorMessage: initialErrorMessage || null,
        ...(await serverSideTranslations(locale, ['common', 'account']))
      }
    }
  }
}

import SEO from '../../components/SEO'
import Did from '../../components/Account/Did'
import AccountWithTag from '../../components/Account/AccountWithTag'
import { fetchHistoricalRate } from '../../utils/common'
import CopyButton from '../../components/UI/CopyButton'
import { CurrencyWithIcon } from '../../utils/format'
import { NftImage, nftName } from '../../utils/nft'
import {
  amountFormat,
  addressUsernameOrServiceLink,
  fullDateAndTime,
  fullNiceNumber,
  nativeCurrencyToFiat,
  niceNumber,
  niceCurrency,
  shortNiceNumber,
  serviceUsernameOrAddressText,
  timeFromNow,
  transferRateToPercent,
  userOrServiceName
} from '../../utils/format'
import { subtract } from '../../utils/calc'
import { addressBalanceChanges } from '../../utils/transaction'
import {
  FaFacebook,
  FaGear,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaTelegram,
  FaYoutube,
  FaXTwitter
} from 'react-icons/fa6'
import { MdQrCode2 } from 'react-icons/md'
import { useQRCode } from 'next-qrcode'

// Column Wrapper
const CollapsibleColumn = ({ children }) => {
  return (
    <div className="collapsible-column">
      <div className="column-content">{children}</div>
    </div>
  )
}

export default function Account2({
  initialData,
  initialErrorMessage,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  fiatRate: fiatRateApp,
  fiatRateServer,
  balanceListServer,
  isHistoricalLedger,
  ledgerTimestampQuery,
  accountWithTag,
  account
}) {
  const { i18n } = useTranslation()
  const router = useRouter()
  const { Canvas } = useQRCode()
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)
  const [showTotalWorthDetails, setShowTotalWorthDetails] = useState(false)
  const [showAddressQr, setShowAddressQr] = useState(false)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [showAllTokens, setShowAllTokens] = useState(false)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(
    ledgerTimestampQuery ? new Date(ledgerTimestampQuery) : new Date()
  )
  const [tokens, setTokens] = useState([])
  const [issuedTokens, setIssuedTokens] = useState([])
  const [issuedTokensLoading, setIssuedTokensLoading] = useState(false)
  const [issuedTokensError, setIssuedTokensError] = useState(null)
  const [ownedNfts, setOwnedNfts] = useState([])
  const [ownedNftIds, setOwnedNftIds] = useState([])
  const [expandedToken, setExpandedToken] = useState(null)
  const [expandedIssuedToken, setExpandedIssuedToken] = useState(null)
  const [showIssuerSettingsDetails, setShowIssuerSettingsDetails] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsLoadingMore, setTransactionsLoadingMore] = useState(false)
  const [transactionsError, setTransactionsError] = useState(null)
  const [transactionsMarker, setTransactionsMarker] = useState(null)
  const [showTxFilters, setShowTxFilters] = useState(false)
  const [txOrder, setTxOrder] = useState('newest')
  const [txType, setTxType] = useState('all')
  const [txInitiated, setTxInitiated] = useState('all')
  const [txExcludeFailures, setTxExcludeFailures] = useState('all')
  const [txCounterparty, setTxCounterparty] = useState('')
  const [txFromDate, setTxFromDate] = useState('')
  const [txToDate, setTxToDate] = useState('')
  const [txFilterSpam, setTxFilterSpam] = useState(true)
  const [tokenFiatRate, setTokenFiatRate] = useState(!ledgerTimestampQuery ? fiatRateServer || fiatRateApp || null : 0)
  const [pageFiatRate, setPageFiatRate] = useState(!ledgerTimestampQuery ? fiatRateServer || fiatRateApp || null : 0)
  const data = initialData
  const effectiveLedgerTimestamp = ledgerTimestampQuery || null
  const historicalTimestampForBanner = effectiveLedgerTimestamp || data?.ledgerInfo?.ledgerTimestamp || null
  const localDateTimeText = (value) => {
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString()
  }

  const timestampToMs = (value) => {
    if (!value) return null
    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? null : parsed
    }
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) return null
    return numberValue < 1000000000000 ? numberValue * 1000 : numberValue
  }

  const formatRelativeBeforeReference = (sourceTimestampSeconds, referenceTimestampValue) => {
    if (!sourceTimestampSeconds || !referenceTimestampValue) return null
    const referenceMs = timestampToMs(referenceTimestampValue)
    if (!referenceMs) return null

    const diffSeconds = Math.floor(referenceMs / 1000 - Number(sourceTimestampSeconds))
    if (!Number.isFinite(diffSeconds)) return null
    if (diffSeconds <= 0) return 'at selected time'

    const units = [
      { key: 'year', seconds: 60 * 60 * 24 * 365 },
      { key: 'month', seconds: 60 * 60 * 24 * 30 },
      { key: 'day', seconds: 60 * 60 * 24 },
      { key: 'hour', seconds: 60 * 60 },
      { key: 'minute', seconds: 60 },
      { key: 'second', seconds: 1 }
    ]

    const unit = units.find((item) => diffSeconds >= item.seconds) || units[units.length - 1]
    const value = Math.floor(diffSeconds / unit.seconds)
    return `${value} ${unit.key}${value === 1 ? '' : 's'} before selected time`
  }

  const balanceList = balanceListServer
  const isLoggedIn = !!account?.address
  const TOKEN_PREVIEW_LIMIT = 5
  const NFT_PREVIEW_LIMIT = 8
  const issuerTransferFeeText = data?.ledgerInfo?.transferRate
    ? transferRateToPercent(data.ledgerInfo.transferRate)
    : '0%'
  const isRipplingEnabled = !!data?.ledgerInfo?.flags?.defaultRipple
  const isCanEscrowEnabled = !!data?.ledgerInfo?.flags?.allowTrustLineLocking

  const achievements = []

  const inceptionTimestamp = Number(data?.inception)
  if (Number.isFinite(inceptionTimestamp) && inceptionTimestamp > 0) {
    const accountAgeYears = (Date.now() / 1000 - inceptionTimestamp) / (60 * 60 * 24 * 365.25)
    const ageAchievementList = [
      { years: 10, image: '10years.png', tooltip: 'Account active for 10+ years' },
      { years: 5, image: '5years.png', tooltip: 'Account active for 5+ years' },
      { years: 3, image: '3years.png', tooltip: 'Account active for 3+ years' },
      { years: 2, image: '2year.png', tooltip: 'Account active for 2+ years' },
      { years: 1, image: '1year.png', tooltip: 'Account active for 1+ year' }
    ]

    const ageAchievement = ageAchievementList.find((item) => accountAgeYears >= item.years)
    if (ageAchievement) {
      achievements.push({
        key: `age-${ageAchievement.years}`,
        image: ageAchievement.image,
        tooltip: ageAchievement.tooltip
      })
    }
  }

  if (data?.bithomp?.bithompPro) {
    achievements.push({
      key: 'bithomp-pro',
      image: 'bithomppro.png',
      tooltip: 'Bithomp Pro activated'
    })
  }

  if (data?.xamanMeta?.kycApproved) {
    achievements.push({
      key: 'xaman-kyc',
      image: 'xamankyc.png',
      tooltip: 'Xaman KYC verified'
    })
  }

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  const nativeAvailableFiatValue = ((balanceList?.available?.native || 0) / 1000000) * (pageFiatRate || 0)
  const lpTokensCount = tokens.filter((token) => token.Balance?.currency?.substring(0, 2) === '03').length
  const issuedTokensCount = tokens.filter((token) => token.Balance?.currency?.substring(0, 2) !== '03').length
  const lpTokensFiatValue = tokens.reduce((sum, token) => {
    const isLpToken = token.Balance?.currency?.substring(0, 2) === '03'
    if (!isLpToken) return sum
    const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
    return sum + (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
  }, 0)
  const issuedTokensFiatValue = tokens.reduce((sum, token) => {
    const isLpToken = token.Balance?.currency?.substring(0, 2) === '03'
    if (isLpToken) return sum
    const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
    return sum + (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
  }, 0)
  const totalWorthFiatValue = nativeAvailableFiatValue + lpTokensFiatValue + issuedTokensFiatValue
  const totalWorthBreakdown = [
    { label: nativeCurrency, value: nativeAvailableFiatValue },
    ...(lpTokensCount > 0 ? [{ label: `LP tokens (${lpTokensCount})`, value: lpTokensFiatValue }] : []),
    ...(issuedTokensCount > 0 ? [{ label: `Issued tokens (${issuedTokensCount})`, value: issuedTokensFiatValue }] : [])
  ].sort((a, b) => b.value - a.value)
  const visibleTokens = showAllTokens ? tokens : tokens.slice(0, TOKEN_PREVIEW_LIMIT)
  const hiddenTokensCount = Math.max(tokens.length - TOKEN_PREVIEW_LIMIT, 0)
  const ownedNftCount = Math.max(ownedNftIds.length, ownedNfts.length)
  const ownedNftPreview =
    ownedNfts.length > 0
      ? ownedNfts.slice(0, NFT_PREVIEW_LIMIT)
      : ownedNftIds.slice(0, NFT_PREVIEW_LIMIT).map((nftokenID) => ({ nftokenID }))

  useEffect(() => {
    if (!selectedCurrency) return
    if (!effectiveLedgerTimestamp) {
      setPageFiatRate(fiatRate)
    } else {
      fetchHistoricalRate({
        timestamp: effectiveLedgerTimestamp,
        selectedCurrency,
        setPageFiatRate
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiatRate, effectiveLedgerTimestamp, selectedCurrency])

  useEffect(() => {
    if (!selectedCurrency) return

    if (!effectiveLedgerTimestamp) {
      setTokenFiatRate(fiatRate)
      return
    }

    setTokenFiatRate(pageFiatRate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, effectiveLedgerTimestamp])

  useEffect(() => {
    if (!effectiveLedgerTimestamp) return
    setTokenFiatRate(pageFiatRate)
  }, [pageFiatRate, effectiveLedgerTimestamp])

  useEffect(() => {
    if (effectiveLedgerTimestamp) {
      setLedgerTimestampInput(new Date(effectiveLedgerTimestamp))
    } else {
      setLedgerTimestampInput(new Date())
    }
  }, [effectiveLedgerTimestamp])

  useEffect(() => {
    setShowAllTokens(false)
    setExpandedToken(null)
  }, [data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    setExpandedIssuedToken(null)
    setShowIssuerSettingsDetails(false)
  }, [data?.address, effectiveLedgerTimestamp])

  // Fetch tokens
  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated) return

    const fetchTokens = async () => {
      try {
        const objectsUrl =
          `v2/objects/${data.address}?limit=1000&priceNativeCurrencySpot=true&currencyDetails=true` +
          (effectiveLedgerTimestamp
            ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
            : '')

        const response = await axios.get(objectsUrl)
        const accountObjects = response?.data?.objects || []

        const nftIds = accountObjects
          .filter((node) => node.LedgerEntryType === 'NFTokenPage' && Array.isArray(node.NFTokens))
          .flatMap((page) =>
            page.NFTokens.map((nftNode) => nftNode?.NFToken?.NFTokenID || nftNode?.NFTokenID).filter(Boolean)
          )

        setOwnedNftIds(nftIds)

        if (nftIds.length > 0) {
          try {
            const nftPreviewUrl =
              `v2/nfts?owner=${data.address}&order=mintedNew&includeWithoutMediaData=true&limit=${NFT_PREVIEW_LIMIT}` +
              (effectiveLedgerTimestamp
                ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
                : '')

            const nftResponse = await axios.get(nftPreviewUrl)
            setOwnedNfts(
              Array.isArray(nftResponse?.data?.nfts) ? nftResponse.data.nfts.slice(0, NFT_PREVIEW_LIMIT) : []
            )
          } catch {
            setOwnedNfts([])
          }
        } else {
          setOwnedNfts([])
        }

        // Filter RippleState objects (tokens)
        const rippleStateList = accountObjects.filter((node) => {
          if (node.LedgerEntryType !== 'RippleState') return false

          const isPositiveBalance = (balance) => balance !== '0' && balance[0] !== '-'
          const isNegativeBalance = (balance) => balance !== '0' && balance[0] === '-'

          if (node.HighLimit.issuer === data.address) {
            if (node.Flags & 131072) {
              if (isPositiveBalance(node.Balance.value)) return false
              return true
            }
            if (isNegativeBalance(node.Balance.value)) return true
          } else {
            if (node.Flags & 65536) {
              if (isNegativeBalance(node.Balance.value)) return false
              return true
            }
            if (isPositiveBalance(node.Balance.value)) return true
          }
          return false
        })

        // Sort by token value in native currency (independent from websocket fiat updates)
        const sortedTokens = rippleStateList.sort((a, b) => {
          const balanceA = Math.abs(subtract(a.Balance?.value, a.LockedBalance?.value || 0))
          const balanceB = Math.abs(subtract(b.Balance?.value, b.LockedBalance?.value || 0))

          if (balanceA === 0 && balanceB === 0) return 0
          if (balanceA === 0) return 1
          if (balanceB === 0) return -1

          const valueA = a.priceNativeCurrencySpot * balanceA || 0
          const valueB = b.priceNativeCurrencySpot * balanceB || 0

          return valueB - valueA
        })

        setTokens(sortedTokens)
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
        setOwnedNfts([])
        setOwnedNftIds([])
      }
    }

    fetchTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address, data?.ledgerInfo?.activated, effectiveLedgerTimestamp])

  useEffect(() => {
    if (!data?.address) return

    const fetchIssuedTokens = async () => {
      setIssuedTokensLoading(true)
      setIssuedTokensError(null)

      try {
        const issuedTokensUrl =
          `v2/trustlines/tokens?issuer=${data.address}&limit=100&currencyDetails=true&statistics=true&order=holdersHigh` +
          (effectiveLedgerTimestamp
            ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
            : '')

        const response = await axios.get(issuedTokensUrl)
        const fetchedIssuedTokens = Array.isArray(response?.data?.tokens) ? response.data.tokens : []

        const sortedIssuedTokens = fetchedIssuedTokens.sort(
          (a, b) => Number(b?.statistics?.marketcap || 0) - Number(a?.statistics?.marketcap || 0)
        )

        setIssuedTokens(sortedIssuedTokens)
      } catch (error) {
        setIssuedTokens([])
        setIssuedTokensError(error?.message || 'Failed to load issued tokens')
      } finally {
        setIssuedTokensLoading(false)
      }
    }

    fetchIssuedTokens()
  }, [data?.address, effectiveLedgerTimestamp])

  const buildTransactionsUrl = ({ markerValue, filtersOverride } = {}) => {
    if (!data?.address) return ''

    const filterState = {
      txOrder,
      txType,
      txInitiated,
      txExcludeFailures,
      txCounterparty,
      txFromDate,
      txToDate,
      txFilterSpam,
      ...(filtersOverride || {})
    }

    const params = new URLSearchParams()
    params.set('limit', '5')
    params.set('relevantOnly', 'true')
    params.set('filterSpam', filterState.txFilterSpam ? 'true' : 'false')

    if (selectedCurrency) {
      params.set('convertCurrencies', selectedCurrency)
    }
    if (filterState.txOrder === 'oldest') {
      params.set('forward', 'true')
    }
    if (filterState.txType && filterState.txType !== 'all') {
      params.set('type', filterState.txType)
    }
    if (filterState.txInitiated === 'true' || filterState.txInitiated === 'false') {
      params.set('initiated', filterState.txInitiated)
    }
    if (filterState.txExcludeFailures === 'true') {
      params.set('excludeFailures', 'true')
    }
    if (filterState.txCounterparty?.trim()) {
      params.set('counterparty', filterState.txCounterparty.trim())
    }
    if (filterState.txFromDate) {
      params.set('fromDate', new Date(filterState.txFromDate).toISOString())
    }
    if (filterState.txToDate) {
      params.set('toDate', new Date(filterState.txToDate).toISOString())
    } else if (effectiveLedgerTimestamp) {
      params.set('toDate', new Date(effectiveLedgerTimestamp).toISOString())
    }
    if (markerValue) {
      const markerString = typeof markerValue === 'object' ? JSON.stringify(markerValue) : markerValue
      params.set('marker', markerString)
    }

    return `v3/transactions/${data.address}?${params.toString()}`
  }

  const applyTimeMachine = () => {
    if (!data?.address || !ledgerTimestampInput) return
    router.push({
      pathname: `/account2/${data.address}`,
      query: {
        ledgerTimestamp: new Date(ledgerTimestampInput).toISOString()
      }
    })
  }

  const resetTimeMachine = () => {
    if (!data?.address) return
    setLedgerTimestampInput(new Date())
    router.push({
      pathname: `/account2/${data.address}`
    })
  }

  const fetchRecentTransactions = async ({ markerValue = null, append = false, filtersOverride } = {}) => {
    if (!data?.address) return

    if (append) {
      setTransactionsLoadingMore(true)
    } else {
      setTransactionsLoading(true)
    }

    setTransactionsError(null)

    try {
      const response = await axios.get(buildTransactionsUrl({ markerValue, filtersOverride }))
      const newTransactions = response?.data?.transactions || []

      if (append) {
        setRecentTransactions((prev) => [...prev, ...newTransactions])
      } else {
        setRecentTransactions(newTransactions)
      }

      setTransactionsMarker(response?.data?.marker || null)
    } catch (error) {
      setTransactionsError(error?.message || 'Failed to load transactions')
      if (!append) {
        setRecentTransactions([])
        setTransactionsMarker(null)
      }
    } finally {
      if (append) {
        setTransactionsLoadingMore(false)
      } else {
        setTransactionsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated) return
    fetchRecentTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address, data?.ledgerInfo?.activated, selectedCurrency, effectiveLedgerTimestamp])

  const loadMoreTransactions = async () => {
    if (!data?.address || !transactionsMarker || transactionsLoadingMore || transactionsLoading) return
    fetchRecentTransactions({ markerValue: transactionsMarker, append: true })
  }

  const applyTransactionFilters = () => {
    setTransactionsMarker(null)
    fetchRecentTransactions()
  }

  const resetTransactionFilters = () => {
    const defaultFilters = {
      txOrder: 'newest',
      txType: 'all',
      txInitiated: 'all',
      txExcludeFailures: 'all',
      txCounterparty: '',
      txFromDate: '',
      txToDate: '',
      txFilterSpam: true
    }

    setTxOrder(defaultFilters.txOrder)
    setTxType(defaultFilters.txType)
    setTxInitiated(defaultFilters.txInitiated)
    setTxExcludeFailures(defaultFilters.txExcludeFailures)
    setTxCounterparty(defaultFilters.txCounterparty)
    setTxFromDate(defaultFilters.txFromDate)
    setTxToDate(defaultFilters.txToDate)
    setTxFilterSpam(defaultFilters.txFilterSpam)

    setTransactionsMarker(null)
    fetchRecentTransactions({ filtersOverride: defaultFilters })
  }

  const showPaystring =
    isValidPayString(data?.payString) &&
    !data?.ledgerInfo?.requireDestTag &&
    !data?.ledgerInfo?.blackholed &&
    !data?.blacklist?.blacklisted &&
    !data?.service

  const socialAccounts = data?.service?.socialAccounts

  const socialAccountsNode = socialAccounts ? (
    <div className="social-icons">
      {socialAccounts.twitter && (
        <a href={`https://x.com/${socialAccounts.twitter}`} aria-label="X" target="_blank" rel="noopener">
          <FaXTwitter />
        </a>
      )}
      {socialAccounts.youtube && (
        <a href={`https://youtube.com/${socialAccounts.youtube}`} aria-label="Youtube" target="_blank" rel="noopener">
          <FaYoutube />
        </a>
      )}
      {socialAccounts.linkedin && (
        <a
          href={`https://linkedin.com/company/${socialAccounts.linkedin}/`}
          aria-label="Linkedin"
          target="_blank"
          rel="noopener"
        >
          <FaLinkedin />
        </a>
      )}
      {socialAccounts.instagram && (
        <a
          href={`https://www.instagram.com/${socialAccounts.instagram}/`}
          aria-label="Instagram"
          target="_blank"
          rel="noopener"
        >
          <FaInstagram />
        </a>
      )}
      {socialAccounts.telegram && (
        <a href={`https://t.me/${socialAccounts.telegram}`} aria-label="Telegram" target="_blank" rel="noopener">
          <FaTelegram />
        </a>
      )}
      {socialAccounts.facebook && (
        <a
          href={`https://www.facebook.com/${socialAccounts.facebook}/`}
          aria-label="Facebook"
          target="_blank"
          rel="noopener"
        >
          <FaFacebook />
        </a>
      )}
      {socialAccounts.medium && (
        <a href={`https://medium.com/${socialAccounts.medium}`} aria-label="Medium" target="_blank" rel="noopener">
          <FaMedium />
        </a>
      )}
      {socialAccounts.reddit && (
        <a href={`https://www.reddit.com/${socialAccounts.reddit}/`} aria-label="Reddit" target="_blank" rel="noopener">
          <FaReddit />
        </a>
      )}
    </div>
  ) : null

  const publicDataRows = []
  const pushPublicRow = (label, value) => {
    if (!value) return
    publicDataRows.push({ label, value, key: `${label}-${publicDataRows.length}` })
  }

  const xamanThirdPartyProfile = data?.xamanMeta?.thirdPartyProfiles?.[0]
  const isXamanProfile = xamanThirdPartyProfile?.source === 'xumm.app'
  const xamanOwnerAlias = data?.xamanMeta?.xummProfile?.ownerAlias
  const xamanAccountAlias =
    data?.xamanMeta?.xummProfile?.accountAlias || (isXamanProfile ? xamanThirdPartyProfile?.accountAlias : null)

  // Social accounts will be rendered separately without a label

  if (data?.service?.name && data?.username) {
    pushPublicRow(
      'Username',
      <span className="blue bold">
        {data.username} <CopyButton text={data.username} />
      </span>
    )
  }

  if (data?.nickname) {
    pushPublicRow('Nickname', <span className="orange bold">{data.nickname}</span>)
  }

  const normalizedUsername = (data?.username || '').trim().toLowerCase()
  const normalizedServiceName = (data?.service?.name || '').trim().toLowerCase()
  const normalizedXamanAccountAlias = (xamanAccountAlias || '').trim().toLowerCase()
  const showXamanAccountAlias =
    !!xamanAccountAlias &&
    normalizedXamanAccountAlias !== normalizedUsername &&
    normalizedXamanAccountAlias !== normalizedServiceName

  const hasXamanCardData =
    !isHistoricalLedger && !!(data?.xamanMeta?.xummPro || xamanOwnerAlias || showXamanAccountAlias)
  const xamanRows = []

  if (data?.xamanMeta?.xummPro) {
    xamanRows.push({
      key: 'pro',
      label: 'Pro:',
      value: data?.xamanMeta?.xummProfile?.slug ? (
        <a href={data.xamanMeta.xummProfile.profileUrl} className="green" target="_blank" rel="noopener nofollow">
          {data.xamanMeta.xummProfile.slug}
        </a>
      ) : (
        <span className="bold">activated</span>
      )
    })
  }

  if (xamanOwnerAlias) {
    xamanRows.push({ key: 'owner-alias', label: 'Owner alias:', value: xamanOwnerAlias })
  }

  if (showXamanAccountAlias) {
    xamanRows.push({ key: 'account-alias', label: 'Account alias:', value: xamanAccountAlias })
  }

  if (showPaystring) {
    pushPublicRow(
      'PayString',
      <span className="blue">
        {data.payString} <CopyButton text={data.payString} />
      </span>
    )
  }

  if (data?.ledgerInfo?.domain) {
    const domainText = stripDomain(data.ledgerInfo.domain)
    const serviceDomainText = stripDomain(data.service?.domain || '')
    const isValidDomain = isDomainValid(domainText)
    const isDifferentFromService = domainText.toLowerCase() !== serviceDomainText.toLowerCase()

    // Only show if different from service domain
    if (isDifferentFromService) {
      const showUnverified =
        isValidDomain &&
        !data.verifiedDomain &&
        (!data.service?.domain || !data.ledgerInfo.domain.toLowerCase().includes(data.service.domain.toLowerCase()))

      pushPublicRow(
        'Domain',
        isValidDomain ? (
          <>
            <a
              href={`https://${domainText}`}
              className={data.verifiedDomain ? 'green bold' : ''}
              target="_blank"
              rel="noopener nofollow"
            >
              {domainText}
            </a>{' '}
            {showUnverified && <span className="grey">(unverified)</span>}
          </>
        ) : (
          <code className="code-highlight">{data.ledgerInfo.domain}</code>
        )
      )
    }
  }

  if (data?.inception) {
    const activatedByDetails = {
      address: data?.parent?.address,
      addressDetails: {
        service: data?.parent?.service?.name || data?.parent?.service?.domain,
        username: data?.parent?.username
      }
    }
    const activatedByName = serviceUsernameOrAddressText(activatedByDetails)
    const activatedByAddress = data?.parent?.address
    const activatedByIsService = !!activatedByDetails.addressDetails.service
    const activatedByIsUsername = !activatedByIsService && !!activatedByDetails.addressDetails.username
    const activationTimeText = fullDateAndTime(data.inception, null, { asText: true })
    const activatedRelativeToSelectedTime = isHistoricalLedger
      ? formatRelativeBeforeReference(data.inception, historicalTimestampForBanner)
      : null
    const activatedWithAmount = data?.initialBalance ? (
      <>
        {fullNiceNumber(data.initialBalance)} {nativeCurrency}
      </>
    ) : null

    pushPublicRow(
      'Activated',
      <span className="activated-line">
        <span className="tooltip activated-time no-brake">
          <span className="bold">{activatedRelativeToSelectedTime || timeFromNow(data.inception, i18n)}</span>
          <span className="tooltiptext right no-brake activation-tooltip" suppressHydrationWarning>
            {activationTimeText}
          </span>
        </span>
        {activatedByName && activatedByAddress && (
          <>
            {' '}
            by{' '}
            <Link href={`/account2/${activatedByAddress}`} onClick={(event) => event.stopPropagation()}>
              <span
                className={`activated-by ${activatedByIsService ? 'green' : ''} ${activatedByIsUsername ? 'blue' : ''}`}
              >
                <span className="tooltip no-brake">
                  {activatedByName}
                  <span className="tooltiptext right no-brake activation-tooltip">{activatedByAddress}</span>
                </span>
              </span>
            </Link>
          </>
        )}
        {activatedWithAmount && (
          <>
            {' '}
            with <span className="activated-amount">{activatedWithAmount}</span>
          </>
        )}
      </span>
    )
  }

  if (data?.genesis) {
    pushPublicRow(
      'Genesis balance',
      <span className="bold">
        {niceNumber(data.initialBalance)} {nativeCurrency}
      </span>
    )
  }

  if (data?.parent?.address === data?.address) {
    pushPublicRow(
      'Imported from XRPL',
      <a href={`${devNet ? networks.testnet.server : networks.mainnet.server}/account/${data.address}`}>
        {data.address}
      </a>
    )
  }

  if (hasXamanCardData) {
    pushPublicRow(
      'Xaman',
      <span className="xaman-card-data">
        {xamanRows.map((row, index) => (
          <span key={row.key}>
            <span className="xaman-data-line">
              <span className="xaman-data-label grey">{row.label}</span>{' '}
              <span className="xaman-data-value">{row.value}</span>
            </span>
            {index < xamanRows.length - 1 && <br />}
          </span>
        ))}
      </span>
    )
  }

  // If account with tag, show special component
  if (accountWithTag) {
    return <AccountWithTag data={accountWithTag} />
  }

  // Error state
  if (initialErrorMessage) {
    return (
      <>
        <SEO title="Account not found" />
        <div className="center">
          <h1>Account not found</h1>
          <p>{initialErrorMessage}</p>
          <Link href="/" className="button-action">
            Go Home
          </Link>
          <br />
          <br />
        </div>
      </>
    )
  }

  // Loading state
  if (!data || !data.address) {
    return (
      <>
        <SEO title="Loading Account..." />
        <div className="center">
          <h1>Loading...</h1>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO
        title={
          data.username
            ? `${data.username} (${data.address})`
            : data.service
              ? `${data.service} (${data.address})`
              : data.address
        }
      />

      <div className="account2-container">
        {isHistoricalLedger && (
          <div className="historical-banner">
            <span className="historical-badge">Historical mode</span>
            {historicalTimestampForBanner ? (
              <span className="historical-date no-brake" suppressHydrationWarning>
                {fullDateAndTime(historicalTimestampForBanner)}
              </span>
            ) : null}
          </div>
        )}
        {/* Header with switch to old view */}
        {/* Grid Layout */}
        <div className="account2-grid">
          {/* Column 1: Information */}
          <CollapsibleColumn>
            <div className="info-section">
              {/* Avatar */}
              <div className="avatar-container">
                <div className="avatar-wrapper">
                  <div className="avatar-image-mask">
                    <img src={avatarSrc(data.address)} alt="Avatar" className="account-avatar" />
                  </div>
                  {achievements.length > 0 && (
                    <div className={`achievements-orbit achievements-count-${Math.min(achievements.length, 6)}`}>
                      {achievements.slice(0, 6).map((achievement, index) => (
                        <span
                          className={`tooltip achievement-badge achievement-badge-${index + 1}`}
                          key={achievement.key}
                        >
                          <img
                            src={`/images/account/achivments/${achievement.image}`}
                            alt={achievement.tooltip}
                            className="achievement-image"
                          />
                          <span className="tooltiptext right no-brake">{achievement.tooltip}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="account-info">
                <h2 className="account-name">
                  {userOrServiceName({ service: data?.service?.name, username: data?.username }) || 'Account'}
                </h2>
                <div className="account-address">
                  <span className="account-address-text">{data.address}</span>
                  <CopyButton text={data.address} />
                  <button
                    type="button"
                    className={`account-qr-toggle ${showAddressQr ? 'active' : ''}`}
                    onClick={() => setShowAddressQr((prev) => !prev)}
                    aria-label="Toggle address QR code"
                    title="Show QR code"
                  >
                    <span className="tooltip">
                      <MdQrCode2 />
                      <span className="tooltiptext no-brake">QR code</span>
                    </span>
                  </button>
                </div>
                {showAddressQr && (
                  <div className="account-qr-panel">
                    <Canvas
                      text={data.address}
                      options={{
                        errorCorrectionLevel: 'M',
                        margin: 2,
                        scale: 4,
                        width: 170,
                        color: {
                          dark: '#333333ff',
                          light: '#ffffffff'
                        }
                      }}
                    />
                  </div>
                )}
                {data.service?.domain && (
                  <div className="account-domain grey">
                    <a href={`https://${data.service.domain}`} target="_blank" rel="noreferrer">
                      {data.service.domain}
                    </a>
                  </div>
                )}
              </div>

              {/* Social icons */}
              {socialAccountsNode && <div className="social-icons-wrapper">{socialAccountsNode}</div>}

              {data?.inception && publicDataRows.length > 0 && (
                <div className="public-data">
                  <div className="info-rows">
                    {publicDataRows.map((row) => (
                      <div className="info-row" key={row.key}>
                        <span className="label">{row.label}</span>
                        <span className="value">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DID */}
              {data.did && (
                <div className="did-section">
                  <Did data={data} />
                </div>
              )}

              <div className="time-machine-card">
                <button
                  type="button"
                  className={`time-machine-toggle ${showTimeMachine ? 'active' : ''}`}
                  onClick={() => setShowTimeMachine((prev) => !prev)}
                >
                  Historical data
                </button>

                {showTimeMachine && (
                  <div className="time-machine-panel">
                    <div className="time-machine-head">
                      <div className="time-machine-title">Select date and time</div>
                    </div>
                    <div className="time-machine-picker-wrap">
                      <DatePicker
                        selected={ledgerTimestampInput || new Date()}
                        onChange={setLedgerTimestampInput}
                        value={localDateTimeText(ledgerTimestampInput || new Date())}
                        selectsStart
                        showTimeInput
                        timeInputLabel="Time"
                        minDate={data?.inception ? new Date(data.inception * 1000) : undefined}
                        maxDate={new Date()}
                        dateFormat="Pp"
                        className="dateAndTimeRange time-machine-input"
                        calendarClassName="time-machine-calendar"
                        showMonthDropdown
                        showYearDropdown
                      />
                    </div>
                    <div className="time-machine-actions">
                      <button
                        type="button"
                        onClick={applyTimeMachine}
                        className="time-machine-btn time-machine-btn-update"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={resetTimeMachine}
                        className="time-machine-btn time-machine-btn-reset"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleColumn>

          {/* Column 2: Assets */}
          <CollapsibleColumn>
            <div className="assets-section">
              <div className="asset-item" onClick={() => setShowTotalWorthDetails(!showTotalWorthDetails)}>
                <div className="asset-main">
                  <div className="asset-logo">
                    <span className="asset-summary-title">Total worth</span>
                  </div>
                  <div className="asset-value">
                    <div className="asset-fiat" suppressHydrationWarning>
                      {shortNiceNumber(totalWorthFiatValue, 2, 1, selectedCurrency) ||
                        shortNiceNumber(0, 2, 1, selectedCurrency)}
                    </div>
                  </div>
                </div>
                {showTotalWorthDetails && (
                  <div className="asset-details">
                    {totalWorthBreakdown.map((item) => (
                      <div className="detail-row" key={`worth-${item.label}`}>
                        <span>{item.label}:</span>
                        <span suppressHydrationWarning>{shortNiceNumber(item.value, 2, 1, selectedCurrency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Native Currency Balance */}
              {balanceList && (
                <div className="asset-item" onClick={() => setShowBalanceDetails(!showBalanceDetails)}>
                  {!showBalanceDetails ? (
                    <div className="asset-main">
                      <div className="asset-logo">
                        <CurrencyWithIcon token={{ currency: nativeCurrency }} options={{ disableTokenLink: true }} />
                      </div>
                      <div className="asset-value">
                        <div className="asset-amount">{shortNiceNumber(balanceList.available.native / 1000000)}</div>
                        <div className="asset-fiat" suppressHydrationWarning>
                          {shortNiceNumber(
                            (balanceList.available.native / 1000000) * (pageFiatRate || 0),
                            2,
                            1,
                            selectedCurrency
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="asset-main">
                        <div className="asset-logo">
                          <CurrencyWithIcon token={{ currency: nativeCurrency }} options={{ disableTokenLink: true }} />
                        </div>
                        <div className="asset-value">
                          <div className="asset-amount">{shortNiceNumber(balanceList.available.native / 1000000)}</div>
                          <div className="asset-fiat" suppressHydrationWarning>
                            {shortNiceNumber(
                              (balanceList.available.native / 1000000) * (pageFiatRate || 0),
                              2,
                              1,
                              selectedCurrency
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="asset-details">
                        <div className="detail-row">
                          <span>Available:</span>
                          <span className="copy-inline">
                            <span>{balanceList.available.native / 1000000}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={balanceList.available.native / 1000000} />
                            </span>
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Total:</span>
                          <span className="amount-with-fiat">
                            <span>{amountFormat(balanceList.total.native, { precise: 'nice' })}</span>
                            <span className="fiat-line" suppressHydrationWarning>
                              {nativeCurrencyToFiat({
                                amount: balanceList.total.native,
                                selectedCurrency,
                                fiatRate: pageFiatRate,
                                asText: true
                              })}
                            </span>
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Reserved:</span>
                          <span className="grey amount-with-fiat">
                            <span>{amountFormat(balanceList.reserved.native, { precise: 'nice' })}</span>
                            <span className="fiat-line" suppressHydrationWarning>
                              {nativeCurrencyToFiat({
                                amount: balanceList.reserved.native,
                                selectedCurrency,
                                fiatRate: pageFiatRate,
                                asText: true
                              })}
                            </span>
                          </span>
                        </div>
                        {isHistoricalLedger && selectedCurrency && pageFiatRate ? (
                          <div className="detail-row">
                            <span>Rate:</span>
                            <span>
                              1 {nativeCurrency} = {shortNiceNumber(pageFiatRate, 2, 1, selectedCurrency)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tokens */}
              {visibleTokens.map((token, index) => {
                const issuer = token.HighLimit?.issuer === data?.address ? token.LowLimit : token.HighLimit
                const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
                const fiatValue = (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
                const tokenUniqueKey = `${token.Balance?.currency || 'token'}-${issuer?.issuer || 'issuer'}-${index}`
                const isExpanded = expandedToken === tokenUniqueKey
                const isLpToken = token.Balance?.currency?.substring(0, 2) === '03'

                return (
                  <div
                    key={tokenUniqueKey}
                    className="asset-item token-asset-item"
                    onClick={() => setExpandedToken(isExpanded ? null : tokenUniqueKey)}
                  >
                    <div className="asset-main">
                      <div className="asset-logo">
                        <CurrencyWithIcon
                          token={{ ...token.Balance, ...issuer }}
                          options={{ disableTokenLink: true }}
                        />
                      </div>
                      <div className="asset-value">
                        <div className="asset-amount">{shortNiceNumber(balance)}</div>
                        {fiatValue > 0 && (
                          <div className="asset-fiat">{shortNiceNumber(fiatValue, 2, 1, selectedCurrency)}</div>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="asset-details">
                        {!isLpToken && token.priceNativeCurrencySpot ? (
                          <>
                            <div className="detail-row">
                              <span>Rate ({nativeCurrency}):</span>
                              <span>
                                1 {niceCurrency(token.Balance?.currency)} ={' '}
                                {shortNiceNumber(token.priceNativeCurrencySpot, 6, 6)} {nativeCurrency}
                              </span>
                            </div>
                            {tokenFiatRate && selectedCurrency ? (
                              <div className="detail-row">
                                <span>Rate ({selectedCurrency?.toUpperCase()}):</span>
                                <span>
                                  1 {niceCurrency(token.Balance?.currency)} ={' '}
                                  <span className="tooltip no-brake" suppressHydrationWarning>
                                    {shortNiceNumber(
                                      token.priceNativeCurrencySpot * tokenFiatRate,
                                      2,
                                      1,
                                      selectedCurrency
                                    )}
                                    <span className="tooltiptext no-brake" suppressHydrationWarning>
                                      {niceNumber(
                                        token.priceNativeCurrencySpot * tokenFiatRate,
                                        null,
                                        selectedCurrency,
                                        8
                                      )}
                                    </span>
                                  </span>
                                </span>
                              </div>
                            ) : null}
                          </>
                        ) : null}
                        <div className="detail-row">
                          <span>Balance:</span>
                          <span className="copy-inline">
                            <span>{fullNiceNumber(balance)}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={balance} />
                            </span>
                          </span>
                        </div>
                        {isLpToken ? (
                          <>
                            {(() => {
                              const asset1 = token.Balance?.currencyDetails?.asset
                              const asset2 = token.Balance?.currencyDetails?.asset2

                              return (
                                <>
                                  <div className="detail-row">
                                    <span>LP Token:</span>
                                    <span className="copy-inline">
                                      <span>{token.Balance?.currency}</span>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={token.Balance?.currency} />
                                      </span>
                                    </span>
                                  </div>
                                  {asset1 && (
                                    <>
                                      <div className="detail-row">
                                        <span>Asset 1:</span>
                                        <span className="copy-inline">
                                          <span>{niceCurrency(asset1.currency)}</span>
                                          {asset1?.issuer && (
                                            <>
                                              {' '}
                                              <span>
                                                ({addressUsernameOrServiceLink(asset1, 'issuer', { short: 6 })})
                                              </span>
                                              <Link
                                                href={`/token/${asset1.issuer}/${asset1.currency}`}
                                                className="inline-link-icon tooltip"
                                                onClick={(event) => event.stopPropagation()}
                                              >
                                                <LinkIcon />
                                                <span className="tooltiptext no-brake">Token page</span>
                                              </Link>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                      <div className="detail-row">
                                        <span>Asset 2:</span>
                                        <span className="copy-inline">
                                          <span>{niceCurrency(asset2?.currency)}</span>
                                          {asset2?.issuer && (
                                            <>
                                              {' '}
                                              <span>
                                                ({addressUsernameOrServiceLink(asset2, 'issuer', { short: 6 })})
                                              </span>
                                              <Link
                                                href={`/token/${asset2.issuer}/${asset2.currency}`}
                                                className="inline-link-icon tooltip"
                                                onClick={(event) => event.stopPropagation()}
                                              >
                                                <LinkIcon />
                                                <span className="tooltiptext no-brake">Token page</span>
                                              </Link>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </>
                              )
                            })()}
                          </>
                        ) : (
                          <>
                            <div className="detail-row">
                              <span>Currency:</span>
                              <span className="copy-inline">
                                <span>{token.Balance?.currency}</span>
                                <Link
                                  href={`/token/${issuer?.issuer}/${token.Balance?.currency}`}
                                  className="inline-link-icon tooltip"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <LinkIcon />
                                  <span className="tooltiptext no-brake">Token page</span>
                                </Link>
                                <span onClick={(event) => event.stopPropagation()}>
                                  <CopyButton text={token.Balance?.currency} />
                                </span>
                              </span>
                            </div>
                          </>
                        )}
                        {!isLpToken && (
                          <>
                            <div className="detail-row">
                              <span>Issuer:</span>
                              <span className="copy-inline">
                                <span className="address-text">{issuer?.issuer}</span>
                                <Link
                                  href={`/account/${issuer?.issuer}`}
                                  className="inline-link-icon tooltip"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <LinkIcon />
                                  <span className="tooltiptext no-brake">Issuer account page</span>
                                </Link>
                                <span onClick={(event) => event.stopPropagation()}>
                                  <CopyButton text={issuer?.issuer} />
                                </span>
                              </span>
                            </div>
                            {token.Balance?.issuerDetails?.username && (
                              <div className="detail-row">
                                <span>Service:</span>
                                <span>{token.Balance?.issuerDetails?.username}</span>
                              </div>
                            )}
                          </>
                        )}
                        {token.LockedBalance?.value && parseFloat(token.LockedBalance.value) > 0 && (
                          <div className="detail-row">
                            <span>Locked:</span>
                            <span>{fullNiceNumber(token.LockedBalance.value)}</span>
                          </div>
                        )}
                        {!isLpToken && token.HighLimit?.issuer === data?.address ? (
                          <>
                            <div className="detail-row">
                              <span>{isLoggedIn ? 'Your limit' : 'Limit'}:</span>
                              <span>
                                {fullNiceNumber(token.HighLimit?.value)}
                                {isLoggedIn && (
                                  <>
                                    {' '}
                                    <Link
                                      href={`/services/trustline?currency=${token.Balance?.currency}&currencyIssuer=${issuer?.issuer}&mode=advanced&limit=${token.HighLimit?.value}`}
                                      onClick={(event) => event.stopPropagation()}
                                      className="change-limit-link"
                                    >
                                      [change]
                                    </Link>
                                  </>
                                )}
                              </span>
                            </div>
                            {parseFloat(token.LowLimit?.value) !== 0 && (
                              <div className="detail-row">
                                <span>Counterparty limit:</span>
                                <span>{fullNiceNumber(token.LowLimit?.value)}</span>
                              </div>
                            )}
                          </>
                        ) : !isLpToken ? (
                          <>
                            <div className="detail-row">
                              <span>{isLoggedIn ? 'Your limit' : 'Limit'}:</span>
                              <span>
                                {fullNiceNumber(token.LowLimit?.value)}
                                {isLoggedIn && (
                                  <>
                                    {' '}
                                    <Link
                                      href={`/services/trustline?currency=${token.Balance?.currency}&currencyIssuer=${issuer?.issuer}&mode=advanced&limit=${token.LowLimit?.value}`}
                                      onClick={(event) => event.stopPropagation()}
                                      className="change-limit-link"
                                    >
                                      [change]
                                    </Link>
                                  </>
                                )}
                              </span>
                            </div>
                            {parseFloat(token.HighLimit?.value) !== 0 && (
                              <div className="detail-row">
                                <span>Counterparty limit:</span>
                                <span>{fullNiceNumber(token.HighLimit?.value)}</span>
                              </div>
                            )}
                          </>
                        ) : null}
                        {token.flags && (
                          <>
                            {(token.flags.lowFreeze || token.flags.highFreeze) && (
                              <div className="detail-row">
                                <span>Freeze:</span>
                                <span className="red">Yes</span>
                              </div>
                            )}
                            {(token.flags.lowNoRipple || token.flags.highNoRipple) && (
                              <div className="detail-row">
                                <span>No Rippling:</span>
                                <span className="green">Enabled</span>
                              </div>
                            )}
                            {(token.flags.lowAuth || token.flags.highAuth) && (
                              <div className="detail-row">
                                <span>Authorized:</span>
                                <span className="green">Yes</span>
                              </div>
                            )}
                            {(token.flags.lowDeepFreeze || token.flags.highDeepFreeze) && (
                              <div className="detail-row">
                                <span>Deep Freeze:</span>
                                <span className="red">Yes</span>
                              </div>
                            )}
                          </>
                        )}
                        {isLpToken && token.Balance?.currencyDetails?.asset && (
                          <div className="lp-actions">
                            <Link
                              href={`/services/amm/deposit?currency=${token.Balance?.currencyDetails?.asset?.currency}${
                                token.Balance?.currencyDetails?.asset?.issuer
                                  ? '&currencyIssuer=' + token.Balance.currencyDetails.asset.issuer
                                  : ''
                              }&currency2=${token.Balance?.currencyDetails?.asset2?.currency}${
                                token.Balance?.currencyDetails?.asset2?.issuer
                                  ? '&currency2Issuer=' + token.Balance.currencyDetails.asset2.issuer
                                  : ''
                              }`}
                              className="lp-action-btn"
                            >
                              Deposit
                            </Link>
                            <Link
                              href={`/services/amm/withdraw?currency=${token.Balance?.currencyDetails?.asset?.currency}${
                                token.Balance?.currencyDetails?.asset?.issuer
                                  ? '&currencyIssuer=' + token.Balance.currencyDetails.asset.issuer
                                  : ''
                              }&currency2=${token.Balance?.currencyDetails?.asset2?.currency}${
                                token.Balance?.currencyDetails?.asset2?.issuer
                                  ? '&currency2Issuer=' + token.Balance.currencyDetails.asset2.issuer
                                  : ''
                              }`}
                              className="lp-action-btn"
                            >
                              Withdraw
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {tokens.length > TOKEN_PREVIEW_LIMIT && (
                <button
                  type="button"
                  className="asset-compact-toggle"
                  onClick={() => {
                    setShowAllTokens((prev) => {
                      if (prev) {
                        setExpandedToken(null)
                      }
                      return !prev
                    })
                  }}
                >
                  {showAllTokens ? 'Show fewer tokens' : `Show all tokens (${hiddenTokensCount} more)`}
                </button>
              )}

              <div className="asset-item nft-summary-item">
                <div className="nft-header-row">
                  <div className="nft-title-wrap">
                    <span className="asset-summary-title">Owned NFTs</span>
                    <span className="nft-title-count">{ownedNftCount}</span>
                  </div>
                  {ownedNftCount > 0 && data?.address && (
                    <Link
                      className="section-link"
                      href={`/nfts/${data.address}?includeWithoutMediaData=true`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      View all
                    </Link>
                  )}
                </div>

                <div className="asset-details nft-details">
                  {ownedNftCount > 0 ? (
                    <div className="owned-nft-grid">
                      {ownedNftPreview.map((nft, nftIndex) => {
                        const nftId = nft?.nftokenID || nft?.NFTokenID
                        if (!nftId) return null

                        const fallbackTitle = `${nftId.slice(0, 6)}...${nftId.slice(-4)}`
                        const nftTitle = nftName(nft, { maxLength: 26 }) || fallbackTitle

                        return (
                          <Link
                            key={`${nftId}-${nftIndex}`}
                            href={`/nft/${nftId}`}
                            className="owned-nft-card"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <NftImage
                              nft={nft}
                              style={{ width: 44, height: 44, borderRadius: '6px', margin: '0 auto 6px' }}
                            />
                            <span className="owned-nft-name">{nftTitle}</span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="asset-fiat">No owned NFTs found.</div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleColumn>

          {/* Column 3: Transactions */}
          <CollapsibleColumn>
            <div className="transactions-section">
              <div className="section-header-row">
                <span className="section-title">Recent transactions</span>
                <div className="tx-header-actions">
                  <button
                    className={`tx-filter-toggle ${showTxFilters ? 'active' : ''}`}
                    onClick={() => setShowTxFilters((prev) => !prev)}
                    aria-label="Toggle transaction filters"
                    type="button"
                  >
                    <FaGear />
                  </button>
                  {data?.address && (
                    <Link className="section-link" href={`/account/${data.address}/transactions`}>
                      View all
                    </Link>
                  )}
                </div>
              </div>

              {showTxFilters && (
                <div className="tx-filters-panel">
                  <div className="tx-filter-grid">
                    <label className="tx-filter-field">
                      <span>Order</span>
                      <select value={txOrder} onChange={(event) => setTxOrder(event.target.value)}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
                    </label>

                    <label className="tx-filter-field">
                      <span>Type</span>
                      <select value={txType} onChange={(event) => setTxType(event.target.value)}>
                        <option value="all">All types</option>
                        <option value="payment">Payment</option>
                        <option value="nft">NFT</option>
                        <option value="amm">AMM</option>
                        <option value="order">DEX</option>
                        <option value="escrow">Escrow</option>
                        <option value="channel">Channel</option>
                        <option value="check">Check</option>
                        <option value="trustline">Trustline</option>
                        <option value="settings">Settings</option>
                        <option value="accountDelete">Account delete</option>
                      </select>
                    </label>

                    <label className="tx-filter-field">
                      <span>Direction</span>
                      <select value={txInitiated} onChange={(event) => setTxInitiated(event.target.value)}>
                        <option value="all">Incoming & outgoing</option>
                        <option value="true">Outgoing only</option>
                        <option value="false">Incoming only</option>
                      </select>
                    </label>

                    <label className="tx-filter-field">
                      <span>Failures</span>
                      <select value={txExcludeFailures} onChange={(event) => setTxExcludeFailures(event.target.value)}>
                        <option value="all">Include failed</option>
                        <option value="true">Exclude failed</option>
                      </select>
                    </label>

                    <label className="tx-filter-field tx-filter-field-wide">
                      <span>Counterparty</span>
                      <input
                        type="text"
                        value={txCounterparty}
                        onChange={(event) => setTxCounterparty(event.target.value)}
                        placeholder="Address"
                      />
                    </label>

                    <label className="tx-filter-field">
                      <span>From</span>
                      <input
                        type="datetime-local"
                        value={txFromDate}
                        onChange={(event) => setTxFromDate(event.target.value)}
                      />
                    </label>

                    <label className="tx-filter-field">
                      <span>To</span>
                      <input
                        type="datetime-local"
                        value={txToDate}
                        onChange={(event) => setTxToDate(event.target.value)}
                      />
                    </label>
                  </div>

                  <label className="tx-filter-check">
                    <input
                      type="checkbox"
                      checked={txFilterSpam}
                      onChange={(event) => setTxFilterSpam(event.target.checked)}
                    />
                    <span>Exclude spam transactions</span>
                  </label>

                  <div className="tx-filter-actions">
                    <button className="tx-filter-btn" type="button" onClick={resetTransactionFilters}>
                      Reset
                    </button>
                    <button className="tx-filter-btn primary" type="button" onClick={applyTransactionFilters}>
                      Search
                    </button>
                  </div>
                </div>
              )}

              {transactionsLoading && <p className="grey">Loading recent transactions...</p>}
              {!transactionsLoading && transactionsError && <p className="red">{transactionsError}</p>}

              {!transactionsLoading && !transactionsError && recentTransactions.length === 0 && (
                <p className="grey">No recent transactions found.</p>
              )}

              {!transactionsLoading &&
                !transactionsError &&
                recentTransactions.map((txdata, index) => {
                  const tx = txdata?.tx
                  const outcome = txdata?.outcome
                  const isSuccessful = outcome?.result === 'tesSUCCESS'
                  const txHash = tx?.hash
                  const shortHash = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-6)}` : '-'

                  const changes = addressBalanceChanges(txdata, data?.address) || []
                  const firstChange = changes?.[0]
                  const remainingChangesCount = changes.length > 1 ? changes.length - 1 : 0

                  const sourceAddress = txdata?.specification?.source?.address
                  const destinationAddress = txdata?.specification?.destination?.address
                  const isSource = sourceAddress === data?.address
                  const counterparty = isSource ? destinationAddress : sourceAddress
                  const counterpartyDetails = isSource
                    ? txdata?.specification?.destinationDetails || txdata?.specification?.destination?.addressDetails
                    : txdata?.specification?.sourceDetails || txdata?.specification?.source?.addressDetails
                  const counterpartyLabel = serviceUsernameOrAddressText({
                    address: counterparty,
                    addressDetails: counterpartyDetails
                  })

                  return (
                    <div className="tx-card" key={txHash || `${tx?.TransactionType || 'tx'}-${index}`}>
                      <div className="tx-card-top">
                        <span className={`tx-status ${isSuccessful ? 'green' : 'red'}`}>
                          {isSuccessful ? 'Success' : outcome?.result || 'Failed'}
                        </span>
                        <span className="tx-type">{tx?.TransactionType || '-'}</span>
                      </div>

                      <div className="tx-card-meta">
                        <span className="tx-time">{tx?.date ? timeFromNow(tx.date, i18n, 'ripple') : '-'}</span>
                        {tx?.date && <span className="grey">{fullDateAndTime(tx.date, 'ripple')}</span>}
                      </div>

                      {counterparty && (
                        <div className="tx-line">
                          <span className="tx-label">Counterparty</span>
                          <Link href={`/account/${counterparty}`} className="tx-value tx-link">
                            {counterpartyLabel}
                          </Link>
                        </div>
                      )}

                      <div className="tx-line">
                        <span className="tx-label">Change</span>
                        <span className="tx-value">
                          {firstChange ? (
                            <>
                              <span
                                className={
                                  Number(firstChange.value) > 0 ? 'green' : Number(firstChange.value) < 0 ? 'red' : ''
                                }
                              >
                                {amountFormat(firstChange, {
                                  short: true,
                                  maxFractionDigits: 2,
                                  showPlus: true
                                })}
                              </span>
                              {remainingChangesCount > 0 && (
                                <span className="grey"> +{remainingChangesCount} more</span>
                              )}
                            </>
                          ) : (
                            '-'
                          )}
                        </span>
                      </div>

                      <div className="tx-line">
                        <span className="tx-label">Hash</span>
                        <Link href={`/transaction/${txHash}`} className="tx-value tx-link">
                          {shortHash}
                        </Link>
                      </div>
                    </div>
                  )
                })}

              {!transactionsLoading && !transactionsError && transactionsMarker && (
                <button className="tx-load-more" onClick={loadMoreTransactions} disabled={transactionsLoadingMore}>
                  {transactionsLoadingMore ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          </CollapsibleColumn>

          {/* Column 4: Issued Tokens */}
          <CollapsibleColumn>
            <div className="orders-section">
              <div className="section-header-row">
                <span className="section-title">Issued tokens</span>
                {data?.address && (
                  <Link className="section-link" href={`/tokens?issuer=${data.address}`}>
                    View all
                  </Link>
                )}
              </div>

              {issuedTokensLoading && <p className="grey">Loading issued tokens...</p>}
              {!issuedTokensLoading && issuedTokensError && <p className="red">{issuedTokensError}</p>}
              {!issuedTokensLoading && !issuedTokensError && issuedTokens.length === 0 && (
                <p className="grey">No issued tokens found.</p>
              )}

              {!issuedTokensLoading &&
                !issuedTokensError &&
                issuedTokens.map((token, index) => {
                  const tokenStats = token.statistics || {}
                  const tokenSupply = Number(token.supply || 0)
                  const tokenPriceNative = Number(tokenStats.priceNativeCurrency || 0)
                  const tokenPriceFiat = tokenPriceNative * (pageFiatRate || 0)
                  const tokenMarketcap = Number(tokenStats.marketcap || 0)
                  const tokenMarketcapFiat = tokenMarketcap * (pageFiatRate || 0)
                  const tokenVolume24h = Number(tokenStats.buyVolume || 0) + Number(tokenStats.sellVolume || 0)
                  const tokenVolume24hFiat = tokenVolume24h * tokenPriceNative * (pageFiatRate || 0)
                  const tokenKey = `${token.currency || 'token'}-${index}`
                  const isExpanded = expandedIssuedToken === tokenKey

                  return (
                    <div
                      key={tokenKey}
                      className="asset-item token-asset-item"
                      onClick={() => setExpandedIssuedToken(isExpanded ? null : tokenKey)}
                    >
                      <div className="asset-main">
                        <div className="asset-logo">
                          <CurrencyWithIcon token={token} options={{ disableTokenLink: true }} />
                        </div>
                        <div className="asset-value">
                          <div className="asset-amount" suppressHydrationWarning>
                            {tokenMarketcapFiat > 0
                              ? shortNiceNumber(tokenMarketcapFiat, 2, 1, selectedCurrency)
                              : shortNiceNumber(tokenMarketcap, 2, 1)}
                          </div>
                          <div className="asset-fiat">Supply: {shortNiceNumber(tokenSupply)}</div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="asset-details">
                          <div className="detail-row">
                            <span>Currency:</span>
                            <span className="copy-inline">
                              <span>{token.currency}</span>
                              <Link
                                href={`/token/${data.address}/${token.currency}`}
                                className="inline-link-icon tooltip"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <LinkIcon />
                                <span className="tooltiptext no-brake">Token page</span>
                              </Link>
                              <span onClick={(event) => event.stopPropagation()}>
                                <CopyButton text={token.currency} />
                              </span>
                            </span>
                          </div>

                          <div className="detail-row">
                            <span>Price ({nativeCurrency}):</span>
                            <span>
                              {shortNiceNumber(tokenPriceNative, 2, 1)} {nativeCurrency}
                            </span>
                          </div>

                          <div className="detail-row">
                            <span>Price ({selectedCurrency?.toUpperCase()}):</span>
                            <span suppressHydrationWarning>
                              {tokenPriceFiat > 0
                                ? shortNiceNumber(tokenPriceFiat, 2, 1, selectedCurrency)
                                : shortNiceNumber(0, 2, 1, selectedCurrency)}
                            </span>
                          </div>

                          <div className="detail-row">
                            <span>Marketcap:</span>
                            <span suppressHydrationWarning>
                              {tokenMarketcapFiat > 0
                                ? shortNiceNumber(tokenMarketcapFiat, 2, 1, selectedCurrency)
                                : shortNiceNumber(tokenMarketcap, 2, 1)}
                            </span>
                          </div>

                          <div className="detail-row">
                            <span>Supply:</span>
                            <span>{fullNiceNumber(tokenSupply)}</span>
                          </div>

                          <div className="detail-row">
                            <span>Holders:</span>
                            <span>{fullNiceNumber(token.holders || 0)}</span>
                          </div>

                          <div className="detail-row">
                            <span>Trustlines:</span>
                            <span>{fullNiceNumber(token.trustlines || 0)}</span>
                          </div>

                          <div className="detail-row">
                            <span>Volume (24h):</span>
                            <span suppressHydrationWarning>
                              {tokenVolume24hFiat > 0
                                ? shortNiceNumber(tokenVolume24hFiat, 2, 1, selectedCurrency)
                                : shortNiceNumber(tokenVolume24h, 2, 1)}
                            </span>
                          </div>

                          <div className="detail-row">
                            <span>Volume (24h) token:</span>
                            <span>
                              {shortNiceNumber(tokenVolume24h, 2, 1)} {niceCurrency(token.currency)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

              <div className="time-machine-card issuer-settings-card">
                <button
                  type="button"
                  className={`time-machine-toggle ${showIssuerSettingsDetails ? 'active' : ''}`}
                  onClick={() => setShowIssuerSettingsDetails((prev) => !prev)}
                >
                  Issuer settings
                </button>

                {showIssuerSettingsDetails && (
                  <div className="time-machine-panel issuer-settings-panel">
                    <div className="detail-row issuer-detail-row">
                      <span>Rippling:</span>
                      <span className={isRipplingEnabled ? 'green' : 'grey'}>
                        {isRipplingEnabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>Transfer fee:</span>
                      <span>{issuerTransferFeeText}</span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>Escrow:</span>
                      <span className={isCanEscrowEnabled ? 'green' : 'grey'}>
                        {isCanEscrowEnabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>

                    <div className="lp-actions issuer-settings-actions">
                      <Link href="/services/account-settings" className="lp-action-btn">
                        Change settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleColumn>
        </div>
      </div>

      <style jsx>{`
        .account2-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
        }

        .historical-banner {
          margin-bottom: 14px;
          padding: 10px 12px;
          border: 1px solid color-mix(in srgb, var(--red) 50%, var(--border-color));
          background: color-mix(in srgb, var(--red) 10%, var(--background-input));
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .historical-badge {
          font-size: 12px;
          font-weight: 700;
          color: var(--red);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .historical-date {
          font-size: 13px;
          color: var(--text);
        }

        .account2-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .public-data {
          margin-top: 15px;
        }

        .info-rows {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .info-row {
          background: var(--background-input);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .info-row .label {
          color: var(--text-secondary, #7a7a7a);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .info-row .value {
          font-size: 14px;
          color: var(--text);
          word-break: break-word;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .account-username {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .social-icons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 16px;
        }

        .social-icons a {
          color: var(--accent-link);
        }

        @media (max-width: 1400px) {
          .account2-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .account2-grid {
            grid-template-columns: 1fr;
          }
        }

        .collapsible-column {
          background: var(--background-table);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: visible;
          transition: box-shadow 0.2s ease-out;
        }

        .collapsible-column:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .column-content {
          padding: 20px;
        }

        .info-section,
        .assets-section,
        .transactions-section,
        .orders-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }

        .tx-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .tx-filter-toggle {
          width: 30px;
          height: 30px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-input);
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .tx-filter-toggle:hover,
        .tx-filter-toggle.active {
          color: var(--accent-link);
          border-color: var(--accent-link);
        }

        .tx-filters-panel {
          background: var(--background-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tx-filter-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .tx-filter-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tx-filter-field > span {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .tx-filter-field select,
        .tx-filter-field input {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          padding: 7px 8px;
        }

        .tx-filter-field-wide {
          grid-column: 1 / -1;
        }

        .tx-filter-check {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .tx-filter-check input[type='checkbox'] {
          appearance: auto;
          -webkit-appearance: checkbox;
          width: 16px;
          height: 16px;
          margin: 0;
          accent-color: var(--accent-link);
          border: 1px solid var(--border-color);
          border-radius: 3px;
          background: var(--background-table);
          flex: 0 0 auto;
        }

        .tx-filter-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .tx-filter-btn {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          padding: 7px 10px;
          cursor: pointer;
        }

        .tx-filter-btn.primary {
          border-color: var(--accent-link);
          color: var(--accent-link);
        }

        .section-link {
          font-size: 13px;
          color: var(--accent-link);
          text-decoration: none;
          white-space: nowrap;
        }

        .section-link:hover {
          text-decoration: underline;
        }

        .tx-card {
          background: var(--background-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tx-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .tx-status {
          font-size: 12px;
          font-weight: 600;
        }

        .tx-type {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .tx-card-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }

        .tx-time {
          color: var(--text);
          font-weight: 500;
        }

        .tx-line {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
          font-size: 13px;
        }

        .tx-label {
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .tx-value {
          color: var(--text);
          text-align: right;
          word-break: break-all;
        }

        .tx-link {
          color: var(--accent-link);
          text-decoration: none;
        }

        .tx-link:hover {
          text-decoration: underline;
        }

        .tx-load-more {
          margin-top: 4px;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--background-input);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .tx-load-more:hover:not(:disabled) {
          opacity: 0.85;
        }

        .tx-load-more:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .avatar-container {
          display: flex;
          justify-content: center;
          padding-top: 24px;
          margin-bottom: 8px;
        }

        .avatar-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 150px;
          height: 150px;
          overflow: visible;
        }

        .avatar-image-mask {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid var(--accent-link);
        }

        .account-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transform: scale(1.12);
          transform-origin: center;
        }

        .achievements-orbit {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .achievements-orbit .achievement-badge {
          pointer-events: auto;
        }

        .achievement-badge {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: transparent;
          border: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .achievement-badge:hover {
          z-index: 20;
        }

        .achievement-badge :global(.tooltiptext) {
          z-index: 30;
        }

        .achievement-badge :global(.tooltiptext.right) {
          right: unset !important;
          left: 90% !important;
          top: 50% !important;
          transform: translateY(-50%);
        }

        .achievement-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .achievement-badge-1 {
          top: 0;
          left: 0;
          transform: translate(-50%, -36%);
        }

        .achievement-badge-2 {
          top: 0;
          right: 0;
          transform: translate(50%, -36%);
        }

        .achievement-badge-3 {
          top: 50%;
          right: 0;
          transform: translate(58%, -50%);
        }

        .achievement-badge-4 {
          bottom: 0;
          right: 0;
          transform: translate(46%, 40%);
        }

        .achievement-badge-5 {
          bottom: 0;
          left: 0;
          transform: translate(-46%, 40%);
        }

        .achievement-badge-6 {
          top: 50%;
          left: 0;
          transform: translate(-58%, -50%);
        }

        .account-info {
          text-align: center;
          margin-top: 0;
        }

        .account-name {
          margin: 0 0 6px 0;
          font-size: 20px;
        }

        .account-address {
          margin-bottom: 4px;
          word-break: break-all;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .account-qr-toggle {
          margin-bottom: -3px;
          border: 0;
          background: none;
          color: #00b1c1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: 0 0 auto;
          padding: 0;
          outline: none;
        }

        .account-qr-toggle:hover,
        .account-qr-toggle.active {
          color: #00b1c1;
          opacity: 0.85;
        }

        .account-qr-toggle :global(svg) {
          width: 20px;
          height: 20px;
        }

        .account-qr-panel {
          margin: 6px auto 0;
          width: fit-content;
          padding: 10px;
          border-radius: 8px;
          background: var(--background-input);
          border: 1px solid var(--border-color);
        }

        .account-address-text {
          color: var(--text);
          font-size: 14px;
        }

        .account-address a {
          color: var(--accent-link);
          text-decoration: none;
        }

        .account-address a:hover {
          text-decoration: underline;
        }

        .account-domain {
          font-size: 14px;
          margin-top: 5px;
        }

        .account-domain a {
          color: var(--text-main);
          text-decoration: none;
        }

        .account-domain a:hover {
          text-decoration: underline;
        }

        .activated-line {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .activated-by {
          color: var(--accent-link);
        }

        .activated-amount {
          font-weight: 600;
        }

        .xaman-card-data {
          display: block;
          width: 100%;
          line-height: 1.45;
        }

        .xaman-data-line {
          display: inline;
        }

        .xaman-data-label {
          white-space: nowrap;
          margin-right: 4px;
        }

        .xaman-data-value {
          min-width: 0;
          word-break: break-word;
        }

        :global(.tooltiptext.right) {
          left: 106% !important;
          right: unset !important;
        }

        .did-section {
          margin-top: 8px;
        }

        .time-machine-card {
          margin-top: 2px;
          background: transparent;
          border: 0;
          border-radius: 0;
          padding: 0;
        }

        .time-machine-toggle {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-input);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 10px;
          cursor: pointer;
          text-align: center;
          transition: all 0.16s ease;
        }

        .time-machine-toggle.active,
        .time-machine-toggle:hover {
          border-color: var(--accent-link);
          color: var(--accent-link);
        }

        .time-machine-panel {
          margin-top: 8px;
          background: var(--background-input);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .time-machine-head {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .time-machine-title {
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
        }

        .time-machine-picker-wrap {
          display: flex;
          width: 100%;
        }

        .time-machine-picker-wrap :global(.react-datepicker-wrapper),
        .time-machine-picker-wrap :global(.react-datepicker__input-container) {
          width: 100%;
        }

        .time-machine-picker-wrap :global(.dateAndTimeRange),
        .time-machine-picker-wrap :global(.time-machine-input) {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          padding: 8px 10px;
          outline: none;
          box-sizing: border-box;
        }

        .time-machine-picker-wrap :global(.time-machine-input:focus) {
          border-color: var(--accent-link);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-link) 22%, transparent);
        }

        .time-machine-picker-wrap :global(.time-machine-calendar) {
          border-color: var(--border-color);
          border-radius: 10px;
          overflow: hidden;
        }

        .time-machine-actions {
          display: flex;
          gap: 6px;
          justify-content: stretch;
          margin-top: 0;
        }

        .time-machine-btn {
          flex: 1;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 10px;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        .time-machine-btn:hover {
          border-color: var(--accent-link);
        }

        .time-machine-btn-update {
          background: var(--accent-link);
          color: #fff;
          border-color: var(--accent-link);
        }

        .time-machine-btn-update:hover {
          opacity: 0.9;
        }

        .time-machine-btn-reset {
          color: var(--text-secondary);
        }

        @media (max-width: 560px) {
          .time-machine-actions {
            flex-direction: column;
          }
        }

        .social-icons-wrapper {
          margin: 10px 0 5px 0;
          display: flex;
          justify-content: center;
        }

        .social-icons-wrapper :global(.social-icons) {
          display: flex;
          gap: 15px;
          align-items: center;
          background: none;
          padding: 0;
        }

        .social-icons-wrapper :global(.social-icons a) {
          color: var(--text-secondary);
          font-size: 22px;
          transition: all 0.2s ease;
          background: none;
          display: flex;
          align-items: center;
          padding: 0;
          cursor: pointer;
        }

        .social-icons-wrapper :global(.social-icons a:hover) {
          color: var(--accent-link);
          transform: scale(1.15);
        }

        .asset-item {
          background: var(--background-input);
          border-radius: 6px;
          padding: 12px 15px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .token-asset-item {
          padding: 8px 12px;
        }

        .token-asset-item .asset-amount {
          font-size: 14px;
        }

        .token-asset-item .asset-fiat {
          font-size: 12px;
        }

        .asset-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .asset-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          -webkit-user-select: none;
          user-select: none;
        }

        .asset-logo {
          flex: 1;
        }

        .asset-logo :global(img) {
          border-radius: 50%;
          object-fit: cover;
        }

        .asset-value {
          text-align: right;
        }

        .asset-summary-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }

        .asset-amount {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }

        .asset-fiat {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .issuer-settings-card {
          margin-top: 0;
        }

        .issuer-settings-panel {
          gap: 2px;
        }

        .issuer-settings-actions {
          margin-top: 8px;
        }

        .issuer-detail-row {
          justify-content: flex-start;
          gap: 8px;
        }

        .issuer-detail-row > span:last-child {
          max-width: none;
          text-align: left;
          word-break: normal;
        }

        .asset-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        .asset-compact-toggle {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-input);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 10px;
          cursor: pointer;
          text-align: center;
        }

        .asset-compact-toggle:hover {
          color: var(--accent-link);
          border-color: var(--accent-link);
        }

        .nft-summary-item {
          cursor: default;
        }

        .nft-summary-item:hover {
          transform: none;
        }

        .nft-details {
          margin-top: 10px;
          padding-top: 10px;
        }

        .nft-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .nft-title-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .nft-title-count {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .owned-nft-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .owned-nft-card {
          background: var(--background-table);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 6px;
          text-decoration: none;
          color: var(--text);
          text-align: center;
          min-width: 0;
        }

        .owned-nft-card:hover {
          border-color: var(--accent-link);
        }

        .owned-nft-name {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 560px) {
          .owned-nft-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
        }

        .detail-row > span:first-child {
          color: var(--text-secondary);
        }

        .detail-row > span:last-child {
          color: var(--text-secondary);
          word-break: break-all;
          max-width: 60%;
          text-align: right;
        }

        .amount-with-fiat {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          word-break: normal !important;
        }

        .amount-with-fiat .fiat-line {
          white-space: nowrap;
          word-break: normal;
        }

        .copy-inline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
        }

        .address-text {
          font-family: monospace;
          font-size: 12px;
        }

        .change-limit-link {
          color: var(--accent-link);
          text-decoration: none;
          font-size: 13px;
          padding: 0 2px;
        }

        .change-limit-link:hover {
          text-decoration: underline;
        }

        .inline-link-icon {
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }

        .lp-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .lp-action-btn {
          flex: 1;
          padding: 8px 12px;
          background: var(--accent-link);
          color: white;
          text-align: center;
          border-radius: 6px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .lp-action-btn:hover {
          opacity: 0.85;
        }

        .pending-note {
          padding: 15px;
          background: var(--background-input);
          border-radius: 6px;
          text-align: center;
        }

        .pending-note p {
          margin: 0;
        }
      `}</style>
    </>
  )
}
