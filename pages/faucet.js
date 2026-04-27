import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Faucet from '../components/Faucet'

import SEO from '../components/SEO'

import { getIsSsrMobile } from '../utils/mobile'
import { devNet, explorerName, ledgerName, nativeCurrency, network } from '../utils'
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

export default function FaucetPage({ account, showAds, sessionTokenData, countryCode, setSignRequest }) {
  const { t } = useTranslation()
  const isRlusdAvailableNetwork = network === 'testnet'
  const faucetTitle = isRlusdAvailableNetwork ? 'XRP and RLUSD Faucet' : 'Faucet'
  const faucetFreeText = isRlusdAvailableNetwork ? 'XRP and RLUSD' : nativeCurrency
  const faucetSeoTitle = network === 'testnet'
    ? 'XRPL Testnet Faucet — Free Test XRP and RLUSD for Developers'
    : network === 'devnet'
      ? 'XRPL Devnet Faucet — Free Test XRP for Developers'
      : faucetTitle + '. Free ' + faucetFreeText + ' for Developers.'
  const faucetSeoDescription = network === 'testnet'
    ? 'Get free test XRP and RLUSD for XRPL Testnet development. Fund your testnet wallet instantly and test payments, tokens, NFTs, and apps on XRPL Testnet.'
    : network === 'devnet'
      ? 'Get free test XRP for XRPL Devnet development. Fund your devnet wallet instantly and test payments, tokens, NFTs, and apps on XRPL Devnet.'
      : 'Get free ' +
        nativeCurrency +
        ' for development and testing on the ' +
        ledgerName +
        '. Instantly fund your ' +
        explorerName +
        ' wallet with ' +
        nativeCurrency +
        ' using our reliable and fast faucet.'

  return (
    <>
      <SEO
        title={faucetSeoTitle}
        description={faucetSeoDescription}
        descriptionWithNetwork={true}
      />
      <div className="content-text content-center">
        <h1 className="center">
          {explorerName} {isRlusdAvailableNetwork ? faucetTitle : t('menu.developers.faucet')?.toLowerCase()} —{' '}
          {t('faucet:get-free')} {faucetFreeText}
        </h1>
        <NetworkTabs />
        <Faucet
          account={account}
          type={devNet ? 'faucet' : 'testPayment'}
          sessionTokenData={sessionTokenData}
          countryCode={countryCode}
          setSignRequest={setSignRequest}
        />
      </div>
      {showAds && <Ads />}
      <br />
    </>
  )
}
