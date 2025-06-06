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

export default function WhatIsTheXRPLEdger() {
    return (
        <>
            <SEO
                title="What is the XRP Ledger? | Bithomp"
                description="Learn about the XRP Ledger and its purpose."
                image="/images/pages/learn/what-is-the-xrp-ledger/cover.png"
            />
            <div className="max-w-4xl mx-auto px-4">
                <Breadcrumbs />
                <article className="prose prose-base sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">
                    <h1>What is the XRP Ledger?</h1>
                    <Image
                        src="/images/pages/learn/what-is-the-xrp-ledger/cover.png"
                        alt="What is the XRP Ledger?"
                        width={1536}
                        height={1024}
                        className="max-w-full h-auto object-contain"
                        priority
                    />

                    <p>
                        The XRP Ledger (XRPL) is a decentralized, open-source blockchain engineered for fast, low-cost, and scalable digital payments.
                        Since its launch in 2012, XRPL has powered a range of financial use cases, including payments, tokenization, and decentralized finance (DeFi).
                        Unlike proof-of-work blockchains like Bitcoin, XRPL is designed to settle transactions in seconds using an energy-efficient consensus mechanism.
                    </p>

                    <h2>📘 Decentralized Ledger Basics</h2>

                    <p>
                        At its core, XRPL is a <strong>distributed ledger</strong>—a database replicated across a global network of independent nodes.
                        Each node stores a copy of the entire transaction history and uses cryptographic protocols to ensure data integrity and consistency.
                    </p>

                    <p>
                        Unlike centralized financial systems controlled by single entities, the XRP Ledger is governed by consensus rules enforced by this decentralized network.
                        Anyone can operate a node, view the ledger, and submit transactions.
                    </p>

                    <h2>⚙️ How XRPL Consensus Works</h2>
                    <p>
                        XRPL does <strong>not use mining</strong>. Instead, it relies on a unique consensus algorithm known as the <strong>Ripple Protocol Consensus Algorithm (RPCA)</strong>. Here's how it works:
                    </p>

                    <ol>
                        <li><strong>Trusted Validators</strong>: Each node maintains a list of trusted validators (called a Unique Node List or UNL).</li>
                        <li><strong>Proposal Rounds</strong>: Validators propose new transactions in rounds and compare them with others.</li>
                        <li><strong>Agreement Threshold</strong>: Once 80% of validators agree on a transaction set, it is validated and added to the ledger.</li>
                        <li><strong>Finality</strong>: This process ensures near-instant finality—transactions are confirmed in ~3–5 seconds.</li>
                    </ol>

                    <p>
                        This consensus model makes XRPL energy-efficient and extremely fast compared to traditional blockchains.
                    </p>

                    <h2>Account Structure & Transactions</h2>

                    <p>
                        Each user on XRPL operates through an <strong>account</strong>, identified by a public address. Accounts can:
                    </p>

                    <ul>
                        <li>Hold XRP and other issued tokens</li>
                        <li>Send and receive transactions</li>
                        <li>Set trust lines to accept non-XRP tokens</li>
                        <li>Configure advanced features like multi-signing or payment channels</li>
                    </ul>

                    <p>
                        Transaction types supported include:
                    </p>

                    <ul>
                        <li><strong>Payments</strong> (XRP or tokens)</li>
                        <li><strong>TrustSet</strong> (establishing trust lines)</li>
                        <li><strong>OfferCreate</strong> (placing orders on the decentralized exchange)</li>
                        <li><strong>Escrow</strong>, <strong>Checks</strong>, and <strong>AccountSet</strong> for advanced operations</li>
                    </ul>

                    <p>
                        All transactions consume a small amount of XRP as a fee, which is permanently destroyed—making XRP slightly deflationary over time.
                    </p>

                    <h2>🚀 Key Features: Speed, Cost, Scalability</h2>

                    <p>
                        XRPL was built to solve core problems in traditional finance and early blockchains. Its standout features include:
                    </p>

                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>⚡ <strong>Speed</strong></td>
                                <td>~3–5 second finality for transactions</td>
                            </tr>
                            <tr>
                                <td>💸 <strong>Low Fees</strong></td>
                                <td>Transaction costs are fractions of a cent</td>
                            </tr>
                            <tr>
                                <td>🌍 <strong>Scalable</strong></td>
                                <td>Handles 1,500+ transactions per second; scalable to 65,000+ with sidechains</td>
                            </tr>
                            <tr>
                                <td>🔒 <strong>Security</strong></td>
                                <td>Hardened validator protocol with cryptographic signing</td>
                            </tr>
                            <tr>
                                <td>🛠 <strong>Built-In DEX</strong></td>
                                <td>A native decentralized exchange for trading tokens</td>
                            </tr>
                            <tr>
                                <td>🪙 <strong>Tokenization</strong></td>
                                <td>Issue stablecoins or other assets without smart contracts</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2>🌐 Final Thoughts</h2>

                    <p>
                        The XRP Ledger represents a mature, battle-tested blockchain infrastructure that prioritizes efficiency, accessibility, and utility.
                        Its unique consensus model and low operational costs make it attractive for real-time payment systems, decentralized applications, and financial institutions looking to modernize infrastructure without sacrificing performance or decentralization.
                    </p>

                    <p>
                        Whether you're building a cross-border payments platform or experimenting with DeFi, XRPL offers a solid foundation designed for real-world adoption.
                    </p>
                </article>
            </div>
        </>
    )
}