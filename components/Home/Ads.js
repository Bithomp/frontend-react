import { nativeCurrency } from '../../utils'
//import { useTheme } from '../Layout/ThemeContext'
//import { useEffect, useState } from 'react'

export default function Ads() {
  //const { theme } = useTheme()
  //const [rendered, setRendered] = useState(false)

  /*
  useEffect(() => {
    setRendered(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  */

  if (nativeCurrency === 'XRP') {
    return (
      <>
        {/*
      <a href="/go/play-xrp" target="_blank" rel="noreferrer">
        <div className="sponsored-brand">
          <img src="/images/xbit.png" className="sponsored-brand-icon" alt="play xrp" />
          <div className="sponsored-brand-title">Play XRP</div>
          <div className="sponsored-brand-text">Register with <i>BITHOMP</i> and boost up your bonus.</div>
        </div>
      </a>
      */}
        {/*
        <a href="/go/main-exchange" target="_blank" rel="noreferrer">
          <div className="sponsored-brand easybit">
            <img src="/images/easybit.svg" className="sponsored-brand-icon" alt="exchange crypto" />
            <div className="sponsored-brand-title">Exchange crypto</div>
            <div className="sponsored-brand-text">The simplest method to exchange crypto at the best rates.</div>
          </div>
        </a>
      */}
        <a href="/go/buy-xrp" target="_blank" rel="noreferrer">
          <div className="sponsored-brand btcbit">
            <img src="/images/btcbit.svg" className="sponsored-brand-icon" alt="buy xrp" />
            <div className="sponsored-brand-title">Buy XRP</div>
            <div className="sponsored-brand-text">Instantly buy and sell cryptocurrency with low commission.</div>
          </div>
        </a>
        <a href="/go/earn-xrp" target="_blank" rel="noreferrer">
          <div className="sponsored-brand">
            <img src="/images/nexo.svg" className="sponsored-brand-icon" alt="earn on xrp" />
            <div className="sponsored-brand-title">Earn on XRP</div>
            <div className="sponsored-brand-text">Earn up to 12% per year on XRP.</div>
          </div>
        </a>
        {/*
        <a href="/go/main-play" target="_blank" rel="noreferrer">
          <div className="sponsored-brand easybit">
            {rendered && (
              <img
                src={theme === 'dark' ? '/images/betplay_dark.png' : '/images/betplay.png'}
                className="sponsored-brand-icon"
                alt="play crypto"
              />
            )}
            <div className="sponsored-brand-title">Crypto Casino</div>
            <div className="sponsored-brand-text">
              100% Welcome Bonus on your first deposit! 10% cashback every week!
            </div>
          </div>
        </a>
        */}
      </>
    )
  }

  {
    /*
      if (network === 'xahau') {
        return <>
          <a href="/go/play-xrp" target="_blank" rel="noreferrer">
            <div className="sponsored-brand">
              <img src="/images/xbit.png" className="sponsored-brand-icon" alt="Play Now" />
              <div className="sponsored-brand-title">Play Now</div>
              <div className="sponsored-brand-text">
                Register with a code <i>XAHAU</i> and get 125% 1st dep welcome bonus!
              </div>
            </div>
          </a>
        </>
      }
  */
  }
}
