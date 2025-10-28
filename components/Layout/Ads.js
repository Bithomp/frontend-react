import { useTheme } from '../Layout/ThemeContext'
import { brandsBlock } from '../../styles/components/ads.module.scss'

import BtcBit from '../../public/images/sponsored/btcbit.svg'
import Nexo from '../../public/images/sponsored/nexo.svg'
import Stake from '../../public/images/sponsored/stake.svg'
//import Doppler from '../../public/images/sponsored/doppler.svg'
import { useState, useEffect } from 'react'
import { useWidth } from '../../utils'

export default function Ads() {
  const { theme } = useTheme()
  const width = useWidth()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  const color = rendered ? (theme === 'dark' ? 'white' : '#1C1F21') : '#1C1F21'

  return (
    <div className={brandsBlock}>
      <a href="https://bithomp.com/go/play-xrp" target="_blank" rel="noreferrer">
        <div className="brand-item stake">
          <Stake className="brand-item-icon" fill={rendered ? (theme === 'dark' ? 'white' : '#001d2b') : '#001d2b'} />
          <div className="brand-item-title">Join Stake!{width > 1280 && ' 200% Bonus'}</div>
          <div className="brand-item-text">World’s largest Crypto Casino — instant payouts, $100K daily prizes.</div>
        </div>
      </a>

      <a href="https://bithomp.com/go/main-buy-swap" target="_blank" rel="noreferrer">
        <div className="brand-item nexo">
          <Nexo className="brand-item-icon" fill={color} />
          <div className="brand-item-title">Аdd XRP now</div>
          <div className="brand-item-text">Buy or transfer XRP and earn up to 12% annual interest.</div>
        </div>
      </a>

      {/* <a href="https://bithomp.com/go/xrp-yield" target="_blank" rel="noreferrer">
          <div className="brand-item doppler">
            <Doppler className="brand-item-icon" fill={color} />
            <div className="brand-item-title">
              <span className="hideOnsmall">Earn </span>XRP Yields
            </div>
            <div className="brand-item-text">Deposit XRP and earn XRP native yields.</div>
          </div>
        </a>
        <a href="https://bithomp.com/go/play-xrp" target="_blank" rel="noreferrer">
          <div className="brand-item xbit">
            <img
              src={theme === 'dark' ? '/images/sponsored/xbit-white.png' : '/images/sponsored/xbit.png'}
              className="brand-item-icon"
              alt="play xrp"
            />
            <div className="brand-item-title">Bet in crypto</div>
            <div className="brand-item-text">Get bonus up to 7BTC+250FS with no KYC.</div>
          </div>
        </a>
        <a href="https://bithomp.com/go/main-exchange" target="_blank" rel="noreferrer">
          <div className="brand-item easybit">
            <img src="/images/sponsored/easybit.svg" className="brand-item-icon" alt="exchange crypto" />
            <div className="brand-item-title">Exchange crypto</div>
            <div className="brand-item-text">The simplest method to exchange crypto at the best rates.</div>
          </div>
        </a>
      */}
      <a href="https://bithomp.com/go/buy-xrp" target="_blank" rel="noreferrer">
        <div className="brand-item btcbit">
          <BtcBit className="brand-item-icon" />
          <div className="brand-item-title">Buy XRP</div>
          <div className="brand-item-text">Instantly buy and sell cryptocurrency with low commission.</div>
        </div>
      </a>
      <a href="https://bithomp.com/go/earn-xrp" target="_blank" rel="noreferrer">
        <div className="brand-item nexo">
          <Nexo className="brand-item-icon" fill={color} />
          <div className="brand-item-title">Earn up to 14%</div>
          <div className="brand-item-text">Build your long-term wealth with leading rates on XRP, BTC, and more.</div>
        </div>
      </a>
      {/*
        <a href="https://bithomp.com/go/main-play" target="_blank" rel="noreferrer">
          <div className="brand-item easybit">
            {rendered && (
              <img
                src={theme === 'dark' ? '/images/betplay_dark.png' : '/images/betplay.png'}
                className="brand-item-icon"
                alt="play crypto"
              />
            )}
            <div className="brand-item-title">Crypto Casino</div>
            <div className="brand-item-text">
              100% Welcome Bonus on your first deposit! 10% cashback every week!
            </div>
          </div>
        </a>
        */}
    </div>
  )
}
