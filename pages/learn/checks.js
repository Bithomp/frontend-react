import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { nativeCurrency, network } from '../../utils'
import { explorerName, xahauNetwork, webSiteName, ledgerName } from '../../utils'
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

export default function Checks() {
  const imagePath = '/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/learn/checks/'
  return (
    <>
      <SEO
        title={'checks explained. Issue, redeem checks on Bithomp'}
        description="Learn how to issue checks and when they are used. Issue and redeem checks on Bithomp."
        noindex={network !== 'mainnet'}
        image={{
          file: '/xrplexplorer/learn/checks/cover.jpg',
          width: 1520,
          height: 855,
          allNetworks: true
        }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">{explorerName} checks Explained</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'cover.jpg'}
                alt="Checks"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
              />
              <figcaption>{explorerName} checks</figcaption>
            </figure>
          </div>
          <p>
            The {ledgerName} offers many powerful features beyond simple payments — including checks, an underutilized
            but highly flexible mechanism for {nativeCurrency} transfers.
          </p>
          <p>
            In this article, we explain what {explorerName} checks are, when and why to use them, and how you can create
            and redeem checks using {xahauNetwork ? 'Xahau Explorer' : 'Bithomp XRP Explorer'}.
          </p>

          <h2>What are checks on the {ledgerName}?</h2>

          <p>
            A Check is a transaction type that allows one account to promise a payment that can be claimed later by a
            designated recipient.
          </p>

          <p>Unlike ordinary payments that settle immediately, a check:</p>

          <ul>
            <li>Is created and stored on-ledger until redeemed or expired</li>
            <li>Requires the intended recipient to claim it — funds do not transfer automatically</li>
          </ul>

          <p>
            A check works like a traditional bank check, but it is created and stored directly on the {ledgerName},
            where its status can be publicly verified.
          </p>

          <h2>When and Why Use checks?</h2>

          <p>
            <strong>Common use cases include:</strong>
          </p>

          <h4>Manual claiming of funds</h4>

          <p>
            checks allow the recipient to decide when to redeem the {nativeCurrency}. The payment does not settle
            automatically — the recipient must claim it.
          </p>

          <p>
            This is useful when a transfer should not be completed immediately, for example pending internal approval or
            recipient confirmation. The funds remain in the sender’s account until the check is redeemed, providing
            flexibility without locking funds in escrow.
          </p>
          <h4>Verifiable payment promises</h4>

          <p>Because the check object exists on-ledger, it acts as a publicly verifiable payment commitment.</p>

          <h4>Deposit authorization restrictions</h4>

          <p>
            If the recipient has enabled Deposit Authorization and does not accept direct payments from unknown
            accounts, a check provides a practical workaround. Instead of sending funds immediately, you issue a check
            that the recipient can explicitly approve and redeem.
          </p>

          <p>
            By the way, if you need to enable or disable the Deposit Authorization flag, you can do so here:{' '}
            <Link href="/services/account-settings">Account settings page</Link>.
          </p>

          <h4>Sending tokens without an existing trustline</h4>

          <p>checks are also useful when the recipient has not yet established a trust line for a specific token.</p>

          <p>
            A direct Payment would fail if the required trust line does not exist. However, a check can still be
            created. Once the recipient sets up the trust line, they can redeem the check using a CheckCash transaction.
          </p>

          <h2>Difference from Escrow</h2>
          <div className="flex justify-center">
            <figure>
              <Image
                src={'/images/pages/learn/checks/checks-escrows.png'}
                alt="Checks vs Escrows"
                width={1520}
                height={1013}
                className="max-w-full h-auto object-contain"
              />
              <figcaption>Checks vs Escrows</figcaption>
            </figure>
          </div>
          <p>
            <strong>Check:</strong> Funds remain in the sender’s account until redeemed. Recipient action is required to
            claim the payment. Flexible and recipient-controlled.
          </p>

          <p>
            <strong>Escrow:</strong> Funds are locked in the ledger until specific conditions (like a time or approval)
            are met. Less flexible, but enforces settlement automatically.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/learn/create-escrow">Learn more about Escrows on {ledgerName}</Link>
            </p>
          </div>
          <h2>How checks Work</h2>

          <h3>1. Creating a check</h3>

          <p>The sender initiates a CheckCreate transaction, specifying all the necessary information.</p>

          <p>
            Once processed, the {ledgerName} creates a check object. This object can later be removed by either the
            sender or recipient using a CheckCancel transaction.
          </p>

          <h3>2. Redeeming a check</h3>

          <p>
            The recipient redeems the check by submitting a CheckCash transaction, which transfers the funds and deletes
            the check object.
          </p>

          <p>
            Because the funds for a check are not reserved, redemption can fail if the sender’s balance is insufficient
            or there isn’t enough liquidity to complete the transfer. In such cases, the check stays on the ledger, and
            the recipient can attempt to cash it again later, either for the same or a different amount. The recipient
            can choose how much of the check to claim, but if he receives less than the full amount on the first
            attempt, there is no second chance to claim the remainder.
          </p>

          <h3>3. Expired checks</h3>

          <p>
            If the recipient does not redeem the check before it expires, the check object remains on the ledger until
            it is canceled by the sender or recipient.
          </p>

          <h2>Create and Redeem checks on {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'}</h2>

          <p>
            {xahauNetwork ? 'Xahau Explorer' : 'Bithomp XRP Explorer'} provides a user-friendly interface for working
            with checks.
          </p>

          <h3>Create a check</h3>

          <p>
            You can issue a check <a href="https://bithomp.com/en/services/check">HERE</a>
            <br />
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'screen.png'}
                alt="Issue a check"
                width={1520}
                height={815}
                className="max-w-full h-auto object-contain"
              />
              <figcaption>Issue check on {ledgerName}</figcaption>
            </figure>
          </div>
          <p>Specify:</p>

          <ul>
            <li>The recipient’s account</li>
            <li>The amount that can be claimed</li>
            <li>An optional expiration period</li>
            <li>Destination tag (if required)</li>
            <li>Memo (will be public)</li>
          </ul>

          <p>This removes the need to manually construct and submit {ledgerName} transactions.</p>
          <p>
            Besides, our PRO Subscribers can also specify a custom transaction fee, Invoice ID, and Source Tag when
            creating a check, under Advanced Options.
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'advanced.png'}
                alt="Advanced options for check creation"
                width={1520}
                height={452}
                className="max-w-full h-auto object-contain"
              />
            </figure>
          </div>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                💡
              </span>{' '}
              <Link href="/admin">Upgrade to Pro Here</Link>
            </p>
          </div>

          <h3>Redeem a check</h3>

          <p>To redeem a check issued to your address:</p>

          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'redeem.png'}
                alt="Redeem a check"
                width={1520}
                height={813}
                className="max-w-full h-auto object-contain"
              />
              <figcaption>Redeem checks on {webSiteName}</figcaption>
            </figure>
          </div>
          <ul>
            <li>
              Visit your <Link href="/account">Account page</Link>
            </li>
            <li>View received checks associated with your address</li>
            <li>Click “Redeem”</li>
            <li>Sign the CheckCash transaction using any of the available signing options.</li>
          </ul>

          <p>After confirmation, {nativeCurrency} is credited to your account.</p>

          <h2>Why Use {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'} for checks?</h2>

          <p>
            Although checks are a native {ledgerName} feature, interacting with them directly can require manual
            transaction construction.
          </p>

          <p>We simplify the process by:</p>

          <ul>
            <li>Offering a user-friendly web interface for quick and easy check creation.</li>
            <li>
              Supporting wallet-based signing (Ledger, Xaman, Gem, MetaMask, WalletConnect, CROSSMARK, and others ).
            </li>
            <li>
              Displaying issued and received checks on your account page which can be immediately redeemed or canceled.
            </li>
          </ul>

          <h2>Final Thoughts</h2>

          <p> checks are a powerful but often overlooked feature of the {ledgerName}. They provide:</p>

          <ul>
            <li>Controlled payment settlement</li>
            <li>Recipient-initiated redemption</li>
            <li>On-ledger verification of payment commitments</li>
          </ul>

          <p>
            For use cases where immediate transfers are not ideal, checks offer a practical alternative without
            requiring complex smart contract logic.
          </p>
          <p>
            🔥 With {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'}, creating and redeeming checks is simple, intuitive,
            and efficient — making advanced {ledgerName} features easy to use for everyone, not just developers.
          </p>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}
