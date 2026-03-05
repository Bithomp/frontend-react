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
  stripDomain,
  timestampExpired
} from '../../utils'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
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
import InfiniteScrolling from '../../components/Layout/InfiniteScrolling'
import { fetchHistoricalRate } from '../../utils/common'
import CopyButton from '../../components/UI/CopyButton'
import { CurrencyWithIcon } from '../../utils/format'
import { NftImage, nftName } from '../../utils/nft'
import {
  AddressWithIconInline,
  amountFormat,
  addressUsernameOrServiceLink,
  convertedAmount,
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
import { addressBalanceChanges, errorCodeDescription, shortErrorCode } from '../../utils/transaction'
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
import { MdMoneyOff, MdQrCode2 } from 'react-icons/md'
import { TbPigMoney } from 'react-icons/tb'
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
  setSignRequest,
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
  const [ownedNfts, setOwnedNfts] = useState([])
  const [soldNfts, setSoldNfts] = useState([])
  const [soldNftsLoading, setSoldNftsLoading] = useState(false)
  const [mintedNfts, setMintedNfts] = useState([])
  const [burnedNfts, setBurnedNfts] = useState([])
  const [mintedNftsLoading, setMintedNftsLoading] = useState(false)
  const [burnedNftsLoading, setBurnedNftsLoading] = useState(false)
  const [ownedNftIds, setOwnedNftIds] = useState([])
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
  const [incomingPaychannels, setIncomingPaychannels] = useState([])
  const [outgoingPaychannels, setOutgoingPaychannels] = useState([])
  const [checksTab, setChecksTab] = useState('received')
  const [escrowsTab, setEscrowsTab] = useState('received')
  const [paychannelsTab, setPaychannelsTab] = useState('incoming')
  const [expandedCheckKey, setExpandedCheckKey] = useState(null)
  const [expandedEscrowKey, setExpandedEscrowKey] = useState(null)
  const [showTxSettingsDetails, setShowTxSettingsDetails] = useState(false)
  const [showAccountControlDetails, setShowAccountControlDetails] = useState(false)
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
  const isMobile = useIsMobile(768)
  const TOKEN_PREVIEW_LIMIT = 5
  const DESKTOP_TRANSACTIONS_PREVIEW_LIMIT = 20
  const MOBILE_TRANSACTIONS_PREVIEW_LIMIT = 10
  const TRANSACTIONS_PREVIEW_LIMIT = isMobile ? MOBILE_TRANSACTIONS_PREVIEW_LIMIT : DESKTOP_TRANSACTIONS_PREVIEW_LIMIT
  const TRANSACTIONS_LOAD_MORE_LIMIT = 10
  const NFT_PREVIEW_LIMIT = 8
  const issuerTransferFeeText = data?.ledgerInfo?.transferRate
    ? transferRateToPercent(data.ledgerInfo.transferRate)
    : '0%'
  const isRipplingEnabled = !!data?.ledgerInfo?.flags?.defaultRipple
  const isCanEscrowEnabled = !!data?.ledgerInfo?.flags?.allowTrustLineLocking
  const hasCustomTransferFee = Number(data?.ledgerInfo?.transferRate || 0) > 1000000000
  const hasIssuerSettingsData = isRipplingEnabled || hasCustomTransferFee || isCanEscrowEnabled
  const isMessageKeyUsedForFlare = data?.ledgerInfo?.messageKey?.substring(0, 26) === '02000000000000000000000000'
  const hasRegularKey = !!data?.ledgerInfo?.regularKey
  const hasMultisig = !!data?.ledgerInfo?.signerList
  const isBlackholed = !!data?.ledgerInfo?.blackholed
  const hasAccountControlData =
    hasRegularKey ||
    hasMultisig ||
    isBlackholed ||
    !!data?.ledgerInfo?.flags?.passwordSpent ||
    !!data?.ledgerInfo?.flags?.disableMaster
  const accountControlCollapsedLabel = isBlackholed
    ? 'Blackholed'
    : hasRegularKey && hasMultisig
      ? 'regKey + multisig'
      : hasRegularKey
        ? 'regKey'
        : hasMultisig
          ? 'multisig'
          : null
  const hasNftDataDetails =
    !!data?.ledgerInfo?.firstNFTokenSequence ||
    !!data?.ledgerInfo?.nftokenMinter ||
    !!data?.ledgerInfo?.flags?.disallowIncomingNFTokenOffer ||
    !!data?.ledgerInfo?.flags?.uriTokenIssuer
  const hasFlareAddress = !!data?.flare?.address
  const hasAirdropsData = hasFlareAddress
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

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  const accountDisplayService = data?.service?.name
  const accountDisplayUsername = !accountDisplayService ? data?.username : null
  const accountDisplayName =
    userOrServiceName({ service: accountDisplayService, username: accountDisplayUsername }) || 'Account'

  const nativeAvailableFiatValue = ((balanceList?.available?.native || 0) / 1000000) * (pageFiatRate || 0)
  const isLpTrustlineToken = (token) => token?.Balance?.currency?.substring(0, 2) === '03'
  const lpTokenList = tokens.filter((token) => isLpTrustlineToken(token))
  const standardTokenList = tokens.filter((token) => !isLpTrustlineToken(token))
  const totalTokenCount = tokens.length
  const lpTokensCount = lpTokenList.length
  const issuedTokensCount = standardTokenList.length
  const hasNonNativeTokenAssets = lpTokensCount > 0 || issuedTokensCount > 0
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
    ...(issuedTokensCount > 0 ? [{ label: `Issued tokens (${issuedTokensCount})`, value: issuedTokensFiatValue }] : [])
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
  const hasOwnedNfts = ownedNftCount > 0
  const hasSoldNfts = soldNfts.length > 0
  const hasMintedNfts = mintedNfts.length > 0
  const hasBurnedNfts = burnedNfts.length > 0
  const hasAnyNftSectionData = hasOwnedNfts || hasSoldNfts || hasMintedNfts || hasBurnedNfts
  const activeNftList =
    nftTab === 'owned' ? ownedNfts : nftTab === 'sold' ? soldNfts : nftTab === 'minted' ? mintedNfts : burnedNfts
  const activeNftCount = activeNftList.length
  const activeNftPreview = activeNftList.slice(0, NFT_PREVIEW_LIMIT)
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
        ? `/nft-sales?seller=${data?.address}&period=all`
        : nftTab === 'minted'
          ? `/nft-explorer?includeWithoutMediaData=true&issuer=${data?.address}&includeBurned=true`
          : `/nft-explorer?includeWithoutMediaData=true&issuer=${data?.address}&includeBurned=true&burnedPeriod=all`
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
  const hasReceivedPrivateNftOffers = receivedPrivateNftOffers.length > 0
  const hasCreatedNftOffers = createdNftOffers.length > 0
  const hasOwnedNftOffers = ownedNftOffers.length > 0
  const hasAnyNftOffersData = hasReceivedPrivateNftOffers || hasCreatedNftOffers || hasOwnedNftOffers
  const activeNftOffersCount = activeNftOffers.length
  const activeNftOffersCountLabel = activeNftOffersCount === 5 ? '5+' : activeNftOffersCount
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
  const checksSectionTitle = showChecksTabs ? 'Checks' : activeChecksTab === 'sent' ? 'Sent checks' : 'Received checks'

  const hasReceivedEscrows = receivedEscrows.length > 0
  const hasSentEscrows = sentEscrows.length > 0
  const showEscrowsTabs = hasReceivedEscrows && hasSentEscrows
  const activeEscrowsTab = showEscrowsTabs ? escrowsTab : hasSentEscrows ? 'sent' : 'received'
  const activeEscrowsList = activeEscrowsTab === 'sent' ? sentEscrows : receivedEscrows
  const escrowsSectionTitle = showEscrowsTabs
    ? 'Escrows'
    : activeEscrowsTab === 'sent'
      ? 'Sent escrows'
      : 'Received escrows'

  const hasIncomingPaychannels = incomingPaychannels.length > 0
  const hasOutgoingPaychannels = outgoingPaychannels.length > 0
  const showPaychannelsTabs = hasIncomingPaychannels && hasOutgoingPaychannels
  const activePaychannelsTab = showPaychannelsTabs ? paychannelsTab : hasOutgoingPaychannels ? 'outgoing' : 'incoming'
  const activePaychannelsList = activePaychannelsTab === 'outgoing' ? outgoingPaychannels : incomingPaychannels
  const paychannelsSectionTitle = showPaychannelsTabs
    ? 'Paychannels'
    : activePaychannelsTab === 'outgoing'
      ? 'Outgoing paychannels'
      : 'Incoming paychannels'

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
    setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
    setExpandedToken(null)
    setExpandedTransactionKey(null)
    setShowNftDataDetails(false)
    setNftTab('owned')
    setNftOffersTab('received')
    setTokenTab('all')
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
    if (ownedNfts.length > 0) {
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
    if (nftTab === 'owned') return

    if (!availableTabs.includes(nftTab)) {
      setNftTab(availableTabs[0])
    }
  }, [nftTab, ownedNfts.length, soldNfts.length, mintedNfts.length, burnedNfts.length])

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
    if (!showEscrowsTabs && escrowsTab === 'sent' && !hasSentEscrows) {
      setEscrowsTab('received')
    }
    if (!showEscrowsTabs && escrowsTab === 'received' && !hasReceivedEscrows && hasSentEscrows) {
      setEscrowsTab('sent')
    }
  }, [showEscrowsTabs, escrowsTab, hasSentEscrows, hasReceivedEscrows])

  useEffect(() => {
    if (!showPaychannelsTabs && paychannelsTab === 'outgoing' && !hasOutgoingPaychannels) {
      setPaychannelsTab('incoming')
    }
    if (!showPaychannelsTabs && paychannelsTab === 'incoming' && !hasIncomingPaychannels && hasOutgoingPaychannels) {
      setPaychannelsTab('outgoing')
    }
  }, [showPaychannelsTabs, paychannelsTab, hasOutgoingPaychannels, hasIncomingPaychannels])

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

        try {
          setSoldNftsLoading(true)
          const soldNftsUrl =
            `v2/nft-sales?seller=${data.address}&list=lastSold&limit=${NFT_PREVIEW_LIMIT}` +
            (selectedCurrency
              ? `&convertCurrencies=${selectedCurrency.toLowerCase()}&sortCurrency=${selectedCurrency.toLowerCase()}`
              : '')
          const soldResponse = await axios.get(soldNftsUrl)
          setSoldNfts(Array.isArray(soldResponse?.data?.sales) ? soldResponse.data.sales : [])
        } catch {
          setSoldNfts([])
        } finally {
          setSoldNftsLoading(false)
        }

        if (Number(data?.ledgerInfo?.mintedNFTokens || 0) > 0) {
          try {
            setMintedNftsLoading(true)
            const mintedNftsUrl =
              `v2/nfts?list=nfts&issuer=${data.address}&order=mintedNew&includeDeleted=true&includeWithoutMediaData=true&limit=${NFT_PREVIEW_LIMIT}` +
              (effectiveLedgerTimestamp
                ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
                : '')
            const mintedResponse = await axios.get(mintedNftsUrl)
            setMintedNfts(
              Array.isArray(mintedResponse?.data?.nfts) ? mintedResponse.data.nfts.slice(0, NFT_PREVIEW_LIMIT) : []
            )
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
              `v2/nfts?list=nfts&issuer=${data.address}&order=mintedNew&includeDeleted=true&deletedAt=all&includeWithoutMediaData=true&limit=${NFT_PREVIEW_LIMIT}` +
              (effectiveLedgerTimestamp
                ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
                : '')
            const burnedResponse = await axios.get(burnedNftsUrl)
            setBurnedNfts(
              Array.isArray(burnedResponse?.data?.nfts) ? burnedResponse.data.nfts.slice(0, NFT_PREVIEW_LIMIT) : []
            )
          } catch {
            setBurnedNfts([])
          } finally {
            setBurnedNftsLoading(false)
          }
        } else {
          setBurnedNfts([])
          setBurnedNftsLoading(false)
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
        setSoldNfts([])
        setSoldNftsLoading(false)
        setMintedNfts([])
        setMintedNftsLoading(false)
        setBurnedNfts([])
        setBurnedNftsLoading(false)
        setReceivedChecks([])
        setSentChecks([])
        setIncomingPaychannels([])
        setOutgoingPaychannels([])
      }
    }

    fetchTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address, data?.ledgerInfo?.activated, effectiveLedgerTimestamp, selectedCurrency])

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

  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated) return

    let cancelled = false

    const fetchOfferList = async ({ tabKey, list }) => {
      setNftOffersLoading((prev) => ({ ...prev, [tabKey]: true }))
      setNftOffersError((prev) => ({ ...prev, [tabKey]: null }))

      try {
        const listParam = list ? `&list=${list}` : ''
        const response = await axios.get(
          `v2/nft-offers/${data.address}?nftoken=true&offersValidate=true&limit=5${listParam}`
        )

        const offers = Array.isArray(response?.data?.nftOffers)
          ? response.data.nftOffers
              .filter((offer) => offer?.valid !== false)
              .sort((a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0))
              .slice(0, 5)
          : []

        if (cancelled) return

        if (tabKey === 'received') {
          setReceivedPrivateNftOffers(offers)
        } else if (tabKey === 'created') {
          setCreatedNftOffers(offers)
        } else {
          setOwnedNftOffers(offers)
        }
      } catch (error) {
        if (cancelled) return

        if (tabKey === 'received') {
          setReceivedPrivateNftOffers([])
        } else if (tabKey === 'created') {
          setCreatedNftOffers([])
        } else {
          setOwnedNftOffers([])
        }

        setNftOffersError((prev) => ({ ...prev, [tabKey]: error?.message || 'Failed to load NFT offers' }))
      } finally {
        if (!cancelled) {
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
  }, [data?.address, data?.ledgerInfo?.activated])

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
    setTransactionsSearchPaused(false)

    try {
      const limit = append ? TRANSACTIONS_LOAD_MORE_LIMIT : TRANSACTIONS_PREVIEW_LIMIT
      const response = await axios.get(buildTransactionsUrl({ markerValue, filtersOverride, limit }))
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
      setTransactionsError(error?.message || 'Failed to load transactions')
      if (!append) {
        setRecentTransactions([])
        setTransactionsMarker(null)
      }
      setTransactionsSearchPaused(false)
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
  }, [data?.address, data?.ledgerInfo?.activated, selectedCurrency, effectiveLedgerTimestamp, isMobile])

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
          className="button-action"
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
    <span className="tx-inline-load">
      <span>Loading more transactions</span>
      <span className="waiting inline" aria-hidden="true"></span>
    </span>
  ) : (
    'Scroll down to load more transactions'
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
                  <span className="account-username">
                    {accountDisplayName}
                    {!!accountDisplayUsername && <CopyButton text={accountDisplayUsername} />}
                  </span>
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

              <div className="cards-list info-cards-list">
                {hasAccountControlData && (
                  <div className="time-machine-card account-control-card">
                    <button
                      type="button"
                      className={`time-machine-toggle ${showAccountControlDetails ? 'active' : ''}`}
                      onClick={() => setShowAccountControlDetails((prev) => !prev)}
                    >
                      Account control
                      {accountControlCollapsedLabel && (
                        <span className={`account-control-collapsed ${isBlackholed ? 'orange bold' : ''}`}>
                          {' '}
                          · {accountControlCollapsedLabel}
                        </span>
                      )}
                    </button>

                    {showAccountControlDetails && (
                      <div className="time-machine-panel account-control-panel">
                        {data?.ledgerInfo?.regularKey && (
                          <div className="detail-row issuer-detail-row">
                            <span>Regular key:</span>
                            <span className="control-address-wrap">
                              <span className="copy-inline">
                                <AddressWithIconInline
                                  data={data.ledgerInfo}
                                  name="regularKey"
                                  options={{ short: 6 }}
                                />
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
                              <AddressWithIconInline
                                data={data.ledgerInfo}
                                name="nftokenMinter"
                                options={{ short: 6 }}
                              />
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
                            <span>URI token issuer:</span>
                            <span className="green">enabled</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {data?.ledgerInfo?.sequence && (
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
                        <div className="detail-row issuer-detail-row">
                          <span>Next sequence:</span>
                          <span className="copy-inline">
                            <span>{data.ledgerInfo.sequence}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.sequence} />
                            </span>
                          </span>
                        </div>
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
                      <span className="account-control-collapsed"> · Flare + Songbird</span>
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
            </div>
          </CollapsibleColumn>

          {/* Column 2: Assets */}
          <CollapsibleColumn>
            <div className="assets-section">
              {hasNonNativeTokenAssets && (
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
                        Show all {activeTokenTabLabel} ({activeTokenList.length})
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

              {hasAnyNftSectionData && (
                <>
                  <div className="section-header-row nft-section-header-row">
                    <div className="section-title nft-section-title">
                      NFTs <span className="nft-title-count">{activeNftCount}</span>
                    </div>
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
                          Owned
                        </button>
                      )}
                      {hasSoldNfts && (
                        <button
                          type="button"
                          className={`nft-tab-btn ${nftTab === 'sold' ? 'active' : ''}`}
                          onClick={() => setNftTab('sold')}
                        >
                          Sold
                        </button>
                      )}
                      {hasMintedNfts && (
                        <button
                          type="button"
                          className={`nft-tab-btn ${nftTab === 'minted' ? 'active' : ''}`}
                          onClick={() => setNftTab('minted')}
                        >
                          Minted
                        </button>
                      )}
                      {hasBurnedNfts && (
                        <button
                          type="button"
                          className={`nft-tab-btn ${nftTab === 'burned' ? 'active' : ''}`}
                          onClick={() => setNftTab('burned')}
                        >
                          Burned
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="asset-item nft-summary-item">
                    <div className="asset-details nft-details nft-details-flat-top">
                      {activeNftLoading ? (
                        <div className="asset-fiat">Loading {nftTab} NFTs...</div>
                      ) : activeNftCount > 0 ? (
                        <div className="owned-nft-grid">
                          {activeNftPreview.map((nft, nftIndex) => {
                            const nftId =
                              nft?.nftokenID || nft?.NFTokenID || nft?.nftoken?.nftokenID || nft?.nftoken?.NFTokenID
                            if (!nftId) return null

                            const fallbackTitle = nftId
                            const nftTitle = nftName(nft, { maxLength: 26 }) || fallbackTitle
                            const soldAt = nft?.acceptedAt || nft?.soldAt || nft?.createdAt || nft?.updatedAt
                            const soldTimeAgo = nftTab === 'sold' && soldAt ? timeFromNow(soldAt, i18n) : null
                            const soldPrice =
                              nftTab === 'sold' && nft?.amount
                                ? amountFormat(nft.amount, { short: true, maxFractionDigits: 2 })
                                : null
                            const soldPriceFiat =
                              nftTab === 'sold' && selectedCurrency
                                ? convertedAmount(nft, selectedCurrency.toLowerCase(), { short: true })
                                : null

                            return (
                              <div key={`${nftId}-${nftIndex}`} className="owned-nft-card">
                                <Link
                                  href={`/nft/${nftId}`}
                                  className="owned-nft-image-link"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <NftImage
                                    nft={nft}
                                    style={{ width: 64, height: 64, borderRadius: '6px', margin: '0 auto 3px' }}
                                  />
                                </Link>
                                <div className="nft-caption">
                                  <span
                                    className={`owned-nft-name ${nftTab === 'sold' ? 'owned-nft-name-one-line' : 'owned-nft-name-two-lines'}`}
                                  >
                                    {nftTab === 'sold' ? soldTimeAgo || nftTitle : nftTitle}
                                  </span>
                                  {nftTab === 'sold' && <span className="sold-nft-price">{soldPrice}</span>}
                                  {nftTab === 'sold' && !!soldPriceFiat && (
                                    <span className="sold-nft-fiat" suppressHydrationWarning>
                                      ≈{soldPriceFiat}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="asset-fiat">{activeNftEmptyLabel}</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CollapsibleColumn>

          {/* Column 3: Transactions */}
          <CollapsibleColumn>
            <div className="transactions-section">
              <div className="section-header-row">
                <span className="section-title">Transactions</span>
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

              {transactionsLoading && (
                <p className="grey">
                  <span className="tx-inline-load">
                    <span>Loading transactions</span>
                    <span className="waiting inline" aria-hidden="true"></span>
                  </span>
                </p>
              )}
              {!transactionsLoading && transactionsError && <p className="red">{transactionsError}</p>}

              {!transactionsLoading &&
                !transactionsError &&
                recentTransactions.length === 0 &&
                !transactionsSearchPaused && <p className="grey">No transactions found.</p>}

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
                        const shortHash = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-6)}` : '-'
                        const txHistoricalRate = Number.isFinite(Number(txdata?.fiatRates?.[selectedCurrency]))
                          ? Number(txdata.fiatRates[selectedCurrency])
                          : null

                        const changes = addressBalanceChanges(txdata, data?.address) || []
                        const firstChange = changes?.[0]
                        const positiveChange = changes.find((change) => Number(change?.value || 0) > 0)
                        const collapsedPrimaryChange = changes.length > 2 ? positiveChange || firstChange : firstChange
                        const collapsedSecondaryChange = changes.length === 2 ? changes[1] : null
                        const collapsedMoreCount = changes.length > 2 ? changes.length - 1 : 0
                        const primaryChangeValue = Number(collapsedPrimaryChange?.value || 0)
                        const primaryChangeClass =
                          primaryChangeValue > 0 ? 'green' : primaryChangeValue < 0 ? 'red' : ''
                        const primaryChangeFiat = collapsedPrimaryChange
                          ? nativeCurrencyToFiat({
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
                          ? nativeCurrencyToFiat({
                              amount: collapsedSecondaryChange,
                              selectedCurrency,
                              fiatRate: txHistoricalRate,
                              asText: true
                            })
                          : ''
                        const txAmountRaw = tx?.Amount
                        const hasObjectTxAmount = typeof txAmountRaw === 'object' && txAmountRaw !== null
                        const isMissingOrZeroTxAmount = typeof txAmountRaw === 'undefined' || txAmountRaw === '0'
                        const shouldShowExpandedRate =
                          changes.length > 0 || hasObjectTxAmount || !isMissingOrZeroTxAmount
                        const isLpAmount = (amount) => {
                          if (!amount || typeof amount !== 'object') return false
                          if (amount?.currencyDetails?.type === 'lp_token') return true
                          const amountCurrency = amount?.currency
                          return typeof amountCurrency === 'string' && amountCurrency.substring(0, 2) === '03'
                        }

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
                        const counterpartyDetails = isSource
                          ? txdata?.specification?.destination?.addressDetails
                          : txdata?.specification?.source?.addressDetails

                        const nftChanges = (outcome?.nftokenChanges || []).flatMap(
                          (entry) => entry?.nftokenChanges || []
                        )
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
                        const txType = tx?.TransactionType || ''
                        const txTypeLower = txType.toLowerCase()
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
                          txdata?.specification?.flags
                            ? txdata?.specification?.flags?.sell
                            : myOrderbookChange?.direction
                        )
                          ? 'Sell'
                          : 'Buy'
                        const isMyDexOrder = tx?.Account === data?.address
                        const dexOrderStatus = (() => {
                          if (!isDexOfferTx) return null
                          if (txType === 'OfferCancel') return 'canceled'
                          if (changes?.length === 0 && isMyDexOrder) return 'placed'
                          if (!isMyDexOrder) return 'fullfilled'
                          return 'placed and fullfilled'
                        })()
                        const dexOfferShortLabel =
                          isDexOfferTx && dexOrderStatus ? `${dexOfferDirection} order ${dexOrderStatus}` : null
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
                          isDexOfferTx && typeof dexOrderStatus === 'string' && !dexOrderStatus.includes('fullfilled')
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
                        const isCreateNftOfferTx =
                          txType === 'NFTokenCreateOffer' ||
                          txTypeLower === 'createnftselloffer' ||
                          txTypeLower === 'createnftbuyoffer'
                        const isAcceptNftOfferTx =
                          txType === 'NFTokenAcceptOffer' ||
                          txTypeLower === 'acceptnftselloffer' ||
                          txTypeLower === 'acceptnftbuyoffer' ||
                          txTypeLower === 'acceptnftoffer'
                        const isCancelNftOfferTx = txType === 'NFTokenCancelOffer' || txTypeLower === 'cancelnftoffer'
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
                          ? nativeCurrencyToFiat({
                              amount: nftOfferAmountRaw,
                              selectedCurrency,
                              fiatRate: txHistoricalRate,
                              asText: true,
                              absolute: true
                            })
                          : ''
                        const isBrokeredNftAccept =
                          isAcceptNftOfferTx && !!tx?.NFTokenSellOffer && !!tx?.NFTokenBuyOffer
                        const brokerAddress = isBrokeredNftAccept ? sourceAddress || tx?.Account || null : null
                        const ammLpChange = changes.find(
                          (change) =>
                            change?.currencyDetails?.type === 'lp_token' &&
                            change?.currencyDetails?.asset &&
                            change?.currencyDetails?.asset2
                        )
                        const ammAsset =
                          tx?.Asset || txdata?.specification?.asset || ammLpChange?.currencyDetails?.asset
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
                        const isTrustSetDeleted =
                          tx?.TransactionType === 'TrustSet' && !!trustSetToken && trustSetLimitValue === 0
                        const hasTrustSetLimit =
                          tx?.TransactionType === 'TrustSet' && !!trustSetToken && trustSetLimitValue > 0
                        const trustSetStatus = isTrustSetDeleted ? 'deleted' : hasTrustSetLimit ? 'added' : null

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
                            changes.push(`Message key: ${accountSetSpec?.messageKey || 'removed'}`)
                          }
                          if (tx?.Domain !== undefined) {
                            changes.push(`Domain: ${accountSetSpec?.domain || 'removed'}`)
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
                            changes.push(
                              `Deposit authorization: ${accountSetSpec.depositAuth ? 'enabled' : 'disabled'}`
                            )
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
                            changes.push(
                              `Incoming check: ${accountSetSpec.disallowIncomingCheck ? 'disallow' : 'allow'}`
                            )
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
                            changes.push(
                              `Authorized minter: ${accountSetSpec.authorizedMinter ? 'enabled' : 'disabled'}`
                            )
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
                            changes.push(
                              `Incoming remit: ${accountSetSpec.disallowIncomingRemit ? 'disallow' : 'allow'}`
                            )
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
                                  name="address"
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
                            if (nftViewerRole === 'seller')
                              return isFreeNftAccept ? 'Transferred NFT to' : 'Sold NFT to'
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
                        const isIncomingSellOffer =
                          isCreateNftOfferTx && tx?.Account !== data?.address && txdata?.specification?.flags?.sellToken
                        const incomingSellOfferAmount =
                          isIncomingSellOffer && hasNftOfferAmount ? toSignedDexAmount(nftOfferAmountRaw, -1) : null
                        const incomingSellOfferFiat = incomingSellOfferAmount
                          ? nativeCurrencyToFiat({
                              amount: incomingSellOfferAmount,
                              selectedCurrency,
                              fiatRate: txHistoricalRate,
                              asText: true
                            })
                          : ''
                        const isOutgoingSellOffer =
                          isCreateNftOfferTx && tx?.Account === data?.address && txdata?.specification?.flags?.sellToken
                        const outgoingSellOfferAmount =
                          isOutgoingSellOffer && hasNftOfferAmount ? toSignedDexAmount(nftOfferAmountRaw, 1) : null
                        const outgoingSellOfferFiat = outgoingSellOfferAmount
                          ? nativeCurrencyToFiat({
                              amount: outgoingSellOfferAmount,
                              selectedCurrency,
                              fiatRate: txHistoricalRate,
                              asText: true
                            })
                          : ''
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
                        const nftMintSellOfferAmount = showNftMintSellOfferAmount
                          ? toSignedDexAmount(nftMintAmountRaw, 1)
                          : null
                        const nftMintSellOfferFiat = nftMintSellOfferAmount
                          ? nativeCurrencyToFiat({
                              amount: nftMintSellOfferAmount,
                              selectedCurrency,
                              fiatRate: txHistoricalRate,
                              asText: true
                            })
                          : ''
                        const createNftAmountDisplay = (amount, fiatText) => {
                          if (amount === null || typeof amount === 'undefined') return null
                          return {
                            collapsedNode: (
                              <span className="tx-inline-change-item">
                                <span className="tx-inline-change orange">
                                  {amountFormat(amount, {
                                    icon: true,
                                    short: true,
                                    maxFractionDigits: 2,
                                    showPlus: true
                                  })}
                                </span>
                                {!!fiatText && <span className="tx-change-fiat">{fiatText}</span>}
                              </span>
                            ),
                            expandedText: amountFormat(amount, {
                              icon: true,
                              withIssuer: true,
                              precise: 'nice',
                              showPlus: true
                            }),
                            expandedFiat: fiatText
                          }
                        }
                        const incomingSellOfferDisplay =
                          !showFreeNftBadge && incomingSellOfferAmount
                            ? createNftAmountDisplay(incomingSellOfferAmount, incomingSellOfferFiat)
                            : null
                        const outgoingSellOfferDisplay =
                          !showFreeNftBadge && outgoingSellOfferAmount
                            ? createNftAmountDisplay(outgoingSellOfferAmount, outgoingSellOfferFiat)
                            : null
                        const nftMintSellOfferDisplay =
                          showNftMintSellOfferAmount && nftMintSellOfferAmount
                            ? createNftAmountDisplay(nftMintSellOfferAmount, nftMintSellOfferFiat)
                            : null
                        const nftOfferAmountDetailDisplay = incomingSellOfferDisplay || outgoingSellOfferDisplay
                        const offerAmountExpandedText =
                          nftOfferAmountDetailDisplay?.expandedText || nftOfferAmountExpandedText
                        const offerAmountFiatDetailText =
                          nftOfferAmountDetailDisplay?.expandedFiat || nftOfferAmountFiatExpandedText
                        const nftCollapsedSpecialDisplay =
                          incomingSellOfferDisplay || outgoingSellOfferDisplay || nftMintSellOfferDisplay
                        const txTypeShortLabel =
                          (isSelfPayment ? 'Swap' : null) ||
                          (isAccountDeleteTx ? 'Payment from deleted account' : null) ||
                          dexOfferShortLabel ||
                          nftOfferLegacyLabel ||
                          nftMintSpecialLabel ||
                          (txType === 'AccountSet'
                            ? 'Account settings update'
                            : txType === 'AMMDeposit'
                              ? 'AMM Deposit'
                              : txType === 'AMMVote'
                                ? 'AMM Vote'
                                : txType === 'AMMWithdraw'
                                  ? 'AMM Withdraw'
                                  : txType === 'NFTokenMint'
                                    ? 'NFT Mint'
                                    : txType === 'NFTokenBurn'
                                      ? 'NFT Burn'
                                      : txType === 'NFTokenCreateOffer'
                                        ? 'NFT offer'
                                        : txType === 'NFTokenAcceptOffer'
                                          ? 'NFT offer accept'
                                          : txType === 'NFTokenCancelOffer'
                                            ? 'NFT offer cancel'
                                            : txType || '-')
                        const txTypeCollapsedLabel =
                          isSelfPayment || isAccountDeleteTx
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
                                    {showBrokerInCollapsedTitle ? (
                                      <>
                                        <span className="tx-broker-inline">
                                          <span>Broker </span>
                                          <AddressWithIconInline
                                            data={{
                                              address: brokerAddress,
                                              addressDetails: txdata?.specification?.source?.addressDetails || {}
                                            }}
                                            name="address"
                                            options={{ short: 6 }}
                                          />
                                        </span>
                                        <span className="tx-broker-action">{brokerCollapsedAction}</span>
                                      </>
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
                                    !isDexOfferTx &&
                                    resolvedCounterpartyAddress && (
                                      <span className="tx-counterparty-inline">
                                        <AddressWithIconInline
                                          data={{
                                            address: resolvedCounterpartyAddress,
                                            addressDetails: resolvedCounterpartyDetails || {}
                                          }}
                                          name="address"
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
                                ) : nftCollapsedSpecialDisplay ? (
                                  nftCollapsedSpecialDisplay.collapsedNode
                                ) : showFreeNftBadge ? (
                                  <span className={`tx-offer-free ${showFreeNftBadgeGreen ? 'green' : 'orange'}`}>
                                    Free
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
                                  <span>{tx?.TransactionType || '-'}</span>
                                </div>

                                {showDexSpecifiedOrderDetails && !!dexTakerGets && (
                                  <div className="detail-row">
                                    <span>
                                      {dexOfferDirection === 'Sell'
                                        ? 'Specified sell exactly:'
                                        : 'Specified pay up to:'}
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
                                      <span className="address-text">{resolvedCounterpartyAddress}</span>
                                      <Link
                                        href={`/account/${resolvedCounterpartyAddress}`}
                                        className="inline-link-icon tooltip"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <LinkIcon />
                                        <span className="tooltiptext no-brake">Account page</span>
                                      </Link>
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
                                      <span className="address-text">{brokerAddress}</span>
                                      <Link
                                        href={`/account/${brokerAddress}`}
                                        className="inline-link-icon tooltip"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <LinkIcon />
                                        <span className="tooltiptext no-brake">Account page</span>
                                      </Link>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={brokerAddress} />
                                      </span>
                                    </span>
                                  </div>
                                )}

                                {tx?.TransactionType === 'TrustSet' && trustSetToken && (
                                  <>
                                    <div className="detail-row">
                                      <span>Currency:</span>
                                      <span className="copy-inline">
                                        <span>{trustSetToken?.currency || '-'}</span>
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
                                        {!!trustSetToken?.currency && (
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={trustSetToken.currency} />
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    {!!trustSetToken?.issuer && (
                                      <div className="detail-row">
                                        <span>Issuer:</span>
                                        <span className="copy-inline">
                                          <span className="address-text">{trustSetToken.issuer}</span>
                                          <Link
                                            href={`/account/${trustSetToken.issuer}`}
                                            className="inline-link-icon tooltip"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            <LinkIcon />
                                            <span className="tooltiptext no-brake">Issuer account page</span>
                                          </Link>
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
                                        <span className={accountSetSpec?.messageKey ? '' : 'orange'}>
                                          {accountSetSpec?.messageKey || 'removed'}
                                        </span>
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
                                            <span className="address-text">{accountSetSpec.nftokenMinter}</span>
                                            <Link
                                              href={`/account/${accountSetSpec.nftokenMinter}`}
                                              className="inline-link-icon tooltip"
                                              onClick={(event) => event.stopPropagation()}
                                            >
                                              <LinkIcon />
                                              <span className="tooltiptext no-brake">Account page</span>
                                            </Link>
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

                                <div className="detail-row">
                                  <span>Timestamp:</span>
                                  <span>{tx?.date ? fullDateAndTime(tx.date, 'ripple') : '-'}</span>
                                </div>

                                {!!selectedCurrency &&
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

                                {isSource && tx?.Fee && (
                                  <div className="detail-row">
                                    <span>Fee:</span>
                                    <span>
                                      {amountFormat(tx.Fee, { icon: true, precise: 'nice' })}
                                      {nativeCurrencyToFiat({
                                        amount: tx.Fee,
                                        selectedCurrency,
                                        fiatRate: txHistoricalRate
                                      })}
                                    </span>
                                  </div>
                                )}

                                {changes.length > 0 && (
                                  <div className="detail-row tx-detail-change-row">
                                    <span>Balance changes:</span>
                                    <span className="tx-detail-change-list">
                                      {changes.map((change, changeIndex) => {
                                        const changeValue = Number(change?.value || 0)
                                        const changeClass = changeValue > 0 ? 'green' : changeValue < 0 ? 'red' : ''
                                        const changeFiat = nativeCurrencyToFiat({
                                          amount: change,
                                          selectedCurrency,
                                          fiatRate: txHistoricalRate,
                                          asText: true
                                        })
                                        return (
                                          <span
                                            className={`tx-change-row ${changeClass}`}
                                            key={`${txKey}-change-${changeIndex}`}
                                          >
                                            <span>
                                              {amountFormat(change, {
                                                icon: !isLpAmount(change),
                                                withIssuer: true,
                                                bold: true,
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
                                    <span className="copy-inline id-inline">
                                      <span className="address-text ellipsis-text" title={nftTokenId}>
                                        {nftTokenId}
                                      </span>
                                      <Link
                                        href={`/nft/${nftTokenId}`}
                                        className="inline-link-icon tooltip"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <LinkIcon />
                                        <span className="tooltiptext no-brake">NFT page</span>
                                      </Link>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={nftTokenId} />
                                      </span>
                                    </span>
                                  </div>
                                )}

                                {nftOfferIds.length > 0 && (
                                  <div className="detail-row">
                                    <span>{nftOfferIds.length > 1 ? 'Offer IDs:' : 'Offer ID:'}</span>
                                    <span className="tx-offer-id-list">
                                      {nftOfferIds.map((offerId, offerIndex) => (
                                        <span className="copy-inline id-inline" key={`${txKey}-offer-${offerIndex}`}>
                                          <span className="address-text ellipsis-text" title={offerId}>
                                            {offerId}
                                          </span>
                                          <Link
                                            href={`/nft-offer/${offerId}`}
                                            className="inline-link-icon tooltip"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            <LinkIcon />
                                            <span className="tooltiptext no-brake">Offer page</span>
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
                                    <span className="tx-detail-offer-amount">
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
                                    <span className="tx-detail-offer-amount">
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
                                        {shortHash}
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
                                className="tx-mobile-load-btn"
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
          </CollapsibleColumn>

          {/* Column 4: Issued Tokens */}
          <CollapsibleColumn>
            <div className="orders-section">
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

              {hasIssuerSettingsData && (
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

                  <div className="checks-wrapper">
                    <div className="checks-details">
                      <div className="checks-list cards-list">
                        {activeChecksList.map((check, index) => {
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
                            (check?.Destination === account?.address ||
                              check?.Account === account?.address ||
                              isExpired)

                          return (
                            <div
                              className={`asset-item token-asset-item check-row-card ${isExpanded ? 'expanded' : ''}`}
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
                                          name="address"
                                          options={{ short: 6 }}
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
                                      <span>{check?.index || '-'}</span>
                                      {!!check?.index && (
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <CopyButton text={check.index} />
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  {!effectiveLedgerTimestamp && (
                                    <div className="check-actions" onClick={(event) => event.stopPropagation()}>
                                      <button
                                        type="button"
                                        className={`check-action-btn ${canRedeem ? 'redeem' : 'disabled'}`}
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
                                        title="Redeem"
                                      >
                                        <TbPigMoney /> Redeem
                                      </button>
                                      <button
                                        type="button"
                                        className={`check-action-btn ${canCancel ? 'cancel' : 'disabled'}`}
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
                                        title="Cancel"
                                      >
                                        <MdMoneyOff /> Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(hasReceivedEscrows || hasSentEscrows) && (
                <>
                  <div className="section-header-row object-section-header-row">
                    <div className="section-title object-section-title">
                      {escrowsSectionTitle} <span className="object-title-count">{activeEscrowsList.length}</span>
                    </div>
                  </div>

                  {showEscrowsTabs && (
                    <div className="object-tab-row escrow-tab-row">
                      <div className="object-tab-switch">
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'received' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('received')}
                        >
                          Received
                        </button>
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'sent' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('sent')}
                        >
                          Sent
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="escrow-wrapper">
                    <div className="escrow-details">
                      <div className="escrow-list cards-list">
                        {activeEscrowsList.map((escrow, index) => {
                          const escrowKey = `${escrow?.index || 'escrow'}-${activeEscrowsTab}-${index}`
                          const isExpanded = expandedEscrowKey === escrowKey
                          const counterpartName = activeEscrowsTab === 'sent' ? 'Destination' : 'Account'
                          const counterpartAddress = activeEscrowsTab === 'sent' ? escrow?.Destination : escrow?.Account
                          const amountCollapsed = amountFormat(escrow?.Amount, { short: true, maxFractionDigits: 2 })
                          const cancelAfterText = escrow?.CancelAfter
                            ? timeFromNow(escrow.CancelAfter, i18n, 'ripple')
                            : 'not set'
                          const finishAfterText = escrow?.FinishAfter
                            ? timeFromNow(escrow.FinishAfter, i18n, 'ripple')
                            : 'not set'
                          const isCanceled = escrow?.CancelAfter
                            ? timestampExpired(escrow.CancelAfter, 'ripple')
                            : false
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
                          const collapsedTimeText = isCanceled
                            ? cancelAfterText
                            : escrow?.FinishAfter
                              ? finishAfterText
                              : escrow?.CancelAfter
                                ? cancelAfterText
                                : '-'
                          const isOutgoingEscrow = activeEscrowsTab === 'sent'
                          const collapsedDirectionLabel = isOutgoingEscrow ? 'to' : 'from'
                          const collapsedAmountClass = isOutgoingEscrow ? 'red' : 'green'
                          const collapsedAmountSign = isOutgoingEscrow ? '-' : '+'

                          return (
                            <div
                              className={`asset-item token-asset-item check-row-card escrow-card ${isExpanded ? 'expanded' : ''}`}
                              key={escrowKey}
                              onClick={() => setExpandedEscrowKey(isExpanded ? null : escrowKey)}
                            >
                              <div className="asset-main check-collapsed-main escrow-collapsed-main">
                                <div className="asset-logo escrow-collapsed-logo">
                                  <div className="escrow-collapsed-top">
                                    <span className="escrow-type-main">Escrow {collapsedDirectionLabel}</span>
                                    <span
                                      className={`escrow-time-top ${isCanceled ? 'red' : isUnlockable ? 'green' : ''}`}
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
                                <div className="asset-value tx-collapsed-change escrow-collapsed-amount">
                                  <span className={`tx-inline-change ${collapsedAmountClass}`}>
                                    {collapsedAmountSign}
                                    {amountCollapsed}
                                  </span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="asset-details">
                                  <div className="detail-row">
                                    <span>{activeEscrowsTab === 'sent' ? 'To' : 'From'}:</span>
                                    <span className="copy-inline">
                                      {counterpartAddress ? (
                                        <>
                                          <span className="address-text">{counterpartAddress}</span>
                                          <Link
                                            href={`/account/${counterpartAddress}`}
                                            className="inline-link-icon tooltip"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            <LinkIcon />
                                            <span className="tooltiptext no-brake">Account page</span>
                                          </Link>
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={counterpartAddress} />
                                          </span>
                                        </>
                                      ) : (
                                        '-'
                                      )}
                                    </span>
                                  </div>

                                  <div className="detail-row">
                                    <span>Expire:</span>
                                    <span
                                      className={
                                        escrow?.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple')
                                          ? 'red'
                                          : ''
                                      }
                                    >
                                      {cancelAfterText}
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
                                      {finishAfterText}
                                    </span>
                                  </div>

                                  <div className="detail-row">
                                    <span>Amount:</span>
                                    <span>{amountFormat(escrow?.Amount, { precise: 'nice' })}</span>
                                  </div>

                                  <div className="detail-row">
                                    <span>Escrow ID:</span>
                                    <span className="copy-inline">
                                      <span>{escrow?.index || '-'}</span>
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
                                    <div className="check-actions" onClick={(event) => event.stopPropagation()}>
                                      <button
                                        type="button"
                                        className={`check-action-btn ${canExecute ? 'redeem' : 'disabled'}`}
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
                                        title="Execute"
                                      >
                                        <TbPigMoney /> Execute
                                      </button>
                                      <button
                                        type="button"
                                        className={`check-action-btn ${canCancel ? 'cancel' : 'disabled'}`}
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
                                        title="Cancel"
                                      >
                                        <MdMoneyOff /> Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {hasAnyNftOffersData && (
                <>
                  <div className="section-header-row nft-section-header-row">
                    <div className="section-title nft-section-title">
                      NFT offers <span className="nft-title-count">{activeNftOffersCountLabel}</span>
                    </div>
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
                          Private
                        </button>
                      )}
                      {hasCreatedNftOffers && (
                        <button
                          type="button"
                          className={`nft-tab-btn ${nftOffersTab === 'created' ? 'active' : ''}`}
                          onClick={() => setNftOffersTab('created')}
                        >
                          Created
                        </button>
                      )}
                      {hasOwnedNftOffers && (
                        <button
                          type="button"
                          className={`nft-tab-btn ${nftOffersTab === 'owned' ? 'active' : ''}`}
                          onClick={() => setNftOffersTab('owned')}
                        >
                          For owned
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="asset-item nft-offers-item">
                    <div className="asset-details nft-offers-details nft-details-flat-top">
                      {activeNftOffersLoading ? (
                        <div className="asset-fiat">Loading NFT offers...</div>
                      ) : activeNftOffersError ? (
                        <div className="asset-fiat red">{activeNftOffersError}</div>
                      ) : activeNftOffersCount > 0 ? (
                        <div className="nft-offers-list">
                          {activeNftOffers.map((offer, index) => {
                            const nftId =
                              offer?.nftoken?.nftokenID ||
                              offer?.nftoken?.NFTokenID ||
                              offer?.nftokenID ||
                              offer?.NFTokenID
                            const offerType = offer?.flags?.sellToken ? 'Sell' : 'Buy'
                            const offerAmount = offer?.amount
                              ? amountFormat(offer.amount, { short: true, maxFractionDigits: 2 })
                              : '-'
                            const offerPlaced = offer?.createdAt ? timeFromNow(offer.createdAt, i18n) : '-'
                            const offerNftName =
                              nftName(offer?.nftoken || offer, { maxLength: 24 }) || (nftId ? nftId : 'NFT')

                            return (
                              <div className="nft-offer-card" key={`${offer?.offerIndex || 'offer'}-${index}`}>
                                <div className="nft-offer-thumb">
                                  {nftId ? (
                                    <Link href={`/nft/${nftId}`} className="nft-offer-nft-link">
                                      <NftImage
                                        nft={offer?.nftoken || offer}
                                        style={{ width: 36, height: 36, borderRadius: '6px', margin: 0 }}
                                      />
                                    </Link>
                                  ) : (
                                    <div className="nft-offer-thumb-fallback">NFT</div>
                                  )}
                                </div>

                                <div className="nft-offer-main">
                                  <span className="nft-offer-name">{offerNftName}</span>
                                  <span className="nft-offer-meta">
                                    {offerType} · {offerAmount}
                                  </span>
                                </div>

                                <div className="nft-offer-side">
                                  <span className="nft-offer-time">{offerPlaced}</span>
                                  {offer?.offerIndex && (
                                    <Link href={`/nft-offer/${offer.offerIndex}`} className="nft-offer-link">
                                      Offer
                                    </Link>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="asset-fiat">{activeNftOffersTitle}</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {(hasIncomingPaychannels || hasOutgoingPaychannels) && (
                <>
                  <div className="section-header-row object-section-header-row">
                    <div className="section-title object-section-title">
                      {paychannelsSectionTitle}{' '}
                      <span className="object-title-count">{activePaychannelsList.length}</span>
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

                  <div className="asset-item object-list-item">
                    <div className="asset-details object-list-details object-details-flat-top">
                      <div className="object-list cards-list">
                        {activePaychannelsList.map((channel, index) => {
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
                          const amountFiatNode = nativeCurrencyToFiat({
                            amount: channel?.Amount,
                            selectedCurrency,
                            fiatRate: pageFiatRate,
                            asText: true
                          })
                          const balanceFiatNode = nativeCurrencyToFiat({
                            amount: channel?.Balance,
                            selectedCurrency,
                            fiatRate: pageFiatRate,
                            asText: true
                          })

                          return (
                            <div
                              className="nft-offer-card object-row-card paychannel-row-card"
                              key={`${channel?.index || 'paychannel'}-${index}`}
                            >
                              <div className="paychannel-head">
                                <span className="paychannel-head-label">
                                  {activePaychannelsTab === 'outgoing' ? 'To' : 'From'}:
                                </span>
                                <span className="paychannel-head-value">
                                  {counterpartAddress ? (
                                    <AddressWithIconInline
                                      data={counterpartData}
                                      name={counterpartName}
                                      options={{ short: false }}
                                    />
                                  ) : (
                                    '-'
                                  )}
                                </span>
                              </div>

                              <div className="paychannel-values">
                                <div className="paychannel-value-row">
                                  <span className="paychannel-value-label">Amount</span>
                                  <span className="paychannel-value-grid">
                                    <span className="paychannel-native-value">{amountText}</span>
                                    <span className="paychannel-fiat-value">{amountFiatNode || '—'}</span>
                                  </span>
                                </div>

                                <div className="paychannel-value-row">
                                  <span className="paychannel-value-label">Balance</span>
                                  <span className="paychannel-value-grid">
                                    <span className="paychannel-native-value">{balanceText}</span>
                                    <span className="paychannel-fiat-value">{balanceFiatNode || '—'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
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
          gap: 8px;
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

        .tx-broker-inline {
          display: block;
          line-height: 1.2;
          margin-bottom: 2px;
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

        .tx-mobile-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 0 4px;
        }

        .tx-mobile-load-btn {
          border: 1px solid var(--accent-link);
          border-radius: 999px;
          background: transparent;
          color: var(--accent-link);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          cursor: pointer;
        }

        .tx-mobile-load-btn :global(.waiting.inline) {
          margin-left: 8px;
        }

        .tx-mobile-load-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .section-link {
          font-size: 13px;
          color: var(--accent-link);
          text-decoration: none;
          white-space: nowrap;
        }

        .section-link:hover {
          text-decoration: underline;
        }

        .tx-asset-item {
          padding: 8px 12px;
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

        .tx-asset-logo {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tx-collapsed-top {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .tx-type-main {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          font-size: 12px;
          min-width: 0;
          flex-wrap: wrap;
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
          white-space: nowrap;
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
          line-height: 1.15;
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
          line-height: 1.15;
          white-space: nowrap;
        }

        .tx-inline-status {
          font-size: 14px;
          font-weight: 700;
          text-transform: lowercase;
          white-space: nowrap;
        }

        .tx-offer-free {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .tx-inline-more {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .tx-detail-address {
          max-width: none !important;
          text-align: left !important;
          word-break: normal !important;
        }

        .tx-detail-change-row {
          align-items: flex-start;
        }

        .tx-fail-description-row {
          align-items: flex-start;
        }

        .tx-fail-description-text {
          max-width: 72% !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          text-align: right;
        }

        .tx-detail-change-list {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          max-width: 70% !important;
          text-align: right;
        }

        .tx-detail-change-list :global(.no-inherit) {
          white-space: nowrap;
        }

        .tx-detail-change-list :global(.no-inherit a) {
          white-space: nowrap;
        }

        .tx-detail-offer-amount {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          text-align: right;
        }

        .tx-change-row {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
        }

        .tx-change-fiat {
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          line-height: 1.2;
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

        .account-control-collapsed {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
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

        .cards-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
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

        .tx-settings-card {
          margin-top: 4px;
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

        .nft-summary-item {
          cursor: default;
          padding: 10px 8px 12px;
        }

        .nft-summary-item:hover {
          transform: none;
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
          width: auto;
          text-align: left;
          font-variant-numeric: tabular-nums;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .owned-nft-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
        }

        .owned-nft-card {
          background: var(--background-table);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 6px;
          height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          color: var(--text);
          text-align: center;
          min-width: 0;
        }

        .owned-nft-card:hover {
          border-color: var(--accent-link);
        }

        .owned-nft-image-link {
          display: block;
          text-decoration: none;
          line-height: 0;
        }

        .owned-nft-image-link :global(img) {
          display: block;
          margin: 0 auto 6px !important;
        }

        .owned-nft-name {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }

        .owned-nft-name-two-lines {
          white-space: normal;
          line-height: 1.2;
          min-height: 2.4em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .owned-nft-name-one-line {
          white-space: nowrap;
          line-height: 1.2;
          min-height: 1.2em;
        }

        .sold-nft-price {
          display: block;
          margin-top: 2px;
          font-size: 10px;
          color: var(--text);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-decoration: none;
          text-align: center;
        }

        .sold-nft-fiat {
          display: block;
          margin-top: 1px;
          font-size: 10px;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }

        .nft-caption {
          height: 54px;
          min-height: 54px;
          overflow: hidden;
        }

        .nft-offers-details,
        .object-list-details {
          margin-top: 0;
          padding-top: 0;
          padding-left: 0;
          padding-right: 0;
          border-top: 0;
        }

        .nft-offers-item,
        .object-list-item {
          cursor: default;
          padding: 0;
        }

        .nft-offers-item:hover,
        .object-list-item:hover {
          transform: none;
        }

        .checks-wrapper {
          background: var(--background-input);
          border-radius: 6px;
        }

        .checks-details,
        .escrow-details {
          margin-top: 0;
          padding-top: 0;
        }

        .checks-list,
        .escrow-list,
        .nft-offers-list,
        .object-list {
          display: flex;
          flex-direction: column;
        }

        .escrow-wrapper {
          background: transparent;
          border-radius: 0;
          margin-top: 6px;
        }

        .nft-offer-card {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--background-table);
        }

        .object-row-card {
          cursor: pointer;
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .check-row-card {
          padding: 8px 12px;
        }

        .check-row-card.expanded {
          border-color: var(--accent-link);
        }

        .object-row-card.expanded {
          border-color: var(--accent-link);
        }

        .object-row-card .nft-offer-name,
        .object-row-card .nft-offer-meta {
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          line-height: 1.25;
        }

        .object-row-card .nft-offer-meta {
          color: var(--text);
          font-weight: 600;
        }

        .object-row-card .nft-offer-side {
          min-width: max-content;
        }

        .paychannel-row-card {
          cursor: default;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px;
          padding: 10px 12px;
        }

        .paychannel-head {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          flex-wrap: wrap;
        }

        .paychannel-head-label {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .paychannel-head-value {
          min-width: 0;
          color: var(--text);
          font-size: 13px;
          line-height: 1.25;
        }

        .paychannel-values {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .paychannel-value-row {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 10px;
        }

        .paychannel-value-label {
          color: var(--text-secondary);
          font-size: 12px;
          white-space: nowrap;
        }

        .paychannel-value-grid {
          display: grid;
          grid-template-columns: minmax(9ch, auto) minmax(13ch, auto);
          justify-content: end;
          align-items: center;
          column-gap: 12px;
          min-width: 0;
          font-variant-numeric: tabular-nums;
        }

        .paychannel-native-value {
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          text-align: right;
          line-height: 1.25;
          word-break: break-word;
        }

        .paychannel-fiat-value {
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 12px;
          text-align: right;
          white-space: nowrap;
        }

        .check-collapsed-main {
          align-items: center;
          min-height: 0;
        }

        .check-row-card .asset-logo {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
        }

        .check-row-card .asset-amount,
        .escrow-collapsed-amount .asset-amount {
          font-size: 14px;
          line-height: 1.15;
        }

        .check-row-card .asset-value {
          text-align: right;
        }

        .escrow-card .asset-main {
          align-items: flex-start;
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
          padding-right: 118px;
        }

        .escrow-collapsed-top {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding-right: 0;
        }

        .escrow-type-main {
          font-size: 13px;
          font-weight: 600;
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
          font-size: 11px;
          line-height: 1;
          white-space: nowrap;
        }

        .escrow-collapsed-amount {
          text-align: right;
        }

        .nft-offer-thumb {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 6px;
        }

        .nft-offer-thumb-fallback {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--background-input);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.4px;
        }

        .nft-offer-main {
          min-width: 0;
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
        }

        .nft-offer-name {
          font-size: 12px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nft-offer-meta {
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nft-offer-side {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          min-width: 72px;
        }

        .check-actions {
          margin-top: 4px;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .check-action-btn {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--background-input);
          color: var(--text);
          font-size: 12px;
          padding: 5px 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }

        .check-action-btn.redeem {
          color: var(--green);
          border-color: color-mix(in srgb, var(--green) 40%, var(--border-color));
        }

        .check-action-btn.cancel {
          color: var(--red);
          border-color: color-mix(in srgb, var(--red) 40%, var(--border-color));
        }

        .check-action-btn.disabled,
        .check-action-btn:disabled {
          color: var(--text-secondary);
          border-color: var(--border-color);
          opacity: 0.6;
          cursor: not-allowed;
        }

        .nft-offer-time {
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .nft-offer-link {
          font-size: 12px;
          color: var(--accent-link);
          text-decoration: none;
          line-height: 1.1;
        }

        .nft-offer-link:hover {
          text-decoration: underline;
        }

        .nft-offer-nft-link {
          display: inline-flex;
          line-height: 0;
        }

        .nft-offer-nft-link :global(img) {
          display: block;
        }

        @media (max-width: 560px) {
          .nft-details {
            min-height: 376px;
          }

          .nft-summary-item {
            padding-left: 6px;
            padding-right: 6px;
          }

          .owned-nft-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0;
          }

          .nft-offer-card {
            grid-template-columns: 32px minmax(0, 1fr);
          }

          .nft-offer-thumb,
          .nft-offer-thumb-fallback {
            width: 32px;
            height: 32px;
          }

          .nft-offer-side {
            grid-column: 1 / -1;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            min-width: 0;
          }

          .object-row-card {
            grid-template-columns: minmax(0, 1fr);
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

        .ellipsis-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          overflow-wrap: normal;
          word-break: normal;
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
