import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Faucet from '../components/Home/Faucet'

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
  if (!devNet) {
    return (
      <>
        <SEO title={ledgerName + ' Faucet'} description={'Get Free ' + ledgerName + ' ' + nativeCurrency} />
        <div className="content-text content-center">
          <h1 className="center">{ledgerName} Faucet</h1>
          <p>
            <center>We do not have a faucet on the Mainnet 😅</center>
          </p>
          Here are our Faucets:
          <ul>
            <li>
              <a href="https://test.xrplexplorer.com/faucet" target="_blank" rel="noreferrer">
                XRPL Testnet
              </a>
            </li>
            <li>
              <a href="https://dev.xrplexplorer.com/faucet" target="_blank" rel="noreferrer">
                XRPL Devnet
              </a>
            </li>
            <li>
              <a href="https://test.xahauexplorer.com/faucet" target="_blank" rel="noreferrer">
                Xahau Testnet
              </a>
            </li>
          </ul>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title={ledgerName + ' Faucet'} description={'Get Free ' + ledgerName + ' ' + nativeCurrency} />
      <div className="content-text content-center">
        <h1 className="center">Faucet</h1>
        <FaucetTabs />
        <Faucet account={account} />
      </div>
    </>
  )
}
