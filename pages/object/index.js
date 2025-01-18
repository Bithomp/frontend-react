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
  return <div className="content-center short-top">{children}</div>
}

const ObjectSearch = () => {
  return (
    <>
      <SEO page="Object details" description="Object search" />
      <SearchBlock tab="object" searchPlaceholderText="Search Object by LedgerEntry" />
      <Container>
        <h1 className="center">Object search</h1>
        <p className="center">Search objects on the Ledger.</p>
      </Container>
    </>
  )
}

export default ObjectSearch
