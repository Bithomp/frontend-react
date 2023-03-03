import { useTranslation } from 'next-i18next'
import moment from "moment"
import 'moment/locale/ru' // Add more langauges
import { useRouter } from 'next/router'
import Cookies from 'universal-cookie'

const cookies = new Cookies();

export default function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const router = useRouter()
  const { pathname, asPath, query } = router

  const handleLangChange = e => {
    const lang = e.target.value;
    moment.locale(lang);
    cookies.set('NEXT_LOCALE', lang, { path: '/' })
    router.push({ pathname, query }, asPath, { locale: lang })
  };

  moment.locale(i18n.language)
  cookies.set('NEXT_LOCALE', i18n.language, { path: '/' })

  //hide switcher from users whose languages are not supported yet
  if (i18n.language === 'ru') {
    return (
      <div className="language-select">
        {t("settings.language")}:{" "}
        <select onChange={handleLangChange} value={i18n.language}>
          <option value="en">English</option>
          {/* <option value="sv">Svenska</option> */}
          <option value="ru">Русский</option>
        </select>
      </div>
    )
  }

  return null
};
