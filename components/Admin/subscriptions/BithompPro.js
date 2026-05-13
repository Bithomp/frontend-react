import Select from 'react-select'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { xahauNetwork } from '../../../utils'

export default function Pro({ setPayPeriod }) {
  const { t } = useTranslation('admin')
  const options = [
    { value: 'm1', label: t('period.m1'), price: '9.99 EUR' },
    { value: 'm3', label: t('period.m3'), price: '29.97 EUR' },
    { value: 'm6', label: t('period.m6'), price: '59.94 EUR' },
    { value: 'y1', label: t('period.y1'), price: '99.99 EUR' }
  ]

  return (
    <>
      <h4 className="center">{t('subscriptions.pro.why-title')}</h4>
      <div style={{ textAlign: 'left' }}>
        <p>{t('subscriptions.pro.intro')}</p>

        <p>
          <b>{t('subscriptions.pro.benefits.reports-title')}:</b>{' '}
          <Link href="/admin/pro">{t('subscriptions.pro.benefits.reports-link')}</Link>,{' '}
          {t('subscriptions.pro.benefits.reports-text')}
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.services-title')}:</b>{' '}
          <Link href="/services/send">{t('subscriptions.pro.benefits.services.send')}</Link>,{' '}
          <Link href="/services/check">{t('subscriptions.pro.benefits.services.check')}</Link>,{' '}
          <Link href="/services/escrow">{t('subscriptions.pro.benefits.services.escrow')}</Link>.
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.scroll-title')}:</b> {t('subscriptions.pro.benefits.scroll-text')}{' '}
          <Link href="/tokens">Tokens</Link>,{' '}
          {!xahauNetwork && (
            <>
              <Link href="/amms">AMM Explorer</Link>,{' '}
            </>
          )}
          <Link href="/nft-explorer">NFT Explorer</Link>, <Link href="/nft-sales">NFT Sales</Link>,{' '}
          <Link href="/nft-distribution">NFT holders</Link>,{' '}
          {!xahauNetwork && (
            <>
              <Link href="/nft-volumes">NFT Collections</Link> &{' '}
            </>
          )}
          <Link href="/nft-volumes?list=issuers">NFT Issuers</Link>.
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.limits-title')}:</b> {t('subscriptions.pro.benefits.limits-text')}{' '}
          <Link href="/admin/watchlist">{t('tabs.watchlist')}</Link>.
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.avatars-title')}:</b> {t('subscriptions.pro.benefits.avatars-text')}{' '}
          <Link href="/admin/pro">{t('tabs.my-addresses')}</Link>.
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.ads-title')}</b>: {t('subscriptions.pro.benefits.ads-text')}
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.support-title')}</b>: {t('subscriptions.pro.benefits.support-text')}
        </p>
        <p>
          <b>{t('subscriptions.pro.benefits.project-title')}</b>: {t('subscriptions.pro.benefits.project-text')}
        </p>
        <p>{t('subscriptions.pro.more-coming')}</p>
      </div>
      <p>{t('subscriptions.pro.subscribe')}</p>

      <div className="center">
        <Select
          options={options}
          getOptionLabel={(option) => (
            <div style={{ width: '150px' }}>
              {option.label} <span style={{ float: 'right' }}>{option.price}</span>
            </div>
          )}
          onChange={(selected) => {
            setPayPeriod(selected.value)
          }}
          defaultValue={options[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="period-select"
        />
      </div>
    </>
  )
}
