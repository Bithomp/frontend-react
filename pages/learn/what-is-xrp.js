import Image from 'next/image'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
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

export default function WhatIsXrp() {
    return (
        <>
            <SEO
                title="What is XRP? | Bithomp"
                description="Learn about XRP, the digital asset designed for fast, low-cost international payments."
                image="/images/pages/learn/what-is-xrp/cover.png"
            />
            <div className="max-w-4xl mx-auto px-4">
                <Breadcrumbs />
                <article className="prose prose-base sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">

                    <h1>What is XRP?</h1>

                    <Image
                        src="/images/pages/learn/what-is-xrp/cover.png"
                        alt="What is XRP?"
                        width={1536}
                        height={1024}
                        className="max-w-full h-auto object-contain"
                        priority
                    />

                    <p>
                        <strong>XRP</strong> is a digital asset designed for fast, low-cost international payments.
                        It plays a key role in the XRP Ledger (XRPL), a decentralized blockchain built for financial use cases.
                        Unlike many cryptocurrencies that focus on general-purpose computing or store-of-value use, XRP is optimized for moving value efficiently across borders.
                    </p>

                    <h2>XRP as a Digital Asset</h2>
                    <p>
                        At its core, XRP is a <strong>cryptographic token</strong> used on the XRP Ledger.
                        It enables secure, trustless transfers of value in seconds, with minimal fees — often fractions of a cent.
                        The XRP Ledger operates without mining and reaches consensus via a unique validator network, offering scalability and energy efficiency.
                    </p>

                    <h2>Use Cases: Payments and Liquidity</h2>
                    <ol>
                        <li>
                            <strong>Cross-Border Payments</strong>
                            <p>XRP is widely known for its use in cross-border money transfers. Financial institutions can use XRP as a bridge currency, enabling instant settlement between different fiat currencies without the need for pre-funded accounts.</p>
                        </li>
                        <li>
                            <strong>Liquidity Provision</strong>
                            <p>By holding XRP, financial entities can tap into on-demand liquidity. This reduces the need to hold various fiat currencies in multiple countries and simplifies treasury operations.</p>
                        </li>
                        <li>
                            <strong>Micropayments & Transfers</strong>
                            <p>Due to its low transaction costs and fast settlement, XRP is also suitable for micropayments, remittances, and streaming payments.</p>
                        </li>
                    </ol>

                    <h2>XRP Tokenomics</h2>
                    <ul>
                        <li>
                            <strong>Total supply:</strong> 100 billion XRP tokens were created at launch.
                        </li>
                        <li>
                            <strong>No mining:</strong> All tokens exist from the beginning; new XRP is not created over time.
                        </li>
                        <li>
                            <strong>Deflationary aspect:</strong> A small amount of XRP is burned as a transaction fee, permanently removing it from circulation.
                        </li>
                        <li>
                            <strong>Distribution:</strong> The initial supply was distributed by Ripple Labs, which continues to hold a significant portion, released gradually from escrow.
                        </li>
                    </ul>

                    <h2>How XRP Differs from Other Cryptocurrencies</h2>

                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>XRP</th>
                                <th>Bitcoin</th>
                                <th>Ethereum</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Consensus</strong></td>
                                <td>Unique Node List (UNL)</td>
                                <td>Proof-of-Work</td>
                                <td>Proof-of-Stake (as of Ethereum 2.0)</td>
                            </tr>
                            <tr>
                                <td><strong>Speed</strong></td>
                                <td>~3-5 seconds</td>
                                <td>~10 minutes</td>
                                <td>~15 seconds</td>
                            </tr>
                            <tr>
                                <td><strong>Energy Use</strong></td>
                                <td>Low</td>
                                <td>High</td>
                                <td>Moderate</td>
                            </tr>
                            <tr>
                                <td><strong>Use Case Focus</strong></td>
                                <td>Payments & liquidity</td>
                                <td>Digital gold</td>
                                <td>Decentralized applications</td>
                            </tr>
                            <tr>
                                <td><strong>Token Creation</strong></td>
                                <td>Pre-mined</td>
                                <td>Mined</td>
                                <td>Mined/staked</td>
                            </tr>
                        </tbody>
                    </table>

                    <p>Unlike Bitcoin or Ethereum, XRP is not intended to be mined or used as a platform for smart contracts.
                        Instead, it is focused on <strong>payment utility and liquidity management</strong>, with a strong emphasis on speed and cost-efficiency.
                    </p>

                    <h2>Summary</h2>
                    <p>
                        XRP is a purpose-built digital asset aimed at solving problems in cross-border payments and liquidity provisioning.
                        With its consensus mechanism, energy efficiency, and practical utility in the financial sector, XRP stands out from other cryptocurrencies in both design and adoption.
                    </p>
                </article>
            </div>
        </>
    )
}