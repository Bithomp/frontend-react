import { useTranslation } from 'react-i18next';

export default function MediaKit() {
  const { t } = useTranslation();
  
  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.media-kit")}</h1>
      <div className="main-box">
        <p>Download our press materials.</p>
      </div>
    </div>
  );
};
