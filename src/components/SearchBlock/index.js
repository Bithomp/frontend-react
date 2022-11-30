//import { useTranslation } from 'react-i18next';

import './styles.scss';
import search from '../../assets/images/search.svg'
//import { ReactComponent as Qr } from "../../assets/images/qr.svg";

const searchItemRe = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i;

export default function SearchBlock({searchPlaceholderText, searchClick, searchItem, setSearchItem}) {
  //const { t } = useTranslation();

  const searchItemType = e => {
    if (e.key === 'Enter') {
      searchClick(searchItem.trim());
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

  return (
    <div className="search-block">
      <div className="search-box">
        <input
          className="search-input"
          placeholder={searchPlaceholderText}
          value={searchItem}
          onKeyPress={searchItemType}
          onChange={validateSearchItem}
          spellCheck="false"
        />
        <div className="search-button" onClick={() => searchClick(searchItem.trim())}>
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
  );
};
