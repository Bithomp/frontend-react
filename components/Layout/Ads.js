import { xahauNetwork } from '../../utils'
//import { useTheme } from '../Layout/ThemeContext'
import { useEffect, useState } from 'react'

export default function Ads({ showAds, heightNoAds }) {
  //const { theme } = useTheme()
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!rendered) {
    //keep it here to avoid hydaration error when ads are not rendered for subsribers
    return <div className="brands-block"></div>
  }

  if (!showAds) {
    return <div style={{ height: heightNoAds }} />
  }

  if (!xahauNetwork) {
    return (
      <div className="brands-block">
        {/*
      <a href="/go/play-xrp" target="_blank" rel="noreferrer">
        <div className="brand-item">
          <img src="/images/sponsored/xbit.png" className="brand-item-icon" alt="play xrp" />
          <div className="brand-item-title">Play XRP</div>
          <div className="brand-item-text">Register with <i>BITHOMP</i> and boost up your bonus.</div>
        </div>
      </a>
      */}
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
            <img src="/images/sponsored/btcbit.svg" className="brand-item-icon" alt="Logo for Buy xrp" />
            <div className="brand-item-title">Buy XRP</div>
            <div className="brand-item-text">Instantly buy and sell cryptocurrency with low commission.</div>
          </div>
        </a>
        <a href="/go/earn-xrp" target="_blank" rel="noreferrer">
          <div className="brand-item">
            <img src="/images/sponsored/nexo.svg" className="brand-item-icon" alt="Logo for Earn on xrp" />
            <div className="brand-item-title">Earn on XRP</div>
            <div className="brand-item-text">Earn up to 12% per year on XRP.</div>
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
              <img src="/images/sponsored/xbit.png" className="brand-item-icon" alt="Play Now" />
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
