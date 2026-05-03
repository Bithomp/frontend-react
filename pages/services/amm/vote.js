import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SEO from '../../../components/SEO'
import AMMVoteForm from '../../../components/Services/Amm/AMMVote'
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
      <SEO title={t('amm.vote-title', { ns: 'services' })} description={t('amm.vote-description', { ns: 'services' })} />
      <div className="page-services-amm content-center">
        <ServicesTabs category="amm" tab="vote" />
        <h1 className="center">{t('amm.vote-heading', { ns: 'services' })}</h1>
        <AMMVoteForm
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
