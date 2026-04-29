import { NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

// Locales removed from support
const removedLocales = ['ca', 'da', 'nn', 'my', 'hr']

// Currently supported locales
const currentLocales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr']

// All known locales
const allLocales = ['default', ...currentLocales, ...removedLocales]

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

// Apply the desired locale to the cleaned path
function applyLocale(pathname, locale) {
  const cleanPath = stripLeadingLocale(pathname)

  if (locale === 'en') {
    return cleanPath === '' ? '/' : cleanPath
  }

  if (cleanPath === '/' || cleanPath === '') {
    return `/${locale}`
  }

  return normalizeSlashes(`/${locale}${cleanPath}`)
}

function permanentRedirect(url) {
  return NextResponse.redirect(url, 308)
}

function buildRedirectUrl(req, pathname) {
  const url = new URL(req.url)
  url.pathname = pathname
  return url
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
  const rawPathname = normalizeSlashes(new URL(req.url).pathname)

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

  if (rawPathname === '/default' || rawPathname.startsWith('/default/')) {
    const url = buildRedirectUrl(req, stripLeadingLocale(rawPathname))
    return permanentRedirect(url)
  }

  if (rawPathname === '/en' || rawPathname.startsWith('/en/')) {
    const url = buildRedirectUrl(req, stripLeadingLocale(rawPathname))
    return permanentRedirect(url)
  }

  if (isKnownSeoOrPreviewBot(ua)) return NextResponse.next()

  if (isClearlyBadClient(ua)) {
    return new NextResponse(null, { status: 204 })
  }

  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  const reactLocale = req.nextUrl.locale
  const normalizedReactLocale = !reactLocale || reactLocale === 'default' ? 'en' : reactLocale

  // Default locale
  let viewLocale = 'en'

  // Cookie locale has the highest priority
  if (cookieLocale && currentLocales.includes(cookieLocale)) {
    viewLocale = cookieLocale
  } else if (currentLocales.includes(reactLocale)) {
    // Fallback to Next.js detected locale (excluding 'default')
    viewLocale = reactLocale
  }

  // Redirect legacy paper wallet page to GitHub
  if (rawPathname.startsWith('/paperwallet')) {
    return permanentRedirect(new URL('https://bithomp.github.io/xrp-paper-wallet/'))
  }

  // Redirect links that use removed locales
  for (const locale of removedLocales) {
    if (rawPathname.startsWith(`/${locale}/`)) {
      const url = buildRedirectUrl(req, applyLocale(rawPathname, viewLocale))
      return permanentRedirect(url)
    }

    if (rawPathname === `/${locale}` && locale !== viewLocale) {
      const url = buildRedirectUrl(req, applyLocale(rawPathname, viewLocale))
      return permanentRedirect(url)
    }
  }

  // Normalize locale according to cookie / detected locale
  if (normalizedReactLocale !== viewLocale) {
    const url = buildRedirectUrl(req, applyLocale(rawPathname, viewLocale))

    // Respect cookie locale but strip any old locale from the path
    if (url.searchParams.has('id')) {
      url.searchParams.delete('id')
    }

    return permanentRedirect(url)
  }

  // Normalize double slashes even when no locale change is needed
  const normalizedPath = normalizeSlashes(rawPathname)
  if (normalizedPath !== rawPathname) {
    const url = buildRedirectUrl(req, normalizedPath)
    return permanentRedirect(url)
  }

  return NextResponse.next()
}
