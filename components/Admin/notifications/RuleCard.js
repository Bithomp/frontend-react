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
      let opStr = operatorMap[op] || op
      let valStr = Array.isArray(value) ? `[${value.join(', ')}]` : String(value)
      return `${field} ${opStr} ${valStr}`
    })
    .join(' and ')
}

function parseConditions(conditions) {
  if (!conditions || typeof conditions !== 'object') return ''
  let parts = []

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

export default function RuleCard({ rule }) {
  return (
    <Card>
      <div className="font-bold text-lg mb-2 capitalize">{rule.name || `Rule #${rule.id}`}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex flex-col sm:flex-row sm:items-center">
        <span>
          Event: <span className="font-bold">{rule.event || 'N/A'}</span>
        </span>
        <span className="sm:ml-4">
          Send to: <span className="font-mono font-bold">{rule.channel?.name || rule.channel?.type || 'Unknown'}</span>
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        If: <span className="text-xs font-bold">{parseConditions(rule.settings.rules) || 'N/A'}</span>
      </div>
    </Card>
  )
}
