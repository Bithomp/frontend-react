import axios from 'axios'

const NOTIFICATION_PATH = '/client/ntf'
const MAX_MESSAGE_LENGTH = 3500

export const knownClientErrorMessages = [
  'String.prototype.search called on null or undefined',
  "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
  'Node.removeChild: The node to be removed is not a child of this node',
  "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
  "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
  'The operation is insecure.',
  'The object can not be found here.',
  "null is not an object (evaluating 'localStorage.getItem')",
  "Cannot read properties of null (reading 'getItem')",
  "Cannot read properties of null (reading 'createImageData')",
  'Cannot convert undefined or null to object',
  "Failed to execute 'createScriptURL' on 'TrustedTypePolicy': The provided callback is no longer runnable.",
  `can't access property "resetSeries", this.series is null`
]

const trimMessage = (value, maxLength = MAX_MESSAGE_LENGTH) => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized
}

const getOriginFromRequest = (req) => {
  const host = req?.headers?.host
  if (!host) return process.env.NEXT_PUBLIC_WEB_ADDRESS || ''

  const forwardedProto = req?.headers?.['x-forwarded-proto']
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : String(forwardedProto || '').split(',')[0] || (req?.socket?.encrypted ? 'https' : 'http')

  return `${protocol}://${host}`
}

const getRequestUrl = (req) => {
  const origin = getOriginFromRequest(req)
  const requestUrl = req?.url || ''
  if (!origin) return requestUrl
  return requestUrl.startsWith('http') ? requestUrl : `${origin}${requestUrl}`
}

const getNotificationUrl = (req) => {
  if (typeof window !== 'undefined') return NOTIFICATION_PATH

  const origin = getOriginFromRequest(req)
  if (!origin) return ''
  return `${origin}${NOTIFICATION_PATH}`
}

const buildErrorText = ({ source, error, extra }) => {
  const message = typeof error === 'string' ? error : error?.message || 'Unknown error'
  const tags = []

  if (source) tags.push(source)
  if (extra?.statusCode) tags.push(`status:${extra.statusCode}`)

  const lines = [`${tags.length ? `[${tags.join(' ')}] ` : ''}${message}`]

  if (extra?.path) lines.push(`path: ${extra.path}`)
  if (extra?.method) lines.push(`method: ${extra.method}`)
  if (extra?.componentStack) lines.push(`componentStack: ${extra.componentStack}`)

  const stack = typeof error === 'object' ? error?.stack : ''
  if (stack && source !== 'frontend') {
    lines.push(stack.split('\n').slice(0, 8).join('\n'))
  }

  return trimMessage(lines.filter(Boolean).join('\n'))
}

export const reportErrorNotification = async ({
  source,
  error,
  req,
  url,
  userAgent,
  extra,
  ignoreKnownClientErrors = false
}) => {
  if (process.env.NODE_ENV === 'development') return

  const message = typeof error === 'string' ? error : error?.message || ''
  if (ignoreKnownClientErrors && knownClientErrorMessages.includes(message)) return

  const targetUrl = getNotificationUrl(req)
  if (!targetUrl) return

  try {
    await axios.post(
      targetUrl,
      {
        message: buildErrorText({ source, error, extra }),
        url: url || getRequestUrl(req) || extra?.path || '',
        userAgent: userAgent || req?.headers?.['user-agent'] || ''
      },
      {
        timeout: 5000
      }
    )
  } catch {
    // Ignore notification failures so they never mask the original error.
  }
}

