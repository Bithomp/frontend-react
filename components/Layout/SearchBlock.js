import { useState, useEffect, useRef } from 'react'
import Select, { components } from 'react-select'
import { useTranslation, Trans } from 'next-i18next'
import { useRouter } from 'next/router'
import axios from 'axios'
import { useSearchParams } from 'next/navigation'
import { IoMdClose } from 'react-icons/io'

import {
  isAddressOrUsername,
  isIdValid,
  useWidth,
  isValidCTID,
  decodeCTID,
  networkId,
  networksIds,
  isValidNftXls20,
  isCurrencyHashValid,
  isValidPayString,
  isValidXAddress,
  performIdSearch,
  isLedgerIndexValid
} from '../../utils'
import { userOrServiceName, amountFormat } from '../../utils/format'

import { IoSearch } from 'react-icons/io5'

const searchItemRe = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i
let typingTimer

const CustomClearIndicator = (props) => {
  const {
    selectProps: { inputValue, onInputChange },
    setSearchSuggestions
  } = props

  if (!inputValue) return null

  const handleClear = (e) => {
    e.stopPropagation()
    props.clearValue()
    setSearchSuggestions([])
    onInputChange('', { action: 'input-change' })
  }

  return (
    <div
      onClick={handleClear}
      onTouchEnd={handleClear}
      style={{
        cursor: 'pointer',
        paddingRight: '8px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <IoMdClose size={18} color="#666" />
    </div>
  )
}

const CustomIndicatorsContainer = (props) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <CustomClearIndicator {...props} setSearchSuggestions={props.selectProps.setSearchSuggestions} />
      <components.IndicatorsContainer {...props} />
    </div>
  )
}
export default function SearchBlock({
  searchPlaceholderText,
  tab = null,
  userData = {},
  isSsrMobile,
  compact = false,
  type = ''
}) {
  const { t, i18n } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const searchInput = useRef(null)
  const windowWidth = useWidth()

  const { id } = router.query

  const [searchItem, setSearchItem] = useState(id || userData?.address || '')
  const [searching, setSearching] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  if (!searchPlaceholderText) {
    searchPlaceholderText =
      isSsrMobile || (windowWidth && windowWidth < 730)
        ? t('home.search-placeholder-short')
        : t('home.search-placeholder')
  }

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (!id && searchInput.current) {
      searchInput.current.focus()
    }
  }, [id, searchInput])

  useEffect(() => {
    if (userData?.address) {
      setSearchItem(userData.address)
    }
  }, [userData])

  const requestSuggestions = (value) => {
    if (isValidCTID(value)) {
      return
    }

    //if more than 3 characters - search for suggestions
    if (value && value.length > 1 && value.length < 64) {
      clearTimeout(typingTimer)
      setSearchSuggestions([])
      typingTimer = setTimeout(async () => {
        if (value && value.length > 2) {
          setSearchingSuggestions(true)
          const suggestionsResponse = await axios('v2/address/search/' + value).catch(() => {
            setSearchingSuggestions(false)
          })
          if (suggestionsResponse) {
            const suggestions = suggestionsResponse.data
            if (suggestions?.addresses?.length > 0) {
              setSearchSuggestions(suggestions.addresses)
            }
          }
          setSearchingSuggestions(false)
        }
      }, 500) // 0.5 sec
    }
  }

  const searchOnKeyUp = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSearch()
      return
    }

    // if printable character entered
    // e.key === 'Unidentified' - for android chrome
    if (e.key === 'Unidentified' || ([...e.key].length === 1 && !e.ctrlKey && !e.metaKey)) {
      // We should allow spaces here... or even non-latin characters, so that validation can be removed, together with searchItemRe
      if (!searchItemRe.test(e.key)) {
        e.preventDefault()
        return
      }
      requestSuggestions(e?.target?.value)
    }
  }

  const searchOnChange = (option) => {
    if (!option) return
    if (option.payString) {
      onSearch(option.payString)
    } else if (option.xAddress) {
      onSearch(option.xAddress)
    } else if (option.username && !option.username.includes('-')) {
      onSearch(option.username)
    } else {
      onSearch(option.address)
    }
  }

  // a stupid hack to remove id param
  let addParams = ''
  if (searchParams) {
    let searchPart = searchParams.toString()
    let searchId = searchParams.get('id')
    if (searchId) {
      if (searchPart.indexOf('id=' + searchId + '&') !== -1) {
        searchPart = searchPart.replace('id=' + searchId + '&', '')
      } else if (searchPart.indexOf('&id=' + searchId) !== -1) {
        searchPart = searchPart.replace('&id=' + searchId, '')
      } else {
        searchPart = searchPart.replace('id=' + searchId, '')
      }
    }
    if (searchPart) {
      addParams = '?' + searchPart
    }
  }

  const onSearch = async (si) => {
    setErrorMessage('')
    let searchFor = null

    if (typeof searchItem === 'string') {
      searchFor = searchItem.trim()
    }

    if (typeof si === 'string') {
      searchFor = si
    }

    if (!searchFor) return

    if (tab === 'nft' && isValidNftXls20(searchFor)) {
      router.push('/nft/' + encodeURI(searchFor))
      return
    }

    if (tab === 'amm' && isCurrencyHashValid(searchFor)) {
      router.push('/amm/' + encodeURI(searchFor))
      return
    }

    if (isIdValid(searchFor)) {
      //nft nftOffer uriToken
      //redirect to the right page or sets an error message
      setSearching(true)
      await performIdSearch({ searchFor, router, setErrorMessage })
      setSearching(false)
      return
    }

    if (isValidCTID(searchFor)) {
      try {
        const { networkId: CTIDnetworkId } = decodeCTID(searchFor)
        if (networkId === CTIDnetworkId) {
          // we are on the correct explorer
          window.location = '/' + i18n.language + '/tx/' + searchFor
        } else if (networksIds[CTIDnetworkId]) {
          setErrorMessage(
            <>
              <Trans i18nKey="explorer.different-network">
                This transaction is from the <b>{{ networkNameOrId: networksIds[CTIDnetworkId].name }}</b> network
              </Trans>
              ,{' '}
              <Trans i18nKey="explorer.check-tx-on-different-explorer">
                check the details{' '}
                <a href={networksIds[CTIDnetworkId].server + '/' + i18n.language + '/tx/' + searchFor}>
                  <u>here</u>
                </a>
              </Trans>
            </>
          )
          return
        } else {
          setErrorMessage(
            <>
              <Trans i18nKey="explorer.different-network">
                This transaction is from the <b>{{ networkNameOrId: CTIDnetworkId }}</b> network
              </Trans>
              , {t('explorer.not-supported-network')}
            </>
          )
          return
        }
      } catch (error) {
        setErrorMessage(error)
        return
      }
    }

    if (searchFor.includes('/') || searchFor.includes('\\')) {
      setErrorMessage(t('explorer.no-slashes'))
      return
    }

    if (isLedgerIndexValid(searchFor)) {
      router.push('/ledger/' + searchFor)
      return
    }

    if (isValidPayString(searchFor) || isValidXAddress(searchFor)) {
      // the check for paystring/xAddress should be before the check for addressOrUsername
      // as if there is no destination tag, we will treat it as an address or username
      router.push('/account/' + encodeURI(searchFor) + addParams)
      return
    }

    if (isAddressOrUsername(searchFor)) {
      if (tab === 'nfts') {
        router.push('/nfts/' + encodeURI(searchFor) + addParams)
        return
      }

      if (tab === 'nft-offers') {
        router.push('/nft-offers/' + encodeURI(searchFor) + addParams)
        return
      }

      if (tab === 'amm') {
        router.push('/amm/' + encodeURI(searchFor))
        return
      }

      if (tab === 'nft-volumes') {
        router.push('/nft-volumes/' + encodeURI(searchFor) + addParams)
        return
      }

      if (tab === 'transactions') {
        router.push('/account/' + encodeURI(searchFor) + '/transactions' + addParams)
        return
      }

      if (tab === 'dex') {
        router.push('/account/' + encodeURI(searchFor) + '/dex' + addParams)
        return
      }

      router.push('/account/' + encodeURI(searchFor) + addParams)
      return
    }

    return
  }

  const searchOnInputChange = (inputValue, action) => {
    if (action.action !== 'input-blur' && action.action !== 'menu-close') {
      setSearchItem(inputValue)
    }
    if (action.action === 'input-change' && inputValue === '') {
      setSearchItem('')
    }
  }

  const explorerHeader = (tab) => {
    if (
      ['amm', 'account', 'nft', 'nfts', 'nft-offer', 'nft-offers', 'transaction', 'nft-volumes', 'object'].includes(tab)
    ) {
      return t('explorer.header.' + tab)
    } else if (tab === 'transactions') {
      return t('explorer.menu.transactions')
    } else if (tab === 'dex') {
      return 'DEX Orders'
    }
    return ''
  }

  return (
    <>
      <div
        className={`search-block ${compact ? 'search-block-compact' : ''}`}
        style={type === 'explorer' || compact ? { backgroundColor: 'unset', height: compact ? 'auto' : 90 } : {}}
      >
        <div
          className={`search-box ${compact ? 'search-box-compact' : ''}`}
          style={type === 'explorer' || compact ? { marginTop: compact ? '0' : '20px' } : {}}
        >
          {!compact && (
            <div className="above-search-box">
              {searching ? (
                <span className={type === 'explorer' ? '' : 'contrast'}>
                  {t('explorer.searching-tx-nft-nftoffer')}
                  <span className="waiting inline"></span>
                </span>
              ) : (
                <div className={'bold' + (type === 'explorer' ? '' : ' contrast')}>
                  {explorerHeader(tab)} {userOrServiceName(userData)}
                </div>
              )}
            </div>
          )}
          {isMounted ? (
            <div onKeyUp={searchOnKeyUp}>
              <Select
                ref={searchInput}
                className="search-input search-input-select"
                placeholder={searchPlaceholderText}
                onChange={searchOnChange}
                value={null}
                spellCheck="false"
                options={searchSuggestions}
                formatOptionLabel={(option, { context }) => {
                  if (context === 'value') {
                    // Display simple format when selected
                    return option.username || option.address
                  }
                  // Display full format in dropdown
                  return (
                    <>
                      <span style={windowWidth < 400 ? { fontSize: '14px' } : {}}>{option.address}</span>
                      {option.username || option.service || option.xaman ? (windowWidth > 400 ? ' - ' : ' ') : ''}
                      <b className="blue">{option.username}</b>
                      {option.service && (
                        <>
                          {option.username ? ' (' : ''}
                          <b className="green">{option.service}</b>
                          {option.username ? ')' : ''}
                        </>
                      )}
                      {(option.username || option.service) && (option.verifiedDomain || option.serviceDomain) && (
                        <>, </>
                      )}
                      {option.verifiedDomain ? (
                        <span className="green bold"> {option.verifiedDomain}</span>
                      ) : (
                        option.serviceDomain && <span className="green"> {option.serviceDomain}</span>
                      )}
                      {(option.username || option.service || option.verifiedDomain || option.serviceDomain) &&
                        option.xaman && <>, </>}
                      {option.xaman && (
                        <>
                          Xaman{' '}
                          <span className="orange">
                            {option.xaman.includes('+') ? option.xaman.replace(/\+/g, ' (') + ')' : option.xaman}
                          </span>
                          {option.xamanVerified && <> ✅</>}
                        </>
                      )}
                      {option.tag ? (
                        <b className="no-brake">
                          {' '}
                          [TAG: <span className="orange">{option.tag}</span>]
                        </b>
                      ) : (
                        <>
                          {option.balance !== null && (
                            <>
                              {' '}
                              [
                              <b>
                                {amountFormat(option.balance, { maxFractionDigits: 2, noSpace: true }) ||
                                  'Not activated'}
                              </b>
                              ]
                            </>
                          )}
                        </>
                      )}
                    </>
                  )
                }}
                getOptionValue={(option) =>
                  option.address +
                  option.username +
                  option.service +
                  option.payString +
                  option.xaman +
                  option.verifiedDomain +
                  option.serviceDomain +
                  option.xAddress +
                  option.tag
                }
                inputValue={searchItem}
                onInputChange={searchOnInputChange}
                isSearchable={true}
                classNamePrefix="react-select"
                instanceId="search-select"
                noOptionsMessage={
                  () => (searchingSuggestions ? t('explorer.searching-for-addresses') : null)
                  //({ inputValue }) => inputValue.length > 3
                }
                aria-label="Search"
                components={{ IndicatorsContainer: CustomIndicatorsContainer }}
                setSearchSuggestions={setSearchSuggestions}
              />
            </div>
          ) : (
            <input
              aria-label="Search"
              ref={searchInput}
              type="text"
              className="search-input search-input-placeholder"
              placeholder={searchPlaceholderText}
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              onKeyUp={searchOnKeyUp}
              spellCheck="false"
              style={{
                height: compact ? 28 : 36,
                paddingRight: compact ? 38 : 64
              }}
            />
          )}

          <div className="search-button" onClick={onSearch}>
            <IoSearch className="search-icon" />
          </div>
          {errorMessage && (
            <div
              className="orange"
              style={{ position: 'absolute', bottom: '-50px', minHeight: '42px', textAlign: 'left' }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
