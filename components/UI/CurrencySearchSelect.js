import Select from 'react-select'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { IoMdClose } from 'react-icons/io'
import { IoSearch } from 'react-icons/io5'
import { niceCurrency } from '../../utils/format'
import { shortName } from '../../utils'
import { components as selectComponents } from 'react-select'

const limit = 20

// Custom MenuList to show limit message
function MenuList(props) {
  const { children } = props
  const { options } = props
  // limit is in closure
  return (
    <selectComponents.MenuList {...props}>
      {children}
      {options.length >= limit && (
        <div style={{ color: 'orange', padding: '6px 12px 12px 12px' }}>
          More than {limit} results. Please type more to narrow your search.
        </div>
      )}
    </selectComponents.MenuList>
  )
}

export default function CurrencySearchSelect({ setCurrency, defaultValue = '', type }) {
  const [inputValue, setInputValue] = useState(defaultValue || '')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [notEmpty, setNotEmpty] = useState(!!defaultValue)
  const [selectedOption, setSelectedOption] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!inputValue) {
      setSearchSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      if (inputValue.length < 2) {
        setSearchSuggestions([])
        return
      }

      setSearchingSuggestions(true)

      try {
        const res = await axios(
          `/v2/${type === 'mpt' ? 'mptokens' : 'trustlines'}/currencies/search/${encodeURIComponent(
            inputValue
          )}?limit=${limit}&currencyDetails=true`
        )
        let list = res?.data
        if (list && list.currencies) list = list.currencies
        if (!Array.isArray(list)) list = []

        const opts = list
          .map((item) => {
            let value = null
            let label = null
            if (typeof item === 'string') {
              value = item
              label = niceCurrency(item)
              if (item.length > 3 && (item.substr(0, 2) === '02' || !item.match(/^[A-Za-z0-9]{3}$/))) {
                label += ` (${shortName(item)})`
              }
            } else if (item.currency) {
              value = item.currency
              if (item.currencyDetails) {
                label = item.currencyDetails.currency
              } else {
                label = niceCurrency(item.currency)
              }
              if (
                item.currency.length > 3 &&
                (item.currency.substr(0, 2) === '02' || !item.currency.match(/^[A-Za-z0-9]{3}$/))
              ) {
                label += ` (${shortName(item.currency)})`
              }
            } else if (item.code) {
              value = item.code
              label = niceCurrency(item.code)
              if (item.code.length > 3 && (item.code.substr(0, 2) === '02' || !item.code.match(/^[A-Za-z0-9]{3}$/))) {
                label += ` (${shortName(item.code)})`
              }
            }
            if (!value) return null
            return { value, label, item }
          })
          .filter(Boolean)

        setSearchSuggestions(opts)
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

  const searchOnChange = (option) => {
    if (!option) {
      setInputValue('')
      setNotEmpty(false)
      setSelectedOption(null)
      if (setCurrency) setCurrency('')
      return
    }
    setInputValue(option.value)
    setNotEmpty(true)
    setSelectedOption(option)
    if (setCurrency) setCurrency(option.value)
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
    setSelectedOption(null)
    if (setCurrency) setCurrency('')
  }

  const onSearchClick = () => {
    if (setCurrency) setCurrency(inputValue)
  }

  return (
    <div className="center">
      <span className="input-title">
        Currency
        {selectedOption && selectedOption.item && (
          <>
            : <b>{selectedOption.item.currencyDetails?.currency}</b>
          </>
        )}
      </span>
      <div className="form-input">
        <div className="form-input__wrap">
          <Select
            className={`address-input${notEmpty ? ' not-empty' : ''}`}
            classNamePrefix="react-select"
            instanceId="currency-search-select"
            placeholder="Search currency"
            isClearable
            onInputChange={searchOnInputChange}
            onChange={searchOnChange}
            options={searchSuggestions}
            inputValue={inputValue}
            value={null}
            isLoading={searchingSuggestions}
            components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null, MenuList }}
            filterOption={() => true}
            noOptionsMessage={() =>
              inputValue.length > 2 ? 'No results found' : 'Start typing to search for currencies'
            }
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
