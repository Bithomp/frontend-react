export const ALERT_PLAN_TIERS = {
  trial: {
    label: 'Trial',
    description: 'For testing one alert destination before choosing a paid plan.',
    price: 'Free',
    period: 'w1',
    connections: 1,
    listeners: 1,
    executionsDay: 5,
    executionsWeek: 10
  },
  basic: {
    label: 'Basic',
    description: 'For personal monitoring and small alert setups.',
    price: '30 EUR / month or 300 EUR / year',
    period: 'm1',
    connections: 1,
    listeners: 3,
    executionsDay: 30,
    executionsWeek: 100,
    prices: {
      month: {
        eur: 30
      },
      year: {
        eur: 300
      }
    }
  },
  standard: {
    label: 'Standard',
    description: 'For active monitoring with more channels, rules, and alert volume.',
    price: '100 EUR / month or 1000 EUR / year',
    period: 'm1',
    connections: 5,
    listeners: 20,
    executionsDay: 100,
    executionsWeek: 500,
    prices: {
      month: {
        eur: 100
      },
      year: {
        eur: 1000
      }
    }
  }
}

export const DEFAULT_ALERT_PLAN_TIER = 'trial'
export const DEFAULT_PAID_ALERT_PLAN_TIER = 'standard'

export const getAlertPlanTier = (tier) =>
  ALERT_PLAN_TIERS[tier] ? tier : DEFAULT_ALERT_PLAN_TIER

export const getPaidAlertPlanTier = (tier) =>
  ALERT_PLAN_TIERS[tier]?.prices ? tier : DEFAULT_PAID_ALERT_PLAN_TIER

export const getAlertPlan = (tier) => ALERT_PLAN_TIERS[getAlertPlanTier(tier)]

const metadataLimitValue = (metadata, key) => {
  const rawValue = metadata?.[key]
  if (rawValue === undefined || rawValue === null || rawValue === '') return null

  const value = Number(rawValue)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export const getAlertPlanForPackage = (packageItem) => {
  const metadata = packageItem?.metadata || {}
  const tier = getAlertPlanTier(metadata.tier || DEFAULT_ALERT_PLAN_TIER)
  const basePlan = getAlertPlan(tier)
  const connectionsLimit = metadataLimitValue(metadata, 'connections')
  const listenersLimit = metadataLimitValue(metadata, 'listeners')
  const hasMetadataLimits = connectionsLimit !== null || listenersLimit !== null

  return {
    ...basePlan,
    tier,
    label: metadata.tier ? basePlan.label : hasMetadataLimits ? 'Custom' : basePlan.label,
    connections: connectionsLimit ?? basePlan.connections,
    listeners: listenersLimit ?? basePlan.listeners,
    hasMetadataLimits
  }
}

export const alertTierOptions = Object.keys(ALERT_PLAN_TIERS)
  .map((tier) => ({ value: tier, label: ALERT_PLAN_TIERS[tier].label }))

export const alertPlanOptionList = (tier) => {
  const planKey = getAlertPlanTier(tier)
  const plan = ALERT_PLAN_TIERS[planKey]

  if (!plan.prices) {
    return [{ value: 'w1', label: '1 week', price: plan.price }]
  }

  const monthPrice = plan.prices.month.eur
  const yearPrice = plan.prices.year.eur
  return [
    { value: 'm1', label: '1 month', price: `${monthPrice} EUR` },
    { value: 'm3', label: '3 months', price: `${monthPrice * 3} EUR` },
    { value: 'm6', label: '6 months', price: `${monthPrice * 6} EUR` },
    { value: 'y1', label: '1 year', price: `${yearPrice} EUR` }
  ]
}
