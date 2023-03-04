import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Eror404() {
  const { t } = useTranslation();
  return (
    <div className="content-text center">
      <h1>{t("page-not-found.header")}</h1>
      <p>
        <Trans i18nKey="page-not-found.text">
          Click <a href="/" className="bold">here</a> to check our landing page.
        </Trans>
      </p>
    </div>
  );
};
