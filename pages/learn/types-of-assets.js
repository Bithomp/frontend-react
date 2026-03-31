import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network, nativeCurrency, explorerName, xahauNetwork } from '../../utils'
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

export default function TypesOfAssets() {
  const imagePath = '/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/learn/types-of-assets/'
  return (
    <>
      <SEO
        title="Types of assets: native asset, issued tokens, stablecoins, utility tokens, memecoins, RWA tokens, NFTs"
        description="Learn about the different types of assets, including the native asset, issued tokens, stablecoins, utility tokens, memecoins, RWA tokens, and NFTs. Understand their characteristics, use cases, and how they differ from each other."
        noindex={network !== 'mainnet'}
        image={{
          file: '/xrplexplorer/learn/types-of-assets/cover.png',
          width: 1520,
          height: 855,
          allNetworks: true
        }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">Asset Types on {explorerName}: Native Asset, Issued Tokens, NFTs.</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'cover.png'}
                alt="Types of assets: native asset, issued tokens, NFTs"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
              />
              <figcaption>{explorerName} assets</figcaption>
            </figure>
          </div>
          <p>
            The {explorerName} has a fundamentally different asset architecture compared to smart-contract blockchains.
            Understanding the distinction between the native asset and issued tokens is essential for risk assessment,
            liquidity analysis, and infrastructure development.
          </p>
          <p>This guide explains the core asset categories on {explorerName}.</p>
          <h2>Native Asset: {nativeCurrency}</h2>
          <p>
            The only native asset (native coin) is {nativeCurrency}. {nativeCurrency} is built directly into the
            protocol and has no issuer.
          </p>
          <h3>Technical properties</h3>
          <ul>
            <li>Used to pay transaction fees (fees are burned).</li>
            <li>Required as base reserve for accounts and ledger objects.</li>
            <li>Does not require a Trust Line.</li>
            <li>Cannot be frozen or clawed back.</li>
            <li>Can act as a bridge asset for auto-bridging in the DEX.</li>
            <li>Can participate in AMM pools</li>
          </ul>
          <p>
            <strong>All other assets are issued tokens.</strong>
          </p>
          <h2>Issued Tokens (IOUs)</h2>
          <p>
            All non-{nativeCurrency} assets on {explorerName} are issued tokens, historically referred to as IOUs. An
            issued token represents a balance issued by a specific account (the issuer). Holding such a token requires
            establishing a Trust Line to that issuer.
          </p>
          <h3>Core mechanics</h3>
          <ul>
            <li>Created by an issuer account.</li>
            <li>Transferable between accounts with trust.</li>
            <li>Tradable on the built-in order book DEX.</li>
            <li>Usable in AMM pools.</li>
            <li>
              May enable issuer-controlled features:
              <ul>
                <li>Freeze (if configured)</li>
                <li>Global Freeze (if configured)</li>
                <li>Clawback (if configured)</li>
              </ul>
            </li>
          </ul>
          <p>Issued tokens are not coins:</p>
          <ul>
            <li>They are not used for transaction fees.</li>
            <li>They depend on issuer configuration and counterparty risk.</li>
          </ul>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/tokens"> View all {explorerName} Tokens</Link>
            </p>
          </div>
          <h2>Non-Fungible Tokens (NFTs)</h2>
          <p>
            Non-fungible tokens (NFTs) represent unique digital or physical assets, such as artwork or in-game items. On
            {explorerName}, NFTs are implemented as NFToken objects — indivisible, unique units not used for payments.
          </p>
          <h3>Characteristics</h3>
          <ul>
            <li>Don't require a Trust Line.</li>
            <li>Cannot be frozen or clawed back.</li>
            <li>Can be minted, held, bought, sold, transferred and burned.</li>
            <li>
              Traded using NFT SellOffer and BuyOffer transactions on NFT marketplaces, not through the ledger’s
              standard order book DEX.
            </li>
            <li>Cannot participate in AMM pools.</li>
          </ul>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/learn/nft-minting"> Learn how to mint NFTs on {explorerName}</Link>
            </p>
          </div>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/learn/nft-explorer"> Learn more about our {explorerName} NFT explorer</Link>
            </p>
          </div>
          <p>Every token category below is a subtype of issued tokens.</p>
          <h2>Stablecoins on {explorerName}</h2>
          <p>
            A stablecoin is an issued token designed to maintain a price peg (typically to fiat such as USD or EUR).
          </p>
          <h3>Characteristics</h3>
          <ul>
            <li>Implemented as a standard issued token.</li>
            <li>Requires a Trust Line.</li>
            <li>May include Freeze and Clawback features.</li>
            <li>Trades on the native DEX.</li>
            <li>Can participate in AMM pools.</li>
          </ul>
          <p>
            {explorerName} does not implement a special stablecoin standard. A stablecoin is economically defined, not
            technically distinct.
          </p>
          <p>Examples of {explorerName} stablecoins:</p>

          {xahauNetwork ? (
            <ul>
              <li>
                <Link href="/token/rDk1xiArDMjDqnrR2yWypwQAKg4mKnQYvs/4555525100000000000000000000000000000000">
                  EURQ issued by Quantoz
                </Link>
              </li>
            </ul>
          ) : (
            <ul>
              <li>
                <Link href="https://bithomp.com/en/token/rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De/524C555344000000000000000000000000000000">
                  RLUSD issued by Ripple
                </Link>
              </li>
              <li>
                <Link href="https://bithomp.com/en/token/rGm7WCVp9gb4jZHWTEtGUr4dd74z2XuWhE/5553444300000000000000000000000000000000">
                  USDC issued by Circle
                </Link>
              </li>
              <li>
                <Link href="https://bithomp.com/en/token/rB3y9EPnq1ZrZP3aXgfyfdXQThzdXMrLMc/5553444200000000000000000000000000000000">
                  USDB issued by Braza Bank
                </Link>
              </li>
              <li>
                <Link href="https://bithomp.com/en/token/rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK/4555524F50000000000000000000000000000000">
                  EurØp issued by Schuman Financial
                </Link>
              </li>
              <li>
                <Link href="https://bithomp.com/en/token/rK67JczCpaYXVtfw3qJVmqwpSfa1bYTptw/5853474400000000000000000000000000000000">
                  XSGD issued by StraitsX
                </Link>
              </li>
            </ul>
          )}
          <h2>Utility Tokens</h2>
          <p>
            A utility token on {explorerName} is an issued token that grants access to a service, platform, or
            functionality. We should keep in mind: {explorerName} does not support protocol-level utility tokens. All
            non-native assets derive their utility from application-layer logic.
          </p>
          <h3>Examples of utility models:</h3>
          <ul>
            <li>Access to platform features.</li>
            <li>Discount mechanisms.</li>
            <li>Governance voting (off-ledger or hybrid).</li>
            <li>Payment token within an ecosystem.</li>
          </ul>
          <p>Technical properties are identical to other issued tokens:</p>
          <ul>
            <li>Trust Line required.</li>
            <li>Subject to issuer configuration.</li>
            <li>Tradable on DEX unless restricted.</li>
          </ul>
          <p>
            There is no protocol-level distinction between a utility token and any other issued token. The difference is
            purely functional.
          </p>
          {!xahauNetwork && (
            <>
              <p>Examples of utility tokens:</p>
              <ul>
                <li>
                  <Link href="https://bithomp.com/en/token/rKDsnVfFMzdqrU8Bqno37d29L8ZW3hvrf8/5574696C69746558000000000000000000000000">
                    UtiliteX issued by eolas
                  </Link>
                </li>
                <li>
                  <Link href="https://bithomp.com/en/token/rrno7Nj4RkFJLzC4nRaZiLF5aHwcTVon3d/OXP">
                    OXP issued by bidds
                  </Link>
                </li>
                <li>
                  <Link href="https://bithomp.com/en/token/rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr/CSC">
                    CSC issued by CasinoCoin
                  </Link>
                </li>
                <li>
                  <Link href="https://bithomp.com/en/token/r421CokCfwPxabbdXzCJ77vHkw6eAUWXua/VVT">
                    VVT issued by Virovita Token
                  </Link>
                </li>
              </ul>
            </>
          )}
          <h2>Memecoins</h2>
          <p>
            A memecoin on {explorerName} is an issued token driven primarily by community narrative rather than
            fundamental utility.
          </p>
          <h3>Technical characteristics:</h3>
          <ul>
            <li>Standard issued token structure.</li>
            <li>Often high supply concentration.</li>
            <li>Liquidity may be shallow or volatile.</li>
          </ul>
          <p>From a protocol perspective, a memecoin is indistinguishable from any other issued token.</p>
          <p>The classification is social and market-driven, not architectural.</p>
          <p>Risk analysis should focus on:</p>
          <ul>
            <li>Issuer account controls.</li>
            <li>Distribution concentration.</li>
            <li>Liquidity depth on DEX and AMM.</li>
            <li>Historical transaction patterns.</li>
          </ul>
          {!xahauNetwork && (
            <>
              <p>Examples of XRPL memcoins</p>
              <ul>
                <li>
                  <Link href="https://bithomp.com/en/token/rhCAT4hRdi2Y9puNdkpMzxrdKa5wkppR62/46555A5A59000000000000000000000000000000">
                    FUZZY issued by Fuzzybear
                  </Link>
                </li>
                <li>
                  <Link href="https://bithomp.com/en/token/rJMtvf5B3GbuFMrqybh5wYVXEH4QE8VyU1/586F676500000000000000000000000000000000">
                    Xoge
                  </Link>
                </li>
              </ul>
            </>
          )}
          <h2>RWA on {explorerName}</h2>
          <p>
            A Real-World Asset (RWA) token is an issued token that represents a legally enforceable claim on an
            off-ledger asset.
          </p>
          <p>
            On {explorerName}, there is no special “RWA token standard.” An RWA is implemented as a standard issued
            token, but its classification depends on the economic and legal structure behind it.
          </p>
          <p>RWA tokens represent tokenized real-world assets such as:</p>
          <ul>
            <li>Fiat deposits</li>
            <li>Commodities</li>
            <li>Securities</li>
            <li>Real estate</li>
            <li>Bonds</li>
          </ul>
          <p>{explorerName}’s design is particularly suited for RWA issuance because:</p>
          <ul>
            <li>Settlement is fast (~3–5 seconds).</li>
            <li>Fees are minimal.</li>
            <li>The DEX and AMM are native to the protocol.</li>
            <li>Counterparty relationships are explicit via Trust Lines.</li>
          </ul>
          <h2>Key Takeaways</h2>
          <ul>
            <li>
              {explorerName} has one native asset: {nativeCurrency}.
            </li>
            <li>All other assets are issued tokens.</li>
            <li>
              Stablecoins, utility tokens, memecoins, and RWA tokens are economic classifications, not protocol-level
              asset types.
            </li>
            <li>Risk exposure in {explorerName} token ecosystems is primarily issuer-based, not protocol-based.</li>
            <li>
              Understanding this distinction is essential for accurate asset evaluation, custody decisions, liquidity
              analysis, and infrastructure development within {explorerName}.
            </li>
          </ul>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}
