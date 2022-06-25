import { useTranslation } from 'react-i18next';

export default function Genesis() {
  const { t } = useTranslation();
  
  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.genesis")}</h1>
      <div className="main-box">
        <p>The page is on the maintenance right now. Come back later.</p>
      </div>
    </div>
  );
};
