import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { isUsernameValid, isAddressValid } from '../../utils';
import { userOrServiceName } from '../../utils/format';

import './styles.scss';
import search from '../../assets/images/search.svg'
//import { ReactComponent as Qr } from "../../assets/images/qr.svg";

const searchItemRe = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i;

export default function SearchBlock({ searchPlaceholderText, tab = null, userData = {} }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [searchItem, setSearchItem] = useState(userData?.address || "");
  const [addParams, setAddParams] = useState("");

  useEffect(() => {
    if (userData?.address) {
      setSearchItem(userData.address);
    }
  }, [userData]);

  useEffect(() => {
    let view = searchParams.get('view');
    if (view) {
      setAddParams("?view=" + view);
    }
  }, [searchParams]);

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

  const onSearch = () => {
    let searchFor = searchItem.trim();
    if (tab === "nfts") {
      if (isAddressValid(searchFor) || isUsernameValid(searchFor)) {
        window.location.replace('/nfts/' + encodeURI(searchFor) + addParams);
        return;
      }
    }
    window.location.replace('/explorer/' + encodeURI(searchFor));
  }

  /*
  PayID
  searchItem.indexOf("$") > -1

  username
  <18 

  CurrencyCode, XLS14
  searchItem.length == 40

  TX, NFT
  searchItem.length == 64

  X-address
  searchItem.length > 36
  searchItem.charAt(0) == "T"
  searchItem.charAt(0) == "X"
  */

  return (
    <>
      <div className="search-block">
        <div className="search-box">
          <div className='above-search-box'>
            {userOrServiceName(userData)}
          </div>
          <input
            className="search-input"
            placeholder={searchPlaceholderText}
            value={searchItem}
            onKeyPress={searchItemType}
            onChange={validateSearchItem}
            spellCheck="false"
          />
          <div className="search-button" onClick={onSearch}>
            <img src={search} className="search-icon" alt="search" />
          </div>
          {/*
          <a className="search-scan-qr" href="/explorer/?scanqr">
            <Qr className="search-scan-qr-icon" />
            <span className="search-scan-qr-text">{t("home.scan-qr")}</span>
          </a>
        */}
        </div>
      </div>
      {tab &&
        <div className='explorer-tabs-block'>
          <div className='explorer-tabs'>
            {tab === "nfts" ? <b>NFT</b> : <a href={"/nfts/" + searchItem + addParams}>NFT</a>}
            <a href={"/explorer/" + searchItem}>{t("explorer.menu.account")}</a>
            <a href={"/explorer/" + searchItem} className='hide-on-mobile'>{t("explorer.menu.transactions")}</a>
            <a href={"/explorer/" + searchItem} className='hide-on-mobile'>{t("explorer.menu.tokens")}</a>
          </div>
          <div className='explorer-tabs-shadow'></div>
        </div>
      }
    </>
  );
};
