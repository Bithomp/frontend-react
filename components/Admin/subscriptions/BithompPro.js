import Select from 'react-select'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { xahauNetwork } from '../../../utils'

export default function Pro({ setPayPeriod }) {
  const { t } = useTranslation(['admin', 'services'])
  const options = [
    { value: 'm1', label: t('period.m1'), price: '9.99 EUR' },
    { value: 'm3', label: t('period.m3'), price: '29.97 EUR' },
    { value: 'm6', label: t('period.m6'), price: '59.94 EUR' },
    { value: 'y1', label: t('period.y1'), price: '99.99 EUR' }
  ]
  const periodSelectStyles = {
    container: (base) => ({ ...base, minWidth: 340, maxWidth: 'min(100%, 420px)' }),
    menu: (base) => ({ ...base, minWidth: 340 })
  }
  const periodOptionLabel = (option) => (
    <span style={{ display: 'flex', gap: 28, justifyContent: 'space-between', whiteSpace: 'nowrap', width: 260 }}>
      <span>{option.label}</span>
      <span>{option.price}</span>
    </span>
  )

  return (
    <div className="pro-subscription-panel">
      <div className="pro-subscription-intro">
        <h4>{t('subscriptions.pro.why-title')}</h4>
        <p>{t('subscriptions.pro.intro')}</p>
      </div>

      <div className="pro-benefit-grid">
        <article>
          <h5>{t('subscriptions.pro.benefits.reports-title')}</h5>
          <p>
            <Link href="/admin/pro">{t('subscriptions.pro.benefits.reports-link')}</Link>,{' '}
            {t('subscriptions.pro.benefits.reports-text')}
          </p>
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.services-title')}</h5>
          <p>
            {t('subscriptions.pro.benefits.services.advanced-prefix')}{' '}
            <Link href="/services/send">{t('services-nav.send', { ns: 'services' })}</Link>,{' '}
            <Link href="/services/trustline">{t('services-nav.trustline', { ns: 'services' })}</Link>,{' '}
            <Link href="/services/check">{t('services-nav.check', { ns: 'services' })}</Link>,{' '}
            <Link href="/services/escrow">{t('services-nav.escrow', { ns: 'services' })}</Link>.{' '}
            {t('subscriptions.pro.benefits.services.access-prefix')}{' '}
            <Link href="/services/account-control">{t('services-nav.account-control', { ns: 'services' })}</Link>{' '}
            {t('subscriptions.pro.benefits.services.and')}{' '}
            <Link href="/services/token-issuer-settings">{t('services-nav.token-issuer-settings', { ns: 'services' })}</Link>.
          </p>
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.scroll-title')}</h5>
          <p>
            {t('subscriptions.pro.benefits.scroll-text')}{' '}
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
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.limits-title')}</h5>
          <p>
            {t('subscriptions.pro.benefits.limits-text')} <Link href="/admin/watchlist">{t('tabs.watchlist')}</Link>.
          </p>
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.avatars-title')}</h5>
          <p>
            {t('subscriptions.pro.benefits.avatars-text')} <Link href="/admin/pro">{t('tabs.my-addresses')}</Link>.
          </p>
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.ads-title')}</h5>
          <p>{t('subscriptions.pro.benefits.ads-text')}</p>
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.support-title')}</h5>
          <p>{t('subscriptions.pro.benefits.support-text')}</p>
        </article>
        <article>
          <h5>{t('subscriptions.pro.benefits.project-title')}</h5>
          <p>{t('subscriptions.pro.benefits.project-text')}</p>
        </article>
      </div>

      <div className="pro-subscription-purchase">
        <div>
          <strong>{t('subscriptions.pro.subscribe')}</strong>
        </div>
        <Select
          options={options}
          formatOptionLabel={periodOptionLabel}
          onChange={(selected) => {
            setPayPeriod(selected.value)
          }}
          defaultValue={options[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="period-select"
          styles={periodSelectStyles}
        />
      </div>
      <style jsx>{`
        .pro-subscription-panel {
          display: grid;
          gap: 18px;
          text-align: left;
        }

        .pro-subscription-intro {
          text-align: center;
        }

        .pro-subscription-intro h4 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .pro-subscription-intro p {
          max-width: 820px;
          margin: 0 auto;
          color: var(--text-secondary);
        }

        .pro-benefit-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .pro-benefit-grid article {
          min-width: 0;
          padding: 14px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 18%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--background-secondary) 58%, transparent);
        }

        .pro-benefit-grid h5 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .pro-benefit-grid p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.45;
        }

        .pro-subscription-purchase {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 14px;
          border: 1px solid color-mix(in srgb, var(--accent-link) 22%, transparent);
          border-radius: 10px;
          background: color-mix(in srgb, var(--accent-link) 8%, transparent);
        }

        .pro-subscription-purchase > div {
          display: grid;
          gap: 3px;
          min-width: min(100%, 280px);
        }

        .pro-subscription-purchase strong {
          font-size: 17px;
        }

        @media only screen and (max-width: 760px) {
          .pro-benefit-grid {
            grid-template-columns: 1fr;
          }

          .pro-subscription-purchase {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
