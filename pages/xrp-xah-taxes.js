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

export default function XrpTaxes() {
  return (
    <>
      <SEO
        title="XRP and Xah Taxes"
        description="How XRPL and Xahau Explorers can help you with taxes"
        noindex={network !== 'mainnet'}
      />
      <div className="content-center">
        <h1>XRP and XAH Taxes</h1>
        <p className="left-align">
          The booming world of cryptocurrencies has led to an explosion of interest in not only investing but also understanding the various tax implications associated with digital assets.
        </p>

        <h2 className="left-align">Why are XRP and XAH Taxable</h2>
        <p className="left-align">
          In many jurisdictions, cryptocurrencies - XRP and XAH included - are treated as capital assets.
        </p>
        <p className="left-align">
          Every transaction - whether it's buying, selling, sending, or receiving - can have tax implications. The most crucial thing in tax reporting is the accuracy of recording.
        </p>

        <h2 className="left-align">How XRPL and Xahau Explorers Help Tax Residents</h2>
        <div className="content-center">
          <div className="image-wrapper">
            <img
              src="/images/pages/xrp-xah-taxes-1.jpeg"
              alt="Illustration Problem"
              className="image"
            />
          </div>
        </div>

        <div className="content-center">
          <div className="image-wrapper">
            <img
              src="/images/pages/xrp-xah-taxes-2.jpeg"
              alt="Illustration Solution"
              className="image"
            />
          </div>

          <div className="image-wrapper">
            <img
              src="/images/pages/xrp-xah-taxes-3.jpeg"
              alt="Illustration We offer"
              className="image"
            />
          </div>
        </div>

        <div className="content-center">
          <p className="left-align">
            <strong>Watch these videos to learn how to start using this tool:</strong>
          </p>
          <div style={{ marginBottom: '20px' }}>
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/efJFyfSwXIM"
              title=" XRPL Balance Change History"
              allowFullScreen
            ></iframe>
          </div>
          <div>
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/b5PSMhDUah0"
              title="Xahau Balance Change History "
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <h2 className="left-align">How XRPL and Xahau Explores Help Crypto Tax Platforms</h2>
        <div className="content-center">
          <div className="image-wrapper">
            <img
              src="/images/pages/xrp-xah-taxes-4.jpeg"
              alt="Illustration You Get"
              className="image"
            />
          </div>

          <div className="image-wrapper">
            <img
              src="/images/pages/xrp-xah-taxes-5.jpeg"
              alt="Illustration Your Benefits"
              className="image"
            />
          </div>
        </div>

        <div className="content-center">
          <p className="left-align">
            We would love to explore partnership opportunities and learn about your interest in expanding your services. 
            If you're interested, please reach out so we can discuss the details further at 
            <a href="mailto:partner@bithomp.com"> partner@bithomp.com</a>.
          </p>
        </div>
      </div>

      <style jsx>{`
        .content-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .left-align {
          text-align: left;
          width: 100%;
          max-width: 900px;
        }

        .image-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
        }

        .image {
          width: 100%;
          max-width: 900px; /* Limits the width for large screens */
          height: auto;
          border: 5px solid #ddd; /* Soft border around the image */
          border-radius: 15px; /* Rounded corners */
          transition: transform 0.4s ease, box-shadow 0.4s ease; /* Smooth transitions */
          object-fit: cover;
        }

        .image:hover {
          transform: scale(1.03); /* Slight zoom effect */
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1); /* Subtle shadow around the image */
        }
      `}</style>
    </>
  )
}

