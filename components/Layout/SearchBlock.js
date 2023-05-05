import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import axios from 'axios';
import { useSearchParams } from 'next/navigation'

import { isAddressOrUsername, isIdValid } from '../../utils'
import { userOrServiceName } from '../../utils/format'

//import { ReactComponent as Qr } from "../../public/images/qr.svg";

const searchItemRe = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i;

export default function SearchBlock({ searchPlaceholderText, tab = null, userData = {} }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter()
  const searchInput = useRef(null)

  const { id } = router.query
  const [searchItem, setSearchItem] = useState(id || userData?.address || "");
  const [searching, setSearching] = useState(false);

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

  const searchItemType = e => {
    if (e.key === 'Enter') {
      onSearch();
    }

    if (!searchItemRe.test(e.key)) {
      e.preventDefault();
    }
  }

  const validateSearchItem = e => {
    let item = e.target.value;
    item = item.trim();
    if (searchItemRe.test(item)) {
      setSearchItem(item);
    } else {
      setSearchItem("");
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

  const onSearch = async () => {
    let searchFor = searchItem.trim();
    if (tab === "nfts" && isAddressOrUsername(searchFor)) {
      window.location = "../nfts/" + encodeURI(searchFor) + addParams
      return;
    }

    if (tab === "nft-offers" && isAddressOrUsername(searchFor)) {
      window.location = "../nft-offers/" + encodeURI(searchFor) + addParams
      return;
    }

    if (tab === "nft-volumes" && isAddressOrUsername(searchFor)) {
      window.location = "../nft-volumes/" + encodeURI(searchFor) + addParams
      return;
    }

    if (tab === "nft" && isIdValid(searchFor)) {
      window.location = "../nft/" + encodeURI(searchFor)
      return;
    }

    if (tab === "nft-offer" && isIdValid(searchFor)) {
      window.location = "../nft-offer/" + encodeURI(searchFor)
      return;
    }

    //nft nftOffer
    if (isIdValid(searchFor)) {
      setSearching(true);
      const response = await axios('v2/search/' + searchFor);
      setSearching(false);
      const data = response.data;
      if (data.type === 'nftoken') {
        router.push('/nft/' + encodeURI(searchFor))
        return;
      }
      if (data.type === 'nftokenOffer') {
        router.push('/nft-offer/' + encodeURI(searchFor))
        return;
      }
    }

    //tx, address etc
    window.location = '/explorer/' + encodeURI(searchFor)
    return;
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

  const showTabs = tab && ['nfts', 'nft-offers', 'nft-volumes'].includes(tab);

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
          <input
            ref={searchInput}
            className="search-input"
            placeholder={searchPlaceholderText}
            value={searchItem}
            onKeyPress={searchItemType}
            onChange={validateSearchItem}
            spellCheck="false"
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
            {tab === "nft-volumes" &&  <b>{t("menu.nft.volumes")}</b>}
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
