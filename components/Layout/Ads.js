import { xahauNetwork } from '../../utils'
import { useTheme } from '../Layout/ThemeContext'
import { useEffect, useState } from 'react'
import { brandsBlock } from '../../styles/components/ads.module.scss'

import BtcBit from '../../public/images/sponsored/btcbit.svg'
import Nexo from '../../public/images/sponsored/nexo.svg'

export default function Ads({ showAds, heightNoAds }) {
  const { theme } = useTheme()
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!rendered) {
    //keep it here to avoid hydaration error when ads are not rendered for subsribers
    return <div className={brandsBlock}></div>
  }

  if (!showAds) {
    return <div style={{ height: heightNoAds }} />
  }

  if (!xahauNetwork) {
    return (
      <div className={brandsBlock}>
        <a href="/go/play-xrp" target="_blank" rel="noreferrer">
          <div className="brand-item">
            <img src="/images/sponsored/xbit.png" className="brand-item-icon" alt="play xrp" />
            <div className="brand-item-title">Play Crypto</div>
            <div className="brand-item-text">Welcome bonus up to 7 BTC + 250 free spins.</div>
          </div>
        </a>
        {/*
        <a href="/go/main-exchange" target="_blank" rel="noreferrer">
          <div className="brand-item easybit">
            <img src="/images/sponsored/easybit.svg" className="brand-item-icon" alt="exchange crypto" />
            <div className="brand-item-title">Exchange crypto</div>
            <div className="brand-item-text">The simplest method to exchange crypto at the best rates.</div>
          </div>
        </a>
      */}
        <a href="/go/buy-xrp" target="_blank" rel="noreferrer">
          <div className="brand-item btcbit">
            <BtcBit className="brand-item-icon" />
            <div className="brand-item-title">Buy XRP</div>
            <div className="brand-item-text">Instantly buy and sell cryptocurrency with low commission.</div>
          </div>
        </a>
        <a href="/go/earn-xrp" target="_blank" rel="noreferrer">
          <div className="brand-item nexo">
            <Nexo className="brand-item-icon" fill={theme === 'dark' ? 'white' : '#1C1F21'} />
            <div className="brand-item-title">Earn up to 14%</div>
            <div className="brand-item-text">Build your long-term wealth with leading rates on XRP, BTC, and more.</div>
          </div>
        </a>
        {/*
        <a href="/go/main-play" target="_blank" rel="noreferrer">
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

  {
    /*
      if (network === 'xahau') {
        return <>
          <a href="/go/play-xrp" target="_blank" rel="noreferrer">
            <div className="brand-item">
              <Image src="/images/sponsored/xbit.png" className="brand-item-icon" alt="Play Now" />
              <div className="brand-item-title">Play Now</div>
              <div className="brand-item-text">
                Register with a code <i>XAHAU</i> and get 125% 1st dep welcome bonus!
              </div>
            </div>
          </a>
        </>
      }
  */
  }
}
