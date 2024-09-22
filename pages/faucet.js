import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Faucet from '../components/Faucet'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { devNet, ledgerName, nativeCurrency } from '../utils'
import FaucetTabs from '../components/Tabs/FaucetTabs'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'faucet']))
    }
  }
}

export default function FaucetPage({ account }) {
  return (
    <>
      <SEO title="Faucet" description={'Get Free ' + ledgerName + ' ' + nativeCurrency} />
      <div className="content-text content-center">
        {devNet && <h1 className="center">Faucet</h1>}
        <FaucetTabs />
        <Faucet account={account} type={devNet ? 'faucet' : 'testPayment'} />
      </div>
    </>
  )
}
