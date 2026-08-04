import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'next-i18next'
import { IoCheckmark, IoChevronDown, IoSearch } from 'react-icons/io5'
import { IoMdClose } from 'react-icons/io'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import { nativeCurrency, useWidth, setTabParams } from '../../utils'
import { CurrencyWithIcon, niceCurrency, shortAddress, shortNiceNumber } from '../../utils/format'
import RadioOptions from './RadioOptions'
import { useRouter } from 'next/router'
import { acceptedTokensForAddress, mptIssuanceId } from '../../utils/acceptedTokens'

const limit = 20

const fetchAcceptedTokensForDestination = async (
  destinationAddress,
  searchQuery = '',
  senderAddress = null,
  canLock = false,
  includeMPTokens = false,
  onlyMPTokens = false,
  excludeNative = false
) => {
  const response = await acceptedTokensForAddress({
    destination: destinationAddress,
    sender: senderAddress,
    canLock
  })
  const tokens = response.tokens.filter((token) => {
    const isMpt = !!mptIssuanceId(token)
    if (excludeNative && token.currency === nativeCurrency && !token.issuer) return false
    if (onlyMPTokens) return isMpt
    return includeMPTokens || !isMpt
  })

  // Trim the search query to handle whitespace
  const trimmedQuery = searchQuery.trim()

  const trustlines = tokens.filter((token) => {
    // If search query is provided, filter by it
    if (trimmedQuery) {
      const currency = token.currency || ''
      const issuerDetails = token.issuerDetails || {}
      const service = typeof issuerDetails.service === 'string' ? issuerDetails.service : issuerDetails.service?.name || ''
      const username = issuerDetails.username || ''
      const issuer = token.issuer || ''
      const issuanceId = mptIssuanceId(token) || ''
      const metadataName = token.metadata?.name || token.metadata?.n || ''
      const metadataTicker = token.metadata?.ticker || token.metadata?.t || ''

      const searchLower = trimmedQuery.toLowerCase()
      return (
        currency.toLowerCase().includes(searchLower) ||
        service.toLowerCase().includes(searchLower) ||
        username.toLowerCase().includes(searchLower) ||
        issuer.toLowerCase().includes(searchLower) ||
        issuanceId.toLowerCase().includes(searchLower) ||
        metadataName.toLowerCase().includes(searchLower) ||
        metadataTicker.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return trustlines
}

// Helper function to add native currency to tokens array if needed
const addNativeCurrencyIfNeeded = (tokens, excludeNative, searchQuery = '') => {
  if (excludeNative) return tokens

  const trimmedQuery = searchQuery.trim()
  const shouldAddNative = !trimmedQuery || trimmedQuery.toUpperCase() === nativeCurrency.toUpperCase()
  if (shouldAddNative) {
    tokens.unshift({ currency: nativeCurrency, limit: null })
  }

  return tokens
}

const hasTokenValue = (token) => !!(token?.currency || mptIssuanceId(token))

const tokenKey = (token) =>
  mptIssuanceId(token) ||
  token?.token ||
  (token?.issuer && token?.currency ? `${token.issuer}:${token.currency}` : token?.currency || '')

const assetBalanceKey = (issuer, currency) => `${issuer}:${niceCurrency(currency)}`

const mptDisplayName = (token) =>
  token?.metadata?.name || token?.metadata?.n || token?.metadata?.ticker || token?.metadata?.t || token?.currency || 'MPT'

const mptDropdownName = (token) => {
  const name = token?.metadata?.name || token?.metadata?.n
  const ticker = token?.metadata?.ticker || token?.metadata?.t

  if (!name || !ticker || String(name).trim().toLowerCase() === String(ticker).trim().toLowerCase()) {
    return mptDisplayName(token)
  }

  return `${name} (${ticker})`
}

const tokenListUrl = (searchQuery, urlPart, onlyMPTokens) => {
  const trimmedQuery = searchQuery.trim()

  if (onlyMPTokens) {
    return trimmedQuery
      ? `v2/mptokens/search/${encodeURIComponent(trimmedQuery)}?limit=${limit}${urlPart}`
      : `v2/mptokens?limit=${limit}${urlPart}`
  }

  if (trimmedQuery) {
    return `v2/trustlines/tokens/search/${encodeURIComponent(trimmedQuery)}?limit=${limit}${urlPart}`
  }

  return `v2/trustlines/tokens?limit=${limit}${urlPart}`
}

const tokensFromResponse = (response, onlyMPTokens) =>
  onlyMPTokens ? response.data?.issuances || [] : response.data?.tokens || []

export default function TokenSelector({
  value,
  onChange,
  excludeNative = false,
  destinationAddress = null,
  senderAddress = null,
  allOrOne,
  currencyQueryName,
  excludeLPtokens = false,
  onlyLPtokens = false,
  onlyMPTokens = false,
  includeMPTokens = false,
  canLock = false,
  multiple = false,
  multipleType = 'tokens',
  modalTitle = null,
  allowAllTokens = false,
  selectedCurrency = null,
  fiatRate = null
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()
  const [isOpen, setIsOpen] = useState(false)
  const [multipleValue, setMultipleValue] = useState(() => (multiple && Array.isArray(value) ? value : []))
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAllTokens, setShowAllTokens] = useState(false)
  const [userAssetBalances, setUserAssetBalances] = useState({})
  const [userBalancesAddress, setUserBalancesAddress] = useState(null)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const selectedTokens = multiple ? multipleValue : []
  const [tokenType, setTokenType] = useState(() =>
    mptIssuanceId(multiple ? selectedTokens[0] : value) ? 'mpts' : 'tokens'
  )
  const searchMPTokens = onlyMPTokens || (includeMPTokens && tokenType === 'mpts')
  const filterByDestination = !!destinationAddress && !showAllTokens
  const searchScope = `${searchMPTokens ? 'mpts' : 'tokens'}:${canLock ? 'canLock' : 'all'}:${
    filterByDestination ? destinationAddress : 'all-assets'
  }`

  // Cache for search results to prevent unnecessary reloads
  const [lastSearchQuery, setLastSearchQuery] = useState('')
  const [cachedSearchResults, setCachedSearchResults] = useState([])
  const [cachedSearchScope, setCachedSearchScope] = useState('')

  // control radio selection: 'all' | 'single'
  const [filterMode, setFilterMode] = useState(() => (hasTokenValue(value) ? 'single' : 'all'))

  useEffect(() => {
    if (!currencyQueryName) return
    let queryAddList = []
    let queryRemoveList = []
    if (value?.currency && value.currency !== nativeCurrency && value?.issuer) {
      queryAddList.push({ name: currencyQueryName, value: value.currency })
      queryAddList.push({ name: currencyQueryName + 'Issuer', value: value.issuer })
    } else {
      queryRemoveList.push(currencyQueryName)
      queryRemoveList.push(currencyQueryName + 'Issuer')
    }
    setTabParams(router, [], queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currencyQueryName])

  useEffect(() => {
    if (!allOrOne) return
    if (filterMode === 'all') {
      onChange({}) // clear any selected token
    } else if (filterMode === 'single' && !hasTokenValue(value)) {
      onChange({ currency: nativeCurrency }) // default to native currency if no token selected
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrOne, filterMode])

  // Clear search results when destination address changes
  useEffect(() => {
    setSearchResults([])
    setSearchQuery('')
    setLastSearchQuery('')
    setCachedSearchResults([])
    setCachedSearchScope('')
    setUserAssetBalances({})
    setUserBalancesAddress(null)
  }, [destinationAddress])

  useEffect(() => {
    if (!isOpen || !filterByDestination || userBalancesAddress === destinationAddress) return

    let ignore = false
    axios(`v2/trustlines/${encodeURIComponent(destinationAddress)}`)
      .then((response) => {
        if (ignore) return
        const trustlines = Array.isArray(response?.data)
          ? response.data
          : response?.data?.trustlines || response?.data?.tokens || response?.data?.lines || []
        const balances = {}

        trustlines.forEach((trustline) => {
          const issuer = trustline?.counterparty || trustline?.issuer
          const currency = trustline?.currency
          const balance = new BigNumber(trustline?.balance ?? trustline?.Balance?.value ?? 0).abs()
          if (issuer && currency && balance.isFinite()) balances[assetBalanceKey(issuer, currency)] = balance
        })
        setUserAssetBalances(balances)
        setUserBalancesAddress(destinationAddress)
      })
      .catch(() => {
        if (!ignore) setUserAssetBalances({})
      })

    return () => {
      ignore = true
    }
  }, [destinationAddress, filterByDestination, isOpen, userBalancesAddress])

  useEffect(() => {
    setSearchQuery('')
    setSearchResults([])
    setLastSearchQuery('')
    setCachedSearchResults([])
    setCachedSearchScope('')
  }, [canLock])

  const balanceForToken = (token) => {
    if (!filterByDestination) return null
    if (token?.issuer) {
      const balance = userAssetBalances[assetBalanceKey(token.issuer, token.currency)]
      return balance?.isFinite() ? balance.toFixed() : null
    }
    if (token?.balance !== undefined) {
      const balance = new BigNumber(token.balance).dividedBy(1_000_000)
      return balance.isFinite() ? balance.toFixed() : null
    }
    return null
  }

  // Handle search with debounce
  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(async () => {
      let urlPart = searchMPTokens
        ? '&order=holdersHigh'
        : onlyLPtokens
        ? '&lptokens=true&currencyDetails=true'
        : excludeLPtokens
          ? '&lptokens=false'
          : '&currencyDetails=true'
      if (canLock) {
        urlPart += '&canLock=true'
      }
      if (!searchMPTokens) {
        urlPart += '&priceNativeCurrencySpot=true'
      }

      if (!searchQuery.trim()) {
        // Check if we have cached results for empty search query
        if (lastSearchQuery === '' && cachedSearchScope === searchScope && cachedSearchResults.length > 0) {
          setSearchResults(cachedSearchResults)
          return
        }

        setIsLoading(true)
        try {
          let tokens = []

          if (filterByDestination) {
            tokens = await fetchAcceptedTokensForDestination(
              destinationAddress,
              '',
              senderAddress,
              canLock,
              includeMPTokens,
              onlyMPTokens,
              excludeNative
            )
          } else {
            // Fallback to original behavior if no destination address
            // &statistics=true - shall we get USD prices and show them?
            const response = await axios(tokenListUrl('', urlPart, searchMPTokens))
            tokens = tokensFromResponse(response, searchMPTokens)
            if (!excludeNative && !searchMPTokens) {
              const defaultTokens = [{ currency: nativeCurrency }, ...tokens]
              setSearchResults(defaultTokens)
              // Cache the default token list
              setLastSearchQuery('')
              setCachedSearchResults(defaultTokens)
              setCachedSearchScope(searchScope)
            } else {
              setSearchResults(tokens)
              // Cache the default token list
              setLastSearchQuery('')
              setCachedSearchResults(tokens)
              setCachedSearchScope(searchScope)
            }
            setIsLoading(false)
            return
          }

          setSearchResults(tokens)
          // Cache the default token list for destination address case
          setLastSearchQuery('')
          setCachedSearchResults(tokens)
          setCachedSearchScope(searchScope)
        } catch (error) {
          console.error('Error loading tokens:', error)
          if (excludeNative) {
            setSearchResults([])
            setLastSearchQuery('')
            setCachedSearchResults([])
          } else {
            setSearchResults([{ currency: nativeCurrency }])
            setLastSearchQuery('')
            setCachedSearchResults([{ currency: nativeCurrency }])
          }
        } finally {
          setIsLoading(false)
        }
        return
      }

      // Check if we have cached results for this search query
      if (lastSearchQuery === searchQuery && cachedSearchScope === searchScope) {
        setSearchResults(cachedSearchResults)
        return
      }

      setIsLoading(true)
      try {
        if (filterByDestination) {
          const tokens = await fetchAcceptedTokensForDestination(
            destinationAddress,
            searchQuery,
            senderAddress,
            canLock,
            includeMPTokens,
            onlyMPTokens,
            excludeNative
          )
          setSearchResults(tokens)
          // Cache the results
          setLastSearchQuery(searchQuery)
          setCachedSearchResults(tokens)
          setCachedSearchScope(searchScope)
        } else {
          // Fallback to original search behavior
          // &statistics=true - shall we get USD prices and show them?
          const response = await axios(tokenListUrl(searchQuery, urlPart, searchMPTokens))
          const tokens = tokensFromResponse(response, searchMPTokens)
          const tokensWithNative = searchMPTokens
            ? tokens
            : addNativeCurrencyIfNeeded(tokens, excludeNative, searchQuery)
          setSearchResults(tokensWithNative)
          // Cache the results
          setLastSearchQuery(searchQuery)
          setCachedSearchResults(tokensWithNative)
          setCachedSearchScope(searchScope)
        }
      } catch (error) {
        console.error('Error searching tokens:', error)
        setSearchResults([])
        setCachedSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    setSearchTimeout(timeout)

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isOpen, destinationAddress, searchMPTokens, canLock, filterByDestination])

  const handleSelect = (token) => {
    if (multiple) {
      const selectedKey = tokenKey(token)
      setMultipleValue(
        selectedTokens.some((selectedToken) => tokenKey(selectedToken) === selectedKey)
          ? selectedTokens.filter((selectedToken) => tokenKey(selectedToken) !== selectedKey)
          : [...selectedTokens, token]
      )
      return
    }
    const selectedBalance = balanceForToken(token)
    onChange(selectedBalance === null ? token : { ...token, selectedBalance })
    setIsOpen(false)
  }

  const openSelector = () => {
    if (multiple) {
      setMultipleValue(Array.isArray(value) ? value : [])
    }
    setIsOpen(true)
  }

  const closeSelector = () => {
    if (multiple) {
      setMultipleValue(Array.isArray(value) ? value : [])
    }
    setIsOpen(false)
  }

  const changeTokenType = (nextType) => {
    if (nextType === tokenType) return
    setSearchQuery('')
    setSearchResults([])
    setLastSearchQuery('')
    setCachedSearchResults([])
    setCachedSearchScope('')
    setTokenType(nextType)
  }

  // Helper to get token display name
  const getTokenDisplayName = (token) => {
    const mptId = mptIssuanceId(token)
    if (mptId) return mptDisplayName(token)
    if (!token || !token.currency) return t('token-selector.select-token')
    if (!token.issuer) return nativeCurrency

    const issuerDetails = token.issuerDetails || {}
    const serviceOrUsername = issuerDetails.service || issuerDetails.username
    if (serviceOrUsername) {
      return `${niceCurrency(token.currency)} (${serviceOrUsername})`
    }
    if (token.currencyDetails) {
      return token.currencyDetails.currency
    }
    return niceCurrency(token.currency)
  }

  const selectedValue = multiple ? selectedTokens.length > 0 : hasTokenValue(value)
  const secondaryTokenText = (token) => {
    const mptId = mptIssuanceId(token)
    if (mptId) return shortAddress(mptId, width > 1100 ? 10 : 6)
    if (!token?.issuer) return ''
    return shortAddress(token.issuer, width > 600 ? 10 : 6)
  }

  const secondaryTokenTitle = (token) => mptIssuanceId(token) || token?.issuer || ''

  return (
    <>
      {allOrOne && (
        <RadioOptions
          tabList={[
            {
              value: 'all',
              label: t('tabs.all-tokens')
            },
            {
              value: 'single',
              label: t('tabs.single-token')
            }
          ]}
          tab={filterMode}
          setTab={setFilterMode}
          name="tokenFilterMode"
        />
      )}
      {(!allOrOne || filterMode === 'single') && (
        <div className="token-selector">
          <div
            className="token-selector-dropdown"
            onClick={openSelector}
            role="button"
            style={{ outline: 'none' }}
          >
            {/* Icon */}
            {selectedValue && (
              <div className="token-selector-icon">
                {multiple ? (
                  <span className="token-selector-count">{selectedTokens.length}</span>
                ) : (
                  <CurrencyWithIcon token={value} options={{ iconOnly: true }} />
                )}
              </div>
            )}
            {/* Text */}
            <div className="token-selector-label">
              <span className="token-selector-code">
                {multiple && selectedValue
                  ? t(`token-selector.${multipleType}-selected`, { count: selectedTokens.length })
                  : selectedValue
                    ? getTokenDisplayName(value)
                    : t(multiple ? `token-selector.select-${multipleType}` : 'token-selector.select-token')}
              </span>
            </div>
            {/* Chevron */}
            <div className="token-selector-chevron">
              <IoChevronDown />
            </div>
          </div>

          {isOpen &&
            typeof window !== 'undefined' &&
            createPortal(
              <div className="token-selector-modal">
                <div className="token-selector-modal-content">
                  {/* Backdrop */}
                  <div className="token-selector-modal-backdrop" onClick={closeSelector} />

                  {/* Modal */}
                  <div className="token-selector-modal-container">
                    <div className="token-selector-modal-header">
                      <h3 className="token-selector-modal-title">
                        {modalTitle || (destinationAddress
                          ? t('token-selector.select-token-destination')
                          : t(multiple ? `token-selector.select-${multipleType}` : 'token-selector.select-token'))}
                      </h3>
                      <IoMdClose className="token-selector-modal-close" onClick={closeSelector} />
                    </div>

                    {allowAllTokens && destinationAddress && (
                      <div className="token-selector-type-switch" role="group" aria-label={t('token-selector.scope')}>
                        <button
                          type="button"
                          className={!showAllTokens ? 'active' : ''}
                          onClick={() => setShowAllTokens(false)}
                        >
                          {t('token-selector.your-assets')}
                        </button>
                        <button
                          type="button"
                          className={showAllTokens ? 'active' : ''}
                          onClick={() => setShowAllTokens(true)}
                        >
                          {t('token-selector.all-assets')}
                        </button>
                      </div>
                    )}

                    {includeMPTokens && !filterByDestination && (
                      <div className="token-selector-type-switch" role="group" aria-label={t('token-selector.search-in')}>
                        <button
                          type="button"
                          className={tokenType === 'tokens' ? 'active' : ''}
                          onClick={() => changeTokenType('tokens')}
                        >
                          {t('token-tabs.tokens')}
                        </button>
                        <button
                          type="button"
                          className={tokenType === 'mpts' ? 'active' : ''}
                          onClick={() => changeTokenType('mpts')}
                        >
                          {t('token-tabs.mpts')}
                        </button>
                      </div>
                    )}

                    <div className="form-input">
                      <div className="form-input__wrap">
                        <input
                          className="simple-input"
                          placeholder={t('token-selector.search-placeholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                          spellCheck="false"
                        />
                        <div className="form-input__btns">
                          <div className="search-button">
                            <IoSearch />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="token-selector-modal-list">
                      {isLoading ? (
                        <div className="token-selector-modal-loading">{t('general.loading')}</div>
                      ) : searchResults.length > 0 ? (
                        <div className="token-selector-modal-items">
                          {searchResults.map((token, index) => {
                            const secondaryText = secondaryTokenText(token)
                            const priceInNative = token?.issuer
                              ? new BigNumber(token.priceNativeCurrencySpot || 0)
                              : new BigNumber(1)
                            const fiatPrice = priceInNative.multipliedBy(fiatRate || 0)
                            const hasFiatPrice = !!selectedCurrency && fiatPrice.isFinite() && fiatPrice.gt(0)
                            const tokenBalance = filterByDestination
                              ? token.issuer
                                ? userAssetBalances[assetBalanceKey(token.issuer, token.currency)]
                                : token.balance !== undefined
                                  ? new BigNumber(token.balance).dividedBy(1_000_000)
                                  : null
                              : null
                            const isSelected =
                              multiple &&
                              selectedTokens.some((selectedToken) => tokenKey(selectedToken) === tokenKey(token))

                            return (
                              <div
                                key={`${mptIssuanceId(token) || token.currency}-${token.issuer || ''}-${index}`}
                                className={`token-selector-modal-item${isSelected ? ' is-selected' : ''}`}
                                onClick={() => handleSelect(token)}
                              >
                                <div className="token-selector-modal-item-content">
                                  <div className="token-selector-modal-item-icon">
                                    <CurrencyWithIcon token={token} options={{ iconOnly: true }} />
                                  </div>
                                  <div className="token-selector-modal-item-name">
                                    <span>
                                      {mptIssuanceId(token) ? mptDropdownName(token) : getTokenDisplayName(token)}
                                      {tokenBalance?.isFinite() && (
                                        <span
                                          style={{
                                            marginLeft: '8px',
                                            fontSize: '0.85em',
                                            color: 'var(--text-secondary)'
                                          }}
                                        >
                                          {t('token-selector.balance', {
                                            value: shortNiceNumber(tokenBalance.toFixed(), 6)
                                          })}
                                        </span>
                                      )}
                                      {!filterByDestination && token.holders !== undefined && (
                                        <span
                                          style={{
                                            marginLeft: '8px',
                                            fontSize: '0.85em',
                                            color: 'var(--text-secondary)'
                                          }}
                                        >
                                          {t('token-selector.holders', {
                                            value: shortNiceNumber(token.holders, 0)
                                          })}
                                        </span>
                                      )}
                                    </span>
                                    {secondaryText ? (
                                      <span className="token-selector-modal-item-secondary" title={secondaryTokenTitle(token)}>
                                        {secondaryText}
                                      </span>
                                    ) : null}
                                  </div>
                                  {hasFiatPrice && (
                                    <span
                                      className="token-selector-modal-item-price"
                                      title={`1 ${getTokenDisplayName(token)} ≈ ${fiatPrice.toFixed()} ${selectedCurrency.toUpperCase()}`}
                                    >
                                      ≈ {shortNiceNumber(fiatPrice.toFixed(), 4, 2, selectedCurrency)}
                                    </span>
                                  )}
                                  {multiple && (
                                    <span className="token-selector-modal-item-check" aria-hidden="true">
                                      {isSelected && <IoCheckmark />}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {!filterByDestination && searchResults.length >= limit && (
                            <p className="center orange">
                              {t(
                                searchMPTokens
                                  ? 'token-selector.more-results-mpts'
                                  : 'token-selector.more-results',
                                { count: limit }
                              )}
                            </p>
                          )}
                        </div>
                      ) : searchQuery ? (
                        <div className="token-selector-modal-empty">{t('general.no-data')}</div>
                      ) : filterByDestination ? (
                        <div className="token-selector-modal-empty">
                          {t('token-selector.no-destination-trustlines')}
                        </div>
                      ) : null}
                    </div>
                    {multiple && (
                      <div className="token-selector-modal-actions">
                        <button
                          type="button"
                          className="button-action"
                          onClick={() => {
                            onChange(selectedTokens)
                            setIsOpen(false)
                          }}
                        >
                          {t('token-selector.show-selected', { count: selectedTokens.length })}
                        </button>
                        {selectedTokens.length > 0 && (
                          <button type="button" className="button-text" onClick={() => setMultipleValue([])}>
                            {t('token-selector.clear-selection')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>
      )}
    </>
  )
}
