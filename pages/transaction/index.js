import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'

import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(context.locale, ['common']))
    }
  }
}

const Container = ({ children }) => {
  return <>{children}</>
}

const TransactionSearch = () => {
  return (
    <>
      <SEO page="Transaction search" title="Tranasction search" description="Transaction details" />
      <SearchBlock tab="transaction" />
      <Container>
        <h1 className="center">Transaction search</h1>
      </Container>
    </>
  )
}

export default TransactionSearch
