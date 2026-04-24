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

export default function XrpWalletsPage() {
  return (
    <LedgerWalletsPage
      networkName="XRPL"
      pageTitle="Best Ledger Wallets for XRP and XRPL Users"
      pageDescription="Compare current Ledger hardware wallets for XRP and XRPL use. See the main differences between Stax, Flex, Nano Gen5, Nano X and Nano S Plus, then open the official Ledger product pages."
    />
  )
}
