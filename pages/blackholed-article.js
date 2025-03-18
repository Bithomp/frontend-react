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

export default function BlackholedArticle() {
  return (
    <>
      <SEO
        title="Blackholed Accounts on XRPL"
        description="What are blachkoled addresses on XRP Ledger, why they are important, how accounts become blackholed."
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/blackholed-picture.jpg', width: 1024, height: 512, allNetworks: true }}
      />
      <div className="content-center">
        <center>
          <img
            src="/images/pages/blackholed-picture.jpg"
            alt="Blackholed Accounts on XRPL"
            style={{ maxWidth: '100%', maxHeight: 386 }}
          />
        </center>

        <h1> What Are Blackholed Addresses on XRPL?</h1>
        <p>
        Blackholed addresses are XRP Ledger (XRPL) wallet addresses from which funds can never be retrieved or spent. 
        These addresses are <strong>permanently unmanageable,</strong> making it impossible to sign transactions from them. 
        As a result, any XRP held in these addresses is permanently removed from circulation and <strong>no more tokens can be issued from them</strong>.
        Blackholed addresses can be created intentionally for specific purposes or occur unintentionally due to various reasons.
        </p>
        <p>
        One primary reason for blackholing an account is to prevent misuse or unauthorized access. 
        This is particularly important for token issuers who want to ensure that <strong> no one can modify token settings or freeze assets </strong> after issuance. 
        By blackholing the issuing account, they demonstrate that the token supply is <strong>immutable and free from central control</strong>.
        </p>
        <p>
        An account becomes blackholed by <strong>disabling the master key</strong> and <strong>setting its regular key to a special publicly known blackholed address</strong> like <a href="https://bithomp.com/en/account/rrrrrrrrrrrrrrrrrrrrBZbvji">rrrrrrrrrrrrrrrrrrrrBZbvji</a>. 
        If <strong>no active signer list </strong> is assigned, the account is completely inaccessible.
        </p>
        <div>
        <center>
          <img
            src="/images/pages/blackholed-screen.png"
            alt="Blackholed Account on XRPL-example"
            style={{ maxWidth: '100%', maxHeight: 386 }}
          />
        </center>
        </div>
        <p>
        Let’s view one of the examples of a blackholed account and how it is highlighted on our website. As you can see, we mention that:
        </p>
        <li>this account is blackholed, </li>
        <li>when exactly it was blackholed, </li>
        <li> its master key is disabled, </li>
        <li> its regular key is set to one of the special publicly known addresses on XRPL.</li>
        <h1>Special Addresses on XRPL</h1>
        <p>The XRP Ledger includes several publicly known blackholed addresses:</p>
        <p>1. Address: <strong><a href="https://bithomp.com/en/account/rrrrrrrrrrrrrrrrrrrrrhoLvTp">rrrrrrrrrrrrrrrrrrrrrhoLvTp</a></strong></p>
        <p>Name: <strong>ACCOUNT_ZERO</strong> </p>
        <p>Meaning: The base58 encoding of the value 0 in the XRP Ledger. Used by rippled as the issuer for XRP in peer-to-peer communications.</p> 
        <p>2. Address: <strong><a href="https://bithomp.com/en/account/rrrrrrrrrrrrrrrrrrrrBZbvji">rrrrrrrrrrrrrrrrrrrrBZbvji</a></strong></p>
        <p>Name: <strong>ADDRESS_ONE</strong> </p>
        <p>Meaning: The base58 encoding of the value 1 in the XRP Ledger. Used as a placeholder for the issuer of a trust line balance in RippleState entries.</p> 
        <p>3. Address: <strong><a href="https://bithomp.com/en/account/rrrrrrrrrrrrrrrrrNAMEtxvNvQ">rrrrrrrrrrrrrrrrrNAMEtxvNvQ</a></strong></p>
        <p>Name: <strong>Ripple Name Black-hole</strong> </p>
        <p>Meaning: Previously used by Ripple to reserve Ripple Names by requiring users to send XRP to this account.</p> 
        <p>4. Address: <strong><a href="https://bithomp.com/en/account/rrrrrrrrrrrrrrrrrrrn5RM1rHd">rrrrrrrrrrrrrrrrrrrn5RM1rHd</a></strong></p>
        <p>Name: <strong>NaN Address</strong> </p>
        <p>Meaning: Generated by older versions of ripple-lib when encoding NaN using the XRP Ledger's base58 string encoding format.</p> 

        <h3>Conclusion</h3>
        <p>
        Blackholed addresses serve an important role in the XRPL ecosystem by enhancing security, enforcing immutability, and affecting the overall token supply. 
        By permanently locking accounts, projects can ensure decentralization and prevent unauthorized modifications. While blackholing is a useful tool, it should be done with careful consideration, as the process is irreversible.
        </p>
      </div>
    </>
  )
}
