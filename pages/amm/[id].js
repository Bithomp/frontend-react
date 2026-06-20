import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import AmmDetailsPage, { fetchAmmPageData } from '../../components/Amm/AmmDetailsPage'
import { getIsSsrMobile } from '../../utils/mobile'
import { getFiatRateServer } from '../../utils/axios'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id, ledgerTimestamp } = query
  const { fiatRateServer, selectedCurrencyServer } = await getFiatRateServer(req)
  const ammPageData = await fetchAmmPageData({
    id,
    req,
    ledgerTimestamp: null,
    selectedCurrencyServer
  })

  return {
    props: {
      id,
      ledgerTimestampQuery: Date.parse(ledgerTimestamp) || '',
      isSsrMobile: getIsSsrMobile(context),
      fiatRateServer,
      selectedCurrencyServer,
      ...ammPageData,
      ...(await serverSideTranslations(locale, ['common', 'token', 'services', 'amm']))
    }
  }
}

export default AmmDetailsPage
