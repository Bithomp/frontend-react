import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import '../assets/styles/screens/home.css';
import search from "../assets/images/search.svg";

const searchClick = item => {
  const searchItem = item.trim();
  if (searchItem) {
    window.location.replace('/explorer/' + encodeURI(searchItem));
  } else {
    window.location.replace('/explorer/');
  }
  return null;
};

const searchItemRe = /^[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i;

function Home() {
  const [searchItem, setSearchItem] = useState("");

  const { t } = useTranslation();

  const searchPlaceholderText = window.innerWidth > 500 ? t("home.search-placeholder") : t("home.search-placeholder-short");

  const searchItemType = e => {
    if (e.key === 'Enter') {
      searchClick(searchItem);
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
    <>
      <div className="home-search-block">
        <div className="home-search">
          <input
            className="search-input"
            placeholder={searchPlaceholderText}
            value={searchItem}
            onKeyPress={searchItemType}
            onChange={validateSearchItem}
          />
          <div className="search-button" onClick={() => searchClick(searchItem)}>
            <img src={search} className="search-icon" alt="search" />
          </div>
        </div>
      </div>
      <div className="home-sponsored">
      </div>
      <div className="home-converter">
      </div>
    </>
  );
}

export default Home;
