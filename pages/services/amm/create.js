import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../../components/SEO'
import AMMCreateForm from '../../../components/Services/Amm/AMMCreate'
import { getIsSsrMobile } from '../../../utils/mobile'
import ServicesTabs from '../../../components/Tabs/ServicesTabs'

export const getServerSideProps = async (context) => {
  const { locale, query } = context
  const { currency, currencyIssuer, currency2, currency2Issuer } = query

  return {
    props: {
      queryCurrency: currency || null,
      queryCurrencyIssuer: currencyIssuer || null,
      queryCurrency2: currency2 || null,
      queryCurrency2Issuer: currency2Issuer || null,
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'services', 'amm']))
    }
  }
}

export default function AMMCreate({
  setSignRequest,
  queryCurrency,
  queryCurrencyIssuer,
  queryCurrency2,
  queryCurrency2Issuer
}) {
  const { t } = useTranslation(['common', 'services'])

  return (
    <>
      <SEO title={t('amm.create-title', { ns: 'services' })} description={t('amm.create-description', { ns: 'services' })} />
      <div className="page-services-amm content-center">
        <ServicesTabs category="amm" tab="create" />
        <h1 className="center">{t('amm.create-heading', { ns: 'services' })}</h1>
        <AMMCreateForm
          setSignRequest={setSignRequest}
          queryCurrency={queryCurrency}
          queryCurrencyIssuer={queryCurrencyIssuer}
          queryCurrency2={queryCurrency2}
          queryCurrency2Issuer={queryCurrency2Issuer}
        />
      </div>
    </>
  )
}
