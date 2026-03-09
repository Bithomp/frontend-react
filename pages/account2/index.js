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

export default function AccountIndex() {
  const { t } = useTranslation()

  return (
    <>
      <SEO
        page="Account"
        title={t('explorer.header.account')}
        description="Account details, transactions, NFTs, Tokens for XRP Ledger accounts"
      />
      <div className="content-profile account">
        <h1 className="center">{t('explorer.header.account')}</h1>
        <p className="center">
          Here you will be able to see all the information about the account, including the transactions, tokens, NFTs,
          and more.
        </p>
        <br />
        <SearchBlock searchPlaceholderText={t('explorer.enter-address')} tab="account" type="explorer" />
      </div>
    </>
  )
}
