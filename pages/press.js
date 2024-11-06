import { useTranslation, Trans } from 'next-i18next'
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Press() {
  const { t } = useTranslation()

  return (
    <>
      <SEO title={t('menu.press')} />
      <div className="content-text content-center">
        <h1 className="center">{t('menu.press')}</h1>
        <img src="/images/press.png" alt="press" style={{ width: '100%' }} />
        <p>
          <Trans i18nKey="press">
            This is the official logo for Bithomp to use by media and press professionals for print and web (svg, png,
            eps, pdf, for dark and light backgrounds). For media inquiries, please{' '}
            <Link href="/customer-support">contact us</Link>.
          </Trans>
        </p>
        <p className="center">
          <a className="button-action" href="/download/bithomp-press.zip">
            {t('button.download')}
          </a>
        </p>
      </div>
    </>
  )
}
