import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'

import Breadcrumbs from '../../components/Breadcrumbs'
import SEO from '../../components/SEO'
import { explorerName, network, xahauNetwork, nativeCurrency } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import AboutApiTabs from '../../components/Tabs/AboutApiTabs'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function TheBithompAPI() {
  return (
    <>
      <SEO
        title={'How to Use the Bithomp API – Features, Pricing & Documentation'}
        description="Learn how to use the Bithomp API with detailed documentation, pricing, and developer features."
        noindex={network !== 'mainnet'}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />

        <AboutApiTabs tab="about" />

        <article className="prose sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">
          <h1>How to Use the Bithomp API: Features & Documentation</h1>
          <Image
            src="/images/pages/learn/the-bithomp-api/cover.jpg"
            alt="The Bithomp API"
            width={1520}
            height={855}
            className="max-w-full h-auto object-contain"
            priority
          />
          <p>
            The {explorerName} ecosystem is expanding rapidly, with developers and institutions depending on robust APIs
            to access ledger data. Among them, the Bithomp API stands out as a unique and user-friendly option—designed
            by a team deeply rooted in the {explorerName} community since 2015.
          </p>
          <h2>What is Bithomp API?</h2>
          <p>
            The Bithomp API is an advanced API built on top of the {explorerName}, designed to deliver detailed,
            high-precision data for developers building wallets, blockchain explorers, tax tools, NFT marketplaces, and
            {explorerName} apps. It offers real-world advantages in stability, performance, and data completeness.
          </p>
          <h2>Getting Started with the Bithomp API</h2>
          <strong> Step 1: Request Access</strong>
          <ul>
            <li>
              Sign in <Link href="https://bithomp.com/admin/api">HERE</Link>
            </li>
            <li>Request your API key</li>
            <p>If you need to purchase or extend the paid plan:</p>
            <li>Press “Manage API Subscriptions”</li>
            <li>Choose the required plan and period, pay with Xaman, Gem, Crossmark, MetaMask, or others</li>
          </ul>
          <strong>Step 2: Review the Full API Documentation</strong>
          <p>
            Explore the full documentation <Link href="https://docs.bithomp.com">HERE</Link>. The API structure is
            simple, with clearly documented endpoints. All responses are in JSON format, and examples are provided
            throughout the docs.
          </p>
          <h2>Bithomp API Plans: Free & Paid Options </h2>
          <p>
            We offer <strong>FREE</strong> access to the Bithomp API on <strong>test networks</strong>, making it easy
            to explore our features at no cost.
          </p>
          <p>
            <strong>Mainnet:</strong> available with both <strong>Free plan</strong> (limited for non-commercial use)
            and paid subscription plans with higher limits and additional features.
          </p>
          <p>
            The <strong>Free plan</strong> allows up to 10 requests per minute and 2,000 requests per day. It is
            intended for<strong> non-commercial use</strong>.
          </p>
          <p>
            Paid plans start at 30 EUR/month <strong>(Basic)</strong> with increased request limits.{' '}
          </p>
          <p>
            Starting from the <strong>Premium plan </strong>(250 EUR/month), users get full access to all available API
            endpoints, along with significantly higher request limits.
          </p>
          <p>
            {' '}
            For projects requiring high throughput, <strong>Enterprise </strong> plans offer up to 8,000 requests per
            minute and 2.4 million requests per day.
          </p>
          <p>
            We also offer a flexible <strong>On-Demand</strong> option powered by Dhali, with per-request pricing
            (starting at {xahauNetwork ? '0.03 XAH' : '0.001 XRP'}).
          </p>
          For detailed limits and pricing, please refer to{' '}
          <>
            <Link href="https://docs.bithomp.com/#price-and-limits">our full pricing table.</Link>
          </>
          <h3>NFT Content Plans</h3>
          <p>
            <strong>
              NFT Content Plans are intended only for those who want to display NFT images and videos using our CDN
              servers.
            </strong>{' '}
            It provides direct, fast access to resized and cached NFT media, including:{' '}
          </p>
          <ul>
            <li>Images(700×700px)</li>
            <li>Previews (image, otherwise a frame from a video, 360×360px)</li>
            <li>Thumbnails (image, otherwise a frame from a video, 64×64px)</li>
            <li>Video snippets (first 15 seconds)</li>
          </ul>
          <p>
            On <strong>Standard</strong> plan and above, <strong>the NFT Content Plan is included,</strong> but with
            daily and monthly limits on media delivery. If you need higher limits or want to subscribe only to the NFT
            Content Plan without the main API subscription, that’s also possible. For now, payment is available through
            support only.
          </p>
          <p>
            If you are using our CDN server and would like to learn how to pay for the NFT Content Plan, please contact
            us at <a href="mailto:partner@bithomp.com">partner@bithomp.com</a>.
          </p>
          <p>
            <>
              <Link href="https://docs.bithomp.com/#nft-content-plans ">
                View detailed prices and limits of our NFT Content Plans.
              </Link>
            </>
          </p>
          <h2>Why Choose the Bithomp API</h2>
          <p>
            Unlike many {explorerName} APIs that simply proxy the ledger, Bithomp enriches and pre-processes data,
            offering a more developer-friendly experience.
          </p>
          <ol>
            <li>
              <strong>Enhanced Metadata</strong>
            </li>
            Bithomp parses memos, decodes NFT metadata, and enriches transactions with context like token names, images,
            and user-friendly tags.
            <li>
              <strong> Historical Price Calculations</strong>
            </li>
            You can get historical fiat prices and even historical token price data — used in features like tax reports.
            This is crucial for apps dealing with compliance, accounting, and reporting.
            <li>
              <strong>NFT-Focused Endpoints</strong>
            </li>
            With deep NFT support (including issuer metadata, offer history, and cached media), it goes beyond standard
            {explorerName} APIs that just return binary hex blobs.
            <p>
              <Link href="https://docs.bithomp.com/#nft-xls-20">See NFT-related API documentation</Link>
            </p>
            {!xahauNetwork && (
              <>
                <li>
                  <strong>AMM-Focused Endpoints</strong>
                </li>
                <p>
                  The Bithomp API includes full support for XRPL AMM (Automated Market Maker) data. AMM endpoints return
                  the list of available AMM pools and allow you to retrieve detailed information about a specific AMM
                  pool by its ID. These endpoints are useful for developers building DEX dashboards, liquidity pool
                  analytics, or AMM trading interfaces.
                </p>
                <p>
                  <Link href="https://docs.bithomp.com/#amm">See AMM endpoint documentation</Link>
                </p>
              </>
            )}
            <li>
              <strong> Powerful {explorerName} Tokens API endpoints</strong>
            </li>
            <p>
              List of Tokens endpoint includes detailed live stats such as active holders, buy/sell volumes, unique
              buyers and sellers, DEX activity, mint/burn/transfer volumes, unique accounts, market cap,{' '}
              {nativeCurrency} price, and more. Tokens can also be sorted by number of holders, trustlines, or rating.
              Additionally, new Search endpoints allow developers to find tokens by issuer, currency, or username;
              search for issuers using parts of addresses, domains, or service names; and look up currencies by code or
              name.
            </p>
            <>
              <Link href="https://docs.bithomp.com/#tokens">See Tokens-related API documentation</Link>
            </>
            <li>
              <strong>Dapps Analytics Endpoints</strong>
            </li>
            <p>
              The Bithomp API provides analytics for XRPL dapps identified by their source tags. These endpoints return
              detailed statistics including transaction volume, successful transactions, unique users, total value
              transferred, fees paid, swap counts, and transaction breakdowns by type and result code. Historical
              comparisons are also available, making it easy to track dapp activity and growth over time.
            </p>
            <p>
              <Link href="https://docs.bithomp.com/#dapps">See Dapps API documentation</Link>
            </p>
            <li>
              <strong>Profile Images for {explorerName} Addresses.</strong>
            </li>
            <p>Free and no registration is required.</p>
            <p>Supported Image Types:</p>
            <ul>
              <li>Bithomp Avatars</li>
              <li>X Images</li>
              <li>Xaman Pro Profile Pictures and Curated Asset Images </li>
              <li>Gravatars</li>
              <li>Hashicons</li>
            </ul>
            <p>
              <strong>How to Use</strong>
            </p>
            <p>Simply embed the following image tag in your website or app:</p>
            <pre>
              <code>&lt;img src=&quot;https://cdn.bithomp.com/avatar/address&quot; alt=&quot;avatar&quot; /&gt;</code>
            </pre>
            <li>
              <strong>Actively Maintained & Continuously Evolving </strong>
            </li>
            <p>
              We are constantly adding new API endpoints and query parameters to expand functionality and meet the
              evolving needs of {explorerName} developers, and ecosystem partners.
            </p>
          </ol>
          <h2>Who Should Use the Bithomp API?</h2>
          <p>The Bithomp API is ideal for:</p>
          <ul>
            <li>Application developers (especially those supporting NFTs and tokens) </li>
            <li>Tax and reporting tools</li>
            <li> {explorerName} explorers </li>
            <li>NFT marketplaces </li>
            <li>Builders looking for a reliable, enriched, and production-ready {explorerName} API.</li>
          </ul>
          <p>
            Whether you're exploring NFTs, building wallets, or launching decentralized apps, Bithomp’s API gives you
            more than just raw blockchain data — it delivers context, clarity, and community-trusted infrastructure.
          </p>
          <p>❤️ Build with the Bithomp API.</p>
        </article>
      </div>
    </>
  )
}
