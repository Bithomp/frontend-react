import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'

import Breadcrumbs from '../../components/Breadcrumbs'
import SEO from '../../components/SEO'
import { network } from '../../utils'
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

export default function TheBithompAPI() {
  return (
    <>
      <SEO
        title={'How to Use the Bithomp API – And Why It’s Unique Among XRPL and Xahau APIs'}
        description="Why Bithomp XRPL and Xahau API Stands Out:"
        noindex={network !== 'mainnet'}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">
          <h1>How to Use the Bithomp API – And Why It’s Unique Among XRPL and Xahau APIs</h1>
          <Image
            src="/images/pages/learn/the-bithomp-api/cover.jpg"
            alt="The Bithomp API"
            width={1520}
            height={855}
            className="max-w-full h-auto object-contain"
            priority
          />
          <p>
            The XRPL ecosystem (including the Xahau Ledger) is expanding rapidly, with developers and institutions
            depending on robust APIs to access ledger data. Among them, the Bithomp API stands out as a unique and
            user-friendly option—designed by a team deeply rooted in the XRPL community since 2015.
          </p>
          <h2>What is Bithomp API?</h2>
          <p>
            The Bithomp API is an advanced API built on top of the XRP and Xahau Ledgers, designed to deliver detailed,
            high-precision data for developers building wallets, blockchain explorers, tax tools, NFT marketplaces, and
            XRPL/Xahau-powered apps. It offers real-world advantages in stability, performance, and data completeness.
          </p>
          <h2>Getting Started with the Bithomp API</h2>
          <strong> Step 1: Request Access</strong>
          <ul>
            <li>Visit https://bithomp.com/en/admin/api and sign in</li>
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
          <h2>Bithomp API Pricing & Plans </h2>
          <p>
            We offer <strong>FREE</strong> access to the Bithomp API on test networks, making it easy to explore our
            features at no cost.
          </p>
          <p>
            For mainnet usage, we provide a range of subscription tiers suitable for individual developers, businesses,
            and large-scale platforms:
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
            (starting at 0.001 XRP or 0.03 XAH).{' '}
          </p>
          For detailed limits and pricing, please refer to{' '}
          <>
            <Link href="https://docs.bithomp.com/#price-and-limits">our full pricing table:</Link>
          </>
          <h3>NFT Content Plans</h3>
          <p>
            The NFT Content Plan is included as part of the main API subscription. It provides direct, fast access to
            resized and cached NFT media, including:{' '}
          </p>
          <ul>
            <li>Images(700×700px)</li>
            <li>Previews (360×360px)</li>
            <li> Thumbnails (64×64px)</li>
            <li>Video snippets (first 15 seconds)</li>
            <p>
              Each API tier includes a specific volume of NFT media delivery per day and per month, depending on the
              selected plan.{' '}
            </p>
            <p>
              If you are using our CDN server and would like to learn how to pay for the NFT Content Plan, please
              contact us at <a href="mailto:partner@bithomp.com">partner@bithomp.com</a>.
            </p>
          </ul>
          <p>
            <>
              <Link href="https://docs.bithomp.com/#nft-content-plans ">
                View detailed prices and limits of our NFT Content Plans.
              </Link>
            </>
          </p>
          <h2>Why Bithomp API is Unique</h2>
          <p>
            Unlike many XRPL and Xahau APIs that simply proxy the ledger, Bithomp enriches and pre-processes data,
            offering a more developer-friendly experience.
          </p>
          <ol>
            {' '}
            <li>
              <strong>Enhanced Metadata</strong>
            </li>
            Bithomp parses memos, decodes NFT metadata, and enriches transactions with context like token names, images,
            and user-friendly tags.
            <li>
              {' '}
              <strong> Historical Price Calculations</strong>
            </li>
            You can get historical fiat prices and even historical token price data — used in features like tax reports.
            This is crucial for apps dealing with compliance, accounting, and reporting.
            <li>
              {' '}
              <strong>NFT-Focused Endpoints</strong>
            </li>
            With deep NFT support (including issuer metadata, offer history, and cached media), it goes beyond standard
            XRPL APIs that just return binary hex blobs.
            <p>
              <Link href="https://docs.bithomp.com/#nft-xls-20">See NFT-related API documentation</Link>
            </p>
            <li>
              <strong>AMM-Focused Endpoints</strong>
            </li>
            The Bithomp API includes full support for XRPL AMM (Automated Market Maker) data. AMM endpoints return the
            list of available AMM pools and allow you to retrieve detailed information about a specific AMM pool by its
            ID. These endpoints are useful for developers building DEX dashboards, liquidity pool analytics, or AMM
            trading interfaces.
            <p>
              <Link href="https://docs.bithomp.com/#amm">See AMM endpoint documentation</Link>
            </p>
            <li>
              <strong> Powerful XRPL and Xahau Tokens API endpoints</strong>
            </li>
            <p>
              List of Tokens endpoint includes detailed live stats such as active holders, buy/sell volumes, unique
              buyers and sellers, DEX activity, mint/burn/transfer volumes, unique accounts, market cap, XRP price, and
              more. Tokens can also be sorted by number of holders, trustlines, or rating. Additionally, new Search
              endpoints allow developers to find tokens by issuer, currency, or username; search for issuers using parts
              of addresses, domains, or service names; and look up currencies by code or name.
            </p>
            <>
              <Link href="https://docs.bithomp.com/#tokens">See Tokens-related API documentation</Link>
            </>
            <li>
              <strong>Profile Images for XRPL and Xahau Addresses.</strong>
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
              evolving needs of XRPL developers, Xahau builders, and ecosystem partners.
            </p>
          </ol>
          <h2>Who Should Use the Bithomp XRPL and Xahau API?</h2>
          <p>The Bithomp API is ideal for:</p>
          <ul>
            <li>Application developers (especially those supporting NFTs and tokens) </li>
            <li>Tax and reporting tools</li>
            <li> XRPL and Xahau explorers </li>
            <li>NFT marketplaces </li>
            <li>Builders looking for a reliable, enriched, and production-ready XRPL and Xahau API.</li>
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
