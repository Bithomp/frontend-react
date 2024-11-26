import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { nativeCurrency, xahauNetwork } from '../utils'
import { useIsMobile, getIsSsrMobile } from '../utils/mobile'
import { duration, fullNiceNumber } from '../utils/format'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'

export default function Alerts() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  function localDateAndTime(timestamp) {
    let params = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }
    if (isMobile) {
      params = { month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric' }
    }
    return new Date(timestamp * 1000).toLocaleString([], params)
  }

  const [data, setData] = useState({})

  useEffect(() => {
    async function fetchData() {
      /*
      {
        "count": 18,
        "timestamp": 1553244122,
        "alerts": [
          {
            "currency":"eur",
            "change":"+10.07%",
            "timestamp_old":1551052200,
            "timestamp_new":1551118200,
            "rate_old":0.2621,
            "rate_new":0.2885
          },
      */
      const response = await axios('v2/price/xrp/alerts')
      setData(response.data)
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <SEO
        title={t('menu.price-alerts', { nativeCurrency })}
        images={[
          {
            width: 1200,
            height: 630,
            file: 'previews/1200x630/alerts.png'
          },
          {
            width: 630,
            height: 630,
            file: 'previews/630x630/alerts.png'
          }
        ]}
      />
      <div className="page-alerts content-center">
        <h1 className="center">{t('menu.price-alerts', { nativeCurrency })}</h1>
        <p>
          <Trans i18nKey="alerts.text0">
            Get notified when {{ nativeCurrency }}/USD or {{ nativeCurrency }}/BTC market price by{' '}
            <a href={xahauNetwork ? 'https://www.coingecko.com/' : 'https://www.bitstamp.net/'}>
              {{ linkText: xahauNetwork ? 'CoinGecko' : 'Bitstamp' }}
            </a>{' '}
            changes for more than 5% within an hour or more than 10% within a day.
          </Trans>
        </p>
        {!xahauNetwork && (
          <p>
            <Trans i18nKey="alerts.text1">
              Follow the Telegram channel: <a href="https://t.me/bithomp">bithomp</a> or the X account:{' '}
              <a href="https://x.com/XRP_PriceAlerts">XRP Price Alerts</a>.
            </Trans>
          </p>
        )}
        <h3 className="center">{t('alerts.last-alerts')}</h3>
        <table className="table-large">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('alerts.date-and-time')}</th>
              <th>{t('alerts.currency-pair')}</th>
              <th>{t('alerts.change-duration')}</th>
              <th>{t('alerts.change')}</th>
              <th>{t('alerts.old-rate')}</th>
              <th>{t('alerts.new-rate')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.alerts?.map((alert, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{localDateAndTime(alert.timestamp_new)}</td>
                <td>
                  {nativeCurrency}/{isMobile && ' '}
                  {alert.currency.toUpperCase()}
                </td>
                <td>{duration(t, alert.timestamp_new - alert.timestamp_old)}</td>
                <td>{alert.change}</td>
                <td>{fullNiceNumber(alert.rate_old)}</td>
                <td>{fullNiceNumber(alert.rate_new)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
