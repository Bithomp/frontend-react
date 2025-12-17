import { NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

// Locales removed from support
const removedLocales = ['ca', 'da', 'nn', 'my', 'hr']

// Currently supported locales
const currentLocales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr']

// All known locales
const allLocales = [...currentLocales, ...removedLocales]

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

  if (cleanPath === '/' || cleanPath === '') {
    return `/${locale}`
  }

  return normalizeSlashes(`/${locale}${cleanPath}`)
}

const isKnownSeoOrPreviewBot = (ua) =>
  /(googlebot|google-inspectiontool|adsbot-google|mediapartners-google|bingbot|msnbot|duckduckbot|yandexbot|yandeximages|baiduspider|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot)/i.test(
    ua
  )

const isClearlyBadClient = (ua) =>
  !ua ||
  ua.length < 8 ||
  /(curl|wget|python|httpclient|axios|node|go-http-client|java|libwww-perl|scrapy|selenium|playwright|puppeteer)/i.test(
    ua
  )

export async function middleware(req) {
  if (
    req.nextUrl.pathname === '/favicon.ico' ||
    req.nextUrl.pathname === '/robots.txt' ||
    req.nextUrl.pathname === '/sitemap.xml' ||
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api/') ||
    PUBLIC_FILE.test(req.nextUrl.pathname) ||
    req.nextUrl.pathname.includes('/manifest.json')
  ) {
    return NextResponse.next()
  }

  const ua = req.headers.get('user-agent') || ''

  // ✅ allow known SEO & social preview bots
  if (isKnownSeoOrPreviewBot(ua)) {
    return NextResponse.next()
  }

  // 🚫 block obvious junk clients
  if (isClearlyBadClient(ua)) {
    return new NextResponse('403 Forbidden', { status: 403 })
  }

  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  const reactLocale = req.nextUrl.locale

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
  if (req.nextUrl.pathname.startsWith('/paperwallet')) {
    return NextResponse.redirect(new URL('https://bithomp.github.io/xrp-paper-wallet/'))
  }

  // Redirect links that use removed locales
  for (const locale of removedLocales) {
    if (req.nextUrl.pathname.startsWith(`/${locale}/`)) {
      const url = req.nextUrl.clone()
      url.pathname = applyLocale(req.nextUrl.pathname, viewLocale)
      url.locale = viewLocale // IMPORTANT: keep URL locale in sync
      return NextResponse.redirect(url)
    }

    if (req.nextUrl.pathname === `/${locale}` && locale !== viewLocale) {
      const url = req.nextUrl.clone()
      url.pathname = applyLocale(req.nextUrl.pathname, viewLocale)
      url.locale = viewLocale // IMPORTANT: keep URL locale in sync
      return NextResponse.redirect(url)
    }
  }

  // Normalize locale according to cookie / detected locale
  if (reactLocale !== viewLocale) {
    const url = req.nextUrl.clone()

    // Respect cookie locale but strip any old locale from the path
    url.pathname = applyLocale(url.pathname, viewLocale)

    // This is the key line: make Next.js stop prefixing with the old locale
    url.locale = viewLocale

    if (url.searchParams.has('id')) {
      url.searchParams.delete('id')
    }

    return NextResponse.redirect(url)
  }

  // Normalize double slashes even when no locale change is needed
  const normalizedPath = normalizeSlashes(req.nextUrl.pathname)
  if (normalizedPath !== req.nextUrl.pathname) {
    const url = req.nextUrl.clone()
    url.pathname = normalizedPath
    // Keep locale as-is here
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
