import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Faucet from '../components/Faucet'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { devNet, ledgerName, nativeCurrency } from '../utils'
import NetworkTabs from '../components/Tabs/NetworkTabs'
import Ads from '../components/Layout/Ads'
import { useTranslation } from 'next-i18next'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'faucet']))
    }
  }
}

export default function FaucetPage({ account, showAds }) {
  const { t } = useTranslation()

  return (
    <>
      <SEO title="Faucet" description={'Get Free ' + ledgerName + ' ' + nativeCurrency} />
      <div className="content-text content-center">
        <h1 className="center">{t('menu.developers.faucet')}</h1>
        <NetworkTabs />
        <Faucet account={account} type={devNet ? 'faucet' : 'testPayment'} />
      </div>
      <Ads showAds={showAds} />
      <br />
    </>
  )
}
