import { useEffect, useState } from 'react'
import Select from 'react-select'
import Link from 'next/link'
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

const PlanTable = () => (
  <div className="alerts-plan-table-wrap">
    <table className="table-large no-hover alerts-plan-table alerts-plan-table-desktop">
      <thead>
        <tr>
          <th>Tier</th>
          <th>Price</th>
          <th>Channels</th>
          <th>Rules</th>
          <th>Alerts/day</th>
          <th>Alerts/week</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(ALERT_PLAN_TIERS).map((key) => {
          const plan = ALERT_PLAN_TIERS[key]
          return (
            <tr key={key}>
              <td>
                <b>{plan.label}</b>
              </td>
              <td className="alerts-plan-price">
                {plan.prices ? (
                  <>
                    <span>{plan.prices.month.eur} EUR / month</span>
                    <span>or {plan.prices.year.eur} EUR / year</span>
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
                {key === 'basic'
                  ? `For personal ${explorerName} monitoring and small alert setups.`
                  : key === 'standard'
                    ? `For active ${explorerName} monitoring with more channels, rules, and alert volume.`
                    : plan.description}
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
              <strong>{plan.label}</strong>
              <span>{plan.prices ? `${plan.prices.month.eur} EUR / month` : plan.price}</span>
            </div>
            {plan.prices && <div className="alerts-plan-card-price">or {plan.prices.year.eur} EUR / year</div>}
            <div className="alerts-plan-card-grid">
              <span>Channels</span>
              <strong>{plan.connections}</strong>
              <span>Rules</span>
              <strong>{plan.listeners}</strong>
              <span>Alerts/day</span>
              <strong>{plan.executionsDay}</strong>
              <span>Alerts/week</span>
              <strong>{plan.executionsWeek}</strong>
            </div>
            <p>
              {key === 'basic'
                ? `For personal ${explorerName} monitoring and small alert setups.`
                : key === 'standard'
                  ? `For active ${explorerName} monitoring with more channels, rules, and alert volume.`
                  : plan.description}
            </p>
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
  const normalizedTier = getPaidAlertPlanTier(tier)
  const [innerTier, setInnerTier] = useState(normalizedTier)
  const [optionValue, setOptionValue] = useState(alertPlanOptionList(normalizedTier)[1])
  const width = useWidth()

  const optionsList = alertPlanOptionList(innerTier)
  const selectedTierOption = alertTierOptions.find((option) => option.value === innerTier) || alertTierOptions[1]

  useEffect(() => {
    const index = optionIndex(optionValue.value)
    const selectedOption = alertPlanOptionList(innerTier)[index]
    setTier(innerTier)
    setOptionValue(selectedOption)
    setPayPeriod(selectedOption.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerTier])

  return (
    <>
      <h4 className="center">Why Purchase an Alerts Bot Subscription?</h4>
      <div style={{ textAlign: 'left' }}>
        <p>Use alert channels and rules to receive updates for {explorerName} activity.</p>
        <p>✅ Send alerts to Email, Discord, Slack, or X/Twitter.</p>
        <p>
          ✅ Create NFT sale, NFT listing, and Pro address balance-change rules on the{' '}
          <Link href="/admin/notifications">Alerts page</Link>.
        </p>
        <p>
          ✅ Balance change alerts require verified addresses with balance history enabled in{' '}
          <Link href="/admin/pro">My addresses</Link>.
        </p>
        <PlanTable />
      </div>

      <p>Subscribe to Alerts Bot!</p>

      <div className="alerts-subscribe-selects center">
        <Select
          options={alertTierOptions}
          getOptionLabel={(option) => <div style={{ width: width > 400 ? '110px' : '160px' }}>{option.label}</div>}
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
          defaultValue={alertPlanOptionList(normalizedTier)[1]}
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
