import { useTranslation } from 'next-i18next'
import { useState, useEffect } from "react"

import moment from "moment"
import 'moment/locale/ru' // 'ru'
import 'moment/locale/ko' // 'ko'
import 'moment/locale/de' // 'de'
import 'moment/locale/es' // 'es'
import 'moment/locale/id' // 'id'
import 'moment/locale/ja' // 'ja'
import 'moment/locale/ca' // 'ca'
import 'moment/locale/hr' // 'hr'
import 'moment/locale/da' // 'da'
import 'moment/locale/nn' // 'nn'
import 'moment/locale/my' // 'my'

import { useRouter } from 'next/router'
import Cookies from 'universal-cookie'

const cookies = new Cookies()

export default function LanguageSwitch({ langSwitchOpen, setLangSwitchOpen, setCurrencySwitchOpen }) {
  const { i18n } = useTranslation()
  const router = useRouter()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  if (!rendered) return null

  const { pathname, asPath, query } = router

  const handleLangChange = lang => {
    if (i18n.language !== lang) {
      moment.locale(lang)
      cookies.set('NEXT_LOCALE', lang, { path: '/' })
      router.push({ pathname, query }, asPath, { locale: lang })
    }
    setLangSwitchOpen(false)
  }

  moment.locale(i18n.language)
  cookies.set('NEXT_LOCALE', i18n.language, { path: '/' })

  const spanClass = (lang) => {
    return i18n.language === lang.value ? "link blue" : "link"
  }

  const td = (langList, i, columnsNumber) => {
    let cols = []
    for (let j = 0; j < columnsNumber; j++) {
      cols.push(
        <td key={j}>
          <span className={spanClass(langList[columnsNumber * i + j])} onClick={() => handleLangChange(langList[columnsNumber * i + j].value)}>
            {langList[columnsNumber * i + j].label}
          </span>
        </td>
      )
    }
    return cols
  }

  //first collumn would become the most popular except the indonesian
  const langList = [
    { value: 'en', label: 'English' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'ko', label: '한국어' },
    { value: 'ca', label: 'Català' },
    { value: 'ru', label: 'Русский' },
    { value: 'hr', label: 'Hrvatski' },
    { value: 'de', label: 'Deutsch' },
    { value: 'da', label: 'Dansk' },
    { value: 'es', label: 'Español' },
    { value: 'nn', label: 'Norsk' },
    { value: 'ja', label: '日本語' },
    { value: 'my', label: 'Bahasa Melayu' }
  ]

  const langTable = () => {
    const columnsNumber = 2
    const lines = Math.ceil(langList.length / columnsNumber)
    let rows = []
    for (let i = 0; i < lines; i++) {
      rows.push(
        <tr key={i}>{td(langList, i, columnsNumber)}</tr>
      )
    }
    return <table>
      <tbody>
        {rows}
      </tbody>
    </table>
  }

  const switchOnClick = () => {
    setLangSwitchOpen(!langSwitchOpen)
    setCurrencySwitchOpen(false)
  }

  return (
    <div className="top-switch">
      <div className="menu-dropdown">
        <div className="switch-container menu-dropdown-button contrast" onClick={switchOnClick}>
          {i18n?.language?.toUpperCase()}
        </div>
        {langSwitchOpen &&
          <div className="menu-dropdown-content">
            {langTable()}
          </div>
        }
      </div>
    </div>
  )
}
