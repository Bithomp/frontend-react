import { NextResponse } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/

export async function middleware(req) {
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.includes('/api/') ||
    PUBLIC_FILE.test(req.nextUrl.pathname)
  ) {
    return
  }

  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value

  //if someone has an old link with old locale that was removed.
  const removedLocales = ['ca', 'da', 'nn', 'my']
  const currentLocales = ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'hr']

  const reactLocale = req.nextUrl.locale

  //default option
  let viewLocale = 'en'

  if (currentLocales.includes(reactLocale)) {
    // exlude 'default' locale
    viewLocale = reactLocale
  }

  // if the cookie locale is set and is one of the currently supported locales - then it's a priority
  if (cookieLocale && currentLocales.includes(cookieLocale)) {
    viewLocale = cookieLocale
  }

  //if locale is one of the deleted ones
  for (const locale of removedLocales) {
    if (req.nextUrl.pathname.startsWith(`/${locale}/`)) {
      return NextResponse.redirect(
        new URL(`${req.nextUrl.pathname.replace(`/${locale}/`, `/${viewLocale}/`)}${req.nextUrl.search}`, req.url)
      )
    }
    if (req.nextUrl.pathname === `/${locale}`) {
      return NextResponse.redirect(
        new URL(`${req.nextUrl.pathname.replace(`/${locale}`, `/${viewLocale}`)}${req.nextUrl.search}`, req.url)
      )
    }
  }

  //import to have this case: reactLocale === 'default'
  if (reactLocale !== viewLocale) {
    return NextResponse.redirect(
      new URL(`/${viewLocale}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
    )
  }
}