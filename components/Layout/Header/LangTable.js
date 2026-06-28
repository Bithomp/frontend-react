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
import { cookieParams, loadLocaleResources, localePath, normalizeLocale } from '../../../utils'

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

  const { asPath } = router

  const langChange = (lang) => {
    if (lang === 'default' || lang === 'undefined' || !lang) return
    dayjs.locale(lang)
    cookies.set('NEXT_LOCALE', lang, cookieParams)
  }

  const handleLangChange = async (lang) => {
    const currentLang = normalizeLocale(i18n.language)?.slice(0, 2)
    if (currentLang !== lang) {
      langChange(lang)
      await loadLocaleResources(i18n, lang)
      await i18n.changeLanguage(lang)
      const nextAsPath = replaceLangQuery(asPath, lang)
      const localizedPath = localePath(nextAsPath, lang)
      if (localizedPath !== asPath) {
        router.replace(localizedPath, localizedPath, { locale: false })
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
