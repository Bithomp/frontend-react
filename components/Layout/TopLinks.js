import { useTranslation } from 'next-i18next'
//import { network, useWidth } from '../../utils'
//import { useIsMobile } from '../../utils/mobile'
//import Image from 'next/image'

export default function TopLinks(
  {
    //countryCode
  }
) {
  const { t } = useTranslation()
  //const isMobile = useIsMobile()
  //const width = useWidth()

  /* it is important to have "tooltiptext right" on the first ad, otherwise brakes UI on mobiles, too wide to the left */
  /* it is important to have "tooltiptext left" on the last ad, otherwise brakes UI on mobiles, too wide to the right */

  {
    /*
  let stakeAd = (
    <span className="tooltip">
      <a href="https://bithomp.com/go/stake-world" target="_blank" rel="noreferrer" className="top-link orange">
        Join Stake! 200% Bonus 🔥
      </a>
      <span className="tooltiptext right small">{t('sponsored.sponsored')}</span>
    </span>
  )

  //country specific ads
  let stakeCountries = ['US']
  if (stakeCountries.includes(countryCode)) {
    stakeAd = (
      <span className="tooltip">
        <a href="https://bithomp.com/go/stake-usa" target="_blank" rel="noreferrer" className="top-link orange">
          Join Drake on Stake! 🔥
        </a>
        <span className="tooltiptext right small">{t('sponsored.sponsored')}</span>
      </span>
    )
  }
    */
  }

  return (
    <div className="top-links">
      <span className="tooltip">
        <a href="https://bithomp.com/go/earn-on-xrp" target="_blank" rel="noreferrer" className="top-link orange">
          Earn 12% on XRP
        </a>
        <span className="tooltiptext right small">{t('sponsored.sponsored')}</span>
      </span>{' '}
      💰 |{' '}
      {/*
        <a href="https://bithomp.com/en/learn/xrp-xah-taxes" className="top-link orange">
          Tax reports
        </a>{' '}
        🧾
        {isMobile ? <br /> : ' | '}
        */}
      {/*
      {stakeAd}
      {isMobile ? <br /> : ' | '}
      */}
      <span className="tooltip">
        <a href="https://bithomp.com/go/play-slots" target="_blank" rel="noreferrer" className="top-link orange">
          Play Slots and win 70,000 XRP
        </a>
        <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
      </span>{' '}
      ❤️
      {/* 
        {isMobile ? <br /> : ' | '}
        <span className="tooltip">
          <a href="https://bithomp.com/go/yield-xrp" target="_blank" rel="noreferrer" className="top-link orange">
            Earn XRP Yields
          </a>
          <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
        </span>{' '}
        💵
        */}
      {/*
        {isMobile ? <br /> : ' | '}
        <span className="tooltip">
          <a href="https://bithomp.com/go/playxrp" target="_blank" rel="noreferrer" className="top-link orange">
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
          unoptimized
        />*/}
    </div>
  )
}
