import { MdDelete, MdEdit, MdHistory } from 'react-icons/md'

import Card from '@/components/UI/Card'

const operatorMap = {
  $eq: 'is',
  $ne: 'is not',
  $gt: '>',
  $gte: '>=',
  $lt: '<',
  $lte: '<=',
  $in: 'in',
  $nin: 'not in'
}

function formatCondition(field, opObj) {
  if (typeof opObj !== 'object' || opObj === null) return ''
  return Object.entries(opObj)
    .map(([op, value]) => {
      const opStr = operatorMap[op] || op
      const valStr = Array.isArray(value) ? `[${value.join(', ')}]` : String(value)
      return `${field} ${opStr} ${valStr}`
    })
    .join(' and ')
}

function parseConditions(conditions) {
  if (!conditions || typeof conditions !== 'object') return ''
  const parts = []

  for (const [key, value] of Object.entries(conditions)) {
    if (key === '$or' && Array.isArray(value)) {
      const orParts = value.map((sub) => parseConditions(sub)).filter(Boolean)
      if (orParts.length) {
        parts.push(`(${orParts.join(' OR ')})`)
      }
    } else if (typeof value === 'object' && value !== null) {
      parts.push(formatCondition(key, value))
    }
  }

  return parts.filter(Boolean).join(' AND ')
}

export default function RuleCard({ deleting, loadingExecutions, onDelete, onEdit, onExecutions, rule }) {
  return (
    <Card className="notification-card">
      <div className="notification-card-header">
        <div className="notification-rule-title">{rule.name || `Rule #${rule.id}`}</div>
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
          Event: <strong>{rule.event || 'N/A'}</strong>
        </span>
        <span>
          Send to: <strong>{rule.channel?.name || rule.channel?.type || 'Unknown'}</strong>
        </span>
      </div>
      <div className="notification-rule-condition">
        If: <strong>{parseConditions(rule.settings?.rules) || 'N/A'}</strong>
      </div>
    </Card>
  )
}
