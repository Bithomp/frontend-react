import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'

import dayjs from 'dayjs'
import 'dayjs/locale/ru' // 'ru'
import 'dayjs/locale/ko' // 'ko'
import 'dayjs/locale/de' // 'de'
import 'dayjs/locale/es' // 'es'
import 'dayjs/locale/id' // 'id'
import 'dayjs/locale/ja' // 'ja'
import 'dayjs/locale/fr' // 'fr'
import 'dayjs/locale/zh' // 'zh'

import { useRouter } from 'next/router'
import Cookies from 'universal-cookie'
import { cookieParams, localePath, normalizeLocale } from '../../../utils'

const cookies = new Cookies()

const replaceLangQuery = (path, lang) => {
  if (!/[?&]lang=/.test(path)) return path

  const [pathAndSearch, hash] = path.split('#')
  const [pathname, search = ''] = pathAndSearch.split('?')
  const params = new URLSearchParams(search)
  params.set('lang', lang)

  const nextSearch = params.toString()
  return pathname + (nextSearch ? '?' + nextSearch : '') + (hash ? '#' + hash : '')
}

export default function LanguageSwitch({ close }) {
  const { i18n } = useTranslation()
  const router = useRouter()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  if (!rendered) return null

  const { pathname, asPath, query } = router

  const langChange = (lang) => {
    if (lang === 'default' || lang === 'undefined' || !lang) return
    dayjs.locale(lang)
    cookies.set('NEXT_LOCALE', lang, cookieParams)
  }

  const handleLangChange = (lang) => {
    const currentLang = normalizeLocale(i18n.language)?.slice(0, 2)
    if (currentLang !== lang) {
      langChange(lang)
      const nextAsPath = replaceLangQuery(asPath, lang)
      const nextQuery = query?.lang ? { ...query, lang } : query

      if (lang === 'en') {
        const englishPath = localePath(nextAsPath, 'en')
        router.replace(englishPath, englishPath, { locale: false })
      } else {
        router.replace({ pathname, query: nextQuery }, nextAsPath, { locale: lang })
      }
      //hard refresh to avoid the issue when in some cases the language is not saved when user returned from a third party site
      //window.location.replace(`/${lang}${asPath}`)
    }
    close()
  }

  const spanClass = (lang) => {
    return normalizeLocale(i18n.language) === lang?.value ? 'link blue' : 'link'
  }

  const td = (langList, i, columnsNumber) => {
    let cols = []
    for (let j = 0; j < columnsNumber; j++) {
      const lang = langList[columnsNumber * i + j]
      cols.push(
        <td key={j}>
          {lang && (
            <span className={spanClass(lang)} onClick={() => handleLangChange(lang.value)}>
              {lang.label}
            </span>
          )}
        </td>
      )
    }
    return cols
  }

  //first collumn would become the most popular except the indonesian
  const langList = [
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'es', label: 'Español' },
    { value: 'ru', label: 'Русский' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'zh', label: '简体中文' }
  ]

  const langTable = () => {
    const columnsNumber = 2
    const lines = Math.ceil(langList.length / columnsNumber)
    let rows = []
    for (let i = 0; i < lines; i++) {
      rows.push(<tr key={i}>{td(langList, i, columnsNumber)}</tr>)
    }
    return (
      <table>
        <tbody>{rows}</tbody>
      </table>
    )
  }

  return langTable()
}
