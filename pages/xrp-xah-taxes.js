import Mailto from 'react-protected-mailto'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { getIsSsrMobile } from '../utils/mobile'
import { network, useWidth } from '../utils'
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

export default function XrpTaxes() {
  const width = useWidth()
  return (
    <>
      <SEO
        title="XRP and XAH Taxes"
        description="How XRPL and Xahau Explorers can help you with taxes"
        noindex={network !== 'mainnet'}
      />
      <div className="container">
        <div className="hero">
          <h1>XRP and XAH Taxes</h1>
          <p>
            The booming world of cryptocurrencies has led to an explosion of interest in not only investing but also
            understanding the various tax implications associated with digital assets.
          </p>
        </div>

        <section className="intro">
          <h2>Why Are XRP and XAH Taxable?</h2>
          <p>
            In many jurisdictions, cryptocurrencies—XRP and XAH included—are treated as capital assets. Every
            transaction—buying, selling, sending, or receiving—can have tax implications. Accurate recording is crucial
            for tax reporting.
          </p>
        </section>

        <section className="assist">
          <h2>How XRPL and Xahau Explorers Assist Taxpayers</h2>
          <div className="feature-grid">
            <div className="feature">
              <h3>Existing Problems</h3>
              <p>
                Many users need transaction exports for tax reporting, but existing tools fall short in several critical
                areas:
              </p>
              <ul>
                <li>Limited Token Support: Most solutions ignore IOUs (DEX tokens), leaving gaps in reporting.</li>
                <li>Inaccurate Calculations: Transfer fees are often overlooked.</li>
                <li>Lack of XRPL and XAHAU Compatibility: Many platforms don’t support these ledgers.</li>
              </ul>
            </div>
            <div className="feature">
              <h3>Our Solution</h3>
              <p>
                Get the most comprehensive XRPL and XAHAU transaction exports for your <strong>tax reports:</strong>
              </p>
              <div className="links">
                <a
                  href={'https://bithomp.com/' + i18n.language + '/admin/pro/history'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  XRPL
                </a>
                <a
                  href={'https://bithomp.com/' + i18n.language + '/admin/pro/history'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  XAHAU
                </a>
              </div>
              <h3>We Offer</h3>
              <ul>
                <li>Monitor up to 5 Wallets: Track the full history of balance changes.</li>
                <li>Extensive Calculations: Includes payments, NFT sales, AMM transactions, and network fees.</li>
                <li>
                  Accurate Token Value Calculations: Historical prices in 40 fiat currencies based on order book depth.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="videos">
          <h2>Watch These Videos to Learn How to Start Using These Tools:</h2>
          <div className={width > 1000 ? 'video-wrapper' : ''}>
            <iframe
              src="https://www.youtube.com/embed/efJFyfSwXIM"
              title="XRPL Balance Change History"
              allowFullScreen
            ></iframe>
            <iframe
              src="https://www.youtube.com/embed/b5PSMhDUah0"
              title="Xahau Balance Change History"
              allowFullScreen
            ></iframe>
          </div>
        </section>

        <section className="assist">
          <h2>How XRPL and Xahau Explorers Assist Crypto Tax Platforms</h2>
          <div className="feature">
            <h3>You Get</h3>
            <ul>
              <li>Expand the range of your available services to meet community demand.</li>
              <li>
                Build stronger, more lasting relationships with clients by addressing specific tax reporting needs.
              </li>
            </ul>
          </div>
          <div className="feature" style={{ marginTop: '30px' }}>
            <h3>Your Benefits of Working with Us:</h3>
            <ul>
              <li>
                <strong>XRPL Support:</strong> One of the oldest blockchains, XRPL has been active since 2012 with a
                large user base. We ensure up-to-date XRPL support by adding new transaction types and integrating
                amendments even before they go live.
              </li>
              <li>
                <strong>Xahau Support:</strong> XAHAU, launched in 2023, is an XRPL-based network with smart contracts
                (hooks).
              </li>
              <li>
                <strong>All Types of Transactions Support:</strong> You will have support for all Token type of
                transactions on DEX, including the new AMM transaction types.
              </li>
              <li>
                <strong>No Need for XRPL Integration:</strong> You don’t need to integrate XRPL, which is very different
                from EVM or PoW chains. You don’t need to run your own XRPL node.
              </li>
            </ul>
          </div>
        </section>

        <section className="cta">
          <p>
            We would love to explore partnership opportunities and learn about your interest in expanding your services.
            Contact us at <Mailto email="partner@bithomp.com" headers={{ subject: 'Partnership Inquiry' }} />.
          </p>
        </section>
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
