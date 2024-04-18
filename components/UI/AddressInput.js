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

export default function AddressInput({ placeholder, title, setValue, rawData, type }) {
  const { t } = useTranslation()
  const windowWidth = useWidth()

  const [inputValue, setInputValue] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)
  const [link, setLink] = useState("")

  useEffect(() => {
    setIsMounted(true);
  }, [])

  useEffect(() => {
    if (rawData) {
      setInputValue(rawData[type])
      setLink(userOrServiceLink(rawData, type))
    }
  }, [rawData])

  const searchOnKeyUp = e => {

    const address = e?.target?.value

    if (e.key === 'Enter' && isAddressOrUsername(address)) {
      setValue(address)
      clearTimeout(typingTimer)
      setSearchSuggestions([])
      return
    }

    //if more than 3 characters - search for suggestions
    if (address && address.length > 0) {
      clearTimeout(typingTimer)
      setSearchSuggestions([])
      typingTimer = setTimeout(async () => {

        if (address && address.length > 2) {
          setSearchingSuggestions(true)
          const suggestionsResponse = await axios('v2/address/search/' + address)
            .catch(error => {
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

  const searchOnChange = option => {
    if (!option) {
      setValue("")
      return
    }

    setValue(option.address)
    if (option.username && !option.username.includes("-")) {
      onSearch(option.username)
    } else {
      onSearch(option.address)
    }
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

  const searchOnInputChange = (value, action) => {
    if (action.action !== "input-blur" && action.action !== "menu-close") {
      setInputValue(value)
    }
  }

  return (
    <div className="center">
      <span className='input-title'>{title} {link}</span>
      <div className="address-input address-input--issuer">
        {isMounted &&
          <div onKeyUp={searchOnKeyUp}>
            <Select
              className="address-input-select"
              placeholder={placeholder}
              onChange={searchOnChange}
              spellCheck="false"
              inputValue={inputValue}
              options={searchSuggestions}
              isClearable={true}
              getOptionLabel={
                (option) => <>
                  <span style={windowWidth < 400 ? { fontSize: "14px" } : {}}>{option.address}</span>
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
              getOptionValue={
                option => (option.address + option.username + option.service + option.xumm + option.globalid + option.verifiedDomain + option.serviceDomain)
              }
              onInputChange={searchOnInputChange}
              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
              classNamePrefix="react-select"
              instanceId="search-select"
              noOptionsMessage={
                () => searchingSuggestions ? t("explorer.searching-for-addresses") : null
              }
            />
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