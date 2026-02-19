import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import { nativeCurrency, explorerName, xahauNetwork, webSiteName } from '../../utils'
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

export default function SendPayments() {
  const imagePath = '/images/' + (xahauNetwork ? 'xahau' : 'xrpl') + 'explorer/learn/send-payments/'
  return (
    <>
      <SEO
        title={'Send Payments on Bithomp - Benefits'}
        description="Explore the advantages of using Bithomp for secure and efficient payments: trustlines, Issuer fee, token issuance, wallet signing, and more. "
        noindex={network !== 'mainnet'}
        image={{
          file: '/xrplexplorer/learn/send-payments/cover.jpg',
          width: 1520,
          height: 855,
          allNetworks: true
        }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1 className="text-center">
            Send {nativeCurrency} and {explorerName} Tokens via {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'}: Key
            Benefits
          </h1>

          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + 'cover.jpg'}
                alt="Send payments"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
              />
              <figcaption>Send payments on {webSiteName}</figcaption>
            </figure>
          </div>

          <p>
            You might be wondering: {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'} is {xahauNetwork ? 'a' : 'an'}{' '}
            {nativeCurrency} transaction explorer, so why would I send funds through it instead of my wallet?
          </p>

          <p>
            It’s a fair question. But there are several unique features that make sending funds via{' '}
            {xahauNetwork ? 'Xahau Explorer' : 'Bithomp XRP Ledger explorer'} not only possible but incredibly
            convenient—features you won’t find anywhere else. Here’s why you should give it a try:
          </p>

          <ol>
            <li>
              <p>
                <strong>See only what your recipient can hold</strong>
              </p>
              <p>
                After you enter a recipient’s address, the token selector automatically displays all tokens the
                recipient can hold, based on their trustlines.
              </p>
              <p>No more guessing which tokens will be accepted—just a clean, clear list ready for sending.</p>
              <div className="flex justify-center">
                <figure>
                  <Image
                    src={imagePath + 'token-selector-screen.png'}
                    alt="Send payments"
                    width={1520}
                    height={855}
                    className="max-w-full h-auto object-contain"
                  />
                  <figcaption>Send payments on {webSiteName}</figcaption>
                </figure>
              </div>
            </li>

            <li>
              <p>
                <strong>Transparent transfer fees (Issuer fees)</strong>
              </p>
              <p>
                If you’re sending a token whose issuer has a TransferFee (Issuer fee) set, we show it immediately.
                You’ll see exactly how much the recipient will get after fees, so there are no surprises.
              </p>
              <div className="flex justify-center">
                <figure>
                  <Image
                    src={imagePath + 'screen.png'}
                    alt="Send payments"
                    width={1520}
                    height={855}
                    className="max-w-full h-auto object-contain"
                  />
                  <figcaption>Send payments on {webSiteName}</figcaption>
                </figure>
              </div>
            </li>

            {xahauNetwork && (
              <li>
                <p>
                  <strong>Send tokens on Xahau Explorer without trustlines (using Remit)</strong>
                </p>
                <p>
                  On Xahau, Remit allows you to send any token to any account, even if the recipient does not have a
                  trustline.
                </p>

                <p>
                  <strong>💡 Important:</strong>
                </p>
                <ul>
                  <li>
                    Incoming Remit must be enabled on the destination account. If it's disallowed you can enable it{' '}
                    <Link href="/services/account-settings">HERE</Link>
                  </li>
                  <li>The sender pays the reserve requirements, including account activation if required.</li>
                  <li>This feature is available only on the Xahau network.</li>
                </ul>
              </li>
            )}

            <li>
              <p>
                <strong>Issue tokens on the fly</strong>
              </p>
              <p>
                Are you issuing your own token? {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'} allows you to send tokens
                that don’t exist yet—effectively issuing them in two steps.
              </p>
              <ol>
                <li>The Currency Distribution Account creates a trustline to the Issuer Account.</li>
                <li>The Issuer Account then sends (issues) the tokens to the Distribution Account.</li>
              </ol>
              <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
                <p className="text-gray-800 dark:text-gray-200">
                  <span role="img" aria-label="lamp">
                    💡
                  </span>{' '}
                  <Link href="/learn/issue-a-token"> Learn How to Issue Tokens on {explorerName}.</Link>
                </p>
              </div>
            </li>

            <li>
              <p>
                <strong>Pro features for advanced control</strong>
              </p>
              <p>Our Pro subscribers get even more flexibility:</p>
              <ul>
                <li>Set custom transaction fees</li>
                <li>Add source tags</li>
                <li>Include invoice IDs</li>
              </ul>
              <div className="flex justify-center">
                <figure>
                  <Image
                    src={imagePath + 'advanced-options.png'}
                    alt="Advanced Payment Options"
                    width={1520}
                    height={855}
                    className="max-w-full h-auto object-contain"
                  />
                  <figcaption>Advanced payment options</figcaption>
                </figure>
              </div>
              <p>
                These options give you full control over your transactions, making them perfect for businesses or
                advanced users.
              </p>
              <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
                <p className="text-gray-800 dark:text-gray-200">
                  <span role="img" aria-label="lamp">
                    💡
                  </span>{' '}
                  <Link href="/admin">Get PRO Subscription</Link>
                </p>
              </div>
            </li>

            <li>
              <p>
                <strong>Sign transactions with your favorite wallet</strong>
              </p>
              <p>
                {xahauNetwork ? 'Xahau Explorer' : 'Bithomp'} supports multiple signing options, so you can use whatever
                works best for you:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <li className="flex items-center gap-1">
                  <Image src="/images/wallets/square-logos/xaman.png" alt="Xaman" width={20} height={20} />
                  <span>Xaman</span>
                </li>

                <li className="flex items-center gap-1">
                  <Image src="/images/wallets/square-logos/gemwallet.png" alt="GemWallet" width={20} height={20} />
                  <span>GemWallet</span>
                </li>

                <li className="flex items-center gap-1">
                  <Image src="/images/wallets/square-logos/crossmark.png" alt="Crossmark" width={20} height={20} />
                  <span>Crossmark</span>
                </li>

                {!xahauNetwork && (
                  <li className="flex items-center gap-1">
                    <Image
                      src="/images/wallets/square-logos/walletconnect.png"
                      alt="WalletConnect"
                      width={20}
                      height={20}
                    />
                    <span>WalletConnect (e.g., Bifrost, UpHODL, Girin)</span>
                  </li>
                )}

                <li className="flex items-center gap-1">
                  <Image src="/images/wallets/square-logos/ledger.png" alt="Ledger" width={20} height={20} />
                  <span>Ledger</span>
                </li>

                <li className="flex items-center gap-1">
                  <Image src="/images/wallets/square-logos/trezor.png" alt="Trezor" width={20} height={20} />
                  <span>Trezor</span>
                </li>

                <li className="flex items-center gap-1">
                  <Image src="/images/wallets/square-logos/metamask.png" alt="MetaMask" width={20} height={20} />
                  <span>MetaMask</span>
                </li>
              </ul>
            </li>
          </ol>

          <p>
            <strong>🔥 Pro Tip:</strong> Even if you’re used to sending funds directly from a wallet, our interface can
            save you time and prevent mistakes, especially when dealing with multiple tokens or issuing new ones.
          </p>
        </article>
      </div>
      <br />
      <br />
    </>
  )
}
