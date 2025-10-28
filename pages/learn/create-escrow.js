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

export default function CreateEscrow() {
  const serverUrl = ['mainnet', 'testnet', 'devnet'].includes(network) ? 'bithomp.com' : 'xahauexplorer.com'

  return (
    <>
      <SEO
        title={'How to create an escrow on ' + explorerName}
        description="Step-by-step guide on how to create an escrow on XRPL or Xahau. Understand XRPL and Xahau escrows, their use cases."
        noindex={network !== 'mainnet'}
        image={{ file: '/images/pages/learn/create-escrow/cover', width: 1520, height: 855, allNetworks: true }}
        canonical={serverUrl + '/create-escrow'}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1>How to Create Escrows on {explorerName}: A Complete Guide</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={'/images/pages/learn/create-escrow/cover' + (xahauNetwork ? '-xahau' : '') + '.jpg'}
                alt="Create an escrow on XRPL and Xahau"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>How to create an escrow on {explorerName}</figcaption>
            </figure>
          </div>
          <h2>What is an Escrow?</h2>
          <p>
            An escrow is a secure payment mechanism on the {explorerName}. Instead of sending funds directly, the sender
            places them into escrow with specific release conditions. The funds remain locked on the blockchain until:
          </p>
          <ul>
            <li>
              a certain date and time has passed (<strong>time-based escrow</strong>), or
            </li>

            <li>
              a cryptographic condition is fulfilled (<strong>condition-based escrow</strong>).
            </li>
          </ul>

          <p>
            If <strong>the conditions are not met and a cancelAfter time is set</strong>, the escrow can be canceled
            after that time, and the funds are returned to the sender. <strong>If there is no cancelAfter time</strong>,
            the escrow cannot be canceled and will remain locked forever unless the condition is fulfilled. This ensures
            that funds are <strong>safe, transparent, and trustless</strong>—no third party is required to hold or
            manage them.{' '}
          </p>

          <h2>Why use Escrows?</h2>
          <p>
            Escrows are widely used in blockchain payments because they add an extra layer of security and automation.
          </p>
          <p>
            <strong>Common use cases include:</strong>
          </p>
          <ul>
            <li>
              <strong>Delayed or scheduled payments</strong> – for example, releasing funds to a freelancer or business
              partner only after a project milestone is reached.
            </li>
            <li>
              <strong>Conditional transactions</strong> – payments that only go through if a certain condition is met,
              such as providing a password, secret, or proof of delivery.
            </li>
            <li>
              <strong>Escrowed fundraising</strong> – where funds are locked until a campaign succeeds.
            </li>
            {xahauNetwork && (
              <>
                <li>
                  <strong>Automated financial agreements</strong> – combining escrows with smart contracts (like Hooks
                  on Xahau) for complex logic.
                </li>
              </>
            )}
            <li>
              <strong>Trustless trades</strong> – enabling secure transfers between parties without relying on
              intermediaries.
            </li>
          </ul>
          <p>
            Because escrows are enforced by the blockchain itself, neither the sender nor the recipient can change the
            rules once the escrow is created. This makes them a reliable tool for both business and personal
            transactions.
          </p>
          <h2>How to Create an Escrow on {explorerName}</h2>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉 Go to
              </span>{' '}
              <Link href="/services/escrow">Create An Escrow</Link> Page
            </p>
          </div>
          <p>💡 You can also try creating an escrow on the Testnet first, so you don’t need to lock your real funds.</p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={'/images/pages/learn/create-escrow/screen' + (xahauNetwork ? '-xahau' : '') + '.png'}
                alt="Create an escrow on XRPL and Xahau"
                width={1520}
                height={1697}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>How to create an escrow on {explorerName}</figcaption>
            </figure>
          </div>
          <ol>
            <p>
              <strong>Step 1. Enter the Recipient Address</strong>
            </p>
            <p>Fill in the destination wallet address.</p>
            <p>👉 If the recipient is using an exchange or a service, you may also need to enter a Destination Tag.</p>
            <p>
              <strong>Step 2. Enter the Amount</strong>
            </p>
            <p>Specify how much {nativeCurrency} you want to lock in escrow.</p>
            <strong>Step 3. Add a Memo (Optional)</strong>
            <p>You can include a memo. Keep in mind that it will be public on the blockchain.</p>
            <p>
              <strong>Step 4. Set the Escrow Conditions</strong>
            </p>
            <p>Choose one or both options:</p>
            <ul>
              <li>
                <strong>Unlock after</strong> — when the funds can be released.
              </li>
              <li>
                <strong>Cancel after</strong> — after that time, the funds can be returned to you (the escrow can be
                canceled).
              </li>
            </ul>
            <strong>Step 5. Advanced Options (for Pro Subscribers)</strong>
            <p>
              If you are a Bithomp Pro subscriber, you can access additional features like{' '}
              <strong>Cryptographic condition (PREIMAGE-SHA-256)</strong>. This means you generate a random secret
              (preimage), hash it, and store the hash in the escrow.
            </p>
            <p>
              ⚠️ Keep the secret (fullfillment) securely yourself — <strong>WE DO NOT store it</strong>. If you lose the
              secret and there is no cancelAfter time set,{' '}
              <strong>the escrowed funds will be locked forever and cannot be released or canceled.</strong>
              The condition hash is public and is stored directly in the escrow on the blockchain. You will see it in
              the escrow transaction details
            </p>
            <strong>Step 6. Confirm and Create the Escrow</strong>
            <p>
              Tick the box to agree with the terms and conditions. Click Create Escrow. Sign the transaction using your
              wallet (Xaman, Ledger, MetaMask, Gem Wallet, etc.). Once signed, the escrow will be created and appear in
              your transaction history.
            </p>
          </ol>
          <h3>Who can cancel an escrow</h3>
          <p>
            {' '}
            After the cancelAfter time has passed, the escrow does not expire or return funds automatically —{' '}
            <strong>any account</strong> may submit an EscrowCancel transaction to return the funds to the escrow
            sender. On our website you can perform this from the <Link href="/account"> Account Page</Link> by selecting
            the escrow and signing a cancel transaction with your wallet.{' '}
          </p>
          <div className="flex justify-center">
            <figure>
              <Image
                src={'/images/pages/learn/create-escrow/screen-cancel.png'}
                alt="cancel an escrow on XRPL and Xahau"
                width={1520}
                height={791}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>How to cancel an escrow on {explorerName}</figcaption>
            </figure>
          </div>
          <p>
            {' '}
            We make it simple and secure to create escrows on {explorerName}. You can use it for delayed or conditional
            payments, or safely test the feature on the testnet without risking your real funds.
          </p>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}
