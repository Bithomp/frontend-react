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

  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value || 'en'

  //if someone has an old link with old locale that was removed.
  const removedLocales = ['ca', 'da', 'nn', 'my']

  for (const locale of removedLocales) {
    if (req.nextUrl.pathname.startsWith(`/${locale}/`)) {
      return NextResponse.redirect(
        new URL(`${req.nextUrl.pathname.replace(`/${locale}/`, `/${cookieLocale}/`)}${req.nextUrl.search}`, req.url)
      )
    }
    if (req.nextUrl.pathname === `/${locale}`) {
      return NextResponse.redirect(
        new URL(`${req.nextUrl.pathname.replace(`/${locale}`, `/${cookieLocale}`)}${req.nextUrl.search}`, req.url)
      )
    }
  }

  if (req.nextUrl.locale === 'default') {
    return NextResponse.redirect(
      new URL(`/${cookieLocale}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
    )
  }
}