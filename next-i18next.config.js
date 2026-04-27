module.exports = {
  i18n: {
    locales: ['default', 'en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr'],
    defaultLocale: 'default',
    localeDetection: false
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development'
}
