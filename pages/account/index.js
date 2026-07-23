import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { ledgerName } from '../../utils'
import SEO from '../../components/SEO'
import SearchBlock from '../../components/Layout/SearchBlock'

export async function getServerSideProps(context) {
  const { locale } = context

  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'account']))
    }
  }
}

export default function AccountIndex() {
  const { t } = useTranslation(['common', 'account'])

  return (
    <>
      <SEO
        page="Account"
        title={t('explorer.header.account')}
        description={t('index.seo-description', { ns: 'account', ledgerName })}
        canonicalPath="/account"
        noindex
      />
      <div className="content-profile account">
        <h1 className="center">{t('explorer.header.account')}</h1>
        <p className="center">{t('index.description', { ns: 'account' })}</p>
        <br />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" type="explorer" />
      </div>
    </>
  )
}
