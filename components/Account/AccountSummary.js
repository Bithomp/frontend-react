import { i18n } from 'next-i18next'
import { nativeCurrencyToFiat, shortNiceNumber, timeFromNow } from '../../utils/format'
import { avatarSrc, devNet, getCoinsUrl, nativeCurrency } from '../../utils'
import Image from 'next/image'
import Link from 'next/link'

export default function AccountSummary({ data, account, balances, refreshPage, selectedCurrency, pageFiatRate }) {
  const niceBalance = shortNiceNumber(balances?.available?.native / 1000000, 2, 0)

  return (
    <div className="account-summary">
      <Image alt="avatar" src={avatarSrc(data?.address, refreshPage)} width="60" height="60" priority />
      <div style={{ display: 'inline-block', position: 'absolute', top: 7, left: 75 }}>
        {data.username ? (
          <h1 style={{ fontSize: '1em', margin: 0 }} className="blue">
            {data.username}
          </h1>
        ) : (
          <b>
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
          </b>
        )}
        {data?.ledgerInfo?.blackholed ? (
          <>
            <b className="orange">Blackholed </b>
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
                {timeFromNow(data.inception, i18n)}
              </>
            )}
          </>
        ) : (
          <>
            {data?.ledgerInfo?.deleted ? (
              <span className="red bold">Account deleted</span>
            ) : (
              <>
                <span className="orange">Not activated</span>
                <br />
                <a href={getCoinsUrl + (devNet ? '?address=' + data?.address : '')} target="_blank" rel="noreferrer">
                  Get your first {nativeCurrency}
                </a>
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
        <b>{data?.ledgerInfo?.activated && !data?.ledgerInfo?.blackholed ? 'Available ' : 'Balance'}</b>
        <br />
        <span className={balances?.available?.native && !data?.ledgerInfo?.blackholed ? 'green bold' : ''}>
          {niceBalance ? niceBalance + ' ' + nativeCurrency : ''}
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
