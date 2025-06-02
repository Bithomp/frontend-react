import Image from 'next/image'
import SEO from '../../components/SEO'
import { getIsSsrMobile } from '../../utils/mobile'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
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

export default function WhatIsRipple() {
    return (
        <>
            <SEO
                title="What is Ripple? | Bithomp"
                description="Learn about Ripple, the company behind XRP."
                image="/images/pages/learn/what-is-ripple/cover.png"
            />
            <div className="max-w-4xl mx-auto px-4">
                <Breadcrumbs />
                <article className="prose prose-base sm:prose-lg dark:prose-invert mx-auto max-w-4xl my-10">

                    <h1>What is Ripple? (the company)</h1>
                    <Image
                        src="/images/pages/learn/what-is-ripple/cover.png"
                        alt="What is Ripple?"
                        width={1536}
                        height={1024}
                        className="max-w-full h-auto object-contain"
                        priority
                    />

                    <p>
                        Ripple is a technology company that develops infrastructure for fast, cost-effective global payments.
                        Headquartered in San Francisco, Ripple’s core mission is to enable the world to move value as seamlessly as information does today.
                        It does this by working with financial institutions, banks,
                        and payment providers to improve cross-border transaction systems — traditionally known for being slow and expensive.
                    </p>

                    <h2>Founders and Origins</h2>

                    <p>
                        Ripple was originally founded under the name OpenCoin in 2012 by <strong>Chris Larsen</strong> and <strong>Jed McCaleb</strong>.
                        The idea stemmed from earlier work on a decentralized digital currency called RipplePay, created in 2004 by Ryan Fugger.
                        Larsen and McCaleb re-envisioned the project as a blockchain-based payment protocol,
                        aiming to improve how money moves across borders.
                    </p>

                    <p>
                        In 2015, the company rebranded from OpenCoin to Ripple Labs, and eventually to simply Ripple.
                        Over the years, Ripple has evolved from a cryptocurrency startup into a key player in the fintech industry,
                        with a focus on remittance markets and institutional-grade blockchain solutions.
                    </p>

                    <h2>RippleNet vs XRP</h2>

                    <p>A common point of confusion is the distinction between <strong>Ripple (the company)</strong>, <strong>RippleNet (the payment network)</strong>, and <strong>XRP (the digital asset)</strong>.</p>
                    <ul>
                        <li>
                            <strong>RippleNet</strong> is Ripple’s global payment network. It enables financial institutions to settle cross-border payments instantly, with end-to-end transparency and reduced costs. RippleNet uses a suite of products, including <strong>xCurrent</strong>, <strong>xVia</strong>, and <strong>On-Demand Liquidity (ODL)</strong>.
                        </li>
                        <li>
                            <strong>XRP</strong> is the native digital asset used in Ripple's On-Demand Liquidity solution. It acts as a bridge currency, allowing financial institutions to transfer value between fiat currencies quickly without needing to pre-fund accounts in destination countries.
                        </li>
                    </ul>

                    <p>Importantly, <strong>RippleNet can function without XRP</strong>, but using XRP can provide added liquidity benefits and faster settlement.</p>

                    <h2>Partnerships and Goals</h2>

                    <p>
                        Ripple has established partnerships with over <strong>300 financial institutions</strong> in more than <strong>40 countries</strong>,
                        including notable players like Santander, PNC Bank, SBI Holdings, and Tranglo.
                        These collaborations are key to Ripple’s mission of modernizing legacy payment rails,
                        which often rely on intermediaries like SWIFT.
                    </p>

                    <p>Ripple’s long-term goals include:</p>

                    <ul>
                        <li>Increasing adoption of real-time global payments.</li>
                        <li>Promoting financial inclusion by lowering remittance costs.</li>
                        <li>Encouraging the regulatory development of blockchain-based financial services.</li>
                    </ul>

                    <p>Ripple is also an advocate for sustainability, having committed to becoming carbon net-zero by 2030 and supporting green crypto initiatives.</p>

                    <h2>Misconceptions: Ripple ≠ XRP</h2>
                    <p>One of the most persistent misunderstandings in the crypto space is the assumption that Ripple and XRP are the same thing.</p>

                    <ul>
                        <li><strong>Ripple</strong> is a company.</li>
                        <li><strong>XRP</strong> is an open-source digital asset.</li>
                        <li><strong>XRP Ledger (XRPL)</strong> is a decentralized blockchain powered by a network of independent validators.</li>
                    </ul>

                    <p>Ripple is a contributor to the XRP Ledger, but <strong>it does not control it</strong>.
                        XRP can be used by anyone, not just Ripple or RippleNet partners.
                        This distinction is central to ongoing legal and regulatory debates,
                        including the SEC’s lawsuit against Ripple, which alleged XRP was sold as an unregistered security—a claim Ripple continues to challenge.
                    </p>

                    <h2>Conclusion</h2>

                    <p>
                        Ripple is a fintech innovator aiming to transform global payments through blockchain technology.
                        While often associated with the XRP token, the company’s mission extends far beyond cryptocurrency.
                        By building scalable solutions for real-time settlement and forging partnerships across the globe,
                        Ripple is helping to reshape the future of finance—one transaction at a time.
                    </p>

                    <p>For more information on XRP, see <Link href="/learn/what-is-xrp">What is XRP?</Link></p>
                </article>
            </div>
        </>
    )
}