module.exports = {
  i18n: {
    locales: ['en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'hr'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development'
}
