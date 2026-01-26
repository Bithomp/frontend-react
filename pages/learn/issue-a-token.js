import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { nativeCurrency, explorerName, xahauNetwork } from '../../utils'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '../../components/Breadcrumbs'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function IssueAToken() {
  return (
    <>
      <SEO
        title={'How to issue a token on ' + explorerName}
        description="Step-by-step guide on how to issue a token on XRPL or Xahau. Understand XRPL and Xahau tokens, their use cases, and how to get started with tokenization."
        noindex={network !== 'mainnet'}
        image={{ file: '/images/pages/learn/issue-a-token/cover', width: 1520, height: 953, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1>How to Issue a Token on {explorerName}: A Complete Guide</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={'/images/pages/learn/issue-a-token/cover' + (xahauNetwork ? '-xahau' : '') + '.jpg'}
                alt="Issue a token on XRPL and XAHAU"
                width={1520}
                height={953}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>How to issue a token on {explorerName}</figcaption>
            </figure>
          </div>
          {xahauNetwork ? (
            <p>
              The Xahau Ledger is a smart contract-enabled sidechain of the XRPL, introduced in 2023. It brings native
              hooks (smart contract functionality) to the ecosystem, enabling on-chain automation, advanced governance
              mechanisms, and new possibilities for tokenization.
            </p>
          ) : (
            <p>
              The XRP Ledger (XRPL) is the world’s first decentralized exchange (DEX), live since 2012. It was the very
              first blockchain to support issued tokens, and today it remains one of the fastest and most cost-efficient
              platforms for tokenization.
            </p>
          )}
          <p>
            In this guide, you’ll learn how to create a token on {explorerName}, what {explorerName} tokens are, and
            what you can use them for.
          </p>
          <h2>What Are {explorerName} Tokens?</h2>
          <p>
            {explorerName} tokens (also called “issued currencies” or IOUs) are digital assets created on the{' '}
            {explorerName}. They are fungible, which means each unit of the token is interchangeable with another.
          </p>
          <p>
            Tokens are digital assets on the {explorerName} that can stand in for almost any form of value. They can
            represent real-world assets such as stablecoins like the US dollar, precious commodities, loyalty credits,
            or even simple items like a chair, a cup of tea, or an hour of work.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              On our website you can <Link href="/tokens"> explore any {explorerName} token</Link> and access the most
              comprehensive statistics available.
            </p>
          </div>
          {xahauNetwork ? (
            <p>
              For unique assets such as collectibles, digital art, or event tickets, Xahau supports URI tokens, which
              provide a standardized way to represent one-of-a-kind items. While URI tokens are ideal for unique assets,
              fungible tokens remain best suited for currencies, points, or other divisible assets.
            </p>
          ) : (
            <p>
              For unique assets like collectibles or digital art, XRPL also supports non-fungible tokens (NFTs) via the
              XLS-20 standard. NFTs are the better fit for one-of-a-kind assets, while fungible tokens are ideal for
              currencies and points.
            </p>
          )}

          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              View <Link href="/nft-explorer"> the best ever {explorerName} NFT Explorer.</Link>
            </p>
          </div>
          <h2>How to Create a Token on {explorerName}</h2>
          <p>Creating a fungible token is simple and doesn’t require smart contracts. Here’s the basic process:</p>
          <ul>
            <p>
              <strong>Step 1</strong>
            </p>
            <p>Decide what kind of token you want — and whether you actually need one. Start by choosing a name. </p>
            <li>If it’s a utility token, you can issue as many as you like.</li>
            <li>
              If you want a limited supply, you can blackhole the issuing account so that no additional tokens can ever
              be created. <Link href="/learn/blackholed-address"> Learn more about Blackholed Addresses.</Link>
            </li>
            <li>If you plan to issue tokens continuously, it’s best to use a hardware wallet (such as Ledger).</li>
            👉 You can get your Ledger Wallet{' '}
            <Link href="https://shop.ledger.com/?r=8aeb&tracker=iou_issuer">here</Link>.
            <p>
              <strong>Step 2</strong>
            </p>
            <p>
              Set up TWO accounts – one will issue the token (ISSUER ACCOUNT), the other will hold and distribute it
              (CURRENCY DISTRIBUTION ACCOUNT).
            </p>
            <p>
              <strong>Step 3</strong>
            </p>
            Fund both accounts with {nativeCurrency} – each account must meet the {nativeCurrency} reserve requirement.
            <p>
              <strong>Step 4</strong>
            </p>
            <p>
              Enable the <span className="bold">Default rippling</span> on the <span className="bold">ISSUER</span>{' '}
              ACCOUNT. You can do it on the <Link href="/services/account-settings">Account Settings page</Link> (under
              the <span className="bold">Advanced Options</span>).
            </p>
            <p>
              <strong>Step 5</strong>
            </p>
            <p>
              Create a trustline – the receiving account (CURRENCY DISTRIBUTION ACCOUNT) must explicitly trust the
              issuing account to hold its token. This trustline must be created with <i>Rippling</i> enabled. You can do
              it <Link href="/services/trustline?mode=advanced&noRipple=false">here</Link>.
            </p>
            <p>
              <strong>Step 6</strong>
            </p>
            <p>
              Send a payment transaction – the ISSUER ACCOUNT sends a payment of the new token to the CURRENCY
              DISTRIBUTION ACCOUNT. This action creates the token on the ledger. You can do it{' '}
              <Link href="/services/send">HERE.</Link>
            </p>
            <p>
              {' '}
              💡 Please note: You must be logged in with the ISSUER ADDRESS. The token you intend to send will then be
              available in the token selector.
            </p>
            <p>
              <strong>Step 7</strong>
            </p>
            <p>
              Follow the guidence to register your token and make it representable.{' '}
              <Link href="/learn/guide-for-token-issuers">Guidence for token issuers.</Link>
            </p>
            <p></p>
            <p>
              <strong>Step 8</strong>
            </p>
            <p>
              Users can now create trustlines to your ISSUER ACCOUNT to hold your token. You can share a link to Simple
              mode (where Rippling is disabled). Get your Trust Set link for your token{' '}
              <Link href="/services/trustline">here</Link>.
            </p>
            <p>
              <strong>Step 9</strong>
            </p>
            <p>
              Now you can distribute your token from the CURRENCY DISTRIBUTION ACCOUNT. You can send payments, create
              orders on DEX
              {!xahauNetwork && (
                <>
                  {' '}
                  or set up an AMM (Automated Market Maker) to create a market for your token.{' '}
                  <Link href="https://bithomp.com/en/services/amm/create">Create an AMM here</Link>
                </>
              )}
              .
            </p>
            <p>
              <strong>Your token on the {explorerName} is issued! 🎉 </strong>
            </p>
          </ul>
          <h3>Why Trustlines Are Important?</h3>
          <p>
            A trustline is a built-in safety feature. Users must opt in to accept a token from a specific issuer. This
            prevents spam and ensures that you only hold tokens from sources you trust. For example, users will likely
            trust {xahauNetwork ? 'EVR issued by Evernode' : 'RLUSD issued by Ripple'} more than tokens issued by an
            unknown individual.
          </p>
          <h2>Common Scenarios for {explorerName} Tokens</h2>
          <ol>
            <li>
              <strong>Meme or Community Tokens</strong>
            </li>
            <p>Often the first step for new projects. Fun, simple, and great for community engagement.</p>
            <li>
              <strong>Fiat-Backed Stablecoins</strong>
            </li>
            Banks or payment providers can issue fiat-backed stablecoins. The recommended setup uses:
            <ul>
              <li>A cold (issuer) account – the secure account that creates tokens.</li>
              <li>A hot (operational) account – the account that distributes tokens to customers.</li>
              This model protects the issuer while enabling smooth day-to-day operations.
            </ul>
            <li>
              <strong>Fixed Supply Tokens</strong>
            </li>
            Communities or projects can issue tokens with a capped supply. Once distributed, the issuer account can be
            blackholed (keys destroyed), ensuring that no additional tokens can ever be minted.
          </ol>
          <h3>What You Can Do With Your {explorerName} Token</h3>
          <p>Once issued, your {explorerName} token is a full participant in the network:</p>
          <ul>
            <li>Trade it on {explorerName}’s decentralized exchange (DEX) </li>
            <li>Swap it for {nativeCurrency} or other issued assets </li>
            <li>Use it in loyalty or community programs</li>
            <li>Store and transfer it using {explorerName}-compatible wallets </li>
          </ul>
          <p>
            For unique assets such as artwork, collectibles, or event tickets, you can issue NFTs on {explorerName}{' '}
            instead of fungible tokens.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/learn/nft-minting"> View How to Mint NFTs on {explorerName}.</Link>
            </p>
          </div>
          <h3> Advantages of {explorerName} for Tokenization </h3>
          <ul>
            <li>Speed – transactions settle in 3–5 seconds</li>
            <li> Low fees – {xahauNetwork ? '0.000027 XAH' : '0.000012 XRP'} </li>
            <li> No smart contracts needed – tokenization is a native feature</li>
            <li>Security through trustlines – users choose which tokens to hold</li>
          </ul>
          <p>
            Creating a token on {explorerName} is fast, secure, and cost-efficient. Whether you’re building a memecoin,
            stablecoin, loyalty program, or governance system, {explorerName} provides the tools to do it with minimal
            complexity.
          </p>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}
