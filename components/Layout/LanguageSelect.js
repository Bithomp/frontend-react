import { useTranslation } from 'next-i18next'
import moment from "moment"
import 'moment/locale/es' // "es"
import 'moment/locale/ru' // "ru"
import 'moment/locale/ca' // "ca"
import 'moment/locale/hr' // "hr"
import 'moment/locale/da' // "da"
import 'moment/locale/nn' // "nn"
import { useRouter } from 'next/router'
import Cookies from 'universal-cookie'

const cookies = new Cookies()

export default function LanguageSelect() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const { pathname, asPath, query } = router

  const handleLangChange = e => {
    const lang = e.target.value
    if (i18n.language !== lang) {
      moment.locale(lang)
      cookies.set('NEXT_LOCALE', lang, { path: '/' })
      router.push({ pathname, query }, asPath, { locale: lang })
    }
  }

  moment.locale(i18n.language)
  cookies.set('NEXT_LOCALE', i18n.language, { path: '/' })

  return (
    <div className="language-select">
      Language:{" "}
      <select onChange={handleLangChange} value={i18n.language} name="language-select">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="ru">Русский</option>
        <option value="ca">Català</option>
        <option value="hr">Hrvatski</option>
        <option value="da">Dansk</option>
        <option value="nn">Norsk</option>
      </select>
    </div>
  )
}
