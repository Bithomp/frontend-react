import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { IoSearch } from 'react-icons/io5'
import { IoMdClose } from 'react-icons/io'
import { IoChevronDown } from 'react-icons/io5'
import axios from 'axios'
import {
  avatarServer,
  nativeCurrency,
  isNativeCurrency,
  nativeCurrenciesImages,
  useWidth,
  setTabParams
} from '../../utils'
import { niceCurrency, shortAddress, shortNiceNumber, amountFormat } from '../../utils/format'
import RadioOptions from './RadioOptions'
import { useRouter } from 'next/router'

const limit = 20

// Helper function to fetch and process trustlines for a destination address
const fetchTrustlinesForDestination = async (destinationAddress, searchQuery = '') => {
  const response = await axios(`v2/objects/${destinationAddress}?limit=1000`)
  const objects = response.data?.objects || []

  // Filter RippleState objects to get trustlines where destination can hold tokens
  const trustlines = objects.filter((obj) => {
    if (obj.LedgerEntryType !== 'RippleState') return false
    if (parseFloat(obj.LowLimit.value) <= 0 && parseFloat(obj.HighLimit.value) <= 0) return false

    // If search query is provided, filter by it
    if (searchQuery) {
      const currency = obj.Balance.currency
      const issuerDetails =
        obj.HighLimit.issuer === destinationAddress ? obj.LowLimit.issuerDetails : obj.HighLimit.issuerDetails || {}
      const serviceOrUsername = issuerDetails.service || issuerDetails.username || ''
      const issuer = obj.HighLimit.issuer === destinationAddress ? obj.LowLimit.issuer : obj.HighLimit.issuer || ''

      const searchLower = searchQuery.toLowerCase()
      return (
        currency.toLowerCase().includes(searchLower) ||
        serviceOrUsername.toLowerCase().includes(searchLower) ||
        issuer.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Convert trustlines to token format
  return trustlines.map((tl) => ({
    currency: tl.Balance.currency,
    issuer: tl.HighLimit.issuer === destinationAddress ? tl.LowLimit.issuer : tl.HighLimit.issuer,
    issuerDetails: tl.HighLimit.issuer === destinationAddress ? tl.LowLimit.issuerDetails : tl.HighLimit.issuerDetails,
    limit: Math.max(parseFloat(tl.LowLimit.value), parseFloat(tl.HighLimit.value)),
    balance: tl.Balance.value
  }))
}

// Helper function to add native currency to tokens array if needed
const addNativeCurrencyIfNeeded = (tokens, excludeNative, searchQuery = '') => {
  if (excludeNative) return tokens

  const shouldAddNative = !searchQuery || searchQuery.toUpperCase() === nativeCurrency.toUpperCase()
  if (shouldAddNative) {
    tokens.unshift({ currency: nativeCurrency, limit: null })
  }

  return tokens
}

export default function TokenSelector({
  value,
  onChange,
  excludeNative = false,
  destinationAddress = null,
  allOrOne,
  currencyQueryName
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const width = useWidth()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)

  // control radio selection: 'all' | 'single'
  const [filterMode, setFilterMode] = useState(() => (value?.currency ? 'single' : 'all'))

  useEffect(() => {
    if (!currencyQueryName) return
    let queryAddList = []
    let queryRemoveList = []
    if (value?.currency) {
      queryAddList.push({ name: currencyQueryName, value: value.currency })
    } else {
      queryRemoveList.push(currencyQueryName)
    }
    if (value?.issuer) {
      queryAddList.push({ name: currencyQueryName + 'Issuer', value: value.issuer })
    } else {
      queryRemoveList.push(currencyQueryName + 'Issuer')
    }
    setTabParams(router, [], queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currencyQueryName])

  useEffect(() => {
    if (!allOrOne) return
    if (filterMode === 'all') {
      onChange({}) // clear any selected token
    } else if (filterMode === 'single' && !value?.currency) {
      onChange({ currency: nativeCurrency }) // default to native currency if no token selected
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrOne, filterMode])

  // Clear search results when destination address changes
  useEffect(() => {
    setSearchResults([])
    setSearchQuery('')
  }, [destinationAddress])

  // Handle search with debounce
  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    const timeout = setTimeout(async () => {
      if (!searchQuery) {
        // Only apply the early return logic when there's no destination address
        // When destination address is provided, we always want to fetch fresh data
        if (!destinationAddress) {
          // do not reload default token list if it's already loaded
          // when searched for native currency, we also add the native currency on top,
          // so check that it's not that case before canceling the search
          if (
            isNativeCurrency(searchResults[0]) &&
            !niceCurrency(searchResults[1]?.currency)?.toLowerCase().startsWith(nativeCurrency.toLowerCase())
          )
            return
        } else {
          // For destination address case, check if we already have results loaded
          if (searchResults.length > 0) {
            return
          }
        }

        setIsLoading(true)
        try {
          let tokens = []

          if (destinationAddress) {
            // Fetch tokens that destination can hold based on trustlines
            tokens = await fetchTrustlinesForDestination(destinationAddress)
            tokens = addNativeCurrencyIfNeeded(tokens, excludeNative)
          } else {
            // Fallback to original behavior if no destination address
            const response = await axios('v2/trustlines/tokens?limit=' + limit + '&currencyDetails=true')
            tokens = response.data?.tokens || []
            if (!excludeNative) {
              setSearchResults([{ currency: nativeCurrency }, ...tokens])
            } else {
              setSearchResults(tokens)
            }
            setIsLoading(false)
            return
          }

          setSearchResults(tokens)
        } catch (error) {
          console.error('Error loading tokens:', error)
          if (excludeNative) {
            setSearchResults([])
          } else {
            setSearchResults([{ currency: nativeCurrency }])
          }
        } finally {
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      try {
        if (destinationAddress) {
          // For destination-specific search, filter the existing trustlines
          const tokens = await fetchTrustlinesForDestination(destinationAddress, searchQuery)
          const tokensWithNative = addNativeCurrencyIfNeeded(tokens, excludeNative, searchQuery)
          setSearchResults(tokensWithNative)
        } else {
          // Fallback to original search behavior
          const response = await axios(`v2/trustlines/tokens/search/${searchQuery}?limit=${limit}&currencyDetails=true`)
          const tokens = response.data?.tokens || []
          const tokensWithNative = addNativeCurrencyIfNeeded(tokens, excludeNative, searchQuery)
          setSearchResults(tokensWithNative)
        }
      } catch (error) {
        console.error('Error searching tokens:', error)
        setSearchResults([])
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
  }, [searchQuery, isOpen, destinationAddress])

  const handleSelect = (token) => {
    onChange(token)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Helper to get icon url if available
  const getTokenIcon = (token) => {
    let imageUrl = avatarServer + token.issuer
    if (!token.issuer) {
      imageUrl = nativeCurrenciesImages[nativeCurrency]
    }
    return imageUrl
  }

  // Helper to get token display name
  const getTokenDisplayName = (token) => {
    if (!token || !token.currency) return 'Select Token'
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

  // Helper to get token limit display
  const getTokenLimitDisplay = (token) => {
    if (!token.limit || token.currency === nativeCurrency) return null

    return (
      <div className="token-selector-modal-item-limit">
        <span className="token-selector-modal-item-limit-label">Max:</span>
        <span className="token-selector-modal-item-limit-value">
          {amountFormat({ value: token.limit, currency: token.currency, issuer: token.issuer }, { short: true })}
        </span>
      </div>
    )
  }

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
            onClick={() => setIsOpen(true)}
            role="button"
            style={{ outline: 'none' }}
          >
            {/* Icon */}
            {value && value.currency && (
              <div className="token-selector-icon">
                <img src={getTokenIcon(value)} alt={niceCurrency(value.currency)} />
              </div>
            )}
            {/* Text */}
            <div className="token-selector-label">
              <span className="token-selector-code">
                {value && value.currency ? getTokenDisplayName(value) : 'Select Token'}
              </span>
            </div>
            {/* Chevron */}
            <div className="token-selector-chevron">
              <IoChevronDown />
            </div>
          </div>

          {isOpen && (
            <div className="token-selector-modal">
              <div className="token-selector-modal-content">
                {/* Backdrop */}
                <div className="token-selector-modal-backdrop" onClick={() => setIsOpen(false)} />

                {/* Modal */}
                <div className="token-selector-modal-container">
                  <div className="token-selector-modal-header">
                    <h3 className="token-selector-modal-title">
                      {destinationAddress ? 'Select Token (Destination can hold)' : 'Select Token'}
                    </h3>
                    <IoMdClose className="token-selector-modal-close" onClick={() => setIsOpen(false)} />
                  </div>

                  <div className="form-input">
                    <div className="form-input__wrap">
                      <input
                        className="simple-input"
                        placeholder="Search by currency, issuer, or username"
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
                        {searchResults.map((token, index) => (
                          <div
                            key={`${token.currency}-${token.issuer}-${index}`}
                            className="token-selector-modal-item"
                            onClick={() => handleSelect(token)}
                          >
                            <div className="token-selector-modal-item-content">
                              <div className="token-selector-modal-item-icon">
                                <img
                                  src={getTokenIcon(token)}
                                  alt={niceCurrency(token.currency)}
                                  className="token-selector-modal-icon"
                                />
                              </div>
                              <div className="token-selector-modal-item-name">
                                <span>
                                  {getTokenDisplayName(token)}
                                  {token.holders !== undefined && (
                                    <span
                                      style={{ marginLeft: '8px', fontSize: '0.85em', color: 'var(--text-secondary)' }}
                                    >
                                      {shortNiceNumber(token.holders, 0)} holders
                                    </span>
                                  )}
                                </span>
                                {width > 1100 ? <span>{token.issuer}</span> : <span>{shortAddress(token.issuer)}</span>}
                                {getTokenLimitDisplay(token)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {searchResults.length >= limit && (
                          <p className="center orange">
                            More than {limit} results found. Please specify an issuer to narrow down the search.
                          </p>
                        )}
                      </div>
                    ) : searchQuery ? (
                      <div className="token-selector-modal-empty">{t('general.no-data')}</div>
                    ) : destinationAddress ? (
                      <div className="token-selector-modal-empty">
                        No trustlines found for this destination address.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
