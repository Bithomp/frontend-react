import { useEffect, useState } from 'react'
import Select from 'react-select'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { explorerName, useWidth } from '../../../utils'
import {
  ALERT_PLAN_TIERS,
  alertPlanOptionList,
  alertTierOptions,
  getPaidAlertPlanTier
} from '../../../utils/notificationPlans'

const optionIndex = (val) => {
  switch (val) {
    case 'm1':
      return 0
    case 'm3':
      return 1
    case 'm6':
      return 2
    case 'y1':
      return 3
    default:
      return 1
  }
}

const planLabel = (t, key, fallback) => t(`plans.${key}`, { defaultValue: fallback })
const planDescription = (t, key, options) => t(`subscriptions.alerts.plan-description.${key}`, options)
const periodLabel = (t, value) => t(`period.${value}`, value)

const PlanTable = ({ t }) => (
  <div className="alerts-plan-table-wrap">
    <table className="table-large no-hover alerts-plan-table alerts-plan-table-desktop">
      <thead>
        <tr>
          <th>{t('api.tier')}</th>
          <th>{t('table.price')}</th>
          <th>{t('notifications.channels.title')}</th>
          <th>{t('notifications.rules.title')}</th>
          <th>{t('subscriptions.alerts.alerts-day')}</th>
          <th>{t('subscriptions.alerts.alerts-week')}</th>
          <th>{t('table.description')}</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(ALERT_PLAN_TIERS).map((key) => {
          const plan = ALERT_PLAN_TIERS[key]
          return (
            <tr key={key}>
              <td>
                <b>{planLabel(t, key, plan.label)}</b>
              </td>
              <td className="alerts-plan-price">
                {plan.prices ? (
                  <>
                    <span>{t('subscriptions.alerts.price-month', { price: plan.prices.month.eur })}</span>
                    <span>{t('subscriptions.alerts.price-year-alt', { price: plan.prices.year.eur })}</span>
                  </>
                ) : (
                  plan.price
                )}
              </td>
              <td className="right">{plan.connections}</td>
              <td className="right">{plan.listeners}</td>
              <td className="right">{plan.executionsDay}</td>
              <td className="right">{plan.executionsWeek}</td>
              <td>
                {planDescription(t, key, { explorerName, defaultValue: plan.description })}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    <div className="alerts-plan-cards">
      {Object.keys(ALERT_PLAN_TIERS).map((key) => {
        const plan = ALERT_PLAN_TIERS[key]
        return (
          <div className="alerts-plan-card" key={key}>
            <div className="alerts-plan-card-header">
              <strong>{planLabel(t, key, plan.label)}</strong>
              <span>{plan.prices ? t('subscriptions.alerts.price-month', { price: plan.prices.month.eur }) : plan.price}</span>
            </div>
            {plan.prices && (
              <div className="alerts-plan-card-price">
                {t('subscriptions.alerts.price-year-alt', { price: plan.prices.year.eur })}
              </div>
            )}
            <div className="alerts-plan-card-grid">
              <span>{t('notifications.channels.title')}</span>
              <strong>{plan.connections}</strong>
              <span>{t('notifications.rules.title')}</span>
              <strong>{plan.listeners}</strong>
              <span>{t('subscriptions.alerts.alerts-day')}</span>
              <strong>{plan.executionsDay}</strong>
              <span>{t('subscriptions.alerts.alerts-week')}</span>
              <strong>{plan.executionsWeek}</strong>
            </div>
            <p>{planDescription(t, key, { explorerName, defaultValue: plan.description })}</p>
          </div>
        )
      })}
    </div>
    <style jsx>{`
      .alerts-plan-table-wrap {
        margin-top: 15px;
      }

      .alerts-plan-table .right {
        text-align: right;
      }

      .alerts-plan-price {
        min-width: 116px;
      }

      .alerts-plan-price span {
        display: block;
        white-space: nowrap;
      }

      .alerts-plan-cards {
        display: none;
      }

      @media only screen and (max-width: 640px) {
        .alerts-plan-table-desktop {
          display: none;
        }

        .alerts-plan-cards {
          display: grid;
          gap: 10px;
        }

        .alerts-plan-card {
          padding: 12px;
          border: 1px solid var(--table-frame);
          border-radius: 10px;
          background: var(--table-surface);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-link) 10%, transparent);
        }

        .alerts-plan-card-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .alerts-plan-card-header strong {
          font-size: 16px;
        }

        .alerts-plan-card-header span,
        .alerts-plan-card-price {
          color: var(--text-main);
          font-weight: 700;
          text-align: right;
        }

        .alerts-plan-card-price {
          margin-top: 2px;
          font-size: 13px;
        }

        .alerts-plan-card-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px 12px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--table-row-divider);
        }

        .alerts-plan-card-grid span {
          color: var(--text-secondary);
        }

        .alerts-plan-card-grid strong {
          text-align: right;
        }

        .alerts-plan-card p {
          margin: 10px 0 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.35;
        }
      }
    `}</style>
  </div>
)

export default function NotificationsBot({ setPayPeriod, setTier, tier }) {
  const { t } = useTranslation('admin')
  const normalizedTier = getPaidAlertPlanTier(tier)
  const translatedPlanOptions = (tier) =>
    alertPlanOptionList(tier).map((option) => ({ ...option, label: periodLabel(t, option.value) }))
  const [innerTier, setInnerTier] = useState(normalizedTier)
  const [optionValue, setOptionValue] = useState(translatedPlanOptions(normalizedTier)[1])
  const width = useWidth()

  const optionsList = translatedPlanOptions(innerTier)
  const translatedTierOptions = alertTierOptions.map((option) => ({ ...option, label: planLabel(t, option.value, option.label) }))
  const selectedTierOption = translatedTierOptions.find((option) => option.value === innerTier) || translatedTierOptions[1]

  useEffect(() => {
    const index = optionIndex(optionValue.value)
    const selectedOption = translatedPlanOptions(innerTier)[index]
    setTier(innerTier)
    setOptionValue(selectedOption)
    setPayPeriod(selectedOption.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerTier])

  return (
    <>
      <h4 className="center">{t('subscriptions.alerts.why-title')}</h4>
      <div style={{ textAlign: 'left' }}>
        <p>{t('subscriptions.alerts.intro', { explorerName })}</p>
        <p>{t('subscriptions.alerts.destinations')}</p>
        <p>
          {t('subscriptions.alerts.rules-before')}{' '}
          <Link href="/admin/notifications">{t('tabs.alerts')}</Link>.
        </p>
        <p>
          {t('subscriptions.alerts.balance-before')}{' '}
          <Link href="/admin/pro">{t('tabs.my-addresses')}</Link>.
        </p>
        <PlanTable t={t} />
      </div>

      <p>{t('subscriptions.alerts.subscribe')}</p>

      <div className="alerts-subscribe-selects center">
        <Select
          options={translatedTierOptions}
          getOptionLabel={(option) => (
            <div style={{ width: width > 400 ? '170px' : '160px', whiteSpace: 'nowrap' }}>{option.label}</div>
          )}
          onChange={(selected) => {
            setInnerTier(selected.value)
          }}
          defaultValue={selectedTierOption}
          value={selectedTierOption}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="notifications-tier-select"
        />
        <Select
          options={optionsList}
          getOptionLabel={(option) => (
            <div style={{ width: '160px' }}>
              {option.label} <span style={{ float: 'right' }}>{option.price}</span>
            </div>
          )}
          onChange={(selected) => {
            setPayPeriod(selected.value)
            setOptionValue(selected)
          }}
          defaultValue={translatedPlanOptions(normalizedTier)[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="notifications-period-select"
          value={optionValue}
        />
        <style jsx>{`
          .alerts-subscribe-selects {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
          }
        `}</style>
      </div>
    </>
  )
}
