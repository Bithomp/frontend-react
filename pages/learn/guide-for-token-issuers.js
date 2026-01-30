import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network, server, siteName } from '../../utils'
import { explorerName, xahauNetwork } from '../../utils'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '../../components/Breadcrumbs'
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

export default function GuideForTokenIssuers() {
  return (
    <>
      <SEO
        title="Guide for Token Issuers"
        description="Step-by-step guide for token issuers: register services, verify domains, set up TOML files, add logos, create AMM pools, and and grow your project’s trust."
        noindex={network !== 'mainnet'}
        image={{
          file: '/images/pages/learn/guide-for-token-issuers/cover',
          width: 1520,
          height: 953,
          allNetworks: true
        }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">Guide for {explorerName} Token Issuers</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={'/images/pages/learn/guide-for-token-issuers/cover' + (xahauNetwork ? '-xahau' : '') + '.jpg'}
                alt="Guide for Token Issuers"
                width={1520}
                height={953}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>Guide for {explorerName} Token Issuers</figcaption>
            </figure>
          </div>
          <p>
            So, you’ve successfully created your token on the {explorerName}. What’s next? If you want your token to
            look professional, gain more trust from users, and be discoverable on {siteName} or other platforms which
            are using our API, there are <strong>several important steps </strong>the issuer should take:
          </p>
          <p>A public username makes it easier for users to recognize your project.</p>
          <p>
            Your username will be linked to your address on the Bithomp Explorer, Xahau Explorer and in third-party
            services that use the Bithomp API. This means your project can be easily found by its username on Bithomp,
            Xaman, and other platforms.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              <Link href="/username"> Register a Username for your token</Link>
            </p>
          </div>
          <p>
            <strong>Step 2</strong>
          </p>
          <p>
            <strong>Register Your Service / Project</strong>
          </p>
          <p>
            Businesses and organizations that utilize the Ledger—be it token issuers, NFT marketplaces, meme coin
            projects, exchanges, financial institutions, non-profits, or other service providers can register their
            project on Bithomp. Your account will then be displayed in an enhanced format — including your service name,
            avatar, and social media links.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              <Link href="/submit-account-information"> Submit Your Project / Service Info</Link>
            </p>
          </div>
          <p>
            <strong>Step 3</strong>
          </p>
          <p>
            <strong>Set Up a TOML File</strong>
          </p>
          <p>
            Your web server should serve the {xahauNetwork ? 'xahau-ledger.toml' : 'xrp-ledger.toml'} file at{' '}
            {xahauNetwork ? (
              <>
                https://{'{'}DOMAIN{'}'}/.well-known/xahau.toml.
              </>
            ) : (
              <>
                https://{'{'}DOMAIN{'}'}/.well-known/xrp-ledger.toml.
              </>
            )}
          </p>
          <p>
            Inside this file, you should include your token issuer address under the [[TOKENS]] entry. You can also
            provide additional fields such as description, social media links and image link for your token. This allows
            our explorer to automatically fetch and display all your token’s details.
          </p>
          {!xahauNetwork && (
            <>
              <p>
                Before going live, you can validate your TOML file using a{' '}
                <Link href="https://xrpl.org/resources/dev-tools/xrp-ledger-toml-checker">TOML Checker tool</Link> to
                ensure it’s correctly formatted and recognized.
              </p>
            </>
          )}
          <p>You can see a good working example at:</p>
          {xahauNetwork ? (
            <Link href="https://xrpl-labs.com/.well-known/xahau.toml">
              https://xrpl-labs.com/.well-known/xahau.toml
            </Link>
          ) : (
            <Link href="https://hadanft.com/.well-known/xrp-ledger.toml">
              https://hadanft.com/.well-known/xrp-ledger.toml
            </Link>
          )}
          <p>
            <strong>Step 4 </strong>
          </p>
          <p>
            <strong>Verify Your Domain</strong>
          </p>
          <p>
            Domain verification proves that your address is linked to your domain, and your domain is linked back to
            your address.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              <Link href="/learn/verified-domain"> Follow this guide: Domain Verification</Link>
            </p>
          </div>
          <p>
            <strong>Step 5</strong>
          </p>
          <p>
            <strong>Add or Update a Token Image</strong>
          </p>
          <p>
            A logo or image helps users quickly identify your token across explorers and wallets. Make sure it’s clear,
            professional, and matches your branding.
          </p>
          <p>
            If your account is <strong>not blackholed</strong>, you can easily set or update your logo on:{' '}
            <Link href="/account/">Account Page</Link>. Enter the issuer address or username into the search bar, sign
            in with the token issuer wallet, provide a link to the image you want to use as your token icon, and sign
            the transaction. The image will be displayed on your account page and on your token page.
          </p>
          <p>
            For <strong>blackholed accounts</strong>: if the token icon link is provided in the TOML file, we’ll display
            that image. To ensure your token image looks nice on our website, include a link in your TOML file with a
            resolution of at least 700×700 pixels (but not more than 10 Mb).
          </p>
          If the icon <strong>is non included into the toml</strong>, we’ll fetch the image in the following priority
          order:
          <ul>
            <li>
              X image - if you have registered your project on Bithomp and mentioned your X account (view the point 2
              above)
            </li>
            <li>Gravatar image</li>
            <li>Xaman asset - currency icon</li>
          </ul>
          <p>
            <strong>Step 6</strong>
          </p>
          <p>
            <strong>Monitor Token Stats</strong>
          </p>
          <p>
            You can check the whole statistics about your token (supply, trustlines, holders, markets, etc.) on our
            token explorer here 👉 : <code>https://bithomp.com/en/token/[ISSUER ADDRESS]/[CURRENCY CODE]</code>. Here,{' '}
            <strong>[ISSUER ADDRESS]</strong> is the address of the account that issued the token, and{' '}
            <strong>[CURRENCY CODE]</strong> can be either: a character string such as "EUR" or "USD", “MAG”,
            “MyCurrency’, or a 160-bit hexadecimal string, such as "524C555344000000000000000000000000000000".
          </p>
          {xahauNetwork ? (
            <Link href="https://xahauexplorer.com/en/token/rEvernodee8dJLaFsujS6q1EiXvZYmHXr8/EVR">
              View the example for EVR
            </Link>
          ) : (
            <Link href="https://bithomp.com/en/token/rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De/524C555344000000000000000000000000000000">
              View the example for RLUSD
            </Link>
          )}
          <p>
            <strong>Step 7</strong>
          </p>
          <strong>Share Links to Your Account and Token pages on Your Website</strong>
          <p>
            Make it easy for users to set a trustline for your token, explore and verify it by adding direct links on
            your website:
          </p>
          <ul>
            <li>
              <Link href="/services/trustline">Trustline Setup Link</Link>
            </li>
            <p>
              Simply choose your Token in the drop-down list and copy the link usind the <strong>Share Button</strong>.
              We support several wallets, including Xaman, Ledger, MetaMask, WalletConnect, and others, to securely sign
              the transaction.
            </p>

            <li>
              <Link href="/account">Your {explorerName} Account Page</Link>
            </li>

            <li>
              Your Token info and Statistics:{' '}
              <code>{'https://' + server + '/' + i18n.language + '/token/[ISSUER ADDRESS]/[CURRENCY CODE]'}</code>
            </li>
          </ul>
          <p>
            This way, your community can quickly check balances, transactions, trustlines, and liquidity. Adding these
            links increases transparency and trust in your project.
          </p>
          {!xahauNetwork && (
            <>
              <p>
                <strong>Step 8</strong>
              </p>
              <p>
                <strong>Create an AMM Pool for Your Token</strong>
              </p>
              <p>
                Setting up an Automated Market Maker (AMM) pool can provide greater liquidity and automate the process.
              </p>

              <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
                <p className="text-gray-800 dark:text-gray-200">
                  <span role="img" aria-label="lamp">
                    👉
                  </span>{' '}
                  <Link href="https://bithomp.com/en/services/amm/create">Create AMM Pool</Link>
                </p>
              </div>

              <p>
                However, to make your token tradable on XRPL’s decentralized exchange (DEX), you don’t necessarily need
                an AMM. You can simply place buy and sell orders on the order book, and that will already create a
                market.
              </p>
              <br />
              <br />
            </>
          )}
        </article>
      </div>
    </>
  )
}
