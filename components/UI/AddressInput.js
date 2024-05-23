import { IoMdClose } from "react-icons/io";
import { useState, useEffect } from 'react'
import Select from 'react-select'
import { useTranslation } from 'next-i18next'
import axios from 'axios';

import {
  isAddressOrUsername,
  useWidth
} from '../../utils'

import { amountFormat, userOrServiceLink } from '../../utils/format'

let typingTimer

export default function AddressInput({ placeholder, title, setValue, rawData, type, disabled }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const [inputValue, setInputValue] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [link, setLink] = useState("")
  const [notEmpty, setNotEmpty] = useState(false)

  useEffect(() => {
    setIsMounted(true);
  }, [])

  useEffect(() => {
    if (rawData) {
      rawData[type] && setNotEmpty(true)
      setInputValue(rawData[type])
      setLink(userOrServiceLink(rawData, type))

      if (disabled) {
        clearAll()
      }

      if(rawData.error) {
        setInputValue("");
        setLink("");
        setNotEmpty(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData])

  const searchOnKeyUp = e => {
    const valueInp = e.target.value;
    const maxCount = 2;

    if (valueInp.length > 0) {
      setNotEmpty(true);
    } else {
      clearAll();
    }

    if (e.key === 'Enter' && isAddressOrUsername(valueInp)) {
      setValue(valueInp);
      clearTimeout(typingTimer)
      setSearchingSuggestions(false)
      setSearchSuggestions([])
      return
    }

    //if more than 3 characters - search for suggestions
    if (valueInp && valueInp.length > 0) {
      clearTimeout(typingTimer);
      setSearchSuggestions([]);
      typingTimer = setTimeout(async () => {
        if (valueInp && valueInp.length > maxCount) {
          setSearchingSuggestions(true)
          const url = "v2/address/search/" + valueInp;

          const suggestionsResponse = await axios(url).catch((error) => {
            setSearchingSuggestions(false);
            console.log(error.message);
          })

          if (suggestionsResponse) {
            const suggestions = suggestionsResponse.data
            if (suggestions?.addresses?.length > 0) {
              setSearchSuggestions(suggestions.addresses);
            }
          }
          setSearchingSuggestions(false)
        }
      }, 500) // 0.5 sec
    }
  }

  const searchOnChange = option => {
    if (!option) {
      setValue("")
      return
    }

    if (option.username && !option.username.includes("-")) {
      onSearch(option.username)
    } else {
      onSearch(option.address)
    }

    setSearchSuggestions([]);
  }

  const onSearch = async (si) => {
    setErrorMessage("")
    let searchFor = null

    if (typeof si === 'string') {
      searchFor = si
    }

    if (!searchFor) return

    if (searchFor.includes("/") || searchFor.includes("\\")) {
      setErrorMessage(t("explorer.no-slashes"))
      return
    }

    setValue(searchFor)

    return
  }

  const onSearchClick = () => {
    setValue(inputValue);
    setInputValue(inputValue);
  }

  const searchOnInputChange = (value, action) => {
    if (action.action !== "input-blur" && action.action !== "menu-close") {
      setNotEmpty(true)
      setInputValue(value)
    }
  }

  const clearAll = () => {
    setValue("");
    setInputValue("");
    setLink("");
    setNotEmpty(false);
    setSearchSuggestions([]);
  }

  return (
    <div className="center">
      <span className='input-title'>{title} {link}</span>
      <div className={`form-input form-input--address${disabled ? ' disabled' : ''}`}>
        {isMounted &&
          <div className="form-input__wrap" onKeyUp={searchOnKeyUp}>
            <Select
              className={`form-input-select${notEmpty ? ' not-empty' : ''}`}
              placeholder={placeholder}
              onChange={searchOnChange}
              spellCheck="false"
              inputValue={inputValue}
              options={searchSuggestions}
              isClearable={true}
              value={notEmpty ? inputValue : null}
              getOptionLabel={
                (option) => <>
                  <span style={windowWidth < 400 ? { fontSize: "14px" } : {}}>{option.address || option.issuer}</span>
                  {(option.username || option.service || option.globalid || option.xumm) ? (windowWidth > 400 ? " - " : " ") : ""}
                  <b className='blue'>{option.username}</b>
                  {option.service && <>
                    {option.username ? " (" : ""}
                    <b className='green'>{option.service}</b>
                    {option.username ? ")" : ""}
                  </>}
                  {(option.username || option.service) && (option.verifiedDomain || option.serviceDomain) && <>, </>}
                  {option.verifiedDomain ?
                    <span className='green bold'> {option.verifiedDomain}</span>
                    :
                    (option.serviceDomain && <span className='green'> {option.serviceDomain}</span>)
                  }
                  {(option.username || option.service || option.verifiedDomain || option.serviceDomain) && option.xumm && <>, </>}
                  {option.xumm &&
                    <>
                      Xaman <span className='orange'>
                        {option.xumm.includes("+") ? option.xumm.replace(/\+/g, " (") + ")" : option.xumm}
                      </span>
                      {option.xummVerified && <> ✅</>}
                    </>
                  }
                  {(option.username || option.service || option.verifiedDomain || option.serviceDomain || option.xumm) && option.globalid && <>, </>}
                  {option.globalid &&
                    <>
                      GlobaliD <span className='purple'>{option.globalid}</span>
                      {option.globalidStatus && <> ✔️</>}
                    </>
                  }
                  {option.balance &&
                    <> [<b>{amountFormat(option.balance, { maxFractionDigits: 2 }).trim()}</b>]</>
                  }
                </>
              }
              getOptionValue={(option) =>
                option.address +
                option.username +
                option.service +
                option.xumm +
                option.globalid +
                option.verifiedDomain +
                option.serviceDomain
              }
              onInputChange={searchOnInputChange}
              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
              classNamePrefix="react-select"
              instanceId="search-select"
              noOptionsMessage={
                () => searchingSuggestions ? t("explorer.searching-for-addresses") : null
              }
            />
            <div className="form-input__btns">
              <button className="form-input__clear" onClick={clearAll}><IoMdClose /></button>
              <div className='search-button' onClick={onSearchClick}>
                <img
                  src='/images/search.svg'
                  className='search-icon'
                  alt='search'
                />
              </div>
            </div>
          </div>
        }

        {errorMessage &&
          <div className='orange' style={{ position: "absolute", bottom: "-50px", minHeight: "42px", textAlign: "left" }}>
            {errorMessage}
          </div>
        }
      </div>
    </div>
  )
}