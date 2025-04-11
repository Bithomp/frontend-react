//import { useTranslation } from 'next-i18next'
//import { useState, useEffect } from 'react'
//import { network } from '../../utils'
import { useIsMobile } from '../../utils/mobile'
//import axios from 'axios'

export default function TopLinks() {
  //const { t } = useTranslation()
  const isMobile = useIsMobile()
  //const [countryCode, setCountryCode] = useState('')

  //check country
  {
    /*
  useEffect(() => {
    async function fetchData() {
      // {"ip":"176.28.256.49","country":"SE"}
      const clientInfo = await axios('client/info')
      setCountryCode(clientInfo?.data?.country)
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  */
  }

  {
    /* it is important to have "tooltiptext right" on the first ad, otherwise brakes UI on mobiles, too wide to the left */
  }
  {
    /* it is important to have "tooltiptext left" on the last ad, otherwise brakes UI on mobiles, too wide to the right */
  }

  //country specific ads
  {
    /*}
  let moonpayCountries = ['US', 'BR', 'NG']
  if (moonpayCountries.includes(countryCode)) {
    return <div className="top-links">
      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/exchange-m"
          target="_blank"
          rel="noreferrer"
          className='top-link orange'
        >
          Fast and simple way to Buy and Sell crypto.
        </a>
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>
    </div>
  }

  return ""
  */
  }

  //tree ads
  {
    /*
  return (
    <div className="top-links">
      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/top-buy"
          target="_blank"
          rel="noreferrer"
          className='top-link'
        >
          Buy XRP
        </a>
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>

      <span style={{ padding: "0 10px" }}>|</span>

      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/top-exchange"
          target="_blank"
          rel="noreferrer"
          className='top-link'
        >
          Exchange crypto
        </a>
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>

      <span style={{ padding: "0 10px" }}>|</span>
      
      <span className='tooltip'>
        <a
          href="https://bithomp.com/go/top-play"
          target="_blank"
          rel="noreferrer"
          className='top-link'
        >
          XRP Play
        </a>
        <span className='tooltiptext left small'>
          {t("sponsored.sponsored")}
        </span>
      </span>
    </div>
  )
  */
  }

  {
    /*

  if (network === "mainnet") {
    return <div className="top-links">
      <span className='tooltip'>
        <a
          href="/go/top-play"
          target="_blank"
          rel="noreferrer"
          className='top-link orange'
        >
          {!isMobile ? "Play XRP - register with the promo code BITHOMP to boost up your bonus." : "Play XRP"}
        </a>
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>
    </div>
  }

  if (network === "xahau") {
    return <div className="top-links">
      <span className='tooltip'>
        <a
          href="/go/top-play"
          target="_blank"
          rel="noreferrer"
          className='top-link orange'
        >
          {!isMobile ? "Play Now - Register with a promo code XAHAU and get 125% 1st dep welcome bonus!" : "Play Now"}
        </a>
        <span className='tooltiptext right small'>
          {t("sponsored.sponsored")}
        </span>
      </span>
    </div>
  }

  */
  }

  return (
    <div className="top-links">
      <span className="tooltip">
        💰
        <a href="/go/top-earn" target="_blank" rel="noreferrer" className="top-link orange">
          {!isMobile
            ? 'Build your long-term wealth with industry-leading rates on XRP, BTC, and more.'
            : 'Earn up to 14%'}
        </a>
      </span>
    </div>
  )
}
