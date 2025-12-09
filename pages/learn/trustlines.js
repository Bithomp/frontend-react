import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { ledgerName, network, siteName } from '../../utils'
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
  const imagePath = '/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/learn/trustlines/'
  return (
    <>
      <SEO
        title="Set Trustline"
        description="How trustlines work on {explorerName} and how to set them up"
        noindex={network !== 'mainnet'}
        image={{
          file: '/public/images/xrplexplorer/learn/trustlines/cover.jpg',
          width: 1520,
          height: 855,
          allNetworks: true
        }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">Trustlines on {explorerName}</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'cover.jpg'}
                alt="Set Trustline"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>Set Trustline on {explorerName}</figcaption>
            </figure>
          </div>
          <p>
            In the {ledgerName} ecosystem, trustlines are one of the most important concepts — especially for anyone
            working with issued tokens (IOUs). If you want to hold tokens on {explorerName}, you must first create a
            trustline. In this guide, we’ll explain what a trustline is, why trustlines matter, and how to add it in
            just a few clicks using {siteName}.
          </p>
          <h2>What Is a Trustline on {ledgerName} ?</h2>
          <p>
            A trustline on the {ledgerName} is a connection between two accounts that specifies the maximum amount of an
            issued asset (IOU) one account is willing to hold from a particular issuer.
          </p>
          <ul>
            A trustline tells the ledger two things:
            <li>Which issuer you trust to hold IOUs from</li>
            <li>How much of that issued token you are willing to hold</li>
          </ul>
          <p>
            Trustlines protect you by preventing anyone from sending you ‘spam’ tokens. Without an approved trustline,
            issued tokens cannot appear on your balance.
          </p>
          <h3>Why Trustlines Are Important</h3>
          <ul>
            Trustlines help maintain:
            <li>Control — you define limits for how much of a token you’re willing to accept.</li>
            <li>Transparency — you always know which assets your wallet interacts with.</li>
            <li>Stability — they prevent “token flooding” and wallet spam common in other networks.</li>
          </ul>
          <h2>Setting Up {ledgerName} Trustlines</h2>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              <Link href="/services/trustline">Here you can add a trustline to any {ledgerName} token</Link>
            </p>
          </div>
          <p>
            In this simple mode you just need to choose the required token from the drop-down list and sign the
            transaction. The Limit will be set to the total supply.{' '}
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'screen-simple.png'}
                alt="Set Trustline"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>Set Trustline on {explorerName}</figcaption>
            </figure>
          </div>
          If you need more control over your trustline settings — for example, changing the limit or enabling/disabling
          specific flags such as Rippling, Freeze, Deep Freeze, and others — you can switch to our Advanced Mode.
          <p>
            <Link href="/services/trustline?mode=advanced">In Advanced Mode</Link>, you can customize your trustline and
            even create a trustline for a token that doesn’t exist yet. This is useful if you're willing to issue a new
            token on {ledgerName}.
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'screen-advanced.png'}
                alt="Set Trustline"
                width={2376}
                height={2786}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>Customize Trustline on {explorerName}</figcaption>
            </figure>
          </div>
          <p>
            If you're planning to launch your own token, you can follow our{' '}
            <Link href="/learn/issue-a-token"> step-by-step guide on how to issue a token on {explorerName}. </Link>
          </p>
          <h3>Trustline Flags Explained</h3>
          <p>
            When setting a trustline through Advanced Mode, you may need to adjust specific trustline flags or
            parameters. These flags control how your issued tokens behave and how other accounts can interact with them.
            Here’s a clear explanation of each option:
          </p>
          <h4>Rippling</h4>
          <p>Controls the indirect movement of funds across trustlines.</p>
          <p>
            <strong>Recommended:</strong> Disable unless you are a token issuer managing liquidity or advanced routing.
          </p>
          <p>
            When disabled, your balance cannot be used to “ripple through” to facilitate exchanges between other
            trustlines.
          </p>
          <h4>Freeze</h4>
          <p>
            Prevents the counterparty from sending the frozen currency to other users, but they can still return the
            tokens to the issuer.
          </p>
          <p>Useful for controlling misuse or suspicious activity.</p>
          <p>Can be reversed.</p>
          <h4>Deep Freeze</h4>
          <p>A stronger version of Freeze.</p>
          <p>The counterparty cannot receive any additional funds until the trustline is unfrozen.</p>
          <p>Requires a standard Freeze to be applied first.</p>
          <p>
            Cannot be used if the issuer has enabled <strong>No Freeze</strong> on their account.
          </p>
          <h4>Authorize</h4>
          <p>Grants explicit permission for a counterparty to hold the currency issued by your account.</p>
          <p>Required for authorized tokens, often used by financial institutions or compliance-focused projects.</p>
          <p>Once authorization is enabled on a trustline, it cannot be revoked.</p>
          <h4>Quality Settings (QualityIn and QualityOut)</h4>
          <p>
            Quality settings define the exchange rate for a trustline and determine how much of the asset is transferred
            during incoming or outgoing transactions.
          </p>
          <h5>QualityIn</h5>
          <p>Percentage of incoming funds retained by the sender.</p>
          <p>
            <em>Example:</em> If QualityIn is set to 1%, then when someone sends you 100 units, 1 unit is kept and you
            receive 99.
          </p>
          <h5>QualityOut</h5>
          <p>Percentage of outgoing funds kept by the issuer.</p>
          <p>
            <em>Example:</em> If QualityOut is set to 1%, sending 100 units results in the recipient receiving 99, while
            1 unit is retained.
          </p>
          <p>
            These are <strong>not token transfer fees</strong> — they are part of {ledgerName}'s built-in trustline
            quality mechanics and affect exchange rates rather than applying a fee to the transaction. A default value
            of <strong>0</strong> means the token is exchanged at face value, with no percentage retained.
          </p>
          <h2>Share Button — Send Ready-to-Use Trustline Links</h2>
          <h3>Share Trustlines Easily</h3>
          <p>
            If you’re a token issuer, community manager, developer, or simply helping someone set up a wallet, the{' '}
            <strong>Share</strong> button will save you time.
          </p>
          <p>With one click, you can:</p>
          <ul>
            <li>Generate a link to a prefilled trustline,</li>
            <li>Share it with a user,</li>
            <li>And they’ll open a ready-to-submit trustline form instantly.</li>
          </ul>
          <p>No manual typing, no mistakes — just fast and accurate onboarding.</p>
          <h3>Why Use {siteName} for Trustlines?</h3>
          <ul>
            <li>Fast trustline creation for any token</li>
            <li>Sign transactions with Ledger, Xaman, Gem Wallet, MetaMask, and more</li>
            <li>Beginner-friendly interface</li>
            <li>Advanced settings for experienced users</li>
            <li>Easy sharing with auto-generated links</li>
          </ul>
          <p>
            {siteName} offers the fastest and most user-friendly way to add trustlines on {explorerName} — from simple
            mode to advanced flag settings and shareable trustline links. Whether you're a beginner or an experienced
            issuer, {siteName} gives you all the tools you need to manage trustlines securely.
          </p>
          <h3>FAQ</h3>
          <h4>Do I need a trustline to hold any {explorerName} token on my account?</h4>
          <p>Yes. Without a trustline, your wallet can't hold any incoming issued token (IOU).</p>
          <h4>Can I remove or edit a trustline later?</h4>
          <p>Yes.</p>
          <ul>
            <li>You can update the trustline limit or enable/disable flags at any time.</li>
            <li>
              To completely remove a trustline, the balance must be <strong>0</strong> and the settings reset to
              default.
            </li>
            <li>
              If the balance is not 0, you can still “burn” remaining tokens by sending them back to the issuer. Once
              the balance reaches 0 and the settings are reset, the trustline can be removed.
            </li>
            <li>
              When a trustline is removed, the reserved {nativeCurrency} is released back to your available balance.
            </li>
          </ul>
          <h4>Does creating a trustline cost {nativeCurrency}?</h4>
          <p>Yes.</p>
          <ul>
            <li>
              Each trustline requires an owner reserve of <strong>0.2 {nativeCurrency}</strong>.
            </li>
            <li>This amount is not spent — it is simply locked while the trustline exists.</li>
            <li>
              For new accounts, {xahauNetwork ? 'Xahau' : 'XRPL'} provides a “trustline credit”: your first two
              trustlines do not immediately require additional {nativeCurrency} from your balance.
            </li>
            <li>
              Note: this is a credit, not a free gift — when you create a third trustline, the reserve must be paid
              upfront.
            </li>
            <li>
              When you delete a trustline, the 0.2 {nativeCurrency} reserve is released back to your usable balance.
            </li>
          </ul>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}
