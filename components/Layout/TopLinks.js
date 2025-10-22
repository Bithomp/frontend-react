import { useTranslation } from 'next-i18next'
//import { network } from '../../utils'
import { useIsMobile } from '../../utils/mobile'
import { useRouter } from 'next/router'
//import { useWidth } from '../../utils'
//import Image from 'next/image'

export default function TopLinks({ activatedAccount, countryCode }) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const router = useRouter()
  //const width = useWidth()

  const pathname = router.pathname

  /* it is important to have "tooltiptext right" on the first ad, otherwise brakes UI on mobiles, too wide to the left */
  /* it is important to have "tooltiptext left" on the last ad, otherwise brakes UI on mobiles, too wide to the right */

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

  //explorer links
  //includes /address and /tx
  if (pathname.includes('transaction') || pathname.includes('/account')) {
    return (
      <div className="top-links">
        {pathname.includes('/account') && activatedAccount && (
          <>
            <span className="tooltip">
              <a
                href="https://bithomp.com/go/acc-buy-swap"
                target="_blank"
                rel="noreferrer"
                className="top-link orange"
              >
                Buy XRP now
              </a>
              <span className="tooltiptext right small">{t('sponsored.sponsored')}</span>
            </span>{' '}
            💸 |{' '}
          </>
        )}
        <span className="tooltip">
          <a href="https://bithomp.com/go/earn-on-xrp" target="_blank" rel="noreferrer" className="top-link orange">
            Earn on XRP
          </a>
          <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
        </span>{' '}
        💰 {isMobile ? <br /> : ' | '}
        {stakeAd}
        {isMobile ? <br /> : ' | '}
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

  return (
    <div className="top-links">
      {stakeAd}
      {isMobile ? <br /> : ' | '}
      💰{' '}
      <span className="tooltip">
        <a href="https://bithomp.com/go/top-earn" target="_blank" rel="noreferrer" className="top-link orange">
          {!isMobile
            ? 'Build your long-term wealth with industry-leading rates on XRP, BTC, and more.'
            : 'Earn up to 14%'}
        </a>
        <span className="tooltiptext left small">{t('sponsored.sponsored')}</span>
      </span>
      {/*
      {width > 1200 || isMobile ? <span style={{ padding: '0 10px' }}>|</span> : ''}
      <span className="tooltip">
        <a href="https://bithomp.com/go/top-play" target="_blank" rel="noreferrer" className="top-link orange">
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
        unoptimized
      />
      */}
    </div>
  )
}
