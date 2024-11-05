import { useTranslation } from 'next-i18next'
import { useState, useEffect } from 'react'

import moment from 'moment'
import 'moment/locale/ru' // 'ru'
import 'moment/locale/ko' // 'ko'
import 'moment/locale/de' // 'de'
import 'moment/locale/es' // 'es'
import 'moment/locale/id' // 'id'
import 'moment/locale/ja' // 'ja'
import 'moment/locale/fr' // 'fr'

import { useRouter } from 'next/router'
import Cookies from 'universal-cookie'
import { cookieParams } from '../../../utils'

const cookies = new Cookies()

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
    moment.locale(lang)
    cookies.set('NEXT_LOCALE', lang, cookieParams)
  }

  const handleLangChange = (lang) => {
    if (i18n.language && i18n.language !== 'default' && i18n.language.slice(0, 2) !== lang) {
      langChange(lang)
      router.replace({ pathname, query }, asPath, { locale: lang })
      //hard refresh to avoid the issue when in some cases the language is not saved when user returned from a third party site
      //window.location.replace(`/${lang}${asPath}`)
    }
    close()
  }

  langChange(i18n.language)

  const spanClass = (lang) => {
    return i18n.language === lang?.value ? 'link blue' : 'link'
  }

  const td = (langList, i, columnsNumber) => {
    let cols = []
    for (let j = 0; j < columnsNumber; j++) {
      cols.push(
        <td key={j}>
          <span
            className={spanClass(langList[columnsNumber * i + j])}
            onClick={() => handleLangChange(langList[columnsNumber * i + j].value)}
          >
            {langList[columnsNumber * i + j]?.label}
          </span>
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
    { value: 'id', label: 'Bahasa Indonesia' }
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
