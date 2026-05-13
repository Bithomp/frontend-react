import { useEffect, useState } from 'react'
import Select from 'react-select'
import { useWidth } from '../../../utils'
import { useTranslation } from 'next-i18next'

const priceOptions = {
  basic: ['30 EUR', '90 EUR', '180 EUR', '300 EUR'],
  standard: ['100 EUR', '300 EUR', '600 EUR', '1000 EUR'],
  premium: ['250 EUR', '750 EUR', '1500 EUR', '2500 EUR'],
  enterprise: ['500 EUR', '1500 EUR', '3000 EUR', '5000 EUR'],
  enterprise2: ['1000 EUR', '3000 EUR', '6000 EUR', '10000 EUR'],
  enterprise3: ['2000 EUR', '6000 EUR', '12000 EUR', '20000 EUR']
}

const apiPlans = [
  {
    key: 'free',
    tier: 'free-non-commercial',
    requestsMinute: '10',
    requestsDay: '2K',
    nftContentPlan: 'Free',
    price: '0'
  },
  {
    key: 'basic',
    tier: 'basic',
    requestsMinute: '100',
    requestsDay: '30K',
    nftContentPlan: 'Start',
    price: '30 EUR'
  },
  {
    key: 'standard',
    tier: 'standard',
    requestsMinute: '400',
    requestsDay: '120K',
    nftContentPlan: 'Basic',
    price: '100 EUR',
    highlighted: true
  },
  {
    key: 'premium',
    tier: 'premium',
    requestsMinute: '1000',
    requestsDay: '300K',
    nftContentPlan: 'Basic',
    price: '250 EUR',
    highlighted: true
  },
  {
    key: 'enterprise',
    tier: 'enterprise',
    requestsMinute: '2000',
    requestsDay: '600K',
    nftContentPlan: 'Basic',
    price: '500 EUR',
    highlighted: true
  },
  {
    key: 'enterprise2',
    tier: 'enterprise2',
    requestsMinute: '4000',
    requestsDay: '1.2M',
    nftContentPlan: 'Standard',
    price: '1000 EUR',
    highlighted: true
  },
  {
    key: 'enterprise3',
    tier: 'enterprise3',
    requestsMinute: '8000',
    requestsDay: '2.4M',
    nftContentPlan: 'Premium',
    price: '2000 EUR',
    highlighted: true
  },
  {
    key: 'on-demand-basic',
    tier: 'on-demand-basic',
    requestsMinute: 'N/A',
    requestsDay: 'N/A',
    nftContentPlan: 'Start',
    price: '0.0001 XRP / 0.003 XAH',
    perRequest: true
  },
  {
    key: 'on-demand-premium',
    tier: 'on-demand-premium',
    requestsMinute: 'N/A',
    requestsDay: 'N/A',
    nftContentPlan: 'Start',
    price: '0.001 XRP / 0.03 XAH',
    perRequest: true,
    highlighted: true
  }
]

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

const planLabel = (t, key) => t(`plans.${key}`, { defaultValue: key })
const planPrice = (t, plan) => plan.perRequest ? `${plan.price} ${t('subscriptions.api.per-request')}` : plan.price

const PlanTable = ({ t }) => {
  const [showAdvancedPlans, setShowAdvancedPlans] = useState(false)
  const visiblePlans = showAdvancedPlans ? apiPlans : apiPlans.slice(0, 5)

  return (
    <div className="api-plan-table-wrap">
      <h5>{t('subscriptions.api.plan-table-title')}</h5>
      <p>{t('subscriptions.api.testnet-free')}</p>

      <table className="table-large no-hover api-plan-table api-plan-table-desktop">
        <thead>
          <tr>
            <th>{t('api.tier')}</th>
            <th>{t('subscriptions.api.max-requests-minute')}</th>
            <th>{t('subscriptions.api.max-requests-day')}</th>
            <th>{t('subscriptions.api.nft-content-plan')}</th>
            <th>{t('subscriptions.api.price-month')}</th>
          </tr>
        </thead>
        <tbody>
          {visiblePlans.map((plan) => (
            <tr key={plan.key}>
              <td>
                <b>
                  {planLabel(t, plan.tier)}
                  {plan.highlighted && <sup>**</sup>}
                </b>
              </td>
              <td className="right">{plan.requestsMinute}</td>
              <td className="right">{plan.requestsDay}</td>
              <td>{plan.nftContentPlan}</td>
              <td>{planPrice(t, plan)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="api-plan-cards">
        {visiblePlans.map((plan) => (
          <div className="api-plan-card" key={plan.key}>
            <div className="api-plan-card-header">
              <strong>
                {planLabel(t, plan.tier)}
                {plan.highlighted && <sup>**</sup>}
              </strong>
              <span>{planPrice(t, plan)}</span>
            </div>
            <div className="api-plan-card-grid">
              <span>{t('subscriptions.api.max-requests-minute')}</span>
              <strong>{plan.requestsMinute}</strong>
              <span>{t('subscriptions.api.max-requests-day')}</span>
              <strong>{plan.requestsDay}</strong>
              <span>{t('subscriptions.api.nft-content-plan')}</span>
              <strong>{plan.nftContentPlan}</strong>
            </div>
          </div>
        ))}
      </div>

      <button className="api-plan-toggle" onClick={() => setShowAdvancedPlans((visible) => !visible)} type="button">
        {showAdvancedPlans ? t('subscriptions.api.hide-advanced-plans') : t('subscriptions.api.show-advanced-plans')}
      </button>

      {showAdvancedPlans && <p className="api-plan-note">** {t('subscriptions.api.advanced-plan-note')}</p>}

      <style jsx>{`
      .api-plan-table-wrap {
        margin-top: 16px;
      }

      .api-plan-table-wrap h5 {
        margin: 0 0 8px;
        font-size: 18px;
      }

      .api-plan-table-wrap p {
        margin: 6px 0;
        color: var(--text-secondary);
        line-height: 1.4;
      }

      .api-plan-table {
        width: 100%;
        min-width: 760px;
        margin-top: 12px;
      }

      .api-plan-table .right {
        text-align: right;
      }

      .api-plan-table sup,
      .api-plan-card sup {
        color: var(--accent-link);
      }

      .api-plan-cards {
        display: none;
      }

      .api-plan-note {
        font-size: 13px;
      }

      .api-plan-toggle {
        display: block;
        margin: 12px auto 0;
        padding: 8px 14px;
        border: 1px solid var(--button-secondary-border);
        border-radius: 10px;
        background: var(--button-secondary-bg);
        color: var(--button-secondary-text);
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }

      .api-plan-toggle:hover {
        border-color: var(--accent-link);
        color: var(--accent-link);
      }

      @media only screen and (max-width: 760px) {
        .api-plan-table-desktop {
          display: none;
        }

        .api-plan-cards {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .api-plan-card {
          padding: 12px;
          border: 1px solid var(--table-frame);
          border-radius: 10px;
          background: var(--table-surface);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-link) 10%, transparent);
        }

        .api-plan-card-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .api-plan-card-header strong {
          font-size: 16px;
        }

        .api-plan-card-header span {
          color: var(--text-main);
          font-weight: 700;
          text-align: right;
        }

        .api-plan-card-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px 12px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--table-row-divider);
        }

        .api-plan-card-grid span {
          color: var(--text-secondary);
        }

        .api-plan-card-grid strong {
          text-align: right;
        }
      }
    `}</style>
    </div>
  )
}

export default function Api({ setPayPeriod, setTier, tier }) {
  const { t } = useTranslation('admin')
  const periodValues = ['m1', 'm3', 'm6', 'y1']
  const periodLabels = [t('period.m1'), t('period.m3'), t('period.m6'), t('period.y1')]
  const options = Object.fromEntries(
    Object.entries(priceOptions).map(([key, prices]) => [
      key,
      periodValues.map((value, index) => ({ value, label: periodLabels[index], price: prices[index] }))
    ])
  )
  const tierOptions = [
    { value: 'basic', label: t('plans.basic') },
    { value: 'standard', label: t('plans.standard') },
    { value: 'premium', label: t('plans.premium') },
    { value: 'enterprise', label: t('plans.enterprise') },
    { value: 'enterprise2', label: t('plans.enterprise2') },
    { value: 'enterprise3', label: t('plans.enterprise3') }
  ]
  const [innerTier, setInnerTier] = useState(tier)
  const [optionsList, setOptionsList] = useState(options[tier])
  const [optionValue, setOptionValue] = useState(options[tier][1])

  const width = useWidth()

  useEffect(() => {
    const index = optionIndex(optionValue.value)
    setTier(innerTier)
    setOptionsList(options[innerTier])
    setOptionValue(options[innerTier][index])
    setPayPeriod(options[innerTier][index].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerTier])

  return (
    <>
      <h4 className="center">{t('subscriptions.api.why-title')}</h4>
      <div style={{ textAlign: 'left' }}>
        <PlanTable t={t} />
      </div>
      <p>{t('subscriptions.api.subscribe')}</p>

      <div className="center">
        <Select
          options={tierOptions}
          getOptionLabel={(option) => (
            <div style={{ width: width > 400 ? '170px' : '160px', whiteSpace: 'nowrap' }}>{option.label}</div>
          )}
          onChange={(selected) => {
            setInnerTier(selected.value)
          }}
          defaultValue={tierOptions[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="tier-select"
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
          defaultValue={optionsList[1]}
          isSearchable={false}
          className="simple-select"
          classNamePrefix="react-select"
          instanceId="period-select"
          value={optionValue}
        />
      </div>
    </>
  )
}
