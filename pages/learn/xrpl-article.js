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
        title="What is XRP, XRP Ledger, and Ripple | XRPL Explained"
        description="Learn the difference between XRP, XRP Ledger (XRPL), and Ripple. Understand how XRP works, the role of Ripple, and key features of the XRPL blockchain."
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/xrpl-article.jpeg', width: 1024, height: 512, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto my-10">
          <h1>What is XRP, XRP Ledger, and Ripple? Key Differences Explained</h1>

          <Image
            src="/images/pages/xrpl-article.jpeg"
            alt="What is XRP, XRP Ledger, Ripple"
            width={1024}
            height={768}
            className="max-w-full h-auto object-contain"
            priority
          />

          <p>
            In the ever-evolving landscape of cryptocurrency, XRP has emerged as one of the most influential digital
            assets since its inception in 2012. Designed to facilitate fast and affordable cross-border transactions,
            XRP stands out due to its unique technology and underlying philosophy. This article provides a thorough
            understanding of what XRP is, how it works, the role of the XRP Ledger (XRPL), and how Ripple contributes to
            the ecosystem.
          </p>

          <h2>What is Ripple?</h2>
          <p>
            Ripple is a blockchain technology company that primarily focuses on providing cross-border payment
            solutions. Ripple is widely known for its contributions to the XRP Ledger (XRPL) and for promoting the use
            of XRP in global finance.
          </p>
          <p>
            While Ripple plays a significant role in the development and promotion of XRP, the company itself also
            offers RippleNet — a decentralized global payments network used by banks, financial institutions, and
            payment providers to facilitate real-time, low-cost international money transfers.
          </p>

          <h3>Ripple's Origin</h3>
          <p>
            Ryan Fugger, a Canadian software developer, originated the concept for Ripple and created RipplePay in 2004.
          </p>
          <p>
            In 2012, Jed McCaleb, Arthur Britto, and David Schwartz acquired Ripple from Fugger, transitioning it from a
            credit platform into a blockchain-based digital payment network. Chris Larsen also played a key role in
            developing the XRP Ledger (XRPL), which officially launched in June 2012.
          </p>

          <h3>Key Founders</h3>
          <dl>
            <dt>Jed McCaleb</dt>
            <dd>
              <strong>Title:</strong> Co-founder
            </dd>
            <dd>
              <strong>Background:</strong> Founded Mt.Gox, an early Bitcoin exchange, in 2010.
            </dd>
            <dd>
              <strong>Contributions:</strong> Served as Ripple's CTO before founding Stellar after forking the XRPL.
            </dd>
          </dl>

          <dl>
            <dt>Chris Larsen</dt>
            <dd>
              <strong>Title:</strong> Co-founder
            </dd>
            <dd>
              <strong>Background:</strong> Founded e-Loan and Prosper Marketplace.
            </dd>
            <dd>
              <strong>Contributions:</strong> Ripple CEO (2012–2016), now Executive Chairman.
            </dd>
          </dl>

          <dl>
            <dt>David Schwartz</dt>
            <dd>
              <strong>Title:</strong> Co-founder
            </dd>
            <dd>
              <strong>Background:</strong> Former Director of Software Development at Webmaster Inc.
            </dd>
            <dd>
              <strong>Contributions:</strong> Current Ripple CTO and original XRPL architect.
            </dd>
          </dl>

          <h3>Other Contributors</h3>
          <dl>
            <dt>Arthur Britto</dt>
            <dd>
              <strong>Background:</strong> Former video game designer.
            </dd>
            <dd>
              <strong>Contributions:</strong> Helped build the XRP Ledger.
            </dd>
          </dl>

          <h2>What is XRP?</h2>
          <p>XRP is the native digital asset of the XRP Ledger (XRPL), an open-source, decentralized blockchain.</p>

          <h3>The Basics of XRP</h3>
          <ul>
            <li>
              <strong>Symbol:</strong> XRP
            </li>
            <li>
              <strong>Launch:</strong> 2012
            </li>
            <li>
              <strong>Use Case:</strong> Cross-border payments and liquidity for institutions
            </li>
            <li>
              <strong>Consensus:</strong> Unique consensus protocol with independent validators
            </li>
          </ul>

          <h2>What is the XRP Ledger?</h2>
          <p>
            The XRP Ledger (XRPL) is a decentralized blockchain known for its speed, efficiency, and scalability. It is
            capable of processing thousands of transactions per second, making it suitable for enterprise-grade
            financial use.
          </p>

          <h4>Key Features of the XRP Ledger</h4>
          <ul>
            <li>
              <strong>Speed:</strong> Transactions are confirmed in 3–5 seconds.
              <div>
                <Link href="/faucet" className="bold">
                  Here You Can Test the Speed and Reliability of XRPL Payments
                </Link>
                .
              </div>
            </li>
            <li>
              <strong>Low Fees:</strong> Typical transaction costs are a fraction of a cent.
            </li>
            <li>
              <strong>Decentralized:</strong> Maintained by independent validators, not Ripple.
            </li>
          </ul>

          <h3>The Role of Validators and Nodes</h3>
          <p>
            Validators reach consensus on transaction sequence. Anyone can run a validator that follows network rules.
            XRP Ledger does not require mining.
          </p>
          <p>
            <Link href="/validators" className="bold">
              View the list of XRPL Validators
            </Link>
            .
          </p>
          <p>Nodes maintain the XRPL network. Full History Nodes store the complete blockchain history.</p>
          <p>
            <Link href="/nodes" className="bold">
              View the list of XRPL Nodes
            </Link>
            .
          </p>

          <h3>Creating and Distributing XRP</h3>
          <p>
            All 100 billion tokens were created at launch. Ripple holds a portion and distributes it to support
            ecosystem growth.
          </p>
          <p>
            <Link href="/distribution" className="bold">
              View the TOP 100 Accounts by XRP Balances
            </Link>
            .
          </p>

          <h3>Key Features of XRPL</h3>
          <ul>
            <li>
              <strong>Liquidity:</strong> XRP is perfect as a bridge currency between fiat currencies.
            </li>
            <li>
              <strong>Scalability:</strong> With Pay Channels it can handle thousands of transactions per second.
            </li>
            <li>
              <strong>Energy Efficient:</strong> No mining, low environmental impact.
            </li>
          </ul>

          <h3>Market Position and Outlook</h3>
          <p>XRP has faced volatility and legal scrutiny, notably from the U.S. SEC.</p>
          <p>
            Its use cases, low-cost, and high-speed performance have helped maintain its relevance in the evolving
            crypto landscape.
          </p>

          <h3>Conclusion</h3>
          <p>
            XRP and the XRP Ledger present innovative solutions for cross-border payments, Real World Assets and global
            liquidity.
          </p>
        </article>
      </div>
    </>
  )
}
