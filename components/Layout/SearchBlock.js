import { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import axios from 'axios';
import { useSearchParams } from 'next/navigation'

import { isAddressOrUsername, isIdValid, useWidth } from '../../utils'
import { userOrServiceName } from '../../utils/format'

//import { ReactComponent as Qr } from "../../public/images/qr.svg";

const searchItemRe = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i
let typingTimer

export default function SearchBlock({ searchPlaceholderText, tab = null, userData = {} }) {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const searchInput = useRef(null)
  const windowWidth = useWidth()

  const { id } = router.query
  const [searchItem, setSearchItem] = useState(id || userData?.address || "")
  const [searching, setSearching] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchingSuggestions, setSearchingSuggestions] = useState(false)

  useEffect(() => {
    if (!id && searchInput.current) {
      searchInput.current.focus()
    }
  }, [id, searchInput])

  useEffect(() => {
    if (userData?.address) {
      setSearchItem(userData.address);
    }
  }, [userData]);

  const searchKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSearch()
      return
    }

    //if printable character entered
    if ([...e.key].length === 1 && !e.ctrlKey && !e.metaKey) {

      // We should allow spaces here... or even non-latin characters, so that validation can be removed, together with searchItemRe 
      if (!searchItemRe.test(e.key)) {
        e.preventDefault()
        return
      }

      //if more than 3 characters - search for suggestions
      if (e?.target?.value && e.target.value.length > 1) {
        clearTimeout(typingTimer)
        setSearchSuggestions([])
        typingTimer = setTimeout(async () => {
          if (e?.target?.value && e.target.value.length > 2) {
            setSearchingSuggestions(true)
            const suggestionsResponse = await axios('v2/address/search/' + e.target.value)
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
  }

  const searchOnChange = (option) => {
    if (!option) return
    if (option.username && !option.username.includes("-")) {
      onSearch(option.username)
    } else {
      onSearch(option.address)
    }
  }

  // a stupid hack to remove id param
  let addParams = ''
  if (searchParams) {
    let searchPart = searchParams.toString()
    let searchId = searchParams.get("id")
    if (searchId) {
      if (searchPart.indexOf("id=" + searchId + "&") !== -1) {
        searchPart = searchPart.replace("id=" + searchId + "&", "")
      } else if (searchPart.indexOf("&id=" + searchId) !== -1) {
        searchPart = searchPart.replace("&id=" + searchId, "")
      } else {
        searchPart = searchPart.replace("id=" + searchId, "")
      }
    }
    if (searchPart) {
      addParams = '?' + searchPart;
    }
  }

  const onSearch = async (si) => {
    let searchFor = searchItem.trim()
    if (typeof si === 'string') {
      searchFor = si
    }

    if (!searchFor) return

    if (tab === "nfts" && isAddressOrUsername(searchFor)) {
      window.location = "../nfts/" + encodeURI(searchFor) + addParams
      return
    }

    if (tab === "nft-offers" && isAddressOrUsername(searchFor)) {
      window.location = "../nft-offers/" + encodeURI(searchFor) + addParams
      return
    }

    if (tab === "nft-volumes" && isAddressOrUsername(searchFor)) {
      window.location = "../nft-volumes/" + encodeURI(searchFor) + addParams
      return
    }

    if (tab === "nft" && isIdValid(searchFor)) {
      window.location = "../nft/" + encodeURI(searchFor)
      return
    }

    if (tab === "nft-offer" && isIdValid(searchFor)) {
      window.location = "../nft-offer/" + encodeURI(searchFor)
      return
    }

    //nft nftOffer
    if (isIdValid(searchFor)) {
      setSearching(true)
      const response = await axios('v2/search/' + searchFor)
      setSearching(false)
      const data = response.data
      if (data.type === 'nftoken') {
        router.push('/nft/' + encodeURI(searchFor))
        return
      }
      if (data.type === 'nftokenOffer') {
        router.push('/nft-offer/' + encodeURI(searchFor))
        return
      }
    }

    //tx, address etc
    window.location = '/explorer/' + encodeURI(searchFor)
    return
  }

  /*
  PayID
  searchItem.indexOf("$") > -1

  username
  <18 

  CurrencyCode, XLS14
  searchItem.length == 40

  TX, NFT, NFT Offer
  searchItem.length == 64

  X-address
  searchItem.length > 36
  searchItem.charAt(0) == "T"
  searchItem.charAt(0) == "X"
  */

  const showTabs = tab && ['nfts', 'nft-offers', 'nft-volumes'].includes(tab)

  const searchOnInputChange = (inputValue, action) => {
    if (action.action !== "input-blur" && action.action !== "menu-close") {
      setSearchItem(inputValue)
    }
  }

  return (
    <>
      <div className="search-block">
        <div className="search-box">
          <div className='above-search-box'>
            {searching ?
              <span className='contrast'>
                {t("explorer.searching-tx-nft-nftoffer")}
                <span className="waiting inline"></span>
              </span>
              :
              <>
                {userOrServiceName(userData)}
                {tab === "nft" && <h1 className='contrast'>NFT</h1>}
                {tab === "nft-offer" && <h1 className='contrast'>{t("nft-offer.header")}</h1>}
                {tab === "explorer" && <h1 className='contrast'>{t("explorer.header")}</h1>}
              </>
            }
          </div>
          <Select
            ref={searchInput}
            className="issuer-select search-input search-input-select"
            placeholder={searchPlaceholderText}
            onKeyDown={searchKeyDown}
            onChange={searchOnChange}
            spellCheck="false"
            isClearable={true}
            options={searchSuggestions}
            getOptionLabel={
              (option) => <>
                <span style={windowWidth < 400 ? { fontSize: "14px" } : {}}>{option.address}</span>
                {(option.username || option.service) ? (windowWidth > 400 ? " - " : " ") : ""}
                <b className='blue'>{option.username}</b>
                {option.service ? <>
                  {option.username ? " (" : ""}
                  <b className='green'>{option.service}</b>
                  {option.username ? ")" : ""}
                </> : ""}
              </>
            }
            getOptionValue={(option) => (option.address + option.username + option.service)}
            inputValue={searchItem}
            onInputChange={searchOnInputChange}
            isSearchable={true}
            classNamePrefix="react-select"
            instanceId="issuer-select"
            noOptionsMessage={
              () => searchingSuggestions ? t("explorer.searching-for-addresses") : null
              //({ inputValue }) => inputValue.length > 3
            }
          />

          <div className="search-button" onClick={onSearch}>
            <img src="/images/search.svg" className="search-icon" alt="search" />
          </div>
          {/*
          <a className="search-scan-qr" href="/explorer/?scanqr">
            <Qr className="search-scan-qr-icon" />
            <span className="search-scan-qr-text">{t("home.scan-qr")}</span>
          </a>
        */}
        </div>
      </div>
      {showTabs &&
        <div className='explorer-tabs-block'>
          <div className='explorer-tabs'>
            {tab === "nfts" ? <b>NFTs</b> : <a href={"/nfts/" + searchItem + addParams}>NFTs</a>}
            {tab === "nft-offers" ? <b>{t("nft-offers.header")}</b> : <a href={"/nft-offers/" + searchItem}>{t("nft-offers.header")}</a>}
            {tab === "nft-volumes" && <b>{t("menu.nft.volumes")}</b>}
            <a href={"/explorer/" + searchItem}>{t("explorer.menu.account")}</a>
            {tab !== "nft-volumes" && <a href={"/explorer/" + searchItem} className='hide-on-mobile'>{t("explorer.menu.transactions")}</a>}
            {tab !== "nft-volumes" && <a href={"/explorer/" + searchItem} className='hide-on-mobile'>{t("explorer.menu.tokens")}</a>}
          </div>
          <div className='explorer-tabs-shadow'></div>
        </div>
      }
    </>
  );
};
