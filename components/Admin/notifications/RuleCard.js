import { Fragment } from 'react'
import { useTranslation } from 'next-i18next'
import { MdDelete, MdEdit, MdHistory } from 'react-icons/md'

import Card from '@/components/UI/Card'
import { LinkAccount } from '@/utils/links'
import { isAddressValid, nativeCurrency } from '@/utils'
import { fullDateAndTime } from '@/utils/format'
import {
  getNotificationEventLabel,
  getNotificationFiatCurrencyLabel,
  notificationEventSupports
} from '@/utils/notificationRules'

const operatorMap = {
  $eq: 'notifications.operators.is',
  $ne: 'notifications.operators.is-not',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'notifications.operators.in',
  $nin: 'notifications.operators.not-in',
  $exists: 'notifications.operators.exists',
  $elemMatch: 'contains'
}

const addressConditionFields = new Set(['account', 'address', 'currency_issuer', 'destination', 'issuer'])

const fieldLabelMap = {
  account: 'notifications.filters.account',
  address: 'notifications.filters.address',
  amount: 'notifications.filters.amount',
  currency: 'notifications.filters.token',
  currency_issuer: 'notifications.filters.issuer',
  destination: 'notifications.filters.destination',
  issuer: 'notifications.filters.issuer',
  known_broker: 'notifications.filters.known_broker',
  price: 'notifications.filters.price',
  price_usd: 'notifications.filters.price_usd',
  taxon: 'notifications.filters.taxon',
  timestamp: 'table.date-time',
  token: 'notifications.filters.token',
  tx_type: 'notifications.filters.tx_type'
}

const disableReasonMap = {
  no_rules: 'notifications.errors.listener-no-rules',
  'errors.connection.not_found': 'notifications.errors.connection-not-found',
  'errors.connection.settings_required': 'notifications.errors.connection-settings-required',
  'errors.listener.disabled': 'notifications.errors.listener-disabled',
  'errors.listener.no_rules': 'notifications.errors.listener-no-rules',
  'errors.package.tier_required': 'notifications.errors.package-tier-required',
  'errors.package.limit_reached': 'notifications.errors.package-limit-reached'
}

const fieldLabel = (field, t) => {
  const mapped = fieldLabelMap[field]
  return mapped ? t(mapped, { nativeCurrency }) : field.replace(/[._]/g, ' ')
}

const isRuleEnabled = (enabled) => enabled !== false && enabled !== 0 && enabled !== '0' && enabled !== 'false'

const formatDisableReason = (reason, t) => {
  if (!reason) return ''
  if (disableReasonMap[reason]) return t(disableReasonMap[reason])

  return String(reason)
    .replace(/^errors\./, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function renderConditionValue(field, value, t) {
  if (value === null) return t('common.none')

  if (Array.isArray(value)) {
    return (
      <span className="notification-rule-value-list">
        {value.map((item, index) => (
          <span key={`${field}-${index}`}>{renderConditionValue(field, item, t)}</span>
        ))}
      </span>
    )
  }

  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no')
  }

  if (addressConditionFields.has(field) && typeof value === 'string' && isAddressValid(value)) {
    return <LinkAccount address={value} short={8} />
  }

  if (field === 'timestamp' && Number.isFinite(Number(value))) {
    return fullDateAndTime(Number(value))
  }

  if (typeof value === 'object') {
    if ('$abs' in value) {
      return (
        <span className="notification-rule-expression">
          <em>abs</em> {renderConditionValue(field, value.$abs, t)}
        </span>
      )
    }

    const nested = parseConditions(value, t)
    if (nested) {
      return <span className="notification-rule-nested-condition">{nested}</span>
    }

    return JSON.stringify(value)
  }

  return String(value)
}

function joinConditionNodes(nodes, separator) {
  return nodes.map((node, index) => (
    <Fragment key={index}>
      {index > 0 && <span className="notification-rule-separator"> {separator} </span>}
      {node}
    </Fragment>
  ))
}

function formatCondition(field, opObj, t) {
  if (typeof opObj !== 'object' || opObj === null) return null
  const nodes = Object.entries(opObj)
    .filter(([op, value]) => !(field === 'issuer' && op === '$eq' && value === null))
    .map(([op, value]) => {
      const operatorLabel = operatorMap[op]?.startsWith?.('notifications.') ? t(operatorMap[op]) : operatorMap[op] || op

      if (op === '$elemMatch' && typeof value === 'object' && value !== null) {
        const nested = parseConditions(value, t)
        if (!nested) return null
        return (
          <span className="notification-rule-filter-match" key={`${field}-${op}`}>
            <span className="notification-rule-filter-match-label">
              <span>{fieldLabel(field, t)}</span>
              <em>{operatorLabel}</em>
            </span>
            <span className="notification-rule-nested-condition">{nested}</span>
          </span>
        )
      }

      return (
        <span className="notification-rule-filter-chip" key={`${field}-${op}`}>
          <span>{fieldLabel(field, t)}</span>
          <em>{operatorLabel}</em>
          <strong>{renderConditionValue(field, value, t)}</strong>
        </span>
      )
    })
    .filter(Boolean)

  if (!nodes.length) return null

  return joinConditionNodes(nodes, t('notifications.operators.and'))
}

function parseConditions(conditions, t) {
  if (!conditions || typeof conditions !== 'object') return null
  const parts = []

  for (const [key, value] of Object.entries(conditions)) {
    if (key === '$or' && Array.isArray(value)) {
      const orParts = value.map((sub) => parseConditions(sub, t)).filter(Boolean)
      if (orParts.length) {
        parts.push(
          <span className="notification-rule-filter-group" key={key}>
            ({joinConditionNodes(orParts, t('notifications.operators.or'))})
          </span>
        )
      }
    } else if (typeof value === 'object' && value !== null) {
      const condition = formatCondition(key, value, t)
      if (condition) {
        parts.push(<Fragment key={key}>{condition}</Fragment>)
      }
    }
  }

  return parts.length ? joinConditionNodes(parts, t('notifications.operators.and')) : null
}

export default function RuleCard({ deleting, loadingExecutions, onDelete, onEdit, onExecutions, rule }) {
  const { t } = useTranslation('admin')
  const eventLabel = getNotificationEventLabel(rule.event)
  const channelLabel = rule.channel?.name || t(`notifications.channel-type.${rule.channel?.type}`, { defaultValue: rule.channel?.type })
  const settings = rule.settings || {}
  const conditionText = parseConditions(settings.rules, t)
  const enabled = isRuleEnabled(rule.enabled)
  const rawDisableReason = settings.disableReason
  const disableReason = enabled ? '' : formatDisableReason(rawDisableReason, t)

  return (
    <Card className="notification-card notification-rule-card">
      <div className="notification-card-header">
        <div>
          <div className="notification-rule-title">{rule.name || t('notifications.rule-number', { id: rule.id })}</div>
          <div className={`notification-rule-status ${enabled ? 'enabled' : 'paused'}`}>
            {enabled ? t('status.enabled') : t('status.paused')}
          </div>
          {disableReason && (
            <div className="notification-rule-disable-reason">
              {t('notifications.paused-reason', { reason: disableReason })}
            </div>
          )}
        </div>
        <div className="notification-card-actions">
          {onExecutions && (
            <button
              aria-label={t('notifications.actions.show-executions')}
              className="icon-button"
              disabled={loadingExecutions}
              onClick={() => onExecutions(rule)}
              type="button"
            >
              <MdHistory />
            </button>
          )}
          {onEdit && (
            <button
              aria-label={t('notifications.actions.edit-rule')}
              className="icon-button"
              onClick={() => onEdit(rule)}
              type="button"
            >
              <MdEdit />
            </button>
          )}
          {onDelete && (
            <button
              aria-label={t('notifications.actions.delete-rule')}
              className="icon-button notification-delete-button"
              disabled={deleting}
              onClick={() => onDelete(rule)}
              type="button"
            >
              <MdDelete />
            </button>
          )}
        </div>
      </div>
      <div className="notification-rule-meta">
        <span>
          <small>{t('notifications.event')}</small>
          <strong>{t(`notifications.events.${rule.event}.label`, { defaultValue: eventLabel })}</strong>
        </span>
        <span>
          <small>{t('notifications.channel')}</small>
          <strong>{channelLabel || t('common.unknown')}</strong>
        </span>
        <span>
          <small>{t('notifications.fiat')}</small>
          <strong>{getNotificationFiatCurrencyLabel(settings.fiatCurrency || 'usd')}</strong>
        </span>
      </div>
      <div className="notification-rule-options">
        {notificationEventSupports(rule.event, 'externalUrl') && (
          <span className={settings.externalUrl === false ? 'muted' : ''}>
            {t('notifications.external-links')} {settings.externalUrl === false ? t('common.off') : t('common.on')}
          </span>
        )}
        {notificationEventSupports(rule.event, 'xrpCafeURL') && (
          <span className={settings.xrpCafeURL ? '' : 'muted'}>
            XRP Cafe {settings.xrpCafeURL ? t('common.on') : t('common.off')}
          </span>
        )}
      </div>
      <div className="notification-rule-condition">
        <span>{t('notifications.filters-title')}</span>
        <strong>{conditionText || t('notifications.every-matching-event')}</strong>
      </div>
    </Card>
  )
}
