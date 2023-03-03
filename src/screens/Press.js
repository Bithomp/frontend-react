import { Trans, useTranslation } from 'react-i18next';
import Link from 'next/link'

import press from '../assets/images/press.png';

export default function Press() {
  const { t } = useTranslation();

  return (
    <div className="content-text content-center">
      <h1 className="center">{t("menu.press")}</h1>
      <img src={press} alt="press" style={{ "width": "100%" }} />
      <p>
        <Trans i18nKey="press">
          This is the official logo for Bithomp to use by media and press professionals for print and web (svg, png, eps, pdf, for dark and light backgrounds).
          For media inquiries, please <Link href="/customer-support">contact us</Link>.
        </Trans>
      </p>
      <p className="center">
        <a
          className="button-action"
          href={process.env.PUBLIC_URL + '/download/bithomp-press.zip'}
        >
          {t("button.download")}
        </a>
      </p>
    </div>
  );
};
