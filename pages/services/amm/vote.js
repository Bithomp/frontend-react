import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../../components/SEO'
import AMMVoteForm from '../../../components/Services/Amm/AMMVote'
import { getIsSsrMobile } from '../../../utils/mobile'
import AmmTabs from '../../../components/Tabs/AmmTabs'

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
      ...(await serverSideTranslations(locale, ['common']))
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
  return (
    <>
      <SEO title="Vote for a fee on an AMM Pool" description="Vote for a fee on an Automated Market Maker Pool" />
      <div className="page-services-amm content-center">
        <h1 className="center">Vote for a fee for an AMM Pool</h1>
        <AmmTabs tab="vote" />
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
