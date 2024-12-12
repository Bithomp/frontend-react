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
        <p>
          The booming world of cryptocurrencies has led to an explosion of interest in not only investing but also understanding the various tax implications associated with digital assets.
        </p>

        <h2>Why are XRP and XAH Taxable</h2>
        <p>
          In many jurisdictions, cryptocurrencies - XRP and XAH included - are treated as capital assets.
        </p>
        <p>
          Every transaction - whether it's buying, selling, sending, or receiving - can have tax implications. The most crucial thing in tax reporting is the accuracy of recording.
        </p>
        <h2>How XRPL and Xahau Explorers Help Tax Residents</h2>
      </div>
      <div className="content-center">
        <center>
          <img
            src="/images/pages/xrp-xah-taxes-1.jpeg"
            alt="Illustration Problem"
            style={{ maxWidth: '100%', maxHeight: 1080 }}
          />
        </center>
        <center>
          <img
            src="/images/pages/xrp-xah-taxes-2.jpeg"
            alt="Illustration Solution"
            style={{ maxWidth: '100%', maxHeight: 1080 }}
          />
        </center>
        <center>
          <img
            src="/images/pages/xrp-xah-taxes-3.jpeg"
            alt="Illustration We offer"
            style={{ maxWidth: '100%', maxHeight: 1080 }}
          />
        </center>
  <div className="content-center">
  <p>
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
        <h2>How XRPL and Xahau Explores Help Crypto Tax Platforms</h2>
        <center>
          <img
            src="/images/pages/xrp-xah-taxes-4.jpeg"
            alt="Illustration You Get"
            style={{ maxWidth: '100%', maxHeight: 1080 }}
          />
        </center>
        <center>
          <img
            src="/images/pages/xrp-xah-taxes-5.jpeg"
            alt="Illustration Your Benefits"
            style={{ maxWidth: '100%', maxHeight: 1080 }}
          />
        </center>
    
        <p>
    We would love to explore partnership opportunities and learn about your interest in expanding your services. 
    If you're interested, please reach out so we can discuss the details further at 
    <a href="mailto:partner@bithomp.com" > partner@bithomp.com</a>.
  </p> 
      </div>
    </>
  )
}
