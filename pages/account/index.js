import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
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

export default function Account2Index() {
  const { t } = useTranslation()

  return (
    <>
      <SEO page="Account" title="Account Information" description="Account details" />
      <div className="content-profile account">
        <h1 className="center">{t('explorer.header.account')}</h1>
        <p className="center">View assets, transactions, and orders in an organized interface.</p>
        <br />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" type="explorer" />
      </div>
    </>
  )
}
