import { NextResponse } from 'next/server'
import localeConfig from './utils/locales'

const PUBLIC_FILE = /\.(.*)$/

const { allLocales, currentLocales, getRootLocale, normalizeConfigLocale } = localeConfig
const localeCookieOptions = { path: '/', maxAge: 31536000 }
const permanentCleanRedirect = process.env.NODE_ENV !== 'development'
const canonicalRedirects = {
  '/rich-list': '/distribution',
  '/developer': '/admin',
  '/blackholed-address': '/learn/blackholed-address',
  '/blacklisted-address': '/learn/blacklisted-address',
  '/verified-domains': '/learn/verified-domain',
  '/rlusd': '/learn/ripple-usd',
  '/xrp-xah-taxes': '/learn/xrp-xah-taxes',
  '/xrpl-article': '/learn/xrpl-article',
  '/services/amm': '/services/amm/deposit'
}

function normalizeQueryLocale(value) {
  return normalizeConfigLocale(value)
}

// Normalize accidental multiple slashes in path
function normalizeSlashes(path) {
  return path.replace(/\/+/g, '/')
}

// Remove any existing locale from the beginning of the path
function stripLeadingLocale(pathname) {
  const segments = pathname.split('/')
  const maybeLocale = segments[1]

  if (allLocales.includes(maybeLocale)) {
    segments.splice(1, 1)
    let newPath = segments.join('/') || '/'
    newPath = normalizeSlashes(newPath)
    if (!newPath.startsWith('/')) {
      newPath = '/' + newPath
    }
    return newPath
  }

  return normalizeSlashes(pathname)
}

function getLeadingLocale(pathname) {
  const maybeLocale = pathname.split('/')[1]
  return currentLocales.includes(maybeLocale) ? maybeLocale : null
}

function permanentRedirect(url) {
  return NextResponse.redirect(url, 308)
}

function temporaryRedirect(url) {
  return NextResponse.redirect(url, 307)
}

function buildRedirectUrl(req, pathname) {
  const url = new URL(req.url)
  url.pathname = pathname
  return url
}

function finalCanonicalPath(pathname) {
  const normalizedPathname = normalizeSlashes(pathname)
  if (normalizedPathname === '/go') return '/api/go'
  if (normalizedPathname.startsWith('/go/')) return `/api${normalizedPathname}`
  return canonicalRedirects[normalizedPathname] || normalizedPathname
}

function redirectToCleanPath(req, pathname, locale, permanent = true) {
  const url = buildRedirectUrl(req, finalCanonicalPath(pathname))
  const response = permanent ? permanentRedirect(url) : temporaryRedirect(url)

  if (locale && currentLocales.includes(locale)) {
    response.cookies.set('NEXT_LOCALE', locale, localeCookieOptions)
  }

  return response
}

function rewriteToLocale(req, pathname, locale, rootLocale) {
  if (!locale || locale === rootLocale) return NextResponse.next()

  const url = req.nextUrl.clone()
  const cleanPath = stripLeadingLocale(pathname)
  url.pathname = cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath}`
  url.locale = locale

  return NextResponse.rewrite(url)
}

const isKnownSeoOrPreviewBot = (ua) =>
  /(googlebot|google-inspectiontool|adsbot-google|mediapartners-google|bingbot|msnbot|duckduckbot|yandexbot|yandeximages|baiduspider|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot)/i.test(
    ua
  )

const isClearlyBadClient = (ua) =>
  !ua ||
  ua.length < 8 ||
  /headless/i.test(ua) ||
  /(curl|wget|python|httpclient|axios|node|go-http-client|java|libwww-perl|scrapy|selenium|playwright|puppeteer)/i.test(
    ua
  )

export async function middleware(req) {
  const requestUrl = new URL(req.url)
  const rootLocale = getRootLocale(requestUrl.hostname)
  const rawPathname = normalizeSlashes(requestUrl.pathname)

  if (
    rawPathname === '/favicon.ico' ||
    rawPathname === '/robots.txt' ||
    rawPathname === '/sitemap.xml' ||
    rawPathname.startsWith('/_next') ||
    rawPathname.startsWith('/api/') ||
    PUBLIC_FILE.test(rawPathname) ||
    rawPathname.includes('/manifest.json')
  ) {
    return NextResponse.next()
  }

  const ua = req.headers.get('user-agent') || ''

  const canonicalPath = finalCanonicalPath(rawPathname)
  if (canonicalPath !== rawPathname) {
    return redirectToCleanPath(req, canonicalPath, null, true)
  }

  if (rawPathname === '/default' || rawPathname.startsWith('/default/')) {
    return redirectToCleanPath(req, stripLeadingLocale(rawPathname), null, permanentCleanRedirect)
  }

  const pathLocale = getLeadingLocale(rawPathname)
  const hasLocalePrefix = stripLeadingLocale(rawPathname) !== rawPathname

  if (hasLocalePrefix) {
    return redirectToCleanPath(req, stripLeadingLocale(rawPathname), pathLocale, permanentCleanRedirect)
  }

  if (isKnownSeoOrPreviewBot(ua)) return NextResponse.next()

  if (isClearlyBadClient(ua)) {
    return new NextResponse(null, { status: 204 })
  }

  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  const queryLocale = normalizeQueryLocale(requestUrl.searchParams.get('lang'))

  // Default locale
  let viewLocale = rootLocale

  // Query and cookie choose the rendered language, but never the public URL.
  if (queryLocale) {
    viewLocale = queryLocale
  } else if (cookieLocale && currentLocales.includes(cookieLocale)) {
    viewLocale = cookieLocale
  }

  // Redirect legacy paper wallet page to GitHub
  if (rawPathname.startsWith('/paperwallet')) {
    return permanentRedirect(new URL('https://bithomp.github.io/xrp-paper-wallet/'))
  }

  // Normalize double slashes even when no locale change is needed
  const normalizedPath = normalizeSlashes(rawPathname)
  if (normalizedPath !== rawPathname) {
    const url = buildRedirectUrl(req, normalizedPath)
    return permanentRedirect(url)
  }

  return rewriteToLocale(req, rawPathname, viewLocale, rootLocale)
}
