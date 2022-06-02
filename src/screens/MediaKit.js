import { useTranslation } from 'react-i18next';

export default function MediaKit() {
  const { t } = useTranslation();
  
  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.media-kit")}</h1>
      <div className="bordered brake" style={{ padding: "0 20px", position: "relative" }}>
        <p>Download our logo for press.</p>
      </div>
    </div>
  );
};
