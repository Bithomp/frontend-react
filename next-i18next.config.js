const { rootLocale } = require('./utils/locales')

module.exports = {
  i18n: {
    locales: ['default', 'en', 'ko', 'ru', 'de', 'es', 'id', 'ja', 'fr', 'zh'],
    defaultLocale: 'default',
    localeDetection: false
  },
  fallbackLng: rootLocale,
  reloadOnPrerender: process.env.NODE_ENV === 'development'
}
