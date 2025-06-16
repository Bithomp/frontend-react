import { useTranslation } from 'next-i18next'
//import { useState, useEffect } from 'react'
//import { network } from '../../utils'
import { useIsMobile } from '../../utils/mobile'
//import axios from 'axios'
import { useRouter } from 'next/router'
import { useWidth } from '../../utils'
import Image from 'next/image'

export default function TopLinks() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const router = useRouter()
  const width = useWidth()

  //const [countryCode, setCountryCode] = useState('')

  const pathname = router.pathname

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

  //explorer links
  //includes /address and /tx
  if (pathname.includes('transaction') || pathname.includes('/account')) {
    return (
      <div className="top-links">
        <span className="tooltip">
          <a href="/go/earn-on-xrp" target="_blank" rel="noreferrer" className="top-link orange">
            Earn on XRP
          </a>
          <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
        </span>{' '}
        💰 |{' '}
        <span className="tooltip">
          <a href="/go/play-slots" target="_blank" rel="noreferrer" className="top-link orange">
            Play Slots and win 70,000 XRP
          </a>
          <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
        </span>{' '}
        ❤️
        {isMobile ? <br /> : ' | '}
        <span className="tooltip">
          <a href="/go/yield-xrp" target="_blank" rel="noreferrer" className="top-link orange">
            Earn XRP Yields
          </a>
          <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
        </span>{' '}
        💵
        {isMobile ? <br /> : ' | '}
        <span className="tooltip">
          <a href="/go/playxrp" target="_blank" rel="noreferrer" className="top-link orange">
            Bet in crypto and win with 1xbit! No KYC
          </a>
          <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
        </span>{' '}
        <Image
          src="/images/sponsored/emoji/money.gif"
          alt="1xbit"
          className="emoji-money"
          width="16"
          height="16"
          style={{ marginBottom: -3 }}
        />
      </div>
    )
  }

  return (
    <div className="top-links">
      💰{' '}
      <span className="tooltip">
        <a href="/go/top-earn" target="_blank" rel="noreferrer" className="top-link orange">
          {!isMobile
            ? 'Build your long-term wealth with industry-leading rates on XRP, BTC, and more.'
            : 'Earn up to 14%'}
        </a>
      </span>
      {width > 1200 || isMobile ? <span style={{ padding: '0 10px' }}>|</span> : ''}
      <span className="tooltip">
        <a href="/go/top-play" target="_blank" rel="noreferrer" className="top-link orange">
          {!isMobile ? 'Bet in crypto. Get cashback on every bet, WB up to 7BTC+250FS with no KYC.' : 'Bet in crypto'}
        </a>
      </span>{' '}
      <Image
        src="/images/sponsored/emoji/money.gif"
        alt="1xbit"
        className="emoji-money"
        width="16"
        height="16"
        style={{ marginBottom: -3 }}
      />
    </div>
  )
}
