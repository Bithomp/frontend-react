import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Faucet from '../components/Faucet'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { devNet, explorerName, ledgerName, nativeCurrency } from '../utils'
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
      <SEO
        title={'Faucet. Free ' + nativeCurrency + ' for Developers.'}
        description={
          'Get free ' +
          nativeCurrency +
          ' for development and testing on the ' +
          ledgerName +
          '. Instantly fund your ' +
          explorerName +
          ' wallet with ' +
          nativeCurrency +
          ' using our reliable and fast faucet.'
        }
        descriptionWithNetwork={true}
      />
      <div className="content-text content-center">
        <h1 className="center">
          {explorerName} {t('menu.developers.faucet')?.toLowerCase()} — {t('faucet:get-free')} {nativeCurrency}
        </h1>
        <NetworkTabs />
        <Faucet account={account} type={devNet ? 'faucet' : 'testPayment'} sessionTokenData={sessionTokenData} />
      </div>
      {showAds && <Ads />}
      <br />
    </>
  )
}
