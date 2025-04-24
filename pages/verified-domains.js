import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../components/SEO'
import { getIsSsrMobile } from '../utils/mobile'
import { network } from '../utils'
import { explorerName, ledgerName, xahauNetwork } from '../utils'
import Link from 'next/link'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function VerifiedDomains() {
  return (
    <>
      <SEO
        title={'Verified Domains on ' + explorerName}
        description="What are verified domains on {explorerName}, how to set and verify domain"
        noindex={network !== 'mainnet'}
        image={{ file: 'pages/verified-domains/green-checkmark.jpg', width: 'auto', height: 'auto', allNetworks: true }}
      />
      <div className="content-center">
        <center>
          <img
            src="/images/pages/verified-domains/green-checkmark.jpg"
            alt="Verified Domains"
            style={{ width: '100%', height: 'auto', maxHeight: 500 }}
          />
        </center>
        <h1>{explorerName} Domain Verification</h1>
        <p>
          The idea of domain verification is to prove that the same entity operates a particular {explorerName} address
          and a particular domain.
        </p>
        <p>
          You may desire to verify your domain in the name of transparency, in order to become a trusted {explorerName}{' '}
          service operator.
        </p>
        <p>
          Anyone can set any domain for their {explorerName} address. Therefore, for domain verification, a two-way link
          between the domain operator and the address must be established.
        </p>
        <ul>
          <li>
            <strong>The domain should claim ownership of the address.</strong>
          </li>
          <li>
            <strong>The address should claim ownership by the domain.</strong>
          </li>
        </ul>
        <h2>Domain claims to own an address</h2>
        <p>
          Your web server should serve {xahauNetwork ? 'a' : 'an'} {ledgerName}-ledger.toml file, available at the
          following URL:
        </p>
        <pre>
          <code>
            https://{'{'}DOMAIN{'}'}/.well-known/{xahauNetwork ? 'xahau' : 'xrp-ledger'}.toml
          </code>
        </pre>
        <p>
          The address you want to verify should be specified under the <code>[[ACCOUNTS]]</code>entry.
        </p>
        <p>
          <strong>Example of toml file:</strong>
        </p>
        <p>
          <strong>
            <Link
              href={
                xahauNetwork
                  ? 'https://xahau.xrpl-labs.com/.well-known/xahau.toml'
                  : 'https://bithomp.com/.well-known/xrp-ledger.toml'
              }
            >
              {xahauNetwork
                ? 'https://xahau.xrpl-labs.com/.well-known/xahau.toml'
                : 'https://bithomp.com/.well-known/xrp-ledger.toml'}
            </Link>
          </strong>
        </p>
        <p>
          {!xahauNetwork && (
            <>
              Please read and follow the instructions described in{' '}
              <a href="https://xrpl.org/docs/references/xrp-ledger-toml">
                <strong>XRPL TOML</strong>
              </a>
              .
            </>
          )}
        </p>
        <h2>Address claims to be owned by a domain</h2>
        <p>
          To set a domain go to <Link href="/domains/">Verified Domains</Link>, press set domain and sign in the
          transaction.
        </p>
        <center>
          <img
            src="/images/pages/verified-domains/domains-screen.png"
            alt="Verified Domains"
            style={{ width: '100%', height: 'auto', maxHeight: 500 }}
          />
        </center>
        <p>
          Once the domain is set, you can easily change or delete it anytime you need on your{' '}
          <Link href="/account/">Account Page</Link> (you need to be signed in).
        </p>
        <center>
          <img
            src={'/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/verified-domains/screen-account-page.png'}
            alt="Verified Domains"
            style={{ width: '100%', height: 'auto', maxHeight: 500 }}
          />
        </center>
        <h2>Verified domains on our website</h2>
        <p>
          On our website you can find <Link href="/domains/">the list of all verified domains on {explorerName}</Link>.
        </p>
        <p>
          <strong>Examples of accounts with verified domains:</strong>
        </p>
        <p>
          <Link
            href={
              xahauNetwork
                ? '/account/rwUAi9ErV3wqgPdPj5qJdhBegJ3SPEvG9Y'
                : '/account/rKontEGtDju5MCEJCwtrvTWQQqVAw5juXe'
            }
          >
            {xahauNetwork ? 'rwUAi9ErV3wqgPdPj5qJdhBegJ3SPEvG9Y' : 'rKontEGtDju5MCEJCwtrvTWQQqVAw5juXe'}
          </Link>
        </p>
        <p>
          <Link
            href={
              xahauNetwork
                ? '/account/rNqe9wrMJM3D6hwcTtNmYTtfcjbHsHRDSg'
                : '/account/rN8FigZNyfEdnve68oPFAeHymsjDaTSN3p'
            }
          >
            {xahauNetwork ? 'rNqe9wrMJM3D6hwcTtNmYTtfcjbHsHRDSg' : 'rN8FigZNyfEdnve68oPFAeHymsjDaTSN3p'}
          </Link>
        </p>
        <p>
          <Link
            href={
              xahauNetwork
                ? '/account/rD74dUPRFNfgnY2NzrxxYRXN4BrfGSN6Mv'
                : '/account/rs5wxrBTSErywDDfPs5NY4Zorrca5QMGVd'
            }
          >
            {xahauNetwork ? 'rD74dUPRFNfgnY2NzrxxYRXN4BrfGSN6Mv' : 'rs5wxrBTSErywDDfPs5NY4Zorrca5QMGVd'}
          </Link>
        </p>
        <p>
          Bithomp {ledgerName} explorer shows verified domains in the “Ledger Data” block as clickable links in a green
          colour and a checkmark next to them.
        </p>
        <center>
          <img
            src={
              '/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/verified-domains/checkmark-example-screen.png'
            }
            alt="Verified Domains"
            style={{ width: '100%', height: 'auto', maxHeight: 500 }}
          />
        </center>
        <p>
          Our system re-verifies every verified domain every 24 hours to make sure that we only show checkmark for
          currently two-way linked addresses to domains.
        </p>
        <p>
          We recommend you to upload a toml file first and make sure it's valid and then to set a domain on your{' '}
          {explorerName} account, in that order your domain will be shown as verified within a minute on our website,
          otherwise it can take up to 24 hours to get verified.
        </p>
        <br />
      </div>
    </>
  )
}
