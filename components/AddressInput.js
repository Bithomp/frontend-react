import { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

import {
  isValidCTID,
} from '../utils'

import { userOrServiceLink } from '../utils/format'

let typingTimer

export default function AddressInput({ searchPlaceholderText, userData = {}, setFilters, type, inputValue, title, link }) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchInput = useRef(null)

  const { id } = router.query
  const [notEmpty, setNotEmpty] = useState(false)
  const [searchItem, setSearchItem] = useState(id || userData?.address || inputValue || "")
  const [errorMessage, setErrorMessage] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (userData?.address) {
      setSearchItem(userData.address)
    }
  }, [userData])


  const searchOnKeyUp = e => {
    const value= e?.target?.value;

    if (isValidCTID(value)) {
      return
    }

    //if more than 3 characters - search for suggestions
    let notEmpty = false;
    if (value && value.length > 0) {
      clearTimeout(typingTimer)
      typingTimer = setTimeout(async () => {

        if(type === 'search' || type === 'issuer') {
          if(value.length > 2) {
            notEmpty = true
            setFilters({ [type]: value });
          } else {
            notEmpty && setSearchItem('')
            setFilters({ [type]: '' });
          }
        } else {
          notEmpty = true
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
      notEmpty && setSearchItem('')
      setFilters({ [type]: '' });
    }
  }

  const searchOnChange = (option) => {
    if (!option) return
    if (option.username && !option.username.includes("-")) {
      onSearch(option.username)
    } else {
      onSearch(option.address)
    }
  }

  const onSearch = async (si) => {
    setErrorMessage("")
    let searchFor = null

    if (typeof searchItem === 'string') {
      searchFor = searchItem.trim()
    }

    if (typeof si === 'string') {
      searchFor = si
    }

    if (!searchFor) return

    if (searchFor.includes("/") || searchFor.includes("\\")) {
      setErrorMessage(t("explorer.no-slashes"))
      return
    }

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
            onInputChange={searchOnInputChange}
            components={{ DropdownIndicator:() => null, IndicatorSeparator:() => null }}
            classNamePrefix="react-select"
            instanceId="search-select"
            noOptionsMessage={() =>  null}
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