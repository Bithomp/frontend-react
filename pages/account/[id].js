import { useTranslation } from 'next-i18next'
import { useState, useEffect, useMemo, useRef } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { TbBinaryTree } from 'react-icons/tb'
import LinkIcon from '../../public/images/link.svg'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { axiosServer, getFiatRateServer, passHeaders } from '../../utils/axios'
import {
  avatarSrc,
  encode,
  decode,
  devNet,
  errorT,
  getCoinsUrl,
  isUrlValid,
  nativeCurrency,
  network,
  networks,
  retinaImageSize,
  isValidPayString,
  isValidXAddress,
  isTagValid,
  isDomainValid,
  stripDomain,
  timestampExpired,
  tokenImageSrc,
  webSiteName,
  xahauNetwork
} from '../../utils'
import { TESTNET_RLUSD_CURRENCY, TESTNET_RLUSD_ISSUER } from '../../utils/faucet'
import { getIsSsrMobile, useIsMobile } from '../../utils/mobile'
import { shouldIndexAccount } from '../../utils/seo'
import { xAddressToClassicAddress } from 'ripple-address-codec'

const TOKEN_PREVIEW_LIMIT = 5
const NFT_INITIAL_LIMIT = 5
const NFT_LOAD_MORE_STEP = 10
const NFT_FETCH_LIMIT = 45
const NFT_BIDS_FETCH_LIMIT = 100
const NFT_SEARCH_MIN_LENGTH = 3
const NFT_SEARCH_LOCATIONS = 'metadata.name,metadata.description,metadata.collection'
const NFT_OFFERS_PREVIEW_LIMIT = 5
const NFT_OFFERS_FETCH_LIMIT = 50
const ACTIVATED_ACCOUNTS_FETCH_LIMIT = 20
const SIGNER_ACCOUNTS_FETCH_LIMIT = 10
const NFT_MINTER_ACCOUNTS_FETCH_LIMIT = 200
const NFT_MINTER_ACCOUNTS_DISPLAY_LIMIT = 10
const ACCOUNT_OBJECTS_FETCH_LIMIT = 1000
const ACCOUNT_OBJECTS_MAX_PAGES = 5
const AMM_ACCOUNT_OBJECTS_FETCH_LIMIT = 2
const AMM_ACCOUNT_OBJECTS_MAX_PAGES = 1
const OBJECT_PREVIEW_LIMIT = 5
const OBJECT_LOAD_MORE_STEP = 5
const DEX_ORDERS_LOAD_MORE_STEP = 10
const DOMAIN_FAVICON_SIZE = 16
const DOMAIN_FAVICON_CDN_SIZE = DOMAIN_FAVICON_SIZE * 2

const nftTokenIdFromData = (item) => item?.nftokenID || item?.uritokenID || null

const uniqueNftsById = (nfts) => {
  const seen = new Set()

  return nfts.filter((nft) => {
    const nftId = nftTokenIdFromData(nft)
    if (!nftId || seen.has(nftId)) return false
    seen.add(nftId)
    return true
  })
}

const enrichNftsWithLoadedDetails = (nfts, loadedNfts) => {
  if (!Array.isArray(nfts) || !Array.isArray(loadedNfts) || loadedNfts.length === 0) return nfts

  const loadedById = new Map(loadedNfts.map((nft) => [nftTokenIdFromData(nft), nft]).filter(([nftId]) => !!nftId))

  return nfts.map((nft) => {
    const loadedNft = loadedById.get(nftTokenIdFromData(nft))
    if (!loadedNft) return nft

    const buyOffers = Array.isArray(nft?.buyOffers) && nft.buyOffers.length > 0 ? nft.buyOffers : loadedNft.buyOffers
    const sellOffers =
      Array.isArray(nft?.sellOffers) && nft.sellOffers.length > 0 ? nft.sellOffers : loadedNft.sellOffers

    return {
      ...loadedNft,
      ...nft,
      ...(buyOffers ? { buyOffers } : {}),
      ...(sellOffers ? { sellOffers } : {})
    }
  })
}

const hasValidBuyOffer = (nft) => Array.isArray(nft?.buyOffers) && nft.buyOffers.some((offer) => offer?.valid !== false)

const tokenForAmount = (amount, tokenList) => {
  if (!amount?.currency || !amount?.issuer || !Array.isArray(tokenList)) return null

  return (
    tokenList.find(
      (token) =>
        (token?.LowLimit?.currency === amount.currency && token?.LowLimit?.issuer === amount.issuer) ||
        (token?.HighLimit?.currency === amount.currency && token?.HighLimit?.issuer === amount.issuer)
    ) || null
  )
}

const nftOfferNativeValue = (offer, { tokenList } = {}) => {
  if (!offer?.amount) return null

  if (typeof offer.amount !== 'object') {
    const drops = Number(offer.amount)
    return Number.isFinite(drops) ? Math.abs(drops / 1000000) : null
  }

  const token = tokenForAmount(offer.amount, tokenList)
  const tokenAmount = Number(offer.amount.value)
  const tokenPriceNative = Number(token?.priceNativeCurrencySpot)
  if (!Number.isFinite(tokenAmount) || !Number.isFinite(tokenPriceNative)) return null

  return Math.abs(tokenAmount * tokenPriceNative)
}

const nftOfferFiatValue = (offer, { fiatRate, tokenList } = {}) => {
  const nativeValue = nftOfferNativeValue(offer, { tokenList })
  const effectiveFiatRate = Number(fiatRate)
  if (nativeValue === null || !Number.isFinite(effectiveFiatRate) || effectiveFiatRate <= 0) return null

  return nativeValue * effectiveFiatRate
}

const nftOfferFiatText = (offer, { fiatRate, selectedCurrency, tokenList } = {}) => {
  const fiatValue = nftOfferFiatValue(offer, { fiatRate, tokenList })
  if (fiatValue === null || !selectedCurrency) return null

  return shortNiceNumber(fiatValue, 2, 1, selectedCurrency)
}

const isZeroAmountValue = (amount) => {
  const value = typeof amount === 'object' && amount !== null ? Number(amount.value) : Number(amount)
  return Number.isFinite(value) && value === 0
}

const checkNativeValue = (check) => {
  if (!check?.SendMax) return 0

  if (typeof check.SendMax !== 'object') {
    const drops = Number(check.SendMax)
    return Number.isFinite(drops) ? drops / 1000000 : 0
  }

  const amount = Number(check.SendMax.value)
  const priceNativeCurrencySpot = Number(check.priceNativeCurrencySpot)
  if (!Number.isFinite(amount) || !Number.isFinite(priceNativeCurrencySpot)) return 0

  return Math.abs(amount * priceNativeCurrencySpot)
}

const bestNftBuyOfferValue = (nft, { tokenList } = {}) => {
  const validBuyOffers = Array.isArray(nft?.buyOffers) ? nft.buyOffers.filter((offer) => offer?.valid !== false) : null
  const bestBid = bestNftOffer(validBuyOffers, null, 'buy')
  return nftOfferNativeValue(bestBid, { tokenList }) || 0
}

const sumNftBuyOfferNativeValues = (nfts, { tokenList } = {}) =>
  nfts.reduce((sum, nft) => sum + bestNftBuyOfferValue(nft, { tokenList }), 0)

const countValuedNfts = (nfts, { tokenList } = {}) =>
  nfts.reduce((count, nft) => count + (bestNftBuyOfferValue(nft, { tokenList }) > 0 ? 1 : 0), 0)

const tomlCheckerHref = (domain) => ({
  pathname: '/services/toml-checker',
  query: { domain }
})

const domainFaviconSrc = (domain) => {
  if (!domain) return ''
  return `https://cdn.${webSiteName}/favicons/${encodeURIComponent(domain)}?size=${DOMAIN_FAVICON_CDN_SIZE}`
}

const DomainFavicon = ({ domain }) => {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      className={`${domainStyles.domainFavicon} entity-icon-outline`}
      src={domainFaviconSrc(domain)}
      alt=""
      width={DOMAIN_FAVICON_SIZE}
      height={DOMAIN_FAVICON_SIZE}
      loading="lazy"
      aria-hidden="true"
      style={loaded ? undefined : { display: 'none' }}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
    />
  )
}

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

const fetchSignerAccountsServer = async ({ address, req }) => {
  const signerResponse = await axiosServer({
    method: 'get',
    url: 'v2/accounts?regularKeyOrSigner=' + address + '&limit=' + SIGNER_ACCOUNTS_FETCH_LIMIT,
    headers: passHeaders(req)
  })

  const payload = signerResponse?.data || {}
  if (payload?.result && payload.result !== 'success') {
    throw new Error(payload?.message || 'Failed to load signer accounts')
  }

  const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
  const rows = accountRows.filter((row) => !!row?.account)
  const total = Number(payload?.summary?.total)

  return {
    rows,
    total: Number.isFinite(total) && total >= 0 ? total : 0
  }
}

const normalizeNftMinterAccountsPayload = ({ payload, address, appendRows = [] }) => {
  const seenAddresses = new Set(appendRows.map((row) => row.account))
  const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
  const rows = accountRows.filter((row) => {
    if (!row?.account || row?.nftokenMinter !== address || seenAddresses.has(row.account)) return false
    seenAddresses.add(row.account)
    return true
  })

  return {
    rows,
    marker: payload?.marker || null
  }
}

const fetchNftMinterAccountsServer = async ({ address, req }) => {
  const response = await axiosServer({
    method: 'get',
    url: `v2/accounts?nftokenMinter=${address}&limit=${NFT_MINTER_ACCOUNTS_FETCH_LIMIT}`,
    headers: passHeaders(req)
  })

  const payload = response?.data || {}
  if (payload?.result && payload.result !== 'success') {
    throw new Error(payload?.message || 'Failed to load NFT minter accounts')
  }

  const { rows, marker } = normalizeNftMinterAccountsPayload({ payload, address })

  return {
    rows,
    count: rows.length,
    marker
  }
}

const fetchActivatedAccountsServer = async ({ address, req, order = 'desc' }) => {
  const headers = passHeaders(req)
  const [accountsResult, summaryResult] = await Promise.allSettled([
    axiosServer({
      method: 'get',
      url: `v2/accounts?parent=${address}&limit=${ACTIVATED_ACCOUNTS_FETCH_LIMIT}&order=${order.toUpperCase()}`,
      headers
    }),
    axiosServer({
      method: 'get',
      url: `v2/accounts/count?parent=${address}`,
      headers
    })
  ])

  if (accountsResult.status === 'rejected') {
    throw accountsResult.reason
  }

  const payload = accountsResult.value?.data || {}
  if (payload?.result && payload.result !== 'success') {
    throw new Error(payload?.message || 'Failed to load activated accounts')
  }

  const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
  const rows = accountRows.filter((child) => !!child?.account)
  const marker = payload?.marker || null

  let count = Number(payload?.summary?.total)
  let spent = rows.reduce(
    (sum, child) => sum + (Number.isFinite(Number(child?.initialBalance)) ? Number(child.initialBalance) : 0),
    0
  )

  if (summaryResult.status === 'fulfilled') {
    const summaryData = summaryResult.value?.data || {}
    const summaryCount = Number(summaryData?.count)

    if (Number.isFinite(summaryCount) && summaryCount >= 0) {
      count = summaryCount
    }
  }

  if (!Number.isFinite(count) || count < 0) {
    count = rows.length
  }

  return {
    rows,
    count,
    spent,
    marker
  }
}

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  let networkInfo = {}
  let initialErrorMessage = null
  let initialSignerAccountsData = null
  let initialNftMinterAccountsData = null
  let initialActivatedAccountsData = null
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
      initialErrorMessage = 'detail.errors.invalid-xaddress-format'
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
        initialErrorMessage = 'detail.errors.could-not-resolve-paystring'
      }
    } else {
      initialErrorMessage = 'detail.errors.invalid-paystring-response'
    }
  }

  if (!accountWithTag && !initialErrorMessage) {
    const fiatRatePromise = getFiatRateServer(req)

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
        const networkPromise = axiosServer({
          method: 'get',
          url: 'v2/server',
          headers: passHeaders(req)
        })
        const signerPromise = initialData?.address
          ? fetchSignerAccountsServer({ address: initialData.address, req })
          : Promise.resolve(null)
        const nftMinterPromise = initialData?.address
          ? fetchNftMinterAccountsServer({ address: initialData.address, req })
          : Promise.resolve(null)
        const activatedAccountsPromise =
          initialData?.address && !isHistoricalLedger
            ? fetchActivatedAccountsServer({ address: initialData.address, req })
            : Promise.resolve(null)

        const [networkData, signerResult, nftMinterResult, activatedAccountsResult] = await Promise.allSettled([
          networkPromise,
          signerPromise,
          nftMinterPromise,
          activatedAccountsPromise
        ])

        if (networkData.status === 'rejected') {
          throw networkData.reason
        }
        networkInfo = networkData?.value?.data

        if (signerResult.status === 'fulfilled') {
          initialSignerAccountsData = signerResult.value
        }

        if (nftMinterResult.status === 'fulfilled') {
          initialNftMinterAccountsData = nftMinterResult.value
        }

        if (activatedAccountsResult.status === 'fulfilled') {
          initialActivatedAccountsData = activatedAccountsResult.value
        }
      }
    } catch (e) {
      initialErrorMessage = e?.message || 'Failed to load account data'
    }

    const balanceListServer = setBalancesFunction(networkInfo, initialData)
    const { fiatRateServer, selectedCurrencyServer } = await fiatRatePromise

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
        isIndexableAccount: !isHistoricalLedger && shouldIndexAccount(initialData),
        initialErrorMessage: initialErrorMessage || null,
        initialSignerAccountsData,
        initialNftMinterAccountsData,
        initialActivatedAccountsData,
        ...(await serverSideTranslations(locale, ['common', 'account', 'amm', 'services', 'transaction-errors']))
      }
    }
  } else {
    return {
      props: {
        id: account || null,
        isHistoricalLedger,
        accountWithTag: accountWithTag || null,
        isSsrMobile: getIsSsrMobile(context),
        isIndexableAccount: false,
        initialErrorMessage: initialErrorMessage || null,
        initialSignerAccountsData,
        initialNftMinterAccountsData,
        initialActivatedAccountsData,
        ...(await serverSideTranslations(locale, ['common', 'account', 'amm', 'services', 'transaction-errors']))
      }
    }
  }
}

import SEO from '../../components/SEO'
import AccountWithTag from '../../components/Account/AccountWithTag'
import InfiniteScrolling from '../../components/Layout/InfiniteScrolling'
import { fetchHistoricalRate } from '../../utils/common'
import CopyButton from '../../components/UI/CopyButton'
import FullHash from '../../components/UI/FullHash'
import { CurrencyWithIcon } from '../../utils/format'
import { NftImage, bestNftOffer, isNftExplicit, nftName, nftUrl, partnerMarketplaces } from '../../utils/nft'
import {
  AddressWithIconFilled,
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
  TokenImage,
  timeFromNow,
  timeOrDate,
  transferRateToPercent,
  userOrServiceName
} from '../../utils/format'
import { LinkToken } from '../../utils/links'
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
import { getTransactionNftPreview } from '../../utils/transaction/nftPreview'
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
import { LuFileCheck2 } from 'react-icons/lu'
import {
  MdClose,
  MdDeleteForever,
  MdMoneyOff,
  MdNorth,
  MdOpenInNew,
  MdQrCode2,
  MdSearch,
  MdSouth,
  MdVerified
} from 'react-icons/md'
import { TbPigMoney } from 'react-icons/tb'
import { useQRCode } from 'next-qrcode'
import domainStyles from '../../styles/pages/domains.module.scss'

const hookNames = {
  '805351CE26FB79DA00647CEFED502F7E15C2ACCCE254F11DEFEDDCE241F8E9CA': 'Claim Rewards'
}

const hookNameText = (hookHash) => {
  if (!hookHash) return '-'
  return hookNames[hookHash] || shortHash(hookHash)
}

const mptId = (node) => node?.MPTokenIssuanceID || node?.mpt_issuance_id || null
const mptTransferFeeText = (node) => {
  const transferFee = Number(node?.TransferFee ?? node?.transferFee)
  return `${Number.isFinite(transferFee) && transferFee > 0 ? transferFee / 1000 : 0}%`
}

const issuedTokenSpotPrice = (token) => Number(token?.priceNativeCurrencySpot || 0)
const issuedTokenValueNative = (token) => Number(token?.supply || 0) * issuedTokenSpotPrice(token)
const offerExpirationValue = (offer) => offer?.Expiration ?? null
const offerSequenceValue = (offer) => offer?.Sequence ?? null
const isCancelableOfferSequence = (sequence) => Number(sequence) > 0
const offerCancelFields = (offer) => {
  const sequence = offerSequenceValue(offer)
  if (isCancelableOfferSequence(sequence)) return { OfferSequence: sequence }

  const offerId = offer?.OfferID || offer?.index
  return xahauNetwork && offerId ? { OfferID: offerId } : null
}
const escrowCancelFields = (escrow) => {
  const sequence = escrow?.escrowSequence
  if (Number(sequence) > 0) return { Owner: escrow?.Account, OfferSequence: sequence }

  const escrowId = escrow?.EscrowID || escrow?.index
  return xahauNetwork && escrowId ? { EscrowID: escrowId } : null
}
const isOfferExpired = (offer) => {
  const expiration = offerExpirationValue(offer)
  return expiration ? timestampExpired(expiration, 'ripple') : false
}

const RESERVE_OBJECT_LABEL_KEYS = {
  RippleState: 'reserve.trustlines',
  NFTokenPage: 'reserve.nft-pages',
  NFTokenOffer: 'reserve.nft-offers',
  URIToken: 'reserve.uri-tokens',
  URITokenOffer: 'reserve.uri-token-offers',
  Offer: 'reserve.offers',
  Check: 'reserve.checks',
  Escrow: 'reserve.escrows',
  PayChannel: 'reserve.payment-channels',
  DepositPreauth: 'reserve.deposit-preauth',
  SignerList: 'reserve.signer-lists',
  Ticket: 'reserve.tickets',
  Hook: 'reserve.hooks',
  HookState: 'reserve.hook-states',
  MPToken: 'reserve.mptokens',
  MPTokenIssuance: 'reserve.mptoken-issuances',
  AMM: 'reserve.amms'
}

const RESERVE_OBJECT_TYPE_ORDER = [
  'RippleState',
  'NFTokenPage',
  'NFTokenOffer',
  'URIToken',
  'URITokenOffer',
  'Offer',
  'Check',
  'Escrow',
  'PayChannel',
  'DepositPreauth',
  'SignerList',
  'Ticket',
  'Hook',
  'HookState',
  'MPToken',
  'MPTokenIssuance',
  'AMM'
]

const reserveObjectCountsFromObjects = (accountObjects) => {
  const counts = {}

  accountObjects.forEach((node) => {
    const type = node?.LedgerEntryType
    if (!type) return

    counts[type] = (counts[type] || 0) + 1
  })

  return counts
}

const searchValue = (value) => (value === undefined || value === null ? '' : String(value))

const tokenSearchText = (token, accountAddress) => {
  const issuer = token?.HighLimit?.issuer === accountAddress ? token?.LowLimit : token?.HighLimit
  const currencyDetails = token?.Balance?.currencyDetails || {}
  const issuerDetails = issuer?.issuerDetails || {}
  const asset = currencyDetails?.asset || {}
  const asset2 = currencyDetails?.asset2 || {}
  const fields = [
    token?.Balance?.currency,
    niceCurrency(token?.Balance?.currency),
    currencyDetails?.currency,
    currencyDetails?.name,
    currencyDetails?.ticker,
    currencyDetails?.asset?.currency,
    currencyDetails?.asset2?.currency,
    niceCurrency(asset?.currency),
    niceCurrency(asset2?.currency),
    asset?.issuer,
    asset2?.issuer,
    token?.LowLimit?.issuer,
    token?.HighLimit?.issuer,
    issuer?.issuer,
    serviceUsernameOrAddressText({ issuer: issuer?.issuer, issuerDetails }, 'issuer', { fullAddress: true }),
    issuerDetails?.username,
    issuerDetails?.domain,
    issuerDetails?.name,
    issuerDetails?.service,
    issuerDetails?.service?.name
  ]

  return fields.map(searchValue).join(' ').toLowerCase()
}

const ammCurrencyDetailsId = (currencyDetails) => currencyDetails?.ammID || null

const isNativeAmmAsset = (asset) => !asset || typeof asset !== 'object' || (!asset.issuer && !asset.mpt_issuance_id)

const ammAssetTxIssue = (asset) => {
  if (asset?.mpt_issuance_id) return { mpt_issuance_id: asset.mpt_issuance_id }
  if (isNativeAmmAsset(asset)) return { currency: nativeCurrency }

  return {
    currency: asset.currency,
    issuer: asset.issuer
  }
}

const nftResourceForTab = () => (xahauNetwork ? 'uritokens' : 'nfts')

const nftSearchUrl = ({ address, tab, search, marker, ledgerTimestamp }) => {
  const nftResource = nftResourceForTab()
  const params = new URLSearchParams({
    order: 'mintedNew',
    includeWithoutMediaData: 'true',
    limit: String(NFT_FETCH_LIMIT),
    search,
    searchLocations: NFT_SEARCH_LOCATIONS
  })

  if (tab === 'owned') {
    params.set('owner', address)
  } else {
    params.set('issuer', address)
    params.set('includeDeleted', 'true')
  }

  if (tab === 'burned') {
    params.set('deletedAt', 'all')
  }

  if (ledgerTimestamp) {
    params.set('ledgerTimestamp', new Date(ledgerTimestamp).toISOString())
  }

  if (marker) {
    params.set('marker', marker)
  }

  return `v2/${nftResource}?${params.toString()}`
}

const nftSalesUrl = ({ address, selectedCurrency, marker, ledgerTimestamp, inception, search }) => {
  const params = new URLSearchParams({
    seller: address,
    list: 'lastSold',
    limit: String(NFT_FETCH_LIMIT)
  })

  if (selectedCurrency) {
    params.set('convertCurrencies', selectedCurrency.toLowerCase())
    params.set('sortCurrency', selectedCurrency.toLowerCase())
  }

  if (ledgerTimestamp && inception) {
    params.set('period', `${new Date(inception * 1000).toISOString()}..${new Date(ledgerTimestamp).toISOString()}`)
  }

  if (search) {
    params.set('search', search)
    params.set('searchLocations', NFT_SEARCH_LOCATIONS)
  }

  if (marker) {
    params.set('marker', marker)
  }

  return `v2/nft-sales?${params.toString()}`
}

export default function Account({
  initialData,
  isIndexableAccount,
  initialErrorMessage,
  initialSignerAccountsData,
  initialNftMinterAccountsData,
  initialActivatedAccountsData,
  selectedCurrency: selectedCurrencyApp,
  selectedCurrencyServer,
  fiatRate: fiatRateApp,
  fiatRateServer,
  networkInfo,
  balanceListServer,
  setSignRequest,
  isHistoricalLedger,
  ledgerTimestampQuery,
  accountWithTag,
  account,
  refreshPage
}) {
  const { t, i18n } = useTranslation()
  const { t: txErrorT } = useTranslation('transaction-errors')
  const ta = (key, values) => t(`detail.${key}`, { ns: 'account', nativeCurrency, ...values })
  const formatCountText = (count) => Number(count || 0).toLocaleString(i18n.language || undefined)
  const router = useRouter()
  const { Canvas } = useQRCode()
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)
  const [showReserveDetails, setShowReserveDetails] = useState(false)
  const [showRecoverableReserveDetails, setShowRecoverableReserveDetails] = useState(false)
  const [showTotalWorthDetails, setShowTotalWorthDetails] = useState(false)
  const [showAddressQr, setShowAddressQr] = useState(false)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [showAirdropsDetails, setShowAirdropsDetails] = useState(false)
  const [showAllTokens, setShowAllTokens] = useState(false)
  const [tokenSearch, setTokenSearch] = useState('')
  const [tokenTab, setTokenTab] = useState('all')
  const [tokenDisplayLimit, setTokenDisplayLimit] = useState(TOKEN_PREVIEW_LIMIT)
  const [ammActionLoadingKey, setAmmActionLoadingKey] = useState(null)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(
    ledgerTimestampQuery ? new Date(ledgerTimestampQuery) : new Date()
  )
  const [tokens, setTokens] = useState([])
  const [issuedTokens, setIssuedTokens] = useState([])
  const [issuedTokensLoading, setIssuedTokensLoading] = useState(false)
  const [issuedTokensError, setIssuedTokensError] = useState(null)
  const [objectsLoading, setObjectsLoading] = useState(false)
  const [objectsError, setObjectsError] = useState(null)
  const [accountObjectsLoaded, setAccountObjectsLoaded] = useState([])
  const [accountObjectsMarker, setAccountObjectsMarker] = useState(null)
  const [accountObjectsLoadingMore, setAccountObjectsLoadingMore] = useState(false)
  const [reserveObjectCounts, setReserveObjectCounts] = useState(null)
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
  const [nftSearch, setNftSearch] = useState('')
  const [nftSearchResults, setNftSearchResults] = useState([])
  const [nftSearchMarker, setNftSearchMarker] = useState(null)
  const [nftSearchLoading, setNftSearchLoading] = useState(false)
  const [nftSearchError, setNftSearchError] = useState('')
  const [nftOffersDisplayLimit, setNftOffersDisplayLimit] = useState(NFT_OFFERS_PREVIEW_LIMIT)
  const [expandedNftCardKey, setExpandedNftCardKey] = useState(null)
  const [expandedNftOfferKey, setExpandedNftOfferKey] = useState(null)
  const [nftTab, setNftTab] = useState('owned')
  const [nftOffersTab, setNftOffersTab] = useState('owned')
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
  const [permissionedDomains, setPermissionedDomains] = useState([])
  const [hookList, setHookList] = useState([])
  const [heldMpts, setHeldMpts] = useState([])
  const [issuedMpts, setIssuedMpts] = useState([])
  const [checksTab, setChecksTab] = useState('received')
  const [escrowsTab, setEscrowsTab] = useState('received')
  const [paychannelsTab, setPaychannelsTab] = useState('incoming')
  const [dexOrdersTab, setDexOrdersTab] = useState('active')
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
  const [showPermissionedDomainsDetails, setShowPermissionedDomainsDetails] = useState(false)
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
  const [activatedAccounts, setActivatedAccounts] = useState(initialActivatedAccountsData?.rows || [])
  const [activatedAccountsCount, setActivatedAccountsCount] = useState(initialActivatedAccountsData?.count || 0)
  const [activatedAccountsSpent, setActivatedAccountsSpent] = useState(initialActivatedAccountsData?.spent || 0)
  const [activatedAccountsLoading, setActivatedAccountsLoading] = useState(false)
  const [activatedAccountsLoadingMore, setActivatedAccountsLoadingMore] = useState(false)
  const [activatedAccountsError, setActivatedAccountsError] = useState(null)
  const [activatedAccountsMarker, setActivatedAccountsMarker] = useState(initialActivatedAccountsData?.marker || null)
  const [showActivatedAccountsFilters, setShowActivatedAccountsFilters] = useState(false)
  const [activatedAccountsOrder, setActivatedAccountsOrder] = useState('desc')
  const [signerAccounts, setSignerAccounts] = useState(initialSignerAccountsData?.rows || [])
  const [signerAccountsTotal, setSignerAccountsTotal] = useState(initialSignerAccountsData?.total || 0)
  const [hasMoreSignerAccounts, setHasMoreSignerAccounts] = useState(
    (initialSignerAccountsData?.rows || []).length < (initialSignerAccountsData?.total || 0)
  )
  const [signerAccountsLoading, setSignerAccountsLoading] = useState(false)
  const [signerAccountsLoadingMore, setSignerAccountsLoadingMore] = useState(false)
  const [signerAccountsError, setSignerAccountsError] = useState(null)
  const [expandedSignerCard, setExpandedSignerCard] = useState(false)
  const [nftMinterAccounts, setNftMinterAccounts] = useState(initialNftMinterAccountsData?.rows || [])
  const [nftMinterAccountsTotal, setNftMinterAccountsTotal] = useState(initialNftMinterAccountsData?.count || 0)
  const [nftMinterAccountsDisplayLimit, setNftMinterAccountsDisplayLimit] = useState(NFT_MINTER_ACCOUNTS_DISPLAY_LIMIT)
  const [nftMinterAccountsMarker, setNftMinterAccountsMarker] = useState(initialNftMinterAccountsData?.marker || null)
  const [nftMinterAccountsLoadingMore, setNftMinterAccountsLoadingMore] = useState(false)
  const [nftMinterAccountsError, setNftMinterAccountsError] = useState(null)
  const [expandedNftMinterCard, setExpandedNftMinterCard] = useState(false)
  const nftOffersRequestTokenRef = useRef(0)
  const transactionsRequestTokenRef = useRef(0)
  const activatedAccountsRequestTokenRef = useRef(0)
  const signerAccountsRequestTokenRef = useRef(0)
  const nftMinterAccountsRequestTokenRef = useRef(0)
  const nftSearchRequestTokenRef = useRef(0)
  const nftOffersTabTouchedRef = useRef(false)
  const activatedAccountsOrderHydratedRef = useRef(false)
  const refreshPageRef = useRef(refreshPage)
  const [tokenFiatRate, setTokenFiatRate] = useState(!ledgerTimestampQuery ? fiatRateServer || fiatRateApp || null : 0)
  const [pageFiatRate, setPageFiatRate] = useState(!ledgerTimestampQuery ? fiatRateServer || fiatRateApp || null : 0)
  const [nftsNativeValue, setNftsNativeValue] = useState(0)
  const [nftsWorthCount, setNftsWorthCount] = useState(0)

  const resetAccountObjectCollections = () => {
    setAccountObjectsLoaded([])
    setAccountObjectsMarker(null)
    setAccountObjectsLoadingMore(false)
    setTokens([])
    setNftsNativeValue(0)
    setNftsWorthCount(0)
    setReserveObjectCounts(null)
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
    !!getCoinsUrl &&
    nativeAvailableDrops === 0 &&
    !data?.blacklist?.blacklisted &&
    (isNotActivatedAccount || isDeletedAccount)
  const shouldShowAddTokenButton =
    !!setSignRequest &&
    !effectiveLedgerTimestamp &&
    !!data?.address &&
    !isBlackholed &&
    !isDeletedAccount &&
    data?.ledgerInfo?.activated !== false &&
    (!account?.address || account.address === data.address)
  const canSendFromAccount = !!setSignRequest && !!account?.address && isOwnAccount && !effectiveLedgerTimestamp
  const disabledSendTooltip = (() => {
    if (canSendFromAccount) return ''
    if (!setSignRequest || !account?.address) return ta('tooltips.login-required')
    if (!isOwnAccount) return ta('tooltips.viewed-account-only')
    if (effectiveLedgerTimestamp) return ta('tooltips.historical-unavailable')
    return ta('tooltips.send-unavailable')
  })()
  const openAmmLiquidityPopup = async ({ token, action, actionKey }) => {
    const currencyDetails = token?.Balance?.currencyDetails
    const ammID = ammCurrencyDetailsId(currencyDetails)
    if (!setSignRequest || !ammID) return

    const transactionType = action === 'ammDeposit' ? 'AMMDeposit' : 'AMMWithdraw'

    setAmmActionLoadingKey(actionKey)

    try {
      const ammResponse = await axios(`v2/amm/${encodeURIComponent(ammID)}?priceNativeCurrencySpot=true`)
      const ammData = ammResponse?.data || null
      const asset1 = ammData?.amount
      const asset2 = ammData?.amount2
      const lpToken = ammData?.lpTokenBalance

      if (!asset1 || !asset2 || !lpToken?.currency || !lpToken?.issuer || !lpToken?.value) return

      setSignRequest({
        action,
        redirect: 'account',
        request: {
          TransactionType: transactionType,
          Asset: ammAssetTxIssue(asset1),
          Asset2: ammAssetTxIssue(asset2)
        },
        data: {
          asset1,
          asset2,
          tradingFee: ammData.tradingFee,
          lpToken: {
            currency: lpToken.currency,
            issuer: lpToken.issuer,
            value: lpToken.value
          }
        }
      })
    } catch {
      return
    } finally {
      setAmmActionLoadingKey(null)
    }
  }
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
    : ta('states.not-set')
  const xahauRewardCollapsedTimeNode = hasXahauRewardsConfigured
    ? isXahauRewardClaimable
      ? ta('states.claimable-now')
      : timeFromNow(xahauRewardClaimableAt, i18n)
    : null
  const hasAccountSettingsRows =
    !!data?.ledgerInfo?.accountIndex ||
    hasNextSequence ||
    !!data?.ledgerInfo?.emailHash ||
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
  const disabledSetDomainTooltip = (() => {
    if (canManageDomain) return ''
    if (!setSignRequest || !account?.address) return ta('tooltips.login-required')
    if (data?.address !== account?.address) return ta('tooltips.viewed-account-only')
    if (effectiveLedgerTimestamp) return ta('tooltips.historical-unavailable')
    return ta('tooltips.set-domain-unavailable')
  })()
  const hasAccountSettingsData = hasAccountSettingsRows
  const accountControlCollapsedLabel = isBlackholed
    ? ta('account-control.blackholed')
    : hasRegularKey && hasMultisig
      ? ta('account-control.regular-key-and-multisig')
      : hasRegularKey
        ? ta('account-control.regular-key-short')
        : hasMultisig
          ? ta('account-control.multisig')
          : data?.ledgerInfo?.flags?.disableMaster
            ? ta('account-control.master-disabled')
            : data?.ledgerInfo?.flags?.passwordSpent
              ? ta('account-control.free-rekey-spent')
              : ta('account-control.standard')
  const issuerSettingsCollapsedLabel = isGlobalFreezeEnabled
    ? ta('issuer-settings.global-freeze')
    : hasCustomTransferFee
      ? ta('issuer-settings.fee', { fee: issuerTransferFeeText })
      : isRipplingEnabled
        ? ta('issuer-settings.rippling')
        : isTrustlineClawbackEnabled
          ? ta('issuer-settings.clawback')
          : isNoFreezeEnabled
            ? ta('issuer-settings.no-freeze')
            : isCanEscrowEnabled
              ? ta('issuer-settings.escrow')
              : ta('issuer-settings.not-configured')
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
  const didCollapsedAgoLabel = didData?.updatedAt ? ta('labels.updated') : ta('labels.created')
  const didCreatedFull = didData?.createdAt ? fullDateAndTime(didData.createdAt) : null
  const didUpdatedFull = didData?.updatedAt ? fullDateAndTime(didData.updatedAt) : null
  const canManageDid = data?.address === account?.address && !effectiveLedgerTimestamp && !!setSignRequest
  const disabledSetDidTooltip = (() => {
    if (canManageDid) return ''
    if (!setSignRequest || !account?.address) return ta('tooltips.login-required')
    if (data?.address !== account?.address) return ta('tooltips.viewed-account-only')
    if (effectiveLedgerTimestamp) return ta('tooltips.historical-unavailable')
    return ta('tooltips.set-did-unavailable')
  })()
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
      { years: 10, image: '10years.png', tooltip: ta('achievements.active-years', { count: 10 }) },
      { years: 5, image: '5years.png', tooltip: ta('achievements.active-years', { count: 5 }) },
      { years: 3, image: '3years.png', tooltip: ta('achievements.active-years', { count: 3 }) },
      { years: 2, image: '2year.png', tooltip: ta('achievements.active-years', { count: 2 }) },
      { years: 1, image: '1year.png', tooltip: ta('achievements.active-years', { count: 1 }) }
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
      tooltip: ta('achievements.bithomp-pro')
    })
  }

  if (data?.xamanMeta?.kycApproved) {
    achievements.push({
      key: 'xaman-kyc',
      image: 'xamankyc.png',
      tooltip: ta('achievements.xaman-kyc')
    })
  }

  if (data?.verifiedDomain) {
    achievements.push({
      key: 'domain-verified',
      image: 'domainverified.png',
      tooltip: ta('achievements.toml-verified-domain')
    })
  }

  const hasXaoDaoNft = ownedNfts.some((nft) => {
    return nft?.issuer === 'rMFNnkPvDmsBVriFh3QRMMRKaVHsSuChdg' && nft?.nftokenTaxon === 1
  })

  if (hasXaoDaoNft) {
    achievements.push({
      key: 'xaodao',
      image: 'xaodao.png',
      tooltip: ta('achievements.xao-dao-holder')
    })
  }

  const hasApex23Nft = ownedNfts.some((nft) => {
    return nft?.issuer === 'rfzBM6mvDKNUgZ8yvKN29Qn4fo9Skh9MeL' && nft?.nftokenTaxon === 2
  })

  if (hasApex23Nft) {
    achievements.push({
      key: 'apex23',
      image: 'apex23.png',
      tooltip: ta('achievements.apex-2023-holder')
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
  const isAmmAccount = !!accountAmmId
  const ammAvatarCurrencyDetails = isAmmAccount
    ? issuedTokens.find((token) => token?.currencyDetails?.asset && token?.currencyDetails?.asset2)?.currencyDetails
    : null
  const accountDisplayName = accountAmmId ? (
    <>
      <span>AMM</span>{' '}
      <Link href={`/amm/${accountAmmId}`} className="inline-link-icon tooltip" aria-label={ta('aria.open-amm-page')}>
        <LinkIcon />
        <span className="tooltiptext no-brake">{ta('tooltips.amm-page')}</span>
      </Link>
    </>
  ) : (
    userOrServiceName({ service: accountDisplayService, username: accountDisplayUsername }) || ta('labels.no-username')
  )
  const hasPositiveNativeAvailableBalance = Number(balanceList?.available?.native || 0) > 0
  const shouldShowUsernameRegisterButton =
    !hasDisplayIdentity &&
    !isAmmAccount &&
    hasPositiveNativeAvailableBalance &&
    !devNet &&
    !isBlackholed &&
    !data?.blacklist?.blacklisted &&
    !isDeletedAccount &&
    !isNotActivatedAccount
  const shouldShowSetAvatarButton = isOwnAccount && !!account?.address && !data?.ledgerInfo?.blackholed && !devNet
  const shouldShowSignInIdentityButton = !account?.address && !data?.service && !data?.ledgerInfo?.blackholed

  const nativeAvailableFiatValue = ((balanceList?.available?.native || 0) / 1000000) * (pageFiatRate || 0)
  const ownerReserveCount = Math.max(0, Number(data?.ledgerInfo?.ownerCount || 0))
  const reserveBaseDrops = Math.max(0, Number(networkInfo?.reserveBase || 0))
  const reserveIncrementDrops = Math.max(0, Number(networkInfo?.reserveIncrement || 0))
  const reserveBreakdownRows = []

  if (reserveBaseDrops > 0) {
    reserveBreakdownRows.push({
      key: 'base',
      label: ta('reserve.base'),
      drops: reserveBaseDrops
    })
  }

  if (reserveObjectCounts && reserveIncrementDrops > 0) {
    const countedReserveObjects = Object.values(reserveObjectCounts).reduce((sum, count) => sum + Number(count || 0), 0)
    const knownReserveObjectRows = Object.entries(reserveObjectCounts)
      .filter(([, count]) => Number(count || 0) > 0)
      .map(([type, count]) => ({
        key: type,
        label: RESERVE_OBJECT_LABEL_KEYS[type] ? ta(RESERVE_OBJECT_LABEL_KEYS[type]) : type,
        count: Number(count || 0),
        order: RESERVE_OBJECT_TYPE_ORDER.indexOf(type)
      }))
      .sort((a, b) => {
        const orderA = a.order === -1 ? RESERVE_OBJECT_TYPE_ORDER.length : a.order
        const orderB = b.order === -1 ? RESERVE_OBJECT_TYPE_ORDER.length : b.order
        if (orderA !== orderB) return orderA - orderB
        return a.label.localeCompare(b.label)
      })

    reserveBreakdownRows.push(
      ...knownReserveObjectRows.map((row) => ({
        key: row.key,
        label: row.label,
        count: row.count,
        drops: row.count * reserveIncrementDrops
      }))
    )

    const unclassifiedReserveObjects = Math.max(0, ownerReserveCount - countedReserveObjects)
    if (unclassifiedReserveObjects > 0) {
      reserveBreakdownRows.push({
        key: 'other',
        label: ta('reserve.other-objects'),
        count: unclassifiedReserveObjects,
        drops: unclassifiedReserveObjects * reserveIncrementDrops
      })
    }
  }

  const recoverableReserveBreakdownRows =
    reserveIncrementDrops > 0
      ? reserveBreakdownRows
          .map((row) =>
            row.key === 'base'
              ? {
                  ...row,
                  label: ta('reserve.base'),
                  drops: Math.max(0, row.drops - reserveIncrementDrops)
                }
              : row
          )
          .filter((row) => row.drops > 0)
      : []

  const isLpTrustlineToken = (token) => token?.Balance?.currency?.substring(0, 2) === '03'
  const lpTokenList = tokens.filter((token) => isLpTrustlineToken(token))
  const standardTokenList = tokens.filter((token) => !isLpTrustlineToken(token))
  const totalTokenCount = tokens.length
  const lpTokensCount = lpTokenList.length
  const issuedTokensCount = standardTokenList.length
  const hasNonNativeTokenAssets = lpTokensCount > 0 || issuedTokensCount > 0
  const isGateway = Number(data?.obligations?.trustlines || 0) > 200 && !isAmmAccount
  const accountObjectsFetchLimit = isAmmAccount ? AMM_ACCOUNT_OBJECTS_FETCH_LIMIT : ACCOUNT_OBJECTS_FETCH_LIMIT
  const accountObjectsMaxPages = isAmmAccount ? AMM_ACCOUNT_OBJECTS_MAX_PAGES : ACCOUNT_OBJECTS_MAX_PAGES
  const ammAvatarAssetImageSize = retinaImageSize(150)
  const ammAvatarAsset = ammAvatarCurrencyDetails?.asset
  const ammAvatarAsset2 = ammAvatarCurrencyDetails?.asset2
  const ammAvatarAssetImage = ammAvatarAsset ? tokenImageSrc(ammAvatarAsset, ammAvatarAssetImageSize) : null
  const ammAvatarAsset2Image = ammAvatarAsset2 ? tokenImageSrc(ammAvatarAsset2, ammAvatarAssetImageSize) : null
  const lpTokensFiatValue = lpTokenList.reduce((sum, token) => {
    const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
    return sum + (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
  }, 0)
  const issuedTokensFiatValue = standardTokenList.reduce((sum, token) => {
    const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
    return sum + (token.priceNativeCurrencySpot * balance || 0) * (tokenFiatRate || 0)
  }, 0)
  const nftsFiatValue = nftsNativeValue * (tokenFiatRate || pageFiatRate || 0)
  const receivedChecksNativeValue = receivedChecks.reduce((sum, check) => sum + checkNativeValue(check), 0)
  const receivedChecksFiatValue = receivedChecksNativeValue * (tokenFiatRate || pageFiatRate || 0)
  const accountReserveWorthDrops =
    reserveIncrementDrops > 0 ? Math.max(0, nativeReservedDrops - reserveIncrementDrops) : 0
  const accountReserveWorthFiatValue = (accountReserveWorthDrops / 1000000) * (pageFiatRate || 0)
  const hasNftWorthLine = !xahauNetwork && nftsNativeValue > 0
  const nftsWorthLabel = nftsWorthCount > 0 ? ta('worth.nfts-count', { count: nftsWorthCount }) : ta('tabs.nfts')
  const hasReceivedChecksWorthLine = receivedChecks.length > 0
  const hasAccountReserveWorthLine = accountReserveWorthDrops > 0
  const hasAdditionalWorthAssets =
    hasNonNativeTokenAssets || hasNftWorthLine || hasReceivedChecksWorthLine || hasAccountReserveWorthLine
  const totalWorthFiatValue =
    nativeAvailableFiatValue +
    accountReserveWorthFiatValue +
    lpTokensFiatValue +
    issuedTokensFiatValue +
    nftsFiatValue +
    receivedChecksFiatValue
  const totalWorthBreakdown = [
    { key: 'native', label: nativeCurrency, value: nativeAvailableFiatValue },
    ...(hasAccountReserveWorthLine
      ? [
          {
            key: 'recoverable-reserve',
            label: ta('worth.account-reserve'),
            value: accountReserveWorthFiatValue
          }
        ]
      : []),
    ...(lpTokensCount > 0
      ? [{ key: 'lp-tokens', label: ta('worth.lp-tokens-count', { count: lpTokensCount }), value: lpTokensFiatValue }]
      : []),
    ...(issuedTokensCount > 0
      ? [{ key: 'tokens', label: ta('worth.tokens-count', { count: issuedTokensCount }), value: issuedTokensFiatValue }]
      : []),
    ...(hasNftWorthLine ? [{ key: 'nfts', label: nftsWorthLabel, value: nftsFiatValue }] : []),
    ...(hasReceivedChecksWorthLine
      ? [
          {
            key: 'received-checks',
            label: ta('worth.received-checks-count', { count: receivedChecks.length }),
            value: receivedChecksFiatValue
          }
        ]
      : [])
  ].sort((a, b) => b.value - a.value)
  const shouldShowTokenTabs = lpTokensCount > 0 && issuedTokensCount > 0
  const activeTokenList = tokenTab === 'lp' ? lpTokenList : tokenTab === 'tokens' ? standardTokenList : tokens
  const tokenSearchQuery = tokenSearch.trim().toLowerCase()
  const filteredTokenList = tokenSearchQuery
    ? activeTokenList.filter((token) => tokenSearchText(token, data?.address).includes(tokenSearchQuery))
    : activeTokenList
  const shouldShowTokenSearch = hasNonNativeTokenAssets && (totalTokenCount > TOKEN_PREVIEW_LIMIT || !!tokenSearchQuery)
  const visibleTokens = showAllTokens
    ? filteredTokenList
    : filteredTokenList.slice(0, Math.max(tokenDisplayLimit, TOKEN_PREVIEW_LIMIT))
  const hiddenTokensCount = Math.max(filteredTokenList.length - visibleTokens.length, 0)
  const tokenTabDisplayNameMap = {
    all: ta('tabs.tokens-lower'),
    tokens: ta('tabs.tokens-lower'),
    lp: ta('tabs.lp-tokens')
  }
  const activeTokenTabLabel = tokenTabDisplayNameMap[tokenTab] || ta('tabs.tokens-lower')
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
  const nftSearchQuery = nftSearch.trim()
  const nftSearchActive = nftSearchQuery.length > 0
  const nftSearchReady = nftSearchQuery.length >= NFT_SEARCH_MIN_LENGTH
  const enrichedNftSearchResults = useMemo(() => {
    if (nftTab !== 'owned') return nftSearchResults

    return enrichNftsWithLoadedDetails(nftSearchResults, ownedNfts)
      .map((nft, index) => ({
        nft,
        index,
        offerValue: bestNftBuyOfferValue(nft, { tokenList: tokens })
      }))
      .sort((a, b) => b.offerValue - a.offerValue || a.index - b.index)
      .map(({ nft }) => nft)
  }, [nftSearchResults, nftTab, ownedNfts, tokens])
  const nftSearchBaseCount =
    nftTab === 'owned'
      ? ownedNftCount
      : nftTab === 'sold'
        ? soldNftsCount
        : nftTab === 'minted'
          ? mintedNftsCount
          : nftTab === 'burned'
            ? burnedNftsCount
            : 0
  const shouldShowNftSearch =
    nftSearchBaseCount > 0 && (nftSearchBaseCount > NFT_INITIAL_LIMIT || !!nftMarkers[nftTab] || !!nftSearchQuery)
  const activeNftList =
    nftTab === 'owned'
      ? nftSearchActive && nftSearchReady
        ? enrichedNftSearchResults
        : nftSearchActive
          ? []
          : ownedNfts
      : nftTab === 'sold'
        ? nftSearchActive && nftSearchReady
          ? enrichedNftSearchResults
          : nftSearchActive
            ? []
            : soldNfts
        : nftTab === 'minted'
          ? nftSearchActive && nftSearchReady
            ? enrichedNftSearchResults
            : nftSearchActive
              ? []
              : mintedNfts
          : nftSearchActive && nftSearchReady
            ? enrichedNftSearchResults
            : nftSearchActive
              ? []
              : burnedNfts
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
  const activeNftBaseCount = activeNftCountMap[nftTab] || 0
  const activeNftCount = nftSearchActive ? activeNftList.length : activeNftBaseCount
  const activeNftPreview = activeNftList.slice(0, activeNftLimit)
  const activeNftMarker = nftSearchActive ? nftSearchMarker : nftMarkers[nftTab] || null
  const activeNftAllShown = activeNftPreview.length >= activeNftList.length
  const activeNftShowMoreAvailable =
    nftSearchActive && !nftSearchReady ? false : !activeNftAllShown || !!activeNftMarker
  const activeNftRemainingCount = !activeNftAllShown
    ? Math.min(NFT_LOAD_MORE_STEP, Math.max(activeNftList.length - activeNftPreview.length, 0))
    : activeNftMarker
      ? NFT_LOAD_MORE_STEP
      : Math.min(NFT_LOAD_MORE_STEP, Math.max(activeNftCount - activeNftPreview.length, 0))
  const showNftFewerButton = nftDisplayLimit > NFT_INITIAL_LIMIT
  const showNftControlsVisible = activeNftShowMoreAvailable || showNftFewerButton
  const nftTabDisplayNameMap = {
    owned: ta('tabs.owned-lower'),
    sold: ta('tabs.sold-lower'),
    minted: ta('tabs.minted-lower'),
    burned: ta('tabs.burned-lower')
  }
  const activeNftTabLabel = nftTabDisplayNameMap[nftTab] || ta('tabs.owned-lower')
  const activeNftTabLoading =
    nftTab === 'sold'
      ? soldNftsLoading
      : nftTab === 'minted'
        ? mintedNftsLoading
        : nftTab === 'burned'
          ? burnedNftsLoading
          : false
  const activeNftLoading = nftSearchActive && nftSearchReady ? nftSearchLoading : activeNftTabLoading
  const activeNftViewAllHref =
    nftTab === 'owned'
      ? `/nfts/${data?.address}?includeWithoutMediaData=true`
      : nftTab === 'sold'
        ? `/nft-sales?seller=${data?.address}&period=${effectiveLedgerTimestamp && data?.inception ? `${new Date(data.inception * 1000).toISOString()}..${new Date(effectiveLedgerTimestamp).toISOString()}` : 'all'}`
        : nftTab === 'minted'
          ? `/nft-explorer?includeWithoutMediaData=true&issuer=${data?.address}&includeBurned=true${effectiveLedgerTimestamp && data?.inception ? `&mintedPeriod=${new Date(data.inception * 1000).toISOString()}..${new Date(effectiveLedgerTimestamp).toISOString()}` : ''}`
          : `/nft-explorer?includeWithoutMediaData=true&issuer=${data?.address}&includeBurned=true&burnedPeriod=${effectiveLedgerTimestamp && data?.inception ? `${new Date(data.inception * 1000).toISOString()}..${new Date(effectiveLedgerTimestamp).toISOString()}` : 'all'}`
  const activeNftEmptyLabel = nftSearchActive
    ? !nftSearchReady
      ? ta('empty.nft-search-too-short')
      : nftSearchError || ta('empty.no-nft-search-results')
    : nftTab === 'owned'
      ? ta('empty.no-owned-nfts')
      : nftTab === 'sold'
        ? ta('empty.no-sold-nfts')
        : nftTab === 'minted'
          ? ta('empty.no-minted-nfts')
          : ta('empty.no-burned-nfts')
  const createdSellNftOffers = createdNftOffers.filter((offer) => offer?.flags?.sellToken)
  const createdBuyNftOffers = createdNftOffers.filter((offer) => !offer?.flags?.sellToken)
  const activeNftOffers =
    nftOffersTab === 'received'
      ? receivedPrivateNftOffers
      : nftOffersTab === 'createdSelling'
        ? createdSellNftOffers
        : nftOffersTab === 'createdBuying'
          ? createdBuyNftOffers
          : ownedNftOffers
  const activeNftOffersLimit = nftOffersDisplayLimit
  const activeNftOffersPreview = activeNftOffers.slice(0, activeNftOffersLimit)
  const activeNftOffersShowMoreAvailable = activeNftOffers.length > activeNftOffersPreview.length
  const activeNftOffersRemainingCount = Math.max(activeNftOffers.length - activeNftOffersPreview.length, 0)
  const showNftOffersFewerButton = nftOffersDisplayLimit > NFT_OFFERS_PREVIEW_LIMIT
  const showNftOffersControlsVisible = activeNftOffersShowMoreAvailable || showNftOffersFewerButton
  const activeNftOffersTabLabel =
    nftOffersTab === 'received'
      ? ta('tabs.private-lower')
      : nftOffersTab === 'createdSelling'
        ? ta('tabs.selling-lower')
        : nftOffersTab === 'createdBuying'
          ? ta('tabs.buying-lower')
          : ta('tabs.owned-lower')
  const activeNftOffersDataKey =
    nftOffersTab === 'createdSelling' || nftOffersTab === 'createdBuying' ? 'created' : nftOffersTab
  const nftOffersTabCountMap = {
    received: receivedPrivateNftOffers.length,
    createdSelling: createdSellNftOffers.length,
    createdBuying: createdBuyNftOffers.length,
    owned: ownedNftOffers.length
  }
  const nftOffersTabExactCountMap = {
    received: receivedPrivateNftOffers.length < NFT_OFFERS_FETCH_LIMIT,
    createdSelling: createdNftOffers.length < NFT_OFFERS_FETCH_LIMIT,
    createdBuying: createdNftOffers.length < NFT_OFFERS_FETCH_LIMIT,
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
    createdSelling: getNftOffersTabCountLabel('createdSelling'),
    createdBuying: getNftOffersTabCountLabel('createdBuying'),
    owned: getNftOffersTabCountLabel('owned')
  }
  const hasReceivedPrivateNftOffers = receivedPrivateNftOffers.length > 0
  const hasCreatedSellNftOffers = createdSellNftOffers.length > 0
  const hasCreatedBuyNftOffers = createdBuyNftOffers.length > 0
  const hasCreatedNftOffers = hasCreatedSellNftOffers || hasCreatedBuyNftOffers
  const hasOwnedNftOffers = ownedNftOffers.length > 0
  const hasAnyNftOffersData =
    !effectiveLedgerTimestamp && (hasReceivedPrivateNftOffers || hasCreatedNftOffers || hasOwnedNftOffers)
  const activeNftOffersCount = activeNftOffers.length
  const activeNftOffersLoading = nftOffersLoading[activeNftOffersDataKey]
  const activeNftOffersError = nftOffersError[activeNftOffersDataKey]
  const activeNftOffersTitle =
    nftOffersTab === 'received'
      ? ta('empty.no-private-nft-offers')
      : nftOffersTab === 'createdSelling'
        ? ta('empty.no-selling-nft-offers')
        : nftOffersTab === 'createdBuying'
          ? ta('empty.no-buying-nft-offers')
          : ta('empty.no-owned-nft-offers')
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
  const checksSectionTitle = showChecksTabs
    ? ta('sections.checks')
    : activeChecksTab === 'sent'
      ? ta('sections.sent-checks')
      : ta('sections.received-checks')

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
    ? ta('sections.escrows')
    : activeEscrowsTab === 'sent'
      ? ta('sections.outgoing-escrows')
      : activeEscrowsTab === 'self'
        ? ta('sections.self-escrows')
        : ta('sections.incoming-escrows')

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
    ? ta('sections.paychannels')
    : activePaychannelsTab === 'outgoing'
      ? ta('sections.outgoing-paychannels')
      : ta('sections.incoming-paychannels')
  const activeDexOrders = dexOrders.filter((offer) => !isOfferExpired(offer))
  const expiredDexOrders = dexOrders.filter(isOfferExpired)
  const hasActiveDexOrders = activeDexOrders.length > 0
  const hasExpiredDexOrders = expiredDexOrders.length > 0
  const showDexOrdersTabs = hasActiveDexOrders && hasExpiredDexOrders
  const activeDexOrdersTab = showDexOrdersTabs ? dexOrdersTab : hasActiveDexOrders ? 'active' : 'expired'
  const activeDexOrdersList = activeDexOrdersTab === 'expired' ? expiredDexOrders : activeDexOrders
  const hasDexOrders = dexOrders.length > 0
  const dexOrdersPreview = activeDexOrdersList.slice(0, dexOrdersDisplayLimit)
  const dexOrdersShowMoreAvailable = activeDexOrdersList.length > dexOrdersPreview.length
  const dexOrdersRemainingCount = Math.max(activeDexOrdersList.length - dexOrdersPreview.length, 0)
  const showDexOrdersFewerButton = dexOrdersDisplayLimit > OBJECT_PREVIEW_LIMIT
  const showDexOrdersControlsVisible = dexOrdersShowMoreAvailable || showDexOrdersFewerButton
  const hasDepositPreauthAccounts = depositPreauthAccounts.length > 0
  const hasHooks = hookList.length > 0
  const hasCronData = !!data?.ledgerInfo?.cron
  const hasHeldMpts = heldMpts.length > 0
  const hasIssuedMpts = issuedMpts.length > 0
  const hasIssuedTokensSection = issuedTokensLoading || !!issuedTokensError || issuedTokens.length > 0
  const issuedAssetsCount = issuedTokens.length + issuedMpts.length
  const onlyIssuedAssetPageUrl =
    !issuedTokensLoading &&
    !issuedTokensError &&
    !objectsLoading &&
    !objectsError &&
    !accountObjectsMarker &&
    issuedAssetsCount === 1
      ? issuedTokens.length === 1 && data?.address && issuedTokens[0]?.currency
        ? `/token/${data.address}/${issuedTokens[0].currency}`
        : mptId(issuedMpts[0])
          ? `/token/${mptId(issuedMpts[0])}`
          : null
      : null
  const hasSignerAccountsSection = !!data?.address && (signerAccountsLoading || signerAccounts.length > 0)
  const nftMinterAccountsPreview = nftMinterAccounts.slice(0, nftMinterAccountsDisplayLimit)
  const hasMoreNftMinterAccountsLoaded = nftMinterAccounts.length > nftMinterAccountsPreview.length
  const hasNftMinterAccountsSection =
    !!data?.address && (nftMinterAccountsLoadingMore || !!nftMinterAccountsError || nftMinterAccounts.length > 0)
  const hasActivatedAccountsSection =
    !effectiveLedgerTimestamp &&
    (activatedAccountsLoading ||
      activatedAccountsLoadingMore ||
      activatedAccountsCount > 0 ||
      activatedAccounts.length > 0)
  const activatedAccountsCountText = shortNiceNumber(activatedAccountsCount, 0, 1)
  const activatedAccountsCountFullText = niceNumber(activatedAccountsCount, null, null, 15)
  const showActivatedAccountsCountTooltip = activatedAccountsCountText !== activatedAccountsCountFullText
  const activatedAccountsSpentText = `${shortNiceNumber(activatedAccountsSpent, 0, 1)} ${nativeCurrency}`
  const activatedAccountsSpentFullText = `${niceNumber(activatedAccountsSpent, null, null, 15)} ${nativeCurrency}`
  const showActivatedAccountsSpentTooltip = activatedAccountsSpentText !== activatedAccountsSpentFullText
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
  const showObjectsLoadStatus =
    !!data?.ledgerInfo?.activated &&
    (objectsLoading || accountObjectsLoadingMore || !!objectsError || !!accountObjectsMarker)

  useEffect(() => {
    if (refreshPageRef.current === refreshPage) return
    refreshPageRef.current = refreshPage
    if (!data?.address) return

    // Re-run SSR data fetch on successful sign flow updates so balances, offers, and tx lists stay in sync.
    router.replace(router.asPath, undefined, { scroll: false })
  }, [refreshPage, data?.address, router])

  const fetchSignerAccountsPage = async ({ requestToken, append = false } = {}) => {
    if (!data?.address) return

    if (append) {
      setSignerAccountsLoadingMore(true)
    } else {
      setSignerAccountsLoading(true)
      setSignerAccounts([])
      setHasMoreSignerAccounts(false)
    }

    setSignerAccountsError(null)

    try {
      const offsetValue = append ? signerAccounts.length : 0
      const offsetQuery = offsetValue > 0 ? `&offset=${offsetValue}` : ''
      const response = await axios.get(
        `v2/accounts?regularKeyOrSigner=${data.address}&limit=${SIGNER_ACCOUNTS_FETCH_LIMIT}${offsetQuery}`
      )

      if (signerAccountsRequestTokenRef.current !== requestToken) return

      const payload = response?.data || {}
      if (payload?.result && payload.result !== 'success') {
        throw new Error(payload?.message || 'Failed to load signer accounts')
      }

      const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
      const seenAddresses = new Set(append ? signerAccounts.map((row) => row.account) : [])
      const nextRows = accountRows.filter((row) => {
        if (!row?.account || seenAddresses.has(row.account)) return false
        seenAddresses.add(row.account)
        return true
      })

      setSignerAccounts((prev) => {
        const mergedRows = append ? [...prev, ...nextRows] : nextRows
        const resolvedTotal = initialSignerAccountsData?.total || signerAccountsTotal || mergedRows.length
        setSignerAccountsTotal(resolvedTotal)
        setHasMoreSignerAccounts(nextRows.length === SIGNER_ACCOUNTS_FETCH_LIMIT && mergedRows.length < resolvedTotal)
        return mergedRows
      })
    } catch (requestError) {
      if (signerAccountsRequestTokenRef.current !== requestToken) return
      if (!append) {
        setSignerAccounts([])
        setSignerAccountsTotal(0)
        setHasMoreSignerAccounts(false)
      }
      setSignerAccountsError(requestError?.message || 'Failed to load signer accounts')
    } finally {
      if (signerAccountsRequestTokenRef.current !== requestToken) return
      if (append) {
        setSignerAccountsLoadingMore(false)
      } else {
        setSignerAccountsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!data?.address) {
      setSignerAccounts([])
      setSignerAccountsTotal(0)
      setHasMoreSignerAccounts(false)
      setSignerAccountsLoading(false)
      setSignerAccountsLoadingMore(false)
      setSignerAccountsError(null)
      setExpandedSignerCard(false)
      return
    }

    const initialRows = initialSignerAccountsData?.rows || []
    const initialTotal = initialSignerAccountsData?.total || 0

    setSignerAccounts(initialRows)
    setSignerAccountsTotal(initialTotal)
    setHasMoreSignerAccounts(initialRows.length < initialTotal)
    setSignerAccountsLoading(false)
    setSignerAccountsLoadingMore(false)
    setSignerAccountsError(null)
    setExpandedSignerCard(false)
  }, [data?.address, initialSignerAccountsData])

  const loadMoreSignerAccounts = () => {
    if (!data?.address || !hasMoreSignerAccounts || signerAccountsLoading || signerAccountsLoadingMore) return

    const requestToken = signerAccountsRequestTokenRef.current
    fetchSignerAccountsPage({ requestToken, append: true })
  }

  useEffect(() => {
    nftMinterAccountsRequestTokenRef.current += 1

    if (!data?.address) {
      setNftMinterAccounts([])
      setNftMinterAccountsTotal(0)
      setNftMinterAccountsDisplayLimit(NFT_MINTER_ACCOUNTS_DISPLAY_LIMIT)
      setNftMinterAccountsMarker(null)
      setNftMinterAccountsLoadingMore(false)
      setNftMinterAccountsError(null)
      setExpandedNftMinterCard(false)
      return
    }

    setNftMinterAccounts(initialNftMinterAccountsData?.rows || [])
    setNftMinterAccountsTotal(initialNftMinterAccountsData?.count || 0)
    setNftMinterAccountsDisplayLimit(NFT_MINTER_ACCOUNTS_DISPLAY_LIMIT)
    setNftMinterAccountsMarker(initialNftMinterAccountsData?.marker || null)
    setNftMinterAccountsLoadingMore(false)
    setNftMinterAccountsError(null)
    setExpandedNftMinterCard(false)
  }, [data?.address, initialNftMinterAccountsData])

  const loadMoreNftMinterAccounts = async () => {
    if (!data?.address || nftMinterAccountsLoadingMore) return

    if (hasMoreNftMinterAccountsLoaded) {
      setNftMinterAccountsDisplayLimit((prev) => prev + NFT_MINTER_ACCOUNTS_DISPLAY_LIMIT)
      return
    }

    if (!nftMinterAccountsMarker) return

    nftMinterAccountsRequestTokenRef.current += 1
    const requestToken = nftMinterAccountsRequestTokenRef.current

    setNftMinterAccountsLoadingMore(true)
    setNftMinterAccountsError(null)

    try {
      const response = await axios.get(
        `v2/accounts?nftokenMinter=${data.address}&limit=${NFT_MINTER_ACCOUNTS_FETCH_LIMIT}&marker=${encodeURIComponent(nftMinterAccountsMarker)}`
      )

      if (nftMinterAccountsRequestTokenRef.current !== requestToken) return

      const payload = response?.data || {}
      if (payload?.result && payload.result !== 'success') {
        throw new Error(payload?.message || 'Failed to load NFT minter accounts')
      }

      const { rows, marker } = normalizeNftMinterAccountsPayload({
        payload,
        address: data.address,
        appendRows: nftMinterAccounts
      })

      setNftMinterAccounts((prev) => {
        const mergedRows = [...prev, ...rows]
        setNftMinterAccountsTotal(mergedRows.length)
        return mergedRows
      })
      setNftMinterAccountsDisplayLimit((prev) => prev + NFT_MINTER_ACCOUNTS_DISPLAY_LIMIT)
      setNftMinterAccountsMarker(marker)
    } catch (requestError) {
      if (nftMinterAccountsRequestTokenRef.current !== requestToken) return
      setNftMinterAccountsError(requestError?.message || 'Failed to load NFT minter accounts')
    } finally {
      if (nftMinterAccountsRequestTokenRef.current !== requestToken) return
      setNftMinterAccountsLoadingMore(false)
    }
  }

  const fetchActivatedAccountsPage = async ({ requestToken, markerValue = null, append = false } = {}) => {
    if (!data?.address || effectiveLedgerTimestamp) return

    if (append) {
      setActivatedAccountsLoadingMore(true)
    } else {
      setActivatedAccountsLoading(true)
      setActivatedAccounts([])
      setActivatedAccountsCount(0)
      setActivatedAccountsSpent(0)
      setActivatedAccountsMarker(null)
    }

    setActivatedAccountsError(null)

    try {
      const markerQuery = markerValue ? `&marker=${encodeURIComponent(markerValue)}` : ''
      const response = await axios.get(
        `v2/accounts?parent=${data.address}&limit=${ACTIVATED_ACCOUNTS_FETCH_LIMIT}&order=${activatedAccountsOrder.toUpperCase()}${markerQuery}`
      )
      if (activatedAccountsRequestTokenRef.current !== requestToken) return

      const payload = response?.data || {}
      if (payload?.result && payload.result !== 'success') {
        throw new Error(payload?.message || 'Failed to load activated accounts')
      }

      const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
      const rows = accountRows.filter((child) => !!child?.account)

      if (append) {
        setActivatedAccounts((prev) => [...prev, ...rows])
      } else {
        setActivatedAccounts(rows)
      }

      setActivatedAccountsMarker(payload?.marker || null)

      if (!append) {
        let summaryCount = Number(payload?.summary?.total)
        let summarySpent = rows.reduce(
          (sum, child) => sum + (Number.isFinite(Number(child?.initialBalance)) ? Number(child.initialBalance) : 0),
          0
        )

        try {
          const summaryResponse = await axios.get(`v2/accounts/count?parent=${data.address}`)
          if (activatedAccountsRequestTokenRef.current !== requestToken) return
          const summaryData = summaryResponse?.data || {}
          const summaryCountValue = Number(summaryData?.count)

          if (Number.isFinite(summaryCountValue) && summaryCountValue >= 0) {
            summaryCount = summaryCountValue
          }
        } catch {
          // Keep first-page summary values when summary endpoint fails.
        }

        if (!Number.isFinite(summaryCount) || summaryCount < 0) {
          summaryCount = rows.length
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

    setActivatedAccounts(initialActivatedAccountsData?.rows || [])
    setActivatedAccountsCount(initialActivatedAccountsData?.count || 0)
    setActivatedAccountsSpent(initialActivatedAccountsData?.spent || 0)
    setActivatedAccountsLoading(false)
    setActivatedAccountsLoadingMore(false)
    setActivatedAccountsError(null)
    setActivatedAccountsMarker(initialActivatedAccountsData?.marker || null)
    setExpandedActivatedKey(null)
  }, [data?.address, effectiveLedgerTimestamp, initialActivatedAccountsData, refreshPage])

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
          `v2/accounts?parent=${data.address}&limit=${ACTIVATED_ACCOUNTS_FETCH_LIMIT}&order=${activatedAccountsOrder.toUpperCase()}&marker=${encodeURIComponent(markerValue)}`
        )
        if (activatedAccountsRequestTokenRef.current !== requestToken) return

        const payload = response?.data || {}

        if (payload?.result && payload.result !== 'success') {
          throw new Error(payload?.message || 'Failed to load activated accounts')
        }

        const accountRows = Array.isArray(payload?.accounts) ? payload.accounts : []
        const rows = accountRows.filter((child) => !!child?.account)

        setActivatedAccounts((prev) => [...prev, ...rows])
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

  const reloadActivatedAccounts = () => {
    if (!data?.address || effectiveLedgerTimestamp || activatedAccountsLoading || activatedAccountsLoadingMore) return

    const requestToken = activatedAccountsRequestTokenRef.current + 1
    activatedAccountsRequestTokenRef.current = requestToken
    setExpandedActivatedKey(null)
    fetchActivatedAccountsPage({ requestToken })
  }

  useEffect(() => {
    if (!activatedAccountsOrderHydratedRef.current) {
      activatedAccountsOrderHydratedRef.current = true
      return
    }

    if (!data?.address || effectiveLedgerTimestamp || !hasActivatedAccountsSection) return

    const requestToken = activatedAccountsRequestTokenRef.current + 1
    activatedAccountsRequestTokenRef.current = requestToken
    setExpandedActivatedKey(null)
    fetchActivatedAccountsPage({ requestToken })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activatedAccountsOrder])

  const loadMoreNfts = async () => {
    if (nftLoadingMore) return

    // Still have loaded items not yet shown — just reveal them
    if (activeNftList.length > nftDisplayLimit) {
      setNftDisplayLimit((prev) => Math.min(activeNftList.length, prev + NFT_LOAD_MORE_STEP))
      return
    }

    // All loaded items are shown — fetch the next batch using marker
    const marker = nftSearchActive ? nftSearchMarker : nftMarkers[nftTab]
    if (!marker || !data?.address) return

    const nftResource = nftResourceForTab()
    let url = ''

    try {
      setNftLoadingMore(true)
      if (nftTab === 'owned') {
        url =
          nftSearchActive && nftSearchReady
            ? nftSearchUrl({
                address: data.address,
                tab: nftTab,
                search: nftSearchQuery,
                marker,
                ledgerTimestamp: effectiveLedgerTimestamp
              })
            : `v2/${nftResource}?owner=${data.address}&order=mintedNew&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}&marker=${encodeURIComponent(marker)}`
      } else if (nftTab === 'sold') {
        url = nftSalesUrl({
          address: data.address,
          selectedCurrency,
          marker,
          ledgerTimestamp: effectiveLedgerTimestamp,
          inception: data?.inception,
          search: nftSearchActive && nftSearchReady ? nftSearchQuery : ''
        })
      } else if (nftTab === 'minted') {
        url =
          nftSearchActive && nftSearchReady
            ? nftSearchUrl({
                address: data.address,
                tab: nftTab,
                search: nftSearchQuery,
                marker,
                ledgerTimestamp: effectiveLedgerTimestamp
              })
            : `v2/${nftResource}?issuer=${data.address}&order=mintedNew&includeDeleted=true&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}&marker=${encodeURIComponent(marker)}`
      } else {
        url =
          nftSearchActive && nftSearchReady
            ? nftSearchUrl({
                address: data.address,
                tab: nftTab,
                search: nftSearchQuery,
                marker,
                ledgerTimestamp: effectiveLedgerTimestamp
              })
            : `v2/${nftResource}?issuer=${data.address}&order=mintedNew&includeDeleted=true&deletedAt=all&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}&marker=${encodeURIComponent(marker)}`
      }

      const response = await axios.get(url)

      let moreItems = []
      let newMarker = response?.data?.marker || null

      if (nftTab === 'sold') {
        const soldPayload = response?.data || {}
        const { soldList, soldTotalCount } = parseSoldNftsPayload(soldPayload)
        moreItems = soldList
        if (nftSearchActive && nftSearchReady) {
          setNftSearchResults((prev) => [...prev, ...moreItems])
        } else {
          setSoldNfts((prev) => [...prev, ...moreItems])
        }
        if (!nftSearchActive && soldTotalCount !== null) {
          setSoldNftsTotalCount(soldTotalCount)
        }
      } else {
        moreItems = Array.isArray(response?.data?.[nftResource]) ? response.data[nftResource] : []
        if (nftTab === 'owned') {
          if (nftSearchActive && nftSearchReady) {
            setNftSearchResults((prev) => uniqueNftsById([...prev, ...moreItems]))
          } else {
            setOwnedNfts((prev) => uniqueNftsById([...prev, ...moreItems]))
          }
        } else if (nftSearchActive && nftSearchReady) {
          setNftSearchResults((prev) => uniqueNftsById([...prev, ...moreItems]))
        } else if (nftTab === 'minted') setMintedNfts((prev) => [...prev, ...moreItems])
        else setBurnedNfts((prev) => [...prev, ...moreItems])
      }

      if (nftSearchActive && nftSearchReady) {
        setNftSearchMarker(newMarker)
      } else {
        setNftMarkers((prev) => ({ ...prev, [nftTab]: newMarker }))
      }
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
    setTokenSearch('')
    setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
    setExpandedToken(null)
    setExpandedTransactionKey(null)
    setShowNftDataDetails(false)
    setNftSearch('')
    setNftSearchResults([])
    setNftSearchMarker(null)
    setNftSearchLoading(false)
    setNftSearchError('')
    setNftTab('owned')
    nftOffersTabTouchedRef.current = false
    setNftOffersTab('owned')
    setTokenTab('all')
    setDexOrdersTab('active')
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
    setExpandedSignerCard(false)
  }, [data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    setShowAllTokens(false)
    setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
    setExpandedToken(null)
  }, [tokenTab])

  useEffect(() => {
    setShowAllTokens(false)
    setTokenDisplayLimit(TOKEN_PREVIEW_LIMIT)
    setExpandedToken(null)
  }, [tokenSearch])

  useEffect(() => {
    const requestToken = nftSearchRequestTokenRef.current + 1
    nftSearchRequestTokenRef.current = requestToken

    setExpandedNftCardKey(null)
    setNftDisplayLimit(NFT_INITIAL_LIMIT)

    if (!nftSearchQuery) {
      setNftSearchResults([])
      setNftSearchMarker(null)
      setNftSearchLoading(false)
      setNftSearchError('')
      return
    }

    if ((nftTab === 'owned' && effectiveLedgerTimestamp) || !data?.address) return

    if (!nftSearchReady) {
      setNftSearchResults([])
      setNftSearchMarker(null)
      setNftSearchLoading(false)
      setNftSearchError('')
      return
    }

    const controller = new AbortController()
    setNftSearchLoading(true)
    const searchTimer = setTimeout(async () => {
      try {
        setNftSearchError('')

        const response = await axios.get(
          nftTab === 'sold'
            ? nftSalesUrl({
                address: data.address,
                selectedCurrency,
                ledgerTimestamp: effectiveLedgerTimestamp,
                inception: data?.inception,
                search: nftSearchQuery
              })
            : nftSearchUrl({
                address: data.address,
                tab: nftTab,
                search: nftSearchQuery,
                ledgerTimestamp: effectiveLedgerTimestamp
              }),
          { signal: controller.signal }
        )

        if (nftSearchRequestTokenRef.current !== requestToken) return

        if (nftTab === 'sold') {
          const { soldList } = parseSoldNftsPayload(response?.data, NFT_FETCH_LIMIT)
          setNftSearchResults(soldList)
        } else {
          const nftResource = nftResourceForTab()
          const nftList = Array.isArray(response?.data?.[nftResource]) ? response.data[nftResource] : []
          setNftSearchResults(uniqueNftsById(nftList))
        }
        setNftSearchMarker(response?.data?.marker || null)
      } catch (error) {
        if (axios.isCancel(error) || error?.message === 'canceled') return
        if (nftSearchRequestTokenRef.current !== requestToken) return
        setNftSearchResults([])
        setNftSearchMarker(null)
        setNftSearchError(ta('empty.no-nft-search-results'))
      } finally {
        if (nftSearchRequestTokenRef.current === requestToken) {
          setNftSearchLoading(false)
        }
      }
    }, 350)

    return () => {
      clearTimeout(searchTimer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address, effectiveLedgerTimestamp, nftTab, nftSearchQuery, nftSearchReady, selectedCurrency])

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
  }, [dexOrdersTab, data?.address, effectiveLedgerTimestamp])

  useEffect(() => {
    if (dexOrdersTab === 'expired' && !hasExpiredDexOrders && hasActiveDexOrders) {
      setDexOrdersTab('active')
    } else if (dexOrdersTab === 'active' && !hasActiveDexOrders && hasExpiredDexOrders) {
      setDexOrdersTab('expired')
    }
  }, [dexOrdersTab, hasActiveDexOrders, hasExpiredDexOrders])

  useEffect(() => {
    setExpandedNftCardKey(null)
  }, [nftTab])

  useEffect(() => {
    setExpandedNftOfferKey(null)
    setNftOffersDisplayLimit(NFT_OFFERS_PREVIEW_LIMIT)
  }, [nftOffersTab])

  useEffect(() => {
    const availableOfferTabs = []
    if (hasOwnedNftOffers) {
      availableOfferTabs.push('owned')
    }
    if (hasReceivedPrivateNftOffers) {
      availableOfferTabs.push('received')
    }
    if (hasCreatedSellNftOffers) {
      availableOfferTabs.push('createdSelling')
    }
    if (hasCreatedBuyNftOffers) {
      availableOfferTabs.push('createdBuying')
    }

    if (availableOfferTabs.length === 0) return

    const preferredOfferTab = availableOfferTabs[0]
    if (
      !availableOfferTabs.includes(nftOffersTab) ||
      (!nftOffersTabTouchedRef.current && nftOffersTab !== preferredOfferTab)
    ) {
      setNftOffersTab(preferredOfferTab)
    }
  }, [nftOffersTab, hasReceivedPrivateNftOffers, hasCreatedSellNftOffers, hasCreatedBuyNftOffers, hasOwnedNftOffers])

  const selectNftOffersTab = (tab) => {
    nftOffersTabTouchedRef.current = true
    setNftOffersTab(tab)
  }

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

  const accountObjectsUrl = ({ marker } = {}) => {
    const markerQuery = marker ? `&marker=${encodeURIComponent(marker)}` : ''

    return (
      `v2/objects/${data.address}?limit=${accountObjectsFetchLimit}&priceNativeCurrencySpot=true&currencyDetails=true` +
      (effectiveLedgerTimestamp
        ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
        : '') +
      markerQuery
    )
  }

  const applyLoadedAccountObjects = (accountObjects) => {
    setReserveObjectCounts(reserveObjectCountsFromObjects(accountObjects))

    let accountObjectWithChecks = accountObjects.filter((node) => node.LedgerEntryType === 'Check') || []
    accountObjectWithChecks = accountObjectWithChecks.sort((a, b) => {
      const valueCompare = checkNativeValue(b) - checkNativeValue(a)
      if (valueCompare !== 0) return valueCompare

      const destinationCompare = (a.Destination || '').localeCompare(b.Destination || '')
      if (destinationCompare !== 0) return destinationCompare

      return (a.index || '').localeCompare(b.index || '')
    })

    setReceivedChecks(accountObjectWithChecks.filter((node) => node.Destination === data.address))
    setSentChecks(accountObjectWithChecks.filter((node) => node.Account === data.address))

    const accountObjectWithPaychannels = accountObjects.filter((node) => node.LedgerEntryType === 'PayChannel') || []
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
    setPermissionedDomains(accountObjects.filter((node) => node.LedgerEntryType === 'PermissionedDomain'))

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
        .sort((a, b) => Number(offerSequenceValue(b) || 0) - Number(offerSequenceValue(a) || 0)) || []
    setDexOrders(accountObjectWithDexOrders)

    const rippleStateList = isGateway
      ? []
      : accountObjects.filter((node) => isRelevantRippleStateForAddress(node, data.address))

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

    const nftIds = accountObjects
      .filter((node) => node.LedgerEntryType === 'NFTokenPage' && Array.isArray(node.NFTokens))
      .flatMap((page) =>
        page.NFTokens.map((nftNode) => nftNode?.NFToken?.NFTokenID || nftNode?.NFTokenID).filter(Boolean)
      )

    setOwnedNftIds(nftIds)

    return { nftIds, sortedTokens }
  }

  const loadMoreAccountObjects = async () => {
    if (!data?.address || !accountObjectsMarker || accountObjectsLoadingMore) return

    setAccountObjectsLoadingMore(true)
    setObjectsError(null)

    try {
      const moreObjects = []
      const seenMarkers = new Set()
      let objectsMarker = accountObjectsMarker
      let nextObjectsMarker = accountObjectsMarker

      for (let page = 0; page < accountObjectsMaxPages && objectsMarker; page++) {
        const response = await axios.get(accountObjectsUrl({ marker: objectsMarker }))
        const pageObjects = Array.isArray(response?.data?.objects) ? response.data.objects : []
        moreObjects.push(...pageObjects)

        const nextMarker = response?.data?.marker || null
        nextObjectsMarker = nextMarker
        if (!nextMarker) break

        if (seenMarkers.has(nextMarker)) {
          throw new Error('Account objects pagination marker repeated')
        }

        seenMarkers.add(nextMarker)
        objectsMarker = nextMarker
      }

      const combinedObjects = [...accountObjectsLoaded, ...moreObjects]
      setAccountObjectsLoaded(combinedObjects)
      setAccountObjectsMarker(isAmmAccount ? null : nextObjectsMarker)
      applyLoadedAccountObjects(combinedObjects)
    } catch (error) {
      setObjectsError(error?.message || 'Failed to load account objects')
    } finally {
      setAccountObjectsLoadingMore(false)
    }
  }

  // Fetch tokens
  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated) {
      setObjectsLoading(false)
      setObjectsError(null)
      resetAccountObjectCollections()
      setNftMarkers({ owned: null, minted: null, burned: null, sold: null })
      setSoldNftsLoading(false)
      setMintedNftsLoading(false)
      setBurnedNftsLoading(false)
      return
    }

    if (isGateway) {
      setObjectsLoading(false)
      setObjectsError(null)
      resetAccountObjectCollections()
      setNftMarkers({ owned: null, minted: null, burned: null, sold: null })
      setSoldNftsLoading(false)
      setMintedNftsLoading(false)
      setBurnedNftsLoading(false)
      return
    }

    let canceled = false

    const fetchTokens = async () => {
      setObjectsLoading(true)
      setObjectsError(null)
      resetAccountObjectCollections()
      setNftMarkers({ owned: null, minted: null, burned: null, sold: null })
      setSoldNftsLoading(false)
      setMintedNftsLoading(false)
      setBurnedNftsLoading(false)

      try {
        const accountObjects = []
        const seenMarkers = new Set()
        let objectsMarker = null
        let nextObjectsMarker = null

        for (let page = 0; page < accountObjectsMaxPages; page++) {
          const response = await axios.get(accountObjectsUrl({ marker: objectsMarker }))
          const pageObjects = Array.isArray(response?.data?.objects) ? response.data.objects : []
          accountObjects.push(...pageObjects)

          const nextMarker = response?.data?.marker || null
          nextObjectsMarker = nextMarker
          if (!nextMarker) {
            nextObjectsMarker = null
            break
          }

          if (seenMarkers.has(nextMarker)) {
            throw new Error('Account objects pagination marker repeated')
          }

          seenMarkers.add(nextMarker)
          objectsMarker = nextMarker
        }

        if (canceled) return
        setAccountObjectsLoaded(accountObjects)
        setAccountObjectsMarker(isAmmAccount ? null : nextObjectsMarker)
        const { nftIds, sortedTokens } = applyLoadedAccountObjects(accountObjects)

        const nftResource = xahauNetwork ? 'uritokens' : 'nfts'

        if (!effectiveLedgerTimestamp && (nftIds.length > 0 || xahauNetwork)) {
          let nftPreviewUrl = ''
          try {
            nftPreviewUrl = `v2/${nftResource}?owner=${data.address}&order=mintedNew&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}`

            let bidNftsList = []
            if (!xahauNetwork) {
              try {
                let bidNftsMarker = null

                do {
                  const markerQuery = bidNftsMarker ? `&marker=${encodeURIComponent(bidNftsMarker)}` : ''
                  const bidNftsResponse = await axios.get(
                    `v2/${nftResource}?owner=${data.address}&list=bids&order=priceHigh&currency=${nativeCurrency.toLowerCase()}&offersValidate=true&includeWithoutMediaData=true&limit=${NFT_BIDS_FETCH_LIMIT}${markerQuery}`
                  )
                  const bidNftsPage = Array.isArray(bidNftsResponse?.data?.[nftResource])
                    ? bidNftsResponse.data[nftResource]
                    : []
                  bidNftsList = [...bidNftsList, ...bidNftsPage]
                  bidNftsMarker = bidNftsResponse?.data?.marker || null
                } while (bidNftsMarker)

                bidNftsList = uniqueNftsById(bidNftsList.filter(hasValidBuyOffer)).sort(
                  (a, b) =>
                    bestNftBuyOfferValue(b, {
                      tokenList: sortedTokens
                    }) -
                    bestNftBuyOfferValue(a, {
                      tokenList: sortedTokens
                    })
                )
                setNftsNativeValue(sumNftBuyOfferNativeValues(bidNftsList, { tokenList: sortedTokens }))
                setNftsWorthCount(countValuedNfts(bidNftsList, { tokenList: sortedTokens }))
              } catch {
                bidNftsList = []
                setNftsNativeValue(0)
                setNftsWorthCount(0)
              }
            } else {
              setNftsNativeValue(0)
              setNftsWorthCount(0)
            }

            const nftResponse = await axios.get(nftPreviewUrl)
            const ownedNftsList = Array.isArray(nftResponse?.data?.[nftResource]) ? nftResponse.data[nftResource] : []
            const combinedOwnedNfts = uniqueNftsById([...bidNftsList, ...ownedNftsList])

            if (!canceled) {
              setOwnedNfts(combinedOwnedNfts)
              setNftMarkers((prev) => ({ ...prev, owned: nftResponse?.data?.marker || null }))
            }
          } catch {
            if (!canceled) setOwnedNfts([])
          }
        } else {
          setOwnedNfts([])
        }

        try {
          setSoldNftsLoading(true)
          const soldNftsUrl = nftSalesUrl({
            address: data.address,
            selectedCurrency,
            ledgerTimestamp: effectiveLedgerTimestamp,
            inception: data?.inception
          })
          const soldResponse = await axios.get(soldNftsUrl)
          const soldPayload = soldResponse?.data || {}
          const { soldList, soldTotalCount } = parseSoldNftsPayload(soldPayload, NFT_FETCH_LIMIT)
          if (!canceled) {
            setSoldNfts(soldList)
            setSoldNftsTotalCount(soldTotalCount)
            setNftMarkers((prev) => ({ ...prev, sold: soldResponse?.data?.marker || null }))
          }
        } catch {
          if (!canceled) {
            setSoldNfts([])
            setSoldNftsTotalCount(null)
          }
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
            if (!canceled) {
              setMintedNfts(mintedNftsList.slice(0, NFT_FETCH_LIMIT))
              setNftMarkers((prev) => ({ ...prev, minted: mintedResponse?.data?.marker || null }))
            }
          } catch {
            if (!canceled) setMintedNfts([])
          } finally {
            if (!canceled) setMintedNftsLoading(false)
          }
        } else {
          setMintedNfts([])
          setMintedNftsLoading(false)
        }

        if (Number(data?.ledgerInfo?.burnedNFTokens || 0) > 0) {
          try {
            setBurnedNftsLoading(true)
            const burnedNftResource = nftResourceForTab()
            const burnedNftsUrl =
              `v2/${burnedNftResource}?issuer=${data.address}&order=mintedNew&includeDeleted=true&deletedAt=all&includeWithoutMediaData=true&limit=${NFT_FETCH_LIMIT}` +
              (effectiveLedgerTimestamp
                ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
                : '')
            const burnedResponse = await axios.get(burnedNftsUrl)
            const burnedNftsList = Array.isArray(burnedResponse?.data?.[burnedNftResource])
              ? burnedResponse.data[burnedNftResource]
              : []
            if (!canceled) {
              setBurnedNfts(burnedNftsList.slice(0, NFT_FETCH_LIMIT))
              setNftMarkers((prev) => ({ ...prev, burned: burnedResponse?.data?.marker || null }))
            }
          } catch {
            if (!canceled) setBurnedNfts([])
          } finally {
            if (!canceled) setBurnedNftsLoading(false)
          }
        } else {
          setBurnedNfts([])
          setBurnedNftsLoading(false)
        }
      } catch (error) {
        if (canceled) return
        setObjectsError(error?.message || 'Failed to load account objects')
        resetAccountObjectCollections()
        setSoldNftsLoading(false)
        setMintedNftsLoading(false)
        setBurnedNftsLoading(false)
      } finally {
        if (!canceled) setObjectsLoading(false)
      }
    }

    fetchTokens()
    return () => {
      canceled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data?.address,
    data?.ledgerInfo?.activated,
    data?.ledgerInfo?.ammID,
    data?.obligations?.trustlines,
    effectiveLedgerTimestamp,
    selectedCurrency,
    refreshPage
  ])

  useEffect(() => {
    if (!data?.address) return

    const fetchIssuedTokens = async () => {
      setIssuedTokens([])
      setIssuedTokensLoading(true)
      setIssuedTokensError(null)

      try {
        const issuedTokensUrl =
          `v2/trustlines/tokens?issuer=${data.address}&limit=100&currencyDetails=true&statistics=true&priceNativeCurrencySpot=true&order=holdersHigh` +
          (effectiveLedgerTimestamp
            ? `&ledgerTimestamp=${encodeURIComponent(new Date(effectiveLedgerTimestamp).toISOString())}`
            : '')

        const response = await axios.get(issuedTokensUrl)
        const fetchedIssuedTokens = Array.isArray(response?.data?.tokens) ? response.data.tokens : []

        const sortedIssuedTokens = fetchedIssuedTokens.sort(
          (a, b) => issuedTokenValueNative(b) - issuedTokenValueNative(a)
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
        {ta('messages.transactions-search-paused')}{' '}
        <span className="bold">{transactionsMarker?.ledger || ta('states.unknown')}</span>.
        <br />
        <br />
        <button
          type="button"
          className="button-outline"
          onClick={continueTransactionsSearch}
          disabled={transactionsLoadingMore || transactionsLoading}
        >
          {ta('actions.continue-searching')}
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
      {ta('states.loading')}
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
      <Link href={`/tx/${lastSubmittedTxHash}`}>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</Link>
    ) : (
      <span>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</span>
    )
  ) : null

  const accountStatusNode = isBlackholed ? (
    <>
      <span className="orange bold">{ta('statuses.blackholed')}</span> {statusTimeAgoNode}
    </>
  ) : data?.ledgerInfo?.activated ? (
    data?.ledgerInfo?.lastSubmittedAt ? (
      <>
        <span className="green">{ta('statuses.active')}</span> {statusTimeAgoNode}
      </>
    ) : (
      <>
        <span>{ta('statuses.activated')}</span> <span>{data?.inception ? timeFromNow(data.inception, i18n) : ''}</span>
      </>
    )
  ) : isDeletedAccount ? (
    <span className="red bold">{ta('statuses.deleted')}</span>
  ) : isNotActivatedAccount ? (
    <span className="orange">{ta('statuses.not-activated')}</span>
  ) : (
    <>
      <span className="orange">{ta('statuses.network-error')}</span> <span>{ta('messages.try-again-later')}</span>
    </>
  )

  const publicDataRows = []
  const pushPublicRow = (label, value, action = null, options = {}) => {
    if (!value) return
    publicDataRows.push({
      label,
      value,
      action,
      fullWidth: !!options.fullWidth,
      key: `${label}-${publicDataRows.length}`
    })
  }

  const xamanThirdPartyProfile = data?.xamanMeta?.thirdPartyProfiles?.[0]
  const isXamanProfile = xamanThirdPartyProfile?.source === 'xumm.app'
  const xamanOwnerAlias = data?.xamanMeta?.xummProfile?.ownerAlias
  const xamanAccountAlias =
    data?.xamanMeta?.xummProfile?.accountAlias || (isXamanProfile ? xamanThirdPartyProfile?.accountAlias : null)

  // Social accounts will be rendered separately without a label

  if (data?.service?.name && data?.username) {
    pushPublicRow(
      ta('labels.username'),
      <span className="blue bold">
        {data.username} <CopyButton text={data.username} />
      </span>
    )
  }

  if (data?.nickname) {
    pushPublicRow(ta('labels.nickname'), <span className="orange bold">{data.nickname}</span>)
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
      label: ta('labels.alias') + ':',
      value: (
        <a href={data.xamanMeta.xummProfile.profileUrl} className="green" target="_blank" rel="noopener nofollow">
          {data.xamanMeta.xummProfile.slug}
        </a>
      )
    })
  }

  if (xamanOwnerAlias) {
    xamanRows.push({ key: 'owner-alias', label: ta('labels.owner') + ':', value: xamanOwnerAlias })
  }

  if (showXamanAccountAlias) {
    xamanRows.push({ key: 'account-alias', label: ta('labels.account') + ':', value: xamanAccountAlias })
  }

  if (data?.xamanMeta?.kycApproved) {
    xamanRows.push({
      key: 'kyc',
      label: ta('labels.kyc') + ':',
      value: <span className="green">{ta('states.verified')}</span>
    })
  }

  if (showPaystring) {
    pushPublicRow(
      ta('labels.paystring'),
      <span className="blue">
        {data.payString} <CopyButton text={data.payString} />
      </span>,
      null,
      { fullWidth: true }
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
          <span className="tooltiptext no-brake">{ta('actions.edit')}</span>
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
          <span className="tooltiptext no-brake">{ta('actions.remove')}</span>
        </span>
      </span>
    ) : null
    const domainTomlAction =
      isValidDomain && data.verifiedDomain ? (
        <Link
          href={tomlCheckerHref(domainText)}
          prefetch={false}
          className="tooltip activated-tree-link toml-checker-link"
          aria-label={ta('aria.view-toml-for-domain', { domain: domainText })}
        >
          <LuFileCheck2 className="toml-checker-icon" aria-hidden="true" focusable="false" />
          <span className="tooltiptext no-brake">{ta('actions.view-toml')}</span>
        </Link>
      ) : null

    pushPublicRow(
      ta('labels.domain'),
      isValidDomain ? (
        <>
          <span className={domainStyles.domainWithFavicon}>
            <DomainFavicon domain={domainText} />
            <a
              href={`https://${domainText}`}
              className={data.verifiedDomain ? 'green bold' : ''}
              target="_blank"
              rel="noopener nofollow"
            >
              {domainText}
            </a>
            {data.verifiedDomain && (
              <span
                className="blue tooltip verified-domain-status-icon"
                role="img"
                aria-label={ta('labels.toml-verified-domain')}
              >
                <MdVerified aria-hidden="true" style={{ position: 'relative', top: 2 }} />
                <span className="tooltiptext small no-brake">{ta('labels.toml-verified-domain')}</span>
              </span>
            )}
          </span>
          {showUnverified && (
            <span className="account-domain-status-inline">
              <span className="grey">({ta('states.unverified')})</span>{' '}
              <Link href="/domains" className="link">
                {ta('actions.verify')}
              </Link>
            </span>
          )}
          {domainActionButtons}
        </>
      ) : (
        <>
          <code className="code-highlight">{data.ledgerInfo.domain}</code>
          {domainActionButtons}
        </>
      ),
      domainTomlAction,
      { fullWidth: true }
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
      ? timeFromNow(data.inception, i18n, null, historicalTimestampForBanner)
      : null
    const activatedWithAmount = data?.initialBalance ? (
      <>
        {fullNiceNumber(data.initialBalance)} {nativeCurrency}
      </>
    ) : null

    pushPublicRow(
      ta('labels.activated'),
      <span className="activated-line">
        <span className="tooltip activated-time no-brake">
          {data?.inceptionTxHash ? (
            <Link href={`/tx/${data.inceptionTxHash}`} onClick={(event) => event.stopPropagation()}>
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
            {ta('phrases.by')}{' '}
            <Link href={`/account/${activatedByAddress}`} onClick={(event) => event.stopPropagation()}>
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
            {ta('phrases.with')} <span className="activated-amount">{activatedWithAmount}</span>
          </>
        )}
      </span>,
      <Link
        href={`/activation-tree/${data.address}`}
        className="tooltip activated-tree-link"
        aria-label={ta('aria.open-family-tree')}
        onClick={(event) => event.stopPropagation()}
      >
        <TbBinaryTree className="activated-tree-icon" aria-hidden="true" focusable="false" />
        <span className="tooltiptext no-brake">{ta('tooltips.family-tree')}</span>
      </Link>,
      { fullWidth: true }
    )
  }

  if (data?.genesis) {
    pushPublicRow(
      ta('labels.genesis-balance'),
      <span className="bold">
        {niceNumber(data.initialBalance)} {nativeCurrency}
      </span>
    )
  }

  const halfPublicDataRowsCount = publicDataRows.filter((row) => !row.fullWidth).length

  if (data?.parent?.address && data?.parent?.address === data?.address) {
    pushPublicRow(
      ta('labels.imported-from-ledger'),
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
        <SEO title={ta('seo.account-error')} noindex />
        <div className="center">
          <br />
          <br />
          <div className="orange bold">
            {initialErrorMessage?.startsWith('detail.')
              ? ta(initialErrorMessage.replace(/^detail\./, ''), { account })
              : errorT(t, initialErrorMessage)}
          </div>
          <br />
          <br />
          <Link href="/" className="button-action">
            {ta('actions.go-home')}
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
        <SEO title={ta('seo.loading-account')} noindex />
        <div className="center">
          <h1>{ta('states.loading')}</h1>
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
        description={ta('seo.account-description', {
          name: `${data.service?.name || data.username || ''} ${data.address}`.trim()
        })}
        image={{ file: avatarSrc(data.address, refreshPage) }}
        canonicalPath={`/account/${data.address}`}
        noindex={!isIndexableAccount}
      />

      <div className="account-container">
        {isHistoricalLedger && (
          <div className="historical-banner">
            <span className="historical-badge">{ta('labels.historical-mode')}</span>
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
                <div
                  className={`avatar-image-mask ${accountDisplayUsername ? 'has-username' : ''} ${
                    isAmmAccount ? 'is-amm' : ''
                  }`}
                >
                  {isAmmAccount ? (
                    <div className="amm-avatar-pair" aria-label={ta('labels.avatar')}>
                      {ammAvatarAssetImage && ammAvatarAsset2Image ? (
                        <>
                          <img
                            src={ammAvatarAssetImage}
                            alt={niceCurrency(ammAvatarAsset?.currency)}
                            className="amm-avatar-asset amm-avatar-asset-primary"
                          />
                          <img
                            src={ammAvatarAsset2Image}
                            alt={niceCurrency(ammAvatarAsset2?.currency)}
                            className="amm-avatar-asset amm-avatar-asset-secondary"
                          />
                        </>
                      ) : (
                        <>
                          <span className="amm-avatar-asset amm-avatar-asset-placeholder"></span>
                          <span className="amm-avatar-asset amm-avatar-asset-placeholder"></span>
                        </>
                      )}
                    </div>
                  ) : (
                    <img
                      src={avatarSrc(data.address, {
                        refreshPage,
                        hashIconZoom: 12
                      })}
                      alt={ta('labels.avatar')}
                      className="account-avatar"
                    />
                  )}
                </div>
                {!isAmmAccount && !data?.blacklist?.blacklisted && achievements.length > 0 && (
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
                  aria-label={ta('aria.toggle-address-qr-code')}
                  title={ta('labels.qr-code')}
                >
                  <span className="tooltip">
                    <MdQrCode2 />
                    <span className="tooltiptext no-brake">{ta('labels.qr-code')}</span>
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

            {onlyIssuedAssetPageUrl && (
              <div className="get-first-native-wrap">
                <a href={onlyIssuedAssetPageUrl} className="get-first-native-btn">
                  <MdOpenInNew style={{ fontSize: 15, marginRight: 6 }} aria-hidden="true" />
                  {ta('actions.token-page')}
                </a>
              </div>
            )}

            {/* Social icons */}
            {socialAccountsNode && <div className="social-icons-wrapper">{socialAccountsNode}</div>}

            {(shouldShowUsernameRegisterButton || shouldShowSetAvatarButton || shouldShowSignInIdentityButton) && (
              <div className="identity-actions-wrap">
                {shouldShowUsernameRegisterButton && (
                  <a href={`/username?address=${data.address}`} className="get-first-native-btn">
                    {ta('actions.grab-username')}
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
                    {ta('actions.set-avatar')}
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
                    <FaWallet style={{ fontSize: 14, marginRight: 6 }} /> {ta('actions.connect')}
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
                        <span>{ta('labels.did-id')}:</span>
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
                          <span>{ta('labels.created')}:</span>
                          <span>
                            {didCreatedFull}
                            {didData?.createdTxHash && (
                              <>
                                {' '}
                                <Link
                                  href={`/tx/${didData.createdTxHash}`}
                                  className="inline-link-icon tooltip"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <LinkIcon />
                                  <span className="tooltiptext no-brake">{ta('tooltips.created-transaction')}</span>
                                </Link>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {!!didUpdatedFull && didData?.updatedAt !== didData?.createdAt && (
                        <div className="detail-row">
                          <span>{ta('labels.updated')}:</span>
                          <span>
                            {didUpdatedFull}
                            {didData?.updatedTxHash && (
                              <>
                                {' '}
                                <Link
                                  href={`/tx/${didData.updatedTxHash}`}
                                  className="inline-link-icon tooltip"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <LinkIcon />
                                  <span className="tooltiptext no-brake">{ta('tooltips.updated-transaction')}</span>
                                </Link>
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {!!didUrl && (
                        <div className="detail-row">
                          <span>{ta('labels.url')}:</span>
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
                          <span>{ta('labels.data')}:</span>
                          <span className="address-text">{didDecodedData}</span>
                        </div>
                      )}

                      {!!didDecodedDocument && (
                        <div className="detail-row">
                          <span>{ta('labels.did-document')}:</span>
                          <span className="address-text">{didDecodedDocument}</span>
                        </div>
                      )}

                      {!!didMetadataNode && (
                        <>
                          <div className="detail-row">
                            <span>{ta('labels.metadata')}:</span>
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
                            {ta('button.update-did')}
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
                            {ta('button.delete-did')}
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
                    <div
                      className={`info-row ${row.fullWidth || (!row.fullWidth && halfPublicDataRowsCount === 1) ? 'info-row-full' : ''}`}
                      key={row.key}
                    >
                      <span className="info-row-head">
                        <span className="label">{row.label}</span>
                        {row.action}
                      </span>
                      <span className="value">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cards-list info-cards-list">
              {hasSignerAccountsSection && (
                <div className="time-machine-card signer-accounts-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${expandedSignerCard ? 'active' : ''}`}
                    onClick={() => setExpandedSignerCard((prev) => !prev)}
                  >
                    {ta('sections.signer')}
                    <span className="account-control-collapsed" suppressHydrationWarning>
                      {signerAccountsError ? (
                        ' ' + ta('states.unavailable')
                      ) : (
                        <>
                          {' '}
                          {ta('counts.for-addresses', {
                            count: signerAccountsTotal,
                            formattedCount: formatCountText(signerAccountsTotal)
                          })}
                        </>
                      )}
                    </span>
                  </button>

                  {expandedSignerCard && (
                    <div className="time-machine-panel">
                      {signerAccountsLoading ? (
                        <div className="detail-row">
                          <span className="tx-inline-load object-load-status-text">
                            <span>{ta('states.loading-signer-addresses')}</span>
                            <span className="waiting inline" aria-hidden="true"></span>
                          </span>
                        </div>
                      ) : signerAccountsError ? (
                        <div className="detail-row">
                          <span className="red">{signerAccountsError}</span>
                        </div>
                      ) : signerAccounts.length === 0 ? (
                        <div className="detail-row">
                          <span>{ta('empty.no-signer-addresses')}</span>
                        </div>
                      ) : (
                        <>
                          <div className="signer-rows-container">
                            {signerAccounts.map((signerAccount, index) => {
                              const hasRegularKeyMatch = signerAccount?.regular_key === data.address
                              const hasSignerMatch = Array.isArray(signerAccount?.signer_list)
                                ? signerAccount.signer_list.includes(data.address)
                                : false
                              const roleLabel = hasRegularKeyMatch
                                ? hasSignerMatch
                                  ? ta('roles.regular-key-and-signer')
                                  : ta('roles.regular-key')
                                : ta('roles.signer')

                              return (
                                <div className="signer-row" key={`${signerAccount.account}-${index}`}>
                                  <span className="signer-row-index">{index + 1}</span>
                                  <div className="signer-row-address">
                                    <AddressWithIconInline data={signerAccount} options={{ short: 6 }} name="account" />
                                  </div>
                                  <span className="signer-row-role">
                                    <span className="grey">({roleLabel})</span>
                                  </span>
                                  <div className="signer-row-action">
                                    <CopyButton text={signerAccount.account} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {(hasMoreSignerAccounts || signerAccountsLoadingMore) && (
                            <div className="center" style={{ marginTop: '12px' }}>
                              <button
                                type="button"
                                className="button-outline"
                                onClick={loadMoreSignerAccounts}
                                disabled={signerAccountsLoadingMore}
                              >
                                {signerAccountsLoadingMore ? (
                                  <>
                                    {ta('states.loading')}
                                    <span className="waiting inline" aria-hidden="true"></span>
                                  </>
                                ) : (
                                  ta('actions.load-more')
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasNftMinterAccountsSection && (
                <div className="time-machine-card signer-accounts-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${expandedNftMinterCard ? 'active' : ''}`}
                    onClick={() => setExpandedNftMinterCard((prev) => !prev)}
                  >
                    {ta('sections.nft-minter')}
                    <span className="account-control-collapsed" suppressHydrationWarning>
                      {nftMinterAccountsError && nftMinterAccounts.length === 0 ? (
                        ' ' + ta('states.unavailable')
                      ) : (
                        <>
                          {' '}
                          {ta('counts.for-addresses', {
                            count: nftMinterAccountsTotal,
                            formattedCount: `${formatCountText(nftMinterAccountsTotal)}${nftMinterAccountsMarker ? '+' : ''}`
                          })}
                        </>
                      )}
                    </span>
                  </button>

                  {expandedNftMinterCard && (
                    <div className="time-machine-panel">
                      {nftMinterAccountsError && nftMinterAccounts.length === 0 ? (
                        <div className="detail-row">
                          <span className="red">{nftMinterAccountsError}</span>
                        </div>
                      ) : nftMinterAccounts.length === 0 ? (
                        <div className="detail-row">
                          <span>{ta('empty.no-nft-minter-addresses')}</span>
                        </div>
                      ) : (
                        <>
                          <div className="signer-rows-container">
                            {nftMinterAccountsPreview.map((minterAccount, index) => (
                              <div className="signer-row" key={`${minterAccount.account}-${index}`}>
                                <span className="signer-row-index">{index + 1}</span>
                                <div className="signer-row-address">
                                  <AddressWithIconInline data={minterAccount} options={{ short: 6 }} name="account" />
                                </div>
                                <span className="signer-row-role">
                                  <span className="grey">({ta('roles.nft-minter')})</span>
                                </span>
                                <div className="signer-row-action">
                                  <CopyButton text={minterAccount.account} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {nftMinterAccountsError && (
                            <div className="detail-row">
                              <span className="red">{nftMinterAccountsError}</span>
                            </div>
                          )}

                          {(hasMoreNftMinterAccountsLoaded ||
                            nftMinterAccountsMarker ||
                            nftMinterAccountsLoadingMore) && (
                            <div className="center" style={{ marginTop: '12px' }}>
                              <button
                                type="button"
                                className="button-outline"
                                onClick={loadMoreNftMinterAccounts}
                                disabled={nftMinterAccountsLoadingMore}
                              >
                                {nftMinterAccountsLoadingMore ? (
                                  <>
                                    {ta('states.loading')}
                                    <span className="waiting inline" aria-hidden="true"></span>
                                  </>
                                ) : (
                                  ta('actions.load-more')
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasAccountControlData && (
                <div className="time-machine-card account-control-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showAccountControlDetails ? 'active' : ''}`}
                    onClick={() => setShowAccountControlDetails((prev) => !prev)}
                  >
                    {ta('sections.account-control')}
                    <span className={`account-control-collapsed${isBlackholed ? ' orange bold' : ''}`}>
                      {' '}
                      · {accountControlCollapsedLabel}
                    </span>
                  </button>

                  {showAccountControlDetails && (
                    <div className="time-machine-panel account-control-panel">
                      {isBlackholed && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.account-status')}:</span>
                          <span className="orange bold">{ta('messages.blackholed-description')}</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.regularKey && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.regular-key')}:</span>
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
                          <span>{ta('labels.free-rekey')}:</span>
                          <span>{ta('states.spent')}</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.signerList && (
                        <>
                          <div className="detail-row issuer-detail-row">
                            <span>{ta('labels.multi-sign')}:</span>
                            <span className="green">{ta('states.enabled')}</span>
                          </div>

                          {data?.ledgerInfo?.signerList?.signerQuorum && (
                            <div className="detail-row issuer-detail-row">
                              <span>{ta('labels.multi-sign-threshold')}:</span>
                              <span>{data.ledgerInfo.signerList.signerQuorum}</span>
                            </div>
                          )}

                          {Array.isArray(data?.ledgerInfo?.signerList?.signerEntries) &&
                            data.ledgerInfo.signerList.signerEntries.map((signer, signerIndex) => (
                              <div key={`signer-group-${signerIndex}`}>
                                <div className="detail-row issuer-detail-row">
                                  <span>
                                    {ta('labels.signer-with-weight', {
                                      index: signerIndex + 1,
                                      weight: signer?.signerWeight || 0
                                    })}
                                    :
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
                          <span>{ta('labels.master-key')}:</span>
                          <span className="red">{ta('states.disabled')}</span>
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
                    {ta('sections.deposit-preauthorized-accounts')}
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
                    {ta('sections.reward')}
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
                        <span>{ta('sections.reward')}:</span>
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
                            <span className="grey">{ta('states.not-set')}</span>
                          )}
                        </span>
                      </div>

                      {hasXahauRewardsConfigured && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.claimable')}:</span>
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
                                {ta('actions.rewards-opt-out')}
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
                                {ta('actions.sign-in-to-opt-out')}
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
                                    <TbPigMoney style={{ fontSize: 16, marginBottom: -3 }} /> {ta('actions.claim-now')}
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
                                    <TbPigMoney style={{ fontSize: 16, marginBottom: -3 }} />{' '}
                                    {ta('actions.sign-in-to-claim')}
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
                                {ta('actions.rewards-opt-in')}
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
                                {ta('actions.sign-in-to-opt-in')}
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
                          <span>{ta('labels.hook-namespaces')}:</span>
                          <span>{data.ledgerInfo.hookNamespaces.length}</span>
                        </div>
                      )}
                      {(data?.ledgerInfo?.hookStateCount || data?.ledgerInfo?.hookStateCount === 0) && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.hook-state-count')}:</span>
                          <span>{data.ledgerInfo.hookStateCount}</span>
                        </div>
                      )}
                      {hookList.map((hookHash, index) => (
                        <div className="detail-row issuer-detail-row" key={`${hookHash}-${index}`}>
                          <span>{ta('labels.hook-index', { index: index + 1 })}:</span>
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
                          <span>{ta('labels.cron-object')}:</span>
                          <span className="copy-inline">
                            <span>{shortHash(data.ledgerInfo.cron)}</span>
                            <Link
                              href={`/object/${data.ledgerInfo.cron}`}
                              className="inline-link-icon tooltip"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <LinkIcon />
                              <span className="tooltiptext no-brake">{ta('tooltips.object-page')}</span>
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
                    {ta('sections.nft-data')}
                  </button>

                  {showNftDataDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {data?.ledgerInfo?.firstNFTokenSequence && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.first-nft-sequence')}:</span>
                          <span>{data.ledgerInfo.firstNFTokenSequence}</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.nftokenMinter && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('sections.nft-minter')}:</span>
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
                          <span>{ta('labels.incoming-nft-offers')}:</span>
                          <span className="red">{ta('states.disallowed')}</span>
                        </div>
                      )}

                      {data?.ledgerInfo?.flags?.uriTokenIssuer && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.nft-issuer')}:</span>
                          <span className="green">{ta('states.enabled')}</span>
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
                    {ta('sections.account-settings')}
                  </button>

                  {showTxSettingsDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {!!data?.ledgerInfo?.accountIndex && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.account-index')}:</span>
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
                          <span>{ta('labels.next-sequence')}:</span>
                          <span className="copy-inline">
                            <span>{data.ledgerInfo.sequence}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.sequence} />
                            </span>
                          </span>
                        </div>
                      )}

                      {data?.ledgerInfo?.emailHash && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.email-hash')}:</span>
                          <span className="copy-inline">
                            <a
                              href={`https://gravatar.com/${data.ledgerInfo.emailHash.toLowerCase()}`}
                              target="_blank"
                              rel="noopener nofollow"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {shortHash(data.ledgerInfo.emailHash)}
                            </a>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.emailHash} />
                            </span>
                          </span>
                        </div>
                      )}

                      {data?.ledgerInfo?.messageKey && (
                        <div className="detail-row issuer-detail-row">
                          <span>
                            {ta('labels.message-key')}:
                            {isMessageKeyUsedForFlare && (
                              <>
                                <br />
                                <b>{ta('labels.used-for-flare')}</b>
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
                          <span>{ta('labels.last-affecting-tx')}:</span>
                          <span className="copy-inline">
                            <Link
                              href={`/tx/${data.ledgerInfo.previousTxnID}`}
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
                          <span>{ta('labels.last-initiated-tx')}:</span>
                          <span className="copy-inline">
                            <Link
                              href={`/tx/${data.ledgerInfo.accountTxnID}`}
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
                          <span>{ta('labels.wallet-locator')}:</span>
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
                          <span>{ta('labels.amm-id')}:</span>
                          <span className="copy-inline">
                            <span>{shortHash(data.ledgerInfo.ammID)}</span>
                            <Link
                              href={`/amm/${data.ledgerInfo.ammID}`}
                              className="inline-link-icon tooltip"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <LinkIcon />
                              <span className="tooltiptext no-brake">{ta('tooltips.amm-page')}</span>
                            </Link>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={data.ledgerInfo.ammID} />
                            </span>
                          </span>
                        </div>
                      )}

                      {(data?.ledgerInfo?.ticketCount || data?.ledgerInfo?.ticketCount === 0) && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.ticket-count')}:</span>
                          <span>{data.ledgerInfo.ticketCount}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.importSequence && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.import-sequence')}:</span>
                          <span>{data.ledgerInfo.importSequence}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.tickSize && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.tick-size')}:</span>
                          <span>{data.ledgerInfo.tickSize}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.requireDestTag && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.destination-tag')}:</span>
                          <span>{ta('states.required')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.depositAuth && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.deposit-authorization')}:</span>
                          <span>{ta('states.required')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.requireAuth && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.token-authorization')}:</span>
                          <span>{ta('states.required')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingCheck && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.incoming-checks')}:</span>
                          <span className="red">{ta('states.disallowed')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingPayChan && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.incoming-payment-channels')}:</span>
                          <span className="red">{ta('states.disallowed')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingTrustline && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.incoming-trustlines')}:</span>
                          <span className="red">{ta('states.disallowed')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingNFTokenOffer && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.incoming-nft-offers')}:</span>
                          <span className="red">{ta('states.disallowed')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowIncomingRemit && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.incoming-remit')}:</span>
                          <span className="red">{ta('states.disallowed')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.tshCollect && (
                        <div className="detail-row issuer-detail-row">
                          <span>TshCollect:</span>
                          <span>{ta('states.enabled')}</span>
                        </div>
                      )}

                      {!!data?.ledgerInfo?.flags?.disallowXRP && (
                        <div className="detail-row issuer-detail-row">
                          <span>{ta('labels.receiving-native', { nativeCurrency })}:</span>
                          <span>{ta('states.disabled')}</span>
                        </div>
                      )}

                      {((!data?.ledgerInfo?.domain && !isDeletedAccount) || (!xahauNetwork && !didData) || true) && (
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={() => router.push('/services/account-settings')}
                            title={ta('sections.account-settings')}
                          >
                            <FaGear />
                            {ta('sections.account-settings')}
                          </button>
                          {!data?.ledgerInfo?.domain && !isDeletedAccount && (
                            <span className={disabledSetDomainTooltip ? 'tooltip' : ''}>
                              <button
                                type="button"
                                className={`card-action-btn ${canManageDomain ? 'redeem' : 'disabled'}`}
                                disabled={!canManageDomain}
                                onClick={() => {
                                  if (!canManageDomain) return
                                  setSignRequest({
                                    action: 'setDomain',
                                    redirect: 'account',
                                    request: {
                                      TransactionType: 'AccountSet',
                                      Account: data?.address
                                    }
                                  })
                                }}
                                title={ta('actions.set-domain')}
                              >
                                <FaPencil /> {ta('actions.set-domain')}
                              </button>
                              {!!disabledSetDomainTooltip && (
                                <span className="tooltiptext left">{disabledSetDomainTooltip}</span>
                              )}
                            </span>
                          )}
                          {!xahauNetwork && !didData && (
                            <span className={disabledSetDidTooltip ? 'tooltip' : ''}>
                              <button
                                type="button"
                                className={`card-action-btn ${canManageDid ? 'redeem' : 'disabled'}`}
                                disabled={!canManageDid}
                                onClick={() => {
                                  if (!canManageDid) return
                                  setSignRequest({
                                    action: 'setDid',
                                    redirect: 'account',
                                    request: {
                                      TransactionType: 'DIDSet',
                                      Account: data?.address
                                    }
                                  })
                                }}
                                title={ta('button.set-did')}
                              >
                                <MdVerified /> {ta('button.set-did')}
                              </button>
                              {!!disabledSetDidTooltip && (
                                <span className="tooltiptext left">{disabledSetDidTooltip}</span>
                              )}
                            </span>
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
                    {ta('sections.airdrops')}
                    <span className="account-control-collapsed"> · Flare</span>
                  </button>

                  {showAirdropsDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      <div className="detail-row issuer-detail-row">
                        <span>{ta('labels.address')}:</span>
                        <span className="copy-inline airdrop-address-wrap">
                          <span className="address-text" title={data.flare.address}>
                            <FullHash value={data.flare.address} />
                          </span>
                          <span onClick={(event) => event.stopPropagation()}>
                            <CopyButton text={data.flare.address} />
                          </span>
                        </span>
                      </div>

                      <div className="detail-row issuer-detail-row">
                        <span>{ta('labels.flare-claim')}:</span>
                        <span className="copy-inline airdrop-claim-wrap">
                          <span>{flareClaimNode}</span>
                          <a
                            href={`https://flarescan.com/address/${data.flare.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="airdrop-link-btn"
                            onClick={(event) => event.stopPropagation()}
                            aria-label={ta('aria.open-flare-address')}
                            title={ta('aria.open-flare-address')}
                          >
                            <LinkIcon />
                          </a>
                        </span>
                      </div>

                      <div className="detail-row issuer-detail-row">
                        <span>{ta('labels.songbird-claim')}:</span>
                        <span className="copy-inline airdrop-claim-wrap">
                          <span>{songbirdClaimNode}</span>
                          <a
                            href={`https://songbird.flarescan.com/address/${data.flare.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="airdrop-link-btn"
                            onClick={(event) => event.stopPropagation()}
                            aria-label={ta('aria.open-songbird-address')}
                            title={ta('aria.open-songbird-address')}
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
                    {ta('sections.historical-data')}
                  </button>

                  {showTimeMachine && (
                    <div className="time-machine-panel">
                      <div className="time-machine-head">
                        <div className="time-machine-title">{ta('labels.select-date-time')}</div>
                      </div>
                      <div className="time-machine-picker-wrap">
                        <DatePicker
                          selected={ledgerTimestampInput || new Date()}
                          onChange={setLedgerTimestampInput}
                          value={localDateTimeText(ledgerTimestampInput || new Date())}
                          selectsStart
                          showTimeInput
                          timeInputLabel={ta('labels.time')}
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
                          {ta('actions.update')}
                        </button>
                        <button
                          type="button"
                          onClick={resetTimeMachine}
                          className="time-machine-btn time-machine-btn-reset"
                        >
                          {ta('actions.reset')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {permissionedDomains.length > 0 && (
                <div className="time-machine-card tx-settings-card">
                  <button
                    type="button"
                    className={`time-machine-toggle ${showPermissionedDomainsDetails ? 'active' : ''}`}
                    onClick={() => setShowPermissionedDomainsDetails((prev) => !prev)}
                  >
                    {ta('sections.permissioned-domains')}
                    <span className="account-control-collapsed"> · {permissionedDomains.length}</span>
                  </button>

                  {showPermissionedDomainsDetails && (
                    <div className="time-machine-panel tx-settings-panel">
                      {permissionedDomains.map((domain, index) => {
                        const domainId = domain?.index || domain?.LedgerIndex

                        return (
                          <div className="detail-row issuer-detail-row" key={domainId || `permissioned-domain-${index}`}>
                            <span>#{index + 1}:</span>
                            <span className="copy-inline">
                              {domainId ? <Link href={`/object/${domainId}`}>{shortHash(domainId)}</Link> : '-'}
                              {domainId && <CopyButton text={domainId} />}
                            </span>
                          </div>
                        )
                      })}
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
                {objectsLoading || accountObjectsLoadingMore ? (
                  <span className="tx-inline-load object-load-status-text">
                    <span>{ta('states.loading-account-objects-assets')}</span>
                    <span className="waiting inline" aria-hidden="true"></span>
                  </span>
                ) : objectsError ? (
                  <span className="object-load-status-text">{ta('errors.failed-load-account-objects-assets')}</span>
                ) : (
                  <>
                    <span className="object-load-status-text">
                      {ta('messages.loaded-account-objects', { count: accountObjectsLoaded.length })}
                    </span>
                    <button type="button" className="asset-compact-toggle" onClick={loadMoreAccountObjects}>
                      {ta('actions.load-more')}
                    </button>
                  </>
                )}
              </div>
            )}

            {hasAdditionalWorthAssets && (
              <div className="asset-item" onClick={() => setShowTotalWorthDetails(!showTotalWorthDetails)}>
                <div className="asset-main">
                  <div className="asset-logo">
                    <span className="asset-summary-title">{ta('labels.total-worth')}</span>
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
                      <div className="worth-breakdown-item" key={`worth-${item.key}`}>
                        <div className="detail-row">
                          <span>{item.label}:</span>
                          <span className="worth-detail-value" suppressHydrationWarning>
                            <span>{shortNiceNumber(item.value, 2, 1, selectedCurrency)}</span>
                            {item.key === 'recoverable-reserve' &&
                              reserveObjectCounts &&
                              recoverableReserveBreakdownRows.length > 0 && (
                                <button
                                  type="button"
                                  className={`reserve-details-toggle ${showRecoverableReserveDetails ? 'active' : ''}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setShowRecoverableReserveDetails((prev) => !prev)
                                  }}
                                >
                                  {ta(showRecoverableReserveDetails ? 'reserve.hide-details' : 'reserve.show-details')}
                                </button>
                              )}
                          </span>
                        </div>
                        {item.key === 'recoverable-reserve' &&
                          showRecoverableReserveDetails &&
                          reserveObjectCounts &&
                          recoverableReserveBreakdownRows.length > 0 && (
                            <div
                              className="reserve-breakdown worth-reserve-breakdown"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="reserve-breakdown-head">
                                <span>{ta('reserve.type')}</span>
                                <span>{ta('reserve.objects')}</span>
                                <span>{ta('labels.amount')}</span>
                              </div>
                              <div className="reserve-breakdown-list">
                                {recoverableReserveBreakdownRows.map((row) => (
                                  <div className="reserve-breakdown-row" key={`worth-reserve-${row.key}`}>
                                    <span className="reserve-breakdown-label">{row.label}</span>
                                    <span className="reserve-breakdown-count">
                                      {typeof row.count === 'number' ? formatCountText(row.count) : ''}
                                    </span>
                                    <span className="reserve-breakdown-value">
                                      <span>{amountFormat(row.drops, { precise: 'nice' })}</span>
                                      <span className="fiat-line" suppressHydrationWarning>
                                        {tokenToFiat({
                                          amount: row.drops,
                                          selectedCurrency,
                                          fiatRate: pageFiatRate,
                                          asText: true
                                        })}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                        <span>{ta('labels.available')}:</span>
                        <span className="amount-with-fiat">
                          <span className="copy-inline">
                            <span>{amountFormat(nativeAvailableDrops, { precise: 'nice' })}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={nativeAvailable} />
                            </span>
                          </span>
                          <span className="fiat-line" suppressHydrationWarning>
                            {tokenToFiat({
                              amount: nativeAvailableDrops,
                              selectedCurrency,
                              fiatRate: pageFiatRate,
                              asText: true
                            })}
                          </span>
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>{ta('labels.total')}:</span>
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
                        <span>{ta('labels.reserved')}:</span>
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
                          {reserveObjectCounts && reserveBreakdownRows.length > 0 && (
                            <button
                              type="button"
                              className={`reserve-details-toggle ${showReserveDetails ? 'active' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                setShowReserveDetails((prev) => !prev)
                              }}
                            >
                              {ta(showReserveDetails ? 'reserve.hide-details' : 'reserve.show-details')}
                            </button>
                          )}
                        </span>
                      </div>
                      {showReserveDetails && reserveObjectCounts && reserveBreakdownRows.length > 0 && (
                        <div className="reserve-breakdown" onClick={(event) => event.stopPropagation()}>
                          <div className="reserve-breakdown-head">
                            <span>{ta('reserve.type')}</span>
                            <span>{ta('reserve.objects')}</span>
                            <span>{ta('labels.reserved')}</span>
                          </div>
                          <div className="reserve-breakdown-list">
                            {reserveBreakdownRows.map((row) => (
                              <div className="reserve-breakdown-row" key={`reserve-${row.key}`}>
                                <span className="reserve-breakdown-label">{row.label}</span>
                                <span className="reserve-breakdown-count">
                                  {typeof row.count === 'number' ? formatCountText(row.count) : ''}
                                </span>
                                <span className="reserve-breakdown-value">
                                  <span>{amountFormat(row.drops, { precise: 'nice' })}</span>
                                  <span className="fiat-line" suppressHydrationWarning>
                                    {tokenToFiat({
                                      amount: row.drops,
                                      selectedCurrency,
                                      fiatRate: pageFiatRate,
                                      asText: true
                                    })}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                          {reserveIncrementDrops > 0 && (
                            <div className="reserve-breakdown-note">
                              {ta('reserve.object-reserve', { amount: amountFormat(reserveIncrementDrops) })}
                            </div>
                          )}
                        </div>
                      )}
                      {isHistoricalLedger && selectedCurrency && pageFiatRate ? (
                        <div className="detail-row">
                          <span>{ta('labels.rate')}:</span>
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
                            <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> {ta('actions.send')}
                          </button>
                          {!!disabledSendTooltip && <span className="tooltiptext left">{disabledSendTooltip}</span>}
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
                  {ta('actions.get-first-native', { nativeCurrency })}
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
                  {ta('actions.add-token')}
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
                    {ta('tabs.all')} ({totalTokenCount})
                  </button>
                  {issuedTokensCount > 0 && (
                    <button
                      type="button"
                      className={`token-tab-btn ${tokenTab === 'tokens' ? 'active' : ''}`}
                      onClick={() => setTokenTab('tokens')}
                    >
                      {ta('tabs.tokens')} ({issuedTokensCount})
                    </button>
                  )}
                  {lpTokensCount > 0 && (
                    <button
                      type="button"
                      className={`token-tab-btn ${tokenTab === 'lp' ? 'active' : ''}`}
                      onClick={() => setTokenTab('lp')}
                    >
                      {ta('tabs.lp-tokens')} ({lpTokensCount})
                    </button>
                  )}
                </div>
              </div>
            )}

            {shouldShowTokenSearch && (
              <div className="token-search-row" onClick={(event) => event.stopPropagation()}>
                <div className="token-search-box">
                  <MdSearch className="token-search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(event) => setTokenSearch(event.target.value)}
                    placeholder={ta('labels.search-tokens')}
                    aria-label={ta('labels.search-tokens')}
                    className="token-search-input"
                  />
                  {tokenSearch && (
                    <button
                      type="button"
                      className="token-search-clear"
                      onClick={() => setTokenSearch('')}
                      aria-label={ta('actions.clear-search')}
                    >
                      <MdClose aria-hidden="true" />
                    </button>
                  )}
                </div>
                {tokenSearchQuery && (
                  <div className="token-search-count">
                    {ta('counts.tokens-found', { count: filteredTokenList.length })}
                  </div>
                )}
              </div>
            )}

            {tokenSearchQuery && filteredTokenList.length === 0 && (
              <div className="asset-item object-load-status token-search-empty">
                <span className="object-load-status-text">{ta('empty.no-token-search-results')}</span>
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
                if (!setSignRequest || !account?.address) return ta('tooltips.login-required')
                if (!isOwnAccount) return ta('tooltips.viewed-account-only')
                if (effectiveLedgerTimestamp) return ta('tooltips.historical-unavailable')
                if (!hasPositiveTokenBalance) return ta('tooltips.send-positive-token-balance')
                if (!issuer?.issuer || !trustlineCurrencyCode) return ta('tooltips.trustline-incomplete')
                return ta('tooltips.send-unavailable')
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
                if (isLpToken) return ta('tooltips.lp-trustline-remove-unavailable')
                if (!setSignRequest || !account?.address) return ta('tooltips.login-required')
                if (!isOwnAccount) return ta('tooltips.viewed-account-only')
                if (effectiveLedgerTimestamp) return ta('tooltips.historical-unavailable')
                if (Number(balance) !== 0) return ta('tooltips.remove-trustline-zero-balance')
                if (!issuer?.issuer || !trustlineCurrencyCode) return ta('tooltips.trustline-incomplete')
                return ta('tooltips.remove-trustline-unavailable')
              })()
              const tokenPoolsUrl =
                !isLpToken && trustlineCurrencyCode && issuer?.issuer
                  ? `/amms?currency=${encodeURIComponent(trustlineCurrencyCode)}&currencyIssuer=${encodeURIComponent(
                      issuer.issuer
                    )}`
                  : null
              const tokenPageUrl =
                !isLpToken && trustlineCurrencyCode && issuer?.issuer
                  ? `/token/${issuer.issuer}/${trustlineCurrencyCode}`
                  : null
              const lpAmmId = isLpToken ? ammCurrencyDetailsId(token.Balance?.currencyDetails) : null
              const canOpenAmmAction = isLpToken && !!setSignRequest && !effectiveLedgerTimestamp && !!lpAmmId
              const ammDepositActionKey = `${tokenUniqueKey}-ammDeposit`
              const ammWithdrawActionKey = `${tokenUniqueKey}-ammWithdraw`
              const ammActionBusy = !!ammActionLoadingKey

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
                            <span>
                              {ta('labels.rate')} ({nativeCurrency}):
                            </span>
                            <span>
                              1 {niceCurrency(token.Balance?.currency)} ={' '}
                              {shortNiceNumber(token.priceNativeCurrencySpot, 6, 6)} {nativeCurrency}
                            </span>
                          </div>
                          {tokenFiatRate && selectedCurrency ? (
                            <div className="detail-row">
                              <span>
                                {ta('labels.rate')} ({selectedCurrency?.toUpperCase()}):
                              </span>
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
                        <span>{ta('labels.balance')}:</span>
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
                                  <span>{ta('labels.lp-token')}:</span>
                                  <span className="copy-inline">
                                    <span>{shortHash(token.Balance?.currency)}</span>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={token.Balance?.currency} />
                                    </span>
                                  </span>
                                </div>
                                {lpAmmId && (
                                  <div className="detail-row">
                                    <span>{ta('labels.amm-id')}:</span>
                                    <span className="copy-inline">
                                      <Link
                                        href={`/amm/${lpAmmId}`}
                                        className="change-limit-link no-brake"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        {shortHash(lpAmmId)}
                                      </Link>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={lpAmmId} />
                                      </span>
                                    </span>
                                  </div>
                                )}
                                {asset1 && asset2 && (
                                  <>
                                    <div className="detail-row">
                                      <span>{ta('labels.asset-1')}:</span>
                                      <span className="amount-with-fiat" onClick={(event) => event.stopPropagation()}>
                                        <span className="no-brake">
                                          <TokenImage token={asset1} />
                                          <span className="bold">
                                            {amountFormat(amount1Raw, { noCurrency: true, short: true })}
                                          </span>{' '}
                                          <LinkToken token={asset1} />
                                        </span>
                                        {amount1FiatText ? (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {amount1FiatText}
                                          </span>
                                        ) : null}
                                      </span>
                                    </div>
                                    <div className="detail-row">
                                      <span>{ta('labels.asset-2')}:</span>
                                      <span className="amount-with-fiat" onClick={(event) => event.stopPropagation()}>
                                        <span className="no-brake">
                                          <TokenImage token={asset2} />
                                          <span className="bold">
                                            {amountFormat(amount2Raw, { noCurrency: true, short: true })}
                                          </span>{' '}
                                          <LinkToken token={asset2} />
                                        </span>
                                        {amount2FiatText ? (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {amount2FiatText}
                                          </span>
                                        ) : null}
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
                            <span>{ta('labels.currency')}:</span>
                            <span className="copy-inline">
                              <span>{trustlineCurrencyCodeDisplay}</span>
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
                            <span>{ta('labels.issuer')}:</span>
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
                          <span>{ta('labels.locked')}:</span>
                          <span>{fullNiceNumber(token.LockedBalance.value)}</span>
                        </div>
                      )}
                      {!isLpToken && token.HighLimit?.issuer === data?.address ? (
                        <>
                          <div className="detail-row">
                            <span>{isLoggedIn ? ta('labels.your-limit') : ta('labels.limit')}:</span>
                            <span>
                              {fullNiceNumber(token.HighLimit?.value)}
                              {isLoggedIn && (
                                <>
                                  {' '}
                                  <Link
                                    href={`/services/trustline?currency=${token.Balance?.currency}&currencyIssuer=${issuer?.issuer}&mode=advanced&limit=${token.HighLimit?.value}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="change-limit-link no-brake"
                                  >
                                    [{ta('actions.change')}]
                                  </Link>
                                </>
                              )}
                            </span>
                          </div>
                          {parseFloat(token.LowLimit?.value) !== 0 && (
                            <div className="detail-row">
                              <span>{ta('labels.counterparty-limit')}:</span>
                              <span>{fullNiceNumber(token.LowLimit?.value)}</span>
                            </div>
                          )}
                        </>
                      ) : !isLpToken ? (
                        <>
                          <div className="detail-row">
                            <span>{isLoggedIn ? ta('labels.your-limit') : ta('labels.limit')}:</span>
                            <span>
                              {fullNiceNumber(token.LowLimit?.value)}
                              {isLoggedIn && (
                                <>
                                  {' '}
                                  <Link
                                    href={`/services/trustline?currency=${token.Balance?.currency}&currencyIssuer=${issuer?.issuer}&mode=advanced&limit=${token.LowLimit?.value}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="change-limit-link no-brake"
                                  >
                                    [{ta('actions.change')}]
                                  </Link>
                                </>
                              )}
                            </span>
                          </div>
                          {parseFloat(token.HighLimit?.value) !== 0 && (
                            <div className="detail-row">
                              <span>{ta('labels.counterparty-limit')}:</span>
                              <span>{fullNiceNumber(token.HighLimit?.value)}</span>
                            </div>
                          )}
                        </>
                      ) : null}
                      {token.flags && (
                        <>
                          {(token.flags.lowFreeze || token.flags.highFreeze) && (
                            <div className="detail-row">
                              <span>{ta('labels.freeze')}:</span>
                              <span className="red">{ta('states.yes')}</span>
                            </div>
                          )}
                          {(token.flags.lowNoRipple || token.flags.highNoRipple) && (
                            <div className="detail-row">
                              <span>{ta('labels.rippling')}:</span>
                              <span className="green">{ta('states.disabled')}</span>
                            </div>
                          )}
                          {(token.flags.lowAuth || token.flags.highAuth) && (
                            <div className="detail-row">
                              <span>{ta('labels.authorized')}:</span>
                              <span className="green">{ta('states.yes')}</span>
                            </div>
                          )}
                          {(token.flags.lowDeepFreeze || token.flags.highDeepFreeze) && (
                            <div className="detail-row">
                              <span>{ta('labels.deep-freeze')}:</span>
                              <span className="red">{ta('states.yes')}</span>
                            </div>
                          )}
                        </>
                      )}
                      {isLpToken && token.Balance?.currencyDetails?.asset && (
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className={`card-action-btn ${canOpenAmmAction ? 'redeem' : 'disabled'}`}
                            disabled={!canOpenAmmAction || ammActionBusy}
                            onClick={() => {
                              if (!canOpenAmmAction || ammActionBusy) return
                              openAmmLiquidityPopup({
                                token,
                                action: 'ammDeposit',
                                actionKey: ammDepositActionKey
                              })
                            }}
                          >
                            <MdSouth style={{ fontSize: 16, marginBottom: -2 }} /> {ta('actions.deposit')}
                          </button>
                          <button
                            type="button"
                            className={`card-action-btn ${canOpenAmmAction ? 'cancel' : 'disabled'}`}
                            disabled={!canOpenAmmAction || ammActionBusy}
                            onClick={() => {
                              if (!canOpenAmmAction || ammActionBusy) return
                              openAmmLiquidityPopup({
                                token,
                                action: 'ammWithdraw',
                                actionKey: ammWithdrawActionKey
                              })
                            }}
                          >
                            <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> {ta('actions.withdraw')}
                          </button>
                          {lpAmmId && (
                            <button
                              type="button"
                              className="card-action-btn pools"
                              onClick={() => router.push(`/amm/${lpAmmId}`)}
                            >
                              <TbBinaryTree style={{ fontSize: 15, marginBottom: -2 }} /> {ta('actions.pool-page')}
                            </button>
                          )}
                        </div>
                      )}
                      {!isLpToken && (
                        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                          {tokenPageUrl && (
                            <button
                              type="button"
                              className="card-action-btn token-page"
                              onClick={() => router.push(tokenPageUrl)}
                            >
                              <MdOpenInNew style={{ fontSize: 15, marginBottom: -2 }} /> {ta('actions.token-page')}
                            </button>
                          )}
                          {tokenPoolsUrl && (
                            <button
                              type="button"
                              className="card-action-btn pools"
                              onClick={() => router.push(tokenPoolsUrl)}
                            >
                              <TbBinaryTree style={{ fontSize: 15, marginBottom: -2 }} /> {ta('actions.pools')}
                            </button>
                          )}
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
                              <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> {ta('actions.send')}
                            </button>
                            {!!disabledSendTokenTooltip && (
                              <span className="tooltiptext left">{disabledSendTokenTooltip}</span>
                            )}
                          </span>
                          {canGetMoreRlusd && (
                            <button
                              type="button"
                              className="card-action-btn redeem"
                              onClick={() => router.push(`/faucet?currency=RLUSD&amount=1&address=${data?.address}`)}
                            >
                              <MdSouth style={{ fontSize: 16, marginBottom: -2 }} />{' '}
                              {ta('actions.get-more-token', { amount: 1, token: 'RLUSD' })}
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
                              <MdDeleteForever /> {ta('actions.remove')}
                            </button>
                            {!!disabledRemoveTrustlineTooltip && (
                              <span className="tooltiptext left">{disabledRemoveTrustlineTooltip}</span>
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
                        const nextLimit = Math.min(filteredTokenList.length, visibleTokens.length + 10)
                        if (nextLimit >= filteredTokenList.length) {
                          setShowAllTokens(true)
                        }
                        setTokenDisplayLimit(nextLimit)
                      }}
                    >
                      {ta('actions.show-more-items', {
                        count: Math.min(10, hiddenTokensCount),
                        type: activeTokenTabLabel
                      })}
                    </button>
                  )}
                  {showAllButtonVisible && (
                    <button
                      type="button"
                      className="asset-compact-toggle"
                      onClick={() => {
                        setShowAllTokens(true)
                        setTokenDisplayLimit(filteredTokenList.length)
                      }}
                    >
                      {ta('actions.show-all-items', { type: activeTokenTabLabel, count: hiddenTokensCount })}
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
                      {ta('actions.show-fewer-items', { type: activeTokenTabLabel })}
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
                    const issuanceId = mptId(mptNode)
                    const tokenPageUrl = issuanceId ? `/token/${issuanceId}` : null
                    const balanceValue = scaleAmount(
                      mptNode?.MPTAmount || 0,
                      mptNode?.mptokenCurrencyDetails?.scale || null
                    )
                    const canManageMpt =
                      !!setSignRequest && !!account?.address && isOwnAccount && !effectiveLedgerTimestamp && !!issuanceId
                    const canSendMpt = canManageMpt && Number(balanceValue) > 0
                    const canRemoveMpt = canManageMpt && Number(balanceValue) === 0
                    const disabledSendMptTooltip = canSendMpt
                      ? ''
                      : !setSignRequest || !account?.address
                        ? ta('tooltips.login-required')
                        : !isOwnAccount
                          ? ta('tooltips.viewed-account-only')
                          : effectiveLedgerTimestamp
                            ? ta('tooltips.historical-unavailable')
                            : ta('tooltips.send-positive-token-balance')
                    const disabledRemoveMptTooltip = canRemoveMpt
                      ? ''
                      : Number(balanceValue) !== 0
                        ? ta('tooltips.remove-mpt-zero-balance')
                        : !setSignRequest || !account?.address
                          ? ta('tooltips.login-required')
                          : !isOwnAccount
                            ? ta('tooltips.viewed-account-only')
                            : ta('tooltips.historical-unavailable')

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
                              <span>{ta('labels.mpt-id')}:</span>
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
                              <span>{ta('labels.balance')}:</span>
                              <span>{fullNiceNumber(balanceValue)}</span>
                            </div>
                            {mptNode?.mptokenCurrencyDetails?.account && (
                              <div className="detail-row">
                                <span>{ta('labels.issuer')}:</span>
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
                            <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                              {tokenPageUrl && (
                                <button
                                  type="button"
                                  className="card-action-btn token-page"
                                  onClick={() => router.push(tokenPageUrl)}
                                >
                                  <MdOpenInNew style={{ fontSize: 15, marginBottom: -2 }} />{' '}
                                  {ta('actions.token-page')}
                                </button>
                              )}
                              <span className={disabledSendMptTooltip ? 'tooltip' : ''}>
                                <button
                                  type="button"
                                  className={`card-action-btn ${canSendMpt ? 'redeem' : 'disabled'}`}
                                  disabled={!canSendMpt}
                                  onClick={() => {
                                    if (!canSendMpt) return
                                    setSignRequest({
                                      action: 'payment',
                                      redirect: 'account',
                                      request: {
                                        TransactionType: 'Payment',
                                        Account: data?.address,
                                        Amount: { mpt_issuance_id: issuanceId, value: '0' },
                                        Flags: 131072
                                      },
                                      data: {
                                        mptokenIssuanceID: issuanceId,
                                        mptAssetScale: mptNode?.mptokenCurrencyDetails?.scale || 0,
                                        issuer:
                                          mptNode?.mptokenCurrencyDetails?.account ||
                                          mptNode?.mptokenCurrencyDetails?.issuer ||
                                          mptNode?.Issuer,
                                        transferFee:
                                          mptNode?.mptokenCurrencyDetails?.transferFee ??
                                          mptNode?.mptokenCurrencyDetails?.TransferFee ??
                                          mptNode?.TransferFee,
                                        currencyCode:
                                          mptNode?.mptokenCurrencyDetails?.metadata?.t ||
                                          mptNode?.mptokenCurrencyDetails?.metadata?.ticker ||
                                          'MPT',
                                        balance: String(balanceValue)
                                      }
                                    })
                                  }}
                                >
                                  <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> {ta('actions.send')}
                                </button>
                                {!!disabledSendMptTooltip && (
                                  <span className="tooltiptext left">{disabledSendMptTooltip}</span>
                                )}
                              </span>
                              <span className={disabledRemoveMptTooltip ? 'tooltip' : ''}>
                                <button
                                  type="button"
                                  className={`card-action-btn ${canRemoveMpt ? 'cancel' : 'disabled'}`}
                                  disabled={!canRemoveMpt}
                                  onClick={() => {
                                    if (!canRemoveMpt) return
                                    setSignRequest({
                                      redirect: 'account',
                                      request: {
                                        TransactionType: 'MPTokenAuthorize',
                                        Account: data?.address,
                                        MPTokenIssuanceID: issuanceId,
                                        Flags: 1
                                      }
                                    })
                                  }}
                                >
                                  <MdDeleteForever /> {ta('actions.remove')}
                                </button>
                                {!!disabledRemoveMptTooltip && (
                                  <span className="tooltiptext left">{disabledRemoveMptTooltip}</span>
                                )}
                              </span>
                            </div>
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
                  {activeNftBaseCount > 0 && data?.address && (
                    <Link className="section-link" href={activeNftViewAllHref}>
                      {ta('actions.view-all')}
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
                        {ta('tabs.owned')}
                        {nftTabCountLabels.owned ? ` (${nftTabCountLabels.owned})` : ''}
                      </button>
                    )}
                    {hasSoldNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'sold' ? 'active' : ''}`}
                        onClick={() => setNftTab('sold')}
                      >
                        {ta('tabs.sold')}
                        {nftTabCountLabels.sold ? ` (${nftTabCountLabels.sold})` : ''}
                      </button>
                    )}
                    {hasMintedNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'minted' ? 'active' : ''}`}
                        onClick={() => setNftTab('minted')}
                      >
                        {ta('tabs.minted')}
                        {nftTabCountLabels.minted ? ` (${nftTabCountLabels.minted})` : ''}
                      </button>
                    )}
                    {hasBurnedNfts && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftTab === 'burned' ? 'active' : ''}`}
                        onClick={() => setNftTab('burned')}
                      >
                        {ta('tabs.burned')}
                        {nftTabCountLabels.burned ? ` (${nftTabCountLabels.burned})` : ''}
                      </button>
                    )}
                  </div>
                </div>

                <div className="nft-section-content">
                  {shouldShowNftSearch && (
                    <div className="token-search-row nft-search-row" onClick={(event) => event.stopPropagation()}>
                      <div className="token-search-box">
                        <MdSearch className="token-search-icon" aria-hidden="true" />
                        <input
                          type="text"
                          value={nftSearch}
                          onChange={(event) => setNftSearch(event.target.value)}
                          placeholder={ta('labels.search-nfts')}
                          aria-label={ta('labels.search-nfts')}
                          className="token-search-input"
                        />
                        {nftSearch && (
                          <button
                            type="button"
                            className="token-search-clear"
                            onClick={() => setNftSearch('')}
                            aria-label={ta('actions.clear-search')}
                          >
                            <MdClose aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {nftSearchActive && nftSearchReady && !nftSearchLoading && (
                        <div className="token-search-count">
                          {ta('counts.nfts-found', {
                            count: nftSearchMarker ? `${nftSearchResults.length}+` : nftSearchResults.length
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {activeNftLoading ? (
                    <div className="asset-fiat">{ta('messages.loading-nfts', { type: activeNftTabLabel })}</div>
                  ) : activeNftCount > 0 ? (
                    <>
                      <div className="cards-list">
                        {activeNftPreview.map((nft, nftIndex) => {
                          const nftId = nftTokenIdFromData(nft)
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
                          const nftIssuerDetails = nft?.issuerDetails || nft?.nftoken?.issuerDetails || null
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
                            if (!nftIsTransferable && !isSignedInNftIssuer) return ta('tooltips.non-transferable-nft')
                            return ''
                          })()
                          const nftImageUrl = nftUrl(nftDisplayData, 'image')
                          const shouldShowOwnerNftActionButtons =
                            nftTab === 'owned' && !!nftId && !nftDeleted && !!setSignRequest && isSignedInNftOwner
                          const canListOwnedNft =
                            shouldShowOwnerNftActionButtons &&
                            !xahauNetwork &&
                            (nftIsTransferable || isSignedInNftIssuer)
                          const disabledOwnerNftActionTooltip = (() => {
                            if (canListOwnedNft) return ''
                            if (!nftIsTransferable && !isSignedInNftIssuer) return ta('tooltips.non-transferable-nft')
                            return ''
                          })()
                          const canSetNftAsAvatar =
                            shouldShowOwnerNftActionButtons &&
                            !devNet &&
                            !isNftExplicit(nftDisplayData) &&
                            !!nftImageUrl
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
                          const validBuyOffers = Array.isArray(nft?.buyOffers)
                            ? nft.buyOffers.filter((offer) => offer?.valid !== false)
                            : null
                          const bestBid =
                            nftTab === 'owned' ? bestNftOffer(validBuyOffers, account?.address, 'buy') : null
                          const bestBidAmount = bestBid?.amount
                            ? amountFormat(bestBid.amount, { short: true, maxFractionDigits: 2 })
                            : null
                          const bestBidNativeFiat =
                            bestBid?.amount && typeof bestBid.amount !== 'object' && selectedCurrency
                              ? tokenToFiat({
                                  amount: bestBid.amount,
                                  selectedCurrency,
                                  fiatRate: pageFiatRate,
                                  asText: true,
                                  absolute: true
                                })
                              : null
                          const bestBidConvertedFiat =
                            bestBid?.amount && typeof bestBid.amount === 'object' && selectedCurrency
                              ? convertedAmount(bestBid, selectedCurrency.toLowerCase(), { short: true })
                              : null
                          const bestBidTokenFiat =
                            bestBid?.amount && typeof bestBid.amount === 'object' && selectedCurrency
                              ? nftOfferFiatText(bestBid, {
                                  fiatRate: pageFiatRate,
                                  selectedCurrency,
                                  tokenList: tokens
                                })
                              : null
                          const bestBidFiat = bestBidNativeFiat || bestBidConvertedFiat || bestBidTokenFiat
                          const actionTimeAgo = actionAt ? timeFromNow(actionAt, i18n) : null
                          const actionExact = actionAt ? fullDateAndTime(actionAt) : null
                          const actionVerb =
                            nftTab === 'sold'
                              ? ta('tabs.sold')
                              : nftTab === 'minted'
                                ? ta('tabs.minted')
                                : nftTab === 'burned'
                                  ? ta('tabs.burned')
                                  : ta('labels.updated')
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
                                  ) : bestBidAmount ? (
                                    <>
                                      <div className="asset-amount grey">{bestBidAmount}</div>
                                      {bestBidFiat && (
                                        <div className="asset-fiat" suppressHydrationWarning>
                                          {bestBidNativeFiat ? bestBidFiat : `≈${bestBidFiat}`}
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
                                      <span>{ta('labels.issuer')}:</span>
                                      <span className="copy-inline">
                                        <span onClick={(event) => event.stopPropagation()}>
                                          <AddressWithIconInline
                                            data={{ issuer: nftIssuer, issuerDetails: nftIssuerDetails }}
                                            name="issuer"
                                            options={{ short: 6 }}
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
                                      <span>{ta('labels.sale-price')}:</span>
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
                                  {bestBidAmount && (
                                    <div className="detail-row">
                                      <span>{ta('labels.best-buy-offer')}:</span>
                                      <span>
                                        {bestBidAmount}
                                        {bestBidFiat && (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {' '}
                                            {bestBidNativeFiat ? bestBidFiat : `≈${bestBidFiat}`}
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

                                  <div className="nft-expanded-preview" onClick={(event) => event.stopPropagation()}>
                                    <Link href={`/nft/${nftId}`} className="nft-expanded-preview-link">
                                      <NftImage
                                        nft={nftDisplayData}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          borderRadius: '10px',
                                          verticalAlign: 'middle'
                                        }}
                                      />
                                    </Link>
                                  </div>

                                  <div className="nft-expanded-actions" onClick={(event) => event.stopPropagation()}>
                                    {shouldShowMakeBuyOfferButton && (
                                      <div className="card-actions">
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
                                            {ta('actions.make-buy-offer')}
                                          </button>
                                          {!!disabledBuyOfferTooltip && (
                                            <span className="tooltiptext left">{disabledBuyOfferTooltip}</span>
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {shouldShowBurnNftButton && !!burnNftRequest && (
                                      <div className="card-actions">
                                        <button
                                          type="button"
                                          className="card-action-btn cancel"
                                          onClick={() => {
                                            setSignRequest({
                                              request: burnNftRequest
                                            })
                                          }}
                                        >
                                          {ta('actions.burn')}
                                        </button>
                                      </div>
                                    )}

                                    {shouldShowOwnerNftActionButtons && (
                                      <div className="card-actions nft-owner-card-actions">
                                        <span className={disabledOwnerNftActionTooltip ? 'tooltip' : ''}>
                                          <button
                                            type="button"
                                            className={`card-action-btn ${canListOwnedNft ? 'redeem' : 'disabled'}`}
                                            disabled={!canListOwnedNft}
                                            onClick={() => {
                                              if (!canListOwnedNft) return
                                              setSignRequest({
                                                request: {
                                                  TransactionType: 'NFTokenCreateOffer',
                                                  Account: nftOwner,
                                                  NFTokenID: nftId,
                                                  Flags: 1
                                                }
                                              })
                                            }}
                                          >
                                            {ta('actions.list-for-sale')}
                                          </button>
                                          {!!disabledOwnerNftActionTooltip && (
                                            <span className="tooltiptext left">{disabledOwnerNftActionTooltip}</span>
                                          )}
                                        </span>

                                        <span className={disabledOwnerNftActionTooltip ? 'tooltip' : ''}>
                                          <button
                                            type="button"
                                            className={`card-action-btn ${canListOwnedNft ? 'redeem' : 'disabled'}`}
                                            disabled={!canListOwnedNft}
                                            onClick={() => {
                                              if (!canListOwnedNft) return
                                              setSignRequest({
                                                request: {
                                                  TransactionType: 'NFTokenCreateOffer',
                                                  Account: nftOwner,
                                                  NFTokenID: nftId,
                                                  Flags: 1
                                                },
                                                action: 'nftTransfer'
                                              })
                                            }}
                                          >
                                            {ta('actions.transfer')}
                                          </button>
                                          {!!disabledOwnerNftActionTooltip && (
                                            <span className="tooltiptext left">{disabledOwnerNftActionTooltip}</span>
                                          )}
                                        </span>

                                        <span className={!canSetNftAsAvatar ? 'tooltip' : ''}>
                                          <button
                                            type="button"
                                            className={`card-action-btn ${canSetNftAsAvatar ? 'redeem' : 'disabled'}`}
                                            disabled={!canSetNftAsAvatar}
                                            onClick={() => {
                                              if (!canSetNftAsAvatar) return

                                              const command = {
                                                action: 'setAvatar',
                                                url: nftImageUrl,
                                                timestamp: new Date().toISOString()
                                              }

                                              setSignRequest({
                                                request: {
                                                  TransactionType: 'AccountSet',
                                                  Account: nftOwner,
                                                  Memos: [
                                                    {
                                                      Memo: {
                                                        MemoType: encode('json'),
                                                        MemoData: encode(JSON.stringify(command))
                                                      }
                                                    }
                                                  ]
                                                },
                                                data: {
                                                  signOnly: true,
                                                  action: 'set-avatar',
                                                  redirect: 'account'
                                                }
                                              })
                                            }}
                                          >
                                            {ta('actions.set-as-avatar')}
                                          </button>
                                          {!canSetNftAsAvatar && (
                                            <span className="tooltiptext left">
                                              {devNet
                                                ? ta('tooltips.not-available-devnet')
                                                : isNftExplicit(nftDisplayData)
                                                  ? ta('tooltips.explicit-nft-avatar')
                                                  : !nftImageUrl
                                                    ? ta('tooltips.nft-image-missing')
                                                    : ''}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
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
                                ? ta('messages.loading-nfts', { type: activeNftTabLabel })
                                : ta('actions.show-more-nfts', {
                                    count: activeNftRemainingCount,
                                    type: activeNftTabLabel
                                  })}
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
                              {ta('actions.show-fewer-nfts', { type: activeNftTabLabel })}
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
              <span className="section-title">{ta('sections.transactions')}</span>
              <div className="tx-header-actions">
                <button
                  className="tx-filter-toggle tooltip"
                  onClick={() => fetchRecentTransactions()}
                  aria-label={ta('aria.reload-transactions')}
                  type="button"
                  disabled={!data?.address || transactionsLoading || transactionsLoadingMore}
                >
                  <FaArrowsRotate
                    className={`tx-refresh-icon ${transactionsLoading || transactionsLoadingMore ? 'spinning' : ''}`}
                  />
                  <span className="tooltiptext">{ta('actions.update')}</span>
                </button>
                <button
                  className={`tx-filter-toggle tooltip ${showTxFilters ? 'active' : ''}`}
                  onClick={() => setShowTxFilters((prev) => !prev)}
                  aria-label={ta('aria.toggle-transaction-filters')}
                  type="button"
                >
                  <FaGear />
                  <span className="tooltiptext">{ta('labels.settings')}</span>
                </button>
                {data?.address && (
                  <Link className="section-link" href={`/account/${data.address}/transactions`}>
                    {ta('actions.view-all')}
                  </Link>
                )}
              </div>
            </div>

            {showTxFilters && (
              <div className="tx-filters-panel">
                <div className="tx-filter-grid">
                  <label className="tx-filter-field">
                    <span>{ta('labels.order')}</span>
                    <select value={txOrder} onChange={(event) => setTxOrder(event.target.value)}>
                      <option value="newest">{ta('filters.newest-first')}</option>
                      <option value="oldest">{ta('filters.oldest-first')}</option>
                    </select>
                  </label>

                  <label className="tx-filter-field">
                    <span>{ta('labels.type')}</span>
                    <select value={txType} onChange={(event) => setTxType(event.target.value)}>
                      <option value="all">{ta('filters.all-types')}</option>
                      <option value="payment">{ta('filters.payment')}</option>
                      <option value="nft">NFT</option>
                      <option value="amm">AMM</option>
                      <option value="order">DEX</option>
                      <option value="escrow">Escrow</option>
                      <option value="channel">{ta('filters.channel')}</option>
                      <option value="check">Check</option>
                      <option value="trustline">Trustline</option>
                      <option value="settings">{ta('labels.settings')}</option>
                      <option value="accountDelete">{ta('filters.account-delete')}</option>
                    </select>
                  </label>

                  <label className="tx-filter-field">
                    <span>{ta('labels.direction')}</span>
                    <select value={txInitiated} onChange={(event) => setTxInitiated(event.target.value)}>
                      <option value="all">{ta('filters.incoming-outgoing')}</option>
                      <option value="true">{ta('filters.outgoing-only')}</option>
                      <option value="false">{ta('filters.incoming-only')}</option>
                    </select>
                  </label>

                  <label className="tx-filter-field">
                    <span>{ta('labels.failures')}</span>
                    <select value={txExcludeFailures} onChange={(event) => setTxExcludeFailures(event.target.value)}>
                      <option value="all">{ta('filters.include-failed')}</option>
                      <option value="true">{ta('filters.exclude-failed')}</option>
                    </select>
                  </label>

                  <label className="tx-filter-field tx-filter-field-wide">
                    <span>{ta('labels.counterparty')}</span>
                    <input
                      type="text"
                      value={txCounterparty}
                      onChange={(event) => setTxCounterparty(event.target.value)}
                      placeholder={ta('labels.address')}
                    />
                  </label>

                  <label className="tx-filter-field">
                    <span>{ta('labels.from')}</span>
                    <input
                      type="datetime-local"
                      value={txFromDate}
                      onChange={(event) => setTxFromDate(event.target.value)}
                    />
                  </label>

                  <label className="tx-filter-field">
                    <span>{ta('labels.to')}</span>
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
                  <span>{ta('filters.exclude-spam-transactions')}</span>
                </label>

                <div className="tx-filter-actions">
                  <button className="card-action-btn" type="button" onClick={resetTransactionFilters}>
                    {ta('actions.reset')}
                  </button>
                  <button className="card-action-btn redeem" type="button" onClick={applyTransactionFilters}>
                    {ta('actions.search')}
                  </button>
                </div>
              </div>
            )}

            {transactionsLoading && (
              <p className="grey tx-status-text">
                <span className="tx-inline-load">
                  <span>{ta('messages.loading-transactions')}</span>
                  <span className="waiting inline" aria-hidden="true"></span>
                </span>
              </p>
            )}
            {!transactionsLoading && transactionsError && <p className="red tx-status-text">{transactionsError}</p>}

            {!transactionsLoading &&
              !transactionsError &&
              recentTransactions.length === 0 &&
              !transactionsSearchPaused && <p className="grey tx-status-text">{ta('empty.no-transactions')}</p>}

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
                      const removedAccountDestinationAddress = isAccountDeleteTx ? tx?.Destination || null : null
                      const removedAccountDestinationDetails = isAccountDeleteTx
                        ? txdata?.specification?.destination?.addressDetails
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

                      const nftChangeKey = xahauNetwork ? 'uritokenChanges' : 'nftokenChanges'
                      const nftAddressChanges = outcome?.[nftChangeKey] || []
                      const nftSource =
                        nftAddressChanges.length === 2
                          ? nftAddressChanges.find((change) => change?.[nftChangeKey]?.[0]?.status === 'removed')
                          : null
                      const nftDestination =
                        nftAddressChanges.length === 2
                          ? nftAddressChanges.find((change) => change?.[nftChangeKey]?.[0]?.status === 'added')
                          : null
                      const nftPreview = getTransactionNftPreview(txdata, { address: data?.address })
                      const nftPreviewData = nftPreview?.nft || null
                      const nftPreviewId = nftPreview?.id || null
                      const nftPreviewTitle = nftPreviewData
                        ? nftName(nftPreviewData, { maxLength: 48 }) || shortHash(nftPreviewId)
                        : ''
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
                      const dexOfferDirectionKey = (
                        txdata?.specification?.flags ? txdata?.specification?.flags?.sell : myOrderbookChange?.direction
                      )
                        ? 'sell'
                        : 'buy'
                      const isMyDexOrder = tx?.Account === data?.address
                      const dexOrderStatusKey = (() => {
                        if (!isDexOfferTx) return null
                        if (txType === 'OfferCancel') return 'canceled'
                        if (changes?.length === 0 && isMyDexOrder) return 'placed'
                        if (!isMyDexOrder) return 'fulfilled'
                        return 'placed-fulfilled'
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
                        isDexOfferTx && dexOrderStatusKey
                          ? isRipplingDexOffer
                            ? ta('transactions.rippling-through-offer')
                            : ta('transactions.dex-order', {
                                direction: ta(`transactions.dex-order-direction-${dexOfferDirectionKey}`, {
                                  defaultValue: ta(`tabs.${dexOfferDirectionKey}`)
                                }),
                                status: ta(`transactions.dex-order-status-${dexOrderStatusKey}`)
                              })
                          : null
                      const ammCreateShortLabel = isRipplingAmmCreate
                        ? ta('transactions.rippling-through-amm-creation')
                        : null
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
                        isDexOfferTx &&
                        typeof dexOrderStatusKey === 'string' &&
                        !dexOrderStatusKey.includes('fulfilled')
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
                      const buildTxAmountDisplay = ({
                        amount,
                        sign,
                        tone = 'grey',
                        withIssuer = false,
                        showPlus = true
                      }) => {
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
                                  showPlus
                                })}
                              </span>
                              {!!displayAmountFiat && <span className="tx-change-fiat">{displayAmountFiat}</span>}
                            </span>
                          ),
                          expandedText: amountFormat(displayAmount, {
                            icon: true,
                            withIssuer,
                            precise: 'nice',
                            showPlus
                          }),
                          expandedFiat: displayAmountFiat
                        }
                      }
                      const specialAmountRaw =
                        txType === 'EscrowCreate'
                          ? tx?.Amount
                          : txType === 'CheckCreate'
                            ? txdata?.specification?.sendMax
                            : null
                      const failedPaymentAmountRaw =
                        !isSuccessful && txType === 'Payment' && tx?.Amount ? tx.Amount : null
                      const txSpecialAmountDisplay = buildTxAmountDisplay({
                        amount: specialAmountRaw,
                        sign: isSource ? -1 : 1,
                        tone: 'grey'
                      })
                      const failedPaymentAmountDisplay = buildTxAmountDisplay({
                        amount: failedPaymentAmountRaw,
                        tone: 'grey',
                        withIssuer: true,
                        showPlus: false
                      })
                      const dexSpecifiedChanges = isDexNotFullfilled
                        ? [toSignedDexAmount(dexTakerGets, -1), toSignedDexAmount(dexTakerPays, 1)].filter(Boolean)
                        : []
                      const showDexSpecifiedOrderDetails =
                        isDexOfferTx &&
                        isMyDexOrder &&
                        typeof dexOrderStatusKey === 'string' &&
                        (dexOrderStatusKey.includes('placed') || dexOrderStatusKey === 'canceled') &&
                        (!!dexTakerGets || !!dexTakerPays)
                      const hasAmmVoteTradingFee = txType === 'AMMVote' && (tx?.TradingFee || tx?.TradingFee === 0)
                      const ammVoteTradingFeeText = hasAmmVoteTradingFee ? `${tx.TradingFee / 100000}%` : null
                      const isCreateNftOfferTx = xahauNetwork
                        ? txType === 'URITokenCreateSellOffer'
                        : txType === 'NFTokenCreateOffer'
                      const isAcceptNftOfferTx = xahauNetwork
                        ? txType === 'URITokenBuy'
                        : txType === 'NFTokenAcceptOffer'
                      const isCancelNftOfferTx = xahauNetwork
                        ? txType === 'URITokenCancelSellOffer'
                        : txType === 'NFTokenCancelOffer'
                      const isNftOfferTx = isCreateNftOfferTx || isAcceptNftOfferTx || isCancelNftOfferTx
                      const nftOfferChangeEntries = xahauNetwork
                        ? []
                        : (outcome?.nftokenOfferChanges || []).flatMap((entry) =>
                            (entry?.nftokenOfferChanges || []).map((offerChange) => ({
                              ...offerChange,
                              ownerDetails:
                                offerChange?.ownerDetails ||
                                (entry?.address === offerChange?.owner ? entry?.addressDetails : null)
                            }))
                          )
                      const canceledNftOfferOwner = isCancelNftOfferTx
                        ? nftOfferChangeEntries.find(
                            (offerChange) => offerChange?.owner && offerChange.owner !== data?.address
                          ) || nftOfferChangeEntries.find((offerChange) => offerChange?.owner)
                        : null
                      const canceledNftOfferOwnerAddress = canceledNftOfferOwner?.owner || null
                      const canceledNftOfferOwnerDetails = canceledNftOfferOwner?.ownerDetails || null
                      const cancelNftInitiatorAddress = isCancelNftOfferTx ? sourceAddress || tx?.Account || null : null
                      const cancelNftInitiatorDetails = isCancelNftOfferTx
                        ? txdata?.specification?.source?.addressDetails || null
                        : null
                      const showRelatedObjectInitiator =
                        !!tx?.Account && tx.Account !== data?.address && tx?.Destination !== data?.address
                      const outcomeOfferIds = xahauNetwork
                        ? []
                        : nftOfferChangeEntries
                            .filter(
                              (offerChange) => !isCancelNftOfferTx || isSource || offerChange?.owner === data?.address
                            )
                            .map((offerChange) => offerChange?.index)
                      const transactionOfferIds =
                        isCancelNftOfferTx && !isSource
                          ? []
                          : [
                              ...(Array.isArray(tx?.NFTokenOffers) ? tx.NFTokenOffers : []),
                              tx?.NFTokenSellOffer,
                              tx?.NFTokenBuyOffer,
                              tx?.OfferID,
                              txdata?.specification?.nftokenOffer?.offerIndex,
                              txdata?.specification?.nftokenOffer?.offerID
                            ]
                      const nftOfferIds = xahauNetwork
                        ? []
                        : Array.from(new Set([...outcomeOfferIds, ...transactionOfferIds].filter(Boolean)))
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
                        ? isSource
                          ? removedAccountDestinationAddress
                          : removedAccountAddress
                        : isCancelNftOfferTx
                          ? isSource
                            ? canceledNftOfferOwnerAddress || counterparty
                            : cancelNftInitiatorAddress || counterparty
                          : isAcceptNftOfferTx && nftViewerRole === 'seller'
                            ? nftBuyerAddress
                            : isAcceptNftOfferTx && nftViewerRole === 'buyer'
                              ? nftSellerAddress
                              : counterparty
                      const resolvedCounterpartyDetails = isAccountDeleteTx
                        ? isSource
                          ? removedAccountDestinationDetails
                          : removedAccountDetails
                        : isCancelNftOfferTx
                          ? isSource
                            ? canceledNftOfferOwnerDetails || counterpartyDetails
                            : cancelNftInitiatorDetails || counterpartyDetails
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
                          ? ta('transactions.removed-did')
                          : didStatus === 'modified'
                            ? ta('transactions.updated-did')
                            : ta('transactions.set-did')
                      const didStatusLabel =
                        isDidDeleteTx || didStatus === 'deleted'
                          ? ta('statuses.deleted-short')
                          : didStatus === 'modified'
                            ? ta('labels.updated')
                            : didStatus === 'created'
                              ? ta('labels.created')
                              : isDidSetTx
                                ? ta('states.set')
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
                          ? isSource
                            ? ta('labels.to')
                            : ta('labels.from-removed-account')
                          : isAcceptNftOfferTx && nftViewerRole === 'seller'
                            ? ta('labels.to')
                            : isAcceptNftOfferTx && nftViewerRole === 'buyer'
                              ? ta('labels.from')
                              : isCancelNftOfferTx
                                ? isSource
                                  ? ta('labels.from')
                                  : ta('labels.by')
                                : isCreateNftOfferTx && isSource && !!counterparty
                                  ? ta('phrases.for')
                                  : isBrokeredNftAccept
                                    ? ta('labels.by-broker')
                                    : isSource
                                      ? ta('labels.to')
                                      : ta('labels.from')
                        : null
                      const accountSetSpec = txdata?.specification || {}
                      const accountSetSettings = outcome?.settingsChanges || {}
                      const accountSetCollapsedChange = (() => {
                        if (txType !== 'AccountSet') return null

                        const changes = []

                        if (tx?.MessageKey !== undefined) {
                          const messageKeyStatus = accountSetSpec?.messageKey ? ta('states.set') : ta('states.removed')
                          changes.push(`${ta('labels.message-key')}: ${messageKeyStatus}`)
                        }
                        if (tx?.Domain !== undefined) {
                          changes.push(
                            `${ta('labels.domain')}: ${accountSetSpec?.domain ? stripDomain(accountSetSpec.domain) : ta('states.removed')}`
                          )
                        }
                        if (accountSetSpec?.defaultRipple !== undefined) {
                          changes.push(
                            `${ta('labels.default-ripple')}: ${accountSetSpec.defaultRipple ? ta('states.enabled') : ta('states.disabled')}`
                          )
                        }
                        if (
                          accountSetSpec?.disallowXRP !== undefined ||
                          accountSetSettings?.disallowXRP !== undefined
                        ) {
                          changes.push(
                            `${ta('labels.receiving-native')}: ${
                              accountSetSpec?.disallowXRP || accountSetSettings?.disallowXRP
                                ? ta('states.disallow')
                                : ta('states.allow')
                            }`
                          )
                        }
                        if (
                          accountSetSpec?.requireDestTag !== undefined ||
                          accountSetSettings?.requireDestTag !== undefined
                        ) {
                          changes.push(
                            `${ta('labels.destination-tag')}: ${
                              accountSetSpec?.requireDestTag || accountSetSettings?.requireDestTag
                                ? ta('states.require')
                                : ta('states.do-not-require')
                            }`
                          )
                        }
                        if (accountSetSpec?.depositAuth !== undefined) {
                          changes.push(
                            `${ta('labels.deposit-authorization')}: ${accountSetSpec.depositAuth ? ta('states.enabled') : ta('states.disabled')}`
                          )
                        }
                        if (accountSetSpec?.disableMaster !== undefined) {
                          changes.push(
                            `${ta('labels.master-key')}: ${accountSetSpec.disableMaster ? ta('states.disabled') : ta('states.enabled')}`
                          )
                        }
                        if (accountSetSpec?.noFreeze) {
                          changes.push(`${ta('labels.no-freeze')}: ${ta('states.enabled')}`)
                        }
                        if (
                          accountSetSpec?.requireAuth !== undefined ||
                          accountSetSettings?.requireAuth !== undefined
                        ) {
                          changes.push(
                            `${ta('labels.require-authorization')}: ${
                              accountSetSpec?.requireAuth || accountSetSettings?.requireAuth
                                ? ta('states.enabled')
                                : ta('states.disabled')
                            }`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingCheck !== undefined) {
                          changes.push(
                            `${ta('labels.incoming-check')}: ${accountSetSpec.disallowIncomingCheck ? ta('states.disallow') : ta('states.allow')}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingPayChan !== undefined) {
                          changes.push(
                            `${ta('labels.incoming-payment-channel')}: ${accountSetSpec.disallowIncomingPayChan ? ta('states.disallow') : ta('states.allow')}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingNFTokenOffer !== undefined) {
                          changes.push(
                            `${ta('labels.incoming-nft-offer')}: ${accountSetSpec.disallowIncomingNFTokenOffer ? ta('states.disallow') : ta('states.allow')}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingTrustline !== undefined) {
                          changes.push(
                            `${ta('labels.incoming-trustline')}: ${accountSetSpec.disallowIncomingTrustline ? ta('states.disallow') : ta('states.allow')}`
                          )
                        }
                        if (accountSetSpec?.enableTransactionIDTracking !== undefined) {
                          changes.push(
                            `${ta('labels.transaction-id-tracking')}: ${
                              accountSetSpec.enableTransactionIDTracking ? ta('states.enabled') : ta('states.disabled')
                            }`
                          )
                        }
                        if (accountSetSpec?.globalFreeze !== undefined) {
                          changes.push(
                            `${ta('labels.global-freeze')}: ${accountSetSpec.globalFreeze ? ta('states.enabled') : ta('states.disabled')}`
                          )
                        }
                        if (accountSetSpec?.authorizedMinter !== undefined) {
                          changes.push(
                            `${ta('labels.authorized-minter')}: ${accountSetSpec.authorizedMinter ? ta('states.enabled') : ta('states.disabled')}`
                          )
                        }
                        if (accountSetSpec?.nftokenMinter !== undefined) {
                          if (accountSetSpec.nftokenMinter) {
                            changes.push({ type: 'nftMinter', address: accountSetSpec.nftokenMinter })
                          } else {
                            changes.push(`${ta('sections.nft-minter')}: ${ta('states.removed')}`)
                          }
                        }
                        if (accountSetSpec?.allowTrustLineClawback !== undefined) {
                          changes.push(
                            `${ta('labels.trustline-clawback')}: ${accountSetSpec.allowTrustLineClawback ? ta('states.allowed') : ta('states.disallow')}`
                          )
                        }
                        if (accountSetSpec?.disallowIncomingRemit !== undefined) {
                          changes.push(
                            `${ta('labels.incoming-remit')}: ${accountSetSpec.disallowIncomingRemit ? ta('states.disallow') : ta('states.allow')}`
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
                              {ta('sections.nft-minter')}:{' '}
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
                        if (isAcceptNftOfferTx) {
                          if (!isSuccessful) return ta('transactions.nft-offer-accept')
                          if (nftViewerRole === 'seller')
                            return isFreeNftAccept ? ta('transactions.transferred-nft') : ta('transactions.sold-nft')
                          if (nftViewerRole === 'buyer')
                            return isFreeNftAccept ? ta('transactions.received-nft') : ta('transactions.bought-nft')

                          const amountChangeValue = Number(collapsedPrimaryChange?.value || 0)
                          if (amountChangeValue > 0) return ta('transactions.sold-nft')
                          if (amountChangeValue < 0) return ta('transactions.bought-nft')

                          if (!collapsedPrimaryChange && !collapsedSecondaryChange) {
                            if (nftDestination?.address === data?.address) return ta('transactions.received-nft-offer')
                            return ta('transactions.nft-transfer')
                          }

                          return ta('transactions.nft-offer-accept')
                        }

                        if (isCreateNftOfferTx) {
                          const amountChangeValue = Number(collapsedPrimaryChange?.value || 0)
                          if (amountChangeValue > 0) return ta('transactions.sold-nft')
                          if (amountChangeValue < 0) return ta('transactions.bought-nft')

                          const direction =
                            txType === 'URITokenCreateSellOffer'
                              ? 'sell'
                              : txdata?.specification?.flags?.sellToken
                                ? 'sell'
                                : 'buy'
                          const isIncomingOffer = tx?.Account !== data?.address

                          if (isIncomingOffer) {
                            const amountAsNumber = Number(tx?.Amount || 0)
                            if (direction === 'sell') {
                              if (Number.isFinite(amountAsNumber) && amountAsNumber === 0) {
                                return ta('transactions.received-nft-offer')
                              }
                              return ta('transactions.received-offer-to-buy-nft')
                            }
                            return ta(`transactions.received-nft-${direction}-offer`)
                          }

                          if (counterparty) {
                            return ta(`transactions.create-nft-${direction}-offer`)
                          }

                          return ta(`transactions.create-nft-${direction}-offer`)
                        }

                        if (isCancelNftOfferTx) {
                          return ta('transactions.cancel-nft-offer')
                        }

                        return null
                      })()
                      const isNftTransferLabel =
                        isAcceptNftOfferTx &&
                        !collapsedPrimaryChange &&
                        !collapsedSecondaryChange &&
                        (nftDestination?.address === data?.address || nftSource?.address === data?.address)
                      const isFreeNftTransfer =
                        isNftTransferLabel && (isZeroNftOfferAmount || nftOfferAmountRaw === '0')
                      const isFreeNftCreateOffer = isCreateNftOfferTx && isZeroNftOfferAmount
                      const showFreeNftBadge = isFreeNftTransfer || isFreeNftAccept || isFreeNftCreateOffer
                      const showFreeNftBadgeGreen = showFreeNftBadge && nftViewerRole === 'buyer' && isFreeNftAccept
                      const isNftSellOffer = xahauNetwork
                        ? isCreateNftOfferTx
                        : !!txdata?.specification?.flags?.sellToken
                      const isNftBuyOffer = !isNftSellOffer
                      const isIncomingSellOffer = isCreateNftOfferTx && tx?.Account !== data?.address && isNftSellOffer
                      const isOutgoingSellOffer = isCreateNftOfferTx && tx?.Account === data?.address && isNftSellOffer
                      const isCreateNftBuyOfferTx = isCreateNftOfferTx && isNftBuyOffer
                      const isNftMintTx = xahauNetwork
                        ? tx?.TransactionType === 'URITokenMint'
                        : tx?.TransactionType === 'NFTokenMint'
                      const isNftBurnTx = xahauNetwork
                        ? tx?.TransactionType === 'URITokenBurn'
                        : tx?.TransactionType === 'NFTokenBurn'
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
                      const nftMintSpecialLabelKey =
                        isNftMintTx && nftMintDestinationAddress
                          ? nftMintAmountNumeric === 0
                            ? 'nft-mint-with-free-offer-to'
                            : 'nft-mint-with-sell-offer-for'
                          : null
                      const nftMintSpecialLabel = nftMintSpecialLabelKey
                        ? ta(`transactions.${nftMintSpecialLabelKey}`)
                        : null
                      const showNftMintSellOfferAmount =
                        nftMintSpecialLabelKey === 'nft-mint-with-sell-offer-for' &&
                        nftMintAmountRaw !== null &&
                        typeof nftMintAmountRaw !== 'undefined'
                      const incomingSellOfferDisplay =
                        !showFreeNftBadge && isIncomingSellOffer && hasNftOfferAmount
                          ? buildTxAmountDisplay({
                              amount: nftOfferAmountRaw,
                              sign: -1,
                              tone: 'grey',
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
                        txType === 'EscrowCreate' ? ta('transactions.escrow-created') : null
                      const checkCreateCollapsedLabel =
                        txType === 'CheckCreate' ? ta('transactions.check-created') : null
                      const checkActionCollapsedLabel =
                        txType === 'CheckCash'
                          ? ta('transactions.check-redeemed')
                          : txType === 'CheckCancel'
                            ? ta('transactions.check-canceled')
                            : null
                      const setRegularKey = txType === 'SetRegularKey'
                      const setRegularKeyValue = txdata?.specification?.regularKey || null
                      const setRegularKeyDetails = txdata?.specification?.regularKeyDetails || null
                      const setRegularKeyLabel = setRegularKey
                        ? setRegularKeyValue
                          ? ta('transactions.regular-key-set')
                          : ta('transactions.regular-key-removed')
                        : null
                      const paymentCollapsedLabel =
                        txType === 'Payment' && counterparty ? ta('transactions.payment') : null
                      const accountDeleteCollapsedLabel = isAccountDeleteTx
                        ? isSource
                          ? ta('transactions.deleted-account')
                          : ta('transactions.payment-from-deleted-account')
                        : null
                      const txTypeShortLabel =
                        dexOfferShortLabel ||
                        ammCreateShortLabel ||
                        (isRipplingTransaction ? ta('labels.rippling') : null) ||
                        (isSelfPayment ? ta('transactions.swap') : null) ||
                        accountDeleteCollapsedLabel ||
                        (isDidTx ? didTxLabel : null) ||
                        setRegularKeyLabel ||
                        escrowCreateCollapsedLabel ||
                        checkCreateCollapsedLabel ||
                        checkActionCollapsedLabel ||
                        nftOfferLegacyLabel ||
                        nftMintSpecialLabel ||
                        fallbackTxTypeLabel
                      const txTypeCollapsedLabel = (() => {
                        if (
                          isSelfPayment ||
                          isAccountDeleteTx ||
                          isRipplingTransaction ||
                          isDidTx ||
                          isNftMintTx ||
                          isNftBurnTx ||
                          isNftOfferTx ||
                          isDexOfferTx ||
                          txType === 'EscrowCreate' ||
                          txType === 'CheckCreate' ||
                          txType === 'CheckCash' ||
                          txType === 'CheckCancel'
                        ) {
                          return txTypeShortLabel
                        }

                        if (tx?.TransactionType === 'TrustSet') {
                          return counterparty ? `${isSource ? ta('phrases.to') : ta('phrases.from')}` : ''
                        }

                        if (paymentCollapsedLabel) return paymentCollapsedLabel
                        if (counterparty)
                          return `${txTypeShortLabel} ${isSource ? ta('phrases.to') : ta('phrases.from')}`
                        return txTypeShortLabel
                      })()
                      const showBrokerInCollapsedTitle =
                        isBrokeredNftAccept &&
                        !!brokerAddress &&
                        (nftViewerRole === 'seller' || nftViewerRole === 'buyer')
                      const brokerCollapsedAction =
                        nftViewerRole === 'seller'
                          ? isFreeNftAccept
                            ? ta('transactions.transferred-nft-to-lower')
                            : ta('transactions.sold-nft-to-lower')
                          : nftViewerRole === 'buyer'
                            ? isFreeNftAccept
                              ? ta('transactions.received-nft-from-lower')
                              : ta('transactions.bought-nft-from-lower')
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
                      const collapsedTxTimeNode = (
                        <span className="tx-time tx-time-top">
                          {!!txHash && (
                            <Link
                              href={`/tx/${txHash}`}
                              className="tx-open-link tooltip tooltip-icon"
                              aria-label={ta('aria.open-transaction')}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MdOpenInNew aria-hidden="true" style={{ marginBottom: -1.5 }} />
                              <span className="tooltiptext left below no-brake">{ta('aria.open-transaction')}</span>
                            </Link>
                          )}
                          {tx?.date
                            ? timeOrDate(tx.date, 'ripple', { timeOnlyWithinHours: 24, dateWithTime: true })
                            : '-'}
                        </span>
                      )

                      return (
                        <div
                          className={`asset-item token-asset-item tx-asset-item ${isExpanded ? 'expanded' : ''} ${!isSuccessful ? 'tx-failed' : ''}`}
                          key={txKey}
                          onClick={() => setExpandedTransactionKey(isExpanded ? null : txKey)}
                        >
                          <div className="asset-main tx-asset-main">
                            <div className="asset-logo tx-asset-logo">
                              {!!nftPreviewData && !!nftPreviewId && (
                                <Link
                                  href={`/nft/${nftPreviewId}`}
                                  className="tx-nft-thumb"
                                  title={nftPreviewTitle}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <NftImage
                                    nft={nftPreviewData}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: '6px',
                                      verticalAlign: 'middle'
                                    }}
                                  />
                                </Link>
                              )}
                              <div className="tx-collapsed-body">
                                <div className="tx-collapsed-top">
                                  <span className="tx-type-main">
                                    {txTypeIconNode && <span className="tx-type-icon">{txTypeIconNode}</span>}
                                    {showBrokerInCollapsedTitle ? (
                                      <span className="tx-broker-stack">
                                        <span className="tx-broker-inline">
                                          <span>{ta('labels.broker')} </span>
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
                                  {collapsedTxTimeNode}
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
                                      {ta(
                                        dexCollapsedSequences.length > 1
                                          ? 'transactions.dex-order-numbers'
                                          : 'transactions.dex-order-number'
                                      )}
                                      {': '}
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
                                  {txType === 'SetRegularKey' && (
                                    <span className="tx-counterparty-inline">
                                      {setRegularKeyValue && (
                                        <AddressWithIconInline
                                          data={{
                                            address: setRegularKeyValue,
                                            addressDetails: setRegularKeyDetails || {}
                                          }}
                                          options={{ short: 6 }}
                                        />
                                      )}
                                    </span>
                                  )}
                                  {tx?.TransactionType !== 'TrustSet' &&
                                    txType !== 'SetRegularKey' &&
                                    !isSelfPayment &&
                                    !isRipplingTransaction &&
                                    !isDexOfferTx &&
                                    resolvedCounterpartyAddress && (
                                      <span
                                        className={`tx-counterparty-inline ${isNftOfferTx ? 'tx-nft-counterparty-inline' : ''}`}
                                      >
                                        {directionLabel && (
                                          <span className="tx-counterparty-label">{directionLabel} </span>
                                        )}
                                        <AddressWithIconInline
                                          data={{
                                            address: resolvedCounterpartyAddress,
                                            addressDetails: resolvedCounterpartyDetails || {}
                                          }}
                                          options={{ short: directionLabel ? 4 : 6 }}
                                        />
                                      </span>
                                    )}
                                </div>
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
                                  {ta('states.free')}
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
                                    <span className="tx-inline-more">
                                      {ta('counts.more', { count: collapsedMoreCount })}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="asset-details">
                              <div className="detail-row">
                                <span>{ta('labels.type')}:</span>
                                <span>{tx?.TransactionType}</span>
                              </div>

                              {showRelatedObjectInitiator && (
                                <div className="detail-row">
                                  <span>{ta('labels.initiator')}:</span>
                                  <span className="copy-inline">
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <AddressWithIconInline
                                        data={txdata?.specification?.source}
                                        options={{ short: 6, showAddress: true }}
                                      />
                                    </span>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={tx.Account} />
                                    </span>
                                  </span>
                                </div>
                              )}

                              {showDexSpecifiedOrderDetails && !!dexTakerGets && (
                                <div className="detail-row">
                                  <span>
                                    {dexOfferDirectionKey === 'sell'
                                      ? `${ta('labels.specified-sell-exactly')}:`
                                      : `${ta('labels.specified-pay-up-to')}:`}
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
                                    {dexOfferDirectionKey === 'sell'
                                      ? `${ta('labels.specified-receive-at-least')}:`
                                      : `${ta('labels.specified-receive-exactly')}:`}
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
                                  <span>{ta('labels.trading-fee')}:</span>
                                  <span>{ammVoteTradingFeeText}</span>
                                </div>
                              )}

                              {failedStatusText && (
                                <>
                                  <div className="detail-row">
                                    <span>{ta('labels.error-code')}:</span>
                                    <span className="orange">{failedStatusText}</span>
                                  </div>
                                  {failedPaymentAmountDisplay && (
                                    <div className="detail-row">
                                      <span>{ta('labels.amount')}:</span>
                                      <span className="tx-detail-stacked-amount">
                                        <span className="grey">{failedPaymentAmountDisplay.expandedText}</span>
                                        {!!failedPaymentAmountDisplay.expandedFiat && (
                                          <span className="tx-change-fiat">
                                            {failedPaymentAmountDisplay.expandedFiat}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  <div className="detail-row tx-fail-description-row">
                                    <span>{ta('labels.error')}:</span>
                                    <span className="orange tx-fail-description-text">
                                      {errorCodeDescription(failedStatusText, txErrorT) || failedStatusText}
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
                                        data={{
                                          address: resolvedCounterpartyAddress,
                                          addressDetails: resolvedCounterpartyDetails || {}
                                        }}
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
                                  <span>{ta('labels.by-broker')}:</span>
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
                                  <span>{ta('labels.destination-tag')}:</span>
                                  <span>{tx.DestinationTag}</span>
                                </div>
                              )}

                              {tx?.TransactionType === 'TrustSet' && trustSetToken && (
                                <>
                                  <div className="detail-row">
                                    <span>{ta('labels.currency')}:</span>
                                    <span className="copy-inline">
                                      <span>{trustSetCurrencyDisplay || '-'}</span>
                                      {!!trustSetToken?.issuer && !!trustSetToken?.currency && (
                                        <Link
                                          href={`/token/${trustSetToken.issuer}/${trustSetToken.currency}`}
                                          className="inline-link-icon tooltip"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <LinkIcon />
                                          <span className="tooltiptext no-brake">{ta('tooltips.token-page')}</span>
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
                                      <span>{ta('labels.issuer')}:</span>
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
                                    <span>{ta('labels.limit')}:</span>
                                    <span>{fullNiceNumber(trustSetToken?.value || 0)}</span>
                                  </div>
                                </>
                              )}

                              {txType === 'SetRegularKey' && (
                                <div className="detail-row">
                                  <span>{ta('labels.regular-key')}:</span>
                                  {setRegularKeyValue ? (
                                    <span className="copy-inline">
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <AddressWithIconInline
                                          data={{
                                            address: setRegularKeyValue,
                                            addressDetails: setRegularKeyDetails || {}
                                          }}
                                          options={{ short: 6 }}
                                        />
                                      </span>
                                      <span onClick={(event) => event.stopPropagation()}>
                                        <CopyButton text={setRegularKeyValue} />
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="orange">{ta('states.removed')}</span>
                                  )}
                                </div>
                              )}

                              {txType === 'AccountSet' && (
                                <>
                                  {tx?.MessageKey !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.message-key')}:</span>
                                      {accountSetSpec?.messageKey ? (
                                        <span className="copy-inline">
                                          <span className="address-text">{accountSetSpec.messageKey}</span>
                                          <span onClick={(event) => event.stopPropagation()}>
                                            <CopyButton text={accountSetSpec.messageKey} />
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="orange">{ta('states.removed')}</span>
                                      )}
                                    </div>
                                  )}

                                  {tx?.Domain !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.domain')}:</span>
                                      <span className="orange">{accountSetSpec?.domain || ta('states.removed')}</span>
                                    </div>
                                  )}

                                  {accountSetSpec?.defaultRipple !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.default-ripple')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.defaultRipple ? ta('states.enabled') : ta('states.disabled')}
                                      </span>
                                    </div>
                                  )}

                                  {(accountSetSpec?.disallowXRP !== undefined ||
                                    accountSetSettings?.disallowXRP !== undefined) && (
                                    <div className="detail-row">
                                      <span>Incoming {nativeCurrency}:</span>
                                      <span className="orange">
                                        {accountSetSpec?.disallowXRP || accountSetSettings?.disallowXRP
                                          ? ta('states.disallow')
                                          : ta('states.allow')}
                                      </span>
                                    </div>
                                  )}

                                  {(accountSetSpec?.requireDestTag !== undefined ||
                                    accountSetSettings?.requireDestTag !== undefined) && (
                                    <div className="detail-row">
                                      <span>{ta('labels.destination-tag')}:</span>
                                      <span className="orange">
                                        {accountSetSpec?.requireDestTag || accountSetSettings?.requireDestTag
                                          ? ta('states.require')
                                          : ta('states.do-not-require')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.depositAuth !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.deposit-authorization')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.depositAuth ? ta('states.enabled') : ta('states.disabled')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disableMaster !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.master-key')}:</span>
                                      <span className="red">
                                        {accountSetSpec.disableMaster ? ta('states.disabled') : ta('states.enabled')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.noFreeze && (
                                    <div className="detail-row">
                                      <span>{ta('labels.no-freeze')}:</span>
                                      <span className="orange">{ta('states.enabled')}</span>
                                    </div>
                                  )}

                                  {(accountSetSpec?.requireAuth !== undefined ||
                                    accountSetSettings?.requireAuth !== undefined) && (
                                    <div className="detail-row">
                                      <span>{ta('labels.require-authorization')}:</span>
                                      <span className="orange">
                                        {accountSetSpec?.requireAuth || accountSetSettings?.requireAuth
                                          ? ta('states.enabled')
                                          : ta('states.disabled')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingCheck !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.incoming-check')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingCheck
                                          ? ta('states.disallow')
                                          : ta('states.allow')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingPayChan !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.incoming-payment-channel')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingPayChan
                                          ? ta('states.disallow')
                                          : ta('states.allow')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingNFTokenOffer !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.incoming-nft-offer')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingNFTokenOffer
                                          ? ta('states.disallow')
                                          : ta('states.allow')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingTrustline !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.incoming-trustline')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingTrustline
                                          ? ta('states.disallow')
                                          : ta('states.allow')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.enableTransactionIDTracking !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.transaction-id-tracking')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.enableTransactionIDTracking
                                          ? ta('states.enabled')
                                          : ta('states.disabled')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.globalFreeze !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.global-freeze')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.globalFreeze ? ta('states.enabled') : ta('states.disabled')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.authorizedMinter !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.authorized-minter')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.authorizedMinter ? ta('states.enabled') : ta('states.disabled')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.nftokenMinter !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('sections.nft-minter')}:</span>
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
                                        <span className="orange">{ta('states.removed')}</span>
                                      )}
                                    </div>
                                  )}

                                  {accountSetSpec?.allowTrustLineClawback !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.trustline-clawback')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.allowTrustLineClawback
                                          ? ta('states.allowed')
                                          : ta('states.disallow')}
                                      </span>
                                    </div>
                                  )}

                                  {accountSetSpec?.disallowIncomingRemit !== undefined && (
                                    <div className="detail-row">
                                      <span>{ta('labels.incoming-remit')}:</span>
                                      <span className="orange">
                                        {accountSetSpec.disallowIncomingRemit
                                          ? ta('states.disallow')
                                          : ta('states.allow')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {isDidTx && (
                                <>
                                  {!!didStatusLabel && (
                                    <div className="detail-row">
                                      <span>{ta('labels.status')}:</span>
                                      <span className="orange">{didStatusLabel}</span>
                                    </div>
                                  )}

                                  {!!didId && (
                                    <div className="detail-row">
                                      <span>{ta('labels.did-id')}:</span>
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
                                      <span>{ta('labels.removed-uri')}:</span>
                                      <span className="brake" title={didOriginalUri}>
                                        {didOriginalUri}
                                      </span>
                                    </div>
                                  )}

                                  {isDidSetTx && didStatus === 'modified' && !!didOriginalUri && (
                                    <div className="detail-row">
                                      <span>{ta('labels.previous-uri')}:</span>
                                      <span className="brake" title={didOriginalUri}>
                                        {didOriginalUri}
                                      </span>
                                    </div>
                                  )}

                                  {isDidSetTx && didStatus === 'modified' && !!didUpdatedUri && (
                                    <div className="detail-row">
                                      <span>{ta('labels.updated-uri')}:</span>
                                      <span className="brake" title={didUpdatedUri}>
                                        {didUpdatedUri}
                                      </span>
                                    </div>
                                  )}

                                  {isDidSetTx && didStatus !== 'modified' && !!(didUpdatedUri || didOriginalUri) && (
                                    <div className="detail-row">
                                      <span>{ta('labels.uri')}:</span>
                                      <span className="brake" title={didUpdatedUri || didOriginalUri}>
                                        {didUpdatedUri || didOriginalUri}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              <div className="detail-row">
                                <span>{ta('labels.timestamp')}:</span>
                                <span>{tx?.date ? fullDateAndTime(tx.date, 'ripple') : '-'}</span>
                              </div>

                              {!!selectedCurrency &&
                                !isRipplingTransaction &&
                                (shouldShowExpandedRate || isDexOfferTx) &&
                                !hasDexOfferRates && (
                                  <div className="detail-row">
                                    <span>{ta('labels.rate')}:</span>
                                    <span suppressHydrationWarning>
                                      {txHistoricalRate
                                        ? `1 ${nativeCurrency} = ${shortNiceNumber(txHistoricalRate, 2, 1, selectedCurrency)}`
                                        : '-'}
                                    </span>
                                  </div>
                                )}

                              {isSource && (tx?.Sequence || tx?.TicketSequence) && (
                                <div className="detail-row">
                                  <span>
                                    {tx?.TicketSequence
                                      ? `${ta('labels.ticket-sequence')}:`
                                      : `${ta('labels.sequence')}:`}
                                  </span>
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
                                      <span>{ta('labels.fee')}:</span>
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
                                  <span>{ta('labels.amount')}:</span>
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
                                  <span>{ta('labels.app-dapp')}:</span>
                                  <span>{txDapp}</span>
                                </div>
                              )}

                              {txdata?.specification?.memos &&
                                memoNode(txdata.specification.memos, 'detail', { memoLabel: t('table.memo') })}

                              {changes.length > 0 && (
                                <div className="detail-row tx-detail-change-row">
                                  <span>{ta('labels.balance-changes')}:</span>
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
                                  <span>{ta('labels.rates')}:</span>
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

                              {nftPreviewId && (
                                <div className="detail-row">
                                  <span>NFT:</span>
                                  <span className="copy-inline">
                                    <Link href={`/nft/${nftPreviewId}`} onClick={(event) => event.stopPropagation()}>
                                      {shortHash(nftPreviewId)}
                                    </Link>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={nftPreviewId} />
                                    </span>
                                  </span>
                                </div>
                              )}

                              {!!nftPreviewData && !!nftPreviewId && (
                                <div className="tx-nft-expanded-preview" onClick={(event) => event.stopPropagation()}>
                                  <Link href={`/nft/${nftPreviewId}`} className="nft-expanded-preview-link">
                                    <NftImage
                                      nft={nftPreviewData}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '10px',
                                        verticalAlign: 'middle'
                                      }}
                                    />
                                  </Link>
                                  {!!nftPreviewTitle && (
                                    <div className="tx-nft-expanded-title" title={nftPreviewTitle}>
                                      {nftPreviewTitle}
                                    </div>
                                  )}
                                </div>
                              )}

                              {nftOfferIds.length > 0 && (
                                <div className="detail-row">
                                  <span>
                                    {nftOfferIds.length > 1 ? `${ta('labels.offers')}:` : `${ta('labels.offer')}:`}
                                  </span>
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
                                  <span>{ta('labels.offer-amount')}:</span>
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
                                  <span>{ta('labels.offer-amount')}:</span>
                                  <span className="tx-detail-stacked-amount">
                                    <span className="tx-inline-change">{nftMintSellOfferDisplay.expandedText}</span>
                                    {!!nftMintSellOfferDisplay.expandedFiat && (
                                      <span className="tx-change-fiat">{nftMintSellOfferDisplay.expandedFiat}</span>
                                    )}
                                  </span>
                                </div>
                              )}

                              <div className="detail-row">
                                <span>{ta('labels.hash')}:</span>
                                <span className="copy-inline">
                                  {txHash ? (
                                    <Link
                                      href={`/tx/${txHash}`}
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

                              {!!txHash && (
                                <div className="tx-expanded-actions" onClick={(event) => event.stopPropagation()}>
                                  <Link
                                    href={`/tx/${txHash}`}
                                    className="button-action thin narrow tx-view-transaction-button"
                                  >
                                    <MdOpenInNew aria-hidden="true" />
                                    {ta('actions.view-transaction')}
                                  </Link>
                                </div>
                              )}
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
                                  {ta('states.loading')}
                                  <span className="waiting inline" aria-hidden="true"></span>
                                </>
                              ) : (
                                ta('actions.load-more-transactions')
                              )}
                            </button>
                          ) : (
                            <span className="tx-mobile-end-label">{ta('messages.end-of-list')}</span>
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
                {objectsLoading || accountObjectsLoadingMore ? (
                  <span className="tx-inline-load object-load-status-text">
                    <span>{ta('messages.loading-account-objects')}</span>
                    <span className="waiting inline" aria-hidden="true"></span>
                  </span>
                ) : objectsError ? (
                  <span className="object-load-status-text">{ta('errors.failed-load-account-objects-sections')}</span>
                ) : (
                  <>
                    <span className="object-load-status-text">
                      {ta('messages.loaded-account-objects', { count: accountObjectsLoaded.length })}
                    </span>
                    <button type="button" className="asset-compact-toggle" onClick={loadMoreAccountObjects}>
                      {ta('actions.load-more')}
                    </button>
                  </>
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
                  {ta('sections.issuer-settings')}
                  <span className={`account-control-collapsed`}> · {issuerSettingsCollapsedLabel}</span>
                </button>

                {showIssuerSettingsDetails && (
                  <div className="time-machine-panel issuer-settings-panel">
                    <div className="detail-row issuer-detail-row">
                      <span>{ta('labels.rippling')}:</span>
                      <span className={isRipplingEnabled ? 'green' : 'grey'}>
                        {isRipplingEnabled ? ta('states.enabled') : ta('states.disabled')}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>{ta('labels.transfer-fee')}:</span>
                      <span>{issuerTransferFeeText}</span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>Escrow:</span>
                      <span className={isCanEscrowEnabled ? 'green' : 'grey'}>
                        {isCanEscrowEnabled ? ta('states.enabled') : ta('states.disabled')}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>Clawback:</span>
                      <span className={isTrustlineClawbackEnabled && 'bold'}>
                        {isTrustlineClawbackEnabled ? ta('states.enabled') : ta('states.disabled')}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>{ta('labels.global-freeze')}:</span>
                      <span className={isGlobalFreezeEnabled && 'bold'}>
                        {isGlobalFreezeEnabled ? ta('states.true') : ta('states.false')}
                      </span>
                    </div>
                    <div className="detail-row issuer-detail-row">
                      <span>{ta('labels.no-freeze')}:</span>
                      <span className={isNoFreezeEnabled && 'bold'}>
                        {isNoFreezeEnabled ? ta('states.enabled') : ta('states.not-set')}
                      </span>
                    </div>
                    <div className="card-actions issuer-settings-actions">
                      <button
                        type="button"
                        className="card-action-btn"
                        onClick={() => router.push('/services/account-settings')}
                        title={ta('sections.account-settings')}
                      >
                        <FaGear />
                        {ta('sections.account-settings')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(issuedTokensLoading || issuedTokensError || issuedTokens.length > 0) && (
              <>
                <div className="section-header-row">
                  <span className="section-title">{ta('sections.issued-tokens')}</span>
                  {data?.address && (
                    <Link className="section-link" href={`/tokens?issuer=${data.address}`}>
                      {ta('actions.view-all')}
                    </Link>
                  )}
                </div>

                {issuedTokensLoading && <p className="grey">{ta('messages.loading-issued-tokens')}</p>}
                {!issuedTokensLoading && issuedTokensError && <p className="red">{issuedTokensError}</p>}

                {!issuedTokensLoading &&
                  !issuedTokensError &&
                  issuedTokens.map((token, index) => {
                    const tokenStats = token.statistics || {}
                    const tokenSupply = Number(token.supply || 0)
                    const tokenPriceNative = issuedTokenSpotPrice(token)
                    const tokenPriceFiat = tokenPriceNative * (pageFiatRate || 0)
                    const tokenMarketcap = issuedTokenValueNative(token)
                    const tokenMarketcapFiat = tokenMarketcap * (pageFiatRate || 0)
                    const tokenVolume24h = Number(tokenStats.buyVolume || 0) + Number(tokenStats.sellVolume || 0)
                    const tokenVolume24hFiat = tokenVolume24h * tokenPriceNative * (pageFiatRate || 0)
                    const tokenKey = `${token.currency || 'token'}-${index}`
                    const issuedTokenCurrencyCode = token.currency
                    const issuedTokenCurrencyCodeDisplay =
                      issuedTokenCurrencyCode?.replace(/0+$/, '') || issuedTokenCurrencyCode
                    const issuedTokenPageUrl = `/token/${data.address}/${issuedTokenCurrencyCode}`
                    const issuedTokenDistributionUrl = `/distribution?currencyIssuer=${data.address}&currency=${issuedTokenCurrencyCode}`
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
                            <div className="asset-fiat">
                              {ta('labels.supply')}: {shortNiceNumber(tokenSupply)}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="asset-details">
                            <div className="detail-row">
                              <span>{ta('labels.currency')}:</span>
                              <span className="copy-inline">
                                <span>{issuedTokenCurrencyCodeDisplay}</span>
                                <span onClick={(event) => event.stopPropagation()}>
                                  <CopyButton text={issuedTokenCurrencyCode} />
                                </span>
                              </span>
                            </div>

                            <div className="detail-row">
                              <span>{ta('labels.distribution')}:</span>
                              <span>
                                <Link href={issuedTokenDistributionUrl} onClick={(event) => event.stopPropagation()}>
                                  {ta('actions.view-token-distribution')}
                                </Link>
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
                              <span>{ta('labels.marketcap')}:</span>
                              <span suppressHydrationWarning>
                                {tokenMarketcapFiat > 0
                                  ? shortNiceNumber(tokenMarketcapFiat, 2, 1, selectedCurrency)
                                  : shortNiceNumber(tokenMarketcap, 2, 1)}
                              </span>
                            </div>

                            <div className="detail-row">
                              <span>{ta('labels.supply')}:</span>
                              <span>{fullNiceNumber(tokenSupply)}</span>
                            </div>

                            <div className="detail-row">
                              <span>{ta('labels.holders')}:</span>
                              <span>{fullNiceNumber(token.holders || 0)}</span>
                            </div>

                            <div className="detail-row">
                              <span>Trustlines:</span>
                              <span>{fullNiceNumber(token.trustlines || 0)}</span>
                            </div>

                            <div className="detail-row">
                              <span>{ta('labels.volume-24h')}:</span>
                              <span suppressHydrationWarning>
                                {tokenVolume24hFiat > 0
                                  ? shortNiceNumber(tokenVolume24hFiat, 2, 1, selectedCurrency)
                                  : shortNiceNumber(tokenVolume24h, 2, 1)}
                              </span>
                            </div>

                            <div className="detail-row">
                              <span>{ta('labels.volume-24h-token')}:</span>
                              <span>
                                {shortNiceNumber(tokenVolume24h, 2, 1)} {niceCurrency(token.currency)}
                              </span>
                            </div>

                            <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                className="card-action-btn token-page"
                                onClick={() => router.push(issuedTokenPageUrl)}
                              >
                                <MdOpenInNew style={{ fontSize: 15, marginBottom: -2 }} />{' '}
                                {ta('actions.token-page')}
                              </button>
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
                    {ta('sections.issued-mpts')} <span className="object-title-count">{issuedMpts.length}</span>
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
                    const issuanceId = mptId(mptNode)
                    const remainingSupply = maxSupply === null ? null : subtract(maxSupply, outstanding)
                    const canSendIssuedMpt =
                      !!setSignRequest && !!account?.address && isOwnAccount && !effectiveLedgerTimestamp && !!issuanceId
                    const disabledSendIssuedMptTooltip = canSendIssuedMpt
                      ? ''
                      : !setSignRequest || !account?.address
                        ? ta('tooltips.login-required')
                        : !isOwnAccount
                          ? ta('tooltips.viewed-account-only')
                          : ta('tooltips.historical-unavailable')

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
                            <div className="asset-fiat">{ta('labels.outstanding')}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="asset-details">
                            <div className="detail-row">
                              <span>{ta('labels.mpt-id')}:</span>
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
                              <span>{ta('labels.outstanding')}:</span>
                              <span>{fullNiceNumber(outstanding)}</span>
                            </div>
                            <div className="detail-row">
                              <span>{ta('labels.max-supply')}:</span>
                              <span>{maxSupply === null ? ta('states.not-set') : fullNiceNumber(maxSupply)}</span>
                            </div>
                            <div className="detail-row">
                              <span>{ta('labels.transfer-fee')}:</span>
                              <b>{mptTransferFeeText(mptNode)}</b>
                            </div>
                            {!!issuanceId && (
                              <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="card-action-btn token-page"
                                  onClick={() => router.push(`/token/${issuanceId}`)}
                                >
                                  <MdOpenInNew style={{ fontSize: 15, marginBottom: -2 }} />{' '}
                                  {ta('actions.token-page')}
                                </button>
                                <span className={disabledSendIssuedMptTooltip ? 'tooltip' : ''}>
                                  <button
                                    type="button"
                                    className={`card-action-btn ${canSendIssuedMpt ? 'redeem' : 'disabled'}`}
                                    disabled={!canSendIssuedMpt}
                                    onClick={() => {
                                      if (!canSendIssuedMpt) return
                                      setSignRequest({
                                        action: 'payment',
                                        redirect: 'account',
                                        request: {
                                          TransactionType: 'Payment',
                                          Account: data?.address,
                                          Amount: { mpt_issuance_id: issuanceId, value: '0' },
                                          Flags: 131072
                                        },
                                        data: {
                                          mptokenIssuanceID: issuanceId,
                                          mptAssetScale: mptNode?.AssetScale || 0,
                                          issuer: mptNode?.Issuer || data?.address,
                                          transferFee: mptNode?.TransferFee ?? mptNode?.transferFee,
                                          currencyCode:
                                            mptNode?.metadata?.t ||
                                            mptNode?.metadata?.ticker ||
                                            mptNode?.mptokenCurrencyDetails?.metadata?.t ||
                                            mptNode?.mptokenCurrencyDetails?.metadata?.ticker ||
                                            'MPT',
                                          ...(remainingSupply !== null ? { balance: String(remainingSupply) } : {})
                                        }
                                      })
                                    }}
                                  >
                                    <MdNorth style={{ fontSize: 16, marginBottom: -2 }} /> {ta('actions.send')}
                                  </button>
                                  {!!disabledSendIssuedMptTooltip && (
                                    <span className="tooltiptext left">{disabledSendIssuedMptTooltip}</span>
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
              </>
            )}

            {hasDexOrders && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">
                    {ta('sections.dex-orders')} <span className="object-title-count">{activeDexOrdersList.length}</span>
                  </div>
                  {data?.address && (
                    <Link className="section-link" href={`/account/${data.address}/dex`}>
                      {ta('actions.view-all')}
                    </Link>
                  )}
                </div>

                {showDexOrdersTabs && (
                  <div className="object-tab-row object-tab-row-outside">
                    <div className="object-tab-switch">
                      <button
                        type="button"
                        className={`object-tab-btn ${activeDexOrdersTab === 'active' ? 'active' : ''}`}
                        onClick={() => setDexOrdersTab('active')}
                      >
                        {ta('tabs.active')} ({activeDexOrders.length})
                      </button>
                      <button
                        type="button"
                        className={`object-tab-btn ${activeDexOrdersTab === 'expired' ? 'active' : ''}`}
                        onClick={() => setDexOrdersTab('expired')}
                      >
                        {ta('tabs.expired')} ({expiredDexOrders.length})
                      </button>
                    </div>
                  </div>
                )}

                <div className="cards-list">
                  {dexOrdersPreview.map((offer, index) => {
                    const orderKey = `${activeDexOrdersTab}-${offer?.index || 'offer'}-${index}`
                    const isExpanded = expandedDexOrderKey === orderKey
                    const isSell = !!offer?.flags?.sell
                    const offerSequence = offerSequenceValue(offer)
                    const hasCancelableSequence = isCancelableOfferSequence(offerSequence)
                    const cancelOfferFields = offerCancelFields(offer)
                    const expirationValue = offerExpirationValue(offer)
                    const isExpired = isOfferExpired(offer)
                    const collapsedOfferId = offer?.index ? shortHash(offer.index) : '-'
                    const baseAmount = isSell ? offer?.TakerGets : offer?.TakerPays
                    const quoteAmount = isSell ? offer?.TakerPays : offer?.TakerGets
                    const collapsedMainLabel = isSell ? ta('tabs.selling') : ta('tabs.buying')
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
                    const expirationRelativeText = expirationValue
                      ? timeFromNow(expirationValue, i18n, 'ripple')
                      : ta('states.does-not-expire')
                    const expirationExactText = expirationValue ? fullDateAndTime(expirationValue, 'ripple') : null
                    const offerStatusText = isExpired ? ta('tabs.expired') : offerDateText
                    const canCancelDexOrder =
                      !!setSignRequest &&
                      !effectiveLedgerTimestamp &&
                      !!cancelOfferFields &&
                      offer?.Account === account?.address

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
                              <span className={`escrow-time-top ${isExpired ? 'red' : ''}`}>{offerStatusText}</span>
                            </div>
                            <div className="tx-collapsed-meta">
                              <span className="tx-accountset-inline">
                                {ta('phrases.for')} {collapsedSecondary}
                              </span>
                            </div>
                          </div>
                          <div className="asset-value tx-collapsed-change escrow-collapsed-amount">
                            <span className="tx-inline-change grey">
                              {hasCancelableSequence ? `#${offerSequence}` : collapsedOfferId}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="asset-details">
                            <div className="detail-row">
                              <span>{isSell ? `${ta('tabs.selling')}:` : `${ta('labels.wants-to-buy')}:`}</span>
                              <span>
                                {amountFormat(isSell ? offer?.TakerGets : offer?.TakerPays, {
                                  icon: true,
                                  withIssuer: true,
                                  precise: 'nice'
                                })}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>
                                {isSell ? `${ta('labels.wants-at-least')}:` : `${ta('labels.can-pay-maximum')}:`}
                              </span>
                              <span>
                                {amountFormat(isSell ? offer?.TakerPays : offer?.TakerGets, {
                                  icon: true,
                                  withIssuer: true,
                                  precise: 'nice'
                                })}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>{ta('labels.rate')}:</span>
                              <span>{rateText}</span>
                            </div>
                            <div className="detail-row">
                              <span>{ta('labels.expiration')}:</span>
                              <span className={isExpired ? 'red' : ''}>
                                {isExpired && <>{ta('tabs.expired')} (</>}
                                {expirationRelativeText}
                                {isExpired && ')'}
                                {expirationExactText && <> ({expirationExactText})</>}
                              </span>
                            </div>
                            <div className="detail-row">
                              <span>{ta('labels.sequence')}:</span>
                              <span>{hasCancelableSequence ? offerSequence : ta('states.not-set')}</span>
                            </div>
                            <div className="detail-row">
                              <span>{ta('labels.offer-id')}:</span>
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
                                      <span className="tooltiptext no-brake">{ta('tooltips.object-page')}</span>
                                    </Link>
                                    <span onClick={(event) => event.stopPropagation()}>
                                      <CopyButton text={offer.index} />
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>

                            {!!offer?.PreviousTxnID && (
                              <div className="detail-row">
                                <span>{ta('actions.view-transaction')}:</span>
                                <span onClick={(event) => event.stopPropagation()}>
                                  <Link href={`/tx/${offer.PreviousTxnID}`}>{shortHash(offer.PreviousTxnID)}</Link>
                                </span>
                              </div>
                            )}

                            {!effectiveLedgerTimestamp &&
                              cancelOfferFields &&
                              (!isExpired || canCancelDexOrder) && (
                                <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                                  {(() => {
                                    const canCancel = canCancelDexOrder
                                    const disabledCancelDexOrderTooltip = (() => {
                                      if (canCancel) return ''
                                      if (!setSignRequest) return ta('tooltips.connect-cancel-dex-order')
                                      if (!account?.address) return ta('tooltips.connect-cancel-dex-order')
                                      if (!offer?.Account) return ta('tooltips.offer-owner-unknown')
                                      if (offer.Account !== account.address)
                                        return ta('tooltips.only-offer-owner-cancel')
                                      return ta('tooltips.dex-order-cannot-cancel')
                                    })()
                                    return (
                                      <span className={disabledCancelDexOrderTooltip ? 'tooltip' : ''}>
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
                                                ...cancelOfferFields
                                              }
                                            })
                                          }}
                                          title={ta('actions.cancel')}
                                        >
                                          <MdMoneyOff /> {ta('actions.cancel')}
                                        </button>
                                        {!!disabledCancelDexOrderTooltip && (
                                          <span className="tooltiptext left">{disabledCancelDexOrderTooltip}</span>
                                        )}
                                      </span>
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
                            Math.min(activeDexOrdersList.length, currentLimit + DEX_ORDERS_LOAD_MORE_STEP)
                          )
                        }
                      >
                        {ta('actions.show-more-dex-orders', {
                          count: Math.min(DEX_ORDERS_LOAD_MORE_STEP, dexOrdersRemainingCount)
                        })}
                      </button>
                    )}
                    {dexOrdersShowMoreAvailable && (
                      <button
                        type="button"
                        className="asset-compact-toggle"
                        onClick={() => setDexOrdersDisplayLimit(activeDexOrdersList.length)}
                      >
                        {ta('actions.show-all-dex-orders')} (+{dexOrdersRemainingCount})
                      </button>
                    )}
                    {showDexOrdersFewerButton && (
                      <button
                        type="button"
                        className="asset-compact-toggle"
                        onClick={() => setDexOrdersDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                      >
                        {ta('actions.show-fewer-dex-orders')}
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
                        {ta('tabs.received')}
                      </button>
                      <button
                        type="button"
                        className={`object-tab-btn ${checksTab === 'sent' ? 'active' : ''}`}
                        onClick={() => setChecksTab('sent')}
                      >
                        {ta('tabs.sent')}
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
                        const isSendMaxTokenObject = typeof check?.SendMax === 'object' && check?.SendMax !== null
                        const sendMaxToken = isSendMaxTokenObject ? check.SendMax : { currency: nativeCurrency }
                        const sendMaxRawValue = isSendMaxTokenObject ? check?.SendMax?.value : check?.SendMax
                        const sendMaxDisplayValue = isSendMaxTokenObject
                          ? sendMaxRawValue
                          : (Number(sendMaxRawValue) || 0) / 1000000
                        const sendMaxAmountOnly = fullNiceNumber(sendMaxDisplayValue)
                        const sendMaxAmountForFiat = isSendMaxTokenObject
                          ? { ...check.SendMax, priceNativeCurrencySpot: check.priceNativeCurrencySpot }
                          : check.SendMax
                        const hasSendMaxSpotPrice =
                          isSendMaxTokenObject && Object.prototype.hasOwnProperty.call(check, 'priceNativeCurrencySpot')
                        const sendMaxSpotPrice = hasSendMaxSpotPrice ? Number(check.priceNativeCurrencySpot) || 0 : null
                        const sendMaxFiatText = tokenToFiat({
                          amount: sendMaxAmountForFiat,
                          selectedCurrency,
                          fiatRate: tokenFiatRate,
                          asText: true,
                          absolute: true
                        })
                        const isReceivedCheck = activeChecksTab === 'received'
                        const collapsedSendMaxText = isReceivedCheck
                          ? `+${shortNiceNumber(sendMaxDisplayValue)}`
                          : sendMaxAmountOnly
                        const sentAtValue = check?.previousTxAt || check?.createdAt
                        const sentAtText = sentAtValue ? timeFromNow(sentAtValue, i18n) : '-'
                        const expirationValue = check?.Expiration
                        const expirationText = expirationValue ? timeFromNow(expirationValue, i18n, 'ripple') : null
                        const isExpired = Boolean(expirationValue && timestampExpired(expirationValue, 'ripple'))
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
                          if (!setSignRequest) return ta('tooltips.connect-redeem-check')
                          if (isExpired) return ta('tooltips.check-expired')
                          if (!account?.address) return ta('tooltips.connect-redeem-check')
                          if (check?.Destination && check.Destination !== account.address) {
                            return ta('tooltips.only-destination-redeem')
                          }
                          return ta('tooltips.check-cannot-redeem')
                        })()
                        const disabledCancelCheckTooltip = (() => {
                          if (canCancel) return ''
                          if (!setSignRequest) return ta('tooltips.connect-cancel-check')
                          if (!account?.address) return ta('tooltips.connect-cancel-check')
                          if (
                            !isExpired &&
                            check?.Destination !== account.address &&
                            check?.Account !== account.address
                          ) {
                            return ta('tooltips.only-source-destination-cancel')
                          }
                          return ta('tooltips.check-cannot-cancel')
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
                                <div className={`asset-amount ${isReceivedCheck ? 'grey' : ''}`}>
                                  {collapsedSendMaxText}
                                </div>
                                {isExpired ? (
                                  <div className="asset-fiat red">{ta('tabs.expired')}</div>
                                ) : sendMaxFiatText ? (
                                  <div className="asset-fiat" suppressHydrationWarning>
                                    {sendMaxFiatText}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="asset-details">
                                {hasSendMaxSpotPrice && (
                                  <>
                                    <div className="detail-row">
                                      <span>Rate ({nativeCurrency}):</span>
                                      <span>
                                        1 {niceCurrency(check.SendMax?.currency)} ={' '}
                                        {shortNiceNumber(sendMaxSpotPrice, 6, 6)} {nativeCurrency}
                                      </span>
                                    </div>
                                    {tokenFiatRate && selectedCurrency ? (
                                      <div className="detail-row">
                                        <span>Rate ({selectedCurrency?.toUpperCase()}):</span>
                                        <span>
                                          1 {niceCurrency(check.SendMax?.currency)} ={' '}
                                          <span className="tooltip no-brake" suppressHydrationWarning>
                                            {shortNiceNumber(sendMaxSpotPrice * tokenFiatRate, 2, 1, selectedCurrency)}
                                            <span className="tooltiptext no-brake" suppressHydrationWarning>
                                              {niceNumber(sendMaxSpotPrice * tokenFiatRate, null, selectedCurrency, 8)}
                                            </span>
                                          </span>
                                        </span>
                                      </div>
                                    ) : null}
                                  </>
                                )}
                                <div className="detail-row">
                                  <span>{ta('labels.amount')}:</span>
                                  <span className="amount-with-fiat">
                                    <span className="no-brake">{sendMaxAmountOnly}</span>
                                    {sendMaxFiatText && (
                                      <span className="fiat-line" suppressHydrationWarning>
                                        {sendMaxFiatText}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span>{ta('tabs.sent')}:</span>
                                  <span>{sentAtText}</span>
                                </div>
                                <div className="detail-row">
                                  <span>{activeChecksTab === 'sent' ? ta('labels.to') : ta('labels.from')}:</span>
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
                                    <span>{ta('labels.destination-tag')}:</span>
                                    <span>{check.DestinationTag}</span>
                                  </div>
                                )}
                                {expirationValue ? (
                                  <div className="detail-row">
                                    <span>{ta('labels.expiration')}:</span>
                                    <span className={isExpired ? 'red' : ''}>{expirationText}</span>
                                  </div>
                                ) : null}
                                <div className="detail-row">
                                  <span>{ta('labels.check-id')}:</span>
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
                                        <TbPigMoney /> {ta('actions.redeem')}
                                      </button>
                                      {!!disabledRedeemCheckTooltip && (
                                        <span className="tooltiptext left">{disabledRedeemCheckTooltip}</span>
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
                                        <MdMoneyOff /> {ta('actions.cancel')}
                                      </button>
                                      {!!disabledCancelCheckTooltip && (
                                        <span className="tooltiptext left">{disabledCancelCheckTooltip}</span>
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
                            {ta('actions.show-more-checks', {
                              count: Math.min(OBJECT_LOAD_MORE_STEP, activeChecksRemainingCount)
                            })}
                          </button>
                        )}
                        {activeChecksShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setChecksDisplayLimit(activeChecksList.length)}
                          >
                            {ta('actions.show-all-checks')}
                          </button>
                        )}
                        {showChecksFewerButton && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setChecksDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                          >
                            {ta('actions.show-fewer-checks')}
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
                          {ta('tabs.self')}
                        </button>
                      )}
                      {hasReceivedEscrows && (
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'received' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('received')}
                        >
                          {ta('tabs.incoming')}
                        </button>
                      )}
                      {hasSentEscrows && (
                        <button
                          type="button"
                          className={`object-tab-btn ${escrowsTab === 'sent' ? 'active' : ''}`}
                          onClick={() => setEscrowsTab('sent')}
                        >
                          {ta('tabs.outgoing')}
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
                          : ta('states.not-set')
                        const cancelAfterFullText = escrow?.CancelAfter
                          ? fullDateAndTime(escrow.CancelAfter, 'ripple')
                          : ta('states.not-set')
                        const finishAfterText = escrow?.FinishAfter
                          ? timeFromNow(escrow.FinishAfter, i18n, 'ripple')
                          : ta('states.not-set')
                        const finishAfterFullText = escrow?.FinishAfter
                          ? fullDateAndTime(escrow.FinishAfter, 'ripple')
                          : ta('states.not-set')
                        const isCanceled = escrow?.CancelAfter ? timestampExpired(escrow.CancelAfter, 'ripple') : false
                        const isUnlockable = escrow?.FinishAfter
                          ? timestampExpired(escrow.FinishAfter, 'ripple')
                          : false
                        const escrowSequence = escrow?.escrowSequence
                        const cancelEscrowFields = escrowCancelFields(escrow)
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
                          !!cancelEscrowFields &&
                          !!escrow?.CancelAfter &&
                          timestampExpired(escrow.CancelAfter, 'ripple')
                        const disabledExecuteEscrowTooltip = (() => {
                          if (canExecute) return ''
                          if (!setSignRequest) return ta('tooltips.connect-execute-escrow')
                          if (!escrow?.FinishAfter) return ta('tooltips.escrow-no-unlock-time')
                          if (!timestampExpired(escrow.FinishAfter, 'ripple')) return ta('tooltips.escrow-still-locked')
                          if (escrow?.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple')) {
                            return ta('tooltips.escrow-expired')
                          }
                          return ta('tooltips.escrow-cannot-execute')
                        })()
                        const disabledCancelEscrowTooltip = (() => {
                          if (canCancel) return ''
                          if (!setSignRequest) return ta('tooltips.connect-cancel-escrow')
                          if (!escrow?.CancelAfter) return ta('tooltips.escrow-cannot-cancel')
                          if (!timestampExpired(escrow.CancelAfter, 'ripple'))
                            return ta('tooltips.escrow-not-cancellable-yet')
                          return ta('tooltips.escrow-cannot-cancel')
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
                        const collapsedDirectionLabel = isSelfEscrow
                          ? ''
                          : isOutgoingEscrow
                            ? ta('labels.to')
                            : ta('labels.from')
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
                                  <span className="tx-type-main">Escrow</span>
                                  <span
                                    className={`tx-time tx-time-top ${isCanceled ? 'red' : isUnlockable ? 'green' : ''}`}
                                  >
                                    {collapsedTimeText}
                                  </span>
                                </div>

                                <div className="tx-collapsed-meta">
                                  {!isSelfEscrow && <span className="escrow-direction-label">{collapsedDirectionLabel}</span>}
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
                                    <span>{activeEscrowsTab === 'sent' ? ta('labels.to') : ta('labels.from')}:</span>
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
                                  <span>{ta('labels.expire')}:</span>
                                  <span
                                    className={
                                      escrow?.CancelAfter && timestampExpired(escrow.CancelAfter, 'ripple') ? 'red' : ''
                                    }
                                  >
                                    {cancelAfterFullText}
                                  </span>
                                </div>

                                <div className="detail-row">
                                  <span>{ta('labels.unlock')}:</span>
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
                                  <span>{ta('labels.amount')}:</span>
                                  <span>
                                    {amountFormat(escrow?.Amount, { precise: 'nice' })}
                                    {!isSelfEscrow && expandedAmountFiatNode}
                                  </span>
                                </div>

                                <div className="detail-row">
                                  <span>{ta('labels.escrow-id')}:</span>
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
                                          <span className="tooltiptext no-brake">{ta('tooltips.object-page')}</span>
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
                                        <TbPigMoney /> {ta('actions.execute')}
                                      </button>
                                      {!!disabledExecuteEscrowTooltip && (
                                        <span className="tooltiptext left">{disabledExecuteEscrowTooltip}</span>
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
                                              ...cancelEscrowFields
                                            }
                                          })
                                        }}
                                      >
                                        <MdMoneyOff /> {ta('actions.cancel')}
                                      </button>
                                      {!!disabledCancelEscrowTooltip && (
                                        <span className="tooltiptext left">{disabledCancelEscrowTooltip}</span>
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
                            {ta('actions.show-more-escrows', {
                              count: Math.min(OBJECT_LOAD_MORE_STEP, activeEscrowsRemainingCount)
                            })}
                          </button>
                        )}
                        {activeEscrowsShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setEscrowsDisplayLimit(activeEscrowsList.length)}
                          >
                            {ta('actions.show-all-escrows')}
                          </button>
                        )}
                        {showEscrowsFewerButton && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setEscrowsDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                          >
                            {ta('actions.show-fewer-escrows')}
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
                  <div className="section-title nft-section-title">{ta('sections.nft-offers')}</div>
                  {data?.address && activeNftOffersCount > 0 && (
                    <Link className="section-link" href={activeNftOffersViewAllHref}>
                      {ta('actions.view-all')}
                    </Link>
                  )}
                </div>

                <div className="nft-tab-row nft-tab-row-outside">
                  <div className="nft-tab-switch nft-offers-tab-switch">
                    {hasOwnedNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'owned' ? 'active' : ''}`}
                        onClick={() => selectNftOffersTab('owned')}
                      >
                        {ta('tabs.for-owned')}
                        {nftOffersTabCountLabels.owned ? ` (${nftOffersTabCountLabels.owned})` : ''}
                      </button>
                    )}
                    {hasReceivedPrivateNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'received' ? 'active' : ''}`}
                        onClick={() => selectNftOffersTab('received')}
                      >
                        {ta('tabs.private')}
                        {nftOffersTabCountLabels.received ? ` (${nftOffersTabCountLabels.received})` : ''}
                      </button>
                    )}
                    {hasCreatedSellNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'createdSelling' ? 'active' : ''}`}
                        onClick={() => selectNftOffersTab('createdSelling')}
                      >
                        {ta('tabs.selling')}
                        {nftOffersTabCountLabels.createdSelling ? ` (${nftOffersTabCountLabels.createdSelling})` : ''}
                      </button>
                    )}
                    {hasCreatedBuyNftOffers && (
                      <button
                        type="button"
                        className={`nft-tab-btn ${nftOffersTab === 'createdBuying' ? 'active' : ''}`}
                        onClick={() => selectNftOffersTab('createdBuying')}
                      >
                        {ta('tabs.buying')}
                        {nftOffersTabCountLabels.createdBuying ? ` (${nftOffersTabCountLabels.createdBuying})` : ''}
                      </button>
                    )}
                  </div>
                </div>

                <div className="nft-section-content nft-offers-content">
                  {activeNftOffersLoading ? (
                    <div className="asset-fiat">{ta('messages.loading-nft-offers')}</div>
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
                          const offerType = offer?.flags?.sellToken ? ta('tabs.sell') : ta('tabs.buy')
                          const offerTypeCode = offer?.flags?.sellToken ? 'sell' : 'buy'
                          const isPrivateNftOfferTab = nftOffersTab === 'received'
                          const isCreatedNftOfferTab =
                            nftOffersTab === 'createdSelling' || nftOffersTab === 'createdBuying'
                          const isOwnedNftOfferTab = nftOffersTab === 'owned'
                          const isFreeNftOffer = isZeroAmountValue(offer?.amount)
                          const offerAmountText = isFreeNftOffer
                            ? ta('states.free')
                            : offer?.amount
                              ? amountFormat(offer.amount, { short: true, maxFractionDigits: 2 })
                              : null
                          const isNativeOfferAmount =
                            !isFreeNftOffer && offer?.amount && typeof offer.amount !== 'object'
                          const shouldShowOfferFiat =
                            !isFreeNftOffer &&
                            !!offer?.amount &&
                            (isPrivateNftOfferTab || isOwnedNftOfferTab || isCreatedNftOfferTab)
                          const nativeOfferAmountFiat =
                            shouldShowOfferFiat && isNativeOfferAmount
                              ? tokenToFiat({
                                  amount: offer.amount,
                                  selectedCurrency,
                                  fiatRate: pageFiatRate,
                                  asText: true,
                                  absolute: true
                                })
                              : null
                          const convertedOfferAmountFiat =
                            shouldShowOfferFiat && selectedCurrency && !isNativeOfferAmount
                              ? convertedAmount(offer, selectedCurrency.toLowerCase(), { short: true })
                              : null
                          const tokenOfferAmountFiat =
                            shouldShowOfferFiat && selectedCurrency && !isNativeOfferAmount
                              ? nftOfferFiatText(offer, {
                                  fiatRate: pageFiatRate,
                                  selectedCurrency,
                                  tokenList: tokens
                                })
                              : null
                          const offerAmountFiat =
                            nativeOfferAmountFiat || convertedOfferAmountFiat || tokenOfferAmountFiat
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
                            if (!account?.address) return ta('tooltips.connect-buy-nft')
                            if (ownerAddress && ownerAddress === account.address) {
                              return ta('tooltips.offer-owner-cannot-accept')
                            }
                            if (destinationAddress && account.address !== destinationAddress) {
                              return ta('tooltips.only-destination-accept')
                            }
                            if (!destinationAddress && data?.address && account.address !== data.address) {
                              return ta('tooltips.only-viewed-account-accept')
                            }
                            return ta('tooltips.offer-cannot-accept')
                          })()
                          const canAcceptOwnedNftOffer =
                            !!setSignRequest &&
                            !effectiveLedgerTimestamp &&
                            !!offerIndex &&
                            !!account?.address &&
                            account.address === data?.address &&
                            (!ownerAddress || ownerAddress !== account.address)
                          const partnerMarketplace = destinationAddress ? partnerMarketplaces[destinationAddress] : null
                          const partnerSellOfferSignRequest =
                            isOwnedNftOfferTab &&
                            partnerMarketplace &&
                            canAcceptOwnedNftOffer &&
                            offer.amount &&
                            !isZeroAmountValue(offer.amount)
                              ? (() => {
                                  const { fee, name, feeText } = partnerMarketplace
                                  let sellAmount

                                  if (offer.amount?.value) {
                                    sellAmount = {
                                      value: (parseFloat(offer.amount.value) * (1 - fee)).toString(),
                                      currency: offer.amount.currency,
                                      issuer: offer.amount.issuer
                                    }
                                  } else {
                                    sellAmount = Math.floor(parseInt(offer.amount) * (1 - fee)).toString()
                                  }

                                  return {
                                    offerAmount: offer.amount,
                                    offerType: 'buy',
                                    displayAmount: offer.amount?.value ? sellAmount : parseInt(sellAmount),
                                    request: {
                                      TransactionType: 'NFTokenCreateOffer',
                                      Account: account.address,
                                      NFTokenID: nftId,
                                      Flags: 1,
                                      Destination: destinationAddress,
                                      Amount: sellAmount
                                    },
                                    broker: {
                                      name,
                                      fee: Math.ceil(offer.amount > 0 ? offer.amount * fee : 1),
                                      nftPrice: offer.amount,
                                      feeText
                                    }
                                  }
                                })()
                              : null
                          const disabledAcceptOwnedNftOfferTooltip = (() => {
                            if (!isOwnedNftOfferTab || canAcceptOwnedNftOffer) return ''
                            if (!account?.address) return ta('tooltips.connect-sell-nft')
                            if (ownerAddress && ownerAddress === account.address) {
                              return ta('tooltips.offer-owner-cannot-accept')
                            }
                            if (data?.address && account.address !== data.address) {
                              return ta('tooltips.only-viewed-account-accept')
                            }
                            return ta('tooltips.offer-cannot-accept')
                          })()
                          const disabledCancelCreatedNftOfferTooltip = (() => {
                            if (!isCreatedNftOfferTab || canCancelNftOffer) return ''
                            if (!account?.address) return ta('tooltips.connect-cancel-offer')
                            if (!ownerAddress) return ta('tooltips.offer-owner-unknown')
                            if (ownerAddress !== account.address) return ta('tooltips.only-offer-owner-cancel')
                            return ta('tooltips.offer-cannot-cancel')
                          })()
                          const secondaryLine = (() => {
                            if (nftOffersTab === 'received') {
                              return isOwnAccount
                                ? ta('nft-offers.private-to-you')
                                : ta('nft-offers.private-to-account')
                            }
                            if (nftOffersTab === 'owned') {
                              return isOwnAccount ? ta('nft-offers.on-your-nft') : ta('nft-offers.on-account-owned-nft')
                            }
                            if (offerTypeCode === 'buy') {
                              return isOwnAccount ? ta('nft-offers.your-buy-offer') : ta('nft-offers.account-buy-offer')
                            }
                            return isOwnAccount ? ta('nft-offers.your-sell-offer') : ta('nft-offers.account-sell-offer')
                          })()
                          const collapsedAmountDirection = (() => {
                            if (nftOffersTab === 'received') return { sign: '-', className: 'grey' }
                            if (nftOffersTab === 'owned') return { sign: '+', className: 'grey' }

                            // Created offers: buy offer means you pay; sell offer means you receive.
                            return offerTypeCode === 'buy'
                              ? { sign: '-', className: 'grey' }
                              : { sign: '+', className: 'grey' }
                          })()
                          const collapsedAmountClass = isFreeNftOffer
                            ? 'orange'
                            : offerAmountText
                              ? collapsedAmountDirection.className
                              : 'grey'
                          const collapsedAmountSign =
                            isFreeNftOffer || !offerAmountText ? '' : collapsedAmountDirection.sign

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
                                      {isFreeNftOffer
                                        ? ta('states.free')
                                        : `${collapsedAmountSign}${offerAmountText || '-'}`}
                                    </span>
                                    {offerAmountFiat && (
                                      <span className="tx-change-fiat">
                                        {nativeOfferAmountFiat ? offerAmountFiat : `≈${offerAmountFiat}`}
                                      </span>
                                    )}
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
                                      <span>{ta('labels.offer')}:</span>
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
                                    <span>{ta('labels.offer-type')}:</span>
                                    <span>{offerType}</span>
                                  </div>
                                  {offerAmountText && (
                                    <div className="detail-row">
                                      <span>{ta('labels.amount')}:</span>
                                      <span>
                                        <span className={isFreeNftOffer ? 'orange' : undefined}>{offerAmountText}</span>
                                        {!isFreeNftOffer && offerAmountFiat && (
                                          <span className="fiat-line" suppressHydrationWarning>
                                            {' '}
                                            {nativeOfferAmountFiat ? offerAmountFiat : `≈${offerAmountFiat}`}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {offerPlacedExact && (
                                    <div className="detail-row">
                                      <span>{ta('labels.placed')}:</span>
                                      <span>{offerPlacedExact}</span>
                                    </div>
                                  )}
                                  {expirationRelative && (
                                    <div className="detail-row nft-offer-expiration-row">
                                      <span>{ta('labels.expires')}:</span>
                                      <span className="nft-offer-expiration-time">
                                        {expirationRelative}
                                        {expirationExact && (
                                          <span className="nft-offer-expiration-exact"> ({expirationExact})</span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {ownerAddress && nftOffersTab !== 'created' && (
                                    <div className="detail-row">
                                      <span>{ta('labels.from')}:</span>
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
                                      <span>{ta('labels.to')}:</span>
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

                                  <div className="nft-expanded-preview" onClick={(event) => event.stopPropagation()}>
                                    <Link href={`/nft/${nftId}`} className="nft-expanded-preview-link">
                                      <NftImage
                                        nft={nftDisplayData}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          borderRadius: '10px',
                                          verticalAlign: 'middle'
                                        }}
                                      />
                                    </Link>
                                  </div>

                                  <div className="nft-expanded-actions" onClick={(event) => event.stopPropagation()}>
                                    {isPrivateNftOfferTab && !xahauNetwork && (
                                      <div className="card-actions">
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
                                              ta('actions.accept-nft-transfer')
                                            ) : (
                                              <>{ta('actions.buy-nft-for', { amount: amountFormat(offer.amount) })}</>
                                            )}
                                          </button>
                                          {!!disabledAcceptPrivateNftOfferTooltip && (
                                            <span className="tooltiptext left">
                                              {disabledAcceptPrivateNftOfferTooltip}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {isCreatedNftOfferTab && !xahauNetwork && (
                                      <div className="card-actions">
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
                                            title={ta('actions.cancel')}
                                          >
                                            <MdMoneyOff /> {ta('actions.cancel')}
                                          </button>
                                          {!!disabledCancelCreatedNftOfferTooltip && (
                                            <span className="tooltiptext left">
                                              {disabledCancelCreatedNftOfferTooltip}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {isOwnedNftOfferTab && !xahauNetwork && (
                                      <div className="card-actions">
                                        <span className={disabledAcceptOwnedNftOfferTooltip ? 'tooltip' : ''}>
                                          <button
                                            type="button"
                                            className={`card-action-btn ${canAcceptOwnedNftOffer ? 'redeem' : 'disabled'}`}
                                            disabled={!canAcceptOwnedNftOffer}
                                            onClick={() => {
                                              if (!canAcceptOwnedNftOffer) return
                                              if (partnerSellOfferSignRequest) {
                                                setSignRequest(partnerSellOfferSignRequest)
                                                return
                                              }
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
                                              ta('actions.accept-nft-transfer')
                                            ) : (
                                              <>
                                                {ta('actions.sell-nft-for', {
                                                  amount: amountFormat(
                                                    partnerSellOfferSignRequest?.displayAmount || offer.amount
                                                  )
                                                })}
                                              </>
                                            )}
                                          </button>
                                          {!!disabledAcceptOwnedNftOfferTooltip && (
                                            <span className="tooltiptext left">
                                              {disabledAcceptOwnedNftOfferTooltip}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
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
                              {ta('actions.show-more-nft-offers', {
                                count: Math.min(NFT_LOAD_MORE_STEP, activeNftOffersRemainingCount),
                                type: activeNftOffersTabLabel
                              })}
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
                              {ta('actions.show-fewer-nft-offers', { type: activeNftOffersTabLabel })}
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
                        {ta('tabs.incoming')}
                      </button>
                      <button
                        type="button"
                        className={`object-tab-btn ${paychannelsTab === 'outgoing' ? 'active' : ''}`}
                        onClick={() => setPaychannelsTab('outgoing')}
                      >
                        {ta('tabs.outgoing')}
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
                        const counterpartLabel =
                          activePaychannelsTab === 'outgoing' ? ta('labels.to') : ta('labels.from')
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
                                <span className="paychannel-metric-caption">{ta('labels.amount-balance')}</span>
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
                                  <span>{ta('labels.amount')}:</span>
                                  <span>{amountDisplay}</span>
                                </div>
                                <div className="detail-row">
                                  <span>{ta('labels.balance')}:</span>
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
                                    <span>{ta('labels.object')}:</span>
                                    <span className="copy-inline">
                                      <span>{shortHash(channelObjectId)}</span>
                                      <Link
                                        href={`/object/${channelObjectId}`}
                                        className="inline-link-icon tooltip"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <LinkIcon />
                                        <span className="tooltiptext no-brake">{ta('tooltips.object-page')}</span>
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
                            {ta('actions.show-more-paychannels', {
                              count: Math.min(OBJECT_LOAD_MORE_STEP, activePaychannelsRemainingCount)
                            })}
                          </button>
                        )}
                        {activePaychannelsShowMoreAvailable && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setPaychannelsDisplayLimit(activePaychannelsList.length)}
                          >
                            {ta('actions.show-all-paychannels')}
                          </button>
                        )}
                        {showPaychannelsFewerButton && (
                          <button
                            type="button"
                            className="asset-compact-toggle"
                            onClick={() => setPaychannelsDisplayLimit(OBJECT_PREVIEW_LIMIT)}
                          >
                            {ta('actions.show-fewer-paychannels')}
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
                  <div className="section-title object-section-title activated-accounts-title">
                    {ta('statuses.activated')}{' '}
                    {(!activatedAccountsLoading || activatedAccountsCount > 0) && (
                      <span className="object-title-count" suppressHydrationWarning>
                        {showActivatedAccountsCountTooltip ? (
                          <span className="tooltip summary-tooltip">
                            {activatedAccountsCountText}
                            <span className="tooltiptext no-brake">{activatedAccountsCountFullText}</span>
                          </span>
                        ) : (
                          activatedAccountsCountText
                        )}
                      </span>
                    )}
                    {activatedAccountsSpent > 0 && (
                      <span className="object-title-count" suppressHydrationWarning>
                        {' · '}
                        {showActivatedAccountsSpentTooltip ? (
                          <span className="tooltip summary-tooltip">
                            {activatedAccountsSpentText}
                            <span className="tooltiptext no-brake">{activatedAccountsSpentFullText}</span>
                          </span>
                        ) : (
                          activatedAccountsSpentText
                        )}
                      </span>
                    )}
                  </div>
                  <div className="tx-header-actions">
                    <button
                      className="tx-filter-toggle tooltip"
                      onClick={reloadActivatedAccounts}
                      aria-label={ta('aria.reload-activated-accounts')}
                      type="button"
                      disabled={!data?.address || activatedAccountsLoading || activatedAccountsLoadingMore}
                    >
                      <FaArrowsRotate
                        className={`tx-refresh-icon ${activatedAccountsLoading || activatedAccountsLoadingMore ? 'spinning' : ''}`}
                      />
                      <span className="tooltiptext">{ta('actions.update')}</span>
                    </button>
                    <button
                      className={`tx-filter-toggle tooltip ${showActivatedAccountsFilters ? 'active' : ''}`}
                      onClick={() => setShowActivatedAccountsFilters((prev) => !prev)}
                      aria-label={ta('aria.toggle-activated-accounts-filters')}
                      type="button"
                    >
                      <FaGear />
                      <span className="tooltiptext">{ta('labels.settings')}</span>
                    </button>
                  </div>
                </div>

                {showActivatedAccountsFilters && (
                  <div className="tx-filters-panel">
                    <div className="tx-filter-grid">
                      <label className="tx-filter-field">
                        <span>{ta('labels.order')}</span>
                        <select
                          value={activatedAccountsOrder}
                          onChange={(event) => setActivatedAccountsOrder(event.target.value)}
                        >
                          <option value="desc">{ta('filters.latest-first')}</option>
                          <option value="asc">{ta('filters.oldest-first')}</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {activatedAccountsLoading ? (
                  <div className="asset-item object-load-status">
                    <span className="tx-inline-load object-load-status-text">
                      <span>{ta('messages.loading-activated-accounts')}</span>
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
                          const activationKey = `${child?.account || 'activation'}-${child?.inception || index}`
                          const activationTimeAgo = child?.inception ? timeFromNow(child.inception, i18n) : '-'
                          const activationTimeFull = child?.inception ? fullDateAndTime(child.inception) : '-'
                          const activationAmount = Number.isFinite(Number(child?.initialBalance))
                            ? Number(child.initialBalance)
                            : 0
                          const activationAmountDrops = Math.round(activationAmount * 1000000)
                          const collapsedActivationAmountText = `${shortNiceNumber(activationAmount, 2, 1) || '0'} ${nativeCurrency}`
                          const currentBalance = Number.isFinite(Number(child?.balance)) ? Number(child.balance) : null
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
                                    <AddressWithIconFilled data={child} name="account" options={{ short: 6 }} />
                                  </div>
                                </div>
                                <div className="asset-value tx-collapsed-change">
                                  {activationAmount > 0 ? (
                                    <span className="tx-inline-change red">-{collapsedActivationAmountText}</span>
                                  ) : (
                                    <span className="tx-inline-change grey">{collapsedActivationAmountText}</span>
                                  )}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="asset-details" onClick={(e) => e.stopPropagation()}>
                                  <div className="detail-row">
                                    <span>{ta('labels.address')}:</span>
                                    <span className="copy-inline">
                                      <AddressWithIconInline data={child} name="account" options={{ short: 6 }} />
                                      <CopyButton text={child.account} />
                                    </span>
                                  </div>
                                  <div className="detail-row">
                                    <span>{ta('labels.balance-funded')}:</span>
                                    <span>{amountFormat(activationAmountDrops, { precise: 'nice' })}</span>
                                  </div>
                                  <div className="detail-row">
                                    <span>{ta('labels.activated')}:</span>
                                    <span>{activationTimeFull}</span>
                                  </div>
                                  {child.txHash && (
                                    <div className="detail-row">
                                      <span>{ta('labels.activation-tx')}:</span>
                                      <span className="copy-inline">
                                        <Link href={`/tx/${child.txHash}`} onClick={(e) => e.stopPropagation()}>
                                          {shortHash(child.txHash)}
                                        </Link>
                                        <CopyButton text={child.txHash} />
                                      </span>
                                    </div>
                                  )}
                                  {currentBalanceDrops !== null && !child.deletedAt && !child.deletedTxHash && (
                                    <div className="detail-row">
                                      <span>{ta('labels.balance-now')}:</span>
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
                                          <span>{ta('labels.last-active')}:</span>
                                          <span title={String(lastSubmittedFull)}>{lastSubmittedFull}</span>
                                        </div>
                                      )}
                                      {child.lastSubmittedTxHash && (
                                        <div className="detail-row">
                                          <span>{ta('labels.last-submitted-tx')}:</span>
                                          <span className="copy-inline">
                                            <Link
                                              href={`/tx/${child.lastSubmittedTxHash}`}
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
                                          <span>{ta('labels.deleted')}:</span>
                                          <span title={String(deletedFull)}>{deletedFull}</span>
                                        </div>
                                      )}
                                      {child.deletedTxHash && (
                                        <div className="detail-row">
                                          <span>{ta('labels.delete-tx')}:</span>
                                          <span className="copy-inline">
                                            <Link
                                              href={`/tx/${child.deletedTxHash}`}
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

                    const canLoadMoreActivatedAccounts = !!activatedAccountsMarker

                    return (
                      <div className="object-cards-wrapper">
                        <div className="object-cards-details">
                          {renderActivatedAccountsList()}
                          {canLoadMoreActivatedAccounts ? (
                            <div className="asset-compact-actions">
                              <button
                                type="button"
                                className={isMobile ? 'button-outline' : 'asset-compact-toggle'}
                                onClick={loadMoreActivatedAccounts}
                                disabled={activatedAccountsLoadingMore || activatedAccountsLoading}
                              >
                                {activatedAccountsLoadingMore ? (
                                  <>
                                    {ta('states.loading')}
                                    <span className="waiting inline" aria-hidden="true"></span>
                                  </>
                                ) : (
                                  ta('actions.load-more-activated-accounts', { count: 20 })
                                )}
                              </button>
                            </div>
                          ) : isMobile ? (
                            <div className="tx-mobile-actions">
                              <span className="tx-mobile-end-label">{ta('messages.end-of-list')}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })()
                )}
              </>
            )}

            {!showObjectsLoadStatus && !hasColumn4ObjectSections && (
              <>
                <div className="section-header-row object-section-header-row">
                  <div className="section-title object-section-title">{ta('sections.objects')}</div>
                </div>
                <div className="asset-item object-load-status">
                  <span className="object-load-status-text">{ta('empty.no-account-objects')}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .account-container {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
          overflow-x: clip;
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

        .info-row-full {
          grid-column: 1 / -1;
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
          position: relative;
          z-index: 1;
          min-width: 0;
        }

        .info-section:hover,
        .assets-section:hover,
        .transactions-section:hover,
        .orders-section:hover,
        .info-section:focus-within,
        .assets-section:focus-within,
        .transactions-section:focus-within,
        .orders-section:focus-within {
          z-index: 6;
        }

        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 0 0 auto;
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
          flex: 0 0 auto;
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

        .transactions-section {
          max-width: 100%;
          overflow-x: clip;
        }

        .transactions-section :global(ins),
        .transactions-section :global(iframe),
        .transactions-section :global(.adsbygoogle) {
          max-width: 100% !important;
        }

        .transactions-section :global(ins.adsbygoogle),
        .transactions-section :global(.adsbygoogle) {
          width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          display: block !important;
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

        .tx-asset-logo {
          display: flex;
          align-items: flex-start;
          min-width: 0;
        }

        .tx-collapsed-body {
          flex: 1;
          min-width: 0;
        }

        .tx-nft-thumb {
          display: inline-flex;
          width: 40px;
          height: 40px;
          border-radius: 6px;
          overflow: hidden;
          line-height: 0;
          flex: 0 0 auto;
          border: 1px solid color-mix(in srgb, var(--border-color) 76%, var(--text-secondary));
          background: color-mix(in srgb, var(--background-input) 90%, var(--text-main) 10%);
        }

        .tx-nft-thumb :global(img) {
          width: 100%;
          height: 100%;
          margin-right: 0 !important;
          border-radius: 6px;
          object-fit: cover;
          display: block;
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
          overflow-wrap: normal;
          word-break: normal;
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
          display: inline-flex;
          align-items: center;
          gap: 2px;
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 1;
          white-space: nowrap;
        }

        .tx-open-link.tooltip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 19px;
          height: 19px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 36%, var(--border-color));
          border-radius: 50%;
          background: color-mix(in srgb, var(--background-input) 82%, var(--accent-link) 18%);
          color: var(--accent-link);
          opacity: 0.82;
          text-decoration: none;
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            opacity 0.18s ease,
            transform 0.18s ease;
        }

        .tx-open-link:hover,
        .tx-open-link:focus-visible {
          border-color: var(--accent-link);
          background: color-mix(in srgb, var(--background-input) 68%, var(--accent-link) 32%);
          opacity: 1;
          transform: translateY(-1px);
        }

        .tx-open-link :global(svg) {
          width: 12px;
          height: 12px;
        }

        .tx-expanded-actions {
          display: flex;
          justify-content: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
        }

        .tx-view-transaction-button {
          min-width: 0;
        }

        @media (max-width: 768px) {
          .tx-view-transaction-button {
            width: 100%;
          }
        }

        .tx-counterparty-inline {
          min-width: 0;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-nft-counterparty-inline {
          overflow: visible;
          text-overflow: clip;
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
          max-width: 46%;
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
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
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

        .avatar-image-mask.is-amm {
          border: 0;
          border-radius: 0;
          overflow: visible;
          box-shadow: none;
          animation: none;
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
        }

        .amm-avatar-pair {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .amm-avatar-asset {
          flex-shrink: 0;
          width: 150px;
          height: 150px;
          border: 2px solid #fff;
          border-radius: 50%;
          box-sizing: border-box;
          object-fit: cover;
          box-shadow: 0 2px 9px rgba(0, 0, 0, 0.18);
        }

        .amm-avatar-asset + .amm-avatar-asset {
          margin-left: -72px;
        }

        .amm-avatar-asset-placeholder {
          background: color-mix(in srgb, var(--accent-link) 10%, #fff);
          border-color: color-mix(in srgb, var(--accent-link) 18%, #fff);
          box-shadow: none;
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
          top: 100%;
          bottom: auto;
          z-index: 30;
        }

        .achievement-badge :global(.tooltiptext):after {
          top: auto;
          bottom: 100%;
          border-top: 0;
          border-bottom: 6px solid rgba(28, 32, 38, 0.96);
        }

        .achievement-badge :global(.tooltiptext.right):after {
          left: 25px;
        }

        .achievement-badge :global(.tooltiptext.left):after {
          right: 26px;
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

        .account-domain-status-inline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 2px;
        }

        .activated-line {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .info-row-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .activated-tree-link {
          min-width: 28px;
          height: 28px;
          padding: 0 6px;
          border-radius: 8px;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--accent-link) 24%, transparent);
          box-shadow: inset 0 1px 0 color-mix(in srgb, white 20%, transparent);
          background: color-mix(in srgb, var(--accent-link) 18%, var(--background-input));
          color: var(--accent-link);
          text-decoration: none;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .activated-tree-link:hover,
        .activated-tree-link:focus-visible {
          background: color-mix(in srgb, var(--accent-link) 26%, var(--background-input));
          border-color: color-mix(in srgb, var(--accent-link) 38%, transparent);
          color: var(--text-main);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px color-mix(in srgb, var(--accent-link) 18%, transparent);
        }

        .activated-tree-icon {
          font-size: 16px;
          display: block;
        }

        .toml-checker-icon {
          font-size: 16px;
          display: block;
          transform: translateY(1px);
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
          min-height: 40px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--background-table);
          color: var(--text);
          font-size: 13px;
          font-weight: 800;
          padding: 8px 10px;
          cursor: pointer;
          transition: all 0.16s ease;
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--button-additional) 72%, transparent),
            0 2px 4px color-mix(in srgb, var(--text-main) 10%, transparent);
        }

        .time-machine-btn:hover {
          border-color: var(--accent-link);
        }

        .time-machine-btn-update {
          background: color-mix(in srgb, var(--accent-link) 58%, #002c37 42%);
          color: #fff;
          border-color: color-mix(in srgb, var(--accent-link) 44%, #002c37 56%);
        }

        .time-machine-btn-update:hover {
          background: color-mix(in srgb, var(--accent-link) 66%, #002c37 34%);
          border-color: color-mix(in srgb, var(--accent-link) 54%, #002c37 46%);
          opacity: 1;
        }

        .time-machine-btn-reset {
          color: var(--text);
          border-color: color-mix(in srgb, var(--accent-link) 38%, var(--text-secondary));
          background: color-mix(in srgb, var(--accent-link) 10%, var(--button-additional));
        }

        .time-machine-btn-reset:hover {
          color: var(--accent-link);
          border-color: var(--accent-link);
          background: color-mix(in srgb, var(--accent-link) 16%, var(--button-additional));
        }

        :global(body.dark) .time-machine-btn-update {
          background: color-mix(in srgb, var(--accent-link) 78%, #ffffff 22%);
          color: #06272d;
          border-color: color-mix(in srgb, var(--accent-link) 78%, #ffffff 22%);
        }

        :global(body.dark) .time-machine-btn-update:hover {
          background: color-mix(in srgb, var(--accent-link) 86%, #ffffff 14%);
          border-color: color-mix(in srgb, var(--accent-link) 86%, #ffffff 14%);
        }

        :global(body.dark) .time-machine-btn-reset {
          color: var(--text-main);
          border-color: color-mix(in srgb, var(--accent-link) 32%, var(--text-secondary));
          background: color-mix(in srgb, var(--accent-link) 18%, var(--background-table));
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
          --asset-card-padding-x: 6px;
          --asset-card-body-min-height: 46px;
          background: var(--background-input);
          border-radius: 6px;
          padding: var(--asset-card-padding-y) var(--asset-card-padding-x);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          z-index: 1;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }

        .asset-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 5;
        }

        .asset-item:focus-within {
          z-index: 5;
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
          min-width: 0;
          max-width: 100%;
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

        .signer-detail-row {
          justify-content: flex-start;
          gap: 8px;
        }

        .signer-detail-row > span:last-child {
          max-width: none;
          text-align: left;
          word-break: normal;
          overflow-wrap: normal;
        }

        .signer-detail-row .copy-inline {
          justify-content: flex-start;
          align-items: center;
          flex-wrap: nowrap;
          white-space: nowrap;
        }

        .signer-detail-row .signer-role {
          white-space: nowrap;
        }

        .signer-rows-container {
          display: flex;
          flex-direction: column;
          gap: 0;
          width: 100%;
          min-width: 0;
        }

        .signer-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .signer-row:last-child {
          border-bottom: none;
        }

        .signer-row-index {
          flex: 0 0 30px;
          text-align: center;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .signer-row-address {
          flex: 1 1 auto;
          min-width: 0;
        }

        .signer-row-role {
          flex: 0 1 auto;
          min-width: 0;
          white-space: normal;
          overflow-wrap: anywhere;
          padding: 0 8px;
          text-align: right;
        }

        .signer-row-action {
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-end;
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

        .token-search-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 8px 0 10px;
          width: 100%;
        }

        .token-search-box {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr) 24px;
          align-items: center;
          gap: 6px;
          min-width: 0;
          width: 100%;
          height: 38px;
          padding: 0 8px 0 10px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--background-input);
          color: var(--text-secondary);
          box-sizing: border-box;
          transition:
            border-color 0.16s ease,
            background 0.16s ease;
        }

        .token-search-box:focus-within {
          border-color: var(--accent-link);
          background: color-mix(in srgb, var(--background-input) 76%, var(--accent-link) 6%);
        }

        .token-search-icon {
          width: 18px;
          height: 18px;
          color: var(--text-secondary);
        }

        .token-search-input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: 14px;
          line-height: 1.2;
        }

        .token-search-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.9;
        }

        .token-search-clear {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .token-search-clear:hover {
          background: color-mix(in srgb, var(--text-secondary) 12%, transparent);
          color: var(--text);
        }

        .token-search-count {
          color: var(--text-secondary);
          font-size: 12px;
          padding: 0 2px;
          text-align: right;
          white-space: nowrap;
        }

        .token-search-empty {
          justify-content: center;
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

        .nft-offer-expiration-row > span:last-child {
          word-break: normal;
          overflow-wrap: normal;
        }

        .nft-offer-expiration-exact {
          display: inline-block;
          white-space: nowrap;
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

        .nft-expanded-preview {
          margin-top: 12px;
          margin-bottom: 8px;
          display: block;
          clear: both;
          width: min(100%, 180px);
          margin-left: auto;
          margin-right: auto;
        }

        .nft-expanded-actions {
          display: flow-root;
        }

        .nft-expanded-preview-link {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          overflow: hidden;
          line-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--border-color) 76%, var(--text-secondary));
          background: color-mix(in srgb, var(--background-input) 90%, var(--text-main) 10%);
        }

        .nft-expanded-preview-link :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .tx-nft-expanded-preview {
          margin: 12px auto 10px;
          width: min(100%, 180px);
          text-align: center;
        }

        .tx-nft-expanded-preview :global(img) {
          margin-right: 0 !important;
        }

        .tx-nft-expanded-title {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.25;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
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
          flex: 1 1 auto;
          min-width: 0;
          max-width: 100%;
        }

        .object-title-count {
          flex: 0 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        .activated-account-card .tx-asset-logo {
          flex: 1 1 0;
          min-width: 0;
          padding-right: 52px;
        }

        .activated-account-card .tx-collapsed-meta {
          min-width: 0;
          max-width: none;
          overflow: visible;
        }

        .activated-account-card .tx-collapsed-meta :global(table) {
          min-width: 0 !important;
          width: auto;
          max-width: 100%;
        }

        .activated-account-card .tx-collapsed-change {
          flex: 0 0 auto;
          min-width: max-content;
          max-width: min(38%, 220px);
        }

        .activated-accounts-title,
        .activated-accounts-title .object-title-count {
          overflow: visible;
        }

        .activated-accounts-title .summary-tooltip {
          cursor: default;
        }

        @media (max-width: 560px) {
          .object-section-header-row {
            gap: 8px;
          }

          .object-section-header-row .section-title {
            font-size: 14px;
          }

          .activated-account-card .tx-asset-main {
            gap: 8px;
          }

          .activated-account-card .tx-collapsed-change {
            max-width: 44%;
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

        .escrow-card .tx-asset-logo {
          flex-direction: column;
          gap: 4px;
        }

        .escrow-card .tx-collapsed-meta {
          flex-wrap: nowrap;
          gap: 4px;
          max-width: 100%;
        }

        .escrow-direction-label {
          flex: 0 0 auto;
          color: var(--text-secondary);
        }

        .card-actions {
          margin-top: 4px;
          display: inline-flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
          float: right;
        }

        .nft-owner-card-actions {
          margin-right: 8px;
        }

        .card-action-btn {
          border: 1px solid color-mix(in srgb, var(--text-secondary) 48%, var(--border-color));
          border-radius: 6px;
          background: color-mix(in srgb, var(--background-input) 76%, var(--text-main) 24%);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          padding: 5px 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          text-decoration: none;
          transition:
            background-color 0.16s ease,
            border-color 0.16s ease,
            color 0.16s ease;
        }

        .card-action-btn:hover {
          border-color: var(--text-secondary);
          background: color-mix(in srgb, var(--background-input) 64%, var(--text-main) 36%);
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

        .card-action-btn.pools {
          color: #7c3aed;
          border-color: color-mix(in srgb, #7c3aed 46%, var(--border-color));
          background: color-mix(in srgb, #7c3aed 12%, var(--background-input));
        }

        .card-action-btn.pools:hover {
          border-color: color-mix(in srgb, #7c3aed 68%, var(--border-color));
          background: color-mix(in srgb, #7c3aed 20%, var(--background-input));
        }

        .card-action-btn.token-page {
          color: #0b72d9;
          border-color: color-mix(in srgb, #0b72d9 46%, var(--border-color));
          background: color-mix(in srgb, #0b72d9 12%, var(--background-input));
        }

        .card-action-btn.token-page:hover {
          border-color: color-mix(in srgb, #0b72d9 68%, var(--border-color));
          background: color-mix(in srgb, #0b72d9 20%, var(--background-input));
        }

        :global(body.dark) .card-action-btn.token-page {
          color: #93c5fd;
          border-color: color-mix(in srgb, #3b82f6 72%, var(--border-color));
          background: color-mix(in srgb, #0b72d9 30%, var(--background-input));
        }

        :global(body.dark) .card-action-btn.token-page:hover {
          color: #dbeafe;
          border-color: color-mix(in srgb, #60a5fa 86%, var(--border-color));
          background: color-mix(in srgb, #0b72d9 42%, var(--background-input));
        }

        :global(body.dark) .card-action-btn.pools {
          color: #ddd6fe;
          border-color: color-mix(in srgb, #8b5cf6 72%, var(--border-color));
          background: color-mix(in srgb, #7c3aed 30%, var(--background-input));
        }

        :global(body.dark) .card-action-btn.pools:hover {
          color: #f5f3ff;
          border-color: color-mix(in srgb, #a78bfa 86%, var(--border-color));
          background: color-mix(in srgb, #7c3aed 42%, var(--background-input));
        }

        .card-action-btn.disabled,
        .card-action-btn:disabled {
          color: color-mix(in srgb, var(--text) 68%, var(--text-secondary));
          border-color: color-mix(in srgb, var(--text-secondary) 34%, var(--border-color));
          background: color-mix(in srgb, var(--background-input) 70%, var(--text-main) 18%);
          opacity: 1;
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

        .reserve-details-toggle {
          margin-top: 4px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--accent-link);
          font: inherit;
          font-size: 12px;
          line-height: 1.2;
          cursor: pointer;
          text-align: right;
        }

        .reserve-details-toggle:hover {
          text-decoration: underline;
        }

        .reserve-details-toggle::after {
          content: '›';
          display: inline-block;
          margin-left: 4px;
          opacity: 0.65;
          transform: translateY(-1px);
          transition: transform 0.16s ease;
        }

        .reserve-details-toggle.active::after {
          transform: translateY(-1px) rotate(90deg);
        }

        .worth-breakdown-item + .worth-breakdown-item {
          margin-top: 2px;
        }

        .worth-detail-value {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .reserve-breakdown {
          margin: 8px 0 2px;
          padding: 10px 12px;
          border: 1px solid color-mix(in srgb, var(--border-color) 78%, transparent);
          border-radius: 8px;
          background: color-mix(in srgb, var(--background-input) 52%, transparent);
          cursor: default;
          font-variant-numeric: tabular-nums;
          font-feature-settings: 'tnum' 1;
        }

        .reserve-breakdown-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(58px, 72px) minmax(96px, auto);
          align-items: center;
          column-gap: 12px;
          padding-bottom: 7px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0;
        }

        .reserve-breakdown-head > span:first-child {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reserve-breakdown-head > span:last-child {
          text-align: right;
          white-space: nowrap;
        }

        .reserve-breakdown-head > span:nth-child(2) {
          text-align: right;
          white-space: nowrap;
        }

        .reserve-breakdown-list {
          display: flex;
          flex-direction: column;
        }

        .reserve-breakdown-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(58px, 72px) minmax(96px, auto);
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 38px;
          padding: 6px 0;
          border-top: 1px solid color-mix(in srgb, var(--border-color) 64%, transparent);
          font-size: 13px;
          line-height: 1.25;
          word-break: normal;
        }

        .reserve-breakdown-row:first-child {
          border-top: 0;
        }

        .reserve-breakdown-label {
          min-width: 0;
          color: var(--text);
          text-align: left;
          overflow-wrap: anywhere;
          white-space: normal;
        }

        .reserve-breakdown-count {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.25;
          text-align: right;
          white-space: nowrap;
        }

        .reserve-breakdown-value {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          color: var(--text);
          font-size: 13px;
          line-height: 1.25;
          text-align: right;
          white-space: nowrap;
        }

        .reserve-breakdown-value .fiat-line {
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 1.1;
        }

        .reserve-breakdown-note {
          margin-top: 6px;
          padding-top: 7px;
          border-top: 1px solid color-mix(in srgb, var(--border-color) 64%, transparent);
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 1.25;
          text-align: right;
        }

        .worth-reserve-breakdown {
          margin-top: 6px;
        }

        @media (max-width: 420px) {
          .reserve-breakdown {
            padding: 9px 10px;
          }

          .reserve-breakdown-head,
          .reserve-breakdown-row {
            grid-template-columns: minmax(0, 1fr) minmax(44px, 52px) minmax(82px, auto);
            column-gap: 8px;
          }

          .reserve-breakdown-head {
            font-size: 11px;
          }

          .reserve-breakdown-row,
          .reserve-breakdown-count,
          .reserve-breakdown-value {
            font-size: 12px;
          }
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
