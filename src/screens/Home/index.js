import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useLocalStorage from 'use-local-storage';

import Converter from "./Converter";
import PriceChart from "./PriceChart";
import Statistics from "./Statistics";
import Whales from './Whales';

import './styles.scss';
import search from "../../assets/images/search.svg";
import { ReactComponent as Qr } from "../../assets/images/qr.svg";
import nexo from "../../assets/images/nexo.svg";
import btcbit from "../../assets/images/btcbit.svg";

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

export default function Home({ theme, devNet }) {
  const [searchItem, setSearchItem] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useLocalStorage('currency', 'usd');
  const [chartPeriod, setChartPeriod] = useState('one_day');

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
          <a className="search-scan-qr" href="/explorer/?scanqr">
            <Qr className="search-scan-qr-icon" />
            <span className="search-scan-qr-text">{t("home.scan-qr")}</span>
          </a>
        </div>
      </div>
      {!devNet &&
        <div className="home-sponsored">
          <a href="https://bithomp.com/go/earn-on-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src={nexo} className="sponsored-brand-icon" alt="earn on xrp" />
              <div className="sponsored-brand-title">Earn on XRP</div>
              <div className="sponsored-brand-text">Get a maximum rate of up to 12% APR.</div>
            </div>
          </a>
          <a href="https://bithomp.com/go/buy-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src={btcbit} className="sponsored-brand-icon" alt="buy xrp" />
              <div className="sponsored-brand-title">Buy XRP</div>
              <div className="sponsored-brand-text">Instantly buy and sell cryptocurrency with low commission.</div>
            </div>
          </a>
        </div>
      }
      {!devNet &&
        <>
          <div className="home-converter">
            <Converter selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} chartPeriod={chartPeriod} />
          </div>
          <div className="home-price-chart">
            <PriceChart currency={selectedCurrency} theme={theme} chartPeriod={chartPeriod} setChartPeriod={setChartPeriod} />
          </div>
        </>
      }

      <div className="home-whale-transactions">
        <Whales currency={selectedCurrency} />
      </div>

      <div className="home-statistics">
        <Statistics />
      </div>
    </>
  );
};
