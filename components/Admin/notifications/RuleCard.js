import { Fragment } from 'react'
import { MdDelete, MdEdit, MdHistory } from 'react-icons/md'

import Card from '@/components/UI/Card'
import { LinkAccount } from '@/utils/links'
import { isAddressValid } from '@/utils'
import {
  getNotificationEventLabel,
  getNotificationFiatCurrencyLabel,
  notificationEventSupports
} from '@/utils/notificationRules'

const operatorMap = {
  $eq: 'is',
  $ne: 'is not',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'in',
  $nin: 'not in',
  $exists: 'exists'
}

const addressConditionFields = new Set(['account', 'address', 'currency_issuer', 'destination', 'issuer'])

const fieldLabelMap = {
  price_usd: 'price USD',
  tx_type: 'transaction type'
}

const fieldLabel = (field) => fieldLabelMap[field] || field.replace(/[._]/g, ' ')

const isRuleEnabled = (enabled) => enabled !== false && enabled !== 0 && enabled !== '0' && enabled !== 'false'

function renderConditionValue(field, value) {
  if (value === null) return 'none'

  if (Array.isArray(value)) {
    return (
      <span className="notification-rule-value-list">
        {value.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
    )
  }

  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no'
  }

  if (addressConditionFields.has(field) && typeof value === 'string' && isAddressValid(value)) {
    return <LinkAccount address={value} short={8} />
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

function formatCondition(field, opObj) {
  if (typeof opObj !== 'object' || opObj === null) return null
  const nodes = Object.entries(opObj).map(([op, value]) => (
    <span className="notification-rule-filter-chip" key={`${field}-${op}`}>
      <span>{fieldLabel(field)}</span>
      <em>{operatorMap[op] || op}</em>
      <strong>{renderConditionValue(field, value)}</strong>
    </span>
  ))

  return joinConditionNodes(nodes, 'and')
}

function parseConditions(conditions) {
  if (!conditions || typeof conditions !== 'object') return null
  const parts = []

  for (const [key, value] of Object.entries(conditions)) {
    if (key === '$or' && Array.isArray(value)) {
      const orParts = value.map((sub) => parseConditions(sub)).filter(Boolean)
      if (orParts.length) {
        parts.push(
          <span className="notification-rule-filter-group" key={key}>
            ({joinConditionNodes(orParts, 'OR')})
          </span>
        )
      }
    } else if (typeof value === 'object' && value !== null) {
      const condition = formatCondition(key, value)
      if (condition) {
        parts.push(<Fragment key={key}>{condition}</Fragment>)
      }
    }
  }

  return parts.length ? joinConditionNodes(parts, 'AND') : null
}

export default function RuleCard({ deleting, loadingExecutions, onDelete, onEdit, onExecutions, rule }) {
  const eventLabel = getNotificationEventLabel(rule.event)
  const settings = rule.settings || {}
  const conditionText = parseConditions(settings.rules)
  const enabled = isRuleEnabled(rule.enabled)

  return (
    <Card className="notification-card notification-rule-card">
      <div className="notification-card-header">
        <div>
          <div className="notification-rule-title">{rule.name || `Rule #${rule.id}`}</div>
          <div className={`notification-rule-status ${enabled ? 'enabled' : 'paused'}`}>
            {enabled ? 'Enabled' : 'Paused'}
          </div>
        </div>
        <div className="notification-card-actions">
          {onExecutions && (
            <button
              aria-label="Show notification executions"
              className="icon-button"
              disabled={loadingExecutions}
              onClick={() => onExecutions(rule)}
              type="button"
            >
              <MdHistory />
            </button>
          )}
          {onEdit && (
            <button aria-label="Edit notification rule" className="icon-button" onClick={() => onEdit(rule)} type="button">
              <MdEdit />
            </button>
          )}
          {onDelete && (
            <button
              aria-label="Delete notification rule"
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
          <small>Event</small>
          <strong>{eventLabel}</strong>
        </span>
        <span>
          <small>Channel</small>
          <strong>{rule.channel?.name || rule.channel?.type || 'Unknown'}</strong>
        </span>
        <span>
          <small>Fiat</small>
          <strong>{getNotificationFiatCurrencyLabel(settings.fiatCurrency || 'usd')}</strong>
        </span>
      </div>
      <div className="notification-rule-options">
        {notificationEventSupports(rule.event, 'externalUrl') && (
          <span className={settings.externalUrl === false ? 'muted' : ''}>
            External links {settings.externalUrl === false ? 'off' : 'on'}
          </span>
        )}
        {notificationEventSupports(rule.event, 'xrpCafeURL') && (
          <span className={settings.xrpCafeURL ? '' : 'muted'}>XRP Cafe {settings.xrpCafeURL ? 'on' : 'off'}</span>
        )}
      </div>
      <div className="notification-rule-condition">
        <span>Filters</span>
        <strong>{conditionText || 'Every matching event'}</strong>
      </div>
    </Card>
  )
}
