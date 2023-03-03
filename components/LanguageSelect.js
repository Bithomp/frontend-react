import { useTranslation } from 'react-i18next';
import moment from "moment";
import 'moment/locale/ru'; // Add more langauges

export default function LanguageSelect() {
  const { t, i18n } = useTranslation();

  const handleLangChange = e => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    document.documentElement.lang = i18n.language;
    moment.locale(i18n.language);
  };

  document.documentElement.lang = i18n.language;
  moment.locale(i18n.language);

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
    );
  }

  return null;
};
