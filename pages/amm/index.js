import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'
import { useWidth } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(context.locale, ['common', 'amm']))
    }
  }
}

const Container = ({ children }) => {
  return <div className="content-center short-top">{children}</div>
}

const AmmSearch = () => {
  const { t } = useTranslation('amm')
  const width = useWidth()
  return (
    <>
      <SEO
        page={t('search.pageTitle')}
        title={t('search.pageTitle')}
        description={t('search.metaDescription')}
      />
      <Container>
        <h1 className="center">{t('search.heading')}</h1>
        <p className="center">
          {t('search.intro')}
        </p>
        <br />
        <SearchBlock
          tab="amm"
          type="explorer"
          searchPlaceholderText={width > 600 ? t('search.placeholderLong') : t('search.placeholderShort')}
        />
      </Container>
    </>
  )
}

export default AmmSearch
