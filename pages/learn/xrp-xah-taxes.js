import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Image from 'next/image'
import Link from 'next/link'

import Breadcrumbs from '../../components/Breadcrumbs'
import SEO from '../../components/SEO'
import { network } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { i18n } from 'next-i18next'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function XRPXAHTaxes() {
  return (
    <>
      <SEO
        title="XRP and XAH Taxes"
        description="Discover how Bithomp XRPL and Xahau Explorers provide accurate CSV exports compatible with major tax platforms like Koinly, Cointracking, and Taxbit."
        noindex={network !== 'mainnet'}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">
          <h1>XRP and XAH Taxes</h1>
          <figure>
            <Image
              src={'/images/pages/learn/xrp-xah-taxes/cover.jpg'}
              alt="XRP and XAH Taxes"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>XRP and XAH taxes</figcaption>
          </figure>
          <p>
            The booming world of cryptocurrencies has led to a surge of interest not only in investing but also in
            understanding the tax implications of digital assets like XRP and XAH.
          </p>
          <h2>Why Are XRP and XAH Taxable?</h2>
          <p>
            In many jurisdictions, cryptocurrencies—XRP and XAH included—are treated as capital assets. Every
            transaction—buying, selling, sending, or receiving—may have tax consequences. Accurate and complete
            transaction recording is essential for crypto tax reporting.
          </p>
          <h2>How Bithomp XRPL and Xahau Explorers Help Taxpayers</h2>
          <p>
            <strong>Existing Problems</strong>
          </p>
          <ul>
            Many crypto users require transaction exports for tax purposes, but existing tools often fail in several
            critical areas:
            <li>Limited Token Support – Most solutions ignore IOUs (DEX tokens), leaving gaps in reporting.</li>
            <li>Inaccurate Calculations – Transfer fees are often missed.</li>
            <li>Lack of XRPL and XAHAU Compatibility – Many tax tools don’t support these ledgers.</li>
          </ul>
          <p>
            <strong>Our Solution</strong>
          </p>
          On our platform you can get the most comprehensive XRPL and XAHAU transaction exports for your tax reports:
          <div className="links">
            <a
              href={'https://bithomp.com/' + i18n.language + '/admin/pro/history'}
              target="_blank"
              rel="noopener noreferrer"
            >
              XRPL
            </a>
            <a
              href={'https://xahauexplorer.com/' + i18n.language + '/admin/pro/history'}
              target="_blank"
              rel="noopener noreferrer"
            >
              XAHAU
            </a>
          </div>
          <h3>
            <strong>We provide:</strong>
          </h3>
          <ul>
            <li>Extensive Calculations – Covers payments, NFT sales, AMM transactions, and network fees.</li>

            <li>
              Accurate Token Value Calculations – Historical prices in 40 fiat currencies based on order book depth.
            </li>
          </ul>
          <h3>How We Make Calculations</h3>
          <ul>
            <li>
              Retrieve 1000 (or 100 depending on server) best offers from the order book for the given ledger index.
            </li>
            <li>Take the AMM pool for the ledger index.</li>
            <li>
              Check offer remaining amounts and verify the offer owner’s funds (if an owner has multiple offers, we
              validate funds for all).
            </li>
            <li>
              Generate an AMM offer with a better rate than order book offers and use it if possible (only once, with
              the best offer available).
            </li>
            <li>If no offers remain, convert the entire amount via the AMM pool (if it wasn’t used before).</li>
            <li>Move to the next offer and repeat from step 3.</li>
          </ul>
          <p>
            <strong>Important Notes and Limitations</strong>
          </p>
          <ul>
            <li>
              AMM pool can be used only once per calculation, and only with a rate similar to the best available offer.
            </li>
            <li>We do not check if an offer owner has authorization for holding IOUs.</li>
            <li>Rippling is not supported.</li>
            <li>Multipath payments are not supported.</li>
            <li>The 1000 (100) order book retrieval limit depends on the server used.</li>
          </ul>
          <h2>CSV Export Compatibility</h2>
          <ul>
            Our CSV exports are compatible with 7 of the largest and most popular crypto tax reporting platforms:
            <li>
              <strong>Koinly</strong>
            </li>
            <li>
              <strong>CoinTracking.info</strong>
            </li>
            <li>
              <strong>CoinLedger</strong>
            </li>
            <li>
              <strong>SUMM (formerly Crypto Tax Calculator)</strong>
            </li>
            <li>
              <strong>TaxBit</strong>
            </li>
            <li>
              <strong>Blockpit</strong>
            </li>
            <li>
              <strong>TokenTax</strong>
            </li>
          </ul>
          <figure>
            <Image
              src={'/images/pages/learn/xrp-xah-taxes/tax-platforms.jpg'}
              alt="Compatible tax platforms"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>Compatible tax platforms</figcaption>
          </figure>
          <h2>How to Get Your Transaction History for Tax Reporting</h2>
          <p>
            <strong>Step 1:</strong>
          </p>
          <p>
            If you are not yet a Pro Subscriber, purchase your subscription{' '}
            <Link href="https://bithomp.com/en/admin/subscriptions">HERE</Link>.
          </p>
          <p>
            <strong>Step 2:</strong>
          </p>
          <p>Add the address you want to track.</p>
          <p>
            <strong>Step 3:</strong>
          </p>
          <p>
            Wait for the data to synchronize (usually takes 1–10 minutes). Once ready, you can view and download the
            transaction history. You can track one or multiple wallets at the same time.
          </p>
          <figure>
            <Image
              src={'/images/pages/learn/xrp-xah-taxes/screen.jpg'}
              alt="Compatible tax platforms"
              width={1520}
              height={953}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>Compatible tax platforms</figcaption>
          </figure>
          <p>
            <strong>Step 4:</strong>
          </p>
          <p>
            Set your filters (select the date range), remove dust transactions if needed, and press the CSV button to
            download your file.
          </p>
          <p>
            <strong>Step 5:</strong>
          </p>
          <p>
            If you need a CSV file formatted for one of the supported tax platforms, simply select the platform from the
            list and download the corresponding CSV. Then, open your tax platform and import the file.
          </p>
          <p>
            Watch our detailed video tutorial <strong>How to search through transactions on XRPL.</strong>{' '}
          </p>
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-lg">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/khkVX9jDEKg"
              title="How to use XRPL Explorer"
              allowFullScreen
            ></iframe>
          </div>
        </article>
      </div>
      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Open Sans', sans-serif;
          line-height: 1.6;
        }

        .hero {
          text-align: center;
          padding: 40px 20px;
          border-radius: 10px;
          margin-bottom: 30px;
        }

        .hero h1 {
          font-size: 2rem;
        }

        .hero p {
          font-size: 1.2rem;
          margin: 10px 0;
        }

        section {
          margin-bottom: 40px;
        }

        .assist .feature-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .feature {
          flex: 1 1 calc(50% - 20px);
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .feature:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .links {
          display: flex;
          gap: 15px;
        }

        .links a {
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s ease;
          font-weight: bold;
        }

        .links a:hover {
          background: #35909e; /* Darker teal for hover state */
        }

        .video-wrapper {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 20px;
        }

        .video-wrapper iframe {
          width: 100%;
          max-width: 560px;
          height: 315px;
        }

        .cta {
          text-align: center;
          background: #e0f2f1;
          color: #333333;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .cta p {
          font-size: 1.2rem;
        }
      `}</style>
    </>
  )
}
