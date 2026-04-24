import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '../../components/Breadcrumbs'
import { network } from '../../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function XrplArticle() {
  return (
    <>
      <SEO
        title="What is XRP, XRP Ledger (XRPL), and Ripple? Full Explanation & Differences"
        description="Learn what XRP is, how the XRP Ledger (XRPL) works, and the role of Ripple. A complete guide to XRP blockchain technology, payments, validators, and use cases."
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/xrpl-article.jpeg', width: 1024, height: 512, allNetworks: true }}
      />

      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />

        <article className="prose sm:prose-lg dark:prose-invert mx-auto my-10">
          <h1>What is XRP, XRP Ledger (XRPL), and Ripple? Guide & Key Differences</h1>
          <p>
            Understand how XRP, the XRP Ledger (XRPL), and Ripple work together in the global blockchain payments
            ecosystem.
          </p>

          <Image
            src="/images/pages/xrpl-article.jpeg"
            alt="XRP, XRP Ledger (XRPL), and Ripple explained"
            width={1024}
            height={768}
            className="max-w-full h-auto object-contain"
            priority
          />

          <section>
            <h2>Introduction to XRP, XRPL, and Ripple</h2>
            <p>
              In the cryptocurrency industry, XRP has become one of the most important digital assets for fast and
              low-cost global payments. It operates on the XRP Ledger (XRPL), a decentralized blockchain designed for
              scalability and speed. Ripple is the company that contributes to the development and adoption of this
              ecosystem.
            </p>
          </section>

          <section>
            <h2>What is Ripple?</h2>
            <p>
              Ripple is a blockchain technology company focused on cross-border payments and financial infrastructure.
              It is known for developing solutions that enable real-time international money transfers using blockchain
              technology.
            </p>

            <p>
              Ripple also promotes the adoption of the XRP Ledger (XRPL) and supports financial institutions through
              RippleNet, a global payments network used by banks and payment providers.
            </p>

            <h3>Ripple’s Origin and History</h3>
            <p>
              The concept of Ripple was originally created by Ryan Fugger in 2004 with RipplePay. In 2012, Jed McCaleb,
              Arthur Britto, and David Schwartz transformed it into a blockchain-based payment protocol. Chris Larsen
              played a key role in scaling the XRP Ledger ecosystem.
            </p>

            <h3>Key Founders of Ripple and XRPL</h3>

            <dl>
              <dt>Jed McCaleb</dt>
              <dd>
                <strong>Co-founder</strong>
              </dd>
              <dd>Founded Mt.Gox, one of the first Bitcoin exchanges.</dd>
              <dd>Former CTO of Ripple and later founder of Stellar after forking XRPL.</dd>
            </dl>

            <dl>
              <dt>Chris Larsen</dt>
              <dd>
                <strong>Co-founder</strong>
              </dd>
              <dd>Entrepreneur behind e-Loan and Prosper Marketplace.</dd>
              <dd>Former CEO of Ripple and current Executive Chairman.</dd>
            </dl>

            <dl>
              <dt>David Schwartz</dt>
              <dd>
                <strong>Co-founder & CTO</strong>
              </dd>
              <dd>Primary architect of the XRP Ledger (XRPL).</dd>
            </dl>
          </section>

          <section>
            <h2>What is XRP?</h2>
            <p>
              XRP is the native digital currency of the XRP Ledger (XRPL), designed for fast, scalable, and low-cost
              transactions.
            </p>

            <h3>Key Characteristics of XRP</h3>
            <ul>
              <li>
                <strong>Symbol:</strong> XRP
              </li>
              <li>
                <strong>Launch Year:</strong> 2012
              </li>
              <li>
                <strong>Main Use Case:</strong> Cross-border payments and liquidity bridging
              </li>
              <li>
                <strong>Consensus:</strong> Unique validator-based consensus mechanism (no mining)
              </li>
            </ul>
          </section>

          <section>
            <h2>What is the XRP Ledger (XRPL)?</h2>
            <p>
              The XRP Ledger (XRPL) is an open-source, decentralized blockchain that enables fast and efficient digital
              transactions. It is designed for financial institutions and enterprise-grade applications.
            </p>

            <h3>Key Features of XRPL Blockchain</h3>
            <ul>
              <li>
                <strong>Fast Transactions:</strong> 3–5 seconds settlement time
              </li>
              <li>
                <strong>Low Fees:</strong> Extremely low transaction cost
              </li>
              <li>
                <strong>Decentralization:</strong> Independent validators maintain consensus
              </li>
            </ul>

            <div>
              <Link href="/faucet" className="font-semibold">
                Test XRP Ledger Transaction Speed
              </Link>
            </div>
          </section>

          <section>
            <h3>XRPL Validators and Nodes</h3>
            <p>
              The XRP Ledger uses independent validators to confirm transactions without mining. Anyone can run a
              validator node.
            </p>

            <p>
              <Link href="/validators" className="font-semibold">
                View XRPL Validators
              </Link>
            </p>

            <p>Full nodes store the complete ledger history and support network integrity.</p>

            <p>
              <Link href="/nodes" className="font-semibold">
                View XRPL Nodes
              </Link>
            </p>
          </section>

          <section>
            <h3>XRP Supply and Distribution</h3>
            <p>
              All 100 billion XRP tokens were created at launch. Ripple holds a portion of XRP to support ecosystem
              growth and development.
            </p>

            <p>
              <Link href="/distribution" className="font-semibold">
                View Top XRP Holders
              </Link>
            </p>
          </section>

          <section>
            <h2>Benefits of XRP and XRPL</h2>
            <ul>
              <li>
                <strong>Liquidity:</strong> Used as a bridge currency in global payments
              </li>
              <li>
                <strong>Scalability:</strong> Supports thousands of transactions per second
              </li>
              <li>
                <strong>Energy Efficiency:</strong> No mining required
              </li>
            </ul>
          </section>

          <section>
            <h2>Market Position and Legal Context</h2>
            <p>
              XRP has experienced regulatory scrutiny, including legal challenges from the U.S. SEC. Despite this, it
              remains widely used for cross-border payments and liquidity solutions.
            </p>
          </section>

          <section>
            <h2>Conclusion</h2>
            <p>
              XRP, XRPL, and Ripple together form a blockchain ecosystem focused on fast, low-cost global payments,
              enterprise adoption, and financial infrastructure innovation.
            </p>
          </section>

          <section>
            <h2>FAQ: XRP, XRPL, and Ripple</h2>

            <h3>Is XRP the same as Ripple?</h3>
            <p>
              No. XRP is a digital asset, while Ripple is a company that develops payment solutions and supports XRPL.
            </p>

            <h3>Is XRP Ledger decentralized?</h3>
            <p>Yes. XRPL is maintained by independent validators rather than a central authority.</p>

            <h3>Does XRP require mining?</h3>
            <p>No. XRP uses a consensus mechanism instead of mining.</p>

            <h3>What is XRP used for?</h3>
            <p>It is mainly used for cross-border payments and liquidity bridging between currencies.</p>
          </section>
        </article>
      </div>
    </>
  )
}
