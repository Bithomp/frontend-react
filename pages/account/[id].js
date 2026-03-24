import { useTranslation } from 'next-i18next'
import { useState, useEffect, useMemo, useRef } from 'react'
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
  decode,
  devNet,
  errorT,
  getCoinsUrl,
  isUrlValid,
  nativeCurrency,
  network,
  networks,
  isValidPayString,
  isValidXAddress,
  isTagValid,
  isDomainValid,
  stripDomain,
  timestampExpired,
  xahauNetwork
} from '../../utils'
import { TESTNET_RLUSD_CURRENCY, TESTNET_RLUSD_ISSUER } from '../../utils/faucet'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
import { xAddressToClassicAddress } from 'ripple-address-codec'

const TOKEN_PREVIEW_LIMIT = 5
const NFT_INITIAL_LIMIT = 5
const NFT_LOAD_MORE_STEP = 10
const NFT_FETCH_LIMIT = 45
const NFT_OFFERS_PREVIEW_LIMIT = 5
const NFT_OFFERS_FETCH_LIMIT = 50
const ACTIVATED_ACCOUNTS_FETCH_LIMIT = 20
const OBJECT_PREVIEW_LIMIT = 5
const OBJECT_LOAD_MORE_STEP = 5

const isPositiveBalance = (balance) => balance !== '0' && balance?.[0] !== '-'

const isNegativeBalance = (balance) => balance !== '0' && balance?.[0] === '-'

const isRelevantRippleStateForAddress = (node, address) => {
  if (node?.LedgerEntryType !== 'RippleState') return false

  if (node?.HighLimit?.issuer === address) {
    if (node.Flags & 131072) {
      if (isPositiveBalance(node?.Balance?.value)) return false
      return true
    }
    if (isNegativeBalance(node?.Balance?.value)) return true
  } else {
    if (node.Flags & 65536) {
      if (isNegativeBalance(node?.Balance?.value)) return false
      return true
    }
    if (isPositiveBalance(node?.Balance?.value)) return true
  }

  return false
}

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
import AccountWithTag from '../../components/Account/AccountWithTag'
import InfiniteScrolling from '../../components/Layout/InfiniteScrolling'
import { fetchHistoricalRate } from '../../utils/common'
import CopyButton from '../../components/UI/CopyButton'
import { CurrencyWithIcon } from '../../utils/format'
import { NftImage, nftName } from '../../utils/nft'
import {
  AddressWithIcon,
  AddressWithIconInline,
  amountFormat,
  codeHighlight,
  convertedAmount,
  fullDateAndTime,
  fullNiceNumber,
  tokenToFiat,
  niceNumber,
  niceCurrency,
  shortHash,
  shortNiceNumber,
  serviceUsernameOrAddressText,
  timeFromNow,
  transferRateToPercent,
  userOrServiceName
} from '../../utils/format'
import { scaleAmount, subtract } from '../../utils/calc'
import {
  addressBalanceChanges,
  dappBySourceTag,
  errorCodeDescription,
  getAccountTransactionTypeIcon,
  getTransactionTypeLabel,
  memoNode,
  shortErrorCode
} from '../../utils/transaction'
import { isRipplingOnIssuer } from '../../utils/transaction/payment'
import {
  FaArrowsRotate,
  FaFacebook,
  FaPencil,
  FaGear,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaTelegram,
  FaWallet,
  FaYoutube,
  FaXTwitter
} from 'react-icons/fa6'
import { MdDeleteForever, MdMoneyOff, MdNorth, MdQrCode2, MdSouth, MdVerified } from 'react-icons/md'
import { TbPigMoney } from 'react-icons/tb'
import { useQRCode } from 'next-qrcode'

const hookNames = {
  '805351CE26FB79DA00647CEFED502F7E15C2ACCCE254F11DEFEDDCE241F8E9CA': 'Claim Rewards'
}

const hookNameText = (hookHash) => {
  if (!hookHash) return '-'
  return hookNames[hookHash] || shortHash(hookHash, 16)
}

const mptId = (node) => node?.MPTokenIssuanceID || node?.mpt_issuance_id || null

export default function Account({
  initialData,
  initialErrorMessage,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  fiatRate: fiatRateApp,
  fiatRateServer,
  balanceListServer,
  setSignRequest,
  isHistoricalLedger,
  ledgerTimestampQuery,
  accountWithTag,
  account,
  refreshPage
}) {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { Canvas } = useQRCode()
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)
  const [showTotalWorthDetails, setShowTotalWorthDetails] = useState(false)
  const [showAddressQr, setShowAddressQr] = useState(false)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [showAirdropsDetails, setShowAirdropsDetails] = useState(false)
  const [showAllTokens, setShowAllTokens] = useState(false)
  const [tokenTab, setTokenTab] = useState('all')
  const [tokenDisplayLimit, setTokenDisplayLimit] = useState(TOKEN_PREVIEW_LIMIT)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(
    ledgerTimestampQuery ? new Date(ledgerTimestampQuery) : new Date()
  )
  const [tokens, setTokens] = useState([])
  const [issuedTokens, setIssuedTokens] = useState([])
  const [issuedTokensLoading, setIssuedTokensLoading] = useState(false)
  const [issuedTokensError, setIssuedTokensError] = useState(null)
  const [objectsLoading, setObjectsLoading] = useState(false)
  const [objectsError, setObjectsError] = useState(null)
  const [ownedNfts, setOwnedNfts] = useState([])
  const [soldNfts, setSoldNfts] = useState([])
  const [soldNftsTotalCount, setSoldNftsTotalCount] = useState(null)
  const [soldNftsLoading, setSoldNftsLoading] = useState(false)
  const [mintedNfts, setMintedNfts] = useState([])
  const [burnedNfts, setBurnedNfts] = useState([])
  const [mintedNftsLoading, setMintedNftsLoading] = useState(false)
  const [burnedNftsLoading, setBurnedNftsLoading] = useState(false)
  const [ownedNftIds, setOwnedNftIds] = useState([])
  const [nftMarkers, setNftMarkers] = useState({ owned: null, minted: null, burned: null, sold: null })
  const [nftLoadingMore, setNftLoadingMore] = useState(false)
  const [nftDisplayLimit, setNftDisplayLimit] = useState(NFT_INITIAL_LIMIT)
  const [nftOffersDisplayLimit, setNftOffersDisplayLimit] = useState(NFT_OFFERS_PREVIEW_LIMIT)
  const [expandedNftCardKey, setExpandedNftCardKey] = useState(null)
  const [expandedNftOfferKey, setExpandedNftOfferKey] = useState(null)
  const [nftTab, setNftTab] = useState('owned')
  const [nftOffersTab, setNftOffersTab] = useState('received')
  const [createdNftOffers, setCreatedNftOffers] = useState([])
  const [receivedPrivateNftOffers, setReceivedPrivateNftOffers] = useState([])
  const [ownedNftOffers, setOwnedNftOffers] = useState([])
  const [nftOffersLoading, setNftOffersLoading] = useState({
    received: false,
    created: false,
    owned: false
  })
  const [nftOffersError, setNftOffersError] = useState({
    received: null,
    created: null,
    owned: null
  })
  const [showNftDataDetails, setShowNftDataDetails] = useState(false)
  const [expandedToken, setExpandedToken] = useState(null)
  const [expandedIssuedToken, setExpandedIssuedToken] = useState(null)
  const [showIssuerSettingsDetails, setShowIssuerSettingsDetails] = useState(false)
  const [receivedChecks, setReceivedChecks] = useState([])
  const [sentChecks, setSentChecks] = useState([])
  const [receivedEscrows, setReceivedEscrows] = useState([])
  const [sentEscrows, setSentEscrows] = useState([])
  const [selfEscrows, setSelfEscrows] = useState([])
  const [incomingPaychannels, setIncomingPaychannels] = useState([])
  const [outgoingPaychannels, setOutgoingPaychannels] = useState([])
  const [dexOrders, setDexOrders] = useState([])
  const [depositPreauthAccounts, setDepositPreauthAccounts] = useState([])
  const [hookList, setHookList] = useState([])
  const [heldMpts, setHeldMpts] = useState([])
  const [issuedMpts, setIssuedMpts] = useState([])
  const [checksTab, setChecksTab] = useState('received')
  const [escrowsTab, setEscrowsTab] = useState('received')
  const [paychannelsTab, setPaychannelsTab] = useState('incoming')
  const [dexOrdersDisplayLimit, setDexOrdersDisplayLimit] = useState(OBJECT_PREVIEW_LIMIT)
  const [checksDisplayLimit, setChecksDisplayLimit] = useState(OBJECT_PREVIEW_LIMIT)
  const [escrowsDisplayLimit, setEscrowsDisplayLimit] = useState(OBJECT_PREVIEW_LIMIT)
  const [paychannelsDisplayLimit, setPaychannelsDisplayLimit] = useState(OBJECT_PREVIEW_LIMIT)
  const [expandedActivatedKey, setExpandedActivatedKey] = useState(null)
  const [expandedCheckKey, setExpandedCheckKey] = useState(null)
  const [expandedEscrowKey, setExpandedEscrowKey] = useState(null)
  const [expandedPaychannelKey, setExpandedPaychannelKey] = useState(null)
  const [expandedDexOrderKey, setExpandedDexOrderKey] = useState(null)
  const [showTxSettingsDetails, setShowTxSettingsDetails] = useState(false)
  const [showAccountControlDetails, setShowAccountControlDetails] = useState(false)
  const [showDepositPreauthDetails, setShowDepositPreauthDetails] = useState(false)
  const [showXahauRewardDetails, setShowXahauRewardDetails] = useState(false)
  const [showHooksDetails, setShowHooksDetails] = useState(false)
  const [showCronDetails, setShowCronDetails] = useState(false)
  const [expandedDidCard, setExpandedDidCard] = useState(false)
  const [expandedHeldMptKey, setExpandedHeldMptKey] = useState(null)
  const [expandedIssuedMptKey, setExpandedIssuedMptKey] = useState(null)
  const [expandedTransactionKey, setExpandedTransactionKey] = useState(null)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsLoadingMore, setTransactionsLoadingMore] = useState(false)
  const [transactionsError, setTransactionsError] = useState(null)
  const [transactionsMarker, setTransactionsMarker] = useState(null)
  const [transactionsSearchPaused, setTransactionsSearchPaused] = useState(false)
  const [showTxFilters, setShowTxFilters] = useState(false)
  const [txOrder, setTxOrder] = useState('newest')
  const [txType, setTxType] = useState('all')
  const [txInitiated, setTxInitiated] = useState('all')
  const [txExcludeFailures, setTxExcludeFailures] = useState('all')
  const [txCounterparty, setTxCounterparty] = useState('')
  const [txFromDate, setTxFromDate] = useState('')
  const [txToDate, setTxToDate] = useState('')
  const [txFilterSpam, setTxFilterSpam] = useState(true)
  const [activatedAccounts, setActivatedAccounts] = useState([])
  const [activatedAccountsCount, setActivatedAccountsCount] = useState(0)
  const [activatedAccountsSpent, setActivatedAccountsSpent] = useState(0)
  const [activatedAccountsLoading, setActivatedAccountsLoading] = useState(false)
  const [activatedAccountsLoadingMore, setActivatedAccountsLoadingMore] = useState(false)
  const [activatedAccountsError, setActivatedAccountsError] = useState(null)
  const [activatedAccountsMarker, setActivatedAccountsMarker] = useState(null)
  const [showActivatedAccountsFilters, setShowActivatedAccountsFilters] = useState(false)
  const [activatedAccountsOrder, setActivatedAccountsOrder] = useState('desc')
  const [activatedAccountsReloadKey, setActivatedAccountsReloadKey] = useState(0)
  const nftOffersRequestTokenRef = useRef(0)
  const transactionsRequestTokenRef = useRef(0)
  const activatedAccountsRequestTokenRef = useRef(0)
  const refreshPageRef = useRef(refreshPage)
  const [tokenFiatRate, setTokenFiatRate] = useState(!ledgerTimestampQuery ? fiatRateServer || fiatRateApp || null : 0)
  const [pageFiatRate, setPageFiatRate] = useState(!ledgerTimestampQuery ? fiatRateServer || fiatRateApp || null : 0)

  const resetAccountObjectCollections = () => {
    setTokens([])
    setOwnedNfts([])
    setSoldNfts([])
    setSoldNftsTotalCount(null)
    setMintedNfts([])
    setBurnedNfts([])
    setOwnedNftIds([])
    setReceivedChecks([])
    setSentChecks([])
    setSelfEscrows([])
    setReceivedEscrows([])
    setSentEscrows([])
    setIncomingPaychannels([])
    setOutgoingPaychannels([])
    setDexOrders([])
    setDepositPreauthAccounts([])
    setHookList([])
    setHeldMpts([])
    setIssuedMpts([])
  }

  const parseSoldNftsPayload = (payload, limit = null) => {
    const sales = Array.isArray(payload?.sales) ? payload.sales : []
    const soldList = typeof limit === 'number' ? sales.slice(0, limit) : sales

    const soldTotal = Number(payload?.total?.primary || 0) + Number(payload?.total?.secondary || 0)
    const soldTotalCount =
      payload && typeof payload.total === 'object' && payload.total !== null && Number.isFinite(soldTotal)
        ? Math.max(soldTotal, 0)
        : null

    return { soldList, soldTotalCount }
  }

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
    return `${value} ${unit.key}${value === 1 ? '' : 's'} before`
  }

  const balanceList = balanceListServer
  const nativeAvailableDrops = Number(balanceList?.available?.native || 0)
  const nativeTotalDrops = Number(balanceList?.total?.native || 0)
  const nativeReservedDrops = Number(balanceList?.reserved?.native || 0)
  const nativeAvailable = nativeAvailableDrops / 1000000
  const isLoggedIn = !!account?.address
  const isMobile = useIsMobile(768)
  const DESKTOP_TRANSACTIONS_PREVIEW_LIMIT = 20
  const MOBILE_TRANSACTIONS_PREVIEW_LIMIT = 10
  const TRANSACTIONS_PREVIEW_LIMIT = isMobile ? MOBILE_TRANSACTIONS_PREVIEW_LIMIT : DESKTOP_TRANSACTIONS_PREVIEW_LIMIT
  const TRANSACTIONS_LOAD_MORE_LIMIT = 10
  const issuerTransferFeeText = data?.ledgerInfo?.transferRate
    ? transferRateToPercent(data.ledgerInfo.transferRate)
    : '0%'
  const isRipplingEnabled = !!data?.ledgerInfo?.flags?.defaultRipple
  const isCanEscrowEnabled = !!data?.ledgerInfo?.flags?.allowTrustLineLocking
  const isTrustlineClawbackEnabled = !!data?.ledgerInfo?.flags?.allowTrustLineClawback
  const isGlobalFreezeEnabled = !!data?.ledgerInfo?.flags?.globalFreeze
  const isNoFreezeEnabled = !!data?.ledgerInfo?.flags?.noFreeze
  const hasCustomTransferFee = data?.ledgerInfo?.transferRate
  const hasIssuerSettingsData =
    isRipplingEnabled ||
    hasCustomTransferFee ||
    isCanEscrowEnabled ||
    isTrustlineClawbackEnabled ||
    isGlobalFreezeEnabled ||
    isNoFreezeEnabled
  const isMessageKeyUsedForFlare = data?.ledgerInfo?.messageKey?.substring(0, 26) === '02000000000000000000000000'
  const hasRegularKey = !!data?.ledgerInfo?.regularKey
  const hasMultisig = !!data?.ledgerInfo?.signerList
  const isBlackholed = !!data?.ledgerInfo?.blackholed
  const isDeletedAccount = !!data?.ledgerInfo?.deleted
  const isOwnAccount = data?.address === account?.address
  const showHistoricalDataCard = data?.ledgerInfo?.activated !== false || isDeletedAccount
  const isNotActivatedAccount = data?.ledgerInfo?.activated === false
  const shouldShowGetFirstNativeButton =
    !!getCoinsUrl && nativeAvailableDrops === 0 && (isNotActivatedAccount || isDeletedAccount)
  const shouldShowAddTokenButton =
    !!setSignRequest &&
    !effectiveLedgerTimestamp &&
    !!data?.address &&
    !isDeletedAccount &&
    data?.ledgerInfo?.activated !== false &&
    (!account?.address || account.address === data.address)
  const canSendFromAccount = !!setSignRequest && !!account?.address && isOwnAccount && !effectiveLedgerTimestamp
  const disabledSendTooltip = (() => {
    if (canSendFromAccount) return ''
    if (!setSignRequest || !account?.address) return 'Only logged in users can do it'
    if (!isOwnAccount) return 'Only the viewed account can do it'
    if (effectiveLedgerTimestamp) return 'Unavailable in historical mode'
    return 'Send is unavailable'
  })()
  const getFirstNativeUrl = getCoinsUrl ? getCoinsUrl + (devNet ? '?address=' + data?.address : '') : ''
  const hasAccountControlData =
    hasRegularKey ||
    hasMultisig ||
    isBlackholed ||
    !!data?.ledgerInfo?.flags?.passwordSpent ||
    !!data?.ledgerInfo?.flags?.disableMaster
  const hasNextSequence = data?.ledgerInfo?.sequence !== undefined && data?.ledgerInfo?.sequence !== null
  const hasXahauRewardsConfigured = !!data?.ledgerInfo?.rewardLgrFirst
  const shouldShowXahauRewardCard = xahauNetwork && (hasXahauRewardsConfigured || data?.address === account?.address)
  const xahauRewardDelaySeconds = 2600000
  const xahauRewardRate = 0.0033333333300000004
  const xahauRewardRemainingSeconds = hasXahauRewardsConfigured
    ? xahauRewardDelaySeconds - (Math.floor(new Date().getTime() / 1000) - (data.ledgerInfo.rewardTime + 946684800))
    : null
  const isXahauRewardClaimable = hasXahauRewardsConfigured && xahauRewardRemainingSeconds <= 0
  const xahauRewardClaimableAt = hasXahauRewardsConfigured
    ? Math.floor(new Date().getTime() / 1000) + xahauRewardRemainingSeconds
    : null
  let xahauRewardAmount = 0
  if (hasXahauRewardsConfigured) {
    const elapsed = data?.ledgerInfo?.ledger - data?.ledgerInfo?.rewardLgrFirst
    const elapsedSinceLast = data?.ledgerInfo?.ledger - data?.ledgerInfo?.rewardLgrLast
    let accumulator = parseInt(data?.ledgerInfo?.rewardAccumulator, 16)
    if (parseInt(data?.ledgerInfo?.balance) > 0 && elapsedSinceLast > 0) {
      accumulator += (parseInt(data?.ledgerInfo?.balance) / 1000000) * elapsedSinceLast
    }
    if (elapsed > 0) {
      xahauRewardAmount = (accumulator / elapsed) * xahauRewardRate * 1000000
    }
  }
  const xahauRewardCollapsedAmountText = hasXahauRewardsConfigured
    ? amountFormat(xahauRewardAmount, { maxFractionDigits: 6 })
    : 'not set'
  const xahauRewardCollapsedTimeNode = hasXahauRewardsConfigured
    ? isXahauRewardClaimable
      ? 'claimable now'
      : timeFromNow(xahauRewardClaimableAt, i18n)
    : null
  const hasAccountSettingsRows =
    !!data?.ledgerInfo?.accountIndex ||
    hasNextSequence ||
    !!data?.ledgerInfo?.messageKey ||
    !!data?.ledgerInfo?.previousTxnID ||
    !!data?.ledgerInfo?.accountTxnID ||
    !!data?.ledgerInfo?.walletLocator ||
    !!data?.ledgerInfo?.ammID ||
    data?.ledgerInfo?.ticketCount === 0 ||
    !!data?.ledgerInfo?.ticketCount ||
    !!data?.ledgerInfo?.importSequence ||
    !!data?.ledgerInfo?.tickSize ||
    !!data?.ledgerInfo?.flags?.requireDestTag ||
    !!data?.ledgerInfo?.flags?.depositAuth ||
    !!data?.ledgerInfo?.flags?.requireAuth ||
    !!data?.ledgerInfo?.flags?.disallowIncomingCheck ||
    !!data?.ledgerInfo?.flags?.disallowIncomingPayChan ||
    !!data?.ledgerInfo?.flags?.disallowIncomingTrustline ||
    !!data?.ledgerInfo?.flags?.disallowIncomingNFTokenOffer ||
    !!data?.ledgerInfo?.flags?.disallowIncomingRemit ||
    !!data?.ledgerInfo?.flags?.tshCollect ||
    !!data?.ledgerInfo?.flags?.disallowXRP
  const canManageDomain =
    data?.address === account?.address && !!setSignRequest && !effectiveLedgerTimestamp && !!data?.ledgerInfo?.activated
  const hasAccountSettingsData = hasAccountSettingsRows
  const accountControlCollapsedLabel = isBlackholed
    ? 'Blackholed'
    : hasRegularKey && hasMultisig
      ? 'regKey + multisig'
      : hasRegularKey
        ? 'regKey'
        : hasMultisig
          ? 'multisig'
          : data?.ledgerInfo?.flags?.disableMaster
            ? 'master disabled'
            : data?.ledgerInfo?.flags?.passwordSpent
              ? 'free re-key spent'
              : 'standard'
  const issuerSettingsCollapsedLabel = isGlobalFreezeEnabled
    ? 'global freeze'
    : hasCustomTransferFee
      ? `fee ${issuerTransferFeeText}`
      : isRipplingEnabled
        ? 'rippling'
        : isTrustlineClawbackEnabled
          ? 'clawback'
          : isNoFreezeEnabled
            ? 'no freeze'
            : isCanEscrowEnabled
              ? 'escrow'
              : 'not configured'
  const hasNftDataDetails =
    !!data?.ledgerInfo?.firstNFTokenSequence ||
    !!data?.ledgerInfo?.nftokenMinter ||
    !!data?.ledgerInfo?.flags?.disallowIncomingNFTokenOffer ||
    !!data?.ledgerInfo?.flags?.uriTokenIssuer
  const hasFlareAddress = !!data?.flare?.address
  const hasAirdropsData = hasFlareAddress
  const didData = data?.ledgerInfo?.did || data?.did || null
  const didUrl = didData?.uri ? decode(didData.uri) : ''
  const didCollapsedUrl = didUrl && isUrlValid(didUrl) ? stripDomain(didUrl) : didUrl
  const didDecodedData = didData?.data ? decode(didData.data) : ''
  const didDecodedDocument = didData?.didDocument ? decode(didData.didDocument) : ''
  const didMetadataNode = (() => {
    if (!didData?.metadata) return null
    if (typeof didData.metadata === 'string') {
      try {
        return codeHighlight(JSON.parse(didData.metadata))
      } catch {
        return <pre className="tx-fail-description-text">{didData.metadata}</pre>
      }
    }
    return codeHighlight(didData.metadata)
  })()
  const didCreatedAgo = didData?.createdAt ? timeFromNow(didData.createdAt, i18n) : null
  const didCollapsedAgo = didData?.updatedAt ? timeFromNow(didData.updatedAt, i18n) : didCreatedAgo
  const didCollapsedAgoLabel = didData?.updatedAt ? 'Updated' : 'Created'
  const didCreatedFull = didData?.createdAt ? fullDateAndTime(didData.createdAt) : null
  const didUpdatedFull = didData?.updatedAt ? fullDateAndTime(didData.updatedAt) : null
  const canManageDid = data?.address === account?.address && !effectiveLedgerTimestamp && !!setSignRequest
  const flareClaimNode = hasFlareAddress ? (
    <>
      {fullNiceNumber(data.flare.spark * 0.15)} <span className="no-brake">FLR</span>
    </>
  ) : null
  const songbirdClaimNode = hasFlareAddress ? (
    <>
      {fullNiceNumber(data.flare.songbird)} <span className="no-brake">SGB</span>
    </>
  ) : null

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

  if (data?.verifiedDomain) {
    achievements.push({
      key: 'domain-verified',
      image: 'domainverified.png',
      tooltip: 'TOML verified domain'
    })
  }

  const hasXaoDaoNft = ownedNfts.some((nft) => {
    return nft?.issuer === 'rMFNnkPvDmsBVriFh3QRMMRKaVHsSuChdg' && nft?.nftokenTaxon === 1
  })

  if (hasXaoDaoNft) {
    achievements.push({
      key: 'xaodao',
      image: 'xaodao.png',
      tooltip: 'XAO DAO NFT holder'
    })
  }

  const hasApex23Nft = ownedNfts.some((nft) => {
    return nft?.issuer === 'rfzBM6mvDKNUgZ8yvKN29Qn4fo9Skh9MeL' && nft?.nftokenTaxon === 2
  })

  if (hasApex23Nft) {
    achievements.push({
      key: 'apex23',
      image: 'apex23.png',
      tooltip: 'Apex 2023 NFT holder'
    })
  }

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  const accountDisplayService = data?.service?.name
  const accountDisplayUsername = !accountDisplayService ? data?.username : null
  const hasDisplayIdentity = !!accountDisplayService || !!accountDisplayUsername
  const accountAmmId = data?.ledgerInfo?.ammID
  const accountDisplayName = accountAmmId ? (
    <>
      <span>AMM</span>{' '}
      <Link href={`/amm/${accountAmmId}`} className="inline-link-icon tooltip" aria-label="Open AMM page">
        <LinkIcon />
        <span className="tooltiptext no-brake">AMM page</span>
      </Link>
    </>
  ) : (
    userOrServiceName({ service: accountDisplayService, username: accountDisplayUsername }) || 'No username'
  )
  const hasPositiveNativeAvailableBalance = Number(balanceList?.available?.native || 0) > 0
  const shouldShowUsernameRegisterButton =
    !hasDisplayIdentity &&
    hasPositiveNativeAvailableBalance &&
    !devNet &&
    !isBlackholed &&
    !isDeletedAccount &&
    !isNotActivatedAccount
  const shouldShowSetAvatarButton = isOwnAccount && !!account?.address && !data?.ledgerInfo?.blackholed && !devNet
  const shouldShowSignInIdentityButton = !account?.address && !data?.service && !data?.ledgerInfo?.blackholed

  const nativeAvailableFiatValue = ((balanceList?.available?.native || 0) / 1000000) * (pageFiatRate || 0)
  const isLpTrustlineToken = (token) => token?.Balance?.currency?.substring(0, 2) === '03'
  const lpTokenList = tokens.filter((token) => isLpTrustlineToken(token))
  const standardTokenList = tokens.filter((token) => !isLpTrustlineToken(token))
  const totalTokenCount = tokens.length
  const lpTokensCount = lpTokenList.length
  const issuedTokensCount = standardTokenList.length
  const hasNonNativeTokenAssets = lpTokensCount > 0 || issuedTokensCount > 0
  const isGateway = Number(data?.obligations?.trustlines || 0) > 200
  const lpTokensFiatValue = lpTokenList.reduce((sum, token) => {
    const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
    return sum + (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
  }, 0)
  const issuedTokensFiatValue = standardTokenList.reduce((sum, token) => {
    const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
    return sum + (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
  }, 0)
  const totalWorthFiatValue = nativeAvailableFiatValue + lpTokensFiatValue + issuedTokensFiatValue
  const totalWorthBreakdown = [
    { label: nativeCurrency, value: nativeAvailableFiatValue },
    ...(lpTokensCount > 0 ? [{ label: `LP tokens (${lpTokensCount})`, value: lpTokensFiatValue }] : []),
    ...(issuedTokensCount > 0 ? [{ label: `Tokens (${issuedTokensCount})`, value: issuedTokensFiatValue }] : [])
  ].sort((a, b) => b.value - a.value)
  const shouldShowTokenTabs = lpTokensCount > 0 && issuedTokensCount > 0
  const activeTokenList = tokenTab === 'lp' ? lpTokenList : tokenTab === 'tokens' ? standardTokenList : tokens
  const visibleTokens = showAllTokens
    ? activeTokenList
    : activeTokenList.slice(0, Math.max(tokenDisplayLimit, TOKEN_PREVIEW_LIMIT))
  const hiddenTokensCount = Math.max(activeTokenList.length - visibleTokens.length, 0)
  const tokenTabDisplayNameMap = {
    all: 'tokens',
    tokens: 'tokens',
    lp: 'LP tokens'
  }
  const activeTokenTabLabel = tokenTabDisplayNameMap[tokenTab] || 'tokens'
  const ownedNftCount = Math.max(ownedNftIds.length, ownedNfts.length)
  const soldNftsCount = Math.max(soldNfts.length, soldNftsTotalCount || 0)
  const mintedNftsLedgerCount = Number(data?.ledgerInfo?.mintedNFTokens || 0)
  const burnedNftsLedgerCount = Number(data?.ledgerInfo?.burnedNFTokens || 0)
  const mintedNftsCount = Math.max(mintedNfts.length, mintedNftsLedgerCount)
  const burnedNftsCount = Math.max(burnedNfts.length, burnedNftsLedgerCount)
  const hasOwnedNfts = !effectiveLedgerTimestamp && ownedNftCount > 0
  const hasSoldNfts = soldNftsCount > 0
  const hasMintedNfts = mintedNfts.length > 0
  const hasBurnedNfts = burnedNfts.length > 0
  const hasAnyNftSectionData = hasOwnedNfts || hasSoldNfts || hasMintedNfts || hasBurnedNfts
  const activeNftList =
    nftTab === 'owned' ? ownedNfts : nftTab === 'sold' ? soldNfts : nftTab === 'minted' ? mintedNfts : burnedNfts
  const activeNftLimit = nftDisplayLimit
  const activeNftCountMap = {
    owned: ownedNftCount,
    sold: soldNftsCount,
    minted: mintedNftsCount,
    burned: burnedNftsCount
  }
  const nftTabExactCountMap = {
    owned: ownedNftIds.length > 0 || ownedNfts.length < NFT_FETCH_LIMIT,
    sold: soldNftsTotalCount !== null || soldNfts.length < NFT_FETCH_LIMIT,
    minted: mintedNftsLedgerCount > 0 || mintedNfts.length < NFT_FETCH_LIMIT,
    burned: burnedNftsLedgerCount > 0 || burnedNfts.length < NFT_FETCH_LIMIT
  }
  const getNftTabCountLabel = (tab) => {
    const count = activeNftCountMap[tab]
    if (typeof count !== 'number') return null
    if (count === 0) return '0'
    return nftTabExactCountMap[tab] ? `${count}` : `${count}+`
  }
  const nftTabCountLabels = {
    owned: getNftTabCountLabel('owned'),
    sold: getNftTabCountLabel('sold'),
    minted: getNftTabCountLabel('minted'),
    burned: getNftTabCountLabel('burned')
  }
  const activeNftCount = activeNftCountMap[nftTab] || 0
  const activeNftPreview = activeNftList.slice(0, activeNftLimit)
  const activeNftMarker = nftMarkers[nftTab] || null
  const activeNftAllShown = activeNftPreview.length >= activeNftList.length
  const activeNftShowMoreAvailable = !activeNftAllShown || !!activeNftMarker
  const activeNftRemainingCount = !activeNftAllShown
    ? Math.min(NFT_LOAD_MORE_STEP, Math.max(activeNftList.length - activeNftPreview.length, 0))
    : activeNftMarker
      ? NFT_LOAD_MORE_STEP
      : Math.min(NFT_LOAD_MORE_STEP, Math.max(activeNftCount - activeNftPreview.length, 0))
  const showNftFewerButton = nftDisplayLimit > NFT_INITIAL_LIMIT
  const showNftControlsVisible = activeNftShowMoreAvailable || showNftFewerButton
  const activeNftTabLabel = nftTab.charAt(0).toUpperCase() + nftTab.slice(1)
  const activeNftLoading =
    nftTab === 'sold'
      ? soldNftsLoading
      : nftTab === 'minted'
        ? mintedNftsLoading
        : nftTab === 'burned'
          ? burnedNftsLoading
          : false
  const activeNftViewAllHref =
    nftTab === 'owned'
      ? `/nfts/${data?.address}?includeWithoutMediaData=true`
      : nftTab === 'sold'
        ? `/nft-sales?seller=${data?.address}&period=${effectiveLedgerTimestamp && data?.inception ? `${new Date(data.inception * 1000).toISOString()}..${new Date(effectiveLedgerTimestamp).toISOString()}` : 'all'}`
        : nftTab === 'minted'
          ? `/nft-explorer?includeWithoutMediaData=true&issuer=${data?.address}&includeBurned=true${effectiveLedgerTimestamp && data?.inception ? `&mintedPeriod=${new Date(data.inception * 1000).toISOString()}..${new Date(effectiveLedgerTimestamp).toISOString()}` : ''}`
          : `/nft-explorer?includeWithoutMediaData=true&issuer=${data?.address}&includeBurned=true&burnedPeriod=${effectiveLedgerTimestamp && data?.inception ? `${new Date(data.inception * 1000).toISOString()}..${new Date(effectiveLedgerTimestamp).toISOString()}` : 'all'}`
  const activeNftEmptyLabel =
    nftTab === 'owned'
      ? 'No owned NFTs found.'
      : nftTab === 'sold'
        ? 'No sold NFTs found.'
        : nftTab === 'minted'
          ? 'No minted NFTs found.'
          : 'No burned NFTs found.'
  const activeNftOffers =
    nftOffersTab === 'received'
      ? receivedPrivateNftOffers
      : nftOffersTab === 'created'
        ? createdNftOffers
        : ownedNftOffers
  const activeNftOffersLimit = nftOffersDisplayLimit
  const activeNftOffersPreview = activeNftOffers.slice(0, activeNftOffersLimit)
  const activeNftOffersShowMoreAvailable = activeNftOffers.length > activeNftOffersPreview.length
  const activeNftOffersRemainingCount = Math.max(activeNftOffers.length - activeNftOffersPreview.length, 0)
  const showNftOffersFewerButton = nftOffersDisplayLimit > NFT_OFFERS_PREVIEW_LIMIT
  const showNftOffersControlsVisible = activeNftOffersShowMoreAvailable || showNftOffersFewerButton
  const activeNftOffersTabLabel =
    nftOffersTab === 'received' ? 'private' : nftOffersTab === 'created' ? 'created' : 'owned'
  const nftOffersTabCountMap = {
    received: receivedPrivateNftOffers.length,
    created: createdNftOffers.length,
    owned: ownedNftOffers.length
  }
  const nftOffersTabExactCountMap = {
    received: receivedPrivateNftOffers.length < NFT_OFFERS_FETCH_LIMIT,
    created: createdNftOffers.length < NFT_OFFERS_FETCH_LIMIT,
    owned: ownedNftOffers.length < NFT_OFFERS_FETCH_LIMIT
  }
  const getNftOffersTabCountLabel = (tab) => {
    const count = nftOffersTabCountMap[tab]
    if (typeof count !== 'number') return null
    if (count === 0) return '0'
    return nftOffersTabExactCountMap[tab] ? `${count}` : `${count}+`
  }
  const nftOffersTabCountLabels = {
    received: getNftOffersTabCountLabel('received'),
    created: getNftOffersTabCountLabel('created'),
    owned: getNftOffersTabCountLabel('owned')
  }
  const hasReceivedPrivateNftOffers = receivedPrivateNftOffers.length > 0
  const hasCreatedNftOffers = createdNftOffers.length > 0
  const hasOwnedNftOffers = ownedNftOffers.length > 0
  const hasAnyNftOffersData =
    !effectiveLedgerTimestamp && (hasReceivedPrivateNftOffers || hasCreatedNftOffers || hasOwnedNftOffers)
  const activeNftOffersCount = activeNftOffers.length
  const activeNftOffersLoading = nftOffersLoading[nftOffersTab]
  const activeNftOffersError = nftOffersError[nftOffersTab]
  const activeNftOffersTitle =
    nftOffersTab === 'received'
      ? 'No private NFT offers found.'
      : nftOffersTab === 'created'
        ? 'No created NFT offers found.'
        : 'No offers for owned NFTs found.'
  const activeNftOffersViewAllHref =
    nftOffersTab === 'received'
      ? `/nft-offers/${data?.address}?offerList=privately-offered-to-address`
      : `/nft-offers/${data?.address}`
  const hasReceivedChecks = receivedChecks.length > 0
  const hasSentChecks = sentChecks.length > 0
  const showChecksTabs = hasReceivedChecks && hasSentChecks
  const activeChecksTab = showChecksTabs ? checksTab : hasSentChecks ? 'sent' : 'received'
  const activeChecksList = activeChecksTab === 'sent' ? sentChecks : receivedChecks
  const activeChecksPreview = activeChecksList.slice(0, checksDisplayLimit)
  const activeChecksShowMoreAvailable = activeChecksList.length > activeChecksPreview.length
  const activeChecksRemainingCount = Math.max(activeChecksList.length - activeChecksPreview.length, 0)
  const showChecksFewerButton = checksDisplayLimit > OBJECT_PREVIEW_LIMIT
  const showChecksControlsVisible = activeChecksShowMoreAvailable || showChecksFewerButton
  const checksSectionTitle = showChecksTabs ? 'Checks' : activeChecksTab === 'sent' ? 'Sent checks' : 'Received checks'

  const hasReceivedEscrows = receivedEscrows.length > 0
  const hasSentEscrows = sentEscrows.length > 0
  const hasSelfEscrows = selfEscrows.length > 0
  const availableEscrowsTabs = useMemo(
    () => [
      ...(hasSelfEscrows ? ['self'] : []),
      ...(hasReceivedEscrows ? ['received'] : []),
      ...(hasSentEscrows ? ['sent'] : [])
    ],
    [hasSelfEscrows, hasReceivedEscrows, hasSentEscrows]
  )
  const showEscrowsTabs = availableEscrowsTabs.length > 1
  const activeEscrowsTab = showEscrowsTabs ? escrowsTab : availableEscrowsTabs[0] || 'received'
  const activeEscrowsList =
    activeEscrowsTab === 'sent' ? sentEscrows : activeEscrowsTab === 'self' ? selfEscrows : receivedEscrows
  const activeEscrowsPreview = activeEscrowsList.slice(0, escrowsDisplayLimit)
  const activeEscrowsShowMoreAvailable = activeEscrowsList.length > activeEscrowsPreview.length
  const activeEscrowsRemainingCount = Math.max(activeEscrowsList.length - activeEscrowsPreview.length, 0)
  const showEscrowsFewerButton = escrowsDisplayLimit > OBJECT_PREVIEW_LIMIT
  const showEscrowsControlsVisible = activeEscrowsShowMoreAvailable || showEscrowsFewerButton
  const escrowsSectionTitle = showEscrowsTabs
    ? 'Escrows'
    : activeEscrowsTab === 'sent'
      ? 'Outgoing escrows'
      : activeEscrowsTab === 'self'
        ? 'Self escrows'
        : 'Incoming escrows'

  const hasIncomingPaychannels = incomingPaychannels.length > 0
  const hasOutgoingPaychannels = outgoingPaychannels.length > 0
  const showPaychannelsTabs = hasIncomingPaychannels && hasOutgoingPaychannels
  const activePaychannelsTab = showPaychannelsTabs ? paychannelsTab : hasOutgoingPaychannels ? 'outgoing' : 'incoming'
  const activePaychannelsList = activePaychannelsTab === 'outgoing' ? outgoingPaychannels : incomingPaychannels
  const activePaychannelsPreview = activePaychannelsList.slice(0, paychannelsDisplayLimit)
  const activePaychannelsShowMoreAvailable = activePaychannelsList.length > activePaychannelsPreview.length
  const activePaychannelsRemainingCount = Math.max(activePaychannelsList.length - activePaychannelsPreview.length, 0)
  const showPaychannelsFewerButton = paychannelsDisplayLimit > OBJECT_PREVIEW_LIMIT
  const showPaychannelsControlsVisible = activePaychannelsShowMoreAvailable || showPaychannelsFewerButton
  const paychannelsSectionTitle = showPaychannelsTabs
    ? 'Paychannels'
    : activePaychannelsTab === 'outgoing'
      ? 'Outgoing paychannels'
      : 'Incoming paychannels'
  const hasDexOrders = dexOrders.length > 0
  const dexOrdersPreview = dexOrders.slice(0, dexOrdersDisplayLimit)
  const dexOrdersShowMoreAvailable = dexOrders.length > dexOrdersPreview.length
  const dexOrdersRemainingCount = Math.max(dexOrders.length - dexOrdersPreview.length, 0)
  const showDexOrdersFewerButton = dexOrdersDisplayLimit > OBJECT_PREVIEW_LIMIT
  const showDexOrdersControlsVisible = dexOrdersShowMoreAvailable || showDexOrdersFewerButton
  const hasDepositPreauthAccounts = depositPreauthAccounts.length > 0
  const hasHooks = hookList.length > 0
  const hasCronData = !!data?.ledgerInfo?.cron
  const hasHeldMpts = heldMpts.length > 0
  const hasIssuedMpts = issuedMpts.length > 0
  const hasIssuedTokensSection = issuedTokensLoading || !!issuedTokensError || issuedTokens.length > 0
  const hasActivatedAccountsSection =
    !effectiveLedgerTimestamp &&
    (activatedAccountsLoading ||
      activatedAccountsLoadingMore ||
      !!activatedAccountsError ||
      activatedAccountsCount > 0 ||
      activatedAccounts.length > 0)
  const hasColumn4ObjectSections =
    hasIssuedTokensSection ||
    hasIssuerSettingsData ||
    hasIssuedMpts ||
    hasDexOrders ||
    hasReceivedChecks ||
    hasSentChecks ||
    hasSelfEscrows ||
    hasReceivedEscrows ||
    hasSentEscrows ||
    hasAnyNftOffersData ||
    hasIncomingPaychannels ||
    hasOutgoingPaychannels ||
    hasActivatedAccountsSection
  const showObjectsLoadStatus = !!data?.ledgerInfo?.activated && (objectsLoading || !!objectsError)

  useEffect(() => {
    if (refreshPageRef.current === refreshPage) return
    refreshPageRef.current = refreshPage
    if (!data?.address) return

    // Re-run SSR data fetch on successful sign flow updates so balances, offers, and tx lists stay in sync.
    router.replace(router.asPath, undefined, { scroll: false })
  }, [refreshPage, data?.address, router])

  useEffect(() => {
    if (!data?.address || effectiveLedgerTimestamp) {
      setActivatedAccounts([])
      setActivatedAccountsCount(0)
      setActivatedAccountsSpent(0)
      setActivatedAccountsLoading(false)
      setActivatedAccountsLoadingMore(false)
      setActivatedAccountsError(null)
      setActivatedAccountsMarker(null)
      setExpandedActivatedKey(null)
      return
    }

    setExpandedActivatedKey(null)
    const requestToken = activatedAccountsRequestTokenRef.current + 1
    activatedAccountsRequestTokenRef.current = requestToken

    const fetchActivatedAccounts = async ({ markerValue = null, append = false } = {}) => {
      if (append) {
        setActivatedAccountsLoadingMore(true)
      } else {
        setActivatedAccountsLoading(true)
      }

      if (!append) {
        setActivatedAccounts([])
        setActivatedAccountsCount(0)
        setActivatedAccountsSpent(0)
        setActivatedAccountsMarker(null)
      }

      setActivatedAccountsError(null)

      try {
        const markerQuery = markerValue ? `&marker=${encodeURIComponent(markerValue)}` : ''
        const orderQuery = `&order=${activatedAccountsOrder}`
        const response = await axios.get(
          `xrpl/accounts?parent=${data.address}&limit=${ACTIVATED_ACCOUNTS_FETCH_LIMIT}${orderQuery}${markerQuery}`
        )
        if (activatedAccountsRequestTokenRef.current !== requestToken) return

        const payload = response?.data || {}

        if (payload?.result && payload.result !== 'success') {
          throw new Error(payload?.message || 'Failed to load activated accounts')
        }

        const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
        const nextMarker = payload?.marker || null

        const normalizedRows = accountRows
          .map((child) => ({
            address: child?.account || child?.address || '',
            inception: child?.inception || null,
            initialBalance: Number(child?.initial_balance ?? child?.initialBalance ?? 0),
            balance: Number(child?.balance ?? 0),
            txHash: child?.tx_hash || child?.txHash || null,
            lastSubmittedAt: child?.last_submitted_at || child?.lastSubmittedAt || null,
            lastSubmittedLedgerIndex: child?.last_submitted_ledger_index ?? child?.lastSubmittedLedgerIndex ?? null,
            lastSubmittedTxHash: child?.last_submitted_tx_hash || child?.lastSubmittedTxHash || null,
            deletedAt: child?.deleted_at || child?.deletedAt || null,
            deletedLedgerIndex: child?.deleted_ledger_index ?? child?.deletedLedgerIndex ?? null,
            deletedTxHash: child?.deleted_tx_hash || child?.deletedTxHash || null
          }))
          .filter((child) => !!child.address)

        if (append) {
          setActivatedAccounts((prev) => [...prev, ...normalizedRows])
        } else {
          setActivatedAccounts(normalizedRows)
        }

        setActivatedAccountsMarker(nextMarker)

        if (!append) {
          let summaryCount = Number(payload?.count)
          let summarySpent = normalizedRows.reduce(
            (sum, child) => sum + (Number.isFinite(child.initialBalance) ? child.initialBalance : 0),
            0
          )

          try {
            const summaryResponse = await axios.get(`xrpl/accounts/summary?parent=${data.address}`)
            if (activatedAccountsRequestTokenRef.current !== requestToken) return
            const summaryData = summaryResponse?.data || {}
            const summaryCountValue = Number(summaryData?.count)
            const summarySpentValue = Number(summaryData?.initial_balance)

            if (Number.isFinite(summaryCountValue) && summaryCountValue >= 0) {
              summaryCount = summaryCountValue
            }

            if (Number.isFinite(summarySpentValue) && summarySpentValue >= 0) {
              summarySpent = summarySpentValue
            }
          } catch {
            // Keep first-page summary values when summary endpoint fails.
          }

          if (!Number.isFinite(summaryCount) || summaryCount < 0) {
            summaryCount = normalizedRows.length
          }

          setActivatedAccountsCount(summaryCount)
          setActivatedAccountsSpent(summarySpent)
        }
      } catch (requestError) {
        if (activatedAccountsRequestTokenRef.current !== requestToken) return
        if (!append) {
          setActivatedAccounts([])
          setActivatedAccountsCount(0)
          setActivatedAccountsSpent(0)
          setActivatedAccountsMarker(null)
        }
        setActivatedAccountsError(requestError?.message || 'Failed to load activated accounts')
      } finally {
        if (activatedAccountsRequestTokenRef.current !== requestToken) return
        if (append) {
          setActivatedAccountsLoadingMore(false)
        } else {
          setActivatedAccountsLoading(false)
        }
      }
    }

    fetchActivatedAccounts()

    return () => {
      if (activatedAccountsRequestTokenRef.current === requestToken) {
        activatedAccountsRequestTokenRef.current = requestToken + 1
      }
    }
  }, [data?.address, effectiveLedgerTimestamp, activatedAccountsOrder, activatedAccountsReloadKey, refreshPage])

  const loadMoreActivatedAccounts = () => {
    if (
      !data?.address ||
      !activatedAccountsMarker ||
      activatedAccountsLoadingMore ||
      activatedAccountsLoading ||
      effectiveLedgerTimestamp
    )
      return

    const requestToken = activatedAccountsRequestTokenRef.current
    const markerValue = activatedAccountsMarker

    const fetchMore = async () => {
      setActivatedAccountsLoadingMore(true)
      setActivatedAccountsError(null)

      try {
        const response = await axios.get(
          `xrpl/accounts?parent=${data.address}&limit=${ACTIVATED_ACCOUNTS_FETCH_LIMIT}&order=${activatedAccountsOrder}&marker=${encodeURIComponent(markerValue)}`
        )
        if (activatedAccountsRequestTokenRef.current !== requestToken) return

        const payload = response?.data || {}

        if (payload?.result && payload.result !== 'success') {
          throw new Error(payload?.message || 'Failed to load activated accounts')
        }

        const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
        const normalizedRows = accountRows
          .map((child) => ({
            address: child?.account || child?.address || '',
            inception: child?.inception || null,
            initialBalance: Number(child?.initial_balance ?? child?.initialBalance ?? 0),
            balance: Number(child?.balance ?? 0),
            txHash: child?.tx_hash || child?.txHash || null,
            lastSubmittedAt: child?.last_submitted_at || child?.lastSubmittedAt || null,
            lastSubmittedLedgerIndex: child?.last_submitted_ledger_index ?? child?.lastSubmittedLedgerIndex ?? null,
            lastSubmittedTxHash: child?.last_submitted_tx_hash || child?.lastSubmittedTxHash || null,
            deletedAt: child?.deleted_at || child?.deletedAt || null,
            deletedLedgerIndex: child?.deleted_ledger_index ?? child?.deletedLedgerIndex ?? null,
            deletedTxHash: child?.deleted_tx_hash || child?.deletedTxHash || null
          }))
          .filter((child) => !!child.address)

        setActivatedAccounts((prev) => [...prev, ...normalizedRows])
        setActivatedAccountsMarker(payload?.marker || null)
      } catch (requestError) {
        if (activatedAccountsRequestTokenRef.current !== requestToken) return
        setActivatedAccountsError(requestError?.message || 'Failed to load activated accounts')
      } finally {
        if (activatedAccountsRequestTokenRef.current !== requestToken) return
        setActivatedAccountsLoadingMore(false)
      }
    }

    fetchMore()
  }

  const loadMoreNfts = async () => {
    if (nftLoadingMore) return

    // Still have loaded items not yet shown — just reveal them
    if (activeNftList.length > nftDisplayLimit) {
      setNftDisplayLimit((prev) => Math.min(activeNftList.length, prev + NFT_LOAD_MORE_STEP))
      return
    }

    // All loaded items are shown — fetch the next batch using marker
    const marker = nftMarkers[nftTab]
    if (!marker || !data?.address) return

    const nftResource = xahauNetwork ? 'uritokens' : 'nfts'

    try {
      setNftLoadingMore(true)
      let url = ''
      if (nftTab === 'owned') {
        url = `v2/${nftResource}?owner=${data.address}&order=mintedNew&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}&marker=${encodeURIComponent(marker)}`
      } else if (nftTab === 'sold') {
        const currencyQuery = selectedCurrency
          ? `&convertCurrencies=${selectedCurrency.toLowerCase()}&sortCurrency=${selectedCurrency.toLowerCase()}`
          : ''
        url = `v2/nft-sales?seller=${data.address}&list=lastSold&limit=${NFT_FETCH_LIMIT}${currencyQuery}&marker=${encodeURIComponent(marker)}`
      } else if (nftTab === 'minted') {
        const mintedNftResource = xahauNetwork ? 'uritokens' : 'nfts'
        url = `v2/${mintedNftResource}?issuer=${data.address}&order=mintedNew&includeDeleted=true&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}&marker=${encodeURIComponent(marker)}`
      } else {
        url = `v2/nfts?issuer=${data.address}&order=mintedNew&includeDeleted=true&deletedAt=all&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}&marker=${encodeURIComponent(marker)}`
      }

      const response = await axios.get(url)
      let moreItems = []
      let newMarker = response?.data?.marker || null

      if (nftTab === 'sold') {
        const soldPayload = response?.data || {}
        const { soldList, soldTotalCount } = parseSoldNftsPayload(soldPayload)
        moreItems = soldList
        setSoldNfts((prev) => [...prev, ...moreItems])
        if (soldTotalCount !== null) {
          setSoldNftsTotalCount(soldTotalCount)
        }
      } else {
        moreItems = Array.isArray(response?.data?.[nftResource]) ? response.data[nftResource] : []
        if (nftTab === 'owned') setOwnedNfts((prev) => [...prev, ...moreItems])
        else if (nftTab === 'minted') setMintedNfts((prev) => [...prev, ...moreItems])
        else setBurnedNfts((prev) => [...prev, ...moreItems])
      }

      setNftMarkers((prev) => ({ ...prev, [nftTab]: newMarker }))
      setNftDisplayLimit((prev) => prev + Math.min(NFT_LOAD_MORE_STEP, moreItems.length))
    } catch {
      // fetch failed — leave state unchanged so the button stays
    } finally {
      setNftLoadingMore(false)
    }
  }

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
      // Switch away from "owned" tab in historical mode since API doesn't support it
      if (nftTab === 'owned') {
        // Find first available tab
        if (soldNfts.length > 0) {
          setNftTab('sold')
        } else if (mintedNfts.length > 0) {
          setNftTab('minted')
        } else if (burnedNfts.length > 0) {
          setNftTab('burned')
        }
      }
    } else {
      setLedgerTimestampInput(new Date())
    }
  }, [effectiveLedgerTimestamp, nftTab, soldNfts.length, mintedNfts.length, burnedNfts.length])

  useEffect(() => {
    setShowAllTokens(false)
    setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
    setExpandedToken(null)
    setExpandedTransactionKey(null)
    setShowNftDataDetails(false)
    setNftTab('owned')
    setNftOffersTab('received')
    setTokenTab('all')
    setNftDisplayLimit(NFT_INITIAL_LIMIT)
    setNftMarkers({ owned: null, minted: null, burned: null, sold: null })
    setNftOffersDisplayLimit(NFT_OFFERS_PREVIEW_LIMIT)
    setDexOrdersDisplayLimit(OBJECT_PREVIEW_LIMIT)
    setChecksDisplayLimit(OBJECT_PREVIEW_LIMIT)
    setEscrowsDisplayLimit(OBJECT_PREVIEW_LIMIT)
    setPaychannelsDisplayLimit(OBJECT_PREVIEW_LIMIT)
    setExpandedNftCardKey(null)
    setExpandedNftOfferKey(null)
    setExpandedDexOrderKey(null)
    setExpandedDidCard(false)
    setExpandedHeldMptKey(null)
    setExpandedIssuedMptKey(null)
  }, [data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    setShowAllTokens(false)
    setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
    setExpandedToken(null)
  }, [tokenTab])

  useEffect(() => {
    if (tokenTab === 'lp' && lpTokensCount === 0) {
      setTokenTab('all')
    } else if (tokenTab === 'tokens' && issuedTokensCount === 0) {
      setTokenTab('all')
    }
  }, [tokenTab, lpTokensCount, issuedTokensCount])

  useEffect(() => {
    const availableTabs = []
    if (ownedNfts.length > 0 && !effectiveLedgerTimestamp) {
      availableTabs.push('owned')
    }
    if (soldNfts.length > 0) {
      availableTabs.push('sold')
    }
    if (mintedNfts.length > 0) {
      availableTabs.push('minted')
    }
    if (burnedNfts.length > 0) {
      availableTabs.push('burned')
    }

    if (availableTabs.length === 0) return
    if (nftTab === 'owned' && !effectiveLedgerTimestamp) return

    if (!availableTabs.includes(nftTab)) {
      setNftTab(availableTabs[0])
    }
  }, [nftTab, ownedNfts.length, soldNfts.length, mintedNfts.length, burnedNfts.length, effectiveLedgerTimestamp])

  useEffect(() => {
    setExpandedDexOrderKey(null)
    setDexOrdersDisplayLimit(OBJECT_PREVIEW_LIMIT)
  }, [data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    setExpandedNftCardKey(null)
  }, [nftTab])

  useEffect(() => {
    setExpandedNftOfferKey(null)
    setNftOffersDisplayLimit(NFT_OFFERS_PREVIEW_LIMIT)
  }, [nftOffersTab])

  useEffect(() => {
    const availableOfferTabs = []
    if (hasReceivedPrivateNftOffers) {
      availableOfferTabs.push('received')
    }
    if (hasCreatedNftOffers) {
      availableOfferTabs.push('created')
    }
    if (hasOwnedNftOffers) {
      availableOfferTabs.push('owned')
    }

    if (availableOfferTabs.length > 0 && !availableOfferTabs.includes(nftOffersTab)) {
      setNftOffersTab(availableOfferTabs[0])
    }
  }, [nftOffersTab, hasReceivedPrivateNftOffers, hasCreatedNftOffers, hasOwnedNftOffers])

  useEffect(() => {
    setExpandedIssuedToken(null)
    setExpandedCheckKey(null)
    setExpandedEscrowKey(null)
    setExpandedPaychannelKey(null)
    setShowIssuerSettingsDetails(false)
    setChecksTab('received')
    setEscrowsTab('received')
    setPaychannelsTab('incoming')
    setShowTxSettingsDetails(false)
    setShowAccountControlDetails(false)
  }, [data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    if (!showChecksTabs && checksTab === 'sent' && !hasSentChecks) {
      setChecksTab('received')
    }
    if (!showChecksTabs && checksTab === 'received' && !hasReceivedChecks && hasSentChecks) {
      setChecksTab('sent')
    }
  }, [showChecksTabs, checksTab, hasSentChecks, hasReceivedChecks])

  useEffect(() => {
    setExpandedCheckKey(null)
    setChecksDisplayLimit(OBJECT_PREVIEW_LIMIT)
  }, [checksTab, data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    if (availableEscrowsTabs.length === 0) return
    if (!availableEscrowsTabs.includes(escrowsTab)) {
      setEscrowsTab(availableEscrowsTabs[0])
    }
  }, [availableEscrowsTabs, escrowsTab])

  useEffect(() => {
    setExpandedEscrowKey(null)
    setEscrowsDisplayLimit(OBJECT_PREVIEW_LIMIT)
  }, [escrowsTab, data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    if (!showPaychannelsTabs && paychannelsTab === 'outgoing' && !hasOutgoingPaychannels) {
      setPaychannelsTab('incoming')
    }
    if (!showPaychannelsTabs && paychannelsTab === 'incoming' && !hasIncomingPaychannels && hasOutgoingPaychannels) {
      setPaychannelsTab('outgoing')
    }
  }, [showPaychannelsTabs, paychannelsTab, hasOutgoingPaychannels, hasIncomingPaychannels])

  useEffect(() => {
    setExpandedPaychannelKey(null)
    setPaychannelsDisplayLimit(OBJECT_PREVIEW_LIMIT)
  }, [paychannelsTab, data?.address, effectiveLedgerTimestamp])

  // Fetch tokens
  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated) {
      setObjectsLoading(false)
      setObjectsError(null)
      resetAccountObjectCollections()
      setSoldNftsLoading(false)
      setMintedNftsLoading(false)
      setBurnedNftsLoading(false)
      return
    }

    const fetchTokens = async () => {
      setObjectsLoading(true)
      setObjectsError(null)
      resetAccountObjectCollections()
      setSoldNftsLoading(false)
      setMintedNftsLoading(false)
      setBurnedNftsLoading(false)

      try {
        const objectsUrl =
          `v2/objects/${data.address}?limit=1000&priceNativeCurrencySpot=true&currencyDetails=true` +
          (effectiveLedgerTimestamp
            ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
            : '')

        const response = await axios.get(objectsUrl)
        const accountObjects = response?.data?.objects || []

        let accountObjectWithChecks = accountObjects.filter((node) => node.LedgerEntryType === 'Check') || []
        accountObjectWithChecks = accountObjectWithChecks.sort((a, b) => {
          const issuerCompare = (a.SendMax?.issuer || '') === (b.SendMax?.issuer || '') ? 0 : a.SendMax?.issuer ? 1 : -1
          if (issuerCompare !== 0) return issuerCompare

          const destinationCompare = (a.Destination || '').localeCompare(b.Destination || '')
          if (destinationCompare !== 0) return destinationCompare

          const valueA = Number(a.SendMax?.value || a.SendMax) || 0
          const valueB = Number(b.SendMax?.value || b.SendMax) || 0

          return valueB - valueA
        })

        setReceivedChecks(accountObjectWithChecks.filter((node) => node.Destination === data.address))
        setSentChecks(accountObjectWithChecks.filter((node) => node.Account === data.address))

        const accountObjectWithPaychannels =
          accountObjects.filter((node) => node.LedgerEntryType === 'PayChannel') || []
        setOutgoingPaychannels(accountObjectWithPaychannels.filter((node) => node.Account === data.address))
        setIncomingPaychannels(accountObjectWithPaychannels.filter((node) => node.Destination === data.address))

        const accountObjectWithEscrows = accountObjects.filter((node) => node.LedgerEntryType === 'Escrow') || []
        setReceivedEscrows(
          accountObjectWithEscrows.filter((node) => node.Destination === data.address && node.Account !== data.address)
        )
        setSentEscrows(
          accountObjectWithEscrows.filter((node) => node.Account === data.address && node.Destination !== data.address)
        )
        setSelfEscrows(
          accountObjectWithEscrows.filter((node) => node.Account === data.address && node.Destination === data.address)
        )

        const accountObjectWithDepositPreauth =
          accountObjects.filter((node) => node.LedgerEntryType === 'DepositPreauth' && node.Authorize) || []
        setDepositPreauthAccounts(accountObjectWithDepositPreauth)

        const accountObjectWithHooks = accountObjects.find((node) => node.LedgerEntryType === 'Hook')
        if (accountObjectWithHooks?.Hooks?.length > 0) {
          const hooks = accountObjectWithHooks.Hooks.map((hookNode) => hookNode?.Hook?.HookHash).filter(Boolean)
          setHookList(hooks)
        } else {
          setHookList([])
        }

        const accountHeldMpts = accountObjects.filter((node) => node.LedgerEntryType === 'MPToken') || []
        const accountIssuedMpts = accountObjects.filter((node) => node.LedgerEntryType === 'MPTokenIssuance') || []
        setHeldMpts(accountHeldMpts)
        setIssuedMpts(accountIssuedMpts)

        const accountObjectWithDexOrders =
          accountObjects
            .filter((node) => node.LedgerEntryType === 'Offer' && node.Account === data.address)
            .sort((a, b) => Number(b.Sequence || 0) - Number(a.Sequence || 0)) || []
        setDexOrders(accountObjectWithDexOrders)

        const nftIds = accountObjects
          .filter((node) => node.LedgerEntryType === 'NFTokenPage' && Array.isArray(node.NFTokens))
          .flatMap((page) =>
            page.NFTokens.map((nftNode) => nftNode?.NFToken?.NFTokenID || nftNode?.NFTokenID).filter(Boolean)
          )

        setOwnedNftIds(nftIds)

        const nftResource = xahauNetwork ? 'uritokens' : 'nfts'

        if (!effectiveLedgerTimestamp && (nftIds.length > 0 || xahauNetwork)) {
          try {
            const nftPreviewUrl = `v2/${nftResource}?owner=${data.address}&order=mintedNew&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}`

            const nftResponse = await axios.get(nftPreviewUrl)
            const ownedNftsList = Array.isArray(nftResponse?.data?.[nftResource]) ? nftResponse.data[nftResource] : []
            setOwnedNfts(ownedNftsList.slice(0, NFT_FETCH_LIMIT))
            setNftMarkers((prev) => ({ ...prev, owned: nftResponse?.data?.marker || null }))
          } catch {
            setOwnedNfts([])
          }
        } else {
          setOwnedNfts([])
        }

        try {
          setSoldNftsLoading(true)
          const soldNftsUrl =
            `v2/nft-sales?seller=${data.address}&list=lastSold&limit=${NFT_FETCH_LIMIT}` +
            (selectedCurrency
              ? `&convertCurrencies=${selectedCurrency.toLowerCase()}&sortCurrency=${selectedCurrency.toLowerCase()}`
              : '') +
            (effectiveLedgerTimestamp && data?.inception
              ? `&period=${encodeURIComponent(new Date(data.inception * 1000).toISOString())}..${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
              : '')
          const soldResponse = await axios.get(soldNftsUrl)
          const soldPayload = soldResponse?.data || {}
          const { soldList, soldTotalCount } = parseSoldNftsPayload(soldPayload, NFT_FETCH_LIMIT)
          setSoldNfts(soldList)
          setSoldNftsTotalCount(soldTotalCount)
          setNftMarkers((prev) => ({ ...prev, sold: soldResponse?.data?.marker || null }))
        } catch {
          setSoldNfts([])
          setSoldNftsTotalCount(null)
        } finally {
          setSoldNftsLoading(false)
        }

        const shouldFetchMintedNfts = xahauNetwork
          ? Boolean(data?.ledgerInfo?.flags?.uriTokenIssuer)
          : Number(data?.ledgerInfo?.mintedNFTokens || 0) > 0

        if (shouldFetchMintedNfts) {
          try {
            setMintedNftsLoading(true)
            const mintedNftResource = xahauNetwork ? 'uritokens' : 'nfts'
            const mintedNftsUrl =
              `v2/${mintedNftResource}?issuer=${data.address}&order=mintedNew&includeDeleted=true&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}` +
              (effectiveLedgerTimestamp
                ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
                : '')
            const mintedResponse = await axios.get(mintedNftsUrl)
            const mintedNftsList = Array.isArray(mintedResponse?.data?.[mintedNftResource])
              ? mintedResponse.data[mintedNftResource]
              : []
            setMintedNfts(mintedNftsList.slice(0, NFT_FETCH_LIMIT))
            setNftMarkers((prev) => ({ ...prev, minted: mintedResponse?.data?.marker || null }))
          } catch {
            setMintedNfts([])
          } finally {
            setMintedNftsLoading(false)
          }
        } else {
          setMintedNfts([])
          setMintedNftsLoading(false)
        }

        if (Number(data?.ledgerInfo?.burnedNFTokens || 0) > 0) {
          try {
            setBurnedNftsLoading(true)
            const burnedNftsUrl =
              `v2/nfts?issuer=${data.address}&order=mintedNew&includeDeleted=true&deletedAt=all&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}` +
              (effectiveLedgerTimestamp
                ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
                : '')
            const burnedResponse = await axios.get(burnedNftsUrl)
            const burnedNftsList = Array.isArray(burnedResponse?.data?.nfts) ? burnedResponse.data.nfts : []
            setBurnedNfts(burnedNftsList.slice(0, NFT_FETCH_LIMIT))
            setNftMarkers((prev) => ({ ...prev, burned: burnedResponse?.data?.marker || null }))
          } catch {
            setBurnedNfts([])
          } finally {
            setBurnedNftsLoading(false)
          }
        } else {
          setBurnedNfts([])
          setBurnedNftsLoading(false)
        }

        // Filter RippleState objects (tokens) using the same legacy predicate as /account ObjectsData.
        const rippleStateList = isGateway
          ? []
          : accountObjects.filter((node) => isRelevantRippleStateForAddress(node, data.address))

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
        setObjectsError(error?.message || 'Failed to load account objects')
        resetAccountObjectCollections()
        setSoldNftsLoading(false)
        setMintedNftsLoading(false)
        setBurnedNftsLoading(false)
      } finally {
        setObjectsLoading(false)
      }
    }

    fetchTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address, data?.ledgerInfo?.activated, effectiveLedgerTimestamp, selectedCurrency, refreshPage])

  useEffect(() => {
    if (!data?.address) return

    const fetchIssuedTokens = async () => {
      setIssuedTokens([])
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
  }, [data?.address, effectiveLedgerTimestamp, refreshPage])

  useEffect(() => {
    nftOffersRequestTokenRef.current += 1
    transactionsRequestTokenRef.current += 1

    setReceivedPrivateNftOffers([])
    setCreatedNftOffers([])
    setOwnedNftOffers([])
    setNftOffersError({ received: null, created: null, owned: null })
    setNftOffersLoading({ received: false, created: false, owned: false })

    setRecentTransactions([])
    setTransactionsMarker(null)
    setTransactionsSearchPaused(false)
    setTransactionsError(null)
  }, [data?.address, effectiveLedgerTimestamp, refreshPage])

  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated || effectiveLedgerTimestamp) return

    let cancelled = false
    const requestToken = nftOffersRequestTokenRef.current

    const fetchOfferList = async ({ tabKey, list }) => {
      setNftOffersLoading((prev) => ({ ...prev, [tabKey]: true }))
      setNftOffersError((prev) => ({ ...prev, [tabKey]: null }))

      try {
        const listParam = list ? `&list=${list}` : ''
        const response = await axios.get(
          `v2/nft-offers/${data.address}?nftoken=true&offersValidate=true&limit=${NFT_OFFERS_FETCH_LIMIT}${listParam}`
        )

        const offers = Array.isArray(response?.data?.nftOffers)
          ? response.data.nftOffers
              .filter((offer) => offer?.valid !== false)
              .sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0))
              .slice(0, NFT_OFFERS_FETCH_LIMIT)
          : []

        if (cancelled || nftOffersRequestTokenRef.current !== requestToken) return

        if (tabKey === 'received') {
          setReceivedPrivateNftOffers(offers)
        } else if (tabKey === 'created') {
          setCreatedNftOffers(offers)
        } else {
          setOwnedNftOffers(offers)
        }
      } catch (error) {
        if (cancelled || nftOffersRequestTokenRef.current !== requestToken) return

        if (tabKey === 'received') {
          setReceivedPrivateNftOffers([])
        } else if (tabKey === 'created') {
          setCreatedNftOffers([])
        } else {
          setOwnedNftOffers([])
        }

        setNftOffersError((prev) => ({ ...prev, [tabKey]: error?.message || 'Failed to load NFT offers' }))
      } finally {
        if (!cancelled && nftOffersRequestTokenRef.current === requestToken) {
          setNftOffersLoading((prev) => ({ ...prev, [tabKey]: false }))
        }
      }
    }

    fetchOfferList({ tabKey: 'received', list: 'privatelyOfferedToAddress' })
    fetchOfferList({ tabKey: 'created' })
    fetchOfferList({ tabKey: 'owned', list: 'counterOffers' })

    return () => {
      cancelled = true
    }
  }, [data?.address, data?.ledgerInfo?.activated, effectiveLedgerTimestamp, refreshPage])

  const buildTransactionsUrl = ({ markerValue, filtersOverride, limit } = {}) => {
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
    params.set('limit', String(limit || TRANSACTIONS_PREVIEW_LIMIT))
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
      pathname: `/account/${data.address}`,
      query: {
        ledgerTimestamp: new Date(ledgerTimestampInput).toISOString()
      }
    })
  }

  const resetTimeMachine = () => {
    if (!data?.address) return
    setLedgerTimestampInput(new Date())
    router.push({
      pathname: `/account/${data.address}`
    })
  }

  const fetchRecentTransactions = async ({ markerValue = null, append = false, filtersOverride } = {}) => {
    if (!data?.address) return
    const requestToken = transactionsRequestTokenRef.current

    if (append) {
      setTransactionsLoadingMore(true)
    } else {
      setTransactionsLoading(true)
    }

    setTransactionsError(null)
    setTransactionsSearchPaused(false)

    try {
      const limit = append ? TRANSACTIONS_LOAD_MORE_LIMIT : TRANSACTIONS_PREVIEW_LIMIT
      const response = await axios.get(buildTransactionsUrl({ markerValue, filtersOverride, limit }))
      if (transactionsRequestTokenRef.current !== requestToken) return
      const newTransactions = response?.data?.transactions || []
      const nextMarker = response?.data?.marker || null
      const reachedSearchLimit = newTransactions.length === 0 && !!nextMarker

      if (newTransactions.length > 0) {
        if (append) {
          setRecentTransactions((prev) => [...prev, ...newTransactions])
        } else {
          setRecentTransactions(newTransactions)
        }
      } else if (!append) {
        setRecentTransactions([])
      }

      setTransactionsMarker(nextMarker)
      setTransactionsSearchPaused(reachedSearchLimit)
    } catch (error) {
      if (transactionsRequestTokenRef.current !== requestToken) return
      setTransactionsError(error?.message || 'Failed to load transactions')
      if (!append) {
        setRecentTransactions([])
        setTransactionsMarker(null)
      }
      setTransactionsSearchPaused(false)
    } finally {
      if (transactionsRequestTokenRef.current !== requestToken) return
      if (append) {
        setTransactionsLoadingMore(false)
      } else {
        setTransactionsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!data?.address) return
    fetchRecentTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data?.address,
    selectedCurrency,
    effectiveLedgerTimestamp,
    isMobile,
    data?.ledgerInfo?.previousTxnID,
    refreshPage
  ])

  const loadMoreTransactions = async () => {
    if (
      !data?.address ||
      !transactionsMarker ||
      transactionsLoadingMore ||
      transactionsLoading ||
      transactionsSearchPaused
    )
      return
    fetchRecentTransactions({ markerValue: transactionsMarker, append: true })
  }

  const continueTransactionsSearch = () => {
    if (!data?.address || !transactionsMarker || transactionsLoadingMore || transactionsLoading) return
    fetchRecentTransactions({ markerValue: transactionsMarker, append: true })
  }

  const transactionsEndMessage =
    transactionsSearchPaused && transactionsMarker ? (
      <>
        It takes too long to find relevant transactions. Searched up to ledger{' '}
        <span className="bold">{transactionsMarker?.ledger || 'unknown'}</span>.
        <br />
        <br />
        <button
          type="button"
          className="button-outline"
          onClick={continueTransactionsSearch}
          disabled={transactionsLoadingMore || transactionsLoading}
        >
          Continue searching
        </button>
        {transactionsLoadingMore && (
          <>
            <br />
            <br />
            <span className="waiting"></span>
          </>
        )}
      </>
    ) : (
      transactionsError
    )

  const transactionsLoadMoreMessage = transactionsLoadingMore ? (
    <button type="button" className="button-outline" disabled>
      Loading
      <span className="waiting inline" aria-hidden="true"></span>
    </button>
  ) : (
    <button
      type="button"
      className="button-outline"
      onClick={loadMoreTransactions}
      disabled={transactionsLoadingMore || transactionsLoading}
    >
      Load more transactions
    </button>
  )

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

  const lastSubmittedTxHash = data?.ledgerInfo?.lastSubmittedTxHash
  const statusTimeAgoNode = data?.ledgerInfo?.lastSubmittedAt ? (
    lastSubmittedTxHash ? (
      <Link href={`/transaction/${lastSubmittedTxHash}`}>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</Link>
    ) : (
      <span>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</span>
    )
  ) : null

  const accountStatusNode = isBlackholed ? (
    <>
      <span className="orange bold">Blackholed</span> {statusTimeAgoNode}
    </>
  ) : data?.ledgerInfo?.activated ? (
    data?.ledgerInfo?.lastSubmittedAt ? (
      <>
        <span className="green">Active</span> {statusTimeAgoNode}
      </>
    ) : (
      <>
        <span>Activated</span> <span>{data?.inception ? timeFromNow(data.inception, i18n) : ''}</span>
      </>
    )
  ) : isDeletedAccount ? (
    <span className="red bold">This account was deleted</span>
  ) : isNotActivatedAccount ? (
    <span className="orange">Not activated</span>
  ) : (
    <>
      <span className="orange">Network error</span> <span>Please try again later.</span>
    </>
  )

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
    !isHistoricalLedger &&
    !!(data?.xamanMeta?.xummProfile?.slug || data?.xamanMeta?.kycApproved || xamanOwnerAlias || showXamanAccountAlias)
  const xamanRows = []

  if (data?.xamanMeta?.xummProfile?.slug) {
    xamanRows.push({
      key: 'pro',
      label: 'Alias:',
      value: (
        <a href={data.xamanMeta.xummProfile.profileUrl} className="green" target="_blank" rel="noopener nofollow">
          {data.xamanMeta.xummProfile.slug}
        </a>
      )
    })
  }

  if (xamanOwnerAlias) {
    xamanRows.push({ key: 'owner-alias', label: 'Owner:', value: xamanOwnerAlias })
  }

  if (showXamanAccountAlias) {
    xamanRows.push({ key: 'account-alias', label: 'Account:', value: xamanAccountAlias })
  }

  if (data?.xamanMeta?.kycApproved) {
    xamanRows.push({ key: 'kyc', label: 'KYC:', value: <span className="green">verified</span> })
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
    const isValidDomain = isDomainValid(domainText)
    const showUnverified =
      isValidDomain &&
      !data.verifiedDomain &&
      (!data.service?.domain || !data.ledgerInfo.domain.toLowerCase().includes(data.service.domain.toLowerCase()))
    const domainActionButtons = canManageDomain ? (
      <span className="no-brake">
        <span className="tooltip tooltip-icon" style={{ marginLeft: 5 }}>
          <span
            style={{ fontSize: 16, marginBottom: -3, display: 'inline-flex' }}
            onClick={() =>
              setSignRequest({
                action: 'setDomain',
                redirect: 'account',
                request: {
                  TransactionType: 'AccountSet',
                  Account: data?.address
                }
              })
            }
          >
            <FaPencil />
          </span>
          <span className="tooltiptext no-brake">Edit</span>
        </span>{' '}
        <span className="tooltip tooltip-icon">
          <span
            className="red"
            style={{ fontSize: 18, marginBottom: -4, display: 'inline-flex' }}
            onClick={() =>
              setSignRequest({
                redirect: 'account',
                request: {
                  TransactionType: 'AccountSet',
                  Domain: '',
                  Account: data?.address
                }
              })
            }
          >
            <MdDeleteForever />
          </span>
          <span className="tooltiptext no-brake">Remove</span>
        </span>
      </span>
    ) : null

    pushPublicRow(
      'Domain',
      isValidDomain ? (
        <span>
          <a
            href={`https://${domainText}`}
            className={data.verifiedDomain ? 'green bold' : ''}
            target="_blank"
            rel="noopener nofollow"
          >
            {domainText}
          </a>{' '}
          {data.verifiedDomain && (
            <span
              className="blue tooltip"
              style={{
                display: 'inline-block',
                verticalAlign: 'middle'
              }}
            >
              <MdVerified />
              <span className="tooltiptext right small no-brake">TOML Verified Domain</span>
            </span>
          )}{' '}
          {showUnverified && <span className="grey">(unverified)</span>}
          {domainActionButtons}
        </span>
      ) : (
        <>
          <code className="code-highlight">{data.ledgerInfo.domain}</code>
          {domainActionButtons}
        </>
      )
    )
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
          {data?.inceptionTxHash ? (
            <Link href={`/transaction/${data.inceptionTxHash}`} onClick={(event) => event.stopPropagation()}>
              <span className="bold">{activatedRelativeToSelectedTime || timeFromNow(data.inception, i18n)}</span>
            </Link>
          ) : (
            <span className="bold">{activatedRelativeToSelectedTime || timeFromNow(data.inception, i18n)}</span>
          )}
          <span className="tooltiptext right no-brake activation-tooltip" suppressHydrationWarning>
            {activationTimeText}
          </span>
        </span>
        {activatedByName && activatedByAddress && (
          <>
            {' '}
            by{' '}
            <Link href={`/account/${activatedByAddress}`} onClick={(event) => event.stopPropagation()}>
              <span
                className={`activated-by ${activatedByIsService ? 'green' : ''} ${activatedByIsUsername ? 'blue' : ''}`}
              >
                <span className="tooltip no-brake">
                  {activatedByName}
                  <span className="tooltiptext right no-brake activation-tooltip">{shortHash(activatedByAddress)}</span>
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

  if (data?.parent?.address && data?.parent?.address === data?.address) {
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
        <SEO title="Account error" />
        <div className="center">
          <br />
          <br />
          <div className="orange bold">{errorT(t, initialErrorMessage)}</div>
          <br />
          <br />
          <Link href="/" className="button-action">
            Go Home
          </Link>
          <br />
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
        page="Account"
        title={
          (data.service?.name || data.username || data.address) +
          (data?.ledgerInfo?.balance > 1000000
            ? ' - ' + shortNiceNumber(data.ledgerInfo.balance / 1000000, 2, 0) + ' ' + nativeCurrency
            : '')
        }
        description={
          'Account details, transactions, NFTs, Tokens for ' +
          (data.service?.name || data.username || '') +
          ' ' +
          data.address
        }
        image={{ file: avatarSrc(data.address, refreshPage) }}
      />

      <div className="account-container">
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
        <div className="account-grid">
          {/* Column 1: Information */}
          <div className="info-section">
            {/* Avatar */}
            <div className="avatar-container">
              <div className="avatar-wrapper">
                <div className={`avatar-image-mask ${accountDisplayUsername ? 'has-username' : ''}`}>
                  <img src={avatarSrc(data.address, refreshPage)} alt="Avatar" className="account-avatar" />
                </div>
                {!data?.blacklist?.blacklisted && achievements.length > 0 && (
                  <div className={`achievements-orbit achievements-count-${Math.min(achievements.length, 6)}`}>
                    {achievements.slice(0, 6).map((achievement, index) => {
                      const isLeft = index % 2 === 0
                      return (
                        <span
                          className={`tooltip achievement-badge achievement-badge-${index + 1}`}
                          key={achievement.key}
                        >
                          <img
                            src={`/images/account/achivments/${achievement.image}`}
                            alt={achievement.tooltip}
                            className="achievement-image"
                          />
                          <span className={`tooltiptext ${isLeft ? 'right' : 'left'} no-brake`}>
                            {achievement.tooltip}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="account-info">
              <h2 className="account-name">
                <span className="account-username">
                  {accountDisplayName}
                  {!accountAmmId && !!accountDisplayUsername && <CopyButton text={accountDisplayUsername} />}
                </span>
              </h2>
              <div style={{ fontSize: '13px' }}>{accountStatusNode}</div>
              {data.service?.domain && (
                <div className="account-domain grey">
                  <a
                    href={
                      /^https?:\/\//i.test(data.service.domain) ? data.service.domain : `https://${data.service.domain}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {stripDomain(data.service.domain)}
                  </a>
                </div>
              )}
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
            </div>

            {/* Social icons */}
            {socialAccountsNode && <div className="social-icons-wrapper">{socialAccountsNode}</div>}

            {(shouldShowUsernameRegisterButton || shouldShowSetAvatarButton || shouldShowSignInIdentityButton) && (
              <div className="identity-actions-wrap">
                {shouldShowUsernameRegisterButton && (
                  <a href={`/username?address=${data.address}`} className="get-first-native-btn">
                    ⚡ Grab your username now
                  </a>
                )}

                {shouldShowSetAvatarButton && (
                  <button
                    type="button"
                    className="get-first-native-btn"
                    onClick={() =>
                      setSignRequest({
                        action: 'setAvatar',
                        request: {
                          TransactionType: 'AccountSet',
                          Account: data.address
                        },
                        data: {
                          signOnly: true,
                          action: 'set-avatar'
                        }
                      })
                    }
                  >
                    🖼️ Set an Avatar
                  </button>
                )}

                {shouldShowSignInIdentityButton && (
                  <button
                    type="button"
                    className="get-first-native-btn"
                    onClick={() =>
                      setSignRequest({
                        redirect: 'account'
                      })
                    }
                  >
                    <FaWallet style={{ fontSize: 14, marginRight: 6 }} /> Connect
                  </button>
                )}
              </div>
            )}

            {didData && (
              <div className="cards-list info-cards-list">
                <div
                  className={`asset-item token-asset-item ${expandedDidCard ? 'expanded' : ''}`}
                  onClick={() => setExpandedDidCard((prev) => !prev)}
                >
                  <div className="asset-main">
                    <div className="asset-logo">
                      <div className="nft-asset-info">
                        <div className="nft-asset-text">
                          <div className="asset-summary-title">DID</div>
                          <div className="asset-fiat">{didCollapsedUrl || shortHash(didData?.didID || '')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="asset-value">
                      {didCollapsedAgo && (
                        <div className="asset-fiat">
                          {didCollapsedAgoLabel} {didCollapsedAgo}
                        </div>
                      )}
                    </div>
                  </div>

                  {expandedDidCard && (
                    <div className="asset-details">
                      <div className="detail-row">
                        <span>DID ID:</span>
                        <span className="copy-inline">
                          <span>{didData?.didID ? shortHash(didData.didID) : '-'}</span>
                          {!!didData?.didID && (
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={didData.didID} />
                            </span>
                          )}
                        </span>
                      </div>

                      {!!didCreatedFull && (
                        <div className="detail-row">
                          <span>Created:</span>
                          <span>
                            {didCreatedFull}
                            {didData?.createdTxHash && (
                              <>
                                {' '}
                                <Link
                                  href={`/transaction/${didData.createdTxHash}`}
                                  className="inline-link-icon tooltip"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <LinkIcon />
                                  <span className="tooltiptext no-brake">Created transaction</span>
                                </Link>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {!!didUpdatedFull && didData?.updatedAt !== didData?.createdAt && (
                        <div className="detail-row">
                          <span>Updated:</span>
                          <span>
                            {didUpdatedFull}
                            {didData?.updatedTxHash && (
                              <>
                                {' '}
                                <Link
                                  href={`/transaction/${didData.updatedTxHash}`}
                                  className="inline-link-icon tooltip"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <LinkIcon />
                                  <span className="tooltiptext no-brake">Updated transaction</span>
                                </Link>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {!!didUrl && (
                        <div className="detail-row">
                          <span>URL:</span>
                          <span>
                            {isUrlValid(didUrl) ? (
                              <a
                                href={didUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {didUrl}
                              </a>
                            ) : (
                              <span className="address-text">{didUrl}</span>
                            )}
                          </span>
                        </div>
                      )}

                      {!!didDecodedData && (
                        <div className="detail-row">
                          <span>Data:</span>
                          <span className="address-text">{didDecodedData}</span>
                        </div>
                      )}

                      {!!didDecodedDocument && (
                        <div className="detail-row">
                          <span>DID Document:</span>
                          <span className="address-text">{didDecodedDocument}</span>
                        </div>
                      )}

                      {!!didMetadataNode && (
                        <>
                          <div className="detail-row">
                            <span>Metadata:</span>
                          </div>
                          <div>{didMetadataNode}</div>
                        </>
                      )}

                      {canManageDid && (
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="card-action-btn redeem"
                            onClick={() =>
                              setSignRequest({
                                action: 'setDid',
                                redirect: 'account',
                                request: {
                                  TransactionType: 'DIDSet',
                                  Account: data?.address
                                }
                              })
                            }
                          >
                            Update DID
                          </button>
                          <button
                            type="button"
                            className="card-action-btn cancel"
                            onClick={() =>
                              setSignRequest({
                                redirect: 'account',
                                request: {
                                  TransactionType: 'DIDDelete',
                                  Account: data?.address
                                }
                              })
                            }
                          >
                            Delete DID
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

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

            <div className="cards-list info-cards-list">
              {hasAccountControlData && (
                <div className="time-machine-card account-control-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showAccountControlDetails ? 'active' : ''}`}
                    onClick={() => setShowAccountControlDetails((prev) => !prev)}
                  >
                    Account control
                    <span className={`account-control-collapsed${isBlackholed ? ' orange bold' : ''}`}>
                      {' '}
                      · {accountControlCollapsedLabel}
                    </span>
                  </button>

                  {showAccountControlDetails && (
                    <div className="time-machine-panel account-control-panel">
                      {data?.ledgerInfo?.regularKey && (
                        <div className="detail-row issuer-detail-row">
                          <span>Regular key:</span>
                          <span className="control-address-wrap">
                            <span className="copy-inline">
                              <AddressWithIconInline data={data.ledgerInfo} name="regularKey" options={{ short: 6 }} />
                              <span onClick={(event) => event.stopPropagation()}>
                                <CopyButton text={data.ledgerInfo.regularKey} />
                              </span>
                            </span>
                          </span>
                        </div>
                      )}

                      {data?.ledgerInfo?.flags?.passwordSpent && (
                        <div className="detail-row issuer-detail-row">
                          <span>Free re-key:</span>
                          <span>spent</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.signerList && (
                        <>
                          <div className="detail-row issuer-detail-row">
                            <span>Multi-sign:</span>
                            <span className="green">enabled</span>
                          </div>

                          {data?.ledgerInfo?.signerList?.signerQuorum && (
                            <div className="detail-row issuer-detail-row">
                              <span>Multi-sign threshold:</span>
                              <span>{data.ledgerInfo.signerList.signerQuorum}</span>
                            </div>
                          )}

                          {Array.isArray(data?.ledgerInfo?.signerList?.signerEntries) &&
                            data.ledgerInfo.signerList.signerEntries.map((signer, signerIndex) => (
                              <div key={`signer-group-${signerIndex}`}>
                                <div className="detail-row issuer-detail-row">
                                  <span>
                                    Signer #{signerIndex + 1} (weight {signer?.signerWeight || 0}):
                                  </span>
                                  <span className="control-address-wrap">
                                    <span className="copy-inline">
                                      <AddressWithIconInline data={signer} name="account" options={{ short: 6 }} />
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={signer?.account} />
                                      </span>
                                    </span>
                                  </span>
                                </div>
                              </div>
                            ))}
                        </>
                      )}

                      {data?.ledgerInfo?.flags?.disableMaster && (
                        <div className="detail-row issuer-detail-row">
                          <span>Master key:</span>
                          <span className="red">disabled</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasDepositPreauthAccounts && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showDepositPreauthDetails ? 'active' : ''}`}
                    onClick={() => setShowDepositPreauthDetails((prev) => !prev)}
                  >
                    Deposit preauthorized accounts
                    <span className="account-control-collapsed"> · {depositPreauthAccounts.length}</span>
                  </button>

                  {showDepositPreauthDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {depositPreauthAccounts.map((node, index) => (
                        <div className="detail-row issuer-detail-row" key={`${node?.index || 'preauth'}-${index}`}>
                          <span>#{index + 1}:</span>
                          <span className="copy-inline">
                            <AddressWithIconInline
                              data={{ address: node?.Authorize, addressDetails: node?.authorizeDetails || {} }}
                              options={{ short: 6 }}
                            />
                            {node?.Authorize && (
                              <span onClick={(event) => event.stopPropagation()}>
                                <CopyButton text={node.Authorize} />
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {shouldShowXahauRewardCard && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showXahauRewardDetails ? 'active' : ''}`}
                    onClick={() => setShowXahauRewardDetails((prev) => !prev)}
                  >
                    Reward
                    <span
                      className={`account-control-collapsed${isXahauRewardClaimable ? ' orange bold' : !hasXahauRewardsConfigured ? ' dimmed' : ''}`}
                    >
                      {' '}
                      · {xahauRewardCollapsedAmountText}
                      {!!xahauRewardCollapsedTimeNode && <> · {xahauRewardCollapsedTimeNode}</>}
                    </span>
                  </button>

                  {showXahauRewardDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      <div className="detail-row issuer-detail-row">
                        <span>Reward:</span>
                        <span>
                          {hasXahauRewardsConfigured ? (
                            <>
                              <span className="green">{amountFormat(xahauRewardAmount, { maxFractionDigits: 6 })}</span>{' '}
                              {tokenToFiat({
                                amount: xahauRewardAmount,
                                selectedCurrency,
                                fiatRate: pageFiatRate
                              })}
                            </>
                          ) : (
                            <span className="grey">Not set</span>
                          )}
                        </span>
                      </div>

                      {hasXahauRewardsConfigured && (
                        <div className="detail-row issuer-detail-row">
                          <span>Claimable:</span>
                          <span>{fullDateAndTime(xahauRewardClaimableAt)}</span>
                        </div>
                      )}

                      <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                        {hasXahauRewardsConfigured ? (
                          <>
                            {data.address === account?.address && (
                              <button
                                type="button"
                                className="card-action-btn cancel"
                                onClick={() => {
                                  setSignRequest({
                                    request: {
                                      TransactionType: 'ClaimReward',
                                      Account: data.address,
                                      Flags: 1
                                    }
                                  })
                                }}
                              >
                                Rewards Opt-out
                              </button>
                            )}
                            {!account?.address && data.address !== account?.address && (
                              <button
                                type="button"
                                className="card-action-btn redeem"
                                onClick={() => {
                                  setSignRequest({})
                                }}
                              >
                                Sign in to opt-out
                              </button>
                            )}
                            {isXahauRewardClaimable && (
                              <>
                                {data.address === account?.address && (
                                  <button
                                    type="button"
                                    className="card-action-btn redeem"
                                    onClick={() => {
                                      setSignRequest({
                                        request: {
                                          TransactionType: 'ClaimReward',
                                          Issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                                          Account: data.address
                                        }
                                      })
                                    }}
                                  >
                                    <TbPigMoney style={{ fontSize: 16, marginBottom: -3 }} /> Claim now
                                  </button>
                                )}
                                {!account?.address && data.address !== account?.address && (
                                  <button
                                    type="button"
                                    className="card-action-btn redeem"
                                    onClick={() => {
                                      setSignRequest({})
                                    }}
                                  >
                                    <TbPigMoney style={{ fontSize: 16, marginBottom: -3 }} /> Sign in to claim
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {data.address === account?.address && (
                              <button
                                type="button"
                                className="card-action-btn redeem"
                                onClick={() => {
                                  setSignRequest({
                                    request: {
                                      TransactionType: 'ClaimReward',
                                      Issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                                      Account: data.address
                                    }
                                  })
                                }}
                              >
                                Rewards Opt-in
                              </button>
                            )}
                            {!account?.address && data.address !== account?.address && (
                              <button
                                type="button"
                                className="card-action-btn redeem"
                                onClick={() => {
                                  setSignRequest({})
                                }}
                              >
                                Sign in to opt-in
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasHooks && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showHooksDetails ? 'active' : ''}`}
                    onClick={() => setShowHooksDetails((prev) => !prev)}
                  >
                    Hooks
                    <span className="account-control-collapsed"> · {hookList.length}</span>
                  </button>

                  {showHooksDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {!!data?.ledgerInfo?.hookNamespaces?.length && (
                        <div className="detail-row issuer-detail-row">
                          <span>Hook namespaces:</span>
                          <span>{data.ledgerInfo.hookNamespaces.length}</span>
                        </div>
                      )}
                      {(data?.ledgerInfo?.hookStateCount || data?.ledgerInfo?.hookStateCount === 0) && (
                        <div className="detail-row issuer-detail-row">
                          <span>Hook state count:</span>
                          <span>{data.ledgerInfo.hookStateCount}</span>
                        </div>
                      )}
                      {hookList.map((hookHash, index) => (
                        <div className="detail-row issuer-detail-row" key={`${hookHash}-${index}`}>
                          <span>Hook #{index + 1}:</span>
                          <span className="copy-inline">
                            <span>{hookNameText(hookHash)}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={hookHash} />
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasCronData && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showCronDetails ? 'active' : ''}`}
                    onClick={() => setShowCronDetails((prev) => !prev)}
                  >
                    Cron
                  </button>

                  {showCronDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {data?.ledgerInfo?.cron && (
                        <div className="detail-row issuer-detail-row">
                          <span>Cron object:</span>
                          <span className="copy-inline">
                            <span>{shortHash(data.ledgerInfo.cron)}</span>
                            <Link
                              href={`/object/${data.ledgerInfo.cron}`}
                              className="inline-link-icon tooltip"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <LinkIcon />
                              <span className="tooltiptext no-brake">Object page</span>
                            </Link>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.cron} />
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasNftDataDetails && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showNftDataDetails ? 'active' : ''}`}
                    onClick={() => setShowNftDataDetails((prev) => !prev)}
                  >
                    NFT data
                  </button>

                  {showNftDataDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {data?.ledgerInfo?.firstNFTokenSequence && (
                        <div className="detail-row issuer-detail-row">
                          <span>First NFT sequence:</span>
                          <span>{data.ledgerInfo.firstNFTokenSequence}</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.nftokenMinter && (
                        <div className="detail-row issuer-detail-row">
                          <span>NFT minter:</span>
                          <span className="copy-inline">
                            <AddressWithIconInline data={data.ledgerInfo} name="nftokenMinter" options={{ short: 6 }} />
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.nftokenMinter} />
                            </span>
                          </span>
                        </div>
                      )}

                      {data?.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
                        <div className="detail-row issuer-detail-row">
                          <span>Incoming NFT offers:</span>
                          <span className="red">disallowed</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.flags?.uriTokenIssuer && (
                        <div className="detail-row issuer-detail-row">
                          <span>NFT issuer:</span>
                          <span className="green">enabled</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasAccountSettingsData && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showTxSettingsDetails ? 'active' : ''}`}
                    onClick={() => setShowTxSettingsDetails((prev) => !prev)}
                  >
                    Account settings
                  </button>

                  {showTxSettingsDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {!!data?.ledgerInfo?.accountIndex && (
                        <div className="detail-row issuer-detail-row">
                          <span>Account index:</span>
                          <span className="copy-inline">
                            <span className="address-text">{data.ledgerInfo.accountIndex}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.accountIndex} />
                            </span>
                          </span>
                        </div>
                      )}

                      {hasNextSequence && (
                        <div className="detail-row issuer-detail-row">
                          <span>Next sequence:</span>
                          <span className="copy-inline">
                            <span>{data.ledgerInfo.sequence}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.sequence} />
                            </span>
                          </span>
                        </div>
                      )}
                      {data?.ledgerInfo?.messageKey && (
                        <div className="detail-row issuer-detail-row">
                          <span>
                            Message key:
                            {isMessageKeyUsedForFlare && (
                              <>
                                <br />
                                <b>used for Flare</b>
                              </>
                            )}
                          </span>
                          <span className="copy-inline">
                            <span className="address-text">{data.ledgerInfo.messageKey}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.messageKey} />
                            </span>
                          </span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.previousTxnID && (
                        <div className="detail-row issuer-detail-row">
                          <span>Last affecting tx:</span>
                          <span className="copy-inline">
                            <Link
                              href={`/transaction/${data.ledgerInfo.previousTxnID}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {shortHash(data.ledgerInfo.previousTxnID)}
                            </Link>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.previousTxnID} />
                            </span>
                          </span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.accountTxnID && (
                        <div className="detail-row issuer-detail-row">
                          <span>Last initiated tx:</span>
                          <span className="copy-inline">
                            <Link
                              href={`/transaction/${data.ledgerInfo.accountTxnID}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {shortHash(data.ledgerInfo.accountTxnID)}
                            </Link>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.accountTxnID} />
                            </span>
                          </span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.walletLocator && (
                        <div className="detail-row issuer-detail-row">
                          <span>Wallet locator:</span>
                          <span className="copy-inline">
                            <span className="address-text">{data.ledgerInfo.walletLocator}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.walletLocator} />
                            </span>
                          </span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.ammID && (
                        <div className="detail-row issuer-detail-row">
                          <span>AMM ID:</span>
                          <span className="copy-inline">
                            <span>{shortHash(data.ledgerInfo.ammID)}</span>
                            <Link
                              href={`/amm/${data.ledgerInfo.ammID}`}
                              className="inline-link-icon tooltip"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <LinkIcon />
                              <span className="tooltiptext no-brake">AMM page</span>
                            </Link>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.ammID} />
                            </span>
                          </span>
                        </div>
                      )}

                      {(data?.ledgerInfo?.ticketCount || data?.ledgerInfo?.ticketCount === 0) && (
                        <div className="detail-row issuer-detail-row">
                          <span>Ticket count:</span>
                          <span>{data.ledgerInfo.ticketCount}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.importSequence && (
                        <div className="detail-row issuer-detail-row">
                          <span>Import sequence:</span>
                          <span>{data.ledgerInfo.importSequence}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.tickSize && (
                        <div className="detail-row issuer-detail-row">
                          <span>Tick size:</span>
                          <span>{data.ledgerInfo.tickSize}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.requireDestTag && (
                        <div className="detail-row issuer-detail-row">
                          <span>Destination tag:</span>
                          <span>required</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.depositAuth && (
                        <div className="detail-row issuer-detail-row">
                          <span>Deposit authorization:</span>
                          <span>required</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.requireAuth && (
                        <div className="detail-row issuer-detail-row">
                          <span>Token authorization:</span>
                          <span>required</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingCheck && (
                        <div className="detail-row issuer-detail-row">
                          <span>Incoming checks:</span>
                          <span className="red">disallowed</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingPayChan && (
                        <div className="detail-row issuer-detail-row">
                          <span>Incoming payment channels:</span>
                          <span className="red">disallowed</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingTrustline && (
                        <div className="detail-row issuer-detail-row">
                          <span>Incoming trustlines:</span>
                          <span className="red">disallowed</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
                        <div className="detail-row issuer-detail-row">
                          <span>Incoming NFT offers:</span>
                          <span className="red">disallowed</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingRemit && (
                        <div className="detail-row issuer-detail-row">
                          <span>Incoming remit:</span>
                          <span className="red">disallowed</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.tshCollect && (
                        <div className="detail-row issuer-detail-row">
                          <span>TshCollect:</span>
                          <span>enabled</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowXRP && (
                        <div className="detail-row issuer-detail-row">
                          <span>Receiving {nativeCurrency}:</span>
                          <span>disabled</span>
                        </div>
                      )}

                      {((!data?.ledgerInfo?.domain && canManageDomain) ||
                        (!xahauNetwork && !didData && canManageDid)) && (
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          {!data?.ledgerInfo?.domain && canManageDomain && (
                            <button
                              type="button"
                              className="card-action-btn"
                              onClick={() =>
                                setSignRequest({
                                  action: 'setDomain',
                                  redirect: 'account',
                                  request: {
                                    TransactionType: 'AccountSet',
                                    Account: data?.address
                                  }
                                })
                              }
                              title="Set domain"
                            >
                              Set domain
                            </button>
                          )}
                          {!xahauNetwork && !didData && canManageDid && (
                            <button
                              type="button"
                              className="card-action-btn"
                              onClick={() =>
                                setSignRequest({
                                  action: 'setDid',
                                  redirect: 'account',
                                  request: {
                                    TransactionType: 'DIDSet',
                                    Account: data?.address
                                  }
                                })
                              }
                              title="Set DID"
                            >
                              Set DID
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasAirdropsData && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showAirdropsDetails ? 'active' : ''}`}
                    onClick={() => setShowAirdropsDetails((prev) => !prev)}
                  >
                    Airdrops
                    <span className="account-control-collapsed"> · Flare</span>
                  </button>

                  {showAirdropsDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      <div className="detail-row issuer-detail-row">
                        <span>Address:</span>
                        <span className="copy-inline airdrop-address-wrap">
                          <span className="address-text">{data.flare.address}</span>
                          <span onClick={(event) => event.stopPropagation()}>
                            <CopyButton text={data.flare.address} />
                          </span>
                        </span>
                      </div>

                      <div className="detail-row issuer-detail-row">
                        <span>Flare claim:</span>
                        <span className="copy-inline airdrop-claim-wrap">
                          <span>{flareClaimNode}</span>
                          <a
                            href={`https://flarescan.com/address/${data.flare.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="airdrop-link-btn"
                            onClick={(event) => event.stopPropagation()}
                            aria-label="Open Flare address"
                            title="Open Flare address"
                          >
                            <LinkIcon />
                          </a>
                        </span>
                      </div>

                      <div className="detail-row issuer-detail-row">
                        <span>Songbird claim:</span>
                        <span className="copy-inline airdrop-claim-wrap">
                          <span>{songbirdClaimNode}</span>
                          <a
                            href={`https://songbird.flarescan.com/address/${data.flare.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="airdrop-link-btn"
                            onClick={(event) => event.stopPropagation()}
                            aria-label="Open Songbird address"
                            title="Open Songbird address"
                          >
                            <LinkIcon />
                          </a>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showHistoricalDataCard && (
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
              )}
            </div>
          </div>

          {/* Column 2: Assets */}
          <div className="assets-section">
            {showObjectsLoadStatus && (
              <div className={`asset-item object-load-status ${objectsError ? 'error' : ''}`}>
                {objectsLoading ? (
                  <span className="tx-inline-load object-load-status-text">
                    <span>Loading account objects and assets</span>
                    <span className="waiting inline" aria-hidden="true"></span>
                  </span>
                ) : (
                  <span className="object-load-status-text">
                    Failed to load account objects. Some assets may be missing.
                  </span>
                )}
              </div>
            )}

            {hasNonNativeTokenAssets && (
              <div className="asset-item" onClick={() => setShowTotalWorthDetails(!showTotalWorthDetails)}>
                <div className="asset-main">
                  <div className="asset-logo">
                    <span className="asset-summary-title">Total worth</span>
                  </div>
                  <div className="asset-value total-worth-value">
                    <div className="asset-fiat total-worth-fiat" suppressHydrationWarning>
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
            )}

            {/* Native Currency Balance */}
            {balanceList && (
              <div className="asset-item" onClick={() => setShowBalanceDetails(!showBalanceDetails)}>
                {!showBalanceDetails ? (
                  <div className="asset-main">
                    <div className="asset-logo">
                      <CurrencyWithIcon token={{ currency: nativeCurrency }} options={{ disableTokenLink: true }} />
                    </div>
                    <div className="asset-value">
                      <div className="asset-amount">{shortNiceNumber(nativeAvailable)}</div>
                      <div className="asset-fiat" suppressHydrationWarning>
                        {shortNiceNumber(nativeAvailable * (pageFiatRate || 0), 2, 1, selectedCurrency)}
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
                        <div className="asset-amount">{shortNiceNumber(nativeAvailable)}</div>
                        <div className="asset-fiat" suppressHydrationWarning>
                          {shortNiceNumber(nativeAvailable * (pageFiatRate || 0), 2, 1, selectedCurrency)}
                        </div>
                      </div>
                    </div>
                    <div className="asset-details">
                      <div className="detail-row">
                        <span>Available:</span>
                        <span className="copy-inline">
                          <span>{nativeAvailable}</span>
                          <span onClick={(event) => event.stopPropagation()}>
                            <CopyButton text={nativeAvailable} />
                          </span>
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Total:</span>
                        <span className="amount-with-fiat">
                          <span>{amountFormat(nativeTotalDrops, { precise: 'nice' })}</span>
                          <span className="fiat-line" suppressHydrationWarning>
                            {tokenToFiat({
                              amount: nativeTotalDrops,
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
                          <span>{amountFormat(nativeReservedDrops, { precise: 'nice' })}</span>
                          <span className="fiat-line" suppressHydrationWarning>
                            {tokenToFiat({
                              amount: nativeReservedDrops,
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
                      <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                        <span className={disabledSendTooltip ? 'tooltip' : ''}>
                          <button
                            type="button"
                            className={`card-action-btn ${canSendFromAccount ? 'redeem' : 'disabled'}`}
                            disabled={!canSendFromAccount}
                            onClick={() => {
                              if (!canSendFromAccount) return
                              setSignRequest({
                                action: 'payment',
                                redirect: 'account',
                                request: {
                                  TransactionType: 'Payment',
                                  Account: data?.address,
                                  Amount: '0'
                                },
                                data: {
                                  currencyCode: nativeCurrency,
                                  balance: String(nativeAvailable)
                                }
                              })
                            }}
                          >
                            <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> Send
                          </button>
                          {!!disabledSendTooltip && <span className="tooltiptext">{disabledSendTooltip}</span>}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {shouldShowGetFirstNativeButton && (
              <div className="get-first-native-wrap">
                <a href={getFirstNativeUrl} target="_blank" rel="noreferrer" className="get-first-native-btn">
                  🚀 Get your first {nativeCurrency}
                </a>
              </div>
            )}

            {shouldShowAddTokenButton && (
              <div className="get-first-native-wrap">
                <button
                  type="button"
                  className="get-first-native-btn"
                  onClick={() => {
                    if (!account?.address) {
                      setSignRequest({ redirect: 'account' })
                      return
                    }

                    setSignRequest({
                      action: 'setTrustline',
                      redirect: 'account',
                      request: {
                        TransactionType: 'TrustSet',
                        Account: data?.address
                      }
                    })
                  }}
                >
                  Add a token
                </button>
              </div>
            )}

            {hasNonNativeTokenAssets && shouldShowTokenTabs && (
              <div className="token-tab-row">
                <div className="token-tab-switch">
                  <button
                    type="button"
                    className={`token-tab-btn ${tokenTab === 'all' ? 'active' : ''}`}
                    onClick={() => setTokenTab('all')}
                  >
                    All ({totalTokenCount})
                  </button>
                  {issuedTokensCount > 0 && (
                    <button
                      type="button"
                      className={`token-tab-btn ${tokenTab === 'tokens' ? 'active' : ''}`}
                      onClick={() => setTokenTab('tokens')}
                    >
                      Tokens ({issuedTokensCount})
                    </button>
                  )}
                  {lpTokensCount > 0 && (
                    <button
                      type="button"
                      className={`token-tab-btn ${tokenTab === 'lp' ? 'active' : ''}`}
                      onClick={() => setTokenTab('lp')}
                    >
                      LP Tokens ({lpTokensCount})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tokens */}
            {visibleTokens.map((token, index) => {
              const issuer = token.HighLimit?.issuer === data?.address ? token.LowLimit : token.HighLimit
              const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
              const fiatValue = (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
              const tokenUniqueKey = `${token.Balance?.currency || 'token'}-${issuer?.issuer || 'issuer'}-${index}`
              const isExpanded = expandedToken === tokenUniqueKey
              const isLpToken = isLpTrustlineToken(token)
              const lpAmount1 = token.Balance?.lpTokenDetails?.amount1
              const lpAmount2 = token.Balance?.lpTokenDetails?.amount2
              const hasLpAmounts =
                lpAmount1 !== undefined && lpAmount1 !== null && lpAmount2 !== undefined && lpAmount2 !== null
              const showLpCollapsedLayout = isLpToken && hasLpAmounts
              const lpAmount1Text = showLpCollapsedLayout
                ? amountFormat(lpAmount1, { short: true, noSpace: true, bold: true })
                : ''
              const lpAmount2Text = showLpCollapsedLayout
                ? amountFormat(lpAmount2, { short: true, noSpace: true, bold: true })
                : ''
              const collapsedAmountText = shortNiceNumber(balance)
              const canGetMoreRlusd =
                network === 'testnet' &&
                isOwnAccount &&
                !effectiveLedgerTimestamp &&
                token.Balance?.currency === TESTNET_RLUSD_CURRENCY &&
                issuer?.issuer === TESTNET_RLUSD_ISSUER
              const trustlineCurrencyCode = token.Balance?.currency
              const trustlineCurrencyCodeDisplay = trustlineCurrencyCode?.replace(/0+$/, '') || trustlineCurrencyCode
              const hasPositiveTokenBalance = Number(balance) > 0
              const canSendToken =
                !!setSignRequest &&
                !!account?.address &&
                isOwnAccount &&
                !effectiveLedgerTimestamp &&
                hasPositiveTokenBalance &&
                !!issuer?.issuer &&
                !!trustlineCurrencyCode
              const disabledSendTokenTooltip = (() => {
                if (canSendToken) return ''
                if (!setSignRequest || !account?.address) return 'Only logged in users can do it'
                if (!isOwnAccount) return 'Only the viewed account can do it'
                if (effectiveLedgerTimestamp) return 'Unavailable in historical mode'
                if (!hasPositiveTokenBalance) return 'Send is available only when your token balance is above 0'
                if (!issuer?.issuer || !trustlineCurrencyCode) return 'Trustline data is incomplete'
                return 'Send is unavailable'
              })()
              const canRemoveTrustline =
                !isLpToken &&
                !!setSignRequest &&
                !!account?.address &&
                isOwnAccount &&
                !effectiveLedgerTimestamp &&
                Number(balance) === 0 &&
                !!issuer?.issuer &&
                !!trustlineCurrencyCode
              const disabledRemoveTrustlineTooltip = (() => {
                if (canRemoveTrustline) return ''
                if (isLpToken) return 'LP trustlines cannot be removed here'
                if (!setSignRequest || !account?.address) return 'Only logged in users can do it'
                if (!isOwnAccount) return 'Only the viewed account can do it'
                if (effectiveLedgerTimestamp) return 'Unavailable in historical mode'
                if (Number(balance) !== 0) return 'Trustline can be removed only when balance is 0'
                if (!issuer?.issuer || !trustlineCurrencyCode) return 'Trustline data is incomplete'
                return 'Trustline cannot be removed'
              })()

              return (
                <div
                  key={tokenUniqueKey}
                  className="asset-item token-asset-item"
                  onClick={() => setExpandedToken(isExpanded ? null : tokenUniqueKey)}
                >
                  <div className="asset-main">
                    <div className="asset-logo">
                      {showLpCollapsedLayout ? (
                        <div className="lp-collapsed-left">
                          <CurrencyWithIcon
                            token={{ ...token.Balance, ...issuer }}
                            options={{ disableTokenLink: true, iconOnly: true }}
                          />
                          <div className="lp-collapsed-balances">
                            <div className="asset-amount">{lpAmount1Text}</div>
                            <div className="asset-amount">{lpAmount2Text}</div>
                          </div>
                        </div>
                      ) : (
                        <CurrencyWithIcon
                          token={{ ...token.Balance, ...issuer }}
                          options={{ disableTokenLink: true }}
                        />
                      )}
                    </div>
                    <div className="asset-value">
                      <div className="asset-amount">{collapsedAmountText}</div>
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
                            const amount1Raw = token.Balance?.lpTokenDetails?.amount1
                            const amount2Raw = token.Balance?.lpTokenDetails?.amount2
                            const amount1FiatText = tokenToFiat({
                              amount: amount1Raw,
                              selectedCurrency,
                              fiatRate: tokenFiatRate,
                              asText: true
                            })
                            const amount2FiatText = tokenToFiat({
                              amount: amount2Raw,
                              selectedCurrency,
                              fiatRate: tokenFiatRate,
                              asText: true
                            })

                            return (
                              <>
                                <div className="detail-row">
                                  <span>LP Token:</span>
                                  <span className="copy-inline">
                                    <span>{shortHash(token.Balance?.currency)}</span>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={token.Balance?.currency} />
                                    </span>
                                  </span>
                                </div>
                                {asset1 && (
                                  <>
                                    <div className="detail-row">
                                      <span>Asset 1:</span>
                                      <span className="amount-with-fiat" onClick={(event) => event.stopPropagation()}>
                                        <span>
                                          {amountFormat(amount1Raw, {
                                            icon: true,
                                            bold: true,
                                            short: true
                                          })}
                                        </span>
                                        {amount1FiatText ? (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {amount1FiatText}
                                          </span>
                                        ) : null}
                                      </span>
                                    </div>
                                    {asset1?.issuer && (
                                      <div className="detail-row">
                                        <span>Asset 1 issuer:</span>
                                        <span className="copy-inline">
                                          <AddressWithIconInline data={asset1} name="issuer" options={{ short: 6 }} />
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={asset1?.issuer} />
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                    <div className="detail-row">
                                      <span>Asset 2:</span>
                                      <span className="amount-with-fiat" onClick={(event) => event.stopPropagation()}>
                                        <span>
                                          {amountFormat(amount2Raw, {
                                            icon: true,
                                            bold: true,
                                            short: true
                                          })}
                                        </span>
                                        {amount2FiatText ? (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {amount2FiatText}
                                          </span>
                                        ) : null}
                                      </span>
                                    </div>
                                    {asset2?.issuer && (
                                      <div className="detail-row">
                                        <span>Asset 2 issuer:</span>
                                        <span className="copy-inline">
                                          <AddressWithIconInline data={asset2} name="issuer" options={{ short: 6 }} />
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={asset2?.issuer} />
                                          </span>
                                        </span>
                                      </div>
                                    )}
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
                              <span>{trustlineCurrencyCodeDisplay}</span>
                              <Link
                                href={`/token/${issuer?.issuer}/${token.Balance?.currency}`}
                                className="inline-link-icon tooltip"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <LinkIcon />
                                <span className="tooltiptext no-brake">Token page</span>
                              </Link>
                              <span onClick={(event) => event.stopPropagation()}>
                                <CopyButton text={trustlineCurrencyCode} />
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
                              <AddressWithIconInline
                                data={{ issuer: issuer?.issuer, issuerDetails: issuer?.issuerDetails }}
                                name="issuer"
                                options={{ short: 6 }}
                              />
                              <span onClick={(event) => event.stopPropagation()}>
                                <CopyButton text={issuer?.issuer} />
                              </span>
                            </span>
                          </div>
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
                              <span>Rippling:</span>
                              <span className="green">Disabled</span>
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
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="card-action-btn redeem"
                            onClick={() =>
                              router.push(
                                `/services/amm/deposit?currency=${token.Balance?.currencyDetails?.asset?.currency}${
                                  token.Balance?.currencyDetails?.asset?.issuer
                                    ? '&currencyIssuer=' + token.Balance.currencyDetails.asset.issuer
                                    : ''
                                }&currency2=${token.Balance?.currencyDetails?.asset2?.currency}${
                                  token.Balance?.currencyDetails?.asset2?.issuer
                                    ? '&currency2Issuer=' + token.Balance.currencyDetails.asset2.issuer
                                    : ''
                                }`
                              )
                            }
                          >
                            <MdSouth style={{ fontSize: 16, marginBottom: -2 }} /> Deposit
                          </button>
                          <button
                            type="button"
                            className="card-action-btn cancel"
                            onClick={() =>
                              router.push(
                                `/services/amm/withdraw?currency=${token.Balance?.currencyDetails?.asset?.currency}${
                                  token.Balance?.currencyDetails?.asset?.issuer
                                    ? '&currencyIssuer=' + token.Balance.currencyDetails.asset.issuer
                                    : ''
                                }&currency2=${token.Balance?.currencyDetails?.asset2?.currency}${
                                  token.Balance?.currencyDetails?.asset2?.issuer
                                    ? '&currency2Issuer=' + token.Balance.currencyDetails.asset2.issuer
                                    : ''
                                }`
                              )
                            }
                          >
                            <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> Withdraw
                          </button>
                        </div>
                      )}
                      {!isLpToken && (
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          <span className={disabledSendTokenTooltip ? 'tooltip' : ''}>
                            <button
                              type="button"
                              className={`card-action-btn ${canSendToken ? 'redeem' : 'disabled'}`}
                              disabled={!canSendToken}
                              onClick={() => {
                                if (!canSendToken) return
                                setSignRequest({
                                  action: 'payment',
                                  redirect: 'account',
                                  request: {
                                    TransactionType: 'Payment',
                                    Account: data?.address,
                                    Amount: {
                                      currency: trustlineCurrencyCode,
                                      issuer: issuer?.issuer,
                                      value: '0'
                                    },
                                    Flags: 131072
                                  },
                                  data: {
                                    currencyCode: trustlineCurrencyCode,
                                    issuer: issuer?.issuer,
                                    balance: String(balance)
                                  }
                                })
                              }}
                            >
                              <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> Send
                            </button>
                            {!!disabledSendTokenTooltip && (
                              <span className="tooltiptext">{disabledSendTokenTooltip}</span>
                            )}
                          </span>
                          {canGetMoreRlusd && (
                            <button
                              type="button"
                              className="card-action-btn redeem"
                              onClick={() => router.push(`/faucet?currency=RLUSD&amount=1&address=${data?.address}`)}
                            >
                              <MdSouth style={{ fontSize: 16, marginBottom: -2 }} /> Get 1 more RLUSD
                            </button>
                          )}
                          <span className={disabledRemoveTrustlineTooltip ? 'tooltip' : ''}>
                            <button
                              type="button"
                              className={`card-action-btn ${canRemoveTrustline ? 'cancel' : 'disabled'}`}
                              disabled={!canRemoveTrustline}
                              onClick={() => {
                                if (!canRemoveTrustline) return
                                setSignRequest({
                                  redirect: 'account',
                                  request: {
                                    TransactionType: 'TrustSet',
                                    Flags: 2228224, // tfClearNoRipple clearNoFreeze
                                    Account: data?.address,
                                    LimitAmount: {
                                      currency: trustlineCurrencyCode,
                                      issuer: issuer?.issuer,
                                      value: '0'
                                    }
                                  }
                                })
                              }}
                            >
                              <MdDeleteForever /> Remove
                            </button>
                            {!!disabledRemoveTrustlineTooltip && (
                              <span className="tooltiptext">{disabledRemoveTrustlineTooltip}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {(() => {
              const showMoreStepButton = hiddenTokensCount > 0
              const showAllButtonVisible = hiddenTokensCount > 10
              const showFewerButton = visibleTokens.length > TOKEN_PREVIEW_LIMIT
              if (!showMoreStepButton && !showAllButtonVisible && !showFewerButton) return null

              return (
                <div className="asset-compact-actions">
                  {showMoreStepButton && (
                    <button
                      type="button"
                      className="asset-compact-toggle"
                      onClick={() => {
                        const nextLimit = Math.min(activeTokenList.length, visibleTokens.length + 10)
                        if (nextLimit >= activeTokenList.length) {
                          setShowAllTokens(true)
                        }
                        setTokenDisplayLimit(nextLimit)
                      }}
                    >
                      Show {Math.min(10, hiddenTokensCount)} more {activeTokenTabLabel}
                    </button>
                  )}
                  {showAllButtonVisible && (
                    <button
                      type="button"
                      className="asset-compact-toggle"
                      onClick={() => {
                        setShowAllTokens(true)
                        setTokenDisplayLimit(activeTokenList.length)
                      }}
                    >
                      Show all {activeTokenTabLabel} (+{hiddenTokensCount} more)
                    </button>
                  )}
                  {showFewerButton && (
                    <button
                      type="button"
                      className="asset-compact-toggle"
                      onClick={() => {
                        setShowAllTokens(false)
                        setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
                        setExpandedToken(null)
                      }}
                    >
                      Show fewer {activeTokenTabLabel}
                    </button>
                  )}
                </div>
              )
            })()}

            {hasHeldMpts && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    MPTs <span className="object-title-count">{heldMpts.length}</span>
                  </div>
                </div>

                <div className="cards-list dex-orders-list">
                  {heldMpts.map((mptNode, index) => {
                    const rowKey = `${mptNode?.index || mptId(mptNode) || 'mpt'}-${index}`
                    const isExpanded = expandedHeldMptKey === rowKey
                    const balanceValue = scaleAmount(
                      mptNode?.MPTAmount || 0,
                      mptNode?.mptokenCurrencyDetails?.scale || null
                    )

                    return (
                      <div
                        key={rowKey}
                        className={`asset-item token-asset-item ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedHeldMptKey(isExpanded ? null : rowKey)}
                      >
                        <div className="asset-main">
                          <div className="asset-logo">
                            <CurrencyWithIcon token={mptNode} options={{ disableTokenLink: true }} hideIssuer />
                          </div>
                          <div className="asset-value">
                            <div className="asset-amount">{shortNiceNumber(balanceValue)}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="asset-details">
                            <div className="detail-row">
                              <span>MPT ID:</span>
                              <span className="copy-inline">
                                <span>{shortHash(mptId(mptNode) || '-')}</span>
                                {!!mptId(mptNode) && (
                                  <span onClick={(event) => event.stopPropagation()}>
                                    <CopyButton text={mptId(mptNode)} />
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>Balance:</span>
                              <span>{fullNiceNumber(balanceValue)}</span>
                            </div>
                            {mptNode?.mptokenCurrencyDetails?.account && (
                              <div className="detail-row">
                                <span>Issuer:</span>
                                <span className="copy-inline">
                                  <AddressWithIconInline
                                    data={{ address: mptNode.mptokenCurrencyDetails.account }}
                                    options={{ short: 6, showAddress: true }}
                                  />
                                  <span onClick={(event) => event.stopPropagation()}>
                                    <CopyButton text={mptNode.mptokenCurrencyDetails.account} />
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {hasAnyNftSectionData && (
              <>
                <div className="section-header-row nft-section-header-row">
                  <div className="section-title nft-section-title">NFTs</div>
                  {activeNftCount > 0 && data?.address && (
                    <Link className="section-link" href={activeNftViewAllHref}>
                      View all
                    </Link>
                  )}
                </div>

                <div className="nft-tab-row nft-tab-row-outside">
                  <div className="nft-tab-switch">
                    {hasOwnedNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'owned' ? 'active' : ''}`}
                        onClick={() => setNftTab('owned')}
                      >
                        Owned{nftTabCountLabels.owned ? ` (${nftTabCountLabels.owned})` : ''}
                      </button>
                    )}
                    {hasSoldNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'sold' ? 'active' : ''}`}
                        onClick={() => setNftTab('sold')}
                      >
                        Sold{nftTabCountLabels.sold ? ` (${nftTabCountLabels.sold})` : ''}
                      </button>
                    )}
                    {hasMintedNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'minted' ? 'active' : ''}`}
                        onClick={() => setNftTab('minted')}
                      >
                        Minted{nftTabCountLabels.minted ? ` (${nftTabCountLabels.minted})` : ''}
                      </button>
                    )}
                    {hasBurnedNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'burned' ? 'active' : ''}`}
                        onClick={() => setNftTab('burned')}
                      >
                        Burned{nftTabCountLabels.burned ? ` (${nftTabCountLabels.burned})` : ''}
                      </button>
                    )}
                  </div>
                </div>

                <div className="nft-section-content">
                  {activeNftLoading ? (
                    <div className="asset-fiat">Loading {nftTab} NFTs...</div>
                  ) : activeNftCount > 0 ? (
                    <>
                      <div className="cards-list">
                        {activeNftPreview.map((nft, nftIndex) => {
                          const nftId =
                            nft?.nftokenID || nft?.NFTokenID || nft?.nftoken?.nftokenID || nft?.nftoken?.NFTokenID
                          if (!nftId) return null

                          const cardKey = `${nftTab}-${nftId}-${nftIndex}`
                          const isExpanded = expandedNftCardKey === cardKey
                          const toggleCard = () => setExpandedNftCardKey(isExpanded ? null : cardKey)
                          const handleKeyToggle = (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleCard()
                            }
                          }

                          const shortNftId = shortHash(nftId)
                          const nftDisplayData = nft?.nftoken || nft
                          const nftTitle = nftName(nftDisplayData, { maxLength: 48 }) || shortNftId
                          const nftIssuer =
                            nft?.issuer || nft?.Issuer || nft?.nftoken?.issuer || nft?.nftoken?.Issuer || null
                          const nftOwner =
                            nft?.owner || nft?.Owner || nft?.nftoken?.owner || nft?.nftoken?.Owner || null
                          const nftDeleted =
                            !!nft?.deletedAt || !!nft?.nftoken?.deletedAt || !!nft?.deleted || !!nft?.nftoken?.deleted
                          const nftTransferableFlag =
                            nft?.flags?.transferable ?? nft?.nftoken?.flags?.transferable ?? true
                          const nftIsTransferable = nftTransferableFlag !== false
                          const isSignedInNftOwner = !!account?.address && !!nftOwner && account.address === nftOwner
                          const isSignedInNftIssuer = !!account?.address && !!nftIssuer && account.address === nftIssuer
                          const shouldShowMakeBuyOfferButton =
                            !xahauNetwork && nftTab === 'owned' && !!nftOwner && !isSignedInNftOwner
                          const shouldShowBurnNftButton =
                            !xahauNetwork &&
                            nftTab === 'owned' &&
                            !!nftId &&
                            !nftDeleted &&
                            !!setSignRequest &&
                            !!account?.address &&
                            ((!!nftOwner && account.address === nftOwner) ||
                              (!!nftIssuer && account.address === nftIssuer))
                          const burnNftRequest = (() => {
                            if (!shouldShowBurnNftButton) return null

                            if (isSignedInNftOwner) {
                              return {
                                TransactionType: 'NFTokenBurn',
                                Account: nftOwner,
                                NFTokenID: nftId
                              }
                            }

                            if (isSignedInNftIssuer) {
                              return {
                                TransactionType: 'NFTokenBurn',
                                Account: nftIssuer,
                                ...(nftOwner ? { Owner: nftOwner } : {}),
                                NFTokenID: nftId
                              }
                            }

                            return null
                          })()
                          const canMakeBuyOffer =
                            !!setSignRequest &&
                            !!account?.address &&
                            !!nftId &&
                            !!nftOwner &&
                            !nftDeleted &&
                            (nftIsTransferable || isSignedInNftIssuer)
                          const disabledBuyOfferTooltip = (() => {
                            if (canMakeBuyOffer) return ''
                            if (!nftIsTransferable && !isSignedInNftIssuer) return 'Non-transferable NFT'
                            return ''
                          })()
                          const soldAt = nft?.acceptedAt || nft?.soldAt
                          const mintedAt = nft?.issuedAt
                          const burnedAt = nft?.deletedAt
                          const actionAt =
                            nftTab === 'sold'
                              ? soldAt
                              : nftTab === 'minted'
                                ? mintedAt
                                : nftTab === 'burned'
                                  ? burnedAt
                                  : nft?.updatedAt || nft?.createdAt
                          const soldPrice =
                            nftTab === 'sold' && nft?.amount
                              ? amountFormat(nft.amount, { short: true, maxFractionDigits: 2 })
                              : null
                          const soldPriceFiat =
                            nftTab === 'sold' && selectedCurrency
                              ? convertedAmount(nft, selectedCurrency.toLowerCase(), { short: true })
                              : null
                          const actionTimeAgo = actionAt ? timeFromNow(actionAt, i18n) : null
                          const actionExact = actionAt ? fullDateAndTime(actionAt) : null
                          const actionVerb =
                            nftTab === 'sold'
                              ? 'Sold'
                              : nftTab === 'minted'
                                ? 'Minted'
                                : nftTab === 'burned'
                                  ? 'Burned'
                                  : 'Updated'
                          const fallbackSecondaryLine =
                            nftTab === 'owned' && shortNftId ? `Token ID ${shortNftId}` : actionVerb
                          const shouldShowActionInSecondaryLine = nftTab === 'sold'
                          const secondaryLine =
                            shouldShowActionInSecondaryLine && actionTimeAgo ? (
                              <>
                                {actionVerb} {actionTimeAgo}
                              </>
                            ) : (
                              fallbackSecondaryLine
                            )

                          return (
                            <div
                              key={`${nftId}-${nftIndex}`}
                              className="asset-item token-asset-item"
                              role="button"
                              tabIndex={0}
                              aria-expanded={isExpanded}
                              onClick={toggleCard}
                              onKeyDown={handleKeyToggle}
                            >
                              <div className="asset-main">
                                <div className="asset-logo">
                                  <div className="nft-asset-info">
                                    <Link
                                      href={`/nft/${nftId}`}
                                      onClick={(event) => event.stopPropagation()}
                                      className="nft-asset-thumb"
                                    >
                                      <NftImage
                                        nft={nftDisplayData}
                                        style={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: '6px',
                                          verticalAlign: 'middle'
                                        }}
                                      />
                                    </Link>
                                    <div className="nft-asset-text">
                                      <div className="asset-summary-title" title={nftTitle}>
                                        {nftTitle}
                                      </div>
                                      <div className="asset-fiat">{secondaryLine}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="asset-value">
                                  {soldPrice ? (
                                    <>
                                      <div className="asset-amount">{soldPrice}</div>
                                      {soldPriceFiat && (
                                        <div className="asset-fiat" suppressHydrationWarning>
                                          ≈{soldPriceFiat}
                                        </div>
                                      )}
                                    </>
                                  ) : actionTimeAgo ? (
                                    <div className="asset-fiat">{actionTimeAgo}</div>
                                  ) : null}
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="asset-details">
                                  <div className="detail-row">
                                    <span>NFT:</span>
                                    <span className="copy-inline">
                                      <Link href={`/nft/${nftId}`} onClick={(event) => event.stopPropagation()}>
                                        {shortNftId}
                                      </Link>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={nftId} />
                                      </span>
                                    </span>
                                  </div>
                                  {nftIssuer && (
                                    <div className="detail-row">
                                      <span>Issuer:</span>
                                      <span className="copy-inline">
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <AddressWithIconInline
                                            data={{ address: nftIssuer }}
                                            options={{ short: 6, showAddress: true }}
                                          />
                                        </span>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={nftIssuer} />
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                  {soldPrice && (
                                    <div className="detail-row">
                                      <span>Sale price:</span>
                                      <span>
                                        {soldPrice}
                                        {soldPriceFiat && (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {' '}
                                            ≈{soldPriceFiat}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {actionExact && (
                                    <div className="detail-row">
                                      <span>{actionVerb} at:</span>
                                      <span>{actionExact}</span>
                                    </div>
                                  )}

                                  {shouldShowMakeBuyOfferButton && (
                                    <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                      <span className={disabledBuyOfferTooltip ? 'tooltip' : ''}>
                                        <button
                                          type="button"
                                          className={`card-action-btn ${canMakeBuyOffer ? 'redeem' : 'disabled'}`}
                                          disabled={!canMakeBuyOffer}
                                          onClick={() => {
                                            if (!canMakeBuyOffer) return
                                            setSignRequest({
                                              request: {
                                                TransactionType: 'NFTokenCreateOffer',
                                                Account: account.address,
                                                NFTokenID: nftId,
                                                Owner: nftOwner
                                              }
                                            })
                                          }}
                                        >
                                          Make a buy offer
                                        </button>
                                        {!!disabledBuyOfferTooltip && (
                                          <span className="tooltiptext">{disabledBuyOfferTooltip}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {shouldShowBurnNftButton && !!burnNftRequest && (
                                    <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                      <button
                                        type="button"
                                        className="card-action-btn cancel"
                                        onClick={() => {
                                          setSignRequest({
                                            request: burnNftRequest
                                          })
                                        }}
                                      >
                                        Burn
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {showNftControlsVisible && (
                        <div className="asset-compact-actions">
                          {activeNftShowMoreAvailable && (
                            <button
                              type="button"
                              className="asset-compact-toggle"
                              disabled={nftLoadingMore}
                              onClick={loadMoreNfts}
                            >
                              {nftLoadingMore
                                ? `Loading ${activeNftTabLabel} NFTs...`
                                : `Show ${activeNftRemainingCount} more ${activeNftTabLabel} NFTs`}
                            </button>
                          )}
                          {showNftFewerButton && (
                            <button
                              type="button"
                              className="asset-compact-toggle"
                              onClick={() => {
                                setNftDisplayLimit(NFT_INITIAL_LIMIT)
                                setExpandedNftCardKey(null)
                              }}
                            >
                              Show fewer {activeNftTabLabel} NFTs
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="asset-fiat">{activeNftEmptyLabel}</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Column 3: Transactions */}
          <div className="transactions-section">
            <div className="section-header-row">
              <span className="section-title">Transactions</span>
              <div className="tx-header-actions">
                <button
                  className="tx-filter-toggle tooltip"
                  onClick={() => fetchRecentTransactions()}
                  aria-label="Reload transactions"
                  type="button"
                  disabled={!data?.address || transactionsLoading || transactionsLoadingMore}
                >
                  <FaArrowsRotate
                    className={`tx-refresh-icon ${transactionsLoading || transactionsLoadingMore ? 'spinning' : ''}`}
                  />
                  <span className="tooltiptext">Update</span>
                </button>
                <button
                  className={`tx-filter-toggle tooltip ${showTxFilters ? 'active' : ''}`}
                  onClick={() => setShowTxFilters((prev) => !prev)}
                  aria-label="Toggle transaction filters"
                  type="button"
                >
                  <FaGear />
                  <span className="tooltiptext">Settings</span>
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
                  <button className="card-action-btn" type="button" onClick={resetTransactionFilters}>
                    Reset
                  </button>
                  <button className="card-action-btn redeem" type="button" onClick={applyTransactionFilters}>
                    Search
                  </button>
                </div>
              </div>
            )}

            {transactionsLoading && (
              <p className="grey tx-status-text">
                <span className="tx-inline-load">
                  <span>Loading transactions</span>
                  <span className="waiting inline" aria-hidden="true"></span>
                </span>
              </p>
            )}
            {!transactionsLoading && transactionsError && <p className="red tx-status-text">{transactionsError}</p>}

            {!transactionsLoading &&
              !transactionsError &&
              recentTransactions.length === 0 &&
              !transactionsSearchPaused && <p className="grey tx-status-text">No transactions found.</p>}

            {!transactionsLoading &&
              !transactionsError &&
              (recentTransactions.length > 0 || transactionsSearchPaused) &&
              (() => {
                const renderTransactionsList = () => (
                  <div className="cards-list">
                    {recentTransactions.map((txdata, index) => {
                      const tx = txdata?.tx
                      const outcome = txdata?.outcome
                      const isSuccessful = outcome?.result === 'tesSUCCESS'
                      const txHash = tx?.hash
                      const txKey = txHash || `${tx?.TransactionType || 'tx'}-${index}`
                      const isExpanded = expandedTransactionKey === txKey
                      const txShortHash = shortHash(txHash)
                      const txHistoricalRate = Number.isFinite(Number(txdata?.fiatRates?.[selectedCurrency]))
                        ? Number(txdata.fiatRates[selectedCurrency])
                        : null
                      const txType = tx?.TransactionType || ''
                      const txDapp = dappBySourceTag(tx?.SourceTag)
                      const isAmmDepositOrWithdraw = txType === 'AMMDeposit' || txType === 'AMMWithdraw'
                      const isLpAmount = (amount) => {
                        if (!amount || typeof amount !== 'object') return false
                        if (amount?.currencyDetails?.type === 'lp_token') return true
                        const amountCurrency = amount?.currency
                        return typeof amountCurrency === 'string' && amountCurrency.substring(0, 2) === '03'
                      }

                      const changes = addressBalanceChanges(txdata, data?.address) || []
                      const firstChange = changes?.[0]
                      const positiveChange = changes.find((change) => Number(change?.value || 0) > 0)
                      let collapsedPrimaryChange = changes.length > 2 ? positiveChange || firstChange : firstChange
                      let collapsedSecondaryChange = changes.length === 2 ? changes[1] : null
                      let collapsedMoreCount = changes.length > 2 ? changes.length - 1 : 0
                      if (isAmmDepositOrWithdraw) {
                        const ammTokenChanges = changes.filter((change) => !isLpAmount(change))
                        collapsedPrimaryChange = ammTokenChanges[0] || null
                        collapsedSecondaryChange = ammTokenChanges[1] || null
                        collapsedMoreCount = 0
                      }
                      const primaryChangeValue = Number(collapsedPrimaryChange?.value || 0)
                      const primaryChangeClass = primaryChangeValue > 0 ? 'green' : primaryChangeValue < 0 ? 'red' : ''
                      const primaryChangeFiat = collapsedPrimaryChange
                        ? tokenToFiat({
                            amount: collapsedPrimaryChange,
                            selectedCurrency,
                            fiatRate: txHistoricalRate,
                            asText: true
                          })
                        : ''
                      const secondaryChangeValue = Number(collapsedSecondaryChange?.value || 0)
                      const secondaryChangeClass =
                        secondaryChangeValue > 0 ? 'green' : secondaryChangeValue < 0 ? 'red' : ''
                      const secondaryChangeFiat = collapsedSecondaryChange
                        ? tokenToFiat({
                            amount: collapsedSecondaryChange,
                            selectedCurrency,
                            fiatRate: txHistoricalRate,
                            asText: true
                          })
                        : ''
                      const txAmountRaw = tx?.Amount
                      const hasObjectTxAmount = typeof txAmountRaw === 'object' && txAmountRaw !== null
                      const isMissingOrZeroTxAmount = typeof txAmountRaw === 'undefined' || txAmountRaw === '0'
                      const shouldShowExpandedRate = changes.length > 0 || hasObjectTxAmount || !isMissingOrZeroTxAmount

                      const sourceAddress = txdata?.specification?.source?.address
                      const destinationAddress = txdata?.specification?.destination?.address
                      const isSource = sourceAddress === data?.address
                      const counterparty = isSource ? destinationAddress : sourceAddress
                      const isAccountDeleteTx = tx?.TransactionType === 'AccountDelete'
                      const removedAccountAddress = isAccountDeleteTx ? sourceAddress || tx?.Account || null : null
                      const removedAccountDetails = isAccountDeleteTx
                        ? txdata?.specification?.source?.addressDetails
                        : null
                      const isSelfPayment =
                        tx?.TransactionType === 'Payment' &&
                        !!sourceAddress &&
                        !!destinationAddress &&
                        sourceAddress === destinationAddress
                      const isRipplingByIssuer = isRipplingOnIssuer(changes, data?.address)
                      const isRipplingPayment = tx?.TransactionType === 'Payment' && isRipplingByIssuer
                      const counterpartyDetails = isSource
                        ? txdata?.specification?.destination?.addressDetails
                        : txdata?.specification?.source?.addressDetails

                      const nftChanges = (outcome?.nftokenChanges || []).flatMap((entry) => entry?.nftokenChanges || [])
                      const nftAddressChanges = outcome?.nftokenChanges || []
                      const nftSource =
                        nftAddressChanges.length === 2
                          ? nftAddressChanges.find((change) => change?.nftokenChanges?.[0]?.status === 'removed')
                          : null
                      const nftDestination =
                        nftAddressChanges.length === 2
                          ? nftAddressChanges.find((change) => change?.nftokenChanges?.[0]?.status === 'added')
                          : null
                      const nftTokenId =
                        tx?.NFTokenID ||
                        txdata?.meta?.nftoken_id ||
                        txdata?.meta?.nftokenID ||
                        txdata?.specification?.nftokenID ||
                        txdata?.specification?.nftokenId ||
                        txdata?.specification?.nftokenOffer?.nftokenID ||
                        nftChanges.find((entry) => entry?.nftokenID)?.nftokenID
                      const nftSellerAddress = nftSource?.address || null
                      const nftSellerDetails = nftSource?.addressDetails || null
                      const nftBuyerAddress = nftDestination?.address || null
                      const nftBuyerDetails = nftDestination?.addressDetails || null
                      const nftViewerRole =
                        nftSellerAddress === data?.address
                          ? 'seller'
                          : nftBuyerAddress === data?.address
                            ? 'buyer'
                            : null
                      const isAmmTx = txType.startsWith('AMM')
                      const isDexOfferTx = txType === 'OfferCreate' || txType === 'OfferCancel'
                      const myAddressOrderbookChanges =
                        outcome?.orderbookChanges?.find((entry) => entry?.address === data?.address)
                          ?.orderbookChanges || []
                      const myOrderbookSequences = Array.from(
                        new Set(myAddressOrderbookChanges.map((entry) => entry?.sequence).filter(Boolean))
                      )
                      const myOrderbookChange =
                        myAddressOrderbookChanges.find(
                          (entry) => entry?.sequence === (tx?.offerSequence || txdata?.specification?.orderSequence)
                        ) || myAddressOrderbookChanges[0]
                      const dexOfferDirection = (
                        txdata?.specification?.flags ? txdata?.specification?.flags?.sell : myOrderbookChange?.direction
                      )
                        ? 'Sell'
                        : 'Buy'
                      const isMyDexOrder = tx?.Account === data?.address
                      const dexOrderStatus = (() => {
                        if (!isDexOfferTx) return null
                        if (txType === 'OfferCancel') return 'canceled'
                        if (changes?.length === 0 && isMyDexOrder) return 'placed'
                        if (!isMyDexOrder) return 'fulfilled'
                        return 'placed and fulfilled'
                      })()
                      const isRipplingDexOffer = isDexOfferTx && isRipplingByIssuer
                      const isRipplingAmmCreate = txType === 'AMMCreate' && isRipplingByIssuer
                      const isRipplingTransaction = isRipplingPayment || isRipplingDexOffer || isRipplingAmmCreate
                      const canCollapseRipplingAmounts = (() => {
                        if (!isRipplingTransaction || !collapsedPrimaryChange || !collapsedSecondaryChange) return false
                        const primaryAbs = Math.abs(collapsedPrimaryChange?.value)
                        const secondaryAbs = Math.abs(collapsedSecondaryChange?.value)
                        return Math.abs(primaryAbs - secondaryAbs) < 0.000000000001
                      })()
                      const ripplingCollapsedFiat = canCollapseRipplingAmounts
                        ? tokenToFiat({
                            amount: collapsedPrimaryChange,
                            selectedCurrency,
                            fiatRate: txHistoricalRate,
                            asText: true,
                            absolute: true
                          })
                        : ''
                      const dexOfferShortLabel =
                        isDexOfferTx && dexOrderStatus
                          ? isRipplingDexOffer
                            ? 'Rippling through offer'
                            : `${dexOfferDirection} order ${dexOrderStatus}`
                          : null
                      const ammCreateShortLabel = isRipplingAmmCreate ? 'Rippling through AMM creation' : null
                      const dexCollapsedSequences =
                        txType === 'OfferCancel'
                          ? myOrderbookSequences.length > 0
                            ? myOrderbookSequences
                            : [tx?.offerSequence].filter(Boolean)
                          : isMyDexOrder
                            ? [tx?.Sequence || tx?.TicketSequence].filter(Boolean)
                            : myOrderbookSequences
                      const showDexCollapsedSequence = isDexOfferTx && dexCollapsedSequences.length > 0
                      const dexTakerGets = txdata?.specification?.takerGets || myOrderbookChange?.takerGets || null
                      const dexTakerPays = txdata?.specification?.takerPays || myOrderbookChange?.takerPays || null
                      const isDexNotFullfilled =
                        isDexOfferTx && typeof dexOrderStatus === 'string' && !dexOrderStatus.includes('fulfilled')
                      const toSignedDexAmount = (amount, sign) => {
                        if (!amount) return null

                        if (typeof amount === 'object') {
                          const numericValue = Math.abs(Number(amount?.value || 0))
                          if (!Number.isFinite(numericValue)) return null
                          return {
                            ...amount,
                            value: String(sign < 0 ? -numericValue : numericValue)
                          }
                        }

                        const numericValue = Math.abs(Number(amount))
                        if (!Number.isFinite(numericValue)) return null
                        return sign < 0 ? -numericValue : numericValue
                      }
                      const buildTxAmountDisplay = ({ amount, sign, tone = 'grey', withIssuer = false }) => {
                        if (amount === null || typeof amount === 'undefined') return null

                        const displayAmount = typeof sign === 'number' ? toSignedDexAmount(amount, sign) : amount
                        if (!displayAmount) return null

                        const displayAmountFiat = tokenToFiat({
                          amount: displayAmount,
                          selectedCurrency,
                          fiatRate: txHistoricalRate,
                          asText: true
                        })

                        return {
                          collapsedNode: (
                            <span className="tx-inline-change-item">
                              <span className={`tx-inline-change ${tone}`}>
                                {amountFormat(displayAmount, {
                                  icon: true,
                                  short: true,
                                  maxFractionDigits: 2,
                                  showPlus: true
                                })}
                              </span>
                              {!!displayAmountFiat && <span className="tx-change-fiat">{displayAmountFiat}</span>}
                            </span>
                          ),
                          expandedText: amountFormat(displayAmount, {
                            icon: true,
                            withIssuer,
                            precise: 'nice',
                            showPlus: true
                          }),
                          expandedFiat: displayAmountFiat
                        }
                      }
                      const specialAmountRaw =
                        txType === 'EscrowCreate' ? tx?.Amount : txType === 'CheckCreate' ? tx?.SendMax : null
                      const txSpecialAmountDisplay = buildTxAmountDisplay({
                        amount: specialAmountRaw,
                        sign: isSource ? -1 : 1,
                        tone: 'grey'
                      })
                      const dexSpecifiedChanges = isDexNotFullfilled
                        ? [toSignedDexAmount(dexTakerGets, -1), toSignedDexAmount(dexTakerPays, 1)].filter(Boolean)
                        : []
                      const showDexSpecifiedOrderDetails =
                        isDexOfferTx &&
                        isMyDexOrder &&
                        typeof dexOrderStatus === 'string' &&
                        (dexOrderStatus.includes('placed') || dexOrderStatus === 'canceled') &&
                        (!!dexTakerGets || !!dexTakerPays)
                      const hasAmmVoteTradingFee = txType === 'AMMVote' && (tx?.TradingFee || tx?.TradingFee === 0)
                      const ammVoteTradingFeeText = hasAmmVoteTradingFee ? `${tx.TradingFee / 100000}%` : null
                      const isCreateNftOfferTx = txType === 'NFTokenCreateOffer'
                      const isAcceptNftOfferTx = txType === 'NFTokenAcceptOffer'
                      const isCancelNftOfferTx = txType === 'NFTokenCancelOffer'
                      const isNftOfferTx = isCreateNftOfferTx || isAcceptNftOfferTx || isCancelNftOfferTx
                      const outcomeOfferIds = (outcome?.nftokenOfferChanges || []).flatMap((entry) =>
                        (entry?.nftokenOfferChanges || []).map((offerChange) => offerChange?.index)
                      )
                      const nftOfferIds = Array.from(
                        new Set(
                          [
                            ...outcomeOfferIds,
                            ...(Array.isArray(tx?.NFTokenOffers) ? tx.NFTokenOffers : []),
                            tx?.NFTokenSellOffer,
                            tx?.NFTokenBuyOffer,
                            tx?.OfferID,
                            txdata?.specification?.nftokenOffer?.offerIndex,
                            txdata?.specification?.nftokenOffer?.offerID
                          ].filter(Boolean)
                        )
                      )
                      const nftOfferAmountRaw =
                        tx?.Amount ??
                        txdata?.specification?.nftokenOffer?.amount ??
                        txdata?.specification?.destination?.amount ??
                        txdata?.specification?.source?.amount ??
                        null
                      const hasNftOfferAmount = nftOfferAmountRaw !== null && typeof nftOfferAmountRaw !== 'undefined'
                      const nftOfferAmountNumeric =
                        typeof nftOfferAmountRaw === 'object' && nftOfferAmountRaw !== null
                          ? Number(nftOfferAmountRaw?.value)
                          : Number(nftOfferAmountRaw)
                      const isZeroNftOfferAmount =
                        hasNftOfferAmount && Number.isFinite(nftOfferAmountNumeric) && nftOfferAmountNumeric === 0
                      const nftOfferAmountExpandedText = hasNftOfferAmount
                        ? amountFormat(nftOfferAmountRaw, {
                            icon: true,
                            precise: 'nice'
                          })
                        : null
                      const nftOfferAmountFiatExpandedText = hasNftOfferAmount
                        ? tokenToFiat({
                            amount: nftOfferAmountRaw,
                            selectedCurrency,
                            fiatRate: txHistoricalRate,
                            asText: true,
                            absolute: true
                          })
                        : ''
                      const isBrokeredNftAccept = isAcceptNftOfferTx && !!tx?.NFTokenSellOffer && !!tx?.NFTokenBuyOffer
                      const brokerAddress = isBrokeredNftAccept ? sourceAddress || tx?.Account || null : null
                      const ammLpChange = changes.find(
                        (change) =>
                          change?.currencyDetails?.type === 'lp_token' &&
                          change?.currencyDetails?.asset &&
                          change?.currencyDetails?.asset2
                      )
                      const ammAsset = tx?.Asset || txdata?.specification?.asset || ammLpChange?.currencyDetails?.asset
                      const ammAsset2 =
                        tx?.Asset2 || txdata?.specification?.asset2 || ammLpChange?.currencyDetails?.asset2
                      const ammAssetCurrency =
                        typeof ammAsset === 'string' ? ammAsset : ammAsset?.currency || nativeCurrency
                      const ammAsset2Currency =
                        typeof ammAsset2 === 'string' ? ammAsset2 : ammAsset2?.currency || nativeCurrency
                      const ammPairLabel = `${niceCurrency(ammAssetCurrency)}/${niceCurrency(ammAsset2Currency)}`
                      const ammPairToken =
                        isAmmTx && ammAsset && ammAsset2
                          ? {
                              currency: 'LP',
                              currencyDetails: {
                                type: 'lp_token',
                                currency: ammPairLabel,
                                asset: ammAsset,
                                asset2: ammAsset2
                              }
                            }
                          : null
                      const resolvedCounterpartyAddress = isAccountDeleteTx
                        ? removedAccountAddress
                        : isAcceptNftOfferTx && nftViewerRole === 'seller'
                          ? nftBuyerAddress
                          : isAcceptNftOfferTx && nftViewerRole === 'buyer'
                            ? nftSellerAddress
                            : counterparty
                      const resolvedCounterpartyDetails = isAccountDeleteTx
                        ? removedAccountDetails
                        : isAcceptNftOfferTx && nftViewerRole === 'seller'
                          ? nftBuyerDetails
                          : isAcceptNftOfferTx && nftViewerRole === 'buyer'
                            ? nftSellerDetails
                            : counterpartyDetails
                      const trustSetSpecification = txdata?.specification
                      const trustSetToken =
                        tx?.TransactionType === 'TrustSet' && tx?.LimitAmount
                          ? {
                              ...tx.LimitAmount,
                              issuerDetails:
                                trustSetSpecification?.counterparty === tx?.LimitAmount?.issuer
                                  ? trustSetSpecification?.counterpartyDetails || tx?.LimitAmount?.issuerDetails
                                  : tx?.LimitAmount?.issuerDetails
                            }
                          : null
                      const trustSetLimitValue = Number(trustSetToken?.value || 0)
                      const trustSetCurrencyDisplay =
                        trustSetToken?.currency?.replace(/0+$/, '') || trustSetToken?.currency
                      const isTrustSetDeleted =
                        tx?.TransactionType === 'TrustSet' && !!trustSetToken && trustSetLimitValue === 0
                      const hasTrustSetLimit =
                        tx?.TransactionType === 'TrustSet' && !!trustSetToken && trustSetLimitValue > 0
                      const trustSetStatus = isTrustSetDeleted ? 'deleted' : hasTrustSetLimit ? 'added' : null
                      const didChanges = outcome?.didChanges || null
                      const isDidSetTx = txType === 'DIDSet'
                      const isDidDeleteTx = txType === 'DIDDelete'
                      const isDidTx = isDidSetTx || isDidDeleteTx
                      const didStatus = didChanges?.status || null
                      const didId = didChanges?.didID || null
                      const didShortId = shortHash(didId)
                      const didOriginalUri = didChanges?.uri ? decode(didChanges.uri) : ''
                      const didUpdatedUri = didChanges?.uriChange ? decode(didChanges.uriChange) : ''
                      const didTxLabel =
                        isDidDeleteTx || didStatus === 'deleted'
                          ? 'Removed DID'
                          : didStatus === 'modified'
                            ? 'Updated DID'
                            : 'Set DID'
                      const didStatusLabel =
                        isDidDeleteTx || didStatus === 'deleted'
                          ? 'Deleted'
                          : didStatus === 'modified'
                            ? 'Updated'
                            : didStatus === 'created'
                              ? 'Created'
                              : isDidSetTx
                                ? 'Set'
                                : null
                      const didOriginalCollapsedUri = didOriginalUri ? stripDomain(didOriginalUri) : ''
                      const didUpdatedCollapsedUri = didUpdatedUri ? stripDomain(didUpdatedUri) : ''
                      const didCollapsedModifiedMeta =
                        didOriginalCollapsedUri && didUpdatedCollapsedUri
                          ? `${didOriginalCollapsedUri} -> ${didUpdatedCollapsedUri}`
                          : didUpdatedCollapsedUri || didOriginalCollapsedUri || didShortId
                      const didCollapsedMeta =
                        isDidDeleteTx || didStatus === 'deleted'
                          ? didOriginalCollapsedUri || didShortId
                          : didStatus === 'modified'
                            ? didCollapsedModifiedMeta
                            : didUpdatedCollapsedUri || didOriginalCollapsedUri || didShortId

                      const failedStatusText = !isSuccessful ? outcome?.result || 'Failed' : null
                      const failedStatusShort = failedStatusText
                        ? failedStatusText.startsWith('te')
                          ? shortErrorCode(failedStatusText)
                          : failedStatusText.length > 3
                            ? failedStatusText.slice(3)
                            : failedStatusText
                        : null
                      const hasDexOfferRates =
                        isDexOfferTx &&
                        !isRipplingTransaction &&
                        changes.length === 2 &&
                        Number.isFinite(Number(changes?.[0]?.value)) &&
                        Number.isFinite(Number(changes?.[1]?.value)) &&
                        Number(changes?.[0]?.value) !== 0 &&
                        Number(changes?.[1]?.value) !== 0
                      const dexOfferRateAtoB = hasDexOfferRates
                        ? Math.abs(Number(changes[1].value) / Number(changes[0].value))
                        : null
                      const dexOfferRateBtoA = hasDexOfferRates
                        ? Math.abs(Number(changes[0].value) / Number(changes[1].value))
                        : null
                      const isFreeNftAccept =
                        isAcceptNftOfferTx &&
                        (isZeroNftOfferAmount || (!collapsedPrimaryChange && !collapsedSecondaryChange))
                      const directionLabel = resolvedCounterpartyAddress
                        ? isAccountDeleteTx
                          ? 'From removed account'
                          : isAcceptNftOfferTx && nftViewerRole === 'seller'
                            ? 'To'
                            : isAcceptNftOfferTx && nftViewerRole === 'buyer'
                              ? 'From'
                              : isCreateNftOfferTx && isSource && !!counterparty
                                ? 'For'
                                : isBrokeredNftAccept
                                  ? 'By broker'
                                  : isSource
                                    ? 'To'
                                    : 'From'
                        : null
                      const accountSetSpec = txdata?.specification || {}
                      const accountSetSettings = outcome?.settingsChanges || {}
                      const accountSetCollapsedChange = (() => {
                        if (txType !== 'AccountSet') return null

                        const changes = []

                        if (tx?.MessageKey !== undefined) {
                          const messageKeyStatus = accountSetSpec?.messageKey ? 'set' : 'removed'
                          changes.push(`Message key: ${messageKeyStatus}`)
                        }
                        if (tx?.Domain !== undefined) {
                          changes.push(
                            `Domain: ${accountSetSpec?.domain ? stripDomain(accountSetSpec.domain) : 'removed'}`
                          )
                        }
                        if (accountSetSpec?.defaultRipple !== undefined) {
                          changes.push(`Default ripple: ${accountSetSpec.defaultRipple ? 'enabled' : 'disabled'}`)
                        }
                        if (
                          accountSetSpec?.disallowXRP !== undefined ||
                          accountSetSettings?.disallowXRP !== undefined
                        ) {
                          changes.push(
                            `Incoming ${nativeCurrency}: ${
                              accountSetSpec?.disallowXRP || accountSetSettings?.disallowXRP ? 'disallow' : 'allow'
                            }`
                          )
                        }
                        if (
                          accountSetSpec?.requireDestTag !== undefined ||
                          accountSetSettings?.requireDestTag !== undefined
                        ) {
                          changes.push(
                            `Destination tag: ${
                              accountSetSpec?.requireDestTag || accountSetSettings?.requireDestTag
                                ? 'require'
                                : "don't require"
                            }`
                          )
                        }
                        if (accountSetSpec?.depositAuth !== undefined) {
                          changes.push(`Deposit authorization: ${accountSetSpec.depositAuth ? 'enabled' : 'disabled'}`)
                        }
                        if (accountSetSpec?.disableMaster !== undefined) {
                          changes.push(`Master key: ${accountSetSpec.disableMaster ? 'disabled' : 'enabled'}`)
                        }
                        if (accountSetSpec?.noFreeze) {
                          changes.push('No freeze: enabled')
                        }
                        if (
                          accountSetSpec?.requireAuth !== undefined ||
                          accountSetSettings?.requireAuth !== undefined
                        ) {
                          changes.push(
                            `Require authorization: ${
                              accountSetSpec?.requireAuth || accountSetSettings?.requireAuth ? 'enabled' : 'disabled'
                            }`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingCheck !== undefined) {
                          changes.push(`Incoming check: ${accountSetSpec.disallowIncomingCheck ? 'disallow' : 'allow'}`)
                        }
                        if (accountSetSpec?.disallowIncomingPayChan !== undefined) {
                          changes.push(
                            `Incoming payment channel: ${accountSetSpec.disallowIncomingPayChan ? 'disallow' : 'allow'}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingNFTokenOffer !== undefined) {
                          changes.push(
                            `Incoming NFT offer: ${accountSetSpec.disallowIncomingNFTokenOffer ? 'disallow' : 'allow'}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingTrustline !== undefined) {
                          changes.push(
                            `Incoming trustline: ${accountSetSpec.disallowIncomingTrustline ? 'disallow' : 'allow'}`
                          )
                        }
                        if (accountSetSpec?.enableTransactionIDTracking !== undefined) {
                          changes.push(
                            `Transaction ID tracking: ${
                              accountSetSpec.enableTransactionIDTracking ? 'enabled' : 'disabled'
                            }`
                          )
                        }
                        if (accountSetSpec?.globalFreeze !== undefined) {
                          changes.push(`Global freeze: ${accountSetSpec.globalFreeze ? 'enabled' : 'disabled'}`)
                        }
                        if (accountSetSpec?.authorizedMinter !== undefined) {
                          changes.push(`Authorized minter: ${accountSetSpec.authorizedMinter ? 'enabled' : 'disabled'}`)
                        }
                        if (accountSetSpec?.nftokenMinter !== undefined) {
                          if (accountSetSpec.nftokenMinter) {
                            changes.push({ type: 'nftMinter', address: accountSetSpec.nftokenMinter })
                          } else {
                            changes.push('NFT minter: removed')
                          }
                        }
                        if (accountSetSpec?.allowTrustLineClawback !== undefined) {
                          changes.push(
                            `Trustline clawback: ${accountSetSpec.allowTrustLineClawback ? 'allowed' : 'disallow'}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingRemit !== undefined) {
                          changes.push(`Incoming remit: ${accountSetSpec.disallowIncomingRemit ? 'disallow' : 'allow'}`)
                        }

                        return changes[0] || null
                      })()
                      const accountSetCollapsedChangeNode = (() => {
                        if (!accountSetCollapsedChange) return null
                        if (typeof accountSetCollapsedChange === 'string') return accountSetCollapsedChange
                        if (accountSetCollapsedChange?.type === 'nftMinter') {
                          return (
                            <>
                              NFT minter:{' '}
                              <AddressWithIconInline
                                data={{
                                  address: accountSetCollapsedChange.address,
                                  addressDetails: {}
                                }}
                                options={{ short: 6 }}
                              />
                            </>
                          )
                        }
                        return null
                      })()
                      const nftOfferLegacyLabel = (() => {
                        const nonBrokerDirectionSuffix = counterparty ? (isSource ? 'to' : 'from') : 'by'

                        if (isAcceptNftOfferTx) {
                          if (!isSuccessful) return 'NFT offer accept'
                          if (nftViewerRole === 'seller') return isFreeNftAccept ? 'Transferred NFT to' : 'Sold NFT to'
                          if (nftViewerRole === 'buyer')
                            return isFreeNftAccept ? 'Received NFT from' : 'Bought NFT from'

                          const amountChangeValue = Number(collapsedPrimaryChange?.value || 0)
                          if (amountChangeValue > 0)
                            return isBrokeredNftAccept ? 'Sold NFT by' : `Sold NFT ${nonBrokerDirectionSuffix}`
                          if (amountChangeValue < 0)
                            return isBrokeredNftAccept ? 'Bought NFT by' : `Bought NFT ${nonBrokerDirectionSuffix}`

                          if (!collapsedPrimaryChange && !collapsedSecondaryChange) {
                            if (nftDestination?.address === data?.address) return 'Received NFT offer from'
                            if (nftSource?.address === data?.address) return 'NFT transfer to'
                            return 'NFT transfer by'
                          }

                          if (isBrokeredNftAccept) return 'NFT offer accept by'
                          return 'NFT offer accept'
                        }

                        if (isCreateNftOfferTx) {
                          const amountChangeValue = Number(collapsedPrimaryChange?.value || 0)
                          if (amountChangeValue > 0) return `Sold NFT ${nonBrokerDirectionSuffix}`
                          if (amountChangeValue < 0) return `Bought NFT ${nonBrokerDirectionSuffix}`

                          const direction = txdata?.specification?.flags?.sellToken ? 'Sell' : 'Buy'
                          const isIncomingOffer = tx?.Account !== data?.address

                          if (isIncomingOffer) {
                            const amountAsNumber = Number(tx?.Amount || 0)
                            if (direction === 'Sell') {
                              if (Number.isFinite(amountAsNumber) && amountAsNumber === 0) {
                                return 'Received NFT offer from'
                              }
                              return 'Received offer to buy NFT from'
                            }
                            return `Received NFT ${direction} offer from`
                          }

                          if (counterparty) {
                            return `Create NFT ${direction} offer for`
                          }

                          return `Create NFT ${direction} offer`
                        }

                        if (isCancelNftOfferTx) {
                          return 'Cancel NFT offer'
                        }

                        return null
                      })()
                      const isNftTransferLabel =
                        typeof nftOfferLegacyLabel === 'string' &&
                        (nftOfferLegacyLabel.startsWith('NFT transfer') ||
                          nftOfferLegacyLabel.startsWith('Received NFT offer'))
                      const isFreeNftTransfer =
                        isNftTransferLabel && (isZeroNftOfferAmount || nftOfferAmountRaw === '0')
                      const showFreeNftBadge = isFreeNftTransfer || isFreeNftAccept
                      const showFreeNftBadgeGreen =
                        showFreeNftBadge &&
                        typeof nftOfferLegacyLabel === 'string' &&
                        nftOfferLegacyLabel.startsWith('Received NFT from')
                      const isNftSellOffer = !!txdata?.specification?.flags?.sellToken
                      const isNftBuyOffer = !isNftSellOffer
                      const isIncomingSellOffer = isCreateNftOfferTx && tx?.Account !== data?.address && isNftSellOffer
                      const isOutgoingSellOffer = isCreateNftOfferTx && tx?.Account === data?.address && isNftSellOffer
                      const isCreateNftBuyOfferTx = isCreateNftOfferTx && isNftBuyOffer
                      const isNftMintTx = tx?.TransactionType === 'NFTokenMint'
                      const nftMintDestinationAddress = tx?.Destination || destinationAddress
                      const nftMintAmountRaw =
                        tx?.Amount ??
                        txdata?.specification?.amount ??
                        txdata?.specification?.destination?.amount ??
                        null
                      const nftMintAmountNumeric = (() => {
                        if (nftMintAmountRaw === null || typeof nftMintAmountRaw === 'undefined') return null
                        if (typeof nftMintAmountRaw === 'object') {
                          const value = Number(
                            nftMintAmountRaw?.value ?? nftMintAmountRaw?.amount ?? nftMintAmountRaw?.drops
                          )
                          return Number.isFinite(value) ? value : null
                        }
                        const value = Number(nftMintAmountRaw)
                        return Number.isFinite(value) ? value : null
                      })()
                      const nftMintSpecialLabel =
                        isNftMintTx && nftMintDestinationAddress
                          ? nftMintAmountNumeric === 0
                            ? 'NFT Mint with Free offer to'
                            : 'NFT Mint with Sell Offer for'
                          : null
                      const showNftMintSellOfferAmount =
                        nftMintSpecialLabel === 'NFT Mint with Sell Offer for' &&
                        nftMintAmountRaw !== null &&
                        typeof nftMintAmountRaw !== 'undefined'
                      const incomingSellOfferDisplay =
                        !showFreeNftBadge && isIncomingSellOffer && hasNftOfferAmount
                          ? buildTxAmountDisplay({
                              amount: nftOfferAmountRaw,
                              sign: -1,
                              tone: 'orange',
                              withIssuer: true
                            })
                          : null
                      const outgoingSellOfferDisplay =
                        !showFreeNftBadge && isOutgoingSellOffer && hasNftOfferAmount
                          ? buildTxAmountDisplay({
                              amount: nftOfferAmountRaw,
                              sign: 1,
                              tone: 'orange',
                              withIssuer: true
                            })
                          : null
                      const createNftBuyOfferDisplay =
                        !showFreeNftBadge && isCreateNftBuyOfferTx && hasNftOfferAmount
                          ? buildTxAmountDisplay({
                              amount: nftOfferAmountRaw,
                              sign: isSource ? -1 : 1,
                              tone: 'orange',
                              withIssuer: true
                            })
                          : null
                      const nftMintSellOfferDisplay = showNftMintSellOfferAmount
                        ? buildTxAmountDisplay({
                            amount: nftMintAmountRaw,
                            sign: 1,
                            tone: 'orange',
                            withIssuer: true
                          })
                        : null
                      const nftOfferAmountDetailDisplay =
                        incomingSellOfferDisplay || outgoingSellOfferDisplay || createNftBuyOfferDisplay
                      const offerAmountExpandedText =
                        nftOfferAmountDetailDisplay?.expandedText || nftOfferAmountExpandedText
                      const offerAmountFiatDetailText =
                        nftOfferAmountDetailDisplay?.expandedFiat || nftOfferAmountFiatExpandedText
                      const nftCollapsedSpecialDisplay =
                        incomingSellOfferDisplay ||
                        outgoingSellOfferDisplay ||
                        createNftBuyOfferDisplay ||
                        nftMintSellOfferDisplay
                      const fallbackTxTypeLabel = getTransactionTypeLabel(txType)
                      const escrowCreateCollapsedLabel =
                        txType === 'EscrowCreate' ? (isSource ? 'Escrow sent to' : 'Escrow received from') : null
                      const checkCreateCollapsedLabel =
                        txType === 'CheckCreate' ? (isSource ? 'Check sent to' : 'Check received from') : null
                      const txTypeShortLabel =
                        dexOfferShortLabel ||
                        ammCreateShortLabel ||
                        (isRipplingTransaction ? 'Rippling' : null) ||
                        (isSelfPayment ? 'Swap' : null) ||
                        (isAccountDeleteTx ? 'Payment from deleted account' : null) ||
                        (isDidTx ? didTxLabel : null) ||
                        escrowCreateCollapsedLabel ||
                        checkCreateCollapsedLabel ||
                        nftOfferLegacyLabel ||
                        nftMintSpecialLabel ||
                        fallbackTxTypeLabel
                      const txTypeCollapsedLabel =
                        isSelfPayment || isAccountDeleteTx || isRipplingTransaction
                          ? txTypeShortLabel
                          : isDidTx
                            ? txTypeShortLabel
                            : txType === 'NFTokenMint'
                              ? txTypeShortLabel
                              : txType === 'NFTokenBurn'
                                ? txTypeShortLabel
                                : tx?.TransactionType === 'TrustSet'
                                  ? counterparty
                                    ? `${isSource ? 'to' : 'from'}`
                                    : ''
                                  : isNftOfferTx
                                    ? txTypeShortLabel
                                    : isDexOfferTx
                                      ? txTypeShortLabel
                                      : txType === 'EscrowCreate'
                                        ? txTypeShortLabel
                                        : txType === 'CheckCreate'
                                          ? txTypeShortLabel
                                          : counterparty
                                            ? `${txTypeShortLabel} ${isSource ? 'to' : 'from'}`
                                            : txTypeShortLabel
                      const showBrokerInCollapsedTitle =
                        isBrokeredNftAccept &&
                        !!brokerAddress &&
                        (nftViewerRole === 'seller' || nftViewerRole === 'buyer')
                      const brokerCollapsedAction =
                        nftViewerRole === 'seller'
                          ? isFreeNftAccept
                            ? 'transferred NFT to'
                            : 'sold NFT to'
                          : nftViewerRole === 'buyer'
                            ? isFreeNftAccept
                              ? 'received NFT from'
                              : 'bought NFT from'
                            : ''
                      const txTypeIconNode = getAccountTransactionTypeIcon({
                        txType,
                        isSource,
                        isRipplingPayment: isRipplingTransaction,
                        isSelfPayment,
                        isAccountDeleteTx,
                        isAmmTx,
                        nftViewerRole
                      })

                      return (
                        <div
                          className={`asset-item token-asset-item tx-asset-item ${isExpanded ? 'expanded' : ''} ${!isSuccessful ? 'tx-failed' : ''}`}
                          key={txKey}
                          onClick={() => setExpandedTransactionKey(isExpanded ? null : txKey)}
                        >
                          <div className="asset-main tx-asset-main">
                            <div className="asset-logo tx-asset-logo">
                              <div className="tx-collapsed-top">
                                <span className="tx-type-main">
                                  {txTypeIconNode && <span className="tx-type-icon">{txTypeIconNode}</span>}
                                  {showBrokerInCollapsedTitle ? (
                                    <span className="tx-broker-stack">
                                      <span className="tx-broker-inline">
                                        <span>Broker </span>
                                        <AddressWithIconInline
                                          data={{
                                            address: brokerAddress,
                                            addressDetails: txdata?.specification?.source?.addressDetails || {}
                                          }}
                                          options={{ short: 6 }}
                                        />
                                      </span>
                                      <span className="tx-broker-action">{brokerCollapsedAction}</span>
                                    </span>
                                  ) : (
                                    txTypeCollapsedLabel
                                  )}
                                </span>
                                <span className="tx-time tx-time-top">
                                  {tx?.date ? timeFromNow(tx.date, i18n, 'ripple') : '-'}
                                </span>
                              </div>

                              <div className="tx-collapsed-meta">
                                {txType === 'AccountSet' && accountSetCollapsedChangeNode && (
                                  <span className="tx-accountset-inline">{accountSetCollapsedChangeNode}</span>
                                )}
                                {isDidTx && !!didCollapsedMeta && (
                                  <span className="tx-accountset-inline">{didCollapsedMeta}</span>
                                )}
                                {showDexCollapsedSequence && (
                                  <span className="tx-accountset-inline">
                                    {dexCollapsedSequences.length > 1 ? 'Offer sequences: ' : 'Offer sequence: '}
                                    {dexCollapsedSequences.join(', ')}
                                  </span>
                                )}
                                {ammPairToken && (
                                  <span className="tx-amm-token-meta">
                                    <CurrencyWithIcon
                                      token={ammPairToken}
                                      hideIssuer
                                      options={{ disableTokenLink: true }}
                                    />
                                  </span>
                                )}
                                {tx?.TransactionType === 'TrustSet' && trustSetToken && (
                                  <span className="tx-trustset-inline">
                                    <CurrencyWithIcon
                                      token={{ ...trustSetToken }}
                                      options={{ disableTokenLink: true }}
                                    />
                                  </span>
                                )}
                                {tx?.TransactionType !== 'TrustSet' &&
                                  !isSelfPayment &&
                                  !isRipplingTransaction &&
                                  !isDexOfferTx &&
                                  resolvedCounterpartyAddress && (
                                    <span className="tx-counterparty-inline">
                                      <AddressWithIconInline
                                        data={{
                                          address: resolvedCounterpartyAddress,
                                          addressDetails: resolvedCounterpartyDetails || {}
                                        }}
                                        options={{ short: 6 }}
                                      />
                                    </span>
                                  )}
                              </div>
                            </div>

                            <div className="asset-value tx-collapsed-change">
                              {failedStatusShort ? (
                                <span className="tx-inline-status orange">{failedStatusShort}</span>
                              ) : tx?.TransactionType === 'TrustSet' ? (
                                trustSetStatus ? (
                                  <span className="tx-inline-status orange">{trustSetStatus}</span>
                                ) : null
                              ) : isDexNotFullfilled && dexSpecifiedChanges.length > 0 ? (
                                <>
                                  {dexSpecifiedChanges.map((change, changeIndex) => (
                                    <span className="tx-inline-change-item" key={`${txKey}-dex-spec-${changeIndex}`}>
                                      <span className="tx-inline-change grey">
                                        {amountFormat(change, {
                                          icon: true,
                                          short: true,
                                          maxFractionDigits: 2,
                                          showPlus: true
                                        })}
                                      </span>
                                    </span>
                                  ))}
                                </>
                              ) : hasAmmVoteTradingFee ? (
                                <span className="tx-inline-status grey">Trading fee: {ammVoteTradingFeeText}</span>
                              ) : txSpecialAmountDisplay ? (
                                txSpecialAmountDisplay.collapsedNode
                              ) : nftCollapsedSpecialDisplay ? (
                                nftCollapsedSpecialDisplay.collapsedNode
                              ) : showFreeNftBadge ? (
                                <span className={`tx-offer-free ${showFreeNftBadgeGreen ? 'green' : 'orange'}`}>
                                  Free
                                </span>
                              ) : canCollapseRipplingAmounts ? (
                                <span className="tx-inline-change-item">
                                  <span className="tx-inline-change orange">
                                    {amountFormat(collapsedPrimaryChange, {
                                      icon: !isLpAmount(collapsedPrimaryChange),
                                      short: true,
                                      maxFractionDigits: 2,
                                      absolute: true
                                    })}
                                  </span>
                                  {!!ripplingCollapsedFiat && (
                                    <span className="tx-change-fiat">{ripplingCollapsedFiat}</span>
                                  )}
                                </span>
                              ) : (
                                <>
                                  {collapsedPrimaryChange && (
                                    <span className="tx-inline-change-item">
                                      <span className={`tx-inline-change ${primaryChangeClass}`}>
                                        {amountFormat(collapsedPrimaryChange, {
                                          icon: !isLpAmount(collapsedPrimaryChange),
                                          short: true,
                                          maxFractionDigits: 2,
                                          showPlus: true
                                        })}
                                      </span>
                                      {!!primaryChangeFiat && (
                                        <span className="tx-change-fiat">{primaryChangeFiat}</span>
                                      )}
                                    </span>
                                  )}
                                  {collapsedSecondaryChange && (
                                    <span className="tx-inline-change-item">
                                      <span className={`tx-inline-change ${secondaryChangeClass}`}>
                                        {amountFormat(collapsedSecondaryChange, {
                                          icon: !isLpAmount(collapsedSecondaryChange),
                                          short: true,
                                          maxFractionDigits: 2,
                                          showPlus: true
                                        })}
                                      </span>
                                      {!!secondaryChangeFiat && (
                                        <span className="tx-change-fiat">{secondaryChangeFiat}</span>
                                      )}
                                    </span>
                                  )}
                                  {collapsedMoreCount > 0 && (
                                    <span className="tx-inline-more">+{collapsedMoreCount} more</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="asset-details">
                              <div className="detail-row">
                                <span>Type:</span>
                                <span>{tx?.TransactionType}</span>
                              </div>

                              {showDexSpecifiedOrderDetails && !!dexTakerGets && (
                                <div className="detail-row">
                                  <span>
                                    {dexOfferDirection === 'Sell' ? 'Specified sell exactly:' : 'Specified pay up to:'}
                                  </span>
                                  <span>
                                    {amountFormat(dexTakerGets, {
                                      icon: true,
                                      withIssuer: true
                                    })}
                                  </span>
                                </div>
                              )}

                              {showDexSpecifiedOrderDetails && !!dexTakerPays && (
                                <div className="detail-row">
                                  <span>
                                    {dexOfferDirection === 'Sell'
                                      ? 'Specified receive at least:'
                                      : 'Specified receive exactly:'}
                                  </span>
                                  <span>
                                    {amountFormat(dexTakerPays, {
                                      icon: true,
                                      withIssuer: true
                                    })}
                                  </span>
                                </div>
                              )}

                              {hasAmmVoteTradingFee && (
                                <div className="detail-row">
                                  <span>Trading fee:</span>
                                  <span>{ammVoteTradingFeeText}</span>
                                </div>
                              )}

                              {failedStatusText && (
                                <>
                                  <div className="detail-row">
                                    <span>Error code:</span>
                                    <span className="orange">{failedStatusText}</span>
                                  </div>
                                  <div className="detail-row tx-fail-description-row">
                                    <span>Error:</span>
                                    <span className="orange tx-fail-description-text">
                                      {errorCodeDescription(failedStatusText) || failedStatusText}
                                    </span>
                                  </div>
                                </>
                              )}

                              {!isSelfPayment && !isDexOfferTx && resolvedCounterpartyAddress && (
                                <div className="detail-row">
                                  <span>{directionLabel}:</span>
                                  <span className="copy-inline">
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <AddressWithIconInline
                                        data={{ address: resolvedCounterpartyAddress }}
                                        options={{ short: 6, showAddress: true }}
                                      />
                                    </span>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={resolvedCounterpartyAddress} />
                                    </span>
                                  </span>
                                </div>
                              )}

                              {brokerAddress && (
                                <div className="detail-row">
                                  <span>By broker:</span>
                                  <span className="copy-inline">
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <AddressWithIconInline
                                        data={{ address: brokerAddress }}
                                        options={{ short: 6, showAddress: true }}
                                      />
                                    </span>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={brokerAddress} />
                                    </span>
                                  </span>
                                </div>
                              )}

                              {isTagValid(tx?.DestinationTag) && (
                                <div className="detail-row">
                                  <span>Destination tag:</span>
                                  <span>{tx.DestinationTag}</span>
                                </div>
                              )}

                              {tx?.TransactionType === 'TrustSet' && trustSetToken && (
                                <>
                                  <div className="detail-row">
                                    <span>Currency:</span>
                                    <span className="copy-inline">
                                      <span>{trustSetCurrencyDisplay || '-'}</span>
                                      {!!trustSetToken?.issuer && !!trustSetToken?.currency && (
                                        <Link
                                          href={`/token/${trustSetToken.issuer}/${trustSetToken.currency}`}
                                          className="inline-link-icon tooltip"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <LinkIcon />
                                          <span className="tooltiptext no-brake">Token page</span>
                                        </Link>
                                      )}
                                      {!!trustSetCurrencyDisplay && (
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={trustSetCurrencyDisplay} />
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {!!trustSetToken?.issuer && (
                                    <div className="detail-row">
                                      <span>Issuer:</span>
                                      <span className="copy-inline">
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <AddressWithIconInline
                                            data={{ address: trustSetToken.issuer }}
                                            options={{ short: 6, showAddress: true }}
                                          />
                                        </span>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={trustSetToken.issuer} />
                                        </span>
                                      </span>
                                    </div>
                                  )}

                                  <div className="detail-row">
                                    <span>Limit:</span>
                                    <span>{fullNiceNumber(trustSetToken?.value || 0)}</span>
                                  </div>
                                </>
                              )}

                              {txType === 'AccountSet' && (
                                <>
                                  {tx?.MessageKey !== undefined && (
                                    <div className="detail-row">
                                      <span>Message key:</span>
                                      {accountSetSpec?.messageKey ? (
                                        <span className="copy-inline">
                                          <span className="address-text">{accountSetSpec.messageKey}</span>
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={accountSetSpec.messageKey} />
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="orange">removed</span>
                                      )}
                                    </div>
                                  )}

                                  {tx?.Domain !== undefined && (
                                    <div className="detail-row">
                                      <span>Domain:</span>
                                      <span className="orange">{accountSetSpec?.domain || 'removed'}</span>
                                    </div>
                                  )}

                                  {accountSetSpec?.defaultRipple !== undefined && (
                                    <div className="detail-row">
                                      <span>Default ripple:</span>
                                      <span className="orange">
                                        {accountSetSpec.defaultRipple ? 'enabled' : 'disabled'}
                                      </span>
                                    </div>
                                  )}

                                  {(accountSetSpec?.disallowXRP !== undefined ||
                                    accountSetSettings?.disallowXRP !== undefined) && (
                                    <div className="detail-row">
                                      <span>Incoming {nativeCurrency}:</span>
                                      <span className="orange">
                                        {accountSetSpec?.disallowXRP || accountSetSettings?.disallowXRP
                                          ? 'disallow'
                                          : 'allow'}
                                      </span>
                                    </div>
                                  )}

                                  {(accountSetSpec?.requireDestTag !== undefined ||
                                    accountSetSettings?.requireDestTag !== undefined) && (
                                    <div className="detail-row">
                                      <span>Destination tag:</span>
                                      <span className="orange">
                                        {accountSetSpec?.requireDestTag || accountSetSettings?.requireDestTag
                                          ? 'require'
                                          : "don't require"}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.depositAuth !== undefined && (
                                    <div className="detail-row">
                                      <span>Deposit authorization:</span>
                                      <span className="orange">
                                        {accountSetSpec.depositAuth ? 'enabled' : 'disabled'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disableMaster !== undefined && (
                                    <div className="detail-row">
                                      <span>Master key:</span>
                                      <span className="red">
                                        {accountSetSpec.disableMaster ? 'disabled' : 'enabled'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.noFreeze && (
                                    <div className="detail-row">
                                      <span>No freeze:</span>
                                      <span className="orange">enabled</span>
                                    </div>
                                  )}

                                  {(accountSetSpec?.requireAuth !== undefined ||
                                    accountSetSettings?.requireAuth !== undefined) && (
                                    <div className="detail-row">
                                      <span>Require authorization:</span>
                                      <span className="orange">
                                        {accountSetSpec?.requireAuth || accountSetSettings?.requireAuth
                                          ? 'enabled'
                                          : 'disabled'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingCheck !== undefined && (
                                    <div className="detail-row">
                                      <span>Incoming check:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingCheck ? 'disallow' : 'allow'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingPayChan !== undefined && (
                                    <div className="detail-row">
                                      <span>Incoming payment channel:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingPayChan ? 'disallow' : 'allow'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingNFTokenOffer !== undefined && (
                                    <div className="detail-row">
                                      <span>Incoming NFT offer:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingNFTokenOffer ? 'disallow' : 'allow'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingTrustline !== undefined && (
                                    <div className="detail-row">
                                      <span>Incoming trustline:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingTrustline ? 'disallow' : 'allow'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.enableTransactionIDTracking !== undefined && (
                                    <div className="detail-row">
                                      <span>Transaction ID tracking:</span>
                                      <span className="orange">
                                        {accountSetSpec.enableTransactionIDTracking ? 'enabled' : 'disabled'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.globalFreeze !== undefined && (
                                    <div className="detail-row">
                                      <span>Global freeze:</span>
                                      <span className="orange">
                                        {accountSetSpec.globalFreeze ? 'enabled' : 'disabled'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.authorizedMinter !== undefined && (
                                    <div className="detail-row">
                                      <span>Authorized minter:</span>
                                      <span className="orange">
                                        {accountSetSpec.authorizedMinter ? 'enabled' : 'disabled'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.nftokenMinter !== undefined && (
                                    <div className="detail-row">
                                      <span>NFT minter:</span>
                                      {accountSetSpec?.nftokenMinter ? (
                                        <span className="copy-inline">
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <AddressWithIconInline
                                              data={{ address: accountSetSpec.nftokenMinter }}
                                              options={{ short: 6, showAddress: true }}
                                            />
                                          </span>
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={accountSetSpec.nftokenMinter} />
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="orange">removed</span>
                                      )}
                                    </div>
                                  )}

                                  {accountSetSpec?.allowTrustLineClawback !== undefined && (
                                    <div className="detail-row">
                                      <span>Trustline clawback:</span>
                                      <span className="orange">
                                        {accountSetSpec.allowTrustLineClawback ? 'allowed' : 'disallow'}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingRemit !== undefined && (
                                    <div className="detail-row">
                                      <span>Incoming remit:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingRemit ? 'disallow' : 'allow'}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {isDidTx && (
                                <>
                                  {!!didStatusLabel && (
                                    <div className="detail-row">
                                      <span>Status:</span>
                                      <span className="orange">{didStatusLabel}</span>
                                    </div>
                                  )}

                                  {!!didId && (
                                    <div className="detail-row">
                                      <span>DID ID:</span>
                                      <span className="copy-inline id-inline">
                                        <span className="address-text" title={didId}>
                                          {didShortId}
                                        </span>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={didId} />
                                        </span>
                                      </span>
                                    </div>
                                  )}

                                  {isDidDeleteTx && !!didOriginalUri && (
                                    <div className="detail-row">
                                      <span>Removed URI:</span>
                                      <span className="brake" title={didOriginalUri}>
                                        {didOriginalUri}
                                      </span>
                                    </div>
                                  )}

                                  {isDidSetTx && didStatus === 'modified' && !!didOriginalUri && (
                                    <div className="detail-row">
                                      <span>Previous URI:</span>
                                      <span className="brake" title={didOriginalUri}>
                                        {didOriginalUri}
                                      </span>
                                    </div>
                                  )}

                                  {isDidSetTx && didStatus === 'modified' && !!didUpdatedUri && (
                                    <div className="detail-row">
                                      <span>Updated URI:</span>
                                      <span className="brake" title={didUpdatedUri}>
                                        {didUpdatedUri}
                                      </span>
                                    </div>
                                  )}

                                  {isDidSetTx && didStatus !== 'modified' && !!(didUpdatedUri || didOriginalUri) && (
                                    <div className="detail-row">
                                      <span>URI:</span>
                                      <span className="brake" title={didUpdatedUri || didOriginalUri}>
                                        {didUpdatedUri || didOriginalUri}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              <div className="detail-row">
                                <span>Timestamp:</span>
                                <span>{tx?.date ? fullDateAndTime(tx.date, 'ripple') : '-'}</span>
                              </div>

                              {!!selectedCurrency &&
                                !isRipplingTransaction &&
                                (shouldShowExpandedRate || isDexOfferTx) &&
                                !hasDexOfferRates && (
                                  <div className="detail-row">
                                    <span>Rate:</span>
                                    <span suppressHydrationWarning>
                                      {txHistoricalRate
                                        ? `1 ${nativeCurrency} = ${shortNiceNumber(txHistoricalRate, 2, 1, selectedCurrency)}`
                                        : '-'}
                                    </span>
                                  </div>
                                )}

                              {isSource && (tx?.Sequence || tx?.TicketSequence) && (
                                <div className="detail-row">
                                  <span>{tx?.TicketSequence ? 'Ticket sequence:' : 'Sequence:'}</span>
                                  <span>{tx?.Sequence || tx?.TicketSequence}</span>
                                </div>
                              )}

                              {isSource &&
                                tx?.Fee &&
                                (() => {
                                  const feeFiatText = tokenToFiat({
                                    amount: tx.Fee,
                                    selectedCurrency,
                                    fiatRate: txHistoricalRate,
                                    asText: true
                                  })

                                  return (
                                    <div className="detail-row">
                                      <span>Fee:</span>
                                      <span className="tx-detail-stacked-amount">
                                        <span className="tx-inline-change grey">
                                          {amountFormat(tx.Fee, { icon: true, precise: 'nice' })}
                                        </span>
                                        {!!feeFiatText && <span className="tx-change-fiat">{feeFiatText}</span>}
                                      </span>
                                    </div>
                                  )
                                })()}

                              {txSpecialAmountDisplay && (
                                <div className="detail-row">
                                  <span>Amount:</span>
                                  <span className="tx-detail-stacked-amount">
                                    <span className="grey">{txSpecialAmountDisplay.expandedText}</span>
                                    {!!txSpecialAmountDisplay.expandedFiat && (
                                      <span className="tx-change-fiat">{txSpecialAmountDisplay.expandedFiat}</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {txDapp && (
                                <div className="detail-row">
                                  <span>App/Dapp:</span>
                                  <span>{txDapp}</span>
                                </div>
                              )}

                              {txdata?.specification?.memos && memoNode(txdata.specification.memos, 'detail')}

                              {changes.length > 0 && (
                                <div className="detail-row tx-detail-change-row">
                                  <span>Balance changes:</span>
                                  <span className="tx-detail-change-list">
                                    {changes.map((change, changeIndex) => {
                                      const changeFiat = tokenToFiat({
                                        amount: change,
                                        selectedCurrency,
                                        fiatRate: txHistoricalRate,
                                        asText: true
                                      })
                                      return (
                                        <span className="tx-change-row" key={`${txKey}-change-${changeIndex}`}>
                                          <span>
                                            {amountFormat(change, {
                                              icon: !isLpAmount(change),
                                              withIssuer: !(isAmmDepositOrWithdraw && isLpAmount(change)),
                                              bold: true,
                                              color: 'direction',
                                              precise: 'nice',
                                              showPlus: true
                                            })}
                                          </span>
                                          {!!changeFiat && <span className="tx-change-fiat">{changeFiat}</span>}
                                        </span>
                                      )
                                    })}
                                  </span>
                                </div>
                              )}

                              {hasDexOfferRates && (
                                <div className="detail-row tx-detail-change-row">
                                  <span>Rates:</span>
                                  <span className="tx-detail-change-list">
                                    {!!selectedCurrency && (
                                      <span className="tx-change-row">
                                        <span suppressHydrationWarning>
                                          {txHistoricalRate
                                            ? `1 ${nativeCurrency} = ${shortNiceNumber(txHistoricalRate, 2, 1, selectedCurrency)}`
                                            : '-'}
                                        </span>
                                      </span>
                                    )}
                                    <span className="tx-change-row">
                                      <span>
                                        {amountFormat(
                                          {
                                            currency: changes[0].currency,
                                            issuer: changes[0].issuer,
                                            value: 1
                                          },
                                          { icon: true }
                                        )}{' '}
                                        ={' '}
                                        {amountFormat(
                                          {
                                            ...changes[1],
                                            value: dexOfferRateAtoB
                                          },
                                          { icon: true, precise: 'nice' }
                                        )}
                                      </span>
                                    </span>
                                    <span className="tx-change-row">
                                      <span>
                                        {amountFormat(
                                          {
                                            currency: changes[1].currency,
                                            issuer: changes[1].issuer,
                                            value: 1
                                          },
                                          { icon: true }
                                        )}{' '}
                                        ={' '}
                                        {amountFormat(
                                          {
                                            ...changes[0],
                                            value: dexOfferRateBtoA
                                          },
                                          { icon: true, precise: 'nice' }
                                        )}
                                      </span>
                                    </span>
                                  </span>
                                </div>
                              )}

                              {nftTokenId && (
                                <div className="detail-row">
                                  <span>NFT:</span>
                                  <span className="copy-inline">
                                    <Link href={`/nft/${nftTokenId}`} onClick={(event) => event.stopPropagation()}>
                                      {shortHash(nftTokenId)}
                                    </Link>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={nftTokenId} />
                                    </span>
                                  </span>
                                </div>
                              )}

                              {nftOfferIds.length > 0 && (
                                <div className="detail-row">
                                  <span>{nftOfferIds.length > 1 ? 'Offers:' : 'Offer:'}</span>
                                  <span className="tx-offer-id-list">
                                    {nftOfferIds.map((offerId, offerIndex) => (
                                      <span className="copy-inline" key={`${txKey}-offer-${offerIndex}`}>
                                        <Link
                                          href={`/nft-offer/${offerId}`}
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {shortHash(offerId)}
                                        </Link>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={offerId} />
                                        </span>
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              )}

                              {isNftOfferTx && hasNftOfferAmount && (
                                <div className="detail-row">
                                  <span>Offer amount:</span>
                                  <span className="tx-detail-stacked-amount">
                                    <span className="tx-inline-change">{offerAmountExpandedText}</span>
                                    {!!offerAmountFiatDetailText && (
                                      <span className="tx-change-fiat">{offerAmountFiatDetailText}</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {!isNftOfferTx && nftMintSellOfferDisplay && (
                                <div className="detail-row">
                                  <span>Offer amount:</span>
                                  <span className="tx-detail-stacked-amount">
                                    <span className="tx-inline-change">{nftMintSellOfferDisplay.expandedText}</span>
                                    {!!nftMintSellOfferDisplay.expandedFiat && (
                                      <span className="tx-change-fiat">{nftMintSellOfferDisplay.expandedFiat}</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              <div className="detail-row">
                                <span>Hash:</span>
                                <span className="copy-inline">
                                  {txHash ? (
                                    <Link
                                      href={`/transaction/${txHash}`}
                                      className="tx-link"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {txShortHash}
                                    </Link>
                                  ) : (
                                    '-'
                                  )}
                                  {!!txHash && (
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={txHash} />
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )

                if (isMobile) {
                  const canLoadMoreTransactions = !!transactionsMarker && !transactionsSearchPaused
                  return (
                    <>
                      {renderTransactionsList()}
                      {transactionsEndMessage ? (
                        <div className="tx-mobile-end-message">
                          <p className="center">{transactionsEndMessage}</p>
                        </div>
                      ) : (
                        <div className="tx-mobile-actions">
                          {canLoadMoreTransactions ? (
                            <button
                              type="button"
                              className="button-outline"
                              onClick={loadMoreTransactions}
                              disabled={transactionsLoadingMore || transactionsLoading}
                            >
                              {transactionsLoadingMore ? (
                                <>
                                  Loading
                                  <span className="waiting inline" aria-hidden="true"></span>
                                </>
                              ) : (
                                'Load more transactions'
                              )}
                            </button>
                          ) : (
                            <span className="tx-mobile-end-label">End of list.</span>
                          )}
                        </div>
                      )}
                    </>
                  )
                }

                return (
                  <InfiniteScrolling
                    dataLength={recentTransactions.length}
                    loadMore={loadMoreTransactions}
                    hasMore={!!transactionsMarker && !transactionsSearchPaused}
                    errorMessage={transactionsEndMessage}
                    loadMoreMessage={transactionsLoadMoreMessage}
                    subscriptionExpired={false}
                    sessionToken={true}
                  >
                    {renderTransactionsList()}
                  </InfiniteScrolling>
                )
              })()}
          </div>

          {/* Column 4: Issued Tokens */}
          <div className="orders-section">
            {showObjectsLoadStatus && (
              <div className={`asset-item object-load-status ${objectsError ? 'error' : ''}`}>
                {objectsLoading ? (
                  <span className="tx-inline-load object-load-status-text">
                    <span>Loading account objects</span>
                    <span className="waiting inline" aria-hidden="true"></span>
                  </span>
                ) : (
                  <span className="object-load-status-text">
                    Failed to load account objects. Object sections may be missing.
                  </span>
                )}
              </div>
            )}

            {hasIssuerSettingsData && (
              <div className="time-machine-card issuer-settings-card">
                <button
                  type="button"
                  className={`time-machine-toggle ${showIssuerSettingsDetails ? 'active' : ''}`}
                  onClick={() => setShowIssuerSettingsDetails((prev) => !prev)}
                >
                  Issuer settings
                  <span className={`account-control-collapsed`}> · {issuerSettingsCollapsedLabel}</span>
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
                    <div className="detail-row issuer-detail-row">
                      <span>Clawback:</span>
                      <span className={isTrustlineClawbackEnabled && 'bold'}>
                        {isTrustlineClawbackEnabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>Global freeze:</span>
                      <span className={isGlobalFreezeEnabled && 'bold'}>
                        {isGlobalFreezeEnabled ? 'true' : 'false'}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>No freeze:</span>
                      <span className={isNoFreezeEnabled && 'bold'}>{isNoFreezeEnabled ? 'enabled' : 'not set'}</span>
                    </div>
                    <div className="card-actions issuer-settings-actions">
                      <Link href="/services/account-settings" className="card-action-btn">
                        Change settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(issuedTokensLoading || issuedTokensError || issuedTokens.length > 0) && (
              <>
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
              </>
            )}

            {hasIssuedMpts && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    Issued MPTs <span className="object-title-count">{issuedMpts.length}</span>
                  </div>
                </div>

                <div className="cards-list">
                  {issuedMpts.map((mptNode, index) => {
                    const rowKey = `${mptNode?.index || mptId(mptNode) || 'issued-mpt'}-${index}`
                    const isExpanded = expandedIssuedMptKey === rowKey
                    const outstanding = scaleAmount(mptNode?.OutstandingAmount || 0, mptNode?.AssetScale || null)
                    const maxSupply = mptNode?.MaximumAmount
                      ? scaleAmount(mptNode.MaximumAmount, mptNode?.AssetScale || null)
                      : null

                    return (
                      <div
                        key={rowKey}
                        className={`asset-item token-asset-item ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedIssuedMptKey(isExpanded ? null : rowKey)}
                      >
                        <div className="asset-main">
                          <div className="asset-logo">
                            <CurrencyWithIcon token={mptNode} options={{ disableTokenLink: true }} hideIssuer />
                          </div>
                          <div className="asset-value">
                            <div className="asset-amount">{shortNiceNumber(outstanding)}</div>
                            <div className="asset-fiat">Outstanding</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="asset-details">
                            <div className="detail-row">
                              <span>MPT ID:</span>
                              <span className="copy-inline">
                                <span>{shortHash(mptId(mptNode) || '-')}</span>
                                {!!mptId(mptNode) && (
                                  <span onClick={(event) => event.stopPropagation()}>
                                    <CopyButton text={mptId(mptNode)} />
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>Outstanding:</span>
                              <span>{fullNiceNumber(outstanding)}</span>
                            </div>
                            <div className="detail-row">
                              <span>Max supply:</span>
                              <span>{maxSupply === null ? 'not set' : fullNiceNumber(maxSupply)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {hasDexOrders && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    DEX orders <span className="object-title-count">{dexOrders.length}</span>
                  </div>
                  {data?.address && (
                    <Link className="section-link" href={`/account/${data.address}/dex`}>
                      View all
                    </Link>
                  )}
                </div>

                <div className="cards-list">
                  {dexOrdersPreview.map((offer, index) => {
                    const orderKey = `${offer?.index || 'offer'}-${index}`
                    const isExpanded = expandedDexOrderKey === orderKey
                    const isSell = !!offer?.flags?.sell
                    const baseAmount = isSell ? offer?.TakerGets : offer?.TakerPays
                    const quoteAmount = isSell ? offer?.TakerPays : offer?.TakerGets
                    const collapsedMainLabel = isSell ? 'Selling' : 'Buying'
                    const collapsedPrimary = amountFormat(baseAmount, {
                      short: true,
                      maxFractionDigits: 2,
                      icon: true
                    })
                    const collapsedSecondary = amountFormat(quoteAmount, {
                      short: true,
                      maxFractionDigits: 2,
                      icon: true
                    })
                    const rateText = (() => {
                      const quality = Number(offer?.quality)
                      if (!Number.isFinite(quality) || quality <= 0) return '-'

                      const takerGetsIsNative = typeof offer?.TakerGets === 'string'
                      const takerPaysIsNative = typeof offer?.TakerPays === 'string'
                      const getsCurrency =
                        typeof offer?.TakerGets === 'object' ? niceCurrency(offer?.TakerGets?.currency) : nativeCurrency
                      const paysCurrency =
                        typeof offer?.TakerPays === 'object' ? niceCurrency(offer?.TakerPays?.currency) : nativeCurrency

                      if (takerGetsIsNative) {
                        return `1 ${nativeCurrency} = ${niceNumber(quality * 1000000, 0, null, 5)} ${paysCurrency}`
                      }
                      if (takerPaysIsNative) {
                        return `1 ${getsCurrency} = ${niceNumber(quality / 1000000, 0, null, 5)} ${nativeCurrency}`
                      }
                      return `1 ${getsCurrency} = ${niceNumber(quality, 0, null, 5)} ${paysCurrency}`
                    })()
                    const offerDateText = offer?.previousTxAt
                      ? timeFromNow(offer.previousTxAt, i18n)
                      : offer?.PreviousTxnLgrSeq
                        ? `Lgr ${offer.PreviousTxnLgrSeq}`
                        : '-'

                    return (
                      <div
                        className={`asset-item token-asset-item expandable-card check-row-card dex-order-card ${isExpanded ? 'expanded' : ''}`}
                        key={orderKey}
                        onClick={() => setExpandedDexOrderKey(isExpanded ? null : orderKey)}
                      >
                        <div className="asset-main check-collapsed-main escrow-collapsed-main dex-collapsed-main">
                          <div className="asset-logo escrow-collapsed-logo">
                            <div className="escrow-collapsed-top">
                              <span className="escrow-type-main">
                                {collapsedMainLabel} {collapsedPrimary}
                              </span>
                              <span className="escrow-time-top">{offerDateText}</span>
                            </div>
                            <div className="tx-collapsed-meta">
                              <span className="tx-accountset-inline">for {collapsedSecondary}</span>
                            </div>
                          </div>
                          <div className="asset-value tx-collapsed-change escrow-collapsed-amount">
                            <span className="tx-inline-change grey">#{offer?.Sequence || '-'}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="asset-details">
                            <div className="detail-row">
                              <span>{isSell ? 'Selling:' : 'Wants to buy:'}</span>
                              <span>
                                {amountFormat(isSell ? offer?.TakerGets : offer?.TakerPays, {
                                  icon: true,
                                  withIssuer: true,
                                  precise: 'nice'
                                })}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>{isSell ? 'Wants at least:' : 'Can pay maximum:'}</span>
                              <span>
                                {amountFormat(isSell ? offer?.TakerPays : offer?.TakerGets, {
                                  icon: true,
                                  withIssuer: true,
                                  precise: 'nice'
                                })}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>Rate:</span>
                              <span>{rateText}</span>
                            </div>
                            <div className="detail-row">
                              <span>Sequence:</span>
                              <span>{offer?.Sequence || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span>Offer ID:</span>
                              <span className="copy-inline">
                                <span>{offer?.index ? shortHash(offer.index) : '-'}</span>
                                {!!offer?.index && (
                                  <>
                                    <Link
                                      href={`/object/${offer.index}`}
                                      className="inline-link-icon tooltip"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <LinkIcon />
                                      <span className="tooltiptext no-brake">Object page</span>
                                    </Link>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={offer.index} />
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>

                            {!effectiveLedgerTimestamp && offer?.Sequence && (
                              <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                {(() => {
                                  const canCancel = !!setSignRequest && offer?.Account === account?.address
                                  return (
                                    <button
                                      type="button"
                                      className={`card-action-btn ${canCancel ? 'cancel' : 'disabled'}`}
                                      disabled={!canCancel}
                                      onClick={() => {
                                        if (!canCancel) return
                                        setSignRequest({
                                          request: {
                                            Account: offer.Account,
                                            TransactionType: 'OfferCancel',
                                            OfferSequence: offer.Sequence
                                          }
                                        })
                                      }}
                                      title="Cancel"
                                    >
                                      <MdMoneyOff /> Cancel
                                    </button>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {showDexOrdersControlsVisible && (
                  <div className="asset-compact-actions">
                    {dexOrdersShowMoreAvailable && (
                      <button
                        type="button"
                        className="asset-compact-toggle"
                        onClick={() =>
                          setDexOrdersDisplayLimit((currentLimit) =>
                            Math.min(dexOrders.length, currentLimit + OBJECT_LOAD_MORE_STEP)
                          )
                        }
                      >
                        Show {Math.min(OBJECT_LOAD_MORE_STEP, dexOrdersRemainingCount)} more DEX orders
                      </button>
                    )}
                    {dexOrdersShowMoreAvailable && (
                      <button
                        type="button"
                        className="asset-compact-toggle"
                        onClick={() => setDexOrdersDisplayLimit(dexOrders.length)}
                      >
                        Show all DEX orders
                      </button>
                    )}
                    {showDexOrdersFewerButton && (
                      <button
                        type="button"
                        className="asset-compact-toggle"
                        onClick={() => setDexOrdersDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                      >
                        Show fewer DEX orders
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {(hasReceivedChecks || hasSentChecks) && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    {checksSectionTitle} <span className="object-title-count">{activeChecksList.length}</span>
                  </div>
                </div>

                {showChecksTabs && (
                  <div className="object-tab-row object-tab-row-outside">
                    <div className="object-tab-switch">
                      <button
                        type="button"
                        className={`object-tab-btn ${checksTab === 'received' ? 'active' : ''}`}
                        onClick={() => setChecksTab('received')}
                      >
                        Received
                      </button>
                      <button
                        type="button"
                        className={`object-tab-btn ${checksTab === 'sent' ? 'active' : ''}`}
                        onClick={() => setChecksTab('sent')}
                      >
                        Sent
                      </button>
                    </div>
                  </div>
                )}

                <div className="object-cards-wrapper">
                  <div className="object-cards-details">
                    <div className="object-cards-list cards-list">
                      {activeChecksPreview.map((check, index) => {
                        const checkKey = `${check?.index || 'check'}-${activeChecksTab}-${index}`
                        const isExpanded = expandedCheckKey === checkKey
                        const counterpartAddress = activeChecksTab === 'sent' ? check?.Destination : check?.Account
                        const sendMaxToken =
                          typeof check?.SendMax === 'object' && check?.SendMax !== null
                            ? check.SendMax
                            : { currency: nativeCurrency }
                        const sendMaxRawValue =
                          typeof check?.SendMax === 'object' && check?.SendMax !== null
                            ? check?.SendMax?.value
                            : check?.SendMax
                        const sendMaxAmountOnly =
                          typeof check?.SendMax === 'object' && check?.SendMax !== null
                            ? fullNiceNumber(sendMaxRawValue)
                            : fullNiceNumber((Number(sendMaxRawValue) || 0) / 1000000)
                        const sentAtValue = check?.previousTxAt || check?.createdAt
                        const sentAtText = sentAtValue ? timeFromNow(sentAtValue, i18n) : '-'
                        const expirationValue = check?.expiration || check?.Expiration
                        const expirationText = expirationValue
                          ? timeFromNow(expirationValue, i18n, 'ripple')
                          : 'does not expire'
                        const isExpired = expirationValue ? timestampExpired(expirationValue, 'ripple') : false
                        const canRedeem =
                          !!setSignRequest &&
                          !effectiveLedgerTimestamp &&
                          check?.Destination === account?.address &&
                          !isExpired
                        const canCancel =
                          !!setSignRequest &&
                          !effectiveLedgerTimestamp &&
                          (check?.Destination === account?.address || check?.Account === account?.address || isExpired)
                        const disabledRedeemCheckTooltip = (() => {
                          if (canRedeem) return ''
                          if (!setSignRequest) return 'Connect wallet to redeem this check'
                          if (isExpired) return 'This check is expired'
                          if (!account?.address) return 'Connect wallet to redeem this check'
                          if (check?.Destination && check.Destination !== account.address) {
                            return 'Only destination account can redeem it'
                          }
                          return 'This check cannot be redeemed'
                        })()
                        const disabledCancelCheckTooltip = (() => {
                          if (canCancel) return ''
                          if (!setSignRequest) return 'Connect wallet to cancel this check'
                          if (!account?.address) return 'Connect wallet to cancel this check'
                          if (
                            !isExpired &&
                            check?.Destination !== account.address &&
                            check?.Account !== account.address
                          ) {
                            return 'Only source or destination account can cancel it'
                          }
                          return 'This check cannot be canceled'
                        })()

                        return (
                          <div
                            className={`asset-item token-asset-item expandable-card check-row-card ${isExpanded ? 'expanded' : ''}`}
                            key={checkKey}
                            onClick={() => setExpandedCheckKey(isExpanded ? null : checkKey)}
                          >
                            <div className="asset-main check-collapsed-main">
                              <div className="asset-logo">
                                <CurrencyWithIcon token={sendMaxToken} options={{ disableTokenLink: true }} />
                              </div>
                              <div className="asset-value">
                                <div className="asset-amount">{sendMaxAmountOnly}</div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="asset-details">
                                <div className="detail-row">
                                  <span>Sent:</span>
                                  <span>{sentAtText}</span>
                                </div>
                                <div className="detail-row">
                                  <span>{activeChecksTab === 'sent' ? 'To' : 'From'}:</span>
                                  <span>
                                    {counterpartAddress ? (
                                      <AddressWithIconInline
                                        data={{ address: counterpartAddress }}
                                        options={{ short: 6, showAddress: true }}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </span>
                                </div>
                                {typeof check?.DestinationTag !== 'undefined' && (
                                  <div className="detail-row">
                                    <span>Destination tag:</span>
                                    <span>{check.DestinationTag}</span>
                                  </div>
                                )}
                                <div className="detail-row">
                                  <span>Expiration:</span>
                                  <span className={isExpired ? 'red' : ''}>{expirationText}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Check ID:</span>
                                  <span className="copy-inline">
                                    <span>{shortHash(check?.index)}</span>
                                    {!!check?.index && (
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={check.index} />
                                      </span>
                                    )}
                                  </span>
                                </div>

                                {!effectiveLedgerTimestamp && (
                                  <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                    <span className={disabledRedeemCheckTooltip ? 'tooltip' : ''}>
                                      <button
                                        type="button"
                                        className={`card-action-btn ${canRedeem ? 'redeem' : 'disabled'}`}
                                        disabled={!canRedeem}
                                        onClick={() => {
                                          if (!canRedeem) return
                                          setSignRequest({
                                            request: {
                                              TransactionType: 'CheckCash',
                                              Account: check.Destination,
                                              Amount: check.SendMax,
                                              CheckID: check.index
                                            }
                                          })
                                        }}
                                      >
                                        <TbPigMoney /> Redeem
                                      </button>
                                      {!!disabledRedeemCheckTooltip && (
                                        <span className="tooltiptext">{disabledRedeemCheckTooltip}</span>
                                      )}
                                    </span>
                                    <span className={disabledCancelCheckTooltip ? 'tooltip' : ''}>
                                      <button
                                        type="button"
                                        className={`card-action-btn ${canCancel ? 'cancel' : 'disabled'}`}
                                        disabled={!canCancel}
                                        onClick={() => {
                                          if (!canCancel) return
                                          setSignRequest({
                                            request: {
                                              TransactionType: 'CheckCancel',
                                              CheckID: check.index
                                            }
                                          })
                                        }}
                                      >
                                        <MdMoneyOff /> Cancel
                                      </button>
                                      {!!disabledCancelCheckTooltip && (
                                        <span className="tooltiptext">{disabledCancelCheckTooltip}</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {showChecksControlsVisible && (
                      <div className="asset-compact-actions">
                        {activeChecksShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() =>
                              setChecksDisplayLimit((currentLimit) =>
                                Math.min(activeChecksList.length, currentLimit + OBJECT_LOAD_MORE_STEP)
                              )
                            }
                          >
                            Show {Math.min(OBJECT_LOAD_MORE_STEP, activeChecksRemainingCount)} more checks
                          </button>
                        )}
                        {activeChecksShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setChecksDisplayLimit(activeChecksList.length)}
                          >
                            Show all checks
                          </button>
                        )}
                        {showChecksFewerButton && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setChecksDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                          >
                            Show fewer checks
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {(hasSelfEscrows || hasReceivedEscrows || hasSentEscrows) && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    {escrowsSectionTitle} <span className="object-title-count">{activeEscrowsList.length}</span>
                  </div>
                </div>

                {showEscrowsTabs && (
                  <div className="object-tab-row escrow-tab-row">
                    <div className="object-tab-switch">
                      {hasSelfEscrows && (
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'self' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('self')}
                        >
                          Self
                        </button>
                      )}
                      {hasReceivedEscrows && (
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'received' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('received')}
                        >
                          Incoming
                        </button>
                      )}
                      {hasSentEscrows && (
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'sent' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('sent')}
                        >
                          Outgoing
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="object-cards-wrapper">
                  <div className="object-cards-details">
                    <div className="object-cards-list cards-list">
                      {activeEscrowsPreview.map((escrow, index) => {
                        const escrowKey = `${escrow?.index || 'escrow'}-${activeEscrowsTab}-${index}`
                        const isExpanded = expandedEscrowKey === escrowKey
                        const counterpartName = activeEscrowsTab === 'sent' ? 'Destination' : 'Account'
                        const counterpartAddress = activeEscrowsTab === 'sent' ? escrow?.Destination : escrow?.Account
                        const amountCollapsed = amountFormat(escrow?.Amount, { short: true, maxFractionDigits: 2 })
                        const cancelAfterText = escrow?.CancelAfter
                          ? timeFromNow(escrow.CancelAfter, i18n, 'ripple')
                          : 'not set'
                        const cancelAfterFullText = escrow?.CancelAfter
                          ? fullDateAndTime(escrow.CancelAfter, 'ripple')
                          : 'not set'
                        const finishAfterText = escrow?.FinishAfter
                          ? timeFromNow(escrow.FinishAfter, i18n, 'ripple')
                          : 'not set'
                        const finishAfterFullText = escrow?.FinishAfter
                          ? fullDateAndTime(escrow.FinishAfter, 'ripple')
                          : 'not set'
                        const isCanceled = escrow?.CancelAfter ? timestampExpired(escrow.CancelAfter, 'ripple') : false
                        const isUnlockable = escrow?.FinishAfter
                          ? timestampExpired(escrow.FinishAfter, 'ripple')
                          : false
                        const escrowSequence = escrow?.escrowSequence
                        const canExecute =
                          !!setSignRequest &&
                          !effectiveLedgerTimestamp &&
                          !!escrowSequence &&
                          !!escrow?.FinishAfter &&
                          timestampExpired(escrow.FinishAfter, 'ripple') &&
                          !timestampExpired(escrow.CancelAfter, 'ripple')
                        const canCancel =
                          !!setSignRequest &&
                          !effectiveLedgerTimestamp &&
                          !!escrowSequence &&
                          !!escrow?.CancelAfter &&
                          timestampExpired(escrow.CancelAfter, 'ripple')
                        const disabledExecuteEscrowTooltip = (() => {
                          if (canExecute) return ''
                          if (!setSignRequest) return 'Connect wallet to execute this escrow'
                          if (!escrow?.FinishAfter) return 'This escrow has no unlock time'
                          if (!timestampExpired(escrow.FinishAfter, 'ripple')) return 'This escrow is still locked'
                          if (escrow?.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple')) {
                            return 'This escrow has already expired'
                          }
                          return 'This escrow cannot be executed'
                        })()
                        const disabledCancelEscrowTooltip = (() => {
                          if (canCancel) return ''
                          if (!setSignRequest) return 'Connect wallet to cancel this escrow'
                          if (!escrow?.CancelAfter) return 'This escrow cannot be canceled'
                          if (!timestampExpired(escrow.CancelAfter, 'ripple'))
                            return 'This escrow is not cancellable yet'
                          return 'This escrow cannot be canceled'
                        })()
                        const collapsedTimeText = isCanceled
                          ? cancelAfterText
                          : escrow?.FinishAfter
                            ? finishAfterText
                            : escrow?.CancelAfter
                              ? cancelAfterText
                              : '-'
                        const isOutgoingEscrow = activeEscrowsTab === 'sent'
                        const isSelfEscrow = activeEscrowsTab === 'self'
                        const collapsedDirectionLabel = isSelfEscrow ? '' : isOutgoingEscrow ? 'to' : 'from'
                        const collapsedAmountClass = isSelfEscrow ? 'grey' : isOutgoingEscrow ? 'red' : 'green'
                        const collapsedAmountSign = isSelfEscrow ? '' : isOutgoingEscrow ? '-' : '+'
                        const escrowAmountDrops = Number(escrow?.Amount || 0)
                        const signedEscrowAmountForFiat =
                          Number.isFinite(escrowAmountDrops) && !isSelfEscrow
                            ? isOutgoingEscrow
                              ? -Math.abs(escrowAmountDrops)
                              : Math.abs(escrowAmountDrops)
                            : escrow?.Amount
                        const collapsedAmountFiatText = tokenToFiat({
                          amount: signedEscrowAmountForFiat,
                          selectedCurrency,
                          fiatRate: pageFiatRate,
                          asText: true
                        })
                        const expandedAmountFiatNode = tokenToFiat({
                          amount: escrow?.Amount,
                          selectedCurrency,
                          fiatRate: pageFiatRate
                        })

                        return (
                          <div
                            className={`asset-item token-asset-item expandable-card check-row-card escrow-card ${isExpanded ? 'expanded' : ''}`}
                            key={escrowKey}
                            onClick={() => setExpandedEscrowKey(isExpanded ? null : escrowKey)}
                          >
                            <div className="asset-main tx-asset-main">
                              <div className="asset-logo tx-asset-logo">
                                <div className="tx-collapsed-top">
                                  <span className="tx-type-main">
                                    {isSelfEscrow ? 'Escrow' : `Escrow ${collapsedDirectionLabel}`}
                                  </span>
                                  <span
                                    className={`tx-time tx-time-top ${isCanceled ? 'red' : isUnlockable ? 'green' : ''}`}
                                  >
                                    {collapsedTimeText}
                                  </span>
                                </div>

                                <div className="tx-collapsed-meta">
                                  {counterpartAddress ? (
                                    <span className="tx-counterparty-inline">
                                      <AddressWithIconInline
                                        data={escrow}
                                        name={counterpartName}
                                        options={{ short: 6 }}
                                      />
                                    </span>
                                  ) : (
                                    <span className="tx-counterparty-inline">-</span>
                                  )}
                                </div>
                              </div>
                              <div className="asset-value tx-collapsed-change">
                                <span className="tx-inline-change-item">
                                  <span className={`tx-inline-change ${collapsedAmountClass}`}>
                                    {collapsedAmountSign}
                                    {amountCollapsed}
                                  </span>
                                  {!isSelfEscrow && !!collapsedAmountFiatText && (
                                    <span className="tx-change-fiat">{collapsedAmountFiatText}</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="asset-details">
                                {!isSelfEscrow && (
                                  <div className="detail-row">
                                    <span>{activeEscrowsTab === 'sent' ? 'To' : 'From'}:</span>
                                    <span className="copy-inline">
                                      {counterpartAddress ? (
                                        <>
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <AddressWithIconInline
                                              data={{ address: counterpartAddress }}
                                              options={{ short: 6, showAddress: true }}
                                            />
                                          </span>
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={counterpartAddress} />
                                          </span>
                                        </>
                                      ) : (
                                        '-'
                                      )}
                                    </span>
                                  </div>
                                )}

                                <div className="detail-row">
                                  <span>Expire:</span>
                                  <span
                                    className={
                                      escrow?.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple') ? 'red' : ''
                                    }
                                  >
                                    {cancelAfterFullText}
                                  </span>
                                </div>

                                <div className="detail-row">
                                  <span>Unlock:</span>
                                  <span
                                    className={
                                      escrow?.FinishAfter && timestampExpired(escrow.FinishAfter, 'ripple')
                                        ? 'green'
                                        : ''
                                    }
                                  >
                                    {finishAfterFullText}
                                  </span>
                                </div>

                                <div className="detail-row">
                                  <span>Amount:</span>
                                  <span>
                                    {amountFormat(escrow?.Amount, { precise: 'nice' })}
                                    {!isSelfEscrow && expandedAmountFiatNode}
                                  </span>
                                </div>

                                <div className="detail-row">
                                  <span>Escrow ID:</span>
                                  <span className="copy-inline">
                                    <span>{escrow?.index ? shortHash(escrow.index) : '-'}</span>
                                    {!!escrow?.index && (
                                      <>
                                        <Link
                                          href={`/object/${escrow.index}`}
                                          className="inline-link-icon tooltip"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <LinkIcon />
                                          <span className="tooltiptext no-brake">Object page</span>
                                        </Link>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={escrow.index} />
                                        </span>
                                      </>
                                    )}
                                  </span>
                                </div>

                                {!effectiveLedgerTimestamp && (
                                  <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                    <span className={disabledExecuteEscrowTooltip ? 'tooltip' : ''}>
                                      <button
                                        type="button"
                                        className={`card-action-btn ${canExecute ? 'redeem' : 'disabled'}`}
                                        disabled={!canExecute}
                                        onClick={() => {
                                          if (!canExecute) return
                                          setSignRequest({
                                            request: {
                                              TransactionType: 'EscrowFinish',
                                              Owner: escrow?.Account,
                                              OfferSequence: escrowSequence
                                            }
                                          })
                                        }}
                                      >
                                        <TbPigMoney /> Execute
                                      </button>
                                      {!!disabledExecuteEscrowTooltip && (
                                        <span className="tooltiptext">{disabledExecuteEscrowTooltip}</span>
                                      )}
                                    </span>
                                    <span className={disabledCancelEscrowTooltip ? 'tooltip' : ''}>
                                      <button
                                        type="button"
                                        className={`card-action-btn ${canCancel ? 'cancel' : 'disabled'}`}
                                        disabled={!canCancel}
                                        onClick={() => {
                                          if (!canCancel) return
                                          setSignRequest({
                                            request: {
                                              TransactionType: 'EscrowCancel',
                                              Owner: escrow?.Account,
                                              OfferSequence: escrowSequence
                                            }
                                          })
                                        }}
                                      >
                                        <MdMoneyOff /> Cancel
                                      </button>
                                      {!!disabledCancelEscrowTooltip && (
                                        <span className="tooltiptext">{disabledCancelEscrowTooltip}</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {showEscrowsControlsVisible && (
                      <div className="asset-compact-actions">
                        {activeEscrowsShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() =>
                              setEscrowsDisplayLimit((currentLimit) =>
                                Math.min(activeEscrowsList.length, currentLimit + OBJECT_LOAD_MORE_STEP)
                              )
                            }
                          >
                            Show {Math.min(OBJECT_LOAD_MORE_STEP, activeEscrowsRemainingCount)} more escrows
                          </button>
                        )}
                        {activeEscrowsShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setEscrowsDisplayLimit(activeEscrowsList.length)}
                          >
                            Show all escrows
                          </button>
                        )}
                        {showEscrowsFewerButton && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setEscrowsDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                          >
                            Show fewer escrows
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {hasAnyNftOffersData && (
              <>
                <div className="section-header-row nft-section-header-row">
                  <div className="section-title nft-section-title">NFT offers</div>
                  {data?.address && activeNftOffersCount > 0 && (
                    <Link className="section-link" href={activeNftOffersViewAllHref}>
                      View all
                    </Link>
                  )}
                </div>

                <div className="nft-tab-row nft-tab-row-outside">
                  <div className="nft-tab-switch nft-offers-tab-switch">
                    {hasReceivedPrivateNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'received' ? 'active' : ''}`}
                        onClick={() => setNftOffersTab('received')}
                      >
                        Private{nftOffersTabCountLabels.received ? ` (${nftOffersTabCountLabels.received})` : ''}
                      </button>
                    )}
                    {hasCreatedNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'created' ? 'active' : ''}`}
                        onClick={() => setNftOffersTab('created')}
                      >
                        Created{nftOffersTabCountLabels.created ? ` (${nftOffersTabCountLabels.created})` : ''}
                      </button>
                    )}
                    {hasOwnedNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'owned' ? 'active' : ''}`}
                        onClick={() => setNftOffersTab('owned')}
                      >
                        For owned{nftOffersTabCountLabels.owned ? ` (${nftOffersTabCountLabels.owned})` : ''}
                      </button>
                    )}
                  </div>
                </div>

                <div className="nft-section-content nft-offers-content">
                  {activeNftOffersLoading ? (
                    <div className="asset-fiat">Loading NFT offers...</div>
                  ) : activeNftOffersError ? (
                    <div className="asset-fiat red">{activeNftOffersError}</div>
                  ) : activeNftOffersCount > 0 ? (
                    <>
                      <div className="cards-list">
                        {activeNftOffersPreview.map((offer, index) => {
                          const nftId =
                            offer?.nftoken?.nftokenID ||
                            offer?.nftoken?.NFTokenID ||
                            offer?.nftokenID ||
                            offer?.NFTokenID
                          if (!nftId) return null

                          const cardKey = `${nftOffersTab}-${offer?.offerIndex || nftId}-${index}`
                          const isExpanded = expandedNftOfferKey === cardKey
                          const toggleCard = () => setExpandedNftOfferKey(isExpanded ? null : cardKey)
                          const handleKeyToggle = (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleCard()
                            }
                          }
                          const nftDisplayData = offer?.nftoken || offer
                          const nftTitle = nftName(nftDisplayData, { maxLength: 48 }) || shortHash(nftId)
                          const shortTokenId = shortHash(nftId)
                          const offerType = offer?.flags?.sellToken ? 'Sell' : 'Buy'
                          const isFreePrivateNftOffer = nftOffersTab === 'received' && offer?.amount === '0'
                          const offerAmountText = offer?.amount
                            ? amountFormat(offer.amount, { short: true, maxFractionDigits: 2 })
                            : null
                          const offerAmountFiat =
                            offer?.amount && selectedCurrency
                              ? convertedAmount(offer, selectedCurrency.toLowerCase(), { short: true })
                              : null
                          const offerPlacedRelative = offer?.createdAt ? timeFromNow(offer.createdAt, i18n) : null
                          const offerPlacedExact = offer?.createdAt ? fullDateAndTime(offer.createdAt) : null
                          const offerIndex = offer?.offerIndex
                          const shortOfferId = offerIndex ? shortHash(offerIndex) : null
                          const ownerAddress = offer?.owner || offer?.account
                          const destinationAddress = offer?.destination
                          const expirationRelative = offer?.expiration
                            ? timeFromNow(offer.expiration, i18n, 'ripple')
                            : null
                          const expirationExact = offer?.expiration
                            ? fullDateAndTime(offer.expiration, 'expiration')
                            : null
                          const canCancelNftOffer =
                            !!setSignRequest &&
                            !effectiveLedgerTimestamp &&
                            !!offerIndex &&
                            !!account?.address &&
                            !!ownerAddress &&
                            ownerAddress === account.address
                          const isPrivateNftOfferTab = nftOffersTab === 'received'
                          const isCreatedNftOfferTab = nftOffersTab === 'created'
                          const isOwnedNftOfferTab = nftOffersTab === 'owned'
                          const canAcceptPrivateNftOffer =
                            !!setSignRequest &&
                            !effectiveLedgerTimestamp &&
                            !!offerIndex &&
                            !!account?.address &&
                            (!!destinationAddress
                              ? account.address === destinationAddress
                              : account.address === data?.address) &&
                            (!ownerAddress || ownerAddress !== account.address)
                          const disabledAcceptPrivateNftOfferTooltip = (() => {
                            if (!isPrivateNftOfferTab || canAcceptPrivateNftOffer) return ''
                            if (!account?.address) return 'Connect wallet to buy this NFT'
                            if (ownerAddress && ownerAddress === account.address) {
                              return 'Offer owner cannot accept this offer'
                            }
                            if (destinationAddress && account.address !== destinationAddress) {
                              return 'Only destination account can accept it'
                            }
                            if (!destinationAddress && data?.address && account.address !== data.address) {
                              return 'Only the viewed account can accept it'
                            }
                            return 'This offer cannot be accepted'
                          })()
                          const canAcceptOwnedNftOffer =
                            !!setSignRequest &&
                            !effectiveLedgerTimestamp &&
                            !!offerIndex &&
                            !!account?.address &&
                            account.address === data?.address &&
                            (!ownerAddress || ownerAddress !== account.address)
                          const disabledAcceptOwnedNftOfferTooltip = (() => {
                            if (!isOwnedNftOfferTab || canAcceptOwnedNftOffer) return ''
                            if (!account?.address) return 'Connect wallet to sell this NFT'
                            if (ownerAddress && ownerAddress === account.address) {
                              return 'Offer owner cannot accept this offer'
                            }
                            if (data?.address && account.address !== data.address) {
                              return 'Only the viewed account can accept it'
                            }
                            return 'This offer cannot be accepted'
                          })()
                          const disabledCancelCreatedNftOfferTooltip = (() => {
                            if (!isCreatedNftOfferTab || canCancelNftOffer) return ''
                            if (!account?.address) return 'Connect wallet to cancel this offer'
                            if (!ownerAddress) return 'Offer owner is unknown'
                            if (ownerAddress !== account.address) return 'Only offer owner can cancel it'
                            return 'This offer cannot be canceled'
                          })()
                          const secondaryLine = (() => {
                            if (nftOffersTab === 'received') {
                              return isOwnAccount ? 'Private offer to you' : 'Private offer to this account'
                            }
                            if (nftOffersTab === 'owned') {
                              return isOwnAccount ? 'Offer on your NFT' : 'Offer on NFT owned by this account'
                            }
                            if (offerType === 'Buy') {
                              return isOwnAccount ? 'Your buy offer' : 'Buy offer created by this account'
                            }
                            return isOwnAccount ? 'Your sell offer' : 'Sell offer created by this account'
                          })()
                          const collapsedAmountDirection = (() => {
                            if (nftOffersTab === 'received') return { sign: '-', className: 'red' }
                            if (nftOffersTab === 'owned') return { sign: '+', className: 'green' }

                            // Created offers: buy offer means you pay; sell offer means you receive.
                            return offerType === 'Buy'
                              ? { sign: '-', className: 'red' }
                              : { sign: '+', className: 'green' }
                          })()
                          const collapsedAmountClass = isFreePrivateNftOffer
                            ? 'orange'
                            : offerAmountText
                              ? collapsedAmountDirection.className
                              : 'grey'
                          const collapsedAmountSign =
                            isFreePrivateNftOffer || !offerAmountText ? '' : collapsedAmountDirection.sign

                          return (
                            <div
                              key={cardKey}
                              className={`asset-item token-asset-item ${isExpanded ? 'expanded' : ''}`}
                              role="button"
                              tabIndex={0}
                              aria-expanded={isExpanded}
                              onClick={toggleCard}
                              onKeyDown={handleKeyToggle}
                            >
                              <div className="asset-main">
                                <div className="asset-logo">
                                  <div className="nft-asset-info">
                                    <Link
                                      href={`/nft/${nftId}`}
                                      className="nft-asset-thumb"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <NftImage
                                        nft={nftDisplayData}
                                        style={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: '6px',
                                          verticalAlign: 'middle'
                                        }}
                                      />
                                    </Link>
                                    <div className="nft-asset-text">
                                      <div className="asset-summary-title" title={nftTitle}>
                                        {nftTitle}
                                      </div>
                                      <div className="asset-fiat">{secondaryLine}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="asset-value">
                                  {offerPlacedRelative && (
                                    <div
                                      className="asset-fiat"
                                      title={offerPlacedExact ? String(offerPlacedExact) : undefined}
                                    >
                                      {offerPlacedRelative}
                                    </div>
                                  )}
                                  <span className="tx-inline-change-item">
                                    <span className={`tx-inline-change ${collapsedAmountClass}`}>
                                      {isFreePrivateNftOffer
                                        ? 'Free'
                                        : `${collapsedAmountSign}${offerAmountText || '-'}`}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="asset-details">
                                  <div className="detail-row">
                                    <span>NFT:</span>
                                    <span className="copy-inline">
                                      <Link href={`/nft/${nftId}`} onClick={(event) => event.stopPropagation()}>
                                        {shortTokenId}
                                      </Link>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={nftId} />
                                      </span>
                                    </span>
                                  </div>
                                  {offerIndex && (
                                    <div className="detail-row">
                                      <span>Offer:</span>
                                      <span className="copy-inline">
                                        <Link
                                          href={`/nft-offer/${offerIndex}`}
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {shortOfferId}
                                        </Link>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={offerIndex} />
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                  <div className="detail-row">
                                    <span>Offer type:</span>
                                    <span>{offerType}</span>
                                  </div>
                                  {offerAmountText && (
                                    <div className="detail-row">
                                      <span>Amount:</span>
                                      <span>
                                        {offerAmountText}
                                        {offerAmountFiat && (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {' '}
                                            ≈{offerAmountFiat}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {offerPlacedExact && (
                                    <div className="detail-row">
                                      <span>Placed:</span>
                                      <span>{offerPlacedExact}</span>
                                    </div>
                                  )}
                                  {expirationRelative && (
                                    <div className="detail-row">
                                      <span>Expires:</span>
                                      <span>
                                        {expirationRelative}
                                        {expirationExact && <span className="fiat-line"> ({expirationExact})</span>}
                                      </span>
                                    </div>
                                  )}
                                  {ownerAddress && nftOffersTab !== 'created' && (
                                    <div className="detail-row">
                                      <span>From:</span>
                                      <span className="copy-inline">
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <AddressWithIconInline
                                            data={{ owner: ownerAddress }}
                                            name="owner"
                                            options={{ short: 6, showAddress: true }}
                                          />
                                        </span>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={ownerAddress} />
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                  {destinationAddress && nftOffersTab !== 'received' && (
                                    <div className="detail-row">
                                      <span>To:</span>
                                      <span className="copy-inline">
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <AddressWithIconInline
                                            data={{ destination: destinationAddress }}
                                            name="destination"
                                            options={{ short: 6, showAddress: true }}
                                          />
                                        </span>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={destinationAddress} />
                                        </span>
                                      </span>
                                    </div>
                                  )}

                                  {isPrivateNftOfferTab && !xahauNetwork && (
                                    <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                      <span className={disabledAcceptPrivateNftOfferTooltip ? 'tooltip' : ''}>
                                        <button
                                          type="button"
                                          className={`card-action-btn ${canAcceptPrivateNftOffer ? 'redeem' : 'disabled'}`}
                                          disabled={!canAcceptPrivateNftOffer}
                                          onClick={() => {
                                            if (!canAcceptPrivateNftOffer) return
                                            setSignRequest({
                                              offerAmount: offer.amount,
                                              offerType: 'sell',
                                              request: {
                                                TransactionType: 'NFTokenAcceptOffer',
                                                NFTokenSellOffer: offerIndex
                                              }
                                            })
                                          }}
                                        >
                                          {offer.amount === '0' || !offer.amount ? (
                                            'Accept NFT transfer'
                                          ) : (
                                            <>Buy NFT for {amountFormat(offer.amount)}</>
                                          )}
                                        </button>
                                        {!!disabledAcceptPrivateNftOfferTooltip && (
                                          <span className="tooltiptext">{disabledAcceptPrivateNftOfferTooltip}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {isCreatedNftOfferTab && !xahauNetwork && (
                                    <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                      <span className={disabledCancelCreatedNftOfferTooltip ? 'tooltip' : ''}>
                                        <button
                                          type="button"
                                          className={`card-action-btn ${canCancelNftOffer ? 'cancel' : 'disabled'}`}
                                          disabled={!canCancelNftOffer}
                                          onClick={() => {
                                            if (!canCancelNftOffer) return
                                            setSignRequest({
                                              request: {
                                                TransactionType: 'NFTokenCancelOffer',
                                                Account: account?.address,
                                                NFTokenOffers: [offerIndex]
                                              }
                                            })
                                          }}
                                          title="Cancel"
                                        >
                                          <MdMoneyOff /> Cancel
                                        </button>
                                        {!!disabledCancelCreatedNftOfferTooltip && (
                                          <span className="tooltiptext">{disabledCancelCreatedNftOfferTooltip}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {isOwnedNftOfferTab && !xahauNetwork && (
                                    <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                      <span className={disabledAcceptOwnedNftOfferTooltip ? 'tooltip' : ''}>
                                        <button
                                          type="button"
                                          className={`card-action-btn ${canAcceptOwnedNftOffer ? 'redeem' : 'disabled'}`}
                                          disabled={!canAcceptOwnedNftOffer}
                                          onClick={() => {
                                            if (!canAcceptOwnedNftOffer) return
                                            setSignRequest({
                                              offerAmount: offer.amount,
                                              offerType: 'buy',
                                              request: {
                                                TransactionType: 'NFTokenAcceptOffer',
                                                NFTokenBuyOffer: offerIndex
                                              }
                                            })
                                          }}
                                        >
                                          {offer.amount === '0' || !offer.amount ? (
                                            'Accept NFT transfer'
                                          ) : (
                                            <>Sell NFT for {amountFormat(offer.amount)}</>
                                          )}
                                        </button>
                                        {!!disabledAcceptOwnedNftOfferTooltip && (
                                          <span className="tooltiptext">{disabledAcceptOwnedNftOfferTooltip}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {showNftOffersControlsVisible && (
                        <div className="asset-compact-actions">
                          {activeNftOffersShowMoreAvailable && (
                            <button
                              type="button"
                              className="asset-compact-toggle"
                              onClick={() =>
                                setNftOffersDisplayLimit((currentLimit) =>
                                  Math.min(activeNftOffers.length, currentLimit + NFT_LOAD_MORE_STEP)
                                )
                              }
                            >
                              Show {Math.min(NFT_LOAD_MORE_STEP, activeNftOffersRemainingCount)} more{' '}
                              {activeNftOffersTabLabel} NFT offers
                            </button>
                          )}
                          {showNftOffersFewerButton && (
                            <button
                              type="button"
                              className="asset-compact-toggle"
                              onClick={() => {
                                setNftOffersDisplayLimit(NFT_OFFERS_PREVIEW_LIMIT)
                                setExpandedNftOfferKey(null)
                              }}
                            >
                              Show fewer {activeNftOffersTabLabel} NFT offers
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="asset-fiat">{activeNftOffersTitle}</div>
                  )}
                </div>
              </>
            )}

            {(hasIncomingPaychannels || hasOutgoingPaychannels) && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    {paychannelsSectionTitle} <span className="object-title-count">{activePaychannelsList.length}</span>
                  </div>
                </div>

                {showPaychannelsTabs && (
                  <div className="object-tab-row object-tab-row-outside">
                    <div className="object-tab-switch">
                      <button
                        type="button"
                        className={`object-tab-btn ${paychannelsTab === 'incoming' ? 'active' : ''}`}
                        onClick={() => setPaychannelsTab('incoming')}
                      >
                        Incoming
                      </button>
                      <button
                        type="button"
                        className={`object-tab-btn ${paychannelsTab === 'outgoing' ? 'active' : ''}`}
                        onClick={() => setPaychannelsTab('outgoing')}
                      >
                        Outgoing
                      </button>
                    </div>
                  </div>
                )}

                <div className="object-cards-wrapper">
                  <div className="object-cards-details">
                    <div className="object-cards-list cards-list">
                      {activePaychannelsPreview.map((channel, index) => {
                        const channelObjectId = channel?.index || channel?.Index
                        const channelKey = `${channelObjectId || 'paychannel'}-${activePaychannelsTab}-${index}`
                        const isExpanded = expandedPaychannelKey === channelKey
                        const isOutgoingPaychannel = activePaychannelsTab === 'outgoing'
                        const counterpartName = activePaychannelsTab === 'outgoing' ? 'Destination' : 'Account'
                        const counterpartData = {
                          ...channel,
                          destinationDetails: channel?.destinationDetails || channel?.DestinationDetails,
                          accountDetails: channel?.accountDetails || channel?.AccountDetails
                        }
                        const counterpartAddress =
                          activePaychannelsTab === 'outgoing' ? channel?.Destination : channel?.Account
                        const amountText = amountFormat(channel?.Amount, { short: true, maxFractionDigits: 2 })
                        const balanceText = amountFormat(channel?.Balance, { short: true, maxFractionDigits: 2 })
                        const balanceFiatNode = tokenToFiat({
                          amount: channel?.Balance,
                          selectedCurrency,
                          fiatRate: pageFiatRate,
                          asText: true
                        })
                        const counterpartLabel = activePaychannelsTab === 'outgoing' ? 'To' : 'From'
                        const amountDisplay = amountText || '-'
                        const balanceDisplay = balanceText || '-'
                        const balanceFiatText = balanceFiatNode || '—'

                        return (
                          <div
                            className={`asset-item token-asset-item expandable-card paychannel-asset-item ${isExpanded ? 'expanded' : ''}`}
                            key={channelKey}
                            onClick={() => setExpandedPaychannelKey(isExpanded ? null : channelKey)}
                          >
                            <div className="asset-main paychannel-card-main">
                              <div className="asset-logo">
                                <div className="paychannel-counterparty">
                                  <span className="paychannel-counterparty-label">{counterpartLabel}:</span>
                                  <span className="paychannel-counterparty-value">
                                    {counterpartAddress ? (
                                      <AddressWithIconInline
                                        data={counterpartData}
                                        name={counterpartName}
                                        options={{ short: 6 }}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="asset-value paychannel-metrics">
                                <span className="paychannel-metric-caption">Amount / Balance</span>
                                <div className="paychannel-metric-main">
                                  <span className="paychannel-metric-balance">{balanceDisplay}</span>
                                  <span className="paychannel-metric-separator">/</span>
                                  <span className="paychannel-metric-amount">{amountDisplay}</span>
                                </div>
                                {balanceFiatText !== '—' && (
                                  <span className="paychannel-metric-fiat" suppressHydrationWarning>
                                    {balanceFiatText}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="asset-details">
                                <div className="detail-row">
                                  <span>{counterpartLabel}:</span>
                                  <span>
                                    {isOutgoingPaychannel && counterpartAddress ? (
                                      <span className="copy-inline">
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <AddressWithIconInline
                                            data={{ address: counterpartAddress }}
                                            options={{ short: 6, showAddress: true }}
                                          />
                                        </span>
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={counterpartAddress} />
                                        </span>
                                      </span>
                                    ) : counterpartAddress ? (
                                      <AddressWithIconInline
                                        data={{ [counterpartName]: counterpartAddress }}
                                        name={counterpartName}
                                        options={{ short: 6, showAddress: true }}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span>Amount:</span>
                                  <span>{amountDisplay}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Balance:</span>
                                  <span>
                                    {balanceDisplay}
                                    {balanceFiatText !== '—' && (
                                      <span className="fiat-line" suppressHydrationWarning>
                                        {' '}
                                        {balanceFiatText}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {channelObjectId && (
                                  <div className="detail-row">
                                    <span>Object:</span>
                                    <span className="copy-inline">
                                      <span>{shortHash(channelObjectId)}</span>
                                      <Link
                                        href={`/object/${channelObjectId}`}
                                        className="inline-link-icon tooltip"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <LinkIcon />
                                        <span className="tooltiptext no-brake">Object page</span>
                                      </Link>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={channelObjectId} />
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {showPaychannelsControlsVisible && (
                      <div className="asset-compact-actions">
                        {activePaychannelsShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() =>
                              setPaychannelsDisplayLimit((currentLimit) =>
                                Math.min(activePaychannelsList.length, currentLimit + OBJECT_LOAD_MORE_STEP)
                              )
                            }
                          >
                            Show {Math.min(OBJECT_LOAD_MORE_STEP, activePaychannelsRemainingCount)} more paychannels
                          </button>
                        )}
                        {activePaychannelsShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setPaychannelsDisplayLimit(activePaychannelsList.length)}
                          >
                            Show all paychannels
                          </button>
                        )}
                        {showPaychannelsFewerButton && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setPaychannelsDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                          >
                            Show fewer paychannels
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {hasActivatedAccountsSection && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    Activated accounts{' '}
                    {(!activatedAccountsLoading || activatedAccountsCount > 0) && (
                      <span className="object-title-count" suppressHydrationWarning>
                        <span className="tooltip">
                          {fullNiceNumber(activatedAccountsCount)}
                          <span className="tooltiptext no-brake">{fullNiceNumber(activatedAccountsCount)}</span>
                        </span>
                      </span>
                    )}
                    {activatedAccountsSpent > 0 && (
                      <span className="object-title-count" suppressHydrationWarning>
                        {' · '}
                        <span className="tooltip">
                          {shortNiceNumber(activatedAccountsSpent, 2, 1)} {nativeCurrency}
                          <span className="tooltiptext no-brake">
                            {fullNiceNumber(activatedAccountsSpent)} {nativeCurrency}
                          </span>
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="tx-header-actions">
                    <button
                      className="tx-filter-toggle tooltip"
                      onClick={() => setActivatedAccountsReloadKey((prev) => prev + 1)}
                      aria-label="Reload activated accounts"
                      type="button"
                      disabled={!data?.address || activatedAccountsLoading || activatedAccountsLoadingMore}
                    >
                      <FaArrowsRotate
                        className={`tx-refresh-icon ${activatedAccountsLoading || activatedAccountsLoadingMore ? 'spinning' : ''}`}
                      />
                      <span className="tooltiptext">Update</span>
                    </button>
                    <button
                      className={`tx-filter-toggle tooltip ${showActivatedAccountsFilters ? 'active' : ''}`}
                      onClick={() => setShowActivatedAccountsFilters((prev) => !prev)}
                      aria-label="Toggle activated accounts filters"
                      type="button"
                    >
                      <FaGear />
                      <span className="tooltiptext">Settings</span>
                    </button>
                  </div>
                </div>

                {showActivatedAccountsFilters && (
                  <div className="tx-filters-panel">
                    <div className="tx-filter-grid">
                      <label className="tx-filter-field">
                        <span>Order</span>
                        <select
                          value={activatedAccountsOrder}
                          onChange={(event) => setActivatedAccountsOrder(event.target.value)}
                        >
                          <option value="desc">Latest first</option>
                          <option value="asc">Oldest first</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {activatedAccountsLoading ? (
                  <div className="asset-item object-load-status">
                    <span className="tx-inline-load object-load-status-text">
                      <span>Loading activated accounts</span>
                      <span className="waiting inline" aria-hidden="true"></span>
                    </span>
                  </div>
                ) : activatedAccountsError ? (
                  <div className="asset-item object-load-status error">
                    <span className="object-load-status-text">{activatedAccountsError}</span>
                  </div>
                ) : (
                  (() => {
                    const renderActivatedAccountsList = () => (
                      <div className="cards-list">
                        {activatedAccounts.map((child, index) => {
                          const activationKey = `${child?.address || 'activation'}-${child?.inception || index}`
                          const activationTimeAgo = child?.inception ? timeFromNow(child.inception, i18n) : '-'
                          const activationTimeFull = child?.inception ? fullDateAndTime(child.inception) : '-'
                          const activationAmount = Number.isFinite(child?.initialBalance) ? child.initialBalance : 0
                          const activationAmountDrops = Math.round(activationAmount * 1000000)
                          const currentBalance = Number.isFinite(child?.balance) ? child.balance : null
                          const currentBalanceDrops =
                            currentBalance === null ? null : Math.round(currentBalance * 1000000)
                          const currentBalanceFiatText =
                            currentBalanceDrops === null
                              ? ''
                              : tokenToFiat({
                                  amount: currentBalanceDrops,
                                  selectedCurrency,
                                  fiatRate: pageFiatRate,
                                  asText: true
                                })
                          const lastSubmittedFull = child?.lastSubmittedAt
                            ? fullDateAndTime(child.lastSubmittedAt)
                            : null
                          const deletedFull = child?.deletedAt ? fullDateAndTime(child.deletedAt) : null
                          const isExpanded = expandedActivatedKey === activationKey
                          const toggleCard = () => setExpandedActivatedKey(isExpanded ? null : activationKey)

                          return (
                            <div
                              className={`asset-item token-asset-item expandable-card check-row-card activated-account-card ${isExpanded ? 'expanded' : ''}`}
                              key={activationKey}
                              onClick={toggleCard}
                            >
                              <div className="asset-main tx-asset-main">
                                <div className="asset-logo tx-asset-logo">
                                  <div className="tx-collapsed-top">
                                    <span className="tx-time tx-time-top" title={activationTimeFull}>
                                      {activationTimeAgo}
                                    </span>
                                  </div>
                                  <div className="tx-collapsed-meta">
                                    <AddressWithIcon address={child.address}>
                                      <span className="activated-account-inline-address">
                                        {shortHash(child.address, 6)}
                                      </span>
                                    </AddressWithIcon>
                                  </div>
                                </div>
                                <div className="asset-value tx-collapsed-change">
                                  {activationAmount > 0 ? (
                                    <span className="tx-inline-change red">
                                      -{amountFormat(activationAmountDrops, { precise: 'nice' })}
                                    </span>
                                  ) : (
                                    <span className="tx-inline-change grey">
                                      {amountFormat(activationAmountDrops, { precise: 'nice' })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="asset-details" onClick={(e) => e.stopPropagation()}>
                                  <div className="detail-row">
                                    <span>Address:</span>
                                    <span className="copy-inline">
                                      <AddressWithIconInline
                                        data={{ address: child.address }}
                                        options={{ short: 6, showAddress: true }}
                                      />
                                      <CopyButton text={child.address} />
                                    </span>
                                  </div>
                                  <div className="detail-row">
                                    <span>Balance funded:</span>
                                    <span>{amountFormat(activationAmountDrops, { precise: 'nice' })}</span>
                                  </div>
                                  <div className="detail-row">
                                    <span>Activated:</span>
                                    <span>{activationTimeFull}</span>
                                  </div>
                                  {child.txHash && (
                                    <div className="detail-row">
                                      <span>Activation tx:</span>
                                      <span className="copy-inline">
                                        <Link
                                          href={`/transaction/${child.txHash}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {shortHash(child.txHash)}
                                        </Link>
                                        <CopyButton text={child.txHash} />
                                      </span>
                                    </div>
                                  )}
                                  {currentBalanceDrops !== null && !child.deletedAt && !child.deletedTxHash && (
                                    <div className="detail-row">
                                      <span>Balance now:</span>
                                      <span className="tx-detail-stacked-amount">
                                        <span>{amountFormat(currentBalanceDrops, { precise: 'nice' })}</span>
                                        {!!currentBalanceFiatText && (
                                          <span className="tx-change-fiat" suppressHydrationWarning>
                                            {currentBalanceFiatText}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {(lastSubmittedFull || child.lastSubmittedTxHash) && (
                                    <>
                                      {lastSubmittedFull && (
                                        <div className="detail-row">
                                          <span>Last active:</span>
                                          <span title={String(lastSubmittedFull)}>{lastSubmittedFull}</span>
                                        </div>
                                      )}
                                      {child.lastSubmittedTxHash && (
                                        <div className="detail-row">
                                          <span>Last submitted tx:</span>
                                          <span className="copy-inline">
                                            <Link
                                              href={`/transaction/${child.lastSubmittedTxHash}`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {shortHash(child.lastSubmittedTxHash)}
                                            </Link>
                                            <CopyButton text={child.lastSubmittedTxHash} />
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {(deletedFull || child.deletedTxHash) && (
                                    <>
                                      {deletedFull && (
                                        <div className="detail-row">
                                          <span>Deleted:</span>
                                          <span title={String(deletedFull)}>{deletedFull}</span>
                                        </div>
                                      )}
                                      {child.deletedTxHash && (
                                        <div className="detail-row">
                                          <span>Delete tx:</span>
                                          <span className="copy-inline">
                                            <Link
                                              href={`/transaction/${child.deletedTxHash}`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {shortHash(child.deletedTxHash)}
                                            </Link>
                                            <CopyButton text={child.deletedTxHash} />
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )

                    if (isMobile) {
                      const canLoadMoreActivatedAccounts = !!activatedAccountsMarker
                      return (
                        <>
                          {renderActivatedAccountsList()}
                          <div className="tx-mobile-actions">
                            {canLoadMoreActivatedAccounts ? (
                              <button
                                type="button"
                                className="button-outline"
                                onClick={loadMoreActivatedAccounts}
                                disabled={activatedAccountsLoadingMore || activatedAccountsLoading}
                              >
                                {activatedAccountsLoadingMore ? (
                                  <>
                                    Loading
                                    <span className="waiting inline" aria-hidden="true"></span>
                                  </>
                                ) : (
                                  'Load 20 more activated accounts'
                                )}
                              </button>
                            ) : (
                              <span className="tx-mobile-end-label">End of list.</span>
                            )}
                          </div>
                        </>
                      )
                    }

                    return (
                      <InfiniteScrolling
                        dataLength={activatedAccounts.length}
                        loadMore={loadMoreActivatedAccounts}
                        hasMore={!!activatedAccountsMarker}
                        errorMessage={null}
                        loadMoreMessage={
                          activatedAccountsLoadingMore ? (
                            <button type="button" className="button-outline" disabled>
                              Loading
                              <span className="waiting inline" aria-hidden="true"></span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button-outline"
                              onClick={loadMoreActivatedAccounts}
                              disabled={activatedAccountsLoadingMore || activatedAccountsLoading}
                            >
                              Load 20 more activated accounts
                            </button>
                          )
                        }
                        subscriptionExpired={false}
                        sessionToken={true}
                      >
                        {renderActivatedAccountsList()}
                      </InfiniteScrolling>
                    )
                  })()
                )}
              </>
            )}

            {!showObjectsLoadStatus && !hasColumn4ObjectSections && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">Objects</div>
                </div>
                <div className="asset-item object-load-status">
                  <span className="object-load-status-text">
                    No DEX orders, checks, escrows, NFT offers, paychannels, issued tokens, issued MPTs, or activated
                    accounts.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .account-container {
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

        .account-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .public-data {
          margin-top: 0;
        }

        .info-rows {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 560px) {
          .info-rows {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .info-rows > .info-row:last-child:nth-child(odd) {
            grid-column: 1 / -1;
          }
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
          .account-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .account-grid {
            grid-template-columns: 1fr;
          }
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

        .tx-filter-toggle:disabled {
          opacity: 0.6;
          cursor: default;
        }

        :global(.tx-refresh-icon) {
          display: block;
          transform-origin: center;
        }

        :global(.tx-refresh-icon.spinning) {
          animation: tx-spin 0.8s linear infinite;
        }

        @keyframes tx-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
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
          gap: 12px;
          row-gap: 14px;
        }

        .tx-filter-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .tx-filter-field > span {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .tx-filter-field select,
        .tx-filter-field input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border: 1px solid color-mix(in srgb, var(--accent-link) 60%, var(--border-color) 40%);
          border-radius: 6px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          padding: 7px 8px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-link) 25%, transparent);
        }

        .tx-filter-field select {
          -webkit-appearance: none;
          appearance: none;
          background-image:
            linear-gradient(45deg, transparent 50%, var(--text-secondary) 50%),
            linear-gradient(135deg, var(--text-secondary) 50%, transparent 50%);
          background-position:
            calc(100% - 14px) calc(50% - 1px),
            calc(100% - 9px) calc(50% - 1px);
          background-size:
            5px 5px,
            5px 5px;
          background-repeat: no-repeat;
          padding-right: 28px;
        }

        .tx-filter-field input[type='datetime-local'] {
          width: 100%;
          min-width: 0;
          display: block;
        }

        .tx-filter-field select:focus,
        .tx-filter-field select:focus-visible,
        .tx-filter-field input:focus,
        .tx-filter-field input:focus-visible {
          border-color: var(--accent-link);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-link) 40%, transparent);
          outline: none;
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

        @media (max-width: 600px) {
          .tx-filter-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            row-gap: 12px;
          }

          .tx-filter-field-wide {
            grid-column: 1;
          }
        }

        .tx-broker-inline {
          display: block;
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .tx-broker-stack {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .tx-broker-action {
          display: block;
        }

        .tx-inline-load {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .tx-inline-load :global(.waiting.inline) {
          margin-left: 6px;
        }

        .tx-status-text {
          text-align: center;
          margin: 16px 0;
        }

        .tx-mobile-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 0 4px;
        }

        .tx-mobile-end-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .tx-mobile-end-message {
          margin-top: 12px;
        }

        @media (min-width: 769px) {
          .tx-mobile-actions,
          .tx-mobile-end-message {
            display: none;
          }
        }

        .tx-asset-item.tx-failed {
          background: repeating-linear-gradient(
            45deg,
            rgba(255, 150, 0, 0.15),
            rgba(255, 180, 80, 0.15) 10px,
            transparent 10px,
            transparent 20px
          );
        }

        .tx-asset-item.expanded {
          border-color: var(--accent-link);
        }

        .tx-asset-main {
          align-items: flex-start;
          gap: 10px;
          position: relative;
        }

        .asset-logo {
          flex: 1;
          min-width: 0;
        }

        .asset-logo :global(img) {
          border-radius: 50%;
          object-fit: cover;
        }
        .tx-collapsed-top {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
          margin-bottom: 2px;
        }

        .tx-type-main {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.2;
          min-width: 0;
          white-space: normal;
          word-break: break-word;
        }

        .tx-type-icon {
          display: inline-flex;
          align-items: center;
          line-height: 1;
          flex-shrink: 0;
        }

        .tx-amm-token-meta {
          display: inline-flex;
          align-items: center;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-amm-token-meta :global(table) {
          min-width: auto !important;
        }

        .tx-fail-badge {
          font-size: 11px;
          font-weight: 600;
          color: var(--red);
          border: 1px solid color-mix(in srgb, var(--red) 35%, var(--border-color));
          border-radius: 999px;
          padding: 1px 7px;
          white-space: nowrap;
        }

        .tx-collapsed-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.2;
          min-width: 0;
          flex-wrap: wrap;
          padding-top: 2px;
        }

        .activated-account-inline-address {
          color: var(--text-secondary);
        }

        .tx-time {
          color: var(--text);
          font-weight: 400;
        }

        .tx-time-top {
          position: absolute;
          right: 0;
          top: 0;
          margin-left: 0;
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 1;
          white-space: nowrap;
        }

        .tx-counterparty-inline {
          min-width: 0;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-trustset-inline {
          min-width: 0;
          display: inline-flex;
          align-items: center;
        }

        .tx-accountset-inline {
          min-width: 0;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
          word-break: break-word;
        }

        .tx-trustset-inline :global(table) {
          min-width: 0 !important;
        }

        .tx-collapsed-change {
          min-width: 96px;
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 4px;
          flex-wrap: nowrap;
          text-align: right;
          padding-top: 20px;
        }

        .tx-inline-change {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
        }

        .tx-inline-change-item {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .tx-inline-limit {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
        }

        .tx-inline-status {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          text-transform: lowercase;
          white-space: nowrap;
        }

        .tx-offer-free {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
        }

        .tx-inline-more {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
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

        .avatar-image-mask.has-username {
          border-color: var(--accent-link);
          box-shadow:
            0 0 8px color-mix(in srgb, var(--accent-link) 62%, transparent),
            0 0 14px color-mix(in srgb, var(--accent-link) 34%, transparent),
            inset 0 0 7px color-mix(in srgb, var(--accent-link) 28%, transparent);
          animation: avatarRingPulse 2.2s ease-in-out infinite;
        }

        @keyframes avatarRingPulse {
          0%,
          100% {
            border-color: var(--accent-link);
            box-shadow:
              0 0 8px color-mix(in srgb, var(--accent-link) 62%, transparent),
              0 0 14px color-mix(in srgb, var(--accent-link) 34%, transparent),
              inset 0 0 7px color-mix(in srgb, var(--accent-link) 28%, transparent);
          }
          50% {
            border-color: var(--accent-link);
            box-shadow:
              0 0 14px color-mix(in srgb, var(--accent-link) 78%, transparent),
              0 0 24px color-mix(in srgb, var(--accent-link) 48%, transparent),
              inset 0 0 11px color-mix(in srgb, var(--accent-link) 46%, transparent);
          }
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
          width: 64px;
          height: 64px;
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

        .achievement-badge:hover .achievement-image {
          transform: scale(1.15);
        }

        .achievement-badge :global(.tooltiptext) {
          z-index: 30;
        }

        .achievement-badge :global(.tooltiptext.right) {
          right: unset !important;
          left: 105% !important;
          top: 50% !important;
          transform: translateY(-50%);
        }

        .achievement-badge :global(.tooltiptext.left) {
          left: unset !important;
          right: 105% !important;
          top: 50% !important;
          transform: translateY(-50%);
        }

        .achievement-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.2s ease;
        }

        /* Fill order: left, right, left, right, left, right */
        .achievement-badge-1 {
          top: 0;
          left: 0;
          transform: translate(-33%, -33%);
        }

        .achievement-badge-2 {
          top: 0;
          right: 0;
          transform: translate(33%, -33%);
        }

        .achievement-badge-3 {
          bottom: 0;
          left: 0;
          transform: translate(-33%, 33%);
        }

        .achievement-badge-4 {
          bottom: 0;
          right: 0;
          transform: translate(33%, 33%);
        }

        .achievement-badge-5 {
          top: 50%;
          left: 0;
          transform: translate(-75%, -50%);
        }

        .achievement-badge-6 {
          top: 50%;
          right: 0;
          transform: translate(75%, -50%);
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
          font-size: 13px;
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
          margin-top: 0;
          background: transparent;
          border: 0;
          border-radius: 0;
          padding: 0;
        }

        .info-cards-list {
          margin-top: 0;
        }

        .time-machine-toggle {
          width: 100%;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-input);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 28px 8px 10px;
          cursor: pointer;
          text-align: center;
          transition: all 0.16s ease;
          position: relative;
        }

        .time-machine-toggle::after {
          content: '›';
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          line-height: 1;
          opacity: 0.4;
          transition:
            transform 0.16s ease,
            opacity 0.16s ease;
        }

        .time-machine-toggle.active::after {
          transform: translateY(-50%) rotate(90deg);
          opacity: 0.7;
        }

        .time-machine-toggle.active,
        .time-machine-toggle:hover {
          border-color: var(--accent-link);
          color: var(--accent-link);
        }

        .time-machine-toggle:hover::after {
          opacity: 0.7;
        }

        .account-control-collapsed {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .account-control-collapsed.dimmed {
          opacity: 0.5;
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
          border: 1px solid color-mix(in srgb, var(--accent-link) 60%, var(--border-color) 40%);
          border-radius: 8px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          padding: 8px 10px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-link) 25%, transparent);
          outline: none;
          box-sizing: border-box;
        }

        .time-machine-picker-wrap :global(.dateAndTimeRange:focus),
        .time-machine-picker-wrap :global(.dateAndTimeRange:focus-visible),
        .time-machine-picker-wrap :global(.time-machine-input:focus),
        .time-machine-picker-wrap :global(.time-machine-input:focus-visible) {
          border-color: var(--accent-link);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-link) 40%, transparent);
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
          margin: 0;
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
          --asset-card-padding-y: 6px;
          --asset-card-padding-x: 12px;
          --asset-card-body-min-height: 46px;
          background: var(--background-input);
          border-radius: 6px;
          padding: var(--asset-card-padding-y) var(--asset-card-padding-x);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .asset-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .get-first-native-wrap {
          display: flex;
          margin-top: 2px;
        }

        .identity-actions-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 2px;
        }

        .identity-actions-wrap .get-first-native-btn {
          flex: 1 1 220px;
          width: auto;
        }

        .get-first-native-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--accent-link);
          border-radius: 8px;
          background: var(--accent-link);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.2;
          padding: 9px 12px;
          text-decoration: none;
          transition: all 0.16s ease;
        }

        .get-first-native-btn:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .get-first-native-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        @media (prefers-color-scheme: dark) {
          .get-first-native-btn {
            background: color-mix(in srgb, var(--accent-link) 66%, #000 34%);
            border-color: color-mix(in srgb, var(--accent-link) 58%, #000 42%);
            color: #f6fbff;
            text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
          }

          .get-first-native-btn:hover {
            background: color-mix(in srgb, var(--accent-link) 72%, #000 28%);
            border-color: color-mix(in srgb, var(--accent-link) 64%, #000 36%);
            opacity: 1;
          }

          .get-first-native-btn:disabled {
            background: color-mix(in srgb, var(--accent-link) 24%, #000 76%);
            border-color: color-mix(in srgb, var(--accent-link) 20%, #000 80%);
            color: color-mix(in srgb, #f6fbff 70%, #8090a0 30%);
          }
        }

        .object-load-status {
          cursor: default;
          border: 1px dashed var(--border-color);
          display: flex;
          align-items: center;
          min-height: 46px;
        }

        .object-load-status:hover {
          transform: none;
          box-shadow: none;
        }

        .object-load-status.error {
          border-color: color-mix(in srgb, var(--red) 50%, var(--border-color));
          background: color-mix(in srgb, var(--red) 8%, var(--background-input));
        }

        .object-load-status-text {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .object-load-status.error .object-load-status-text {
          color: var(--red);
        }

        .cards-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-section .cards-list {
          gap: 12px;
        }

        .asset-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          min-height: var(--asset-card-body-min-height);
          -webkit-user-select: none;
          user-select: none;
        }

        .asset-logo {
          flex: 1;
          min-width: 0;
        }

        .asset-value {
          flex-shrink: 0;
          text-align: right;
          align-self: flex-start;
        }

        .lp-collapsed-left {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .lp-collapsed-balances {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .lp-collapsed-balances .asset-amount {
          white-space: nowrap;
        }

        .asset-summary-title,
        .asset-amount {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          color: var(--text);
        }

        .asset-fiat {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.2;
          margin-top: 0;
        }

        .total-worth-fiat {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }

        .total-worth-value {
          align-self: center;
        }

        .tx-settings-card {
          margin-top: 0;
        }

        .issuer-settings-panel,
        .tx-settings-panel,
        .account-control-panel {
          gap: 2px;
        }

        .airdrop-address-wrap,
        .airdrop-claim-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .airdrop-link-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-link);
          text-decoration: none;
          line-height: 1;
        }

        .airdrop-link-btn:hover {
          text-decoration: underline;
        }

        .control-address-wrap {
          display: inline-flex;
          align-items: center;
          max-width: none;
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

        .asset-compact-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 0;
          width: 100%;
        }

        .asset-compact-actions .asset-compact-toggle {
          width: 100%;
        }

        .cards-list + .asset-compact-actions {
          margin-top: 8px;
        }

        .token-tab-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin: 6px 0 4px;
          min-height: 24px;
        }

        .token-tab-switch {
          display: inline-flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .token-tab-btn {
          border: 0;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 2px 0;
          line-height: 1.2;
          cursor: pointer;
          min-width: 0;
          appearance: none;
          -webkit-appearance: none;
        }

        .token-tab-btn.active {
          color: var(--accent-link);
          border-bottom-color: var(--accent-link);
          box-shadow: none;
        }

        .token-tab-btn:hover:not(.active) {
          color: var(--text);
          border-bottom-color: color-mix(in srgb, var(--text) 35%, transparent);
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

        .nft-section-content {
          margin-top: 10px;
          padding: 0;
          background: transparent;
        }

        .nft-offers-content {
          margin-top: 6px;
        }

        .nft-asset-info {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          max-width: 100%;
        }

        .nft-asset-thumb {
          display: inline-flex;
          width: 40px;
          height: 40px;
          border-radius: 6px;
          overflow: hidden;
          line-height: 0;
          flex-shrink: 0;
        }

        .nft-asset-thumb :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
          display: block;
        }

        .nft-asset-text {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }

        .nft-asset-text .asset-summary-title {
          font-size: 14px;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 100%;
        }

        .nft-asset-text .asset-fiat {
          font-size: 12px;
          line-height: 1.2;
          margin-top: 0;
        }

        .nft-details {
          margin-top: 10px;
          padding-top: 10px;
          padding-left: 0;
          padding-right: 0;
          min-height: 248px;
        }

        .nft-details-flat-top,
        .object-details-flat-top {
          margin-top: 0;
          padding-top: 0;
          border-top: 0;
        }

        .nft-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .nft-section-header-row,
        .object-section-header-row {
          margin-top: 4px;
        }

        .nft-section-title,
        .object-section-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .nft-header-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nft-title-wrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex-wrap: nowrap;
        }

        .nft-tab-row,
        .object-tab-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          min-height: 24px;
        }

        .nft-tab-row-outside,
        .object-tab-row-outside {
          margin-top: -2px;
          margin-bottom: -4px;
        }

        .escrow-tab-row {
          margin-top: 8px;
          margin-bottom: 10px;
        }

        .nft-header-meta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nft-header-meta-link {
          color: var(--accent-link);
          text-decoration: none;
        }

        .nft-header-meta-link:hover {
          text-decoration: underline;
        }

        .nft-tab-switch,
        .object-tab-switch {
          display: inline-flex;
          gap: 8px;
          margin-left: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          align-items: center;
          flex-wrap: wrap;
        }

        .nft-tab-btn,
        .object-tab-btn {
          border: 0;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 2px 0;
          line-height: 1.2;
          cursor: pointer;
          min-width: 0;
          appearance: none;
          -webkit-appearance: none;
        }

        .nft-tab-btn.active,
        .object-tab-btn.active {
          color: var(--accent-link);
          border-bottom-color: var(--accent-link);
          box-shadow: none;
        }

        .nft-tab-btn:hover:not(.active),
        .object-tab-btn:hover:not(.active) {
          color: var(--text);
          border-bottom-color: color-mix(in srgb, var(--text) 35%, transparent);
        }

        .nft-offers-tab-switch {
          margin-left: 0;
          gap: 8px;
          flex-wrap: wrap;
        }

        .nft-title-count,
        .object-title-count {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: auto;
          text-align: left;
          font-variant-numeric: tabular-nums;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .object-list-details {
          margin-top: 0;
          padding-top: 0;
          padding-left: 0;
          padding-right: 0;
          border-top: 0;
        }

        .object-list-item {
          cursor: default;
          padding: 0;
        }

        .object-list-item:hover {
          transform: none;
        }

        .object-cards-wrapper {
          background: transparent;
          border-radius: 0;
          margin-top: 6px;
        }

        .object-cards-details {
          margin-top: 0;
          padding-top: 0;
        }

        .object-cards-list,
        .object-list {
          display: flex;
          flex-direction: column;
        }

        .expandable-card {
          cursor: pointer;
        }

        .expandable-card.expanded {
          border-color: var(--accent-link);
        }

        .dex-order-card {
          overflow: hidden;
        }

        .dex-order-card .asset-main {
          min-width: 0;
          position: relative;
        }

        .dex-order-card .asset-logo {
          min-width: 0;
          white-space: normal;
          overflow: hidden;
        }

        .dex-order-card .escrow-collapsed-logo {
          width: 100%;
          padding-right: 50px;
        }

        .dex-order-card .escrow-collapsed-top {
          display: block;
        }

        .dex-order-card .escrow-time-top {
          position: absolute;
          right: 0;
          top: 0;
          text-align: right;
          white-space: nowrap;
        }

        .dex-order-card .escrow-type-main {
          display: block;
          line-height: 18px;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .dex-order-card .tx-collapsed-meta {
          display: block;
          padding-top: 0;
          margin-top: 2px;
        }

        .dex-order-card .tx-accountset-inline {
          display: block;
          line-height: 18px;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .dex-order-card .asset-value {
          min-width: 0;
        }

        .escrow-collapsed-main {
          align-items: flex-start;
          position: relative;
        }

        .escrow-collapsed-logo {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-right: 104px;
        }

        .escrow-collapsed-top {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .escrow-type-main {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .escrow-time-top {
          position: absolute;
          right: 0;
          top: 0;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.2;
          white-space: nowrap;
        }

        .paychannel-asset-item {
          --asset-card-body-min-height: 46px;
        }

        .paychannel-card-main {
          align-items: center;
          gap: 12px;
        }

        .paychannel-counterparty {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          font-size: 13px;
        }

        .paychannel-counterparty-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
        }

        .paychannel-counterparty-value {
          min-width: 0;
        }

        .paychannel-metrics {
          display: flex;
          flex-direction: column;
          gap: 0;
          align-items: flex-end;
          justify-content: center;
          flex-wrap: nowrap;
          min-width: 0;
          align-self: center;
          text-align: right;
          padding-top: 0;
        }

        .paychannel-metric-caption {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--text-secondary);
          line-height: 1;
        }

        .paychannel-metric-main {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .paychannel-metric-balance,
        .paychannel-metric-amount {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.2;
        }

        .paychannel-metric-separator {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .paychannel-metric-fiat {
          font-size: 10px;
          color: var(--text-secondary);
          white-space: nowrap;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.1;
        }

        @media (max-width: 768px) {
          .paychannel-card-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .paychannel-metrics {
            width: 100%;
            align-items: flex-start;
          }
        }

        .check-collapsed-main {
          align-items: center;
          min-height: var(--asset-card-body-min-height);
        }

        .check-row-card .asset-logo {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
        }

        .card-actions {
          margin-top: 4px;
          display: inline-flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
          float: right;
        }

        .card-action-btn {
          border: 1px solid color-mix(in srgb, var(--text-secondary) 30%, var(--border-color));
          border-radius: 6px;
          background: color-mix(in srgb, var(--background-input) 88%, var(--text-main) 12%);
          color: var(--text);
          font-size: 12px;
          padding: 5px 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition:
            background-color 0.16s ease,
            border-color 0.16s ease,
            color 0.16s ease;
        }

        .card-action-btn:hover {
          border-color: var(--text-secondary);
          background: color-mix(in srgb, var(--background-input) 74%, var(--text-main) 26%);
        }

        .card-action-btn:active {
          background: color-mix(in srgb, var(--background-input) 66%, var(--text-main) 34%);
        }

        .card-action-btn.redeem {
          color: var(--green);
          border-color: color-mix(in srgb, var(--green) 40%, var(--border-color));
          background: color-mix(in srgb, var(--green) 12%, var(--background-input));
        }

        .card-action-btn.redeem:hover {
          border-color: color-mix(in srgb, var(--green) 60%, var(--border-color));
          background: color-mix(in srgb, var(--green) 18%, var(--background-input));
        }

        .card-action-btn.cancel {
          color: var(--red);
          border-color: color-mix(in srgb, var(--red) 60%, var(--border-color));
          background: color-mix(in srgb, var(--red) 16%, var(--background-input));
          font-weight: 600;
        }

        .card-action-btn.cancel:hover {
          border-color: color-mix(in srgb, var(--red) 78%, var(--border-color));
          background: color-mix(in srgb, var(--red) 24%, var(--background-input));
        }

        .card-action-btn.disabled,
        .card-action-btn:disabled {
          color: var(--text-secondary);
          border-color: color-mix(in srgb, var(--text-secondary) 18%, var(--border-color));
          background: color-mix(in srgb, var(--background-main) 82%, var(--background-input));
          opacity: 0.75;
          cursor: not-allowed;
        }

        @media (max-width: 560px) {
          .dex-order-card .escrow-collapsed-logo {
            padding-right: 50px;
          }

          .nft-asset-text .asset-summary-title {
            -webkit-line-clamp: 1;
            word-break: break-all;
          }

          .nft-details {
            min-height: 376px;
          }
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
          align-items: flex-start;
          gap: 6px;
          justify-content: flex-end;
        }

        .id-inline {
          display: inline-grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: start;
          column-gap: 6px;
          width: 100%;
        }

        .tx-offer-id-list {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          max-width: 60% !important;
          text-align: right;
        }

        .address-text {
          font-family: monospace;
          font-size: 12px;
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-all;
          text-align: right;
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
