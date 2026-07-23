import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'

import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(context.locale, ['common', 'transaction']))
    }
  }
}

const Container = ({ children }) => {
  return <>{children}</>
}

const TransactionSearch = () => {
  const { t } = useTranslation('transaction')

  return (
    <>
      <SEO
        page={t('seo.searchPage')}
        title={t('seo.searchTitle')}
        description={t('seo.searchDescription')}
        canonicalPath="/tx"
        noindex
      />
      <Container>
        <h1 className="center">{t('search.title')}</h1>
        <SearchBlock tab="transaction" type="explorer" />
      </Container>
    </>
  )
}

export default TransactionSearch
