import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Faucet from '../components/Faucet'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { devNet, ledgerName, nativeCurrency } from '../utils'
import NetworkTabs from '../components/Tabs/NetworkTabs'
import Ads from '../components/Layout/Ads'
import { useTranslation } from 'next-i18next'
import { axiosServer, passHeaders } from '../utils/axios'

export async function getServerSideProps(context) {
  const { locale, req } = context

  let sessionTokenData = null

  const res = await axiosServer({
    method: 'get',
    url: devNet ? 'xrpl/faucet' : 'xrpl/testPayment',
    headers: passHeaders(req)
  }).catch(() => {
    console.error('Axios server error: ', devNet ? 'xrpl/faucet' : 'xrpl/testPayment')
  })
  if (res?.data) {
    sessionTokenData = res.data
  }
  /*
    {
      faucetSessionToken: xx,
      faucetSessionTokenExpiredAt: 12
    }
    {
      testPaymentSessionToken: xx,
      testPaymentSessionTokenExpiredAt: 12
    }
  */

  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      sessionTokenData: sessionTokenData || null,
      ...(await serverSideTranslations(locale, ['common', 'faucet']))
    }
  }
}

export default function FaucetPage({ account, showAds, sessionTokenData }) {
  const { t } = useTranslation()

  return (
    <>
      <SEO title="Faucet" description={'Get Free ' + ledgerName + ' ' + nativeCurrency} />
      <div className="content-text content-center">
        <h1 className="center">{t('menu.developers.faucet')}</h1>
        <NetworkTabs />
        <Faucet account={account} type={devNet ? 'faucet' : 'testPayment'} sessionTokenData={sessionTokenData} />
      </div>
      <Ads showAds={showAds} />
      <br />
    </>
  )
}
