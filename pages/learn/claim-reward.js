import Image from 'next/image'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { network } from '../../utils'
import Breadcrumbs from '../../components/Breadcrumbs'
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

export default function ClaimReward() {
  const imagePath = '/images/xahauexplorer/learn/claim-reward'
  return (
    <>
      <SEO
        title="Claim XAH Balance Adjustment"
        description="What is XAH Balance Adjustment and how to claim your reward on Xahau Explorer."
        noindex={network !== 'xahau'}
        image={{
          width: 1200,
          height: 630,
          file: 'previews/1200x630/claim-reward.png'
        }}
        twitterImage={{ file: 'previews/630x630/claim-reward.png' }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert max-w-4xl my-10">
          <h1>What Are Xahau Rewards? Claim on Xahau Explorer</h1>
          <div className="flex justify-center">
            <figure>
              <Image
                src={imagePath + '/cover.jpg'}
                alt="Xahau Balance Adjustment"
                width={1520}
                height={855}
                className="max-w-full h-auto object-contain"
                priority
              />
              <figcaption>Xahau Balance Adjustment</figcaption>
            </figure>
          </div>
          <div className="xahau-rewards mt-8">
            <p>
              Xahau Rewards — also called Balance Rewards or Balance Adjustments — are a built-in passive yield
              mechanism on the Xahau network.
            </p>
            <p>If you hold XAH in your account, you earn a reward of:</p>
            <ul>
              <li>4.07% per year (effective annual rate)</li>
              <li>≈ 0.34% per month</li>
            </ul>
            <p>Rewards are based on your average XAH balance and accumulate over time.</p>
            <p>
              <strong>⚠ Important:</strong> Rewards are not automatic. To receive them, you must claim them using a{' '}
              <strong>ClaimReward</strong> transaction.
            </p>
            <p>
              <strong>Why 4.07% per year?</strong>
            </p>
            <p>
              The nominal rate is 4% annually, but because rewards must be compounded monthly, the effective annual rate
              becomes 4.07%.
            </p>

            <h3>Requirements for Earning Xahau Rewards</h3>
            <p>To be eligible for balance rewards:</p>
            <ul>
              <li>
                <strong>1. You must opt in to Balance Rewards</strong>
                <br />
                If you don’t opt in, the network will not track your balance statistics, and you will not accumulate
                rewards.
              </li>
              <li>
                <strong>2. Rewards accumulate over time</strong>
                <br />
                Rewards are calculated on the average XAH balance between your claims.
              </li>
              <li>
                <strong>3. You can claim only after a waiting period</strong>
                <br />
                You must wait 30 days, 2 hours, 13 minutes, 20 seconds after your last claim (or after opt-in) before
                your reward becomes claimable.
              </li>
              <li>
                <strong>4. Unclaimed rewards do not roll over</strong>
                <br />
                If you skip claiming for a reward cycle, those rewards are lost. To avoid losing rewards, you must claim
                periodically.
              </li>
            </ul>

            <h3>How to Claim Xahau Rewards on Xahau Explorer (Step-by-Step Guide)</h3>
            <ol>
              <li>
                <strong>Log in with Your Wallet</strong>
                <br />
                Open Xahau Explorer and connect your wallet.
                <br />
                <strong>Supported wallets:</strong>
                <ul>
                  <li>Desktop: Xaman, Ledger, Crossmark, Gem Wallet, MetaMask, and more</li>
                  <div className="flex justify-center">
                    <figure>
                      <Image
                        src={imagePath + '/signing-options.png'}
                        alt="Claim Xahau Balance Adjustment on Xahau Explorer"
                        width={1520}
                        height={855}
                        className="max-w-full h-auto object-contain"
                        priority
                      />
                      <figcaption>Claim Xahau Balance Adjustment on Xahau Explorer</figcaption>
                    </figure>
                  </div>
                  <li>Mobile: Xaman (only)</li>
                </ul>
              </li>
              <li>
                <strong>Go to your</strong> <Link href="/account">Account Page</Link>
              </li>
              <li>
                <strong>Enable “Reward Opt-In”</strong>
                <br />
                Before rewards can accumulate: Enable Balance Rewards / Reward Opt-In.
                <br />
                <div className="flex justify-center">
                  <figure>
                    <Image
                      src={imagePath + '/rewards-opt-in.png'}
                      alt="Claim Xahau Balance Adjustment on Xahau Explorer"
                      width={1520}
                      height={855}
                      className="max-w-full h-auto object-contain"
                      priority
                    />
                    <figcaption>Claim Xahau Balance Adjustment on Xahau Explorer</figcaption>
                  </figure>
                </div>
                This sends a ClaimReward transaction that activates reward tracking for your account.
                <br />
                Once enabled, the system begins recording your balance statistics.
              </li>
              <li>
                <strong>Wait Until Rewards Become Claimable</strong>
                <br />
                Rewards gradually accumulate each cycle.
                <br />
                You must wait: 30 days, 2 hours, 13 minutes, 20 seconds.
                <br />
                After this period, your balance will show a claimable reward.
              </li>
              <li>
                <strong>Claim Your Xahau Rewards</strong>
                <br />
                When your reward is ready:
                <br />
                Open your account page on Xahau Explorer.
                <br />
                <div className="flex justify-center">
                  <figure>
                    <Image
                      src={imagePath + '/claimable-balance.jpeg'}
                      alt="Claim Xahau Balance Adjustment on Xahau Explorer"
                      width={1520}
                      height={855}
                      className="max-w-full h-auto object-contain"
                      priority
                    />
                    <figcaption>Claim Xahau Balance Adjustment on Xahau Explorer</figcaption>
                  </figure>
                </div>
                Click “Claim Now”.
                <br />
                Sign the ClaimReward transaction in your wallet.
                <br />
                The earned XAH will instantly be added to your balance, and a new reward cycle will begin.
              </li>
            </ol>
          </div>
        </article>
      </div>
    </>
  )
}
