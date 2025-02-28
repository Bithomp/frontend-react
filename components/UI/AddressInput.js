import { IoMdClose } from 'react-icons/io'
import { useState, useEffect } from 'react'
import Select from 'react-select'
import { useTranslation } from 'next-i18next'
import axios from 'axios'

import { isAddressOrUsername, isAddressValid, useWidth } from '../../utils'

import { amountFormat, userOrServiceLink } from '../../utils/format'

import { IoSearch } from 'react-icons/io5'

let typingTimer

export default function AddressInput({
  placeholder,
  title,
  setValue,
  rawData,
  type,
  disabled,
  hideButton,
  setInnerValue
}) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const [inputValue, setInputValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [link, setLink] = useState('')
  const [notEmpty, setNotEmpty] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (setInnerValue) {
      setInnerValue(inputValue)
    }
    if (!isAddressValid(inputValue)) {
      setLink('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  useEffect(() => {
    setErrorMessage('')
    if (rawData && rawData[type]) {
      setNotEmpty(true)
      setInputValue(rawData[type])
      setLink(userOrServiceLink(rawData, type))

      if (disabled) {
        clearAll()
      }
    }
    if (!rawData || rawData?.error) {
      setInputValue('')
      setLink('')
      setNotEmpty(false)
      setSearchingSuggestions(false)
      setSearchSuggestions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData])

  const searchOnKeyUp = async (e) => {
    setErrorMessage('')
    const valueInp = e.target.value
    const maxCount = 2

    if (valueInp.length > 0) {
      setNotEmpty(true)
    } else {
      clearAll()
    }

    if (e.key === 'Enter' && isAddressOrUsername(valueInp)) {
      //request one address/username and set link, check if it's valid

      clearTimeout(typingTimer)
      setSearchingSuggestions(false)
      setSearchSuggestions([])

      let url = 'v2/username/' + valueInp
      if (isAddressValid(valueInp)) {
        url = 'v2/address/' + valueInp
      }

      const response = await axios(url + '?username=true&service=true').catch((error) => {
        console.log(error.message)
        setErrorMessage(t('error.' + error.message))
      })

      const data = response?.data

      if (data?.address) {
        setLink(
          userOrServiceLink(
            {
              address: data.address,
              addressDetails: {
                username: data.username,
                service: data.service?.name
              }
            },
            'address'
          )
        )
        if (setValue) setValue(data.address)
        setInputValue(data.address)
      } else {
        setErrorMessage('No address found')
      }
      return
    }

    //if more than 3 characters - search for suggestions
    if (valueInp && valueInp.length > 0) {
      clearTimeout(typingTimer)
      setSearchSuggestions([])
      typingTimer = setTimeout(async () => {
        if (valueInp && valueInp.length > maxCount) {
          setSearchingSuggestions(true)
          const url = 'v2/address/search/' + valueInp

          const suggestionsResponse = await axios(url).catch((error) => {
            setSearchingSuggestions(false)
            console.log(error.message)
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

  const searchOnChange = (option) => {
    if (!option) {
      if (setValue) setValue('')
      setInputValue('')
      setLink('')
      setErrorMessage('')
      return
    }

    if (setValue) setValue(option.address)
    setInputValue(option.address)
    setLink(
      userOrServiceLink(
        {
          address: option.address || option.issuer,
          addressDetails: {
            username: option.username,
            service: option.service
          }
        },
        'address'
      )
    )

    setSearchSuggestions([])
  }

  const onSearchClick = () => {
    if (setValue) setValue(inputValue)
    setInputValue(inputValue)
  }

  const searchOnInputChange = (value, action) => {
    if (action.action !== 'input-blur' && action.action !== 'menu-close') {
      setNotEmpty(true)
      setInputValue(value)
    }
  }

  const clearAll = () => {
    if (setValue) setValue('')
    setInputValue('')
    setLink('')
    setNotEmpty(false)
    setSearchSuggestions([])
    setErrorMessage('')
  }

  return (
    <div className="center">
      <span className="input-title">
        {title} {link}
      </span>
      <div className={`form-input${disabled ? ' disabled' : ''}`}>
        {isMounted ? (
          <div className="form-input__wrap" onKeyUp={searchOnKeyUp}>
            <Select
              className={`address-input ${notEmpty ? ' not-empty' : ''}`}
              placeholder={placeholder}
              onChange={searchOnChange}
              onInputChange={searchOnInputChange}
              spellCheck="false"
              inputValue={inputValue} // The value of the search input
              options={searchSuggestions}
              isClearable={true}
              value={inputValue || ''} //The value of the select; reflected by the selected option
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
              getOptionValue={(option) =>
                option.address +
                option.username +
                option.service +
                option.xaman +
                option.verifiedDomain +
                option.serviceDomain
              }
              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
              classNamePrefix="react-select"
              instanceId="address-input"
              noOptionsMessage={() => (searchingSuggestions ? t('explorer.searching-for-addresses') : null)}
            />
            <div className="form-input__btns">
              <button className="form-input__clear" onClick={clearAll}>
                <IoMdClose />
              </button>
              {!hideButton && (
                <div className="search-button" onClick={onSearchClick}>
                  <IoSearch />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-input__wrap">
            <input
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-text"
              spellCheck="false"
              disabled={disabled}
            />
            <div className="form-input__btns">
              <button className="form-input__clear" onClick={clearAll}>
                <IoMdClose />
              </button>
              {!hideButton && (
                <div className="search-button" onClick={onSearchClick}>
                  <IoSearch />
                </div>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            className="orange"
            style={{ position: 'absolute', bottom: '-40px', minHeight: '42px', textAlign: 'right', right: 0 }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}
