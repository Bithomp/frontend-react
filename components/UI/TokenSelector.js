import React, { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { IoSearch } from 'react-icons/io5'
import { IoMdClose } from 'react-icons/io'
import { IoChevronDown } from 'react-icons/io5'
import axios from 'axios'
import { avatarServer, nativeCurrency, nativeCurrenciesImages, useWidth } from '../../utils'
import { niceCurrency, shortAddress, shortNiceNumber } from '../../utils/format'

const limit = 20

export default function TokenSelector({ value, onChange, excludeNative = false }) {
  const { t } = useTranslation()
  const width = useWidth()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)

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
        // do not reload default token list if it's already loaded
        // when searched for native currency, we also add the native currency on top,
        // so check that it's not that case before canceling the search
        if (
          searchResults[0]?.currency === nativeCurrency &&
          !niceCurrency(searchResults[1]?.currency)?.toLowerCase().startsWith(nativeCurrency.toLowerCase())
        )
          return

        setIsLoading(true)
        try {
          const response = await axios('v2/trustlines/tokens?limit=' + limit)
          const tokens = response.data?.tokens || []
          if (excludeNative) {
            setSearchResults(tokens)
          } else {
            setSearchResults([{ currency: nativeCurrency }, ...tokens])
          }
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
        //limit doesn't work with search..
        const response = await axios(`v2/trustlines/tokens/search/${searchQuery}?limit=${limit}`)
        const tokens = response.data?.tokens || []

        if (!excludeNative && searchQuery.toUpperCase() === nativeCurrency.toUpperCase()) {
          // If search for native currency, add it first
          tokens.unshift({ currency: nativeCurrency })
        }

        setSearchResults(tokens)
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
  }, [searchQuery, isOpen])

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
    return niceCurrency(token.currency)
  }

  return (
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
                <h3 className="token-selector-modal-title">Select Token</h3>
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
                        key={`${token.token}-${index}`}
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
                              {token.trustlines !== undefined && token.holders !== undefined && (
                                <span style={{ marginLeft: '8px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                  {shortNiceNumber(token.holders, 0, 0, null, true)} holders
                                </span>
                              )}
                            </span>
                            {width > 1100 ? <span>{token.issuer}</span> : <span>{shortAddress(token.issuer)}</span>}
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
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
