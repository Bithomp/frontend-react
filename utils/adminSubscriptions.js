import { timestampExpired } from '.'
import { ALERT_PLAN_TIERS } from './notificationPlans'

export const subscriptionPackageType = (section) => {
  switch (section) {
    case 'pro':
      return 'bithomp_pro'
    case 'api':
      return 'token'
    case 'notifications':
    case 'bot':
      return 'bot'
    default:
      return section
  }
}

export const splitSubscriptionPackages = (packages = []) => {
  const active = []
  const expired = []

  packages.forEach((packageItem) => {
    if (packageItem.expiredAt && timestampExpired(packageItem.expiredAt)) {
      expired.push(packageItem)
    } else {
      active.push(packageItem)
    }
  })

  return { active, expired }
}

export const subscriptionTierValue = (row) => {
  const value = row?.metadata?.tier || ''
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

export const botLimitLabel = (metadata = {}, t) => {
  const parts = []

  if (typeof metadata.connections === 'number') {
    parts.push(t('notifications.limit.channels', { count: metadata.connections }))
  }

  if (typeof metadata.listeners === 'number') {
    parts.push(t('notifications.limit.rules', { count: metadata.listeners }))
  }

  return parts.join(' / ')
}

export const subscriptionTierLabel = (row, t) => {
  if (!['bot', 'token'].includes(row?.type)) return ''

  const tier = subscriptionTierValue(row)

  if (row.type === 'bot') {
    return tier ? t(`plans.${tier}`, { defaultValue: ALERT_PLAN_TIERS[tier]?.label || tier }) : botLimitLabel(row?.metadata, t)
  }

  return tier ? t(`plans.${tier}`, { defaultValue: tier }) : ''
}
