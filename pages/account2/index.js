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
      <SEO
        page="Account (New Layout)"
        title="Account - New Column Layout"
        description="Account details with collapsible column layout - Ledger accounts"
      />
      <div className="content-profile account">
        <h1 className="center">{t('explorer.header.account')}</h1>
        <p className="center">
          Experience the new collapsible column layout for account information. View your assets, transactions, and
          orders in an organized, customizable interface.
        </p>
        <br />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account2" type="explorer" />
      </div>
    </>
  )
}
