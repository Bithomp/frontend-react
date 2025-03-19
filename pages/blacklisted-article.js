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

export default function BlacklistedArticle() {
  return (
    <>
      <SEO
        title="Blacklisted Accounts on XRPL"
        description="What are blacklisted addresses on XRP Ledger,why fraud alert is displayed, how and why accounts become blacklisted."
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/blacklisted-picture.jpg', width: 1024, height: 512, allNetworks: true }}
      />
      <div className="content-center">
        <center>
          <img
            src="/images/pages/blacklisted-picture.jpg"
            alt="Blacklisted Accounts on XRPL"
            style={{ maxWidth: '100%', maxHeight: 386 }}
          />
        </center>

        <h1> Fraud Alert. Blacklisted accounts on XRPL</h1>
        <p>
         Fraud can occur on the XRP Ledger (XRPL), just like on any other blockchain, so users must remain vigilant.
        </p>
        <p>
        <li>Always verify the authenticity of any website, wallet, or transaction request. </li>
        <li>Never share your secret keys or phrases. </li>
        <li>Exercise caution regarding scams that promise high returns, offer free XRP giveaways, or impersonate trusted entities.</li>
        <li>If you're uncertain about a transaction or website, use reliable tools to verify the details and protect your assets. </li>

        </p>
        <p>
        On our website, accounts marked with a "Fraud Alert" are flagged as potentially involved in scams, phishing, or other malicious activities. 
        These accounts are highlighted to warn users before they interact with them.
        </p>
        <div>
        <center>
          <img
            src="/images/pages/blacklisted-screen.png"
            alt="Blacklisted Account on XRPL-example"
            style={{ maxWidth: '100%', maxHeight: 386 }}
          />
        </center>
        </div>
        <p>
        <strong>We strongly recommend proceeding with caution when engaging with flagged accounts to ensure the safety of your assets.</strong>
        </p>
        <p>
        Accounts may be flagged with a Fraud Alert if they:
        </p>
        <li>Received stolen funds. </li>
        <li>Are associated with scams (e.g., giveaway scams).</li>
        <li> Send spam transactions or behave maliciously in some way. </li>
        <p>
        We can flag accounts ourselves based on objective user reports or receive fraud alerts through our partners' APIs.
        </p>
      </div>
    </>
  )
}