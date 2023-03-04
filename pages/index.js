import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import SEO from '../components/SEO'

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Home() {
  const { t } = useTranslation()

  return (
    <>
      <SEO
        title="XRP Explorer | Scan the XRPL network."
        description="Explore XRP Ledger, check transactions for statuses, addresses for balances, NFTs, offers, tokens, escrows and checks."
      />
    </>
  )
}