import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '../../components/Breadcrumbs'
import { network } from '../../utils'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function AMM() {
  return (
    <>
      <SEO
        title="What Is an Automated Market Maker (AMM)? Guide to XRPL’s XLS-30 and Bithomp AMM services"
        description="Discover how Automated Market Makers (AMMs) work, their benefits for traders and liquidity providers, and how XRPL’s XLS-30 improves on traditional AMMs with fee voting, auctions, and order book integration. Learn how to deposit, withdraw, and create AMM pools directly on Bithomp."
        noindex={network !== 'mainnet'}
        image={{ file: '/images/pages/learn/amm/cover.jpg', width: 1520, height: 855, allNetworks: true }}
      />
      <div className="max-w-4xl mx-auto px-4">
        <Breadcrumbs />
        <article className="prose sm:prose-lg dark:prose-invert mx-auto my-10">
          <h1 className="text-center">What Is an Automated Market Maker (AMM)?</h1>
          <figure>
            <Image
              src={'/images/pages/learn/amm/cover.jpg'}
              alt="XRPL AMM"
              width={1520}
              height={855}
              className="max-w-full h-auto object-contain"
              priority
            />
            <figcaption>XRPL AMM</figcaption>
          </figure>
          <p>In crypto, people want greater control over their assets without depending on centralized entities.</p>
          <p>
            On a centralized exchange (CEX) like Coinbase or Binance, you deposit money via bank transfer, card, or
            crypto. But the moment you deposit, you don’t actually control your assets anymore — the exchange does. Your
            trades happen off-chain in their system, and you rely on them to approve withdrawals.
          </p>
          <p>
            On the other hand, a decentralized exchange (DEX) lets you trade directly from your own wallet. You always
            hold your private keys and never give up control of your funds.
          </p>
          <p>
            <strong>The key difference:</strong>
          </p>
          <ul>
            <li>
              <strong>CEX</strong>= the exchange holds your money
            </li>
            <li>
              <strong>DEX</strong>= you hold your money
            </li>
          </ul>
          <h2>Enter AMMs</h2>
          <p>
            An Automated Market Maker (AMM) is a type of DEX that uses algorithms and liquidity pools to make trading
            seamless. Instead of creating or matching orders in an order book, you can trade directly against a pool of
            assets.
          </p>
          <p>With AMMs:</p>
          <ul>
            <li>Prices are set by math, not humans</li>
            <li>You trade against liquidity pools, not individual traders</li>
          </ul>
          <h2>AMMs vs. Order Book DEXs</h2>
          <div className="overflow-x-auto">
            <table className="table-auto border-collapse w-full text-sm text-left">
              <thead>
                <tr className="bg-[#4BA8B6] text-white">
                  <th className="pl-5 px-4 py-2" style={{ paddingLeft: 5 }}>
                    Feature
                  </th>
                  <th className="px-4 py-2">AMM</th>
                  <th className="px-4 py-2">DEX (Order Book)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Trading method
                  </td>
                  <td className="px-4 py-2">Trade against a liquidity pool</td>
                  <td className="px-4 py-2">Match buy/sell orders</td>
                </tr>
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Price execution
                  </td>
                  <td className="px-4 py-2">Determined by the AMM curve</td>
                  <td className="px-4 py-2">Best matching orders</td>
                </tr>
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Limit orders
                  </td>
                  <td className="px-4 py-2">❌ Not supported</td>
                  <td className="px-4 py-2">✅ Supported</td>
                </tr>
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Control
                  </td>
                  <td className="px-4 py-2">You can set slippage tolerance (to avoid bad execution)</td>
                  <td className="px-4 py-2">You can set exact price and amount</td>
                </tr>
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Impermanent loss
                  </td>
                  <td className="px-4 py-2">✅ Yes</td>
                  <td className="px-4 py-2">❌ No</td>
                </tr>
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Easy to provide liquidity
                  </td>
                  <td className="px-4 py-2">✅ Yes</td>
                  <td className="px-4 py-2">❌ No</td>
                </tr>
                <tr className="hover:bg-[#4BA8B6]/10">
                  <td className="px-4 py-2 font-medium" style={{ paddingLeft: 5 }}>
                    Use case
                  </td>
                  <td className="px-4 py-2">Quick swaps, liquidity provision</td>
                  <td className="px-4 py-2">Precise trading, market making</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>AMMs make it possible to trade even rare tokens that would be too illiquid in an order book.</p>
          <h2>How Liquidity Pools Work</h2>
          <p>
            Think of a self-running stall at a market. The prices adjust automatically depending on supply and demand.
          </p>
          <ul>
            <li>Users called liquidity providers (LPs) deposit equal values of two tokens into a pool.</li>
            <li>Traders swap tokens in and out of the pool.</li>
            <li>LPs earn a share of trading fees, proportional to their share of the pool.</li>
          </ul>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              On Bithomp <Link href="/services/amm/deposit">AMM Deposit</Link>, you can easily add liquidity to pools
              and start earning fees.
            </p>
          </div>
          <h2>LP Tokens</h2>
          <p>
            When you add liquidity, you don’t just leave tokens behind — you receive LP tokens. These represent your
            share of the pool. Later, you can withdraw your liquidity anytime.
          </p>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              Withdraw your liquidity easily on Bithomp <Link href="/services/amm/withdraw">AMM Withdraw</Link>
            </p>
          </div>
          <h2>Impermanent Loss</h2>
          <p>
            Impermanent loss (IL) happens when the value of your deposited tokens changes compared to when you first
            added them. It’s called “impermanent” because it only becomes permanent when you withdraw.
          </p>
          <p>
            <strong>Key points:</strong>
          </p>
          <ul>
            <li>Small price movements → small IL (usually less then 2%)</li>
            <li>Fees you earn can often cover IL XRPL’s</li>
            <li>Continuous Auction mechanism helps further reduce IL for liquidity providers</li>
          </ul>
          <h2>XRPL’s AMM (XLS-30)</h2>
          <p>The XRP Ledger’s AMM (XLS-30) introduces unique features that improve on traditional AMMs:</p>
          <ul>
            <li>
              <strong>Fee Voting</strong> – LPs can vote on pool trading fees, making it community-driven. Try it on
              Bithomp <Link href="/services/amm/vote">AMM Vote</Link>.
            </li>
            <li>
              <strong>Continuous Auction Mechanism </strong>– Rewards liquidity providers while helping offset
              impermanent loss.
            </li>
            <li>
              <strong>DEX (Order Book) + AMM Interoperability</strong> – You can use both AMM pools and the traditional
              XRPL order book for the best liquidity.
            </li>
          </ul>
          <div className="p-4 my-4 border-l-4 rounded bg-white dark:bg-gray-900 border-[#4BA8B6] shadow-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <span role="img" aria-label="lamp">
                👉
              </span>{' '}
              Want to create your own AMM pool? You can do it directly via Bithomp{' '}
              <Link href="/services/amm/create">AMM Create</Link>
            </p>
          </div>
          <h3>Auction Rewards </h3>
          <p>A unique feature of XRPL’s AMM is the continuous auction. Here’s how it works:</p>
          <ul>
            <li>
              Traders can bid to temporarily “rebalance” a pool by providing one token in exchange for another at
              slightly better rates.
            </li>
            <li>The highest bidder wins the auction and gets access to those improved rates.</li>
            <li>The auction proceeds (the difference they pay) are distributed back to liquidity providers.</li>
          </ul>
          <p>
            This system creates extra income for LPs and helps offset impermanent loss. In short,{' '}
            <strong>auction rewards = bonus earnings for LPs on top of trading fees.</strong>
          </p>
          <h2>Benefits of XRPL’s AMM </h2>
          <p>
            <strong>For Liquidity Providers (LPs): </strong>
          </p>
          <ul>
            <li>Earn fees + auction rewards </li>
            <li>Mitigated impermanent loss</li>
            <li>Community fee voting </li>
          </ul>
          <p>
            <strong>For Traders:</strong>
          </p>
          <ul>
            <li>24/7 liquidity </li>
            <li>Access to a wide range of pairs</li>
            <li>Competitive pricing via AMM + order book integration</li>
          </ul>
          <h3>Final Thoughts</h3>
          <p>
            Automated Market Makers are changing the way people trade crypto by giving users full control over their
            funds, democratizing liquidity provision, and creating new earning opportunities.
          </p>
          <p>
            The XRPL’s AMM (XLS-30) adds even more powerful features like fee voting, continuous auctions, and dual
            interoperability with order books.{' '}
          </p>
          <p>
            <strong> Ready to explore XRPL’s AMM yourself?</strong>
          </p>
          <p>
            👉 <Link href="/services/amm/deposit">Deposit liquidity</Link>
          </p>
          <p>
            👉 <Link href="/services/amm/withdraw">Withdraw your funds</Link>
          </p>
          <p>
            👉 <Link href="/services/amm/vote">Vote on pool fees</Link>
          </p>
          <p>
            👉 <Link href="/services/amm/create">Create a new AMM pool</Link>
          </p>
          <p>All available directly on Bithomp.❤️</p>
        </article>
        <br />
        <br />
      </div>
    </>
  )
}
