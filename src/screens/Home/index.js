import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useLocalStorage from 'use-local-storage';

import SearchBlock from '../../components/SearchBlock';
import Converter from "./Converter";
import PriceChart from "./PriceChart";
import Statistics from "./Statistics";
import Whales from './Whales';

import './styles.scss';
import nexo from "../../assets/images/nexo.svg";
import btcbit from "../../assets/images/btcbit.svg";
//import xbit from "../../assets/images/xbit.png";
import wolfbet from "../../assets/images/wolfbet.png";

export default function Home({ theme, devNet }) {
  const { t } = useTranslation();
  
  const [selectedCurrency, setSelectedCurrency] = useLocalStorage('currency', 'usd');
  const [chartPeriod, setChartPeriod] = useState('one_day');

  const searchPlaceholderText = window.innerWidth > 500 ? t("home.search-placeholder") : t("home.search-placeholder-short");

  return (
    <>
      <SearchBlock searchPlaceholderText={searchPlaceholderText} />
      {!devNet &&
        <div className="home-sponsored">
          <a href="https://bithomp.com/go/play-crypto" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src={wolfbet} className="sponsored-brand-icon" alt="play crypto" />
              <div className="sponsored-brand-title">XRP Casino</div>
              <div className="sponsored-brand-text">XRP crypto casino & sportsbook.</div>
            </div>
          </a>
          <a href="https://bithomp.com/go/buy-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src={btcbit} className="sponsored-brand-icon" alt="buy xrp" />
              <div className="sponsored-brand-title">Buy XRP</div>
              <div className="sponsored-brand-text">Instantly buy and sell cryptocurrency with low commission.</div>
            </div>
          </a>
          <a href="https://bithomp.com/go/earn-on-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src={nexo} className="sponsored-brand-icon" alt="earn on xrp" />
              <div className="sponsored-brand-title">Earn on XRP</div>
              <div className="sponsored-brand-text">Make your XRP work for you.<br/>Start earning daily interest.</div>
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
