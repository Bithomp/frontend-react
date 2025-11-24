import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../../components/SEO'
import AMMDepositForm from '../../../components/Services/Amm/AMMDeposit'
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
      <SEO title="Deposits assets into an AMM Pool" description="Add liquidity to an Automated Market Maker Pool" />
      <div className="page-services-amm content-center">
        <h1 className="center">Deposit assets into an AMM Pool</h1>
        <AmmTabs tab="deposit" />
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
