const currentLocales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr', 'zh']
const removedLocales = ['ca', 'da', 'nn', 'my', 'hr']
const allLocales = ['default', ...currentLocales, ...removedLocales]

const normalizeConfigLocale = (value) => {
  const locale = String(value || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]

  return currentLocales.includes(locale) ? locale : null
}

const hostnameFromAddress = (address) => {
  if (!address) return ''

  try {
    return new URL(address.includes('://') ? address : `https://${address}`).hostname.toLowerCase()
  } catch {
    return ''
  }
}

const localeFromHostname = (hostname) => {
  const normalizedHostname = String(hostname || '').toLowerCase()
  return normalizedHostname === 'bithomp.ru' || normalizedHostname.endsWith('.bithomp.ru') ? 'ru' : null
}

const configuredRootLocale = normalizeConfigLocale(
  process.env.NEXT_PUBLIC_ROOT_LOCALE || process.env.NEXT_PUBLIC_DEFAULT_LOCALE
)

const rootLocale =
  configuredRootLocale || localeFromHostname(hostnameFromAddress(process.env.NEXT_PUBLIC_WEB_ADDRESS)) || 'en'

const getRootLocale = (hostname) => configuredRootLocale || localeFromHostname(hostname) || rootLocale

const normalizeLocale = (locale, fallbackLocale = rootLocale) => {
  if (!locale || locale === 'default' || locale === 'undefined') return fallbackLocale
  return normalizeConfigLocale(locale) || fallbackLocale
}

const stripLeadingLocale = (pathname) => {
  const path = pathname?.startsWith('/') ? pathname : `/${pathname || ''}`
  const localePattern = new RegExp(`^/(${allLocales.join('|')})(?=/|$|[?#])`)
  const strippedPath = path.replace(localePattern, '') || '/'
  return strippedPath.startsWith('/') ? strippedPath : `/${strippedPath}`
}

const localePath = (path = '/') => {
  const rawPath = path?.startsWith('/') ? path : `/${path || ''}`
  return stripLeadingLocale(rawPath)
}

const asArray = (value) => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const getLoadedNamespaces = (i18n) => {
  const namespaces = [
    ...asArray(i18n?.options?.ns),
    ...asArray(i18n?.options?.defaultNS),
    ...(i18n?.reportNamespaces?.getUsedNamespaces?.() || []),
    'common'
  ]

  return [...new Set(namespaces.filter(Boolean))]
}

const loadLocaleResources = async (i18n, locale) => {
  if (!i18n || !currentLocales.includes(locale) || typeof fetch !== 'function') return

  const namespaces = getLoadedNamespaces(i18n)

  await Promise.all(
    namespaces.map(async (namespace) => {
      if (i18n.hasResourceBundle(locale, namespace)) return

      const response = await fetch(`/locales/${locale}/${namespace}.json`, { cache: 'force-cache' })
      if (!response.ok) return

      const bundle = await response.json()
      i18n.addResourceBundle(locale, namespace, bundle, true, true)
    })
  )
}

module.exports = {
  allLocales,
  configuredRootLocale,
  currentLocales,
  getRootLocale,
  localeFromHostname,
  localePath,
  loadLocaleResources,
  normalizeConfigLocale,
  normalizeLocale,
  removedLocales,
  rootLocale,
  stripLeadingLocale
}
