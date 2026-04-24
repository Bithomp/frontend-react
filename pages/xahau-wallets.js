import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import LedgerWalletsPage from '../components/LedgerWalletsPage'
import { getIsSsrMobile } from '../utils/mobile'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function XahauWalletsPage() {
  return (
    <LedgerWalletsPage
      networkName="Xahau"
      pageTitle="Best Ledger Wallets for Xahau Users"
      pageDescription="A practical Ledger wallet comparison for Xahau users. Review current Ledger devices, compare screens and connectivity, and open the official Ledger store pages."
    />
  )
}
