import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import axios from 'axios'
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
  const { id } = query
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
          '?username=true&service=true&verifiedDomain=true&parent=true&nickname=true&inception=true&flare=true&blacklist=true&payString=true&ledgerInfo=true&xamanMeta=true&bithomp=true&obligations=true',
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
import CopyButton from '../../components/UI/CopyButton'
import { CurrencyWithIcon } from '../../utils/format'
import {
  amountFormat,
  fullDateAndTime,
  fullNiceNumber,
  nativeCurrencyToFiat,
  niceNumber,
  niceCurrency,
  shortNiceNumber,
  serviceUsernameOrAddressText,
  timeFromNow
} from '../../utils/format'
import { subtract } from '../../utils/calc'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaMedium,
  FaReddit,
  FaTelegram,
  FaYoutube,
  FaXTwitter
} from 'react-icons/fa6'

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
  accountWithTag,
  account
}) {
  const { i18n } = useTranslation()
  const [showBalanceDetails, setShowBalanceDetails] = useState(false)
  const [tokens, setTokens] = useState([])
  const [expandedToken, setExpandedToken] = useState(null)
  const data = initialData
  const balanceList = balanceListServer
  const isLoggedIn = !!account?.address

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

  let fiatRate = fiatRateServer
  let selectedCurrency = selectedCurrencyServer
  if (fiatRateApp) {
    fiatRate = fiatRateApp
    selectedCurrency = selectedCurrencyApp
  }

  // Fetch tokens
  useEffect(() => {
    if (!data?.address || !data?.ledgerInfo?.activated) return

    const fetchTokens = async () => {
      try {
        const response = await axios.get(
          `v2/objects/${data.address}?limit=1000&priceNativeCurrencySpot=true&currencyDetails=true`
        )
        const accountObjects = response?.data?.objects || []

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

        // Sort by fiat value
        const sortedTokens = rippleStateList.sort((a, b) => {
          const balanceA = Math.abs(subtract(a.Balance?.value, a.LockedBalance?.value || 0))
          const balanceB = Math.abs(subtract(b.Balance?.value, b.LockedBalance?.value || 0))

          if (balanceA === 0 && balanceB === 0) return 0
          if (balanceA === 0) return 1
          if (balanceB === 0) return -1

          const fiatValueA = (a.priceNativeCurrencySpot * balanceA || 0) * fiatRate
          const fiatValueB = (b.priceNativeCurrencySpot * balanceB || 0) * fiatRate

          return fiatValueB - fiatValueA
        })

        setTokens(sortedTokens)
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
      }
    }

    fetchTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.address, data?.ledgerInfo?.activated, fiatRateApp, selectedCurrencyApp])

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

  let thirdPartyService = null
  if (data?.xamanMeta?.thirdPartyProfiles?.length) {
    for (let i = 0; i < data.xamanMeta.thirdPartyProfiles.length; i++) {
      const excludeList = ['xumm.app', 'xaman.app', 'xrpl', 'xrplexplorer.com', 'bithomp.com']
      if (!excludeList.includes(data.xamanMeta.thirdPartyProfiles[i].source)) {
        thirdPartyService = data.xamanMeta.thirdPartyProfiles[i].accountAlias
        break
      }
    }
  }

  // Social accounts will be rendered separately without a label

  // Only show service name in info section if not already shown under avatar
  if (!data?.service?.name && thirdPartyService) {
    pushPublicRow(
      'Service name',
      <>
        <span className="bold">{thirdPartyService}</span> (unverified)
      </>
    )
  }

  if (data?.nickname) {
    pushPublicRow('Nickname', <span className="orange bold">{data.nickname}</span>)
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
            {showUnverified && <span className="orange">(unverified)</span>}
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
    const activatedWithAmount = data?.initialBalance ? (
      <>
        {fullNiceNumber(data.initialBalance)} {nativeCurrency}
      </>
    ) : null

    pushPublicRow(
      'Activated',
      <span className="activated-line">
        <span className="tooltip activated-time no-brake">
          <span className="bold">{timeFromNow(data.inception, i18n)}</span>
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
        {/* Header with switch to old view */}
        {/* Grid Layout */}
        <div className="account2-grid">
          {/* Column 1: Information */}
          <CollapsibleColumn>
            <div className="info-section">
              {/* Avatar */}
              <div className="avatar-container">
                <div className="avatar-wrapper">
                  <img src={avatarSrc(data.address)} alt="Avatar" className="account-avatar" />
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
                  {data.username ? (
                    <span className="account-username">
                      <span className="blue">{data.username}</span>
                      <CopyButton text={data.username} />
                    </span>
                  ) : data.service?.name ? (
                    <span className="green">{data.service.name}</span>
                  ) : (
                    'Account'
                  )}
                </h2>
                <div className="account-address">
                  <span className="account-address-text">{data.address}</span>
                  <CopyButton text={data.address} />
                </div>
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
            </div>
          </CollapsibleColumn>

          {/* Column 2: Assets */}
          <CollapsibleColumn>
            <div className="assets-section">
              {/* Native Currency Balance */}
              {balanceList && (
                <div className="asset-item" onClick={() => setShowBalanceDetails(!showBalanceDetails)}>
                  {!showBalanceDetails ? (
                    <div className="asset-main">
                      <div className="asset-logo">
                        <CurrencyWithIcon token={{ currency: nativeCurrency }} />
                      </div>
                      <div className="asset-value">
                        <div className="asset-amount">
                          {amountFormat(balanceList.available.native, { precise: 'nice' })}
                        </div>
                        <div className="asset-fiat">
                          {nativeCurrencyToFiat({
                            amount: balanceList.available.native,
                            selectedCurrency,
                            fiatRate
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="asset-main">
                        <div className="asset-logo">
                          <CurrencyWithIcon token={{ currency: nativeCurrency }} />
                        </div>
                        <div className="asset-value">
                          <div className="asset-amount">
                            {amountFormat(balanceList.available.native, { precise: 'nice' })}
                          </div>
                          <div className="asset-fiat">
                            {nativeCurrencyToFiat({
                              amount: balanceList.available.native,
                              selectedCurrency,
                              fiatRate
                            })}
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
                          <span>
                            {amountFormat(balanceList.total.native, { precise: 'nice' })}
                            {nativeCurrencyToFiat({
                              amount: balanceList.total.native,
                              selectedCurrency,
                              fiatRate
                            })}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span>Reserved:</span>
                          <span className="grey">
                            {amountFormat(balanceList.reserved.native, { precise: 'nice' })}
                            {nativeCurrencyToFiat({
                              amount: balanceList.reserved.native,
                              selectedCurrency,
                              fiatRate
                            })}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tokens */}
              {tokens.map((token, index) => {
                const issuer = token.HighLimit?.issuer === data?.address ? token.LowLimit : token.HighLimit
                const balance = Math.abs(subtract(token.Balance?.value, token.LockedBalance?.value || 0))
                const fiatValue = (token.priceNativeCurrencySpot * balance || 0) * fiatRate
                const isExpanded = expandedToken === `token-${index}`
                const isLpToken = token.Balance?.currency?.substring(0, 2) === '03'

                return (
                  <div
                    key={index}
                    className="asset-item"
                    onClick={() => setExpandedToken(isExpanded ? null : `token-${index}`)}
                  >
                    <div className="asset-main">
                      <div className="asset-logo">
                        <CurrencyWithIcon token={{ ...token.Balance, ...issuer }} />
                      </div>
                      <div className="asset-value">
                        <div className="asset-amount">
                          {shortNiceNumber(balance)} {isLpToken ? 'LP' : niceCurrency(token.Balance?.currency)}
                        </div>
                        {fiatValue > 0 && (
                          <div className="asset-fiat">{shortNiceNumber(fiatValue, 2, 1, selectedCurrency)}</div>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="asset-details">
                        {isLpToken ? (
                          <>
                            <div className="detail-row">
                              <span>LP Token:</span>
                              <span>{niceCurrency(token.Balance?.currency)}</span>
                            </div>
                            {token.Balance?.currencyDetails?.asset && (
                              <>
                                <div className="detail-row">
                                  <span>Asset 1:</span>
                                  <span>{niceCurrency(token.Balance.currencyDetails.asset.currency)}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Asset 2:</span>
                                  <span>{niceCurrency(token.Balance.currencyDetails.asset2?.currency)}</span>
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="detail-row">
                            <span>Currency:</span>
                            <span className="copy-inline">
                              <span>{token.Balance?.currency}</span>
                              <span onClick={(event) => event.stopPropagation()}>
                                <CopyButton text={token.Balance?.currency} />
                              </span>
                            </span>
                          </div>
                        )}
                        {!isLpToken && (
                          <>
                            <div className="detail-row">
                              <span>Issuer:</span>
                              <span className="copy-inline">
                                <span className="address-text">{issuer?.issuer}</span>
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
                        <div className="detail-row">
                          <span>Balance:</span>
                          <span className="copy-inline">
                            <span>{fullNiceNumber(balance)}</span>
                            <span onClick={(event) => event.stopPropagation()}>
                              <CopyButton text={balance} />
                            </span>
                          </span>
                        </div>
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
            </div>
          </CollapsibleColumn>

          {/* Column 3: Transactions */}
          <CollapsibleColumn>
            <div className="transactions-section">
              <p className="grey">Recent transactions will be displayed here.</p>
            </div>
          </CollapsibleColumn>

          {/* Column 4: Orders & Incoming */}
          <CollapsibleColumn>
            <div className="orders-section">
              <p className="grey">DEX orders and pending items will be displayed here.</p>
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
        .orders-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
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
        }

        .account-avatar {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          border: 3px solid var(--accent-link);
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

        :global(.tooltiptext.right) {
          left: 106% !important;
          right: unset !important;
        }

        .did-section {
          margin-top: 15px;
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

        .asset-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .asset-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .asset-details {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
        }

        .detail-row span:first-child {
          color: var(--text-secondary);
        }

        .detail-row span:last-child {
          color: var(--text-secondary);
          word-break: break-all;
          max-width: 60%;
          text-align: right;
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
