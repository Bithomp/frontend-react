import { useTranslation, Trans } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Link from 'next/link'
import { getIsSsrMobile } from '../utils/mobile'

import SEO from '../components/SEO'

export async function getStaticProps({ locale }) {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default function Eror404() {
  const { t } = useTranslation()

  return (
    <>
      <SEO title={t("page-not-found.header")} />
      <div className="content-text center">
        <h1>{t("page-not-found.header")}</h1>
        <p>
          <Trans i18nKey="page-not-found.text">
            Click <Link href="/" className="bold">here</Link> to check our landing page.
          </Trans>
        </p>
      </div>
    </>
  )
}
