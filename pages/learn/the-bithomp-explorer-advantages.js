import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'

import Breadcrumbs from '../../components/Breadcrumbs'
import SEO from '../../components/SEO'
import { explorerName, nativeCurrency, network, xahauNetwork } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function UnderstandingTheBithompExplorer() {
  return (
    <>
      <SEO
        title={'Bithomp transaction explorer advantages'}
        description="Why Bithomp XRPL and Xahau Transaction Explorer Stands Out:"
        noindex={network !== 'mainnet'}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">
          <h1>Why Bithomp {explorerName} Transaction Explorer Stands Out</h1>
          <Image
            src="/images/pages/learn/the-bithomp-explorer-advantages/cover.png"
            alt="Understanding the Bithomp Explorer"
            width={1520}
            height={953}
            className="max-w-full h-auto object-contain"
            priority
          />
          <strong>A Comparison with Other {explorerName} Explorers</strong>
          <p>
            As the {explorerName} ecosystem grows, so does the need for powerful, intuitive, and user-friendly tools to
            scan {nativeCurrency} transactions. While there are several {explorerName} explorers available, not all are
            built equal.
          </p>
          <p>
            In this article, we’ll compare our {explorerName} transaction explorer with other explorers, and outline the
            unique advantages that set it apart — especially for users who value precision and usability.
          </p>
          <h2>Key Features That Set Bithomp {explorerName} Transaction Explorer Apart</h2>
          <h3>1. Historical Fiat Prices for Every Transaction (in 40 Currencies)</h3>
          <figure>
            <Image
              src={
                xahauNetwork
                  ? '/images/xahauexplorer/explorer-advantages/payment-tx-screen.png'
                  : '/images/xrplexplorer/explorer-advantages/payment-tx-screen.png'
              }
              alt="Fiat prices calculation"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>Fiat prices calculation</figcaption>
          </figure>
          <p>Most explorers show transaction amounts with no fiat conversion.</p>
          <p>
            <strong>Bithomp {explorerName} Explorer </strong>goes further — it provides historical values in{' '}
            <strong> 40 different currencies</strong>, making it ideal for:
          </p>
          <ul>
            <li>Tax reporting / accounting</li>
            <li>Regulatory audits</li>
          </ul>
          <h3>2. Automatic Explanations for Common Issues</h3>
          <figure>
            <Image
              src={
                xahauNetwork
                  ? '/images/xahauexplorer/explorer-advantages/failed-tx-screen.png'
                  : '/images/xrplexplorer/explorer-advantages/failed-tx-screen.png'
              }
              alt="Failed transaction explanation"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>Failed transaction explanation</figcaption>
          </figure>
          <p>Have you ever seen a transaction that failed or looked incomplete and had no idea why?</p>
          <p>
            <strong>Bithomp {explorerName} explorer automatically detects and explains</strong> common issues, such as:
          </p>
          <ul>
            <li>Missing destination tags (common with exchanges)</li>
            <li>Failed transactions with decoded error messages</li>
            No more googling obscure error codes — users get immediate context, saving time and preventing costly
            mistakes.
          </ul>
          <h3>3. User-Friendly Interface for Desktop and Mobile</h3>
          <p>
            While many explorers focus on functionality at the expense of design, Bithomp {explorerName} explorer
            delivers both.
          </p>
          <ul>
            <li>Clean, responsive UI</li>
            <li>Optimized for mobile and desktop usage</li>
            <li>Dark mode for comfortable viewing</li>
            <li>Intuitive navigation and search</li>
          </ul>
          <h3>4. Fast and Reliable Real-Time Updates</h3>
          <p>
            Latency matters. Whether tracking a payment or NFT offer, our explorer provides real-time transaction
            updates without delay.
          </p>
          Compared to other explorers that may have delays, caching issues, or incomplete data due to reliance on
          external API nodes, Bithomp's infrastructure is built for speed and uptime, ensuring:
          <ul>
            <li>Accurate transaction statuses</li>

            <li>Live balance updates</li>
            <li>Instant offer and NFT listing tracking</li>
          </ul>
          <h3>5. Support for Mainnet, Devnet, AlphaNet and Testnet</h3>
          <p>
            Developers working on new tools or testing integrations often need to switch between networks. Many
            explorers only support mainnet, limiting their usefulness.
          </p>
          <p>Bithomp {explorerName} Explorer supports:</p>
          <ul>
            <li>
              <a href={'https://bithomp.com/'} target="_blank" rel="noreferrer">
                XRPL Mainnet
              </a>
            </li>
            <li>
              <a href={'https://xahauexplorer.com/'} target="_blank" rel="noreferrer">
                XAHAU Mainnet
              </a>
            </li>
            <li>
              <a href={'https://test.bithomp.com/'} target="_blank" rel="noreferrer">
                XRPL Testnet
              </a>
            </li>
            <li>
              <a href={'https://dev.bithomp.com/'} target="_blank" rel="noreferrer">
                XRPL Devnet
              </a>
            </li>
            <li>
              <a href={'https://alphanet.bithomp.com/'} target="_blank" rel="noreferrer">
                XRPL AlphaNet
              </a>
            </li>
            <li>
              <a href={'https://test.xahauexplorer.com/'} target="_blank" rel="noreferrer">
                XAHAU Testnet
              </a>
            </li>
            <li>
              <a href={'https://jshooks.xahauexplorer.com/'} target="_blank" rel="noreferrer">
                XAHAU JS Hooks
              </a>
            </li>
          </ul>
          <p>
            While other {explorerName} explorers offer basic functionality, {explorerName} Explorer by Bithomp goes far
            beyond with advanced data processing, real-time reliability, and a focus on usability. It's more than just a
            block explorer — it’s a smart assistant for navigating the {explorerName}.
          </p>
          <h2>Related Articles</h2>
          <ul>
            <li>
              <Link href="/learn/blackholed-address">What is a Blackholed Address?</Link>
            </li>
            <li>
              <Link href="/learn/blacklisted-address">What is a Blacklisted Address?</Link>
            </li>
            <li>
              <Link href="/learn/verified-domain">What is a Verified Domain?</Link>
            </li>
          </ul>
        </article>
      </div>
    </>
  )
}
