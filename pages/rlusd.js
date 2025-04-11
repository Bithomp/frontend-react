import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { getIsSsrMobile } from '../utils/mobile'
import { network } from '../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function RLUSD() {
  return (
    <>
      <SEO
        title={'RLUSD'}
        description="What is RLUSD, what are RLUSD advantages and use cases"
        noindex={network !== 'mainnet'}
        image={{ file: 'images/pages/rlusd/rocket.png', width: 'auto', height: 'auto', allNetworks: true }}
      />
      <div className="content-center">
        <center>
          <img
            src="/images/pages/rlusd/rocket.png"
            alt="RLUSD"
            style={{ width: '100%', height: 'auto', maxHeight: 500 }}
          />
        </center>
        <h1>What is Ripple USD (RLUSD)?</h1>
        <p>
          <em>April 11, 2025</em>
        </p>
        <p>
          Ripple USD (RLUSD) is a stablecoin designed to bring speed, reliability, and dollar-backed stability to global
          payments. Issued by Ripple in 2024, RLUSD is built for real-world utility — from remittances and trading to
          financial settlement — all powered by fast and cost-effective blockchain infrastructure.
        </p>
        <h3>RLUSD: A New Stablecoin Backed by Ripple</h3>
        <p>
          RLUSD is a USD-pegged stablecoin currently issued on two major blockchain platforms: the XRP Ledger (XRPL) and
          Ethereum. It is backed 1:1 with US dollars ensuring both transparency and financial stability.
        </p>
        <p>
          The coin is issued and managed by Ripple, a company long known for building payment solutions and
          infrastructure for the financial sector.
        </p>
        <h3>Why RLUSD?</h3>
        <p>
          Built for Speed and Stability. As a stablecoin built on the XRP Ledger, RLUSD inherits some powerful features:
        </p>
        <ul>
          <li>
            <p>
              <strong>Instant Settlement:</strong> XRP Ledger enables near real-time transaction confirmation, making
              RLUSD ideal for time-sensitive use cases.
            </p>
          </li>
          <li>
            <p>
              <strong>Low Fees:</strong> Transaction costs on XRPL are a fraction of a cent — perfect for cross-border
              remittances, microtransactions, and high-frequency trading.
            </p>
          </li>
          <li>
            <p>
              <strong>Multi-Chain Flexibility:</strong> RLUSD is currently issued on both the XRPL and Ethereum,
              offering interoperability and diverse use cases across these platforms, with potential expansion to
              additional blockchains in the future.
            </p>
          </li>
          <li>
            <p>
              <strong>Deep Liquidity:</strong> Backed by Ripple’s reserves, RLUSD is designed to be a liquid and
              reliable asset for users and institutions alike.
            </p>
          </li>
        </ul>
        <h3>Use Cases for RLUSD</h3>
        <p>RLUSD has a variety of potential applications across both traditional and decentralized ecosystems:</p>
        <ul>
          <li>
            <p>
              <strong>Cross-border Remittances:</strong> Individuals and businesses can use RLUSD to bypass delays and
              costs associated with legacy payment systems.
            </p>
          </li>
          <li>
            <p>
              <strong>Crypto Trading & Settlement:</strong> RLUSD provides a dollar-equivalent store of value without
              exposure to crypto volatility, ideal for trading pairs and settlement.
            </p>
          </li>
          <li>
            <p>
              <strong>Micropayments:</strong> With its low fees and instant confirmation, RLUSD opens new doors for
              digital payments, content monetization, and IoT integrations.
            </p>
          </li>
          <li>
            <p>
              <strong>Future DeFi Potential: </strong> RLUSD’s Ethereum issuance may unlock smart contract-based use
              cases in DeFi, lending, and yield-generating protocols.
            </p>
          </li>
        </ul>
        <br />
        <p>
          <strong>
            <a href="https://bithomp.com/en/amms?currency=524C555344000000000000000000000000000000&currencyIssuer=rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De">
              View RLUSD AMM Pools on XRPL
            </a>
          </strong>
        </p>
        <br />
        <br />
      </div>
    </>
  )
}
