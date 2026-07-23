import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { normalizeLocale, stripLeadingLocale } from '../utils'
import { getArticleDates } from '../utils/articleDates'
import styles from '../styles/components/article-meta.module.scss'

const formatDate = (value, locale) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))

export default function ArticleMeta() {
  const router = useRouter()
  const { t } = useTranslation('common')
  const path = stripLeadingLocale((router.asPath || '').split('#')[0].split('?')[0])
  const dates = getArticleDates(path)

  if (!dates) return null

  const locale = normalizeLocale(router.locale)

  return (
    <p className={styles.meta}>
      <span>
        {t('article.published')}:{' '}
        <time dateTime={dates.datePublished}>{formatDate(dates.datePublished, locale)}</time>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {t('article.updated')}: <time dateTime={dates.dateModified}>{formatDate(dates.dateModified, locale)}</time>
      </span>
    </p>
  )
}
