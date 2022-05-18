import { useTranslation } from 'react-i18next';

export default function LanguageSelect() {
  const { t, i18n } = useTranslation();

  const handleLangChange = e => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
  };

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
};
