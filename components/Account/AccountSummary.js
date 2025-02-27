import { i18n } from 'next-i18next'
import { fullNiceNumber, nativeCurrencyToFiat, shortNiceNumber, timeFromNow } from '../../utils/format'
import { avatarSrc, devNet, getCoinsUrl, nativeCurrency } from '../../utils'
import Image from 'next/image'
import Link from 'next/link'

import { useQRCode } from 'next-qrcode'

export default function AccountSummary({ data, account, balances, refreshPage, selectedCurrency, pageFiatRate }) {
  const { Canvas } = useQRCode()

  const niceBalance = shortNiceNumber(balances?.available?.native / 1000000, 2, 0)

  return (
    <div className="account-summary">
      <Image
        alt="avatar"
        src={avatarSrc(data?.address, refreshPage)}
        width="60"
        height="60"
        priority
        className="show-on-small-w800"
      />
      <div className="hide-on-small-w800" style={{ paddingTop: 2, marginBottom: -2 }}>
        <Canvas
          text={data?.address}
          options={{
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 4,
            width: 62,
            color: {
              dark: '#333333ff',
              light: '#ffffffff'
            }
          }}
        />
      </div>

      <div style={{ display: 'inline-block', position: 'absolute', top: 7, left: 75 }}>
        {data.username ? (
          <h1 style={{ fontSize: '1em', margin: 0 }} className="blue">
            {data.username}
          </h1>
        ) : (
          <span className="bold">
            {data.service?.name ? (
              <span className="green">{data.service?.name}</span>
            ) : data?.address === account?.address && data?.ledgerInfo?.activated ? (
              <>
                Username <Link href={'/username?address=' + data.address}>register</Link>
              </>
            ) : (
              'No username'
            )}
            <br />
          </span>
        )}
        {data?.ledgerInfo?.blackholed ? (
          <>
            <span className="orange bold">Blackholed </span>
            <br />
            {data?.ledgerInfo?.lastSubmittedAt && <>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</>}
          </>
        ) : data?.ledgerInfo?.activated ? (
          <>
            {data.ledgerInfo.lastSubmittedAt ? (
              <>
                <span className="green">Active </span>
                <br />
                {data?.ledgerInfo?.lastSubmittedAt && <>{timeFromNow(data.ledgerInfo.lastSubmittedAt, i18n)}</>}
              </>
            ) : (
              <>
                Activated
                <br />
                {data.inception ? timeFromNow(data.inception, i18n) : ''}
              </>
            )}
          </>
        ) : (
          <>
            {data?.ledgerInfo?.deleted ? (
              <span className="red bold">Account deleted</span>
            ) : data?.ledgerInfo?.activated === false ? (
              <>
                <span className="orange">Not activated</span>
                <br />
                <a href={getCoinsUrl + (devNet ? '?address=' + data?.address : '')} target="_blank" rel="noreferrer">
                  Get your first {nativeCurrency}
                </a>
              </>
            ) : (
              <>
                <span className="orange">Network error</span>
                <br />
                Please try again later.
              </>
            )}
          </>
        )}
      </div>
      <div
        style={{
          display: 'inline-block',
          position: 'absolute',
          top: 7,
          right: 5,
          textAlign: 'right'
        }}
      >
        <span className="bold">
          {data?.ledgerInfo?.activated && !data?.ledgerInfo?.blackholed ? 'Available ' : 'Balance'}
        </span>
        <br />
        <span className={balances?.available?.native && !data?.ledgerInfo?.blackholed ? 'green bold' : ''}>
          {niceBalance ? (
            <span className="tooltip">
              {niceBalance + ' ' + nativeCurrency}
              <span className="tooltiptext no-brake">
                {fullNiceNumber(balances?.available?.native / 1000000)} {nativeCurrency}
              </span>
            </span>
          ) : data?.ledgerInfo?.activated === false ? (
            '0 ' + nativeCurrency
          ) : (
            '...'
          )}
        </span>
        <br />
        <span className="grey">
          {nativeCurrencyToFiat({
            amount: balances.available?.native,
            selectedCurrency,
            fiatRate: pageFiatRate
          })}
        </span>
      </div>
    </div>
  )
}
