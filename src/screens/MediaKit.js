import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ReactComponent as Logo } from "../assets/images/logo.svg";

export default function MediaKit() {
  const { t } = useTranslation();

  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.media-kit")}</h1>
      <Logo />
      <p>
        <Trans i18nKey="mediakit">
          This is the official logo for Bithomp to use by media and press professionals for print and web (svg, png, eps, pdf, for dark and light backgrounds).
          For media inquiries, please <Link to="/customer-support">contact us</Link>.
        </Trans>
      </p>
      <p className="center">
        <a
          className="button-action"
          href={process.env.PUBLIC_URL + '/download/bithomp-mediakit.zip'}
        >
          {t("button.download")}
        </a>
      </p>
    </div>
  );
};
