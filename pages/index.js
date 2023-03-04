import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'

import { useLocalStorage } from '../utils'

import SEO from '../components/SEO'
import SearchBlock from '../components/SearchBlock';
import Whales from '../components/Home/Whales';
import Converter from "../components/Home/Converter";
import PriceChart from "../components/Home/PriceChart";
import Statistics from "../components/Home/Statistics";

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Home({ devNet }) {
  const { t } = useTranslation()

  const [selectedCurrency, setSelectedCurrency] = useLocalStorage('currency', 'usd')
  const [chartPeriod, setChartPeriod] = useState('one_day')

  let searchPlaceholderText = t("home.search-placeholder")
  if (typeof window !== 'undefined' && window.innerWidth < 500) {
    searchPlaceholderText = t("home.search-placeholder")
  }

  return (
    <>
      <SEO
        title="XRP Explorer | Scan the XRPL network."
        description="Explore XRP Ledger, check transactions for statuses, addresses for balances, NFTs, offers, tokens, escrows and checks."
      />
      <SearchBlock searchPlaceholderText={searchPlaceholderText} tab="explorer" />
      {!devNet &&
        <div className="home-sponsored">
          <a href="https://bithomp.com/go/buy-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src="/images/btcbit.svg" className="sponsored-brand-icon" alt="buy xrp" />
              <div className="sponsored-brand-title">Buy XRP</div>
              <div className="sponsored-brand-text">Instantly buy and sell cryptocurrency with low commission.</div>
            </div>
          </a>
          <a href="https://bithomp.com/go/play-crypto" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <svg className='sponsored-brand-icon' height="40px" width="36px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24.24 26.84" fill="#111a29"><defs></defs><title>Icon</title><g id="Layer_2" data-name="Layer 2"><g id="content"><path d="M20.51,6.39c.12.68.21,1.36.34,2a2.9,2.9,0,0,0,.29.68c.3.63.62,1.24.93,1.87l.84,1.67.93,1.88c.12.25.24.5.37.73a.17.17,0,0,1,0,.22c-.42.48-9,11-9.23,11.27a.35.35,0,0,1-.21.1H9.51a.29.29,0,0,1-.2-.09C6.66,23,.39,15.84.05,15.45a.14.14,0,0,1,0-.19c.46-.91.91-1.83,1.37-2.75l1-2c.31-.61.63-1.22.92-1.84A3,3,0,0,0,3.47,8l.39-2.36c.12-.79.24-1.57.37-2.36s.22-1.33.33-2c.07-.41.13-.83.2-1.28l.58.4L8.05,2.31l2.61,1.82c.25.17.48.36.74.52a1.67,1.67,0,0,0,.4.07c.07,0,.14,0,.22.06a.55.55,0,0,0,.18,0c.06,0,.12,0,.18,0a1.29,1.29,0,0,0,.82-.32c1.16-.83,2.33-1.64,3.49-2.46L19.48,0l.83,5.08M6.87,20.35a.58.58,0,0,0,.12.29q1.47,1.71,3,3.41a.6.6,0,0,0,.25.16l.76.25.69.22c0-.17,0-.31-.05-.45a15.35,15.35,0,0,0-1.24-2.7l.07-.06a13.68,13.68,0,0,1,3.21-.07l.25.12c-.05.05-1.24,2.6-1.24,2.65a3.9,3.9,0,0,0,0,.5l.11,0,1.07-.35a1.18,1.18,0,0,0,.48-.22c1-1.14,2.58-3.11,3.57-4.26a26.21,26.21,0,0,0,.19-3.1,2,2,0,0,1,0-.24,21,21,0,0,0,.63,2.68c.09-.11,1-1,1-1.14l2.41-2.82a.16.16,0,0,0,0-.2c-.21-.48-.4-1-.61-1.47a.44.44,0,0,0-.15-.18c-.49-.31-6.1-3.8-7.23-4.27,0,0-2.14,2.14-2.2,2.26a19.69,19.69,0,0,0-1.9-2.26,55.57,55.57,0,0,0-8,5.86.25.25,0,0,0,.06.31c.72.84,3.66,4,3.82,4.21.33-1.08.24-.73.75-2.27M18.85,6.35c-.06-.32-.11-.65-.16-1-.08-.52-.16-1-.25-1.57,0-.26-.09-.52-.14-.83-.8,1.41-3,3.41-3.76,4.79,1.09.49,5.24,3.29,6.34,3.79,0-.2-1.73-3.3-1.75-3.46M9.76,7.56C9,6.17,6.74,4.39,6,3h0c-.29,1.85-1.46,5.8-1.76,7.69C5.28,10.21,8.68,8.05,9.76,7.56Z" /><path d="M5,8.62,5.93,3H6" /><path d="M6.82,14.35h2a.36.36,0,0,1,.24.11l1.43,1.34s0,0,0,0l-.46,0-1.7.05a.27.27,0,0,1-.16-.08L7,14.57Z" /><path d="M17.47,14.45l-.65.65c-.26.25-.52.5-.77.76s-.24.07-.37.06L14,15.76l-.31,0,.54-.46,1-.83a.42.42,0,0,1,.32-.1c.41,0,.81.05,1.22.08Z" /></g></g></svg>
              <div className="sponsored-brand-title">XRP Casino</div>
              <div className="sponsored-brand-text">XRP crypto casino & sportsbook.</div>
            </div>
          </a>
          <a href="https://bithomp.com/go/earn-on-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src="/images/nexo.svg" className="sponsored-brand-icon" alt="earn on xrp" />
              <div className="sponsored-brand-title">Earn on XRP</div>
              <div className="sponsored-brand-text">Make your XRP work for you.<br />Start earning daily interest.</div>
            </div>
          </a>
        </div>
      }
      {!devNet && selectedCurrency &&
        <>
          <div className="home-converter">
            <Converter selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} chartPeriod={chartPeriod} />
          </div>
          <div className="home-price-chart">
            <PriceChart currency={selectedCurrency} chartPeriod={chartPeriod} setChartPeriod={setChartPeriod} />
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
  )
}