import Select from 'react-select'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { IoMdClose } from 'react-icons/io'
import { IoSearch } from 'react-icons/io5'
import { shortAddress, amountFormat } from '../../utils/format'
import { useWidth } from '../../utils'

export default function IssuerSearchSelect({ setIssuer, defaultValue = '', type }) {
  // Core states
  const [inputValue, setInputValue] = useState(defaultValue || '')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [notEmpty, setNotEmpty] = useState(!!defaultValue)
  const debounceRef = useRef(null)
  const windowWidth = useWidth()

  // fetch suggestions when inputValue changes (with debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!inputValue) {
      setSearchSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      // we only query if more than 2 characters typed
      if (inputValue.length < 3) {
        setSearchSuggestions([])
        return
      }

      setSearchingSuggestions(true)

      try {
        const res = await axios(
          `/v2/${type === 'mpt' ? 'mptokens' : 'trustlines'}/issuers/search/${encodeURIComponent(inputValue)}`
        )
        let list = res?.data
        if (list && list.issuers) list = list.issuers
        if (!Array.isArray(list)) list = []
        const options = list
          .map((item) => {
            let address = null
            let name = null
            if (typeof item === 'string') {
              address = item
            } else if (item.issuer) {
              address = item.issuer
              name = item.username || item.name || null
            } else if (item.address) {
              address = item.address
              name = item.username || item.name || null
            }
            if (!address) return null
            return {
              value: address,
              label: name ? `${name} (${shortAddress(address, 6)})` : shortAddress(address, 10),
              address,
              username: name,
              service: item.service,
              xaman: item.xaman,
              verifiedDomain: item.verifiedDomain,
              serviceDomain: item.serviceDomain,
              balance: item.balance
            }
          })
          .filter(Boolean)

        setSearchSuggestions(options)
      } catch (e) {
        setSearchSuggestions([])
      } finally {
        setSearchingSuggestions(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  // Select handlers
  const searchOnChange = (option) => {
    if (!option) {
      setInputValue('')
      setNotEmpty(false)
      if (setIssuer) setIssuer('')
      return
    }
    setInputValue(option.value)
    setNotEmpty(true)
    if (setIssuer) setIssuer(option.value)
  }

  const searchOnInputChange = (value, action) => {
    if (action.action !== 'input-blur' && action.action !== 'menu-close') {
      setInputValue(value)
      setNotEmpty(!!value)
    }
    return value
  }

  const clearAll = () => {
    setInputValue('')
    setNotEmpty(false)
    setSearchSuggestions([])
    if (setIssuer) setIssuer('')
  }

  const onSearchClick = () => {
    if (setIssuer) setIssuer(inputValue)
  }

  return (
    <div className="center">
      <span className="input-title">Issuer</span>
      <div className="form-input">
        <div className="form-input__wrap">
          <Select
            className={`address-input${notEmpty ? ' not-empty' : ''}`}
            placeholder="Search issuer"
            onChange={searchOnChange}
            onInputChange={searchOnInputChange}
            inputValue={inputValue}
            value={inputValue ? { value: inputValue, label: inputValue } : null}
            options={searchSuggestions}
            getOptionLabel={(option) => (
              <>
                <span style={windowWidth < 400 ? { fontSize: '14px' } : {}}>{option.address || option.issuer}</span>
                {option.username || option.service || option.xaman ? (windowWidth > 400 ? ' - ' : ' ') : ''}
                <b className="blue">{option.username}</b>
                {option.service && (
                  <>
                    {option.username ? ' (' : ''}
                    <b className="green">{option.service}</b>
                    {option.username ? ')' : ''}
                  </>
                )}
                {(option.username || option.service) && (option.verifiedDomain || option.serviceDomain) && <>, </>}
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
                {(option.username ||
                  option.service ||
                  option.verifiedDomain ||
                  option.serviceDomain ||
                  option.xaman) && <>, </>}
                {option.balance && (
                  <>
                    {' '}
                    [<b>{amountFormat(option.balance, { maxFractionDigits: 2, noSpace: true })}</b>]
                  </>
                )}
              </>
            )}
            getOptionValue={(option) => option.value}
            isClearable
            isLoading={searchingSuggestions}
            classNamePrefix="react-select"
            instanceId="issuer-search-select"
            components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
            filterOption={() => true}
            noOptionsMessage={() => (inputValue.length > 3 ? 'No results found' : 'Start typing to search for issuers')}
          />
          <div className="form-input__btns">
            <button className="form-input__clear" onClick={clearAll}>
              <IoMdClose />
            </button>
            <div className="search-button" onClick={onSearchClick}>
              <IoSearch />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
