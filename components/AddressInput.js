import { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import { useTranslation } from 'next-i18next'
import axios from 'axios';

import {
  useWidth
} from '../utils'

import { userOrServiceLink, amountFormat } from '../utils/format'

let typingTimer

export default function AddressInput({ searchPlaceholderText, setFilters, type, inputValue, title, link }) {
  const { t } = useTranslation()
  const searchInput = useRef(null)
  const windowWidth = useWidth()

  const [notEmpty, setNotEmpty] = useState(false)
  const [searchItem, setSearchItem] = useState(inputValue || "")
  const [errorMessage, setErrorMessage] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)

  useEffect(() => {
    setIsMounted(true);
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if(inputValue) {
        const response = await axios('v2/address/search/' + inputValue)
        const { address } = response.data.addresses[0];
        setSearchItem(address);
        setNotEmpty(true);
      }
    }
    fetchData();
  }, [])



  const searchOnKeyUp = e => {
    const value = e?.target?.value;

    //if more than 3 characters - search for suggestions
    if (value && value.length > 0) {
      clearTimeout(typingTimer)
      setSearchSuggestions([])
      typingTimer = setTimeout(async () => {

        if (value && value.length > 2 && type !== 'name') {
          setSearchingSuggestions(true)
          const suggestionsResponse = await axios('v2/address/search/' + value)
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

        if(type === 'name' || type === 'issuer') {
          if(value.length > 2) {
            setNotEmpty(true)
            setFilters({ [type]: value });
          } else {
            notEmpty && setSearchItem('')
            setFilters({ [type]: '' });
          }
        } else {
          setNotEmpty(true)
          setFilters({ [type]: value });
        }

        if(type === 'issuer') {
          if(value.length > 2) {
            setNotEmpty(true)
          } else {
            setNotEmpty(false)
          }
        }
      }, 500) // 0.5 sec
    } else {
      clearAll()
    }
  }

  const clearAll = () => {
    setNotEmpty(false)
    notEmpty && setSearchItem('')
    setFilters({ [type]: '' });
  }

  const searchOnChange = (option) => {
    if (!option) {
      clearAll()
      return
    }

    setSearchItem(option.address)
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

    setFilters({ [type]: searchFor });

    return
  }

  const searchOnInputChange = (value, action) => {
    if (action.action !== "input-blur" && action.action !== "menu-close") {
      setSearchItem(value)
    }
  }

  return (
    <div className={`center${notEmpty ? ' not-empty' : ''}`}>
      <span className='input-title'>{title} {link ? userOrServiceLink(link, type) : ''}</span>
      <div className={`address-input address-input--${type}`}>
        {isMounted &&
        <div onKeyUp={searchOnKeyUp}>
            <Select
            ref={searchInput}
            className="address-input-select"
            placeholder={searchPlaceholderText}
            onChange={searchOnChange}
            spellCheck="false"
            inputValue={searchItem}
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
            components={{ DropdownIndicator:() => null, IndicatorSeparator:() => null }}
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