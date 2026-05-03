import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../../components/SEO'
import AMMDepositForm from '../../../components/Services/Amm/AMMDeposit'
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
      ...(await serverSideTranslations(locale, ['common', 'services']))
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
      <SEO title={t('amm.deposit-title', { ns: 'services' })} description={t('amm.deposit-description', { ns: 'services' })} />
      <div className="page-services-amm content-center">
        <ServicesTabs category="amm" tab="deposit" />
        <h1 className="center">{t('amm.deposit-title', { ns: 'services' })}</h1>
        <AMMDepositForm
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
