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
  <div style={{ overflowX: 'auto', marginTop: '15px' }}>
    <table className="table-large no-hover">
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
              <td>{plan.price}</td>
              <td>{plan.connections}</td>
              <td>{plan.listeners}</td>
              <td>{plan.executionsDay}</td>
              <td>{plan.executionsWeek}</td>
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

      <div className="center">
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
        {width > 400 ? (
          <div style={{ display: 'inline-block', width: '10px' }}></div>
        ) : (
          <div style={{ height: '20px' }}></div>
        )}
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
      </div>
    </>
  )
}
